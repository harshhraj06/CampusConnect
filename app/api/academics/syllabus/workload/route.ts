import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  createClient,
} from "@supabase/supabase-js";


export const runtime =
  "nodejs";

const MAX_FILE_SIZE =
  20 * 1024 * 1024;

const MAX_REQUEST_SIZE =
  MAX_FILE_SIZE + 1024 * 1024;

const MAX_TEXT_LENGTH =
  1_200_000;


type Workload = {
  lectureHours: number;
  tutorialHours: number;
  practicalHours: number;
  selfLearningHours: number;
  semesterHours: number;
};

function jsonError(
  message: string,
  status: number
) {
  return NextResponse.json(
    { success: false, error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

async function readBoundedBody(
  request: Request
): Promise<Uint8Array | null> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalLength += value.byteLength;
      if (totalLength > MAX_REQUEST_SIZE) {
        await reader.cancel();
        return null;
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}


function parseWorkload(
  input: string
): Workload {

  const text =
    input
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  let lectureHours =
    0;

  let tutorialHours =
    0;

  let practicalHours =
    0;

  let selfLearningHours =
    0;

  let semesterHours =
    0;


  const ltpPatterns =
    [
      /L\s*:\s*T\s*:\s*P[^0-9]{0,40}\(?\s*(\d+)\s*:\s*(\d+)\s*:\s*(\d+)\s*\)?/i,

      /\(\s*L\s*:\s*T\s*:\s*P\s*\)\s*\+\s*SL[^0-9]{0,20}\(?\s*(\d+)\s*:\s*(\d+)\s*:\s*(\d+)\s*\)?/i,

      /LTP[^0-9]{0,20}(\d+)\s*:\s*(\d+)\s*:\s*(\d+)/i,
    ];


  for (
    const pattern
    of ltpPatterns
  ) {

    const match =
      text.match(
        pattern
      );


    if (match) {

      lectureHours =
        Number(
          match[1]
        ) ||
        0;

      tutorialHours =
        Number(
          match[2]
        ) ||
        0;

      practicalHours =
        Number(
          match[3]
        ) ||
        0;

      break;
    }
  }


  const hourPatterns =
    [
      /(\d{1,3})\s*Hours?\s*\/\s*Sem(?:ester)?/i,

      /(\d{1,3})\s*Hours?\s*(?:per|\/)\s*Semester/i,

      /Total\s+(?:Teaching\s+)?Hours?[^0-9]{0,20}(\d{1,3})/i,

      /Semester\s+Hours?[^0-9]{0,20}(\d{1,3})/i,
    ];


  for (
    const pattern
    of hourPatterns
  ) {

    const match =
      text.match(
        pattern
      );


    if (match) {

      semesterHours =
        Number(
          match[1]
        ) ||
        0;

      break;
    }
  }


  const slMatch =
    text.match(
      /SL[^0-9]{0,10}(\d+)\s*(?:Hours?|Hrs?)?/i
    );


  if (slMatch) {

    selfLearningHours =
      Number(
        slMatch[1]
      ) ||
      0;
  }


  return {
    lectureHours,
    tutorialHours,
    practicalHours,
    selfLearningHours,
    semesterHours,
  };
}


async function extractPdfText(
  file: File
) {

  const {
    PDFParse,
  } =
    await import(
      "pdf-parse"
    );


  const data =
    new Uint8Array(
      await file.arrayBuffer()
    );


  const parser =
    new PDFParse({
      data,
    });


  try {

    const result =
      await parser.getText();


    return String(
      result?.text ||
      ""
    );

  } finally {

    await parser.destroy();
  }
}


export async function POST(
  request: NextRequest
) {

  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

    if (!supabaseUrl || !publishableKey) {
      return jsonError("Supabase server configuration is incomplete.", 503);
    }

    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!accessToken) {
      return jsonError("Authentication required.", 401);
    }

    const userClient = createClient(supabaseUrl, publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    });

    const { data: userData, error: userError } =
      await userClient.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return jsonError("Your session is invalid or expired.", 401);
    }

    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (
      profileError ||
      !["Faculty", "Main Admin"].includes(profile?.role || "")
    ) {
      return jsonError(
        "Only Faculty or Main Admin can scan syllabus documents.",
        403
      );
    }

    const declaredLength = Number(
      request.headers.get("content-length") || 0
    );
    if (declaredLength > MAX_REQUEST_SIZE) {
      return jsonError("The request is too large.", 413);
    }

    const boundedBody = await readBoundedBody(request);
    if (!boundedBody) {
      return jsonError("The request is too large.", 413);
    }

    const bodyBuffer = new ArrayBuffer(boundedBody.byteLength);
    new Uint8Array(bodyBuffer).set(boundedBody);

    const form = await new Response(bodyBuffer, {
      headers: {
        "content-type": request.headers.get("content-type") || "",
      },
    }).formData();


    const file =
      form.get(
        "file"
      );


    const extractedText =
      String(
        form.get(
          "extractedText"
        ) ||
        ""
      );


    let sourceText =
      extractedText;


    if (file instanceof File) {
      if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        return jsonError("PDF files must be between 1 byte and 20 MB.", 413);
      }

      if (file.type !== "application/pdf") {
        return jsonError("Only PDF files are supported.", 415);
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!hasPdfSignature(bytes)) {
        return jsonError("The uploaded file is not a valid PDF.", 415);
      }

      sourceText =
        await extractPdfText(
          new File([bytes], file.name, { type: "application/pdf" })
        );
    }

    if (sourceText.length > MAX_TEXT_LENGTH) {
      return jsonError("The extracted document text is too large.", 413);
    }


    const workload =
      parseWorkload(
        sourceText
      );


    return NextResponse.json({
      success:
        true,

      workload,

      matched:
        workload
          .semesterHours >
          0 ||
        (
          workload
            .lectureHours +
          workload
            .tutorialHours +
          workload
            .practicalHours
        ) >
              0,
    });

  } catch {

    console.error("[Syllabus workload] request failed.");


    return NextResponse.json(
      {
        success:
          false,

        error:
          "Unable to read syllabus workload.",
      },
      {
        status:
          500,
      }
    );
  }
}
