import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  deliverClaimedAttendanceEmail,
  type ClaimedAttendanceEmail,
} from "../../../../lib/attendance-email-delivery";


export const runtime = "nodejs";


const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 25;


type WorkerRequest = {
  limit?: number;
  dryRun?: boolean;
};


const jsonError = (
  message: string,
  status: number
) =>
  NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
    }
  );


function safeEqual(
  left: string,
  right: string
): boolean {
  if (
    !left ||
    !right ||
    left.length !== right.length
  ) {
    return false;
  }

  let difference = 0;

  for (
    let index = 0;
    index < left.length;
    index += 1
  ) {
    difference |=
      left.charCodeAt(index) ^
      right.charCodeAt(index);
  }

  return difference === 0;
}


function normalizeLimit(
  value: unknown
): number {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.min(
    MAX_BATCH_SIZE,
    Math.max(
      1,
      Math.floor(parsed)
    )
  );
}


export async function POST(
  request: NextRequest
) {
  /*
   * ----------------------------------------------------------
   * Internal worker authentication.
   *
   * This route intentionally does NOT use a CampusConnect user
   * session. It is for trusted server/scheduler execution only.
   * ----------------------------------------------------------
   */

  const configuredSecret =
    process.env
      .ATTENDANCE_DELIVERY_WORKER_SECRET ||
    "";

  if (!configuredSecret) {
    console.error(
      "ATTENDANCE_DELIVERY_WORKER_SECRET is not configured."
    );

    return jsonError(
      "Attendance delivery worker is not configured.",
      503
    );
  }


  const suppliedSecret =
    request.headers
      .get("x-campusconnect-worker-secret")
      ?.trim() ||
    "";

  if (
    !safeEqual(
      suppliedSecret,
      configuredSecret
    )
  ) {
    return jsonError(
      "Unauthorized.",
      401
    );
  }


  /*
   * ----------------------------------------------------------
   * Server configuration.
   * ----------------------------------------------------------
   */

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "";

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  const resendApiKey =
    process.env.RESEND_API_KEY ||
    "";

  const emailFrom =
    process.env.ATTENDANCE_EMAIL_FROM ||
    "";


  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    return jsonError(
      "Supabase server configuration is incomplete.",
      500
    );
  }


  if (
    !resendApiKey ||
    !emailFrom
  ) {
    return jsonError(
      "Attendance email delivery is not configured.",
      503
    );
  }


  const admin =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );


  /*
   * ----------------------------------------------------------
   * Optional bounded batch size.
   *
   * Caller cannot select recipients or outbox IDs.
   * It may only reduce/increase processing within the hard
   * server-side maximum.
   * ----------------------------------------------------------
   */

  let body:
    WorkerRequest = {};

  try {
    const raw =
      await request.text();

    if (raw.trim()) {
      body =
        JSON.parse(raw) as
          WorkerRequest;
    }
  } catch {
    return jsonError(
      "Invalid request body.",
      400
    );
  }


  const limit =
    normalizeLimit(
      body.limit
    );


  const dryRun =
    body.dryRun === true;


  /*
   * ----------------------------------------------------------
   * SAFE DRY RUN
   *
   * Important:
   * - does not call claim_next_attendance_email_delivery()
   * - does not recover stale rows
   * - does not call Resend
   * - does not change attempts/status/timestamps
   * ----------------------------------------------------------
   */

  if (dryRun) {
    const now =
      new Date().toISOString();


    const {
      count: pendingCount,
      error: pendingError,
    } =
      await admin
        .from(
          "attendance_notification_outbox"
        )
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "channel",
          "email"
        )
        .eq(
          "delivery_status",
          "Pending"
        )
        .is(
          "terminal_failure_at",
          null
        )
        .lt(
          "attempts",
          5
        );


    if (pendingError) {
      console.error(
        "Attendance worker dry-run pending count:",
        pendingError
      );

      return jsonError(
        "Unable to inspect pending attendance emails.",
        500
      );
    }


    /*
     * Retryable Failed rows are:
     *
     *   next_attempt_at IS NULL
     *   OR
     *   next_attempt_at <= now
     *
     * Supabase/PostgREST OR syntax is used only for this
     * read-only count.
     */

    const {
      count: retryableCount,
      error: retryableError,
    } =
      await admin
        .from(
          "attendance_notification_outbox"
        )
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "channel",
          "email"
        )
        .eq(
          "delivery_status",
          "Failed"
        )
        .is(
          "terminal_failure_at",
          null
        )
        .lt(
          "attempts",
          5
        )
        .or(
          `next_attempt_at.is.null,next_attempt_at.lte.${now}`
        );


    if (retryableError) {
      console.error(
        "Attendance worker dry-run retryable count:",
        retryableError
      );

      return jsonError(
        "Unable to inspect retryable attendance emails.",
        500
      );
    }


    const pending =
      pendingCount || 0;

    const retryable =
      retryableCount || 0;

    const eligible =
      pending +
      retryable;


    return NextResponse.json({
      success: true,
      dryRun: true,
      readOnly: true,
      limit,
      eligible,
      pending,
      retryable,
      message:
        eligible > 0
          ? `${eligible} attendance email job(s) are currently eligible. No job was claimed and no email was sent.`
          : "No attendance email jobs are currently eligible. No job was claimed and no email was sent.",
    });
  }


  /*
   * ----------------------------------------------------------
   * REAL DELIVERY SAFETY SWITCH
   *
   * Fail closed. A trusted scheduler cannot claim or send
   * queued emails unless delivery is explicitly enabled.
   * ----------------------------------------------------------
   */

  const deliveryEnabled =
    process.env
      .ATTENDANCE_EMAIL_DELIVERY_ENABLED ===
    "true";


  if (!deliveryEnabled) {
    return NextResponse.json(
      {
        success: false,
        deliveryEnabled: false,
        message:
          "Automatic attendance email delivery is disabled.",
      },
      {
        status: 503,
      }
    );
  }


  /*
   * ----------------------------------------------------------
   * Recover stale Processing rows first.
   *
   * This handles jobs abandoned by a crashed/timed-out worker.
   * ----------------------------------------------------------
   */

  const {
    data: recoveredData,
    error: recoveryError,
  } =
    await admin.rpc(
      "recover_stale_attendance_email_deliveries"
    );


  if (recoveryError) {
    console.error(
      "Attendance worker stale recovery:",
      recoveryError
    );

    return jsonError(
      "Unable to recover stale attendance email jobs.",
      500
    );
  }


  const recovered =
    typeof recoveredData ===
      "number"
      ? recoveredData
      : Number(
          recoveredData || 0
        ) || 0;


  let claimed = 0;
  let sent = 0;
  let failed = 0;

  const results: Array<{
    outboxId: string;
    status:
      | "Sent"
      | "Failed";
    providerMessageId?: string;
    retryable?: boolean;
    error?: string;
  }> = [];


  /*
   * ----------------------------------------------------------
   * Pull one due job at a time.
   *
   * claim_next_attendance_email_delivery() is authoritative:
   * - email channel only
   * - Pending / due Failed only
   * - terminal failures excluded
   * - attempts < 5
   * - FOR UPDATE SKIP LOCKED
   *
   * Multiple workers can therefore run without intentionally
   * claiming the same row.
   * ----------------------------------------------------------
   */

  for (
    let index = 0;
    index < limit;
    index += 1
  ) {
    const {
      data: claimedData,
      error: claimError,
    } =
      await admin.rpc(
        "claim_next_attendance_email_delivery"
      );


    if (claimError) {
      console.error(
        "Attendance worker claim:",
        claimError
      );

      return NextResponse.json(
        {
          success: false,
          recovered,
          limit,
          claimed,
          sent,
          failed,
          results,
          error:
            "Unable to claim the next attendance email job.",
        },
        {
          status: 500,
        }
      );
    }


    const job =
      Array.isArray(
        claimedData
      )
        ? (
            claimedData[0] as
              ClaimedAttendanceEmail |
              undefined
          )
        : undefined;


    /*
     * Queue is currently empty or nothing is due.
     */

    if (!job) {
      break;
    }


    claimed += 1;


    const result =
      await deliverClaimedAttendanceEmail({
        admin,
        claimed: job,
        resendApiKey,
        emailFrom,
      });


    results.push(
      result
    );


    if (
      result.status ===
      "Sent"
    ) {
      sent += 1;
    } else {
      failed += 1;
    }
  }


  return NextResponse.json({
    success:
      failed === 0,

    recovered,
    limit,
    claimed,
    sent,
    failed,
    queueDrained:
      claimed < limit,

    results,
  });
}
