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
} from "../../../../../lib/attendance-email-delivery";


export const runtime = "nodejs";


type DeliveryRequest = {
  sessionId?: string;
  dryRun?: boolean;
};


type OutboxRow = {
  id: string;
  session_id: string | null;
  notification_type: string;
  channel: string;
  delivery_status: string;
  next_attempt_at: string | null;
  attempts: number | null;
  terminal_failure_at: string | null;
};



const jsonError = (
  message: string,
  status: number
) =>
  NextResponse.json(
    {
      error: message,
    },
    {
      status,
    }
  );


export async function POST(
  request: NextRequest
) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "";

  const publicKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
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
    !publicKey ||
    !serviceRoleKey
  ) {
    return jsonError(
      "Supabase server configuration is incomplete.",
      500
    );
  }




  /*
   * ----------------------------------------------------------
   * Authenticate the caller using the same Bearer-token
   * convention already used by CampusConnect API routes.
   * ----------------------------------------------------------
   */

  const authorization =
    request.headers.get(
      "authorization"
    ) || "";

  const accessToken =
    authorization
      .toLowerCase()
      .startsWith("bearer ")
      ? authorization
          .slice(7)
          .trim()
      : "";


  if (!accessToken) {
    return jsonError(
      "Authentication required.",
      401
    );
  }


  const userClient =
    createClient(
      supabaseUrl,
      publicKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },

        global: {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        },
      }
    );


  const {
    data: userData,
    error: userError,
  } =
    await userClient.auth
      .getUser(
        accessToken
      );


  if (
    userError ||
    !userData.user
  ) {
    return jsonError(
      "Your session is invalid or expired.",
      401
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
   * Parse and validate the requested attendance session.
   * ----------------------------------------------------------
   */

  let body: DeliveryRequest;

  try {
    body =
      (await request.json()) as
        DeliveryRequest;
  } catch {
    return jsonError(
      "Invalid request body.",
      400
    );
  }


  const sessionId =
    String(
      body.sessionId || ""
    ).trim();


  const dryRun =
    body.dryRun === true;


  if (!sessionId) {
    return jsonError(
      "Attendance session ID is required.",
      400
    );
  }


  /*
   * ----------------------------------------------------------
   * Load caller's CampusConnect role.
   * ----------------------------------------------------------
   */

  const {
    data: profile,
    error: profileError,
  } =
    await admin
      .from("profiles")
      .select(
        "id,role,account_status"
      )
      .eq(
        "id",
        userData.user.id
      )
      .maybeSingle();


  if (
    profileError ||
    !profile
  ) {
    return jsonError(
      "Campus profile not found.",
      403
    );
  }


  if (
    profile.account_status &&
    profile.account_status !==
      "Active"
  ) {
    return jsonError(
      "Your CampusConnect account is not active.",
      403
    );
  }


  /*
   * ----------------------------------------------------------
   * Load attendance session.
   *
   * Faculty can deliver notifications only for sessions they
   * recorded themselves.
   *
   * Coordinator/Main Admin retain the same session-level
   * management capability already used by attendance.
   * ----------------------------------------------------------
   */

  const {
    data: attendanceSession,
    error: attendanceSessionError,
  } =
    await admin
      .from(
        "attendance_sessions"
      )
      .select(
        "id,faculty_id,status"
      )
      .eq(
        "id",
        sessionId
      )
      .maybeSingle();


  if (
    attendanceSessionError ||
    !attendanceSession
  ) {
    return jsonError(
      "Attendance session not found.",
      404
    );
  }


  const role =
    String(
      profile.role || ""
    );


  const canDeliver =
    (
      role === "Faculty" &&
      attendanceSession.faculty_id ===
        userData.user.id
    ) ||
    role === "Coordinator" ||
    role === "Main Admin";


  if (!canDeliver) {
    return jsonError(
      "You do not have permission to deliver notifications for this attendance session.",
      403
    );
  }


  if (
    attendanceSession.status !==
    "Completed"
  ) {
    return jsonError(
      "Notifications can only be delivered for completed attendance sessions.",
      409
    );
  }


  /*
   * ----------------------------------------------------------
   * Recover stale delivery claims.
   *
   * If a previous worker crashed after claiming a job, the
   * database safely moves sufficiently old Processing jobs back
   * into the retry state.
   * ----------------------------------------------------------
   */

  if (!dryRun) {
    const {
      error: recoveryError,
    } =
      await admin.rpc(
        "recover_stale_attendance_email_deliveries"
      );


    if (recoveryError) {
      console.error(
        "Attendance email stale-job recovery:",
        recoveryError
      );

      return jsonError(
        "Unable to prepare attendance email delivery.",
        500
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * Find server-side email jobs.
   *
   * The browser supplies only sessionId.
   * It cannot choose recipients or arbitrary outbox rows.
   * ----------------------------------------------------------
   */

  const {
    data: outboxData,
    error: outboxError,
  } =
    await admin
      .from(
        "attendance_notification_outbox"
      )
      .select(
        "id,session_id,notification_type,channel,delivery_status,next_attempt_at,attempts,terminal_failure_at"
      )
      .eq(
        "session_id",
        sessionId
      )
      .eq(
        "channel",
        "email"
      )
      .in(
        "delivery_status",
        [
          "Pending",
          "Failed",
        ]
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );


  if (outboxError) {
    console.error(
      "Attendance email outbox:",
      outboxError
    );

    return jsonError(
      "Unable to load queued attendance emails.",
      500
    );
  }


  const retryReferenceTime =
    Date.now();


  const outbox =
      (
        (outboxData ||
          []) as OutboxRow[]
      ).filter(
        candidate => {
          /*
           * API pre-filter mirrors the authoritative
           * PostgreSQL claim function.
           */
          const attempts =
            candidate.attempts ?? 0;


          if (
            candidate.terminal_failure_at
          ) {
            return false;
          }


          if (attempts >= 5) {
            return false;
          }


          if (
            candidate.delivery_status ===
            "Pending"
          ) {
            return true;
          }


          if (
            candidate.delivery_status !==
            "Failed"
          ) {
            return false;
          }


          /*
           * The database permits Failed + NULL when
           * attempts < 5.
           */
          if (
            !candidate.next_attempt_at
          ) {
            return true;
          }


          const nextAttempt =
            new Date(
              candidate.next_attempt_at
            ).getTime();


          return (
            Number.isFinite(
              nextAttempt
            ) &&
            nextAttempt <=
              retryReferenceTime
          );
        }
      );


    if (dryRun) {
    const pending =
      outbox.filter(
        candidate =>
          candidate.delivery_status ===
          "Pending"
      ).length;


    const retryable =
      outbox.filter(
        candidate =>
          candidate.delivery_status ===
          "Failed"
      ).length;


    return NextResponse.json({
      success: true,
      dryRun: true,
      readOnly: true,
      sessionId,
      eligible: outbox.length,
      pending,
      retryable,
      message:
        outbox.length > 0
          ? `${outbox.length} attendance email job(s) are currently eligible for delivery. No email was sent and no delivery state was changed.`
          : "No attendance email jobs are currently eligible for delivery. No email was sent and no delivery state was changed.",
    });
  }


  if (!outbox.length) {
    return NextResponse.json({
      success: true,
      sessionId,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      message:
        "No pending attendance emails were found.",
    });
  }


  /*
   * Provider configuration is required only for actual
   * delivery. Read-only dry-run has already returned above.
   */
  if (
    !resendApiKey ||
    !emailFrom
  ) {
    return jsonError(
      "Attendance email delivery is not configured.",
      503
    );
  }


  let sent = 0;
  let failed = 0;
  let skipped = 0;


  const results: Array<{
    outboxId: string;
    status:
      | "Sent"
      | "Failed"
      | "Skipped";
    providerMessageId?: string;
    retryable?: boolean;
    error?: string;
  }> = [];


  /*
   * ----------------------------------------------------------
   * Process sequentially.
   *
   * This intentionally avoids a burst of provider requests and
   * keeps database/provider state easier to reason about.
   * ----------------------------------------------------------
   */

  for (const candidate of outbox) {

    const {
      data: claimedData,
      error: claimError,
    } =
      await admin.rpc(
        "claim_attendance_email_delivery",
        {
          target_outbox_id:
            candidate.id,
        }
      );


    if (claimError) {
      console.error(
        "Attendance email claim:",
        claimError
      );

      failed += 1;

      results.push({
        outboxId:
          candidate.id,
        status: "Failed",
        error:
          claimError.message,
      });

      continue;
    }


    const claimed =
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
     * Another worker may have claimed/sent/skipped this job
     * between the initial SELECT and this RPC.
     */

    if (!claimed) {
      skipped += 1;

      results.push({
        outboxId:
          candidate.id,
        status:
          "Skipped",
      });

      continue;
    }


    const delivery =
      await deliverClaimedAttendanceEmail({
        admin,

        claimed:
          claimed as
            ClaimedAttendanceEmail,

        resendApiKey,

        emailFrom,
      });


    if (
      delivery.status ===
      "Sent"
    ) {
      sent += 1;
    } else {
      failed += 1;
    }


    results.push(
      delivery
    );
  }



  return NextResponse.json({
    success:
      failed === 0,

    sessionId,

    processed:
      sent +
      failed +
      skipped,

    sent,
    failed,
    skipped,
    results,
  });
}
