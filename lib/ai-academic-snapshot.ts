type JsonRow =
  Record<string, unknown>;

export type AcademicSnapshotSource = {
  key: string;
  label: string;
  count: number;
};

type RowsReader = (
  label: string,
  path: string
) => Promise<JsonRow[]>;

type SnapshotOptions = {
  userId: string;
  now: Date;
  timeZone?: string;
  readRows: RowsReader;
};


const compact = (
  row: JsonRow
): JsonRow =>

  Object.fromEntries(
    Object.entries(
      row
    )
      .filter(
        ([key]) =>
          ![
            "id",
            "student_id",
            "session_id",
            "assignment_id",
          ].includes(
            key
          )
      )
      .map(
        ([key, value]) => [
          key,

          typeof value ===
          "string"
            ? value.slice(
                0,
                700
              )
            : value,
        ]
      )
  );


function summarizeSessions(
  entries: JsonRow[],
  sessions: JsonRow[]
) {

  const sessionsById =
    new Map(
      sessions.map(
        row => [
          String(
            row.id ??
            ""
          ),

          row,
        ]
      )
    );


  const subjects =
    new Map<
      string,
      {
        subject: string;
        present: number;
        absent: number;
        late: number;
        excused: number;
        total_marked: number;
        latest_marked_at: string;
      }
    >();


  for (
    const entry of
    entries
  ) {

    const session =
      sessionsById.get(
        String(
          entry.session_id ??
          ""
        )
      );


    const subject =
      String(
        session?.subject ??
        "Subject unavailable"
      ).trim();


    const key =
      subject
        .toLowerCase();


    const current =
      subjects.get(
        key
      ) ?? {
        subject,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total_marked: 0,
        latest_marked_at: "",
      };


    const status =
      String(
        entry
          .attendance_status ??
        ""
      ).toLowerCase();


    if (
      status ===
      "present"
    ) {
      current.present += 1;
    }


    if (
      status ===
      "absent"
    ) {
      current.absent += 1;
    }


    if (
      status ===
      "late"
    ) {
      current.late += 1;
    }


    if (
      status ===
      "excused"
    ) {
      current.excused += 1;
    }


    current.total_marked +=
      1;


    const markedAt =
      String(
        entry.marked_at ??
        ""
      );


    if (
      markedAt >
      current.latest_marked_at
    ) {
      current.latest_marked_at =
        markedAt;
    }


    subjects.set(
      key,
      current
    );
  }


  return {
    policy_note:
      "Present, Absent, Late and Excused are raw counts. No percentage is inferred because no institutional Late/Excused counting policy is stored.",

    subjects:
      Array.from(
        subjects.values()
      ),
  };
}


export async function
buildAcademicSnapshot({
  userId,
  now,
  timeZone = "",
  readRows,
}: SnapshotOptions) {

  const user =
    encodeURIComponent(
      userId
    );


  const nowValue =
    encodeURIComponent(
      now.toISOString()
    );


  const [
    connection,
    subjects,
    timetable,
    academicEvents,
    sessionEntries,
    assignmentSubmissions,
  ] =
    await Promise.all([

      readRows(
        "college connection",

        `college_connections?select=status,provider,last_synced_at&student_id=eq.${user}&limit=1`
      ),


      readRows(
        "college subjects",

        `college_subjects?select=subject_code,subject_name,semester,academic_year,credits,faculty_name,subject_type&student_id=eq.${user}&order=subject_name.asc&limit=100`
      ),


      readRows(
        "college timetable",

        `college_timetable?select=semester,day_of_week,period_order,start_time,end_time,subject_code,subject_name,faculty_name,room,class_type&student_id=eq.${user}&order=period_order.asc&limit=150`
      ),


      readRows(
        "academic events",

        `college_academic_events?select=title,event_type,subject_code,subject_name,semester,starts_at,ends_at,venue,description&student_id=eq.${user}&starts_at=gte.${nowValue}&order=starts_at.asc&limit=60`
      ),


      readRows(
        "attendance session entries",

        `attendance_session_entries?select=session_id,attendance_status,note,marked_at&student_id=eq.${user}&order=marked_at.desc&limit=150`
      ),


      readRows(
        "assignment submissions",

        `assignment_submissions?select=assignment_id,status,submitted_at&student_id=eq.${user}&order=submitted_at.desc&limit=120`
      ),

    ]);


  const sessionIds =
    Array.from(
      new Set(
        sessionEntries
          .map(
            row =>
              String(
                row.session_id ??
                ""
              )
          )
          .filter(
            Boolean
          )
      )
    )
      .slice(
        0,
        100
      );


  const sessions =
    sessionIds.length

      ? await readRows(
          "attendance sessions",

          `attendance_sessions?select=id,subject,attendance_date,period_name,topic,status&id=in.(${sessionIds.join(
            ","
          )})&limit=100`
        )

      : [];


  const datasets = {
    generated_at:
      now.toISOString(),

    client_time_zone:
      timeZone ||
      "not supplied",

    college_connection:
      connection.map(
        compact
      ),

    subjects:
      subjects.map(
        compact
      ),

    timetable:
      timetable.map(
        compact
      ),

    upcoming_academic_events:
      academicEvents.map(
        compact
      ),

    attendance_session_summary:
      summarizeSessions(
        sessionEntries,
        sessions
      ),

    assignment_submissions:
      assignmentSubmissions.map(
        compact
      ),

    deterministic_counts: {
      subjects:
        subjects.length,

      timetable_entries:
        timetable.length,

      upcoming_academic_events:
        academicEvents.length,

      attendance_session_entries:
        sessionEntries.length,

      assignment_submissions:
        assignmentSubmissions.length,
    },
  };


  const groups:
    Array<
      [
        string,
        string,
        JsonRow[]
      ]
    > = [

      [
        "college_connections",
        "Your college connection",
        connection,
      ],

      [
        "college_subjects",
        "Your synced subjects",
        subjects,
      ],

      [
        "college_timetable",
        "Your synced timetable",
        timetable,
      ],

      [
        "college_academic_events",
        "Your academic events",
        academicEvents,
      ],

      [
        "attendance_session_entries",
        "Your attendance session entries",
        sessionEntries,
      ],

      [
        "assignment_submissions",
        "Your assignment submissions",
        assignmentSubmissions,
      ],

    ];


  const sources:
    AcademicSnapshotSource[] =

    groups
      .filter(
        (
          [
            ,
            ,
            rows,
          ]
        ) =>
          rows.length >
          0
      )
      .map(
        (
          [
            key,
            label,
            rows,
          ]
        ) => ({
          key,
          label,

          count:
            rows.length,
        })
      );


  return {
    datasets,
    sources,
  };
}
