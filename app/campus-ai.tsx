"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  getSupabaseClient,
} from "../lib/supabase";

import {
  NotesQuiz,
} from "./notes-quiz";

import {NotesPageSummary} from "./notes-page-summary";


type CampusAiProfile = {
  name: string;
  department: string;
  year: string;
  role?: string;
};


type AiSource = {
  key: string;
  label: string;
  count: number;
};


type AiMessage = {
  id: string;

  role:
    | "user"
    | "assistant";

  content: string;

  sources:
    AiSource[];

  created_at?: string;
};


type AiConversation = {
  id: string;
  title: string;
  updated_at: string;
};


type ChatResponse = {
  ok?: boolean;
  conversationId?: string;
  answer?: string;
  sources?: AiSource[];
  error?: string;
};


type CampusAiMode =
  | "general"
  | "academic_advisor"
  | "attendance_advisor"
  | "performance_coach"
  | "daily_briefing"
  | "notes_ai"
  | "quiz_generator"
  | "placement_coach"
  | "resume_analyzer"
  | "career_roadmap";


const academicAdvisorQuestions = [
  {
    eyebrow: "FULL REVIEW",
    title: "Review my academics",
    prompt:
      "Act as my CampusConnect Academic Advisor. Review my available subjects, timetable, attendance, marks, results, assignments, submissions and academic events. Give me my current academic picture, no more than three priorities, and a practical next-step plan. Clearly identify unavailable data.",
    icon: "A",
  },
  {
    eyebrow: "ACTION PLAN",
    title: "Plan my next 7 days",
    prompt:
      "Act as my CampusConnect Academic Advisor and create a realistic seven-day academic action plan using only my available timetable, assignments, exams, marks and attendance. Do not invent dates, classes or deadlines.",
    icon: "7",
  },
  {
    eyebrow: "SUBJECT FOCUS",
    title: "Where should I focus?",
    prompt:
      "Act as my CampusConnect Academic Advisor. Compare only the academic evidence actually available for my subjects and tell me where I should focus first, why, and what concrete action to take. Do not label a subject weak without supporting data.",
    icon: "↗",
  },
  {
    eyebrow: "UPCOMING WORK",
    title: "Check upcoming priorities",
    prompt:
      "Act as my CampusConnect Academic Advisor. Review my available upcoming assignments, submissions, timetable and academic events. List urgent work in a sensible order and clearly state when no deadline or schedule data is available.",
    icon: "✓",
  },
];


const attendanceAdvisorQuestions = [
  {
    eyebrow: "ATTENDANCE REVIEW",
    title: "Review my attendance",
    prompt:
      "Act as my CampusConnect Attendance Advisor. Review every available attendance source subject by subject. Show the current percentage only when CampusConnect provides valid attended and total values, identify subjects below 75 percent, and give practical next actions without inventing records.",
    icon: "%",
  },
  {
    eyebrow: "75% TARGET",
    title: "How do I reach 75%?",
    prompt:
      "Act as my CampusConnect Attendance Advisor. For each subject below 75 percent, use only CampusConnect's deterministic attendance calculations to tell me how many consecutive classes I need to attend. Do not calculate the values yourself and do not guess when records are missing.",
    icon: "75",
  },
  {
    eyebrow: "SAFE MARGIN",
    title: "Can I miss a class?",
    prompt:
      "Act as my CampusConnect Attendance Advisor. For each subject at or above 75 percent, report CampusConnect's calculated maximum classes I can currently miss while staying at or above 75 percent. Clearly warn me when there is no safe margin or insufficient data.",
    icon: "−",
  },
  {
    eyebrow: "SESSION RECORDS",
    title: "Check recent sessions",
    prompt:
      "Act as my CampusConnect Attendance Advisor. Summarize my available session-based attendance records using their exact Present, Absent, Late and Excused statuses. Do not convert Late or Excused into Present or calculate a percentage unless valid totals are supplied by CampusConnect.",
    icon: "S",
  },
];


const performanceCoachQuestions = [
  {
    eyebrow: "PERFORMANCE REVIEW",
    title: "Review my performance",
    prompt:
      "Act as my CampusConnect Performance Coach. Review only my available marks, semester results, subjects and coursework. Explain the evidence, identify supported strengths and focus areas, and give no more than three practical next actions. Clearly identify missing data.",
    icon: "P",
  },
  {
    eyebrow: "SUBJECT INSIGHTS",
    title: "Find focus subjects",
    prompt:
      "Act as my CampusConnect Performance Coach. Compare subjects only when the available assessments are genuinely comparable. Identify supported strong and weak areas, cite the exact evidence, and do not rank subjects when maximum marks or assessment types are incompatible or unavailable.",
    icon: "↗",
  },
  {
    eyebrow: "IMPROVEMENT PLAN",
    title: "Build an improvement plan",
    prompt:
      "Act as my CampusConnect Performance Coach. Using only my available marks, results, assignments and subjects, create a concise improvement plan with specific actions. Do not invent target scores, deadlines, tests or study hours.",
    icon: "✓",
  },
  {
    eyebrow: "RESULT TREND",
    title: "Explain my result trend",
    prompt:
      "Act as my CampusConnect Performance Coach. Explain any performance trend supported by my available semester results and assessment records. Keep different semesters and assessment types separate, and say when there is not enough comparable history to establish a trend.",
    icon: "T",
  },
];


const dailyBriefingQuestions = [
  {
    eyebrow: "TODAY",
    title: "Generate my briefing",
    prompt:
      "Generate my CampusConnect Daily AI Briefing using only my currently available authenticated records. Show dated items relevant today, urgent academic work, meaningful attendance or performance signals, and no more than three practical next actions. Clearly identify unavailable data.",
    icon: "D",
  },
  {
    eyebrow: "DEADLINES",
    title: "Check urgent work",
    prompt:
      "Generate a concise Daily AI Briefing focused on my available assignments, submissions, exams and academic events. Order only genuinely dated items by urgency. Do not invent deadlines or call undated work overdue.",
    icon: "!",
  },
  {
    eyebrow: "THIS WEEK",
    title: "Preview my academic week",
    prompt:
      "Generate a seven-day academic briefing from my available timetable, assignments, submissions and academic events. Use exact authorized dates and clearly say when timetable or deadline records are unavailable.",
    icon: "7",
  },
  {
    eyebrow: "NEXT ACTIONS",
    title: "Set today's priorities",
    prompt:
      "Generate my Daily AI Briefing and give me no more than three priorities supported by my available attendance, performance, timetable and coursework evidence. Explain briefly why each priority matters.",
    icon: "✓",
  },
];


const placementCoachQuestions = [
  {
    eyebrow: "PLACEMENT REVIEW",
    title: "Review my readiness",
    prompt:
      "Act as my CampusConnect Placement Coach. Review my real profile, Resume Studio information, current applications and current placement-drive matches. Explain my current position, best supported opportunities, evidence-based gaps, and no more than three next actions. Do not invent applications, eligibility or offers.",
    icon: "P",
  },
  {
    eyebrow: "DRIVE MATCHES",
    title: "Find my best matches",
    prompt:
      "Act as my CampusConnect Placement Coach. Rank only my visible current placement drives using CampusConnect's deterministic ai_calculated match results. Separate eligibility from match quality, explain matched and missing skills, and do not guarantee selection.",
    icon: "↗",
  },
  {
    eyebrow: "APPLICATIONS",
    title: "Review my applications",
    prompt:
      "Act as my CampusConnect Placement Coach. Review my actual placement applications, their recorded statuses and next steps. Identify where action is supported by the records and clearly state when application data is unavailable.",
    icon: "A",
  },
  {
    eyebrow: "SKILL GAPS",
    title: "What skills am I missing?",
    prompt:
      "Act as my CampusConnect Placement Coach. Use only the deterministic missing-skills data from my visible drive matches. Group repeated gaps, connect them to real roles or companies, and give a focused learning priority without inventing requirements.",
    icon: "+",
  },
];


const resumeAnalyzerQuestions = [
  {
    eyebrow: "RESUME REVIEW",
    title: "Analyze my resume",
    prompt:
      "Act as my CampusConnect Resume Analyzer. Review my real Resume Studio headline, summary, skills, projects, experience, achievements, certifications and professional links. Identify supported strengths, missing sections and specific improvements. Never invent an ATS score, metrics or experience.",
    icon: "R",
  },
  {
    eyebrow: "MISSING CONTENT",
    title: "Find resume gaps",
    prompt:
      "Act as my CampusConnect Resume Analyzer. Use the deterministic resume_signals and actual Resume Studio records to identify incomplete or missing sections. Prioritize the gaps that most affect my current visible placement opportunities.",
    icon: "!",
  },
  {
    eyebrow: "PROJECT IMPACT",
    title: "Improve my projects",
    prompt:
      "Act as my CampusConnect Resume Analyzer. Review only the projects saved in Resume Studio. Explain which descriptions need clearer problem, implementation, technology or outcome evidence. Suggest structure, but never invent numbers, users, results or technologies.",
    icon: "PR",
  },
  {
    eyebrow: "ROLE ALIGNMENT",
    title: "Align resume to drives",
    prompt:
      "Act as my CampusConnect Resume Analyzer. Compare my actual resume content with the skills required by my current visible placement-drive matches. Identify supported keywords already present and genuine missing skills without keyword stuffing or fabricated experience.",
    icon: "⇄",
  },
];


const careerRoadmapQuestions = [
  {
    eyebrow: "90-DAY ROADMAP",
    title: "Build my career roadmap",
    prompt:
      "Act as my CampusConnect Career Roadmap coach. Build a practical 30, 60 and 90-day roadmap using only my real profile, resume evidence, application progress and current drive skill gaps. Mark recommendations as recommendations and do not promise placement outcomes.",
    icon: "90",
  },
  {
    eyebrow: "NEXT ROLE",
    title: "Choose my focus roles",
    prompt:
      "Act as my CampusConnect Career Roadmap coach. Identify role directions supported by my actual skills, projects and current deterministic placement matches. Explain the evidence and data gaps; do not infer interests or abilities that are not recorded.",
    icon: "◎",
  },
  {
    eyebrow: "LEARNING PLAN",
    title: "Plan skill development",
    prompt:
      "Act as my CampusConnect Career Roadmap coach. Create a focused learning sequence from repeated missing skills across my current visible placement matches. Keep it realistic, evidence-based and limited to the most important priorities.",
    icon: "L",
  },
  {
    eyebrow: "PORTFOLIO PLAN",
    title: "Plan portfolio improvements",
    prompt:
      "Act as my CampusConnect Career Roadmap coach. Use my real Resume Studio projects, professional links, achievements and certifications to recommend the next portfolio improvements. Clearly state which records are missing and never invent project results.",
    icon: "PF",
  },
];


const notesAiQuestions = [
  {
    eyebrow: "GROUNDED SUMMARY",
    title: "Summarize my notes",
    prompt:
      "Summarize the relevant indexed learning resource using only retrieved document excerpts. Preserve important terms and clearly say when the available excerpts are insufficient.",
    icon: "N",
  },
  {
    eyebrow: "CONCEPT HELP",
    title: "Explain a concept",
    prompt:
      "Explain the concept I ask about using only my indexed learning resources. Cite the resource title supporting the explanation and do not add unsupported textbook facts.",
    icon: "?",
  },
  {
    eyebrow: "REVISION",
    title: "Create revision points",
    prompt:
      "Create concise revision points from the relevant indexed document excerpts. Include only facts present in those excerpts and identify any missing coverage.",
    icon: "R",
  },
  {
    eyebrow: "FIND IN NOTES",
    title: "Find an answer",
    prompt:
      "Find the answer in my indexed learning resources. Give the supported answer first, name the source resource, and say clearly if no matching excerpt is available.",
    icon: "⌕",
  },
];


const suggestedQuestions = [
  {
    eyebrow:
      "ACADEMIC ADVISOR",

    title:
      "Academic briefing",

    prompt:
      "Give me a concise academic briefing using only my available CampusConnect data. Highlight the most important thing I should focus on next.",

    icon:
      "A",
  },

  {
    eyebrow:
      "ATTENDANCE",

    title:
      "Attendance health",

    prompt:
      "Analyze my attendance by subject. Tell me which subjects are at risk and how many classes I need to attend to reach 75 percent. Use only my real CampusConnect data.",

    icon:
      "%",
  },

  {
    eyebrow:
      "PERFORMANCE",

    title:
      "Find weak subjects",

    prompt:
      "Analyze my available marks and results. Identify my strongest and weakest subjects and give me practical improvement priorities. Do not invent missing results.",

    icon:
      "↗",
  },

  {
    eyebrow:
      "PRIORITIES",

    title:
      "What should I do next?",

    prompt:
      "Look at my available assignments, academics and campus records. Tell me what I should prioritize next and explain why.",

    icon:
      "✓",
  },
];


function normalizeSources(
  value: unknown
): AiSource[] {

  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }


  return value
    .filter(
      item =>
        item &&
        typeof item ===
          "object"
    )
    .map(
      item => {

        const source =
          item as
            Record<
              string,
              unknown
            >;


        return {
          key:
            String(
              source.key ||
              ""
            ),

          label:
            String(
              source.label ||
              "CampusConnect source"
            ),

          count:
            Number(
              source.count ||
              0
            ),
        };
      }
    );
}


function RichMessage({
  text,
}: {
  text: string;
}) {

  const lines =
    text.split(
      "\n"
    );


  return (
    <div className="campusAiRichText">

      {lines.map(
        (
          line,
          lineIndex
        ) => {

          const pieces =
            line.split(
              /(\*\*[^*]+\*\*)/g
            );


          return (
            <p
              key={
                `${lineIndex}-${line}`
              }
            >

              {pieces.map(
                (
                  piece,
                  index
                ) => {

                  if (
                    piece.startsWith(
                      "**"
                    ) &&
                    piece.endsWith(
                      "**"
                    )
                  ) {

                    return (
                      <strong
                        key={index}
                      >
                        {piece.slice(
                          2,
                          -2
                        )}
                      </strong>
                    );
                  }


                  return (
                    <span
                      key={index}
                    >
                      {piece}
                    </span>
                  );
                }
              )}

            </p>
          );
        }
      )}

    </div>
  );
}


function formatConversationDate(
  value: string
) {

  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }


  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day:
        "numeric",

      month:
        "short",
    }
  ).format(
    date
  );
}


export function CampusAI({
  profile,
}: {
  profile:
    CampusAiProfile;
}) {

  const [
    conversations,
    setConversations,
  ] =
    useState<
      AiConversation[]
    >([]);


  const [
    activeConversationId,
    setActiveConversationId,
  ] =
    useState<
      string | null
    >(null);


  const [
    messages,
    setMessages,
  ] =
    useState<
      AiMessage[]
    >([]);


  const [
    query,
    setQuery,
  ] =
    useState(
      ""
    );


  const [
    assistantMode,
    setAssistantMode,
  ] =
    useState<CampusAiMode>(
      "general"
    );


  const [
    selectedSourceId,
    setSelectedSourceId,
  ] =
    useState("");

  const [
    selectedSourceTitle,
    setSelectedSourceTitle,
  ] =
    useState("");


  const [
    sending,
    setSending,
  ] =
    useState(
      false
    );


  const [
    loadingConversation,
    setLoadingConversation,
  ] =
    useState(
      false
    );


  const [
    status,
    setStatus,
  ] =
    useState(
      ""
    );


  const bottomRef =
    useRef<
      HTMLDivElement | null
    >(null);


  const firstName =
    profile.name
      .trim()
      .split(/\s+/)[0] ||
    "Student";


  const activeConversation =
    useMemo(
      () =>
        conversations.find(
          item =>
            item.id ===
            activeConversationId
        ) ||
        null,
      [
        conversations,
        activeConversationId,
      ]
    );


  const activeSuggestions =
    assistantMode ===
    "academic_advisor"
      ? academicAdvisorQuestions
      : assistantMode ===
        "attendance_advisor"
      ? attendanceAdvisorQuestions
      : assistantMode ===
        "performance_coach"
      ? performanceCoachQuestions
      : assistantMode ===
        "daily_briefing"
      ? dailyBriefingQuestions
      : assistantMode ===
        "notes_ai"
      ? notesAiQuestions
      : assistantMode ===
        "placement_coach"
      ? placementCoachQuestions
      : assistantMode ===
        "resume_analyzer"
      ? resumeAnalyzerQuestions
      : assistantMode ===
        "career_roadmap"
      ? careerRoadmapQuestions
      : suggestedQuestions;


  function selectAssistantMode(
    nextMode: CampusAiMode
  ) {

    if (
      nextMode ===
      assistantMode
    ) {
      return;
    }


    setAssistantMode(
      nextMode
    );

    setSelectedSourceId("");
    setSelectedSourceTitle("");

    setActiveConversationId(
      null
    );

    setMessages(
      []
    );

    setQuery(
      ""
    );

    setStatus(
      ""
    );
  }


  async function loadConversations() {

    const client =
      getSupabaseClient();


    if (
      !client
    ) {
      return;
    }


    const {
      data,
      error,
    } =
      await client
        .from(
          "ai_conversations"
        )
        .select(
          "id,title,updated_at"
        )
        .order(
          "updated_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          30
        );


    if (
      error
    ) {

      console.error(
        "[Campus AI] conversation load:",
        error
      );

      return;
    }


    setConversations(
      (
        data ||
        []
      ) as
        AiConversation[]
    );
  }


  async function openConversation(
    conversationId:
      string
  ) {

    const client =
      getSupabaseClient();


    if (
      !client
    ) {
      return;
    }


    setLoadingConversation(
      true
    );

    setStatus(
      ""
    );


    try {

      const {
        data,
        error,
      } =
        await client
          .from(
            "ai_messages"
          )
          .select(
            "id,role,content,sources,created_at"
          )
          .eq(
            "conversation_id",
            conversationId
          )
          .order(
            "created_at",
            {
              ascending:
                true,
            }
          );


      if (
        error
      ) {
        throw error;
      }


      const nextMessages =
        (
          data ||
          []
        )
          .filter(
            row =>
              row.role ===
                "user" ||
              row.role ===
                "assistant"
          )
          .map(
            row => ({
              id:
                String(
                  row.id
                ),

              role:
                row.role as
                  | "user"
                  | "assistant",

              content:
                String(
                  row.content ||
                  ""
                ),

              sources:
                normalizeSources(
                  row.sources
                ),

              created_at:
                String(
                  row.created_at ||
                  ""
                ),
            })
          );


      setActiveConversationId(
        conversationId
      );

      setMessages(
        nextMessages
      );

    } catch (
      error
    ) {

      console.error(
        "[Campus AI] message load:",
        error
      );

      setStatus(
        "Unable to load this conversation."
      );

    } finally {

      setLoadingConversation(
        false
      );
    }
  }


  function newChat() {

    setActiveConversationId(
      null
    );

    setMessages(
      []
    );

    setQuery(
      ""
    );

    setStatus(
      ""
    );
  }


  async function clearChat() {

    if (
      !messages.length &&
      !activeConversationId
    ) {

      setStatus(
        "There is no chat to clear."
      );

      return;
    }


    const confirmed =
      window.confirm(
        "Clear this Campus AI chat? This removes the current conversation from your AI history."
      );


    if (
      !confirmed
    ) {
      return;
    }


    const client =
      getSupabaseClient();


    if (
      !client
    ) {

      setStatus(
        "CampusConnect database is unavailable."
      );

      return;
    }


    if (
      activeConversationId
    ) {

      const {
        error:
          messageDeleteError,
      } =
        await client
          .from(
            "ai_messages"
          )
          .delete()
          .eq(
            "conversation_id",
            activeConversationId
          );


      if (
        messageDeleteError
      ) {

        setStatus(
          messageDeleteError.message
        );

        return;
      }


      const {
        error:
          conversationDeleteError,
      } =
        await client
          .from(
            "ai_conversations"
          )
          .delete()
          .eq(
            "id",
            activeConversationId
          );


      if (
        conversationDeleteError
      ) {

        console.warn(
          "[Campus AI] conversation cleanup:",
          conversationDeleteError
        );
      }
    }


    setMessages(
      []
    );

    setActiveConversationId(
      null
    );

    setQuery(
      ""
    );

    setStatus(
      "Chat cleared."
    );


    await loadConversations();
  }


  function downloadChat() {

    if (
      !messages.length
    ) {

      setStatus(
        "There is no conversation to download."
      );

      return;
    }


    const transcript =
      [
        "CAMPUSCONNECT AI",
        "================",
        "",
        `Student: ${profile.name}`,
        `Department: ${profile.department || "Not available"}`,
        `Graduation year: ${profile.year || "Not available"}`,
        `Exported: ${new Date().toLocaleString("en-IN")}`,
        "",
        "CONVERSATION",
        "------------",
        "",

        ...messages.flatMap(
          message => {

            const sourceText =
              message.sources.length
                ? [
                    "",
                    `Sources: ${message.sources
                      .map(
                        source =>
                          `${source.label} (${source.count})`
                      )
                      .join(
                        ", "
                      )}`,
                  ]
                : [];


            return [
              `${message.role === "user" ? "YOU" : "CAMPUS AI"}:`,
              message.content,
              ...sourceText,
              "",
            ];
          }
        ),
      ].join(
        "\n"
      );


    const blob =
      new Blob(
        [
          transcript,
        ],
        {
          type:
            "text/plain;charset=utf-8",
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const anchor =
      document.createElement(
        "a"
      );


    anchor.href =
      url;

    anchor.download =
      `campusconnect-ai-chat-${new Date()
        .toISOString()
        .slice(
          0,
          10
        )}.txt`;


    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();


    URL.revokeObjectURL(
      url
    );


    setStatus(
      "Chat downloaded."
    );
  }


  async function copyMessage(
    content: string
  ) {

    try {

      await navigator.clipboard.writeText(
        content
      );

      setStatus(
        "Response copied."
      );

    } catch {

      setStatus(
        "Unable to copy this response."
      );
    }
  }


  async function sendQuestion(
    rawQuestion?: string
  ) {

    const question =
      (
        rawQuestion ??
        query
      )
        .trim();


    if (
      !question ||
      sending
    ) {
      return;
    }


    const client =
      getSupabaseClient();


    if (
      !client
    ) {

      setStatus(
        "CampusConnect is not connected."
      );

      return;
    }


    const {
      data:
        sessionData,
    } =
      await client.auth
        .getSession();


    const token =
      sessionData.session
        ?.access_token;


    if (
      !token
    ) {

      setStatus(
        "Your session expired. Sign in again."
      );

      return;
    }


    const optimisticUser:
      AiMessage =
      {
        id:
          `user-${Date.now()}`,

        role:
          "user",

        content:
          question,

        sources:
          [],

        created_at:
          new Date()
            .toISOString(),
      };


    setMessages(
      current => [
        ...current,
        optimisticUser,
      ]
    );


    setQuery(
      ""
    );

    setSending(
      true
    );

    setStatus(
      ""
    );


    try {

      const response =
        await fetch(
          "/api/ai/chat",
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                message:
                  question,

                conversationId:
                  activeConversationId,

                timeZone:
                  Intl
                    .DateTimeFormat()
                    .resolvedOptions()
                    .timeZone ||
                  "Asia/Kolkata",

                assistantMode,

                sourceId:
                  selectedSourceId ||
                  null,
              }),
          }
        );


      const result =
        (
          await response.json()
        ) as
          ChatResponse;


      if (
        !response.ok ||
        !result.ok
      ) {

        throw new Error(
          result.error ||
          "Campus AI could not answer this request."
        );
      }


      if (
        !result.answer
      ) {

        throw new Error(
          "Campus AI returned an empty response."
        );
      }


      const nextConversationId =
        result.conversationId ||
        activeConversationId;


      if (
        nextConversationId
      ) {

        setActiveConversationId(
          nextConversationId
        );
      }


      setMessages(
        current => [
          ...current,

          {
            id:
              `assistant-${Date.now()}`,

            role:
              "assistant",

            content:
              result.answer ||
              "",

            sources:
              normalizeSources(
                result.sources
              ),

            created_at:
              new Date()
                .toISOString(),
          },
        ]
      );


      await loadConversations();

    } catch (
      error
    ) {

      const message =
        error instanceof
        Error
          ? error.message
          : "AI is temporarily unavailable.";


      setStatus(
        message
      );

    } finally {

      setSending(
        false
      );
    }
  }


  function submit(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    void sendQuestion();
  }


  useEffect(
    () => {

      void loadConversations();

    },
    []
  );


  useEffect(
    () => {
      const rawIntent =
        window.sessionStorage.getItem(
          "campusconnect-ai-intent"
        );

      if (!rawIntent) {
        return;
      }

      window.sessionStorage.removeItem(
        "campusconnect-ai-intent"
      );

      try {
        const intent =
          JSON.parse(rawIntent) as {
            mode?: unknown;
            prompt?: unknown;
            sourceId?: unknown;
            sourceTitle?: unknown;
            createdAt?: unknown;
          };

        const allowedModes:
          CampusAiMode[] = [
            "general",
            "academic_advisor",
            "attendance_advisor",
            "performance_coach",
            "daily_briefing",
            "notes_ai",
            "quiz_generator",
            "placement_coach",
            "resume_analyzer",
            "career_roadmap",
          ];

        const nextMode =
          typeof intent.mode ===
            "string" &&
          allowedModes.includes(
            intent.mode as CampusAiMode
          )
            ? intent.mode as CampusAiMode
            : null;

        const nextPrompt =
          typeof intent.prompt ===
          "string"
            ? intent.prompt
                .trim()
                .slice(0, 4000)
            : "";

        const createdAt =
          Number(intent.createdAt);

        const isFresh =
          Number.isFinite(createdAt) &&
          Date.now() - createdAt <
            2 * 60 * 1000;

        if (
          !nextMode ||
          !nextPrompt ||
          !isFresh
        ) {
          return;
        }

        const usesLearningSource =
          nextMode === "notes_ai" ||
          nextMode === "quiz_generator";

        const nextSourceId =
          usesLearningSource &&
          typeof intent.sourceId ===
            "string"
            ? intent.sourceId.trim()
            : "";

        const nextSourceTitle =
          usesLearningSource &&
          typeof intent.sourceTitle ===
            "string"
            ? intent.sourceTitle
                .trim()
                .slice(0, 500)
            : "";

        setAssistantMode(nextMode);
        setSelectedSourceId(nextSourceId);
        setSelectedSourceTitle(nextSourceTitle);
        setActiveConversationId(null);
        setMessages([]);
        setQuery(nextPrompt);
        setStatus(
          "Your CampusConnect question is prepared. Review it, then send when ready."
        );

        window.setTimeout(
          () => {
            document
              .querySelector<HTMLTextAreaElement>(
                ".campusAiComposer textarea"
              )
              ?.focus();
          },
          120
        );
      } catch (error) {
        console.warn(
          "[Campus AI] invalid academic intent:",
          error
        );
      }
    },
    []
  );


  useEffect(
    () => {

      bottomRef.current
        ?.scrollIntoView({
          behavior:
            "smooth",

          block:
            "end",
        });

    },
    [
      messages,
      sending,
    ]
  );


  return (
    <div className="campusAiPage">

      <section className="campusAiHero">

        <div className="campusAiHeroMain">

          <div className="campusAiOrbWrap">

            <div className="campusAiOrb">

              <span>
                C
              </span>

            </div>

            <i />

          </div>


          <div className="campusAiHeroCopy">

            <span className="campusAiEyebrow">
              CAMPUSCONNECT INTELLIGENCE
            </span>

            <h2>
              Your campus,
              now intelligent.
            </h2>

            <p>
              Ask about your academics,
              attendance, assignments,
              results and campus records.
              Campus AI uses only the
              information available to
              your authenticated account.
            </p>


            <div className="campusAiIdentity">

              <span>
                {firstName}
              </span>

              <i />

              <span>
                {profile.department ||
                  "Department"}
              </span>

              <i />

              <span>
                {profile.year ||
                  "Student"}
              </span>

            </div>

          </div>

        </div>


        <div className="campusAiHeroSignals">

          <article>

            <small>
              DATA ACCESS
            </small>

            <strong>
              RLS secured
            </strong>

            <span>
              Your account only
            </span>

          </article>


          <article>

            <small>
              CONTEXT
            </small>

            <strong>
              Live
            </strong>

            <span>
              CampusConnect records
            </span>

          </article>


          <article>

            <small>
              HISTORY
            </small>

            <strong>
              {conversations.length}
            </strong>

            <span>
              AI conversations
            </span>

          </article>

        </div>

      </section>


      <section className="campusAiWorkspace">

        <aside className="campusAiSidebar">

          <div className="campusAiSidebarHead">

            <div>

              <span>
                AI WORKSPACE
              </span>

              <h3>
                Conversations
              </h3>

            </div>


            <button
              type="button"
              className="campusAiNewButton"
              onClick={
                newChat
              }
            >
              +
            </button>

          </div>


          <button
            type="button"
            className="campusAiStartButton"
            onClick={
              newChat
            }
          >

            <span>
              ✦
            </span>

            <div>
              <b>
                New conversation
              </b>

              <small>
                Start with fresh context
              </small>
            </div>

          </button>


          <div className="campusAiHistory">

            <p className="campusAiHistoryLabel">
              RECENT
            </p>


            {conversations.length ? (

              conversations.map(
                conversation => (

                  <button
                    type="button"
                    key={
                      conversation.id
                    }
                    className={
                      activeConversationId ===
                      conversation.id
                        ? "campusAiHistoryItem active"
                        : "campusAiHistoryItem"
                    }
                    onClick={() =>
                      void openConversation(
                        conversation.id
                      )
                    }
                  >

                    <span>
                      ◇
                    </span>

                    <div>

                      <b>
                        {conversation.title ||
                          "Campus AI conversation"}
                      </b>

                      <small>
                        {formatConversationDate(
                          conversation.updated_at
                        )}
                      </small>

                    </div>

                  </button>
                )
              )

            ) : (

              <div className="campusAiNoHistory">

                <span>
                  ◌
                </span>

                <p>
                  Your conversations
                  will appear here.
                </p>

              </div>
            )}

          </div>


          <div className="campusAiSecureCard">

            <span>
              ●
            </span>

            <div>

              <b>
                Private AI context
              </b>

              <small>
                Protected by your
                CampusConnect session
                and Supabase RLS.
              </small>

            </div>

          </div>

        </aside>


        <main className="campusAiChat">

          <header className="campusAiChatHeader">

            <div>

              <span className="campusAiLiveDot" />

              <div>

                <small>
                  CAMPUS AI
                </small>

                <h3>
                  {activeConversation
                    ?.title ||
                    "New conversation"}
                </h3>

              </div>

            </div>


            <nav
              className="campusAiModeSwitch"
              aria-label="Campus AI mode"
            >

              <button
                type="button"
                className={
                  assistantMode ===
                  "general"
                    ? "active"
                    : ""
                }
                aria-pressed={
                  assistantMode ===
                  "general"
                }
                onClick={() =>
                  selectAssistantMode(
                    "general"
                  )
                }
              >
                Campus AI
              </button>

              <button
                type="button"
                className={
                  assistantMode ===
                  "academic_advisor"
                    ? "active"
                    : ""
                }
                aria-pressed={
                  assistantMode ===
                  "academic_advisor"
                }
                onClick={() =>
                  selectAssistantMode(
                    "academic_advisor"
                  )
                }
              >
                Academic Advisor
              </button>

              <button
                type="button"
                className={
                  assistantMode ===
                  "attendance_advisor"
                    ? "active"
                    : ""
                }
                aria-pressed={
                  assistantMode ===
                  "attendance_advisor"
                }
                onClick={() =>
                  selectAssistantMode(
                    "attendance_advisor"
                  )
                }
              >
                Attendance Advisor
              </button>

              <button
                type="button"
                className={
                  assistantMode ===
                  "performance_coach"
                    ? "active"
                    : ""
                }
                aria-pressed={
                  assistantMode ===
                  "performance_coach"
                }
                onClick={() =>
                  selectAssistantMode(
                    "performance_coach"
                  )
                }
              >
                Performance Coach
              </button>

              <button
                type="button"
                className={
                  assistantMode ===
                  "daily_briefing"
                    ? "active"
                    : ""
                }
                aria-pressed={
                  assistantMode ===
                  "daily_briefing"
                }
                onClick={() =>
                  selectAssistantMode(
                    "daily_briefing"
                  )
                }
              >
                Daily Briefing
              </button>

              <button
                type="button"
                className={
                  assistantMode ===
                  "notes_ai"
                    ? "active"
                    : ""
                }
                aria-pressed={
                  assistantMode ===
                  "notes_ai"
                }
                onClick={() =>
                  selectAssistantMode(
                    "notes_ai"
                  )
                }
              >
                Notes AI
              </button>

              <button
                type="button"
                className={
                  assistantMode ===
                  "quiz_generator"
                    ? "active"
                    : ""
                }
                aria-pressed={
                  assistantMode ===
                  "quiz_generator"
                }
                onClick={() =>
                  selectAssistantMode(
                    "quiz_generator"
                  )
                }
              >
                Quiz Generator
              </button>

              <button
                type="button"
                className={
                  assistantMode ===
                  "placement_coach"
                    ? "active"
                    : ""
                }
                aria-pressed={
                  assistantMode ===
                  "placement_coach"
                }
                onClick={() =>
                  selectAssistantMode(
                    "placement_coach"
                  )
                }
              >
                Placement Coach
              </button>

              <button
                type="button"
                className={
                  assistantMode ===
                  "resume_analyzer"
                    ? "active"
                    : ""
                }
                aria-pressed={
                  assistantMode ===
                  "resume_analyzer"
                }
                onClick={() =>
                  selectAssistantMode(
                    "resume_analyzer"
                  )
                }
              >
                Resume Analyzer
              </button>

              <button
                type="button"
                className={
                  assistantMode ===
                  "career_roadmap"
                    ? "active"
                    : ""
                }
                aria-pressed={
                  assistantMode ===
                  "career_roadmap"
                }
                onClick={() =>
                  selectAssistantMode(
                    "career_roadmap"
                  )
                }
              >
                Career Roadmap
              </button>

            </nav>


            <div className="campusAiChatActions">

              <button
                type="button"
                onClick={
                  newChat
                }
              >
                New
              </button>

              <button
                type="button"
                onClick={
                  clearChat
                }
                disabled={
                  !messages.length &&
                  !activeConversationId
                }
              >
                Clear chat
              </button>

              <button
                type="button"
                onClick={
                  downloadChat
                }
                disabled={
                  !messages.length
                }
              >
                Download
              </button>

            </div>

          </header>


          <div className="campusAiMessages">

            {assistantMode === "notes_ai" && selectedSourceId && (
              <NotesPageSummary
                sourceId={selectedSourceId}
                sourceTitle={selectedSourceTitle}
              />
            )}

            {assistantMode ===
              "quiz_generator" ? (
              <NotesQuiz
                sourceId={selectedSourceId}
                sourceTitle={selectedSourceTitle}
                onOpenLearning={() => {
                  window.dispatchEvent(
                    new CustomEvent(
                      "campus-navigate",
                      {
                        detail: "Learning",
                      }
                    )
                  );
                }}
              />
            ) : loadingConversation ? (

              <div className="campusAiLoadingConversation">

                <span />

                <span />

                <span />

                <p>
                  Loading conversation
                </p>

              </div>

            ) : !messages.length ? (

              <div className="campusAiWelcome">

                <div
                  className={
                    assistantMode ===
                    "academic_advisor"
                      ? "campusAiWelcomeMark advisor"
                      : assistantMode ===
                        "attendance_advisor"
                      ? "campusAiWelcomeMark attendance"
                      : assistantMode ===
                        "performance_coach"
                      ? "campusAiWelcomeMark performance"
                      : assistantMode ===
                        "daily_briefing"
                      ? "campusAiWelcomeMark briefing"
                      : assistantMode ===
                        "notes_ai"
                      ? "campusAiWelcomeMark notes"
                      : assistantMode ===
                        "placement_coach"
                      ? "campusAiWelcomeMark placement"
                      : assistantMode ===
                        "resume_analyzer"
                      ? "campusAiWelcomeMark resume"
                      : assistantMode ===
                        "career_roadmap"
                      ? "campusAiWelcomeMark roadmap"
                      : "campusAiWelcomeMark"
                  }
                >
                  {assistantMode ===
                  "academic_advisor"
                    ? "A AI"
                    : assistantMode ===
                      "attendance_advisor"
                    ? "% AI"
                    : assistantMode ===
                      "performance_coach"
                    ? "P AI"
                    : assistantMode ===
                      "daily_briefing"
                    ? "D AI"
                    : assistantMode ===
                      "notes_ai"
                    ? "N AI"
                    : assistantMode ===
                      "placement_coach"
                    ? "P AI"
                    : assistantMode ===
                      "resume_analyzer"
                    ? "R AI"
                    : assistantMode ===
                      "career_roadmap"
                    ? "C 90"
                    : "C AI"}
                </div>

                <span>
                  {assistantMode ===
                  "academic_advisor"
                    ? "AI ACADEMIC ADVISOR"
                    : assistantMode ===
                      "attendance_advisor"
                    ? "AI ATTENDANCE ADVISOR"
                    : assistantMode ===
                      "performance_coach"
                    ? "AI PERFORMANCE COACH"
                    : assistantMode ===
                      "daily_briefing"
                    ? "DAILY AI BRIEFING"
                    : assistantMode ===
                      "notes_ai"
                    ? "GROUNDED NOTES AI"
                    : assistantMode ===
                      "placement_coach"
                    ? "AI PLACEMENT COACH"
                    : assistantMode ===
                      "resume_analyzer"
                    ? "AI RESUME ANALYZER"
                    : assistantMode ===
                      "career_roadmap"
                    ? "AI CAREER ROADMAP"
                    : "PERSONAL CAMPUS INTELLIGENCE"}
                </span>

                <h3>
                  {assistantMode ===
                  "academic_advisor"
                    ? `Turn your available academic data into a clear plan, ${firstName}.`
                    : assistantMode ===
                      "attendance_advisor"
                    ? `Understand your real attendance position, ${firstName}.`
                    : assistantMode ===
                      "performance_coach"
                    ? `Turn your real academic evidence into improvement, ${firstName}.`
                    : assistantMode ===
                      "daily_briefing"
                    ? `Start with what matters today, ${firstName}.`
                    : assistantMode ===
                      "notes_ai"
                    ? `Ask your indexed learning resources, ${firstName}.`
                    : assistantMode ===
                      "placement_coach"
                    ? `Turn your real placement data into focused action, ${firstName}.`
                    : assistantMode ===
                      "resume_analyzer"
                    ? `Strengthen the resume you actually built, ${firstName}.`
                    : assistantMode ===
                      "career_roadmap"
                    ? `Build an evidence-based path forward, ${firstName}.`
                    : `What can I help you understand today, ${firstName}?`}
                </h3>

                <p>
                  {assistantMode ===
                  "academic_advisor"
                    ? "Get evidence-based priorities from your subjects, timetable, attendance, marks, results, assignments and academic events."
                    : assistantMode ===
                      "attendance_advisor"
                    ? "Review subject attendance, 75 percent targets, safe margins and session records using CampusConnect's deterministic calculations."
                    : assistantMode ===
                      "performance_coach"
                    ? "Understand supported strengths, focus areas and result trends using only your available marks, results, subjects and coursework."
                    : assistantMode ===
                      "daily_briefing"
                    ? "See dated academic work, relevant signals and focused next actions from the records available to your account right now."
                    : assistantMode ===
                      "notes_ai"
                    ? "Get answers grounded in searchable excerpts from learning resources you prepared for Campus AI."
                    : assistantMode ===
                      "placement_coach"
                    ? "Review real applications, current drives and deterministic skill, branch and CGPA matching without selection guarantees."
                    : assistantMode ===
                      "resume_analyzer"
                    ? "Review your real Resume Studio content, missing sections and role alignment without fabricated ATS scores or achievements."
                    : assistantMode ===
                      "career_roadmap"
                    ? "Create focused 30, 60 and 90-day recommendations from your profile, resume, applications and current placement gaps."
                    : "Choose a starting point or ask anything about the CampusConnect data available to your account."}
                </p>


                {assistantMode ===
                  "notes_ai" &&
                  selectedSourceTitle && (
                  <div className="campusAiSourceScope">
                    <i>N</i>
                    <span>
                      <small>SELECTED RESOURCE</small>
                      <b>{selectedSourceTitle}</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSourceId("");
                        setSelectedSourceTitle("");
                      }}
                    >
                      Search all indexed notes
                    </button>
                  </div>
                )}


                <div className="campusAiPromptGrid">

                  {activeSuggestions.map(
                    suggestion => (

                      <button
                        type="button"
                        key={
                          suggestion.title
                        }
                        onClick={() =>
                          void sendQuestion(
                            suggestion.prompt
                          )
                        }
                      >

                        <i>
                          {suggestion.icon}
                        </i>

                        <span>

                          <small>
                            {suggestion.eyebrow}
                          </small>

                          <b>
                            {suggestion.title}
                          </b>

                        </span>

                        <strong>
                          →
                        </strong>

                      </button>
                    )
                  )}

                </div>

              </div>

            ) : (

              <div className="campusAiMessageList">

                {messages.map(
                  message => (

                    <article
                      key={
                        message.id
                      }
                      className={
                        message.role ===
                        "user"
                          ? "campusAiMessage user"
                          : "campusAiMessage assistant"
                      }
                    >

                      <div className="campusAiMessageAvatar">

                        {message.role ===
                        "user"
                          ? firstName
                              .slice(
                                0,
                                1
                              )
                              .toUpperCase()
                          : "C"}

                      </div>


                      <div className="campusAiMessageBody">

                        <header>

                          <b>
                            {message.role ===
                            "user"
                              ? "You"
                              : assistantMode ===
                                "academic_advisor"
                              ? "Academic Advisor"
                              : assistantMode ===
                                "attendance_advisor"
                              ? "Attendance Advisor"
                              : assistantMode ===
                                "performance_coach"
                              ? "Performance Coach"
                              : assistantMode ===
                                "daily_briefing"
                              ? "Daily AI Briefing"
                              : assistantMode ===
                                "notes_ai"
                              ? "Notes AI"
                              : assistantMode ===
                                "placement_coach"
                              ? "Placement Coach"
                              : assistantMode ===
                                "resume_analyzer"
                              ? "Resume Analyzer"
                              : assistantMode ===
                                "career_roadmap"
                              ? "Career Roadmap"
                              : "Campus AI"}
                          </b>

                          <small>
                            {message.role ===
                            "assistant"
                              ? "Grounded response"
                              : "Your question"}
                          </small>

                        </header>


                        <RichMessage
                          text={
                            message.content
                          }
                        />


                        {message.sources
                          .length >
                          0 && (

                          <div className="campusAiSources">

                            <span>
                              SOURCES
                            </span>

                            <div>

                              {message.sources.map(
                                source => (

                                  <button
                                    type="button"
                                    key={
                                      `${message.id}-${source.key}`
                                    }
                                    title={
                                      `${source.count} matching record(s)`
                                    }
                                  >
                                    <i>
                                      ✓
                                    </i>

                                    {source.label}

                                    <small>
                                      {source.count}
                                    </small>
                                  </button>
                                )
                              )}

                            </div>

                          </div>
                        )}


                        {message.role ===
                          "assistant" && (

                          <div className="campusAiMessageTools">

                            <button
                              type="button"
                              onClick={() =>
                                void copyMessage(
                                  message.content
                                )
                              }
                            >
                              Copy
                            </button>

                          </div>
                        )}

                      </div>

                    </article>
                  )
                )}


                {sending && (

                  <article className="campusAiMessage assistant">

                    <div className="campusAiMessageAvatar">
                      C
                    </div>

                    <div className="campusAiThinking">

                      <span />

                      <span />

                      <span />

                      <p>
                        {assistantMode ===
                        "academic_advisor"
                          ? "Academic Advisor is reviewing your available records…"
                          : assistantMode ===
                            "attendance_advisor"
                          ? "Attendance Advisor is checking your available attendance records…"
                          : assistantMode ===
                            "performance_coach"
                          ? "Performance Coach is reviewing your available academic evidence…"
                          : assistantMode ===
                            "daily_briefing"
                          ? "Campus AI is preparing your briefing from available dated records…"
                          : assistantMode ===
                            "notes_ai"
                          ? "Notes AI is retrieving grounded excerpts from your indexed resources…"
                          : assistantMode ===
                            "placement_coach"
                          ? "Placement Coach is reviewing your real applications and deterministic drive matches…"
                          : assistantMode ===
                            "resume_analyzer"
                          ? "Resume Analyzer is reviewing your real Resume Studio records…"
                          : assistantMode ===
                            "career_roadmap"
                          ? "Career Roadmap is connecting your real evidence to focused next steps…"
                          : "Campus AI is analyzing your available records…"}
                      </p>

                    </div>

                  </article>
                )}

              </div>
            )}


            <div
              ref={
                bottomRef
              }
            />

          </div>


          {assistantMode !==
            "quiz_generator" && (
          <footer className="campusAiComposerArea">

            {status && (

              <div
                className="campusAiStatus"
                role="status"
              >
                {status}
              </div>
            )}


            <form
              className="campusAiComposer"
              onSubmit={
                submit
              }
            >

              <div className="campusAiComposerIcon">
                ✦
              </div>


              <textarea
                value={
                  query
                }
                onChange={
                  event =>
                    setQuery(
                      event.target.value
                    )
                }
                onKeyDown={
                  event => {

                    if (
                      event.key ===
                        "Enter" &&
                      !event.shiftKey
                    ) {

                      event.preventDefault();

                      void sendQuestion();
                    }
                  }
                }
                placeholder={
                  assistantMode ===
                  "academic_advisor"
                    ? "Ask your Academic Advisor about priorities, subjects, study planning or upcoming work…"
                    : assistantMode ===
                      "attendance_advisor"
                    ? "Ask about attendance percentages, 75 percent targets, safe margins or session records…"
                    : assistantMode ===
                      "performance_coach"
                    ? "Ask about marks, results, subject performance, trends or improvement priorities…"
                    : assistantMode ===
                      "daily_briefing"
                    ? "Ask for today's briefing, urgent work, this week's schedule or current priorities…"
                    : assistantMode ===
                      "notes_ai"
                    ? "Ask a question that can be answered from your indexed notes and learning resources…"
                    : assistantMode ===
                      "placement_coach"
                    ? "Ask about applications, current placement matches, eligibility or skill gaps…"
                    : assistantMode ===
                      "resume_analyzer"
                    ? "Ask about your Resume Studio content, gaps, projects or role alignment…"
                    : assistantMode ===
                      "career_roadmap"
                    ? "Ask for an evidence-based role, learning or portfolio roadmap…"
                    : "Ask Campus AI about your academics, attendance, results, assignments or campus records…"
                }
                rows={
                  1
                }
                disabled={
                  sending
                }
              />


              <button
                type="submit"
                className="campusAiSend"
                disabled={
                  sending ||
                  !query.trim()
                }
                aria-label={
                  assistantMode ===
                  "academic_advisor"
                    ? "Send to Academic Advisor"
                    : assistantMode ===
                      "attendance_advisor"
                    ? "Send to Attendance Advisor"
                    : assistantMode ===
                      "performance_coach"
                    ? "Send to Performance Coach"
                    : assistantMode ===
                      "daily_briefing"
                    ? "Generate Daily AI Briefing"
                    : assistantMode ===
                      "notes_ai"
                    ? "Ask Notes AI"
                    : assistantMode ===
                      "placement_coach"
                    ? "Ask Placement Coach"
                    : assistantMode ===
                      "resume_analyzer"
                    ? "Ask Resume Analyzer"
                    : assistantMode ===
                      "career_roadmap"
                    ? "Ask Career Roadmap"
                    : "Send to Campus AI"
                }
              >
                ↑
              </button>

            </form>


            <p className="campusAiGroundingNote">

              <span>
                ◆
              </span>

              Campus AI answers from
              available authenticated
              CampusConnect records.
              Missing data is not
              fabricated.

            </p>

          </footer>
          )}

        </main>

      </section>

    </div>
  );
}
