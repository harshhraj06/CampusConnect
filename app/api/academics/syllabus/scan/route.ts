import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  extractText,
  getDocumentProxy,
} from "unpdf";


export const runtime =
  "nodejs";


const MAX_FILE_SIZE =
  20 * 1024 * 1024;


const MAX_AI_TEXT_LENGTH =
  60_000;


const ALLOWED_TYPES =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);


type SubjectRow = {
  id: string;
  batch_id: string;
  subject_name: string;
  subject_code: string;
  subject_type: string;
  credits: number;
  faculty_id: string;
  faculty_name: string;
};


type DraftTopic = {
  topicOrder: number;
  title: string;
  description: string;
};


type DraftUnit = {
  unitNumber: number;
  title: string;
  description: string;
  topics: DraftTopic[];
};


type SyllabusDraft = {
  documentTitle: string;
  detectedSubject: string;
  units: DraftUnit[];
  warnings: string[];
};


type ScanResponse = {
  success: boolean;
  readOnly?: boolean;
  sourceType?:
    | "Upload"
    | "Google Drive";
  mode?:
    | "pdf-text"
    | "vision";
  fileName?: string;
  mimeType?: string;
  pages?: number;
  batchSubjectId?: string;
  subject?: SubjectRow;
  draft?: SyllabusDraft;
  warnings?: string[];
  message?: string;
  error?: string;
};


type DriveReference = {
  id: string;
  kind:
    | "file"
    | "document"
    | "presentation"
    | "spreadsheet";
};


function jsonError(
  message: string,
  status: number
) {
  return NextResponse.json<
    ScanResponse
  >(
    {
      success: false,
      readOnly: true,
      error: message,
    },
    {
      status,
    }
  );
}


function cleanText(
  value: unknown,
  maxLength = 2_000
) {
  return String(
    value ?? ""
  )
    .replace(
      /\u0000/g,
      ""
    )
    .trim()
    .slice(
      0,
      maxLength
    );
}


function normalizeExtractedText(
  value: unknown
): string {
  if (
    typeof value ===
    "string"
  ) {
    return value.trim();
  }


  if (
    Array.isArray(value)
  ) {
    return value
      .map(item => {
        if (
          typeof item ===
          "string"
        ) {
          return item;
        }

        if (
          item &&
          typeof item ===
          "object"
        ) {
          const record =
            item as Record<
              string,
              unknown
            >;

          return (
            normalizeExtractedText(
              record.text
            ) ||
            normalizeExtractedText(
              record.content
            )
          );
        }

        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }


  if (
    value &&
    typeof value ===
    "object"
  ) {
    const record =
      value as Record<
        string,
        unknown
      >;

    for (
      const key of [
        "text",
        "content",
        "texts",
      ]
    ) {
      const text =
        normalizeExtractedText(
          record[key]
        );

      if (text) {
        return text;
      }
    }
  }


  return "";
}


function parseJsonObject(
  value: string
): Record<
  string,
  unknown
> {
  let candidate =
    value.trim();


  if (
    candidate.startsWith(
      "```"
    )
  ) {
    candidate =
      candidate
        .replace(
          /^```(?:json)?\s*/i,
          ""
        )
        .replace(
          /\s*```$/,
          ""
        )
        .trim();
  }


  const firstBrace =
    candidate.indexOf(
      "{"
    );

  const lastBrace =
    candidate.lastIndexOf(
      "}"
    );


  if (
    firstBrace < 0 ||
    lastBrace <=
      firstBrace
  ) {
    throw new Error(
      "The AI response did not contain a valid syllabus JSON object."
    );
  }


  const parsed =
    JSON.parse(
      candidate.slice(
        firstBrace,
        lastBrace + 1
      )
    );


  if (
    !parsed ||
    typeof parsed !==
      "object" ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "The AI syllabus response has an invalid format."
    );
  }


  return parsed as Record<
    string,
    unknown
  >;
}


function normalizeDraft(
  raw: Record<
    string,
    unknown
  >
): SyllabusDraft {
  const rawUnits =
    Array.isArray(
      raw.units
    )
      ? raw.units
      : [];


  const units:
    DraftUnit[] = [];


  let totalTopics =
    0;


  rawUnits
    .slice(
      0,
      40
    )
    .forEach(
      (
        rawUnit,
        unitIndex
      ) => {
        if (
          !rawUnit ||
          typeof rawUnit !==
            "object" ||
          Array.isArray(
            rawUnit
          )
        ) {
          return;
        }


        const unitRecord =
          rawUnit as Record<
            string,
            unknown
          >;


        const title =
          cleanText(
            unitRecord.title ||
            unitRecord.unit_title,
            240
          );


        const rawTopics =
          Array.isArray(
            unitRecord.topics
          )
            ? unitRecord.topics
            : [];


        const topics:
          DraftTopic[] = [];


        const seen =
          new Set<string>();


        rawTopics
          .slice(
            0,
            100
          )
          .forEach(
            (
              rawTopic,
              topicIndex
            ) => {
              if (
                totalTopics >=
                300
              ) {
                return;
              }


              let topicTitle =
                "";

              let description =
                "";

              let topicOrder =
                topicIndex + 1;


              if (
                typeof rawTopic ===
                "string"
              ) {
                topicTitle =
                  cleanText(
                    rawTopic,
                    240
                  );
              } else if (
                rawTopic &&
                typeof rawTopic ===
                  "object" &&
                !Array.isArray(
                  rawTopic
                )
              ) {
                const topicRecord =
                  rawTopic as Record<
                    string,
                    unknown
                  >;

                topicTitle =
                  cleanText(
                    topicRecord.title ||
                    topicRecord.topic_title,
                    240
                  );

                description =
                  cleanText(
                    topicRecord.description,
                    1_500
                  );

                const suppliedOrder =
                  Number(
                    topicRecord.topicOrder ??
                    topicRecord.topic_order
                  );

                if (
                  Number.isInteger(
                    suppliedOrder
                  ) &&
                  suppliedOrder >
                    0
                ) {
                  topicOrder =
                    suppliedOrder;
                }
              }


              if (!topicTitle) {
                return;
              }


              const duplicateKey =
                topicTitle
                  .toLowerCase()
                  .replace(
                    /\s+/g,
                    " "
                  );


              if (
                seen.has(
                  duplicateKey
                )
              ) {
                return;
              }


              seen.add(
                duplicateKey
              );


              topics.push({
                topicOrder,
                title:
                  topicTitle,
                description,
              });


              totalTopics += 1;
            }
          );


        if (
          !title &&
          !topics.length
        ) {
          return;
        }


        const suppliedNumber =
          Number(
            unitRecord.unitNumber ??
            unitRecord.unit_number
          );


        units.push({
          unitNumber:
            Number.isInteger(
              suppliedNumber
            ) &&
            suppliedNumber > 0
              ? suppliedNumber
              : unitIndex + 1,

          title:
            title ||
            `Unit ${unitIndex + 1}`,

          description:
            cleanText(
              unitRecord.description,
              2_000
            ),

          topics:
            topics.sort(
              (
                a,
                b
              ) =>
                a.topicOrder -
                b.topicOrder
            ),
        });
      }
    );


  if (
    !units.length ||
    totalTopics === 0
  ) {
    throw new Error(
      "No syllabus units and topics could be extracted confidently from this document."
    );
  }


  const warnings =
    Array.isArray(
      raw.warnings
    )
      ? raw.warnings
          .map(item =>
            cleanText(
              item,
              400
            )
          )
          .filter(Boolean)
          .slice(
            0,
            20
          )
      : [];


  return {
    documentTitle:
      cleanText(
        raw.documentTitle ||
        raw.document_title,
        300
      ),

    detectedSubject:
      cleanText(
        raw.detectedSubject ||
        raw.detected_subject,
        300
      ),

    units:
      units.sort(
        (
          a,
          b
        ) =>
          a.unitNumber -
          b.unitNumber
      ),

    warnings,
  };
}


function parseDriveReference(
  input: string
): DriveReference | null {
  let url:
    URL;


  try {
    url =
      new URL(
        input
      );
  } catch {
    return null;
  }


  const host =
    url.hostname
      .toLowerCase();


  const allowedHosts =
    new Set([
      "drive.google.com",
      "docs.google.com",
    ]);


  if (
    !allowedHosts.has(
      host
    )
  ) {
    return null;
  }


  const path =
    url.pathname;


  const fileMatch =
    path.match(
      /\/file\/d\/([a-zA-Z0-9_-]+)/
    );


  if (
    fileMatch?.[1]
  ) {
    return {
      id:
        fileMatch[1],
      kind:
        "file",
    };
  }


  const documentMatch =
    path.match(
      /\/document\/d\/([a-zA-Z0-9_-]+)/
    );


  if (
    documentMatch?.[1]
  ) {
    return {
      id:
        documentMatch[1],
      kind:
        "document",
    };
  }


  const presentationMatch =
    path.match(
      /\/presentation\/d\/([a-zA-Z0-9_-]+)/
    );


  if (
    presentationMatch?.[1]
  ) {
    return {
      id:
        presentationMatch[1],
      kind:
        "presentation",
    };
  }


  const spreadsheetMatch =
    path.match(
      /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
    );


  if (
    spreadsheetMatch?.[1]
  ) {
    return {
      id:
        spreadsheetMatch[1],
      kind:
        "spreadsheet",
    };
  }


  const queryId =
    url.searchParams.get(
      "id"
    );


  if (
    queryId &&
    /^[a-zA-Z0-9_-]+$/.test(
      queryId
    )
  ) {
    return {
      id:
        queryId,
      kind:
        "file",
    };
  }


  return null;
}


function getDriveDownloadUrl(
  reference:
    DriveReference
) {
  switch (
    reference.kind
  ) {
    case "document":
      return (
        `https://docs.google.com/document/d/${encodeURIComponent(
          reference.id
        )}/export?format=pdf`
      );

    case "presentation":
      return (
        `https://docs.google.com/presentation/d/${encodeURIComponent(
          reference.id
        )}/export/pdf`
      );

    case "spreadsheet":
      return (
        `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
          reference.id
        )}/export?format=pdf`
      );

    default:
      return (
        "https://drive.usercontent.google.com/download" +
        `?id=${encodeURIComponent(
          reference.id
        )}` +
        "&export=download&confirm=t"
      );
  }
}


function detectMimeType(
  bytes:
    Uint8Array
): string {
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return "application/pdf";
  }


  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }


  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }


  if (
    bytes.length >= 12 &&
    String.fromCharCode(
      ...bytes.slice(
        0,
        4
      )
    ) === "RIFF" &&
    String.fromCharCode(
      ...bytes.slice(
        8,
        12
      )
    ) === "WEBP"
  ) {
    return "image/webp";
  }


  return "";
}


function fileNameFromContentDisposition(
  value: string | null
) {
  if (!value) {
    return "";
  }


  const utfMatch =
    value.match(
      /filename\*=UTF-8''([^;]+)/i
    );


  if (
    utfMatch?.[1]
  ) {
    try {
      return decodeURIComponent(
        utfMatch[1]
      );
    } catch {
      return utfMatch[1];
    }
  }


  const match =
    value.match(
      /filename="?([^";]+)"?/i
    );


  return cleanText(
    match?.[1],
    240
  );
}


async function downloadDriveFile(
  inputUrl: string
) {
  const reference =
    parseDriveReference(
      inputUrl
    );


  if (!reference) {
    throw new Error(
      "Use a valid Google Drive, Google Docs, Google Slides or Google Sheets sharing link."
    );
  }


  const controller =
    new AbortController();


  const timer =
    setTimeout(
      () =>
        controller.abort(),
      25_000
    );


  try {
    const response =
      await fetch(
        getDriveDownloadUrl(
          reference
        ),
        {
          method:
            "GET",

          redirect:
            "follow",

          signal:
            controller.signal,

          headers: {
            "User-Agent":
              "CampusConnect-Syllabus-Scanner/1.0",
          },
        }
      );


    if (
      !response.ok
    ) {
      throw new Error(
        "Google Drive could not provide this syllabus file. Confirm that the file is shared with anyone who has the link."
      );
    }


    const declaredLength =
      Number(
        response.headers.get(
          "content-length"
        ) ||
        "0"
      );


    if (
      Number.isFinite(
        declaredLength
      ) &&
      declaredLength >
        MAX_FILE_SIZE
    ) {
      throw new Error(
        "The Google Drive syllabus file is larger than the 20 MB limit."
      );
    }


    const bytes =
      new Uint8Array(
        await response
          .arrayBuffer()
      );


    if (
      bytes.length <= 0
    ) {
      throw new Error(
        "The Google Drive syllabus file is empty."
      );
    }


    if (
      bytes.length >
      MAX_FILE_SIZE
    ) {
      throw new Error(
        "The Google Drive syllabus file is larger than the 20 MB limit."
      );
    }


    const mimeType =
      detectMimeType(
        bytes
      );


    if (
      !mimeType ||
      !ALLOWED_TYPES.has(
        mimeType
      )
    ) {
      const returnedType =
        response.headers.get(
          "content-type"
        ) || "";


      if (
        returnedType
          .toLowerCase()
          .includes(
            "text/html"
          )
      ) {
        throw new Error(
          "Google returned a sign-in or permission page instead of the syllabus. Share the file as 'Anyone with the link' and try again."
        );
      }


      throw new Error(
        "The Google Drive link did not return a supported PDF or image file."
      );
    }


    const dispositionName =
      fileNameFromContentDisposition(
        response.headers.get(
          "content-disposition"
        )
      );


    const fallbackName =
      reference.kind ===
        "file"
        ? `google-drive-syllabus.${mimeType === "application/pdf" ? "pdf" : mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg"}`
        : `google-${reference.kind}-syllabus.pdf`;


    return {
      bytes,
      mimeType,
      fileName:
        dispositionName ||
        fallbackName,
    };
  } finally {
    clearTimeout(
      timer
    );
  }
}


async function callSyllabusAI(
  input:
    | {
        kind:
          "text";
        text:
          string;
      }
    | {
        kind:
          "image";
        bytes:
          Uint8Array;
        mimeType:
          string;
      },
  subject:
    SubjectRow
): Promise<
  SyllabusDraft
> {
  const apiKey =
    process.env
      .AI_API_KEY ||
    "";


  const textModel =
    process.env
      .AI_MODEL ||
    "";


  const aiUrl =
    process.env
      .AI_CHAT_COMPLETIONS_URL ||
    "https://api.groq.com/openai/v1/chat/completions";


  /*
   * Text PDFs should continue using the normal CampusConnect
   * AI model.
   *
   * Images require a multimodal/vision model. Do NOT replace
   * AI_MODEL globally because Campus AI and other text features
   * may depend on it.
   *
   * Priority:
   * 1. Dedicated syllabus vision model
   * 2. Existing timetable vision model
   * 3. Current Groq multimodal production model
   * 4. AI_MODEL only for non-Groq compatible providers
   */
  const isGroq =
    (() => {
      try {
        return (
          new URL(
            aiUrl
          ).hostname ===
          "api.groq.com"
        );
      } catch {
        return false;
      }
    })();


  const visionModel =
    process.env
      .SYLLABUS_VISION_MODEL ||
    process.env
      .TIMETABLE_VISION_MODEL ||
    (
      isGroq
        ? "qwen/qwen3.8-27b"
        : textModel
    );


  const selectedModel =
    input.kind ===
      "image"
      ? visionModel
      : textModel;


  if (
    !apiKey ||
    !selectedModel
  ) {
    throw new Error(
      input.kind ===
        "image"
        ? "CampusConnect vision AI configuration is incomplete."
        : "CampusConnect AI configuration is incomplete."
    );
  }


  const extractionRules =
    `
You are extracting an academic syllabus for CampusConnect.

Configured subject:
- Code: ${subject.subject_code || "Not configured"}
- Name: ${subject.subject_name}
- Type: ${subject.subject_type || "Not configured"}

This is READ-ONLY extraction for faculty review.

Rules:
1. Extract only syllabus content visible in the supplied document.
2. Never invent missing units, topics, outcomes, hours or descriptions.
3. Preserve the source's unit/module numbering whenever visible.
4. Preserve topic order.
5. Split a comma/semicolon-separated syllabus line into separate topics only when the document clearly lists distinct topics.
6. Do not treat headers, textbooks, references, exam patterns, course outcomes, signatures, university addresses or administrative text as teaching topics.
7. If the document appears to belong to another subject, add a warning.
8. Keep descriptions short and source-grounded.
9. Do NOT decide completion status.
10. Do NOT write anything to a database.

Return one JSON object only:

{
  "documentTitle": "",
  "detectedSubject": "",
  "units": [
    {
      "unitNumber": 1,
      "title": "",
      "description": "",
      "topics": [
        {
          "topicOrder": 1,
          "title": "",
          "description": ""
        }
      ]
    }
  ],
  "warnings": []
}
`.trim();


  const userContent:
    unknown =
    input.kind ===
      "text"
      ? (
          `${extractionRules}

SYLLABUS DOCUMENT TEXT:

${input.text}`
        )
      : [
          {
            type:
              "text",

            text:
              extractionRules,
          },
          {
            type:
              "image_url",

            image_url: {
              url:
                `data:${input.mimeType};base64,${Buffer
                  .from(
                    input.bytes
                  )
                  .toString(
                    "base64"
                  )}`,
            },
          },
        ];


  const response =
    await fetch(
      aiUrl,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            model:
              selectedModel,

            temperature:
              0,

            max_completion_tokens:
              4_000,

            response_format: {
              type:
                "json_object",
            },

            messages: [
              {
                role:
                  "system",

                content:
                  "Extract academic syllabus structure accurately. Return JSON only and never invent syllabus content.",
              },
              {
                role:
                  "user",

                content:
                  userContent,
              },
            ],
          }),
      }
    );


  const responseText =
    await response.text();


  if (
    !response.ok
  ) {
    let providerMessage =
      "";


    try {
      const parsed =
        JSON.parse(
          responseText
        ) as {
          error?: {
            message?: string;
          };
        };


      providerMessage =
        cleanText(
          parsed.error?.message,
          500
        );
    } catch {
      providerMessage =
        "";
    }


    if (
      input.kind ===
        "image" &&
      /content must be a string/i.test(
        providerMessage
      )
    ) {
      throw new Error(
        `The configured syllabus vision model "${selectedModel}" does not accept image input. Configure SYLLABUS_VISION_MODEL with a multimodal model.`
      );
    }


    throw new Error(
      providerMessage ||
      `CampusConnect AI returned HTTP ${response.status}.`
    );
  }


  let payload:
    {
      choices?: Array<{
        message?: {
          content?: unknown;
        };
      }>;
    };


  try {
    payload =
      JSON.parse(
        responseText
      );
  } catch {
    throw new Error(
      "CampusConnect AI returned an unreadable response."
    );
  }


  const content =
    payload
      .choices?.[0]
      ?.message
      ?.content;


  const contentText =
    typeof content ===
      "string"
      ? content
      : Array.isArray(
            content
          )
        ? content
            .map(item => {
              if (
                typeof item ===
                "string"
              ) {
                return item;
              }

              if (
                item &&
                typeof item ===
                  "object"
              ) {
                const record =
                  item as Record<
                    string,
                    unknown
                  >;

                return typeof record.text ===
                  "string"
                  ? record.text
                  : "";
              }

              return "";
            })
            .join("")
        : "";


  if (
    !contentText.trim()
  ) {
    throw new Error(
      "CampusConnect AI returned an empty syllabus extraction."
    );
  }


  return normalizeDraft(
    parseJsonObject(
      contentText
    )
  );
}


export async function POST(
  request:
    NextRequest
) {
  try {
    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL ||
      "";


    const publicKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "";


    if (
      !supabaseUrl ||
      !publicKey
    ) {
      return jsonError(
        "Supabase server configuration is incomplete.",
        500
      );
    }


    const authorization =
      request.headers.get(
        "authorization"
      ) ||
      "";


    const accessToken =
      authorization
        .toLowerCase()
        .startsWith(
          "bearer "
        )
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
            persistSession:
              false,

            autoRefreshToken:
              false,
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
      data:
        userData,
      error:
        userError,
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


    const {
      data:
        profile,
      error:
        profileError,
    } =
      await userClient
        .from(
          "profiles"
        )
        .select(
          "role"
        )
        .eq(
          "id",
          userData.user.id
        )
        .single();


    if (
      profileError ||
      !profile
    ) {
      return jsonError(
        "Unable to verify your CampusConnect role.",
        403
      );
    }


    const role =
      cleanText(
        profile.role,
        80
      );


    if (
      role !==
        "Faculty" &&
      role !==
        "Main Admin"
    ) {
      return jsonError(
        "Only Faculty or Main Admin can scan syllabus documents.",
        403
      );
    }


    const formData =
      await request
        .formData();


    const batchSubjectId =
      cleanText(
        formData.get(
          "batchSubjectId"
        ),
        100
      );


    if (
      !batchSubjectId
    ) {
      return jsonError(
        "Choose an assigned subject before scanning a syllabus.",
        400
      );
    }


    /*
     * Authorization is intentionally performed by querying the
     * existing attendance_batch_subjects table through the
     * authenticated caller's RLS.
     *
     * Do not trust a subject/faculty id supplied by the browser.
     */
    const {
      data:
        subjectData,
      error:
        subjectError,
    } =
      await userClient
        .from(
          "attendance_batch_subjects"
        )
        .select(
          "id,batch_id,subject_name,subject_code,subject_type,credits,faculty_id,faculty_name"
        )
        .eq(
          "id",
          batchSubjectId
        )
        .maybeSingle();


    if (
      subjectError ||
      !subjectData
    ) {
      return jsonError(
        "You do not have access to this assigned subject.",
        403
      );
    }


    const subject =
      subjectData as
        SubjectRow;


    const suppliedFile =
      formData.get(
        "file"
      );


    const driveUrl =
      cleanText(
        formData.get(
          "driveUrl"
        ),
        2_000
      );


    const hasFile =
      suppliedFile instanceof
        File &&
      suppliedFile.size >
        0;


    if (
      hasFile &&
      driveUrl
    ) {
      return jsonError(
        "Choose either a file upload or a Google Drive link, not both.",
        400
      );
    }


    if (
      !hasFile &&
      !driveUrl
    ) {
      return jsonError(
        "Upload a syllabus PDF/image or provide a shared Google Drive link.",
        400
      );
    }


    let sourceType:
      "Upload" |
      "Google Drive";


    let fileName:
      string;


    let mimeType:
      string;


    let bytes:
      Uint8Array;


    if (
      hasFile &&
      suppliedFile instanceof
        File
    ) {
      if (
        suppliedFile.size >
        MAX_FILE_SIZE
      ) {
        return jsonError(
          "Syllabus files must be 20 MB or smaller.",
          413
        );
      }


      bytes =
        new Uint8Array(
          await suppliedFile
            .arrayBuffer()
        );


      mimeType =
        detectMimeType(
          bytes
        ) ||
        suppliedFile.type;


      if (
        !ALLOWED_TYPES.has(
          mimeType
        )
      ) {
        return jsonError(
          "Only PDF, JPG, JPEG, PNG and WEBP syllabus files are supported.",
          415
        );
      }


      fileName =
        cleanText(
          suppliedFile.name,
          240
        ) ||
        "syllabus";


      sourceType =
        "Upload";
    } else {
      const driveFile =
        await downloadDriveFile(
          driveUrl
        );


      bytes =
        driveFile.bytes;

      mimeType =
        driveFile.mimeType;

      fileName =
        driveFile.fileName;

      sourceType =
        "Google Drive";
    }


    if (
      mimeType ===
        "application/pdf"
    ) {
      const pdf =
        await getDocumentProxy(
          bytes
        );


      const extracted =
        await extractText(
          pdf,
          {
            mergePages:
              false,
          }
        );


      const text =
        normalizeExtractedText(
          extracted
        );


      const pages =
        typeof pdf.numPages ===
          "number"
          ? pdf.numPages
          : undefined;


      if (
        text.replace(
          /\s+/g,
          ""
        ).length <
          30
      ) {
        return jsonError(
          "This PDF appears to be image-only and has no readable embedded text. For this first production version, upload the syllabus page as JPG, PNG or WEBP so CampusConnect can use vision extraction.",
          422
        );
      }


      const wasTruncated =
        text.length >
        MAX_AI_TEXT_LENGTH;


      const aiText =
        text.slice(
          0,
          MAX_AI_TEXT_LENGTH
        );


      const draft =
        await callSyllabusAI(
          {
            kind:
              "text",

            text:
              aiText,
          },
          subject
        );


      const warnings = [
        ...draft.warnings,
      ];


      if (
        wasTruncated
      ) {
        warnings.push(
          "The PDF text was very large, so only the first 60,000 characters were sent for AI extraction. Review the extracted syllabus carefully."
        );
      }


      return NextResponse.json<
        ScanResponse
      >({
        success:
          true,

        readOnly:
          true,

        sourceType,

        mode:
          "pdf-text",

        fileName,

        mimeType,

        pages,

        batchSubjectId,

        subject,

        draft: {
          ...draft,
          warnings,
        },

        warnings,

        message:
          "Syllabus extracted for faculty review. Nothing has been saved yet.",
      });
    }


    const draft =
      await callSyllabusAI(
        {
          kind:
            "image",

          bytes,

          mimeType,
        },
        subject
      );


    return NextResponse.json<
      ScanResponse
    >({
      success:
        true,

      readOnly:
        true,

      sourceType,

      mode:
        "vision",

      fileName,

      mimeType,

      batchSubjectId,

      subject,

      draft,

      warnings:
        draft.warnings,

      message:
        "Syllabus image extracted for faculty review. Nothing has been saved yet.",
    });
  } catch (
    error
  ) {
    console.error(
      "Syllabus scan failed:",
      error
    );


    const message =
      error instanceof
        Error
        ? error.message
        : "Unable to scan syllabus.";


    if (
      message.includes(
        "Google Drive"
      ) ||
      message.includes(
        "Google returned"
      )
    ) {
      return jsonError(
        message,
        400
      );
    }


    return jsonError(
      message,
      500
    );
  }
}
