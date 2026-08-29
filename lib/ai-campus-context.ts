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


  const needCampus =
    includesAny(
      query,
      [
        "event",
        "announcement",
        "notice",
        "club",
        "this week",
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
