"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSupabaseClient,
} from "../lib/supabase";


type FacultyDiaryProfile = {
  name: string;
  email: string;
  department: string;
  role: string;
  campus_uid?: string;
  avatar_url?: string;
};


type FacultyDiaryRow = {
  id: string;
  attendance_session_id: string;
  batch_id: string;
  batch_subject_id: string | null;

  faculty_id: string;
  faculty_name: string;

  class_date: string;
  period_name: string;

  subject: string;
  topic: string;

  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  total_students: number;

  source:
    | "Manual"
    | "Published Timetable";

  created_at: string;
  updated_at: string;
};


type DiaryBatch = {
  id: string;
  batch_name: string;
  section: string;
  department: string;
  academic_year: string;
  semester: string;
};


type DiarySubject = {
  id: string;
  subject_name: string;
  subject_code: string;
  subject_type: string;
};


type EnrichedDiaryRow =
  FacultyDiaryRow & {
    batch: DiaryBatch | null;
    batchSubject:
      DiarySubject | null;
  };


type FacultyDiaryProps = {
  profile: FacultyDiaryProfile;
  onOpenAttendance: () => void;
  onOpenTodayClasses: () => void;
};


const localDateKey = (
  date = new Date()
) =>
  new Intl.DateTimeFormat(
    "en-CA"
  ).format(date);


const localMonthKey = (
  date = new Date()
) =>
  localDateKey(
    date
  ).slice(
    0,
    7
  );


const formatDiaryDate = (
  value: string
) => {
  if (!value) {
    return "—";
  }

  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(
      year,
      month - 1,
      day
    )
  );
};


const startOfWeekKey = () => {
  const date =
    new Date();

  const day =
    date.getDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  date.setDate(
    date.getDate() +
      difference
  );

  return localDateKey(
    date
  );
};


export default function FacultyDiary({
  profile,
  onOpenAttendance,
  onOpenTodayClasses,
}: FacultyDiaryProps) {

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    diaryRows,
    setDiaryRows,
  ] = useState<
    FacultyDiaryRow[]
  >([]);

  const [
    batches,
    setBatches,
  ] = useState<
    DiaryBatch[]
  >([]);

  const [
    subjects,
    setSubjects,
  ] = useState<
    DiarySubject[]
  >([]);


  const [
    search,
    setSearch,
  ] = useState("");

  const [
    dateFilter,
    setDateFilter,
  ] = useState("");

  const [
    subjectFilter,
    setSubjectFilter,
  ] = useState("all");

  const [
    batchFilter,
    setBatchFilter,
  ] = useState("all");

  const [
    sourceFilter,
    setSourceFilter,
  ] = useState("all");


  const [
    reportMonth,
    setReportMonth,
  ] = useState(
    () =>
      localMonthKey()
  );


  const loadDiary =
    useCallback(
      async (
        quiet = false
      ) => {

        if (
          profile.role !==
          "Faculty"
        ) {
          setError(
            "Faculty Diary is available to Faculty accounts."
          );

          setLoading(false);
          return;
        }


        const client =
          getSupabaseClient();

        if (!client) {
          setError(
            "CampusConnect is not connected to Supabase."
          );

          setLoading(false);
          return;
        }


        if (quiet) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        setError("");


        try {

          const {
            data: auth,
            error:
              authError,
          } =
            await client.auth
              .getUser();


          if (
            authError ||
            !auth.user
          ) {
            throw new Error(
              "Your session has expired. Sign in again."
            );
          }


          const {
            data:
              diaryData,
            error:
              diaryError,
          } = await client
            .from(
              "faculty_class_diary"
            )
            .select(
              "id,attendance_session_id,batch_id,batch_subject_id,faculty_id,faculty_name,class_date,period_name,subject,topic,present_count,absent_count,late_count,excused_count,total_students,source,created_at,updated_at"
            )
            .order(
              "class_date",
              {
                ascending:
                  false,
              }
            )
            .order(
              "updated_at",
              {
                ascending:
                  false,
              }
            );


          if (diaryError) {
            throw diaryError;
          }


          const nextRows =
            (
              diaryData ||
              []
            ) as FacultyDiaryRow[];


          const batchIds =
            Array.from(
              new Set(
                nextRows
                  .map(
                    row =>
                      row.batch_id
                  )
                  .filter(
                    Boolean
                  )
              )
            );


          const subjectIds =
            Array.from(
              new Set(
                nextRows
                  .map(
                    row =>
                      row.batch_subject_id
                  )
                  .filter(
                    (
                      value
                    ): value is string =>
                      Boolean(
                        value
                      )
                  )
              )
            );


          const [
            batchResult,
            subjectResult,
          ] =
            await Promise.all([
              batchIds.length
                ? client
                    .from(
                      "attendance_batches"
                    )
                    .select(
                      "id,batch_name,section,department,academic_year,semester"
                    )
                    .in(
                      "id",
                      batchIds
                    )
                : Promise.resolve({
                    data: [],
                    error: null,
                  }),

              subjectIds.length
                ? client
                    .from(
                      "attendance_batch_subjects"
                    )
                    .select(
                      "id,subject_name,subject_code,subject_type"
                    )
                    .in(
                      "id",
                      subjectIds
                    )
                : Promise.resolve({
                    data: [],
                    error: null,
                  }),
            ]);


          if (
            batchResult.error
          ) {
            throw batchResult.error;
          }


          if (
            subjectResult.error
          ) {
            throw subjectResult.error;
          }


          setDiaryRows(
            nextRows
          );

          setBatches(
            (
              batchResult.data ||
              []
            ) as DiaryBatch[]
          );

          setSubjects(
            (
              subjectResult.data ||
              []
            ) as DiarySubject[]
          );

        } catch (
          loadError
        ) {

          console.error(
            "Load Faculty Diary:",
            loadError
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load Faculty Diary."
          );

        } finally {

          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        profile.role,
      ]
    );


  useEffect(
    () => {
      void loadDiary();
    },
    [
      loadDiary,
    ]
  );


  const batchById =
    useMemo(
      () =>
        new Map(
          batches.map(
            batch => [
              batch.id,
              batch,
            ]
          )
        ),
      [
        batches,
      ]
    );


  const subjectById =
    useMemo(
      () =>
        new Map(
          subjects.map(
            item => [
              item.id,
              item,
            ]
          )
        ),
      [
        subjects,
      ]
    );


  const enrichedRows =
    useMemo<
      EnrichedDiaryRow[]
    >(
      () =>
        diaryRows.map(
          row => ({
            ...row,

            batch:
              batchById.get(
                row.batch_id
              ) ||
              null,

            batchSubject:
              row.batch_subject_id
                ? subjectById.get(
                    row.batch_subject_id
                  ) ||
                  null
                : null,
          })
        ),
      [
        diaryRows,
        batchById,
        subjectById,
      ]
    );


  const subjectOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            enrichedRows.map(
              row =>
                row.subject
            )
          )
        )
          .filter(Boolean)
          .sort(
            (
              a,
              b
            ) =>
              a.localeCompare(
                b
              )
          ),
      [
        enrichedRows,
      ]
    );


  const batchOptions =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            string
          >();


        enrichedRows.forEach(
          row => {

            const batch =
              row.batch;

            if (!batch) {
              return;
            }


            map.set(
              batch.id,
              `${batch.batch_name} · Section ${batch.section}`
            );
          }
        );


        return Array.from(
          map.entries()
        ).sort(
          (
            a,
            b
          ) =>
            a[1].localeCompare(
              b[1]
            )
        );
      },
      [
        enrichedRows,
      ]
    );


  const filteredRows =
    useMemo(
      () => {

        const normalizedSearch =
          search
            .trim()
            .toLowerCase();


        return enrichedRows.filter(
          row => {

            if (
              dateFilter &&
              row.class_date !==
                dateFilter
            ) {
              return false;
            }


            if (
              subjectFilter !==
                "all" &&
              row.subject !==
                subjectFilter
            ) {
              return false;
            }


            if (
              batchFilter !==
                "all" &&
              row.batch_id !==
                batchFilter
            ) {
              return false;
            }


            if (
              sourceFilter !==
                "all" &&
              row.source !==
                sourceFilter
            ) {
              return false;
            }


            if (
              !normalizedSearch
            ) {
              return true;
            }


            const values = [
              row.subject,
              row.topic,
              row.period_name,
              row.faculty_name,

              row.batchSubject
                ?.subject_code ||
                "",

              row.batch
                ?.batch_name ||
                "",

              row.batch
                ?.section ||
                "",

              row.batch
                ?.department ||
                "",
            ];


            return values.some(
              value =>
                String(
                  value
                )
                  .toLowerCase()
                  .includes(
                    normalizedSearch
                  )
            );
          }
        );
      },
      [
        enrichedRows,
        search,
        dateFilter,
        subjectFilter,
        batchFilter,
        sourceFilter,
      ]
    );


  const todayKey =
    localDateKey();

  const weekStart =
    startOfWeekKey();


  const todayRows =
    enrichedRows.filter(
      row =>
        row.class_date ===
        todayKey
    );


  const weekRows =
    enrichedRows.filter(
      row =>
        row.class_date >=
          weekStart &&
        row.class_date <=
          todayKey
    );


  const publishedRows =
    enrichedRows.filter(
      row =>
        row.source ===
        "Published Timetable"
    );


  const totalAttendanceMarked =
    enrichedRows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.total_students,
      0
    );


  const totalPresent =
    enrichedRows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.present_count,
      0
    );


  const attendanceRate =
    totalAttendanceMarked
      ? Math.round(
          (
            totalPresent /
            totalAttendanceMarked
          ) *
            100
        )
      : 0;


  const monthlyRows =
    useMemo(
      () =>
        enrichedRows.filter(
          row =>
            row.class_date.startsWith(
              `${reportMonth}-`
            )
        ),
      [
        enrichedRows,
        reportMonth,
      ]
    );


  const monthlyPresent =
    monthlyRows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.present_count,
      0
    );


  const monthlyAbsent =
    monthlyRows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.absent_count,
      0
    );


  const monthlyLate =
    monthlyRows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.late_count,
      0
    );


  const monthlyExcused =
    monthlyRows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.excused_count,
      0
    );


  const monthlyStudentsMarked =
    monthlyRows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.total_students,
      0
    );


  const monthlyAttendanceRate =
    monthlyStudentsMarked
      ? Math.round(
          (
            monthlyPresent /
            monthlyStudentsMarked
          ) *
            100
        )
      : 0;


  const monthlySubjectSummary =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            {
              subject: string;
              subjectCode: string;
              classes: number;
              present: number;
              total: number;
            }
          >();


        monthlyRows.forEach(
          row => {

            const subjectCode =
              row.batchSubject
                ?.subject_code ||
              "";

            const key =
              `${
                subjectCode ||
                row.subject
              }::${
                row.subject
              }`;


            const current =
              map.get(
                key
              ) || {
                subject:
                  row.subject,

                subjectCode,

                classes: 0,
                present: 0,
                total: 0,
              };


            current.classes +=
              1;

            current.present +=
              row.present_count;

            current.total +=
              row.total_students;


            map.set(
              key,
              current
            );
          }
        );


        return Array.from(
          map.values()
        ).sort(
          (
            a,
            b
          ) =>
            b.classes -
            a.classes ||
            a.subject.localeCompare(
              b.subject
            )
        );
      },
      [
        monthlyRows,
      ]
    );


  const reportMonthLabel =
    (() => {

      const [
        year,
        month,
      ] = reportMonth
        .split("-")
        .map(Number);


      if (
        !year ||
        !month
      ) {
        return reportMonth;
      }


      return new Intl.DateTimeFormat(
        "en-IN",
        {
          month: "long",
          year: "numeric",
        }
      ).format(
        new Date(
          year,
          month - 1,
          1
        )
      );
    })();


  const printMonthlyReport =
    () => {

      document.title =
        `CampusConnect Faculty Diary - ${profile.name || "Faculty"} - ${reportMonthLabel}`;

      window.print();
    };


  const filtersActive =
    Boolean(
      search ||
      dateFilter ||
      subjectFilter !==
        "all" ||
      batchFilter !==
        "all" ||
      sourceFilter !==
        "all"
    );


  const clearFilters =
    () => {
      setSearch("");
      setDateFilter("");
      setSubjectFilter(
        "all"
      );
      setBatchFilter(
        "all"
      );
      setSourceFilter(
        "all"
      );
    };


  if (loading) {
    return (
      <section className="facultyDiaryPage">

        <div className="facultyDiaryLoading">
          <span>
            FACULTY DIARY
          </span>

          <strong>
            Loading class records…
          </strong>
        </div>

      </section>
    );
  }


  return (
    <section className="facultyDiaryPage">

      <header className="facultyDiaryHero">

        <div>

          <span className="facultyDiaryEyebrow">
            ACADEMIC WORK LOG
          </span>

          <h1>
            Faculty Diary
          </h1>

          <p>
            Your class work log is generated automatically from saved attendance sessions.
          </p>

        </div>


        <div className="facultyDiaryHeroActions">

          <button
            type="button"
            className="ghost"
            disabled={
              refreshing
            }
            onClick={() =>
              void loadDiary(
                true
              )
            }
          >
            {refreshing
              ? "Refreshing…"
              : "Refresh"}
          </button>

          <button
            type="button"
            onClick={
              onOpenTodayClasses
            }
          >
            Today&apos;s Classes
          </button>

          <button
            type="button"
            className="primary"
            onClick={
              onOpenAttendance
            }
          >
            Take Attendance
          </button>

        </div>

      </header>


      {error && (
        <div className="facultyDiaryError">
          {error}
        </div>
      )}


      <section className="facultyDiaryMetrics">

        <article>
          <span>
            TODAY
          </span>

          <strong>
            {
              todayRows.length
            }
          </strong>

          <small>
            classes logged
          </small>
        </article>


        <article>
          <span>
            THIS WEEK
          </span>

          <strong>
            {
              weekRows.length
            }
          </strong>

          <small>
            class records
          </small>
        </article>


        <article>
          <span>
            TIMETABLE
          </span>

          <strong>
            {
              publishedRows.length
            }
          </strong>

          <small>
            published-class logs
          </small>
        </article>


        <article>
          <span>
            ATTENDANCE
          </span>

          <strong>
            {
              attendanceRate
            }%
          </strong>

          <small>
            present across logs
          </small>
        </article>

      </section>


      <section
        className="facultyDiaryMonthlyReport"
      >

        <header>

          <div>

            <span>
              MONTHLY REPORT
            </span>

            <h2>
              {
                reportMonthLabel
              }
            </h2>

            <p>
              Review your monthly teaching activity and print a submission-ready Faculty Diary.
            </p>

          </div>


          <div className="facultyDiaryMonthlyActions">

            <label>

              <span>
                REPORT MONTH
              </span>

              <input
                type="month"
                value={
                  reportMonth
                }
                onChange={
                  event =>
                    setReportMonth(
                      event.target.value
                    )
                }
              />

            </label>


            <button
              type="button"
              disabled={
                !monthlyRows.length
              }
              onClick={
                printMonthlyReport
              }
            >
              Print / Save PDF
            </button>

          </div>

        </header>


        <section className="facultyDiaryMonthlyStats">

          <article>
            <span>
              CLASSES
            </span>

            <strong>
              {
                monthlyRows.length
              }
            </strong>

            <small>
              completed logs
            </small>
          </article>


          <article>
            <span>
              STUDENTS MARKED
            </span>

            <strong>
              {
                monthlyStudentsMarked
              }
            </strong>

            <small>
              attendance entries
            </small>
          </article>


          <article>
            <span>
              PRESENT
            </span>

            <strong>
              {
                monthlyPresent
              }
            </strong>

            <small>
              student marks
            </small>
          </article>


          <article>
            <span>
              ATTENDANCE
            </span>

            <strong>
              {
                monthlyAttendanceRate
              }%
            </strong>

            <small>
              present rate
            </small>
          </article>

        </section>


        <section className="facultyDiaryMonthlyDistribution">

          <div>
            <strong>
              {
                monthlyPresent
              }
            </strong>

            <span>
              Present
            </span>
          </div>

          <div>
            <strong>
              {
                monthlyAbsent
              }
            </strong>

            <span>
              Absent
            </span>
          </div>

          <div>
            <strong>
              {
                monthlyLate
              }
            </strong>

            <span>
              Late
            </span>
          </div>

          <div>
            <strong>
              {
                monthlyExcused
              }
            </strong>

            <span>
              Excused
            </span>
          </div>

        </section>


        {monthlySubjectSummary.length ? (
          <section className="facultyDiaryMonthlySubjects">

            <header>
              <span>
                SUBJECT SUMMARY
              </span>
            </header>


            {monthlySubjectSummary.map(
              item => {

                const rate =
                  item.total
                    ? Math.round(
                        (
                          item.present /
                          item.total
                        ) *
                          100
                      )
                    : 0;


                return (
                  <div
                    key={`${
                      item.subjectCode ||
                      item.subject
                    }::${
                      item.subject
                    }`}
                  >

                    <div>

                      {item.subjectCode && (
                        <span>
                          {
                            item.subjectCode
                          }
                        </span>
                      )}

                      <strong>
                        {
                          item.subject
                        }
                      </strong>

                    </div>


                    <div>
                      <b>
                        {
                          item.classes
                        }
                      </b>

                      <small>
                        classes
                      </small>
                    </div>


                    <div>
                      <b>
                        {
                          rate
                        }%
                      </b>

                      <small>
                        present
                      </small>
                    </div>

                  </div>
                );
              }
            )}

          </section>
        ) : (
          <div className="facultyDiaryMonthlyEmpty">
            No diary entries are available for this month.
          </div>
        )}

      </section>


      <section className="facultyDiaryPrintReport">

        <header>

          <div>
            <span>
              CAMPUSCONNECT
            </span>

            <h1>
              Faculty Diary
            </h1>

            <p>
              Monthly Academic Work Report
            </p>
          </div>


          <div>
            <strong>
              {
                reportMonthLabel
              }
            </strong>

            <span>
              {
                profile.department ||
                "Department"
              }
            </span>
          </div>

        </header>


        <section className="facultyDiaryPrintFaculty">

          <div>
            <span>
              FACULTY
            </span>

            <strong>
              {
                profile.name ||
                profile.email
              }
            </strong>
          </div>


          {profile.campus_uid && (
            <div>
              <span>
                FACULTY ID
              </span>

              <strong>
                {
                  profile.campus_uid
                }
              </strong>
            </div>
          )}


          <div>
            <span>
              MONTH
            </span>

            <strong>
              {
                reportMonthLabel
              }
            </strong>
          </div>


          <div>
            <span>
              TOTAL CLASSES
            </span>

            <strong>
              {
                monthlyRows.length
              }
            </strong>
          </div>

        </section>


        <section className="facultyDiaryPrintSummary">

          <div>
            <strong>
              {
                monthlyPresent
              }
            </strong>

            <span>
              Present
            </span>
          </div>

          <div>
            <strong>
              {
                monthlyAbsent
              }
            </strong>

            <span>
              Absent
            </span>
          </div>

          <div>
            <strong>
              {
                monthlyLate
              }
            </strong>

            <span>
              Late
            </span>
          </div>

          <div>
            <strong>
              {
                monthlyExcused
              }
            </strong>

            <span>
              Excused
            </span>
          </div>

          <div>
            <strong>
              {
                monthlyAttendanceRate
              }%
            </strong>

            <span>
              Present rate
            </span>
          </div>

        </section>


        <table className="facultyDiaryPrintTable">

          <thead>
            <tr>
              <th>
                Date
              </th>

              <th>
                Subject
              </th>

              <th>
                Batch
              </th>

              <th>
                Period
              </th>

              <th>
                Topic Taught
              </th>

              <th>
                P
              </th>

              <th>
                A
              </th>

              <th>
                L
              </th>

              <th>
                E
              </th>
            </tr>
          </thead>


          <tbody>

            {monthlyRows.map(
              row => (
                <tr
                  key={
                    row.id
                  }
                >
                  <td>
                    {
                      formatDiaryDate(
                        row.class_date
                      )
                    }
                  </td>

                  <td>
                    <strong>
                      {
                        row.batchSubject
                          ?.subject_code
                          ? `${
                              row.batchSubject
                                .subject_code
                            } · `
                          : ""
                      }
                      {
                        row.subject
                      }
                    </strong>
                  </td>

                  <td>
                    {row.batch
                      ? `${
                          row.batch
                            .batch_name
                        } · ${
                          row.batch
                            .section
                        }`
                      : "—"}
                  </td>

                  <td>
                    {
                      row.period_name
                    }
                  </td>

                  <td>
                    {
                      row.topic ||
                      "—"
                    }
                  </td>

                  <td>
                    {
                      row.present_count
                    }
                  </td>

                  <td>
                    {
                      row.absent_count
                    }
                  </td>

                  <td>
                    {
                      row.late_count
                    }
                  </td>

                  <td>
                    {
                      row.excused_count
                    }
                  </td>
                </tr>
              )
            )}

          </tbody>

        </table>


        <footer>

          <div>
            <span>
              Faculty Signature
            </span>
          </div>

          <div>
            <span>
              HOD / Academic Review
            </span>
          </div>

        </footer>

      </section>


      <section className="facultyDiaryFilters">

        <label className="facultyDiarySearch">

          <span>
            SEARCH
          </span>

          <input
            value={
              search
            }
            onChange={
              event =>
                setSearch(
                  event.target.value
                )
            }
            placeholder="Subject, topic, batch or code"
          />

        </label>


        <label>

          <span>
            DATE
          </span>

          <input
            type="date"
            value={
              dateFilter
            }
            onChange={
              event =>
                setDateFilter(
                  event.target.value
                )
            }
          />

        </label>


        <label>

          <span>
            SUBJECT
          </span>

          <select
            value={
              subjectFilter
            }
            onChange={
              event =>
                setSubjectFilter(
                  event.target.value
                )
            }
          >
            <option value="all">
              All subjects
            </option>

            {subjectOptions.map(
              item => (
                <option
                  key={
                    item
                  }
                  value={
                    item
                  }
                >
                  {item}
                </option>
              )
            )}
          </select>

        </label>


        <label>

          <span>
            BATCH
          </span>

          <select
            value={
              batchFilter
            }
            onChange={
              event =>
                setBatchFilter(
                  event.target.value
                )
            }
          >
            <option value="all">
              All batches
            </option>

            {batchOptions.map(
              ([
                id,
                label,
              ]) => (
                <option
                  key={
                    id
                  }
                  value={
                    id
                  }
                >
                  {label}
                </option>
              )
            )}
          </select>

        </label>


        <label>

          <span>
            SOURCE
          </span>

          <select
            value={
              sourceFilter
            }
            onChange={
              event =>
                setSourceFilter(
                  event.target.value
                )
            }
          >
            <option value="all">
              All sources
            </option>

            <option value="Manual">
              Manual
            </option>

            <option value="Published Timetable">
              Published Timetable
            </option>

          </select>

        </label>


        {filtersActive && (
          <button
            type="button"
            className="facultyDiaryClear"
            onClick={
              clearFilters
            }
          >
            Clear filters
          </button>
        )}

      </section>


      <div className="facultyDiaryResultsHead">

        <div>
          <span>
            CLASS RECORDS
          </span>

          <strong>
            {
              filteredRows.length
            }
            {" "}
            {filteredRows.length === 1
              ? "entry"
              : "entries"}
          </strong>
        </div>


        <small>
          Signed in as{" "}
          <b>
            {profile.name ||
              profile.email}
          </b>
        </small>

      </div>


      {filteredRows.length ? (
        <section className="facultyDiaryTimeline">

          {filteredRows.map(
            row => {

              const batch =
                row.batch;

              const subject =
                row.batchSubject;


              const attendancePercent =
                row.total_students
                  ? Math.round(
                      (
                        row.present_count /
                        row.total_students
                      ) *
                        100
                    )
                  : 0;


              return (
                <article
                  className="facultyDiaryCard"
                  key={
                    row.id
                  }
                >

                  <div className="facultyDiaryDate">

                    <strong>
                      {
                        new Date(
                          `${row.class_date}T00:00:00`
                        ).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                          }
                        )
                      }
                    </strong>

                    <span>
                      {
                        new Date(
                          `${row.class_date}T00:00:00`
                        )
                          .toLocaleDateString(
                            "en-IN",
                            {
                              month: "short",
                            }
                          )
                          .toUpperCase()
                      }
                    </span>

                  </div>


                  <div className="facultyDiaryCardBody">

                    <header>

                      <div>

                        <div className="facultyDiarySubjectLine">

                          {subject?.subject_code && (
                            <span>
                              {
                                subject.subject_code
                              }
                            </span>
                          )}

                          <h2>
                            {
                              row.subject
                            }
                          </h2>

                        </div>


                        <p>
                          {batch
                            ? `${batch.batch_name} · Section ${batch.section}`
                            : "Campus class"}

                          {" · "}

                          Period{" "}
                          {
                            row.period_name
                          }
                        </p>

                      </div>


                      <div
                        className={
                          row.source ===
                          "Published Timetable"
                            ? "facultyDiarySource published"
                            : "facultyDiarySource"
                        }
                      >
                        {
                          row.source
                        }
                      </div>

                    </header>


                    <section className="facultyDiaryTopic">

                      <span>
                        TOPIC TAUGHT
                      </span>

                      <strong>
                        {row.topic ||
                          "No topic recorded"}
                      </strong>

                    </section>


                    <section className="facultyDiaryAttendance">

                      <div className="present">
                        <strong>
                          {
                            row.present_count
                          }
                        </strong>

                        <span>
                          Present
                        </span>
                      </div>


                      <div className="absent">
                        <strong>
                          {
                            row.absent_count
                          }
                        </strong>

                        <span>
                          Absent
                        </span>
                      </div>


                      <div className="late">
                        <strong>
                          {
                            row.late_count
                          }
                        </strong>

                        <span>
                          Late
                        </span>
                      </div>


                      <div className="excused">
                        <strong>
                          {
                            row.excused_count
                          }
                        </strong>

                        <span>
                          Excused
                        </span>
                      </div>


                      <div className="facultyDiaryRate">

                        <strong>
                          {
                            attendancePercent
                          }%
                        </strong>

                        <span>
                          Present rate
                        </span>

                      </div>

                    </section>


                    <footer>

                      <span>
                        {
                          formatDiaryDate(
                            row.class_date
                          )
                        }
                      </span>

                      <span>
                        {
                          row.total_students
                        }
                        {" "}
                        students
                      </span>

                      {batch?.department && (
                        <span>
                          {
                            batch.department
                          }
                        </span>
                      )}

                    </footer>

                  </div>

                </article>
              );
            }
          )}

        </section>
      ) : (
        <section className="facultyDiaryEmpty">

          <span>
            ◫
          </span>

          <h2>
            No diary entries found
          </h2>

          <p>
            {filtersActive
              ? "No class records match the selected filters."
              : "Save attendance for a class and CampusConnect will create the diary entry automatically."}
          </p>

          {filtersActive ? (
            <button
              type="button"
              onClick={
                clearFilters
              }
            >
              Clear filters
            </button>
          ) : (
            <button
              type="button"
              className="primary"
              onClick={
                onOpenAttendance
              }
            >
              Take Attendance
            </button>
          )}

        </section>
      )}

    </section>
  );
}
