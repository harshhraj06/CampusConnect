import {
  CAMPUS_PRODUCT_KNOWLEDGE,
} from "./ai/campus-product-knowledge";

import {
  buildAcademicSnapshot,
} from "./ai-academic-snapshot";

import {
  buildCareerAiContext,
} from "./ai-career-context";


type JsonRow =
  Record<string, unknown>;

export type CampusAiSource = {
  key: string;
  label: string;
  count: number;
};

export type CampusAiContext = {
  context: string;
  sources: CampusAiSource[];
};

const SUPABASE_URL =
  process.env
    .NEXT_PUBLIC_SUPABASE_URL
    ?.trim()
    .replace(/\/$/, "") || "";

const PUBLISHABLE_KEY =
  process.env
    .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?.trim() || "";


const includesAny = (
  text: string,
  terms: string[]
) =>
  terms.some(
    term =>
      text.includes(
        term
      )
  );


function compactRow(
  row: JsonRow
): JsonRow {

  return Object.fromEntries(
    Object.entries(
      row
    ).map(
      ([key, value]) => {

        if (
          typeof value ===
          "string"
        ) {
          return [
            key,
            value.slice(
              0,
              800
            ),
          ];
        }

        return [
          key,
          value,
        ];
      }
    )
  );
}


function addAttendanceMath(
  rows: JsonRow[]
): JsonRow[] {

  const target =
    0.75;

  return rows.map(
    row => {

      const attended =
        Number(
          row.attended ??
          0
        );

      const total =
        Number(
          row.total ??
          0
        );

      if (
        !Number.isFinite(
          attended
        ) ||
        !Number.isFinite(
          total
        ) ||
        total <= 0
      ) {
        return compactRow(
          row
        );
      }


      const percentage =
        Number(
          (
            attended /
            total *
            100
          ).toFixed(
            2
          )
        );


      const required =
        percentage >= 75
          ? 0
          : Math.max(
              0,
              Math.ceil(
                (
                  target *
                    total -
                  attended
                ) /
                (
                  1 -
                  target
                )
              )
            );


      const canMiss =
        percentage < 75
          ? 0
          : Math.max(
              0,
              Math.floor(
                attended /
                  target -
                total
              )
            );


      return {
        ...compactRow(
          row
        ),

        ai_calculated: {
          attendance_percentage:
            percentage,

          target_percentage:
            75,

          consecutive_classes_needed_to_reach_target:
            required,

          maximum_classes_currently_missable_while_remaining_at_or_above_target:
            canMiss,
        },
      };
    }
  );
}


async function readRows(
  path: string,
  accessToken: string
): Promise<JsonRow[]> {

  if (
    !SUPABASE_URL ||
    !PUBLISHABLE_KEY
  ) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }


  const response =
    await fetch(
      `${SUPABASE_URL}/rest/v1/${path}`,
      {
        headers: {
          apikey:
            PUBLISHABLE_KEY,

          Authorization:
            `Bearer ${accessToken}`,
        },

        cache:
          "no-store",
      }
    );


  if (
    !response.ok
  ) {
    const detail =
      await response
        .text();

    throw new Error(
      `Context query failed (${response.status}): ${detail.slice(
        0,
        300
      )}`
    );
  }


  const data =
    await response
      .json();


  if (
    !Array.isArray(
      data
    )
  ) {
    return [];
  }


  return data as JsonRow[];
}


async function safeRows(
  label: string,
  path: string,
  accessToken: string
): Promise<JsonRow[]> {

  try {

    return await readRows(
      path,
      accessToken
    );

  } catch (error) {

    console.warn(
      `[CampusConnect AI] ${label} unavailable:`,
      error instanceof Error
        ? error.message
        : error
    );

    return [];
  }
}


export async function
buildCampusAiContext(
  accessToken: string,
  userId: string,
  question: string,
  timeZone = ""
): Promise<CampusAiContext> {

  const query =
    question
      .trim()
      .toLowerCase();


  const broadStudyQuestion =
    includesAny(
      query,
      [
        "study",
        "today",
        "plan",
        "priority",
        "weakest",
        "attention",
        "brief",
        "prepare",
        "revision",
        "what should i",
      ]
    );


  const needAcademicSnapshot =
    broadStudyQuestion ||
    includesAny(
      query,
      [
        "academic advisor",
        "daily briefing",
        "daily brief",
        "study planner",
        "study plan",
        "timetable",
        "schedule",
        "next class",
        "subject list",
        "my subjects",
        "semester",
        "academic event",
        "exam date",
      ]
    );


  const needAttendance =
    broadStudyQuestion ||
    includesAny(
      query,
      [
        "attendance",
        "absent",
        "skip class",
        "miss class",
        "75%",
        "75 percent",
      ]
    );


  const needPerformance =
    broadStudyQuestion ||
    includesAny(
      query,
      [
        "marks",
        "result",
        "score",
        "grade",
        "sgpa",
        "cgpa",
        "performance",
        "exam",
        "subject",
      ]
    );


  const needAssignments =
    broadStudyQuestion ||
    includesAny(
      query,
      [
        "assignment",
        "deadline",
        "due",
        "task",
        "coursework",
      ]
    );


  const needCareer =
    includesAny(
      query,
      [
        "placement",
        "job",
        "company",
        "career",
        "interview",
        "application",
        "dsa",
        "resume",
        "project",
        "experience",
        "certification",
        "portfolio",
        "linkedin",
        "github",
        "offer",
        "shortlist",
        "recruiter",
      ]
    );


  const needPlacement =
    broadStudyQuestion ||
    needCareer;


  const needProductKnowledge =
    includesAny(
      query,
      [
        "campusconnect",
        "campus connect",
        "this app",
        "this platform",
        "this project",
        "who developed",
        "who created",
        "who built",
        "developer",
        "creator",
        "founder",
        "team",
        "technology",
        "tech stack",
        "architecture",
        "built with",
        "features",
        "modules",
        "how does campusconnect work",
        "what is campusconnect",
        "why was campusconnect built",
        "what can campusconnect do",
      ]
    );


  const needCampus =
    includesAny(
      query,
      [
        "campus",
        "campusconnect",
        "event",
        "announcement",
        "notice",
        "club",
        "society",
        "community",
        "sport",
        "sports",
        "achievement",
        "research",
        "alumni",
        "recruiter",
        "faculty",
        "professor",
        "teacher",
        "instructor",
        "department",
        "branch",
        "directory",
        "this week",
      ]
    );


  const needPeopleDirectory =
    broadStudyQuestion ||
    includesAny(
      query,
      [
        "faculty",
        "professor",
        "teacher",
        "instructor",
        "mentor",
        "who teaches",
        "department",
        "branch",
        "directory",
        "hod",
        "coordinator",
      ]
    );


  const needCampusLife =
    includesAny(
      query,
      [
        "club",
        "clubs",
        "society",
        "societies",
        "sport",
        "sports",
        "achievement",
        "achievements",
        "research",
        "alumni",
        "recruiter",
        "recruiters",
        "campus life",
      ]
    );


  const needNotices =
    includesAny(
      query,
      [
        "announcement",
        "announcements",
        "notice",
        "notices",
        "update",
        "updates",
        "latest campus",
      ]
    );


  const needCommunity =
    includesAny(
      query,
      [
        "community",
        "group",
        "groups",
        "discussion",
        "post",
        "posts",
      ]
    );


  const needLearning =
    broadStudyQuestion ||
    includesAny(
      query,
      [
        "learning resource",
        "learning resources",
        "resource",
        "resources",
        "study material",
        "study materials",
        "youtube",
        "video",
        "pyq",
        "previous year",
      ]
    );


  const needPersonalWorkspace =
    includesAny(
      query,
      [
        "my note",
        "my notes",
        "personal note",
        "personal notes",
        "my task",
        "my tasks",
        "task",
        "tasks",
        "todo",
        "to do",
        "subtask",
        "subtasks",
        "reminder",
        "reminders",
        "remind me",
        "important task",
        "urgent task",
        "pending task",
        "completed task",
        "today",
        "tomorrow",
        "this week",
        "what do i have",
        "what should i do",
        "my plan",
      ]
    );


  const needCalendarResponses =
    includesAny(
      query,
      [
        "rsvp",
        "going",
        "interested",
        "not going",
        "calendar response",
        "calendar reminder",
        "event reminder",
        "events i joined",
        "events i am going",
        "events i'm going",
      ]
    );


  const needServiceRequests =
    includesAny(
      query,
      [
        "seva",
        "seva kendra",
        "service request",
        "service requests",
        "grievance",
        "bonafide",
        "leave request",
        "id card correction",
        "attendance correction",
        "technical complaint",
        "event permission",
        "placement query",
        "request status",
        "resolution",
      ]
    );


  const needFees =
    includesAny(
      query,
      [
        "fee",
        "fees",
        "payment",
        "dues",
      ]
    );


  const user =
    encodeURIComponent(
      userId
    );


  const now =
    encodeURIComponent(
      new Date()
        .toISOString()
    );


  const sources:
    CampusAiSource[] =
      [];


  const data:
    Record<
      string,
      unknown
    > = {};


  const profile =
    await safeRows(
      "profile",
      `profiles?select=id,full_name,role,department,graduation_year,bio,skills,usn&id=eq.${user}&limit=1`,
      accessToken
    );


  data.profile =
    profile.map(
      compactRow
    );


  if (
    profile.length
  ) {
    sources.push({
      key:
        "profile",

      label:
        "Your CampusConnect profile",

      count:
        profile.length,
    });
  }


  if (
    needProductKnowledge
  ) {

    data.campusconnect_product =
      CAMPUS_PRODUCT_KNOWLEDGE;


    sources.push({
      key:
        "campusconnect_product",

      label:
        "Verified CampusConnect product knowledge",

      count:
        1,
    });

  }


  if (
    needAcademicSnapshot
  ) {

    const academic =
      await buildAcademicSnapshot({
        userId,

        now:
          new Date(),

        timeZone,

        readRows:
          (
            label,
            path
          ) =>
            safeRows(
              label,
              path,
              accessToken
            ),
      });


    data.academic_snapshot =
      academic.datasets;


    sources.push(
      ...academic.sources
    );
  }


  if (
    needAttendance
  ) {

    /*
     * CampusConnect has two legitimate
     * attendance sources:
     *
     * 1. college_attendance
     *    Imported/synced college data.
     *
     * 2. attendance_records
     *    Attendance recorded inside CampusConnect.
     *
     * Both queries use the student's JWT,
     * so existing Supabase RLS remains active.
     */

    const [
      collegeRows,
      campusRows,
    ] =
      await Promise.all([

        safeRows(
          "synced college attendance",
          `college_attendance?select=*&student_id=eq.${user}&order=subject_name.asc&limit=60`,
          accessToken
        ),

        safeRows(
          "CampusConnect attendance",
          `attendance_records?select=id,student_id,subject,attended,total,updated_at&student_id=eq.${user}&order=subject.asc&limit=60`,
          accessToken
        ),

      ]);


    /*
     * Merge by subject.
     *
     * If the same subject exists in both sources,
     * synced college attendance takes precedence.
     *
     * We DO NOT add percentages together.
     */

    const mergedAttendance =
      new Map<
        string,
        JsonRow
      >();


    for (
      const row of
      campusRows
    ) {

      const subject =
        String(
          row.subject ??
          row.subject_name ??
          row.subject_code ??
          ""
        ).trim();


      if (
        !subject
      ) {
        continue;
      }


      const key =
        String(
          row.subject_code ??
          subject
        )
          .trim()
          .toLowerCase();


      mergedAttendance.set(
        key,
        {
          ...row,

          subject_name:
            subject,

          source_system:
            "CampusConnect attendance",
        }
      );
    }


    /*
     * Synced college records overwrite
     * matching CampusConnect records because
     * they represent the official connected source.
     */

    for (
      const row of
      collegeRows
    ) {

      const subject =
        String(
          row.subject_name ??
          row.subject ??
          row.subject_code ??
          ""
        ).trim();


      if (
        !subject
      ) {
        continue;
      }


      const key =
        String(
          row.subject_code ??
          subject
        )
          .trim()
          .toLowerCase();


      mergedAttendance.set(
        key,
        {
          ...row,

          subject_name:
            subject,

          source_system:
            "Connected college attendance",
        }
      );
    }


    const rows =
      Array.from(
        mergedAttendance.values()
      );


    data.attendance =
      addAttendanceMath(
        rows
      );


    if (
      collegeRows.length
    ) {

      sources.push({
        key:
          "college_attendance",

        label:
          "Your synced college attendance",

        count:
          collegeRows.length,
      });

    }


    if (
      campusRows.length
    ) {

      sources.push({
        key:
          "attendance_records",

        label:
          "Your CampusConnect attendance records",

        count:
          campusRows.length,
      });

    }

  };


  if (
    needPerformance
  ) {

    const [
      marks,
      results,
    ] =
      await Promise.all([
        safeRows(
          "marks",
          `college_marks?select=*&student_id=eq.${user}&order=subject_name.asc&limit=100`,
          accessToken
        ),

        safeRows(
          "results",
          `college_results?select=*&student_id=eq.${user}&order=semester.desc&limit=30`,
          accessToken
        ),
      ]);


    data.marks =
      marks.map(
        compactRow
      );

    data.results =
      results.map(
        compactRow
      );


    if (
      marks.length
    ) {
      sources.push({
        key:
          "marks",

        label:
          "Your assessment marks",

        count:
          marks.length,
      });
    }


    if (
      results.length
    ) {
      sources.push({
        key:
          "results",

        label:
          "Your semester results",

        count:
          results.length,
      });
    }
  }


  if (
    needAssignments
  ) {

    const assignments =
      await safeRows(
        "assignments",
        `assignments?select=id,title,subject,description,due_at,kind,audience_department,created_at&due_at=gte.${now}&order=due_at.asc&limit=40`,
        accessToken
      );


    data.assignments =
      assignments.map(
        compactRow
      );


    if (
      assignments.length
    ) {
      sources.push({
        key:
          "assignments",

        label:
          "Your visible assignments",

        count:
          assignments.length,
      });
    }
  }


  if (
    needPlacement
  ) {

    if (
      needCareer
    ) {
      const career =
        await buildCareerAiContext(
          accessToken,
          userId
        );

      data.career =
        career.data;

      sources.push(
        ...career.sources
      );

    } else {
      const [
        applications,
        drives,
      ] =
        await Promise.all([
          safeRows(
            "placement applications",
            `placement_applications?select=company,role_title,status,next_step,applied_at,updated_at&student_id=eq.${user}&order=updated_at.desc&limit=40`,
            accessToken
          ),

          safeRows(
            "placement drives",
            `placement_drives?select=company,role_title,compensation,deadline,location,work_mode,employment_type,minimum_cgpa,branches,skills,about,rounds&order=deadline.asc&limit=40`,
            accessToken
          ),
        ]);


      data.placement_applications =
        applications.map(
          compactRow
        );

      data.placement_drives =
        drives.map(
          compactRow
        );


      if (
        applications.length
      ) {
        sources.push({
          key:
            "placement_applications",

          label:
            "Your placement applications",

          count:
            applications.length,
        });
      }


      if (
        drives.length
      ) {
        sources.push({
          key:
            "placement_drives",

          label:
            "Visible placement drives",

          count:
            drives.length,
        });
      }
    }
  }


  if (
    needCampus
  ) {

    const [
      announcements,
      events,
    ] =
      await Promise.all([
        safeRows(
          "announcements",
          `announcements?select=id,title,body,category,created_at&order=created_at.desc&limit=25`,
          accessToken
        ),

        safeRows(
          "campus events",
          `campus_events?select=id,title,description,category,venue,organizer,event_date,registration_url,status&order=event_date.asc&limit=30`,
          accessToken
        ),
      ]);


    data.announcements =
      announcements.map(
        compactRow
      );

    data.events =
      events.map(
        compactRow
      );


    if (
      announcements.length
    ) {
      sources.push({
        key:
          "announcements",

        label:
          "Campus announcements",

        count:
          announcements.length,
      });
    }


    if (
      events.length
    ) {
      sources.push({
        key:
          "events",

        label:
          "Campus events",

        count:
          events.length,
      });
    }
  }


  if (
    needPeopleDirectory
  ) {

    const [
      faculty,
      directory,
      branches,
    ] =
      await Promise.all([
        safeRows(
          "campus faculty",
          "campus_faculty?select=*&limit=120",
          accessToken
        ),

        safeRows(
          "campus directory",
          "campus_directory?select=*&limit=120",
          accessToken
        ),

        safeRows(
          "campus branches",
          "campus_branches?select=*&limit=80",
          accessToken
        ),
      ]);


    data.campus_faculty =
      faculty.map(
        compactRow
      );

    data.campus_directory =
      directory.map(
        compactRow
      );

    data.campus_branches =
      branches.map(
        compactRow
      );


    if (
      faculty.length
    ) {
      sources.push({
        key:
          "campus_faculty",

        label:
          "Campus faculty directory",

        count:
          faculty.length,
      });
    }


    if (
      directory.length
    ) {
      sources.push({
        key:
          "campus_directory",

        label:
          "Campus directory",

        count:
          directory.length,
      });
    }


    if (
      branches.length
    ) {
      sources.push({
        key:
          "campus_branches",

        label:
          "Campus branches and departments",

        count:
          branches.length,
      });
    }

  }


  if (
    needCampusLife
  ) {

    const [
      clubs,
      sports,
      achievements,
      research,
      alumni,
      recruiters,
    ] =
      await Promise.all([
        safeRows(
          "campus clubs",
          "campus_clubs?select=*&limit=120",
          accessToken
        ),

        safeRows(
          "campus sports",
          "campus_sports?select=*&limit=100",
          accessToken
        ),

        safeRows(
          "campus achievements",
          "campus_achievements?select=*&limit=100",
          accessToken
        ),

        safeRows(
          "campus research",
          "campus_research?select=*&limit=100",
          accessToken
        ),

        safeRows(
          "campus alumni",
          "campus_alumni?select=*&limit=100",
          accessToken
        ),

        safeRows(
          "campus recruiters",
          "campus_recruiters?select=*&limit=100",
          accessToken
        ),
      ]);


    data.campus_clubs =
      clubs.map(
        compactRow
      );

    data.campus_sports =
      sports.map(
        compactRow
      );

    data.campus_achievements =
      achievements.map(
        compactRow
      );

    data.campus_research =
      research.map(
        compactRow
      );

    data.campus_alumni =
      alumni.map(
        compactRow
      );

    data.campus_recruiters =
      recruiters.map(
        compactRow
      );


    if (
      clubs.length
    ) {
      sources.push({
        key:
          "campus_clubs",

        label:
          "Campus clubs",

        count:
          clubs.length,
      });
    }


    if (
      sports.length
    ) {
      sources.push({
        key:
          "campus_sports",

        label:
          "Campus sports",

        count:
          sports.length,
      });
    }


    if (
      achievements.length
    ) {
      sources.push({
        key:
          "campus_achievements",

        label:
          "Campus achievements",

        count:
          achievements.length,
      });
    }


    if (
      research.length
    ) {
      sources.push({
        key:
          "campus_research",

        label:
          "Campus research",

        count:
          research.length,
      });
    }


    if (
      alumni.length
    ) {
      sources.push({
        key:
          "campus_alumni",

        label:
          "Campus alumni",

        count:
          alumni.length,
      });
    }


    if (
      recruiters.length
    ) {
      sources.push({
        key:
          "campus_recruiters",

        label:
          "Campus recruiters",

        count:
          recruiters.length,
      });
    }

  }


  if (
    needNotices
  ) {

    const noticeRail =
      await safeRows(
        "campus notice rail",
        "campus_notice_rail?select=*&limit=60",
        accessToken
      );


    data.campus_notice_rail =
      noticeRail.map(
        compactRow
      );


    if (
      noticeRail.length
    ) {
      sources.push({
        key:
          "campus_notice_rail",

        label:
          "Campus notices",

        count:
          noticeRail.length,
      });
    }

  }


  if (
    needCommunity
  ) {

    const [
      groups,
      posts,
    ] =
      await Promise.all([
        safeRows(
          "community groups",
          "community_groups?select=*&limit=80",
          accessToken
        ),

        safeRows(
          "community posts",
          "community_posts?select=*&order=created_at.desc&limit=60",
          accessToken
        ),
      ]);


    data.community_groups =
      groups.map(
        compactRow
      );

    data.community_posts =
      posts.map(
        compactRow
      );


    if (
      groups.length
    ) {
      sources.push({
        key:
          "community_groups",

        label:
          "Campus community groups",

        count:
          groups.length,
      });
    }


    if (
      posts.length
    ) {
      sources.push({
        key:
          "community_posts",

        label:
          "Campus community posts",

        count:
          posts.length,
      });
    }

  }


  if (
    needLearning
  ) {

    const resources =
      await safeRows(
        "learning resources",
        "learning_resources?select=*&limit=100",
        accessToken
      );


    data.learning_resources =
      resources.map(
        compactRow
      );


    if (
      resources.length
    ) {
      sources.push({
        key:
          "learning_resources",

        label:
          "Campus learning resources",

        count:
          resources.length,
      });
    }

  }


  if (
    needPersonalWorkspace
  ) {

    /*
     * Personal Workspace data is strictly scoped
     * to the authenticated user.
     *
     * All four tables use owner_id.
     * Supabase RLS also remains active because
     * these requests use the student's JWT.
     */

    const [
      notes,
      tasks,
      subtasks,
      reminders,
    ] =
      await Promise.all([
        safeRows(
          "personal notes",
          `personal_notes?select=id,title,body,category,tags,is_pinned,is_archived,created_at,updated_at&owner_id=eq.${user}&order=updated_at.desc&limit=40`,
          accessToken
        ),

        safeRows(
          "personal tasks",
          `personal_tasks?select=id,title,description,category,priority,status,due_at,is_important,is_pinned,completed_at,created_at,updated_at&owner_id=eq.${user}&order=updated_at.desc&limit=60`,
          accessToken
        ),

        safeRows(
          "personal task subtasks",
          `personal_task_subtasks?select=id,task_id,title,is_completed,display_order,created_at,updated_at&owner_id=eq.${user}&order=display_order.asc&limit=120`,
          accessToken
        ),

        safeRows(
          "personal reminders",
          `personal_reminders?select=id,title,description,remind_at,repeat_rule,status,is_important,completed_at,last_triggered_at,created_at,updated_at&owner_id=eq.${user}&order=remind_at.asc&limit=60`,
          accessToken
        ),
      ]);


    data.personal_notes =
      notes.map(
        compactRow
      );

    data.personal_tasks =
      tasks.map(
        compactRow
      );

    data.personal_task_subtasks =
      subtasks.map(
        compactRow
      );

    data.personal_reminders =
      reminders.map(
        compactRow
      );


    if (
      notes.length
    ) {
      sources.push({
        key:
          "personal_notes",

        label:
          "Your personal workspace notes",

        count:
          notes.length,
      });
    }


    if (
      tasks.length
    ) {
      sources.push({
        key:
          "personal_tasks",

        label:
          "Your personal workspace tasks",

        count:
          tasks.length,
      });
    }


    if (
      subtasks.length
    ) {
      sources.push({
        key:
          "personal_task_subtasks",

        label:
          "Your task subtasks",

        count:
          subtasks.length,
      });
    }


    if (
      reminders.length
    ) {
      sources.push({
        key:
          "personal_reminders",

        label:
          "Your personal reminders",

        count:
          reminders.length,
      });
    }

  }


  if (
    needCalendarResponses
  ) {

    /*
     * Calendar RSVP rows are explicitly
     * scoped through user_id.
     */

    const rsvps =
      await safeRows(
        "calendar RSVPs",
        `campus_calendar_rsvps?select=id,item_source,item_id,response,reminder_enabled,reminder_minutes_before,created_at,updated_at&user_id=eq.${user}&order=updated_at.desc&limit=80`,
        accessToken
      );


    data.calendar_rsvps =
      rsvps.map(
        compactRow
      );


    if (
      rsvps.length
    ) {
      sources.push({
        key:
          "campus_calendar_rsvps",

        label:
          "Your calendar responses and reminders",

        count:
          rsvps.length,
      });
    }

  }


  if (
    needServiceRequests
  ) {

    /*
     * A normal Campus AI request must only
     * retrieve service requests created by
     * the authenticated user.
     *
     * Staff workflow visibility belongs in
     * the separate role-aware context engine.
     */

    const serviceRequests =
      await safeRows(
        "campus service requests",
        `campus_service_requests?select=id,request_number,requester_role,department,category,subject,description,priority,status,assigned_role,assigned_name,resolution_note,due_at,closed_at,created_at,updated_at&requester_id=eq.${user}&order=updated_at.desc&limit=50`,
        accessToken
      );


    data.campus_service_requests =
      serviceRequests.map(
        compactRow
      );


    if (
      serviceRequests.length
    ) {
      sources.push({
        key:
          "campus_service_requests",

        label:
          "Your Campus Seva service requests",

        count:
          serviceRequests.length,
      });
    }

  }


  if (
    needFees
  ) {

    const fees =
      await safeRows(
        "fees",
        `college_fees?select=*&student_id=eq.${user}&limit=30`,
        accessToken
      );


    data.fees =
      fees.map(
        compactRow
      );


    if (
      fees.length
    ) {
      sources.push({
        key:
          "fees",

        label:
          "Your fee records",

        count:
          fees.length,
      });
    }
  }


  return {
    context:
      JSON.stringify(
        {
          generated_at:
            new Date()
              .toISOString(),

          authenticated_user_id:
            userId,

          datasets:
            data,
        },
        null,
        2
      ),

    sources,
  };
}
