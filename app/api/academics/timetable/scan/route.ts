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


export const runtime = "nodejs";


const MAX_FILE_SIZE =
  20 * 1024 * 1024;


const ALLOWED_TYPES =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);


type BatchSubject = {
  id: string;
  subject_code: string;
  subject_name: string;
  subject_type: string;
  faculty_id: string | null;
  faculty_name: string;
};


type RawTimetableEntry = {
  day_of_week: string;
  start_period: number;
  end_period: number;
  start_time: string;
  end_time: string;
  raw_text: string;
  detected_code: string;
  detected_name: string;
  detected_faculty: string;
  detected_room: string;
  detected_class_type: string;
  confidence: string;
};


type RawTimetableBreak = {
  label: string;
  start_time: string;
  end_time: string;
};


type VisionResult = {
  entries: RawTimetableEntry[];
  breaks: RawTimetableBreak[];
  warnings: string[];
};


type SubjectMatch = {
  status:
    | "exact"
    | "possible"
    | "unmatched";

  batchSubjectId: string | null;

  subjectCode: string;

  subjectName: string;

  facultyName: string;

  reason: string;
};


type ReviewEntry =
  RawTimetableEntry & {
    match: SubjectMatch;
  };


type ScanResponse = {
  success: boolean;

  mode?:
    | "vision"
    | "pdf-text";

  readOnly?: boolean;

  batchId?: string;

  fileName?: string;

  mimeType?: string;

  pages?: number;

  extractedText?: string;

  entries?: ReviewEntry[];

  breaks?: RawTimetableBreak[];

  warnings?: string[];

  subjects?: BatchSubject[];

  message?: string;

  error?: string;
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


function normalizeExtractedText(
  value: unknown
): string {
  if (
    typeof value === "string"
  ) {
    return value.trim();
  }

  if (
    Array.isArray(value)
  ) {
    return value
      .map(item => {
        if (
          typeof item === "string"
        ) {
          return item;
        }

        if (
          item &&
          typeof item === "object"
        ) {
          const candidate =
            item as Record<
              string,
              unknown
            >;

          if (
            typeof candidate.text ===
            "string"
          ) {
            return candidate.text;
          }

          if (
            typeof candidate.content ===
            "string"
          ) {
            return candidate.content;
          }
        }

        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const candidate =
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
      const normalized =
        normalizeExtractedText(
          candidate[key]
        );

      if (normalized) {
        return normalized;
      }
    }
  }

  return "";
}


function normalizeIdentifier(
  value: string
) {
  return String(value || "")
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}


function normalizeName(
  value: string
) {
  return String(value || "")
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}


function getMimeFromFileName(
  fileName: string
) {
  const extension =
    fileName
      .split(".")
      .pop()
      ?.toLowerCase();

  if (
    extension === "png"
  ) {
    return "image/png";
  }

  if (
    extension === "webp"
  ) {
    return "image/webp";
  }

  if (
    extension === "jpg" ||
    extension === "jpeg"
  ) {
    return "image/jpeg";
  }

  if (
    extension === "pdf"
  ) {
    return "application/pdf";
  }

  return "";
}


function findSubjectMatch(
  entry: RawTimetableEntry,
  subjects: BatchSubject[]
): SubjectMatch {
  const detectedCode =
    normalizeIdentifier(
      entry.detected_code
    );

  const detectedName =
    normalizeName(
      entry.detected_name
    );

  /*
   * Exact code is the strongest safe
   * automatic match.
   */
  if (detectedCode) {
    const codeMatches =
      subjects.filter(
        subject =>
          normalizeIdentifier(
            subject.subject_code
          ) === detectedCode
      );

    if (
      codeMatches.length === 1
    ) {
      const subject =
        codeMatches[0];

      return {
        status: "exact",
        batchSubjectId:
          subject.id,
        subjectCode:
          subject.subject_code,
        subjectName:
          subject.subject_name,
        facultyName:
          subject.faculty_name,
        reason:
          "Exact subject-code match.",
      };
    }
  }

  /*
   * Exact normalized name is also
   * safe when there is only one result.
   */
  if (detectedName) {
    const nameMatches =
      subjects.filter(
        subject =>
          normalizeName(
            subject.subject_name
          ) === detectedName
      );

    if (
      nameMatches.length === 1
    ) {
      const subject =
        nameMatches[0];

      return {
        status: "exact",
        batchSubjectId:
          subject.id,
        subjectCode:
          subject.subject_code,
        subjectName:
          subject.subject_name,
        facultyName:
          subject.faculty_name,
        reason:
          "Exact normalized subject-name match.",
      };
    }
  }

  /*
   * A contained name is only a suggestion.
   * It must never be automatically published.
   */
  if (
    detectedName.length >= 4
  ) {
    const possible =
      subjects.filter(
        subject => {
          const configured =
            normalizeName(
              subject.subject_name
            );

          if (
            configured.length < 4
          ) {
            return false;
          }

          return (
            configured.includes(
              detectedName
            ) ||
            detectedName.includes(
              configured
            )
          );
        }
      );

    if (
      possible.length === 1
    ) {
      const subject =
        possible[0];

      return {
        status: "possible",
        batchSubjectId:
          subject.id,
        subjectCode:
          subject.subject_code,
        subjectName:
          subject.subject_name,
        facultyName:
          subject.faculty_name,
        reason:
          "Possible subject-name match. Faculty review required.",
      };
    }
  }

  return {
    status: "unmatched",
    batchSubjectId: null,
    subjectCode: "",
    subjectName: "",
    facultyName: "",
    reason:
      "No safe match exists in this batch's configured subjects.",
  };
}


function parseVisionResult(
  value: unknown
): VisionResult {
  if (
    !value ||
    typeof value !== "object"
  ) {
    throw new Error(
      "Vision model returned an invalid timetable object."
    );
  }

  const source =
    value as Record<
      string,
      unknown
    >;

  const dayMap:
    Record<string, string> = {
      M: "Monday",
      T: "Tuesday",
      W: "Wednesday",
      Th: "Thursday",
      F: "Friday",
      Sa: "Saturday",
    };

  const normalizeDay = (
    value: unknown
  ) => {
    const raw =
      String(value || "").trim();

    return (
      dayMap[raw] ||
      raw
    );
  };

  const normalizeConfidence = (
    value: unknown
  ) => {
    const raw =
      String(
        value || ""
      )
        .trim()
        .toLowerCase();

    if (
      raw === "h" ||
      raw === "high"
    ) {
      return "high";
    }

    if (
      raw === "m" ||
      raw === "medium"
    ) {
      return "medium";
    }

    if (
      raw === "l" ||
      raw === "low"
    ) {
      return "low";
    }

    return "unknown";
  };

  /*
   * New compact schema:
   *
   * e:
   * [
   *   day,
   *   startPeriod,
   *   endPeriod,
   *   startTime,
   *   endTime,
   *   rawText,
   *   detectedCode,
   *   detectedName,
   *   detectedFaculty,
   *   detectedRoom,
   *   classType,
   *   confidence
   * ]
   *
   * We continue accepting the original verbose schema so
   * older/provider-compatible responses do not break.
   */
  const compactEntries =
    Array.isArray(source.e)
      ? source.e
      : null;

  const verboseEntries =
    Array.isArray(
      source.entries
    )
      ? source.entries
      : [];

  const rawEntries =
    compactEntries ||
    verboseEntries;

  const entries =
    rawEntries
      .map(
        (
          item
        ): RawTimetableEntry | null => {
          let day = "";
          let startPeriod = 0;
          let endPeriod = 0;
          let startTime = "";
          let endTime = "";
          let rawText = "";
          let detectedCode = "";
          let detectedName = "";
          let detectedFaculty = "";
          let detectedRoom = "";
          let detectedClassType = "";
          let confidence = "unknown";

          if (Array.isArray(item)) {
            day =
              normalizeDay(
                item[0]
              );

            startPeriod =
              Number(item[1]);

            endPeriod =
              Number(item[2]);

            startTime =
              String(
                item[3] || ""
              ).trim();

            endTime =
              String(
                item[4] || ""
              ).trim();

            rawText =
              String(
                item[5] || ""
              ).trim();

            detectedCode =
              String(
                item[6] || ""
              ).trim();

            detectedName =
              String(
                item[7] || ""
              ).trim();

            detectedFaculty =
              String(
                item[8] || ""
              ).trim();

            detectedRoom =
              String(
                item[9] || ""
              ).trim();

            detectedClassType =
              String(
                item[10] || ""
              ).trim();

            confidence =
              normalizeConfidence(
                item[11]
              );
          } else if (
            item &&
            typeof item === "object"
          ) {
            const row =
              item as Record<
                string,
                unknown
              >;

            day =
              normalizeDay(
                row.day_of_week
              );

            startPeriod =
              Number(
                row.start_period
              );

            endPeriod =
              Number(
                row.end_period
              );

            startTime =
              String(
                row.start_time ||
                ""
              ).trim();

            endTime =
              String(
                row.end_time ||
                ""
              ).trim();

            rawText =
              String(
                row.raw_text ||
                ""
              ).trim();

            detectedCode =
              String(
                row.detected_code ||
                ""
              ).trim();

            detectedName =
              String(
                row.detected_name ||
                ""
              ).trim();

            detectedFaculty =
              String(
                row.detected_faculty ||
                ""
              ).trim();

            detectedRoom =
              String(
                row.detected_room ||
                ""
              ).trim();

            detectedClassType =
              String(
                row.detected_class_type ||
                ""
              ).trim();

            confidence =
              normalizeConfidence(
                row.confidence
              );
          } else {
            return null;
          }

          if (
            ![
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ].includes(day)
          ) {
            return null;
          }

          if (
            !Number.isInteger(
              startPeriod
            ) ||
            !Number.isInteger(
              endPeriod
            ) ||
            startPeriod < 1 ||
            startPeriod > 20 ||
            endPeriod <
              startPeriod ||
            endPeriod > 20
          ) {
            return null;
          }

          if (!rawText) {
            return null;
          }

          return {
            day_of_week: day,
            start_period:
              startPeriod,
            end_period:
              endPeriod,
            start_time:
              startTime,
            end_time:
              endTime,
            raw_text:
              rawText,
            detected_code:
              detectedCode,
            detected_name:
              detectedName,
            detected_faculty:
              detectedFaculty,
            detected_room:
              detectedRoom,
            detected_class_type:
              detectedClassType,
            confidence,
          };
        }
      )
      .filter(
        (
          item
        ): item is RawTimetableEntry =>
          item !== null
      );

  const compactBreaks =
    Array.isArray(source.b)
      ? source.b
      : null;

  const verboseBreaks =
    Array.isArray(
      source.breaks
    )
      ? source.breaks
      : [];

  const rawBreaks =
    compactBreaks ||
    verboseBreaks;

  const breaks =
    rawBreaks
      .map(
        (
          item
        ): RawTimetableBreak | null => {
          if (Array.isArray(item)) {
            const label =
              String(
                item[0] || ""
              ).trim();

            if (!label) {
              return null;
            }

            return {
              label,
              start_time:
                String(
                  item[1] || ""
                ).trim(),
              end_time:
                String(
                  item[2] || ""
                ).trim(),
            };
          }

          if (
            !item ||
            typeof item !== "object"
          ) {
            return null;
          }

          const row =
            item as Record<
              string,
              unknown
            >;

          const label =
            String(
              row.label ||
              ""
            ).trim();

          if (!label) {
            return null;
          }

          return {
            label,
            start_time:
              String(
                row.start_time ||
                ""
              ).trim(),
            end_time:
              String(
                row.end_time ||
                ""
              ).trim(),
          };
        }
      )
      .filter(
        (
          item
        ): item is RawTimetableBreak =>
          item !== null
      );

  const rawWarnings =
    Array.isArray(source.w)
      ? source.w
      : Array.isArray(
            source.warnings
          )
        ? source.warnings
        : [];

  const warnings =
    rawWarnings
      .map(
        item =>
          String(
            item || ""
          ).trim()
      )
      .filter(Boolean);

  return {
    entries,
    breaks,
    warnings,
  };
}


function parseVisionJsonContent(
  content: string
): unknown {
  let candidate =
    content.trim();

  /*
   * Some models wrap otherwise-valid JSON in a markdown fence
   * even when explicitly asked not to.
   */
  if (
    candidate.startsWith("```")
  ) {
    candidate =
      candidate.replace(
        /^```(?:json)?\s*/i,
        ""
      );

    candidate =
      candidate.replace(
        /\s*```\s*$/,
        ""
      );

    candidate =
      candidate.trim();
  }

  /*
   * First prefer an exact JSON parse. This is the normal path.
   */
  try {
    const parsed =
      JSON.parse(candidate);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed;
    }
  } catch {
    // Try isolating one top-level object below.
  }

  /*
   * If the model adds a short sentence before/after the JSON,
   * isolate the outer object. parseVisionResult() will still
   * perform structural validation afterward.
   */
  const firstBrace =
    candidate.indexOf("{");

  const lastBrace =
    candidate.lastIndexOf("}");

  if (
    firstBrace === -1 ||
    lastBrace === -1 ||
    lastBrace <= firstBrace
  ) {
    throw new Error(
      "Vision model did not return a valid timetable JSON object."
    );
  }

  const objectText =
    candidate.slice(
      firstBrace,
      lastBrace + 1
    );

  try {
    const parsed =
      JSON.parse(objectText);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        "Vision timetable response is not a JSON object."
      );
    }

    return parsed;
  } catch {
    throw new Error(
      "Vision model returned incomplete or malformed timetable JSON."
    );
  }
}


async function scanImageWithVision(
  bytes: Uint8Array,
  mimeType: string,
  subjects: BatchSubject[],
  scanDay: string
): Promise<VisionResult> {
  const apiKey =
    process.env.AI_API_KEY ||
    "";

  const model =
    process.env
      .TIMETABLE_VISION_MODEL ||
    "";

  const aiUrl =
    process.env
      .AI_CHAT_COMPLETIONS_URL ||
    "https://api.groq.com/openai/v1/chat/completions";


  if (
    !apiKey ||
    !model
  ) {
    throw new Error(
      "Timetable vision configuration is incomplete."
    );
  }


  /*
   * Subject reconciliation is intentionally NOT performed by
   * the vision model. findSubjectMatch() handles it after
   * extraction using the configured batch subjects.
   *
   * Compact arrays significantly reduce completion tokens.
   */
  const dayCodes:
    Record<string, string> = {
      Monday: "M",
      Tuesday: "T",
      Wednesday: "W",
      Thursday: "Th",
      Friday: "F",
      Saturday: "Sa",
    };

  const expectedDayCode =
    dayCodes[scanDay];

  if (!expectedDayCode) {
    throw new Error(
      "Invalid timetable scan day."
    );
  }


  /*
   * Extracting one weekday at a time keeps the model output
   * small enough for the provider's completion-token limit
   * and reduces cross-row timetable hallucinations.
   */
  const prompt = `
Read ONLY the ${scanDay} row of this official college timetable.

Ignore Monday-Saturday rows other than ${scanDay}.

This is extraction for faculty review only.
Do not publish anything.
Do not invent classes.
Do not force subjects to match CampusConnect.

Return ONLY one compact JSON object:

{
  "e":[
    ["${expectedDayCode}",1,1,"09:20","10:15","VISIBLE CELL TEXT","","","","","","h"]
  ],
  "b":[],
  "w":[]
}

Each e row is exactly:

[
  day,
  start_period,
  end_period,
  start_time,
  end_time,
  raw_text,
  detected_code,
  detected_name,
  detected_faculty,
  detected_room,
  detected_class_type,
  confidence
]

Rules:
- Extract ${scanDay} only.
- Every e row must use day "${expectedDayCode}".
- confidence must be h, m or l.
- Use 24-hour HH:MM times when readable.
- Period numbers count teaching periods only.
- Break columns do NOT count as teaching periods.
- Preserve visible cell text in raw_text.
- Omit blank cells.
- Put visible breaks in b.
- A merged cell is ONE entry with its true start_period and end_period.
- Never repeat a merged cell for each covered period.
- Preserve combined cells such as "VLSI LAB A1 / DSP LAB A2" together.
- Never choose one alternative from a combined cell.
- Use the timetable legend only when the relationship is clearly visible.
- Never guess a subject code, subject name, faculty, room or class type.
- Use "" for unknown optional fields.
- Follow visible borders when determining merged-cell spans.
- Do not assume a Saturday cell spans the entire day.
- Keep warnings extremely short.
- No markdown.
- No prose outside JSON.
`.trim();


  const base64 =
    Buffer
      .from(bytes)
      .toString("base64");


  const response =
    await fetch(
      aiUrl,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

          body:
            JSON.stringify({
              model,

              /*
               * Timetable extraction is a deterministic
               * document-understanding task, not a reasoning
               * task. Disable visible/internal reasoning so
               * the provider's output budget is spent on the
               * structured result.
               */
              reasoning_effort:
                "none",

              reasoning_format:
                "hidden",

              temperature:
                0,

              max_completion_tokens:
                900,

              /*
               * Qwen 3.8 supports Groq strict structured
               * outputs. Constrained decoding guarantees the
               * response conforms to this schema instead of
               * relying on prompt-only JSON instructions.
               */
              response_format: {
                type:
                  "json_schema",

                json_schema: {
                  name:
                    "campus_timetable_scan",

                  strict:
                    true,

                  schema: {
                    type:
                      "object",

                    properties: {
                      e: {
                        type:
                          "array",

                        items: {
                          type:
                            "array",

                          prefixItems: [
                            {
                              type:
                                "string",
                              enum: [
                                expectedDayCode,
                              ],
                            },
                            {
                              type:
                                "integer",
                              minimum: 1,
                              maximum: 20,
                            },
                            {
                              type:
                                "integer",
                              minimum: 1,
                              maximum: 20,
                            },
                            {
                              type:
                                "string",
                            },
                            {
                              type:
                                "string",
                            },
                            {
                              type:
                                "string",
                            },
                            {
                              type:
                                "string",
                            },
                            {
                              type:
                                "string",
                            },
                            {
                              type:
                                "string",
                            },
                            {
                              type:
                                "string",
                            },
                            {
                              type:
                                "string",
                            },
                            {
                              type:
                                "string",
                              enum: [
                                "h",
                                "m",
                                "l",
                              ],
                            },
                          ],

                          minItems:
                            12,

                          maxItems:
                            12,
                        },
                      },

                      b: {
                        type:
                          "array",

                        items: {
                          type:
                            "array",

                          prefixItems: [
                            {
                              type:
                                "string",
                            },
                            {
                              type:
                                "string",
                            },
                            {
                              type:
                                "string",
                            },
                          ],

                          minItems:
                            3,

                          maxItems:
                            3,
                        },
                      },

                      w: {
                        type:
                          "array",

                        items: {
                          type:
                            "string",
                        },
                      },
                    },

                    required: [
                      "e",
                      "b",
                      "w",
                    ],

                    additionalProperties:
                      false,
                  },
                },
              },

              messages: [
                {
                  role:
                    "user",

                  content: [
                    {
                      type:
                        "text",

                      text:
                        prompt,
                    },

                    {
                      type:
                        "image_url",

                      image_url: {
                        url:
                          `data:${mimeType};base64,${base64}`,
                      },
                    },
                  ],
                },
              ],
            }),
      }
    );


  const raw =
    await response.text();


  if (!response.ok) {
    let providerMessage =
      `Vision provider returned HTTP ${response.status}.`;

    try {
      const parsed =
        JSON.parse(raw);

      if (
        typeof parsed
          ?.error
          ?.message ===
        "string"
      ) {
        providerMessage =
          parsed.error.message;
      }
    } catch {
      // Keep safe generic provider message.
    }

    throw new Error(
      providerMessage
    );
  }


  const payload =
    JSON.parse(raw);

  const content =
    payload
      ?.choices?.[0]
      ?.message?.content;


  if (
    typeof content !==
      "string" ||
    !content.trim()
  ) {
    throw new Error(
      "Vision model returned no timetable content."
    );
  }


  return parseVisionResult(
    parseVisionJsonContent(
      content
    )
  );
}


export async function POST(
  _request: NextRequest
) {
  /*
   * CampusConnect Timetable V2
   *
   * The legacy uploaded-image/PDF timetable scanner
   * is permanently retired.
   *
   * Timetable creation and modification now happens
   * only through the department-scoped
   * Timetable Coordinator Digital Builder.
   */
  return jsonError(
    "Legacy official timetable scanning has been retired. Use the Timetable Coordinator Digital Builder.",
    410
  );
}
