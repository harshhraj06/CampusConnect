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


type FacultyTodayProfile = {
  name: string;
  email: string;
  department: string;
  role: string;
  campus_uid?: string;
  avatar_url?: string;
};


type FacultyTodayClass = {
  entry_id: string;
  publication_id: string;
  version_number: number;

  batch_id: string;
  batch_name: string;
  section: string;
  department: string;
  academic_year: string;
  semester: string;

  batch_subject_id: string;
  subject_name: string;
  subject_code: string;
  subject_type: string;

  faculty_id: string;
  faculty_name: string;

  day_of_week: string;
  period_order: number;
  start_time: string;
  end_time: string;

  room: string;
  class_type: string;
  subgroup: string;
};


type FacultyTodaySession = {
  key: string;
  entries: FacultyTodayClass[];
  first: FacultyTodayClass;
  periodStart: number;
  periodEnd: number;
  startTime: string;
  endTime: string;
};


type FacultyTodaySyllabusUnit = {
  id: string;
  batch_subject_id: string;
  unit_number: number;
  unit_title: string;
};


type FacultyTodaySyllabusTopic = {
  id: string;
  unit_id: string;
  batch_subject_id: string;
  topic_order: number;
  topic_title: string;
  planned_periods: number;
};


type FacultyTodaySyllabusCompletion = {
  topic_id: string;
  batch_subject_id: string;
};


type FacultyTodayTeachingFocus = {
  configured: boolean;
  complete: boolean;

  topic_id: string;
  topic_title: string;

  unit_number: number;
  unit_title: string;

  taught_classes: number;
  credited_classes: number;
  planned_classes: number;
  progress_percent: number;

  recommendation:
    | "Continue current topic"
    | "Next pending topic"
    | "Syllabus complete";
};


type FacultyTodayClassesProps = {
  profile: FacultyTodayProfile;
  onOpenAttendance: () => void;
  onOpenMyBatches: () => void;
  onOpenSyllabusProgress: () => void;
};


const cleanTime = (
  value: string
) =>
  String(value || "")
    .slice(0, 5);


const minutesFromTime = (
  value: string
) => {
  const parts =
    cleanTime(value)
      .split(":")
      .map(Number);

  if (
    parts.length !== 2 ||
    !Number.isFinite(
      parts[0]
    ) ||
    !Number.isFinite(
      parts[1]
    )
  ) {
    return -1;
  }

  return (
    parts[0] * 60 +
    parts[1]
  );
};


const currentDayName = () =>
  new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "long",
    }
  ).format(
    new Date()
  );


const FACULTY_ATTENDANCE_HANDOFF_KEY =
  "campusconnect:faculty-attendance-class";


const FACULTY_TEST_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;


export default function FacultyTodayClasses({
  profile,
  onOpenAttendance,
  onOpenMyBatches,
  onOpenSyllabusProgress,
}: FacultyTodayClassesProps) {

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    classes,
    setClasses,
  ] =
    useState<
      FacultyTodayClass[]
    >([]);


  const [
    teachingFocusBySubject,
    setTeachingFocusBySubject,
  ] = useState<
    Record<
      string,
      FacultyTodayTeachingFocus
    >
  >({});


  const [
    todaySyllabusUnits,
    setTodaySyllabusUnits,
  ] = useState<
    FacultyTodaySyllabusUnit[]
  >([]);


  const [
    todaySyllabusTopics,
    setTodaySyllabusTopics,
  ] = useState<
    FacultyTodaySyllabusTopic[]
  >([]);


  const [
    todaySyllabusCompletions,
    setTodaySyllabusCompletions,
  ] = useState<
    FacultyTodaySyllabusCompletion[]
  >([]);


  const [
    dayName,
    setDayName,
  ] =
    useState(
      currentDayName()
    );


  const [
    testDay,
    setTestDay,
  ] =
    useState("");


  const [
    localDevelopment,
    setLocalDevelopment,
  ] =
    useState(false);


  useEffect(
    () => {

      const host =
        window.location.hostname;

      setLocalDevelopment(
        host === "localhost" ||
        host === "127.0.0.1"
      );

    },
    []
  );


  const loadTodayClasses =
    useCallback(
      async (
        requestedDay?: string
      ) => {

        if (
          profile.role !==
          "Faculty"
        ) {
          setLoading(false);
          setClasses([]);

          setTodaySyllabusUnits(
            []
          );

          setTodaySyllabusTopics(
            []
          );

          setTodaySyllabusCompletions(
            []
          );

          setTeachingFocusBySubject(
            {}
          );

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


        const today =
          requestedDay ||
          currentDayName();

        setDayName(today);
        setLoading(true);
        setError("");


        try {

          const {
            data,
            error:
              rpcError,
          } =
            await client.rpc(
              "get_my_faculty_today_classes",
              {
                p_day_of_week:
                  today,
              }
            );


          if (rpcError) {
            throw rpcError;
          }


          const nextClasses =
            (
              data ||
              []
            ) as FacultyTodayClass[];


          setClasses(
            nextClasses
          );


          const batchSubjectIds =
            Array.from(
              new Set(
                nextClasses
                  .map(
                    item =>
                      item.batch_subject_id
                  )
                  .filter(
                    Boolean
                  )
              )
            );


          if (
            !batchSubjectIds.length
          ) {

            setTodaySyllabusUnits(
              []
            );

            setTodaySyllabusTopics(
              []
            );

            setTodaySyllabusCompletions(
              []
            );

            setTeachingFocusBySubject(
              {}
            );

          } else {

            /*
             * Syllabus loading is intentionally isolated from the
             * published timetable.
             *
             * If syllabus data fails, Today's Classes remains
             * available and usable.
             */
            try {

              const [
                unitResult,
                topicResult,
                completionResult,
              ] = await Promise.all([

                client
                  .from(
                    "faculty_syllabus_units"
                  )
                  .select(
                    "id,batch_subject_id,unit_number,unit_title"
                  )
                  .in(
                    "batch_subject_id",
                    batchSubjectIds
                  )
                  .order(
                    "unit_number",
                    {
                      ascending:
                        true,
                    }
                  ),

                client
                  .from(
                    "faculty_syllabus_topics"
                  )
                  .select(
                    "id,unit_id,batch_subject_id,topic_order,topic_title,planned_periods"
                  )
                  .in(
                    "batch_subject_id",
                    batchSubjectIds
                  )
                  .order(
                    "topic_order",
                    {
                      ascending:
                        true,
                    }
                  ),

                client
                  .from(
                    "faculty_syllabus_topic_completions"
                  )
                  .select(
                    "topic_id,batch_subject_id"
                  )
                  .in(
                    "batch_subject_id",
                    batchSubjectIds
                  ),
              ]);


              if (
                unitResult.error
              ) {
                throw unitResult.error;
              }


              if (
                topicResult.error
              ) {
                throw topicResult.error;
              }


              if (
                completionResult.error
              ) {
                throw completionResult.error;
              }


              setTodaySyllabusUnits(
                (
                  unitResult.data ||
                  []
                ) as FacultyTodaySyllabusUnit[]
              );


              setTodaySyllabusTopics(
                (
                  topicResult.data ||
                  []
                ) as FacultyTodaySyllabusTopic[]
              );


              setTodaySyllabusCompletions(
                (
                  completionResult.data ||
                  []
                ) as FacultyTodaySyllabusCompletion[]
              );

            } catch (
              syllabusError
            ) {

              console.error(
                "[Faculty Today syllabus]",
                syllabusError
              );


              setTodaySyllabusUnits(
                []
              );

              setTodaySyllabusTopics(
                []
              );

              setTodaySyllabusCompletions(
                []
              );

              setTeachingFocusBySubject(
                {}
              );
            }
          }

        } catch (
          caughtError
        ) {

          console.error(
            "[Faculty Today Classes]",
            caughtError
          );


          setError(
            caughtError instanceof
            Error
              ? caughtError.message
              : "Unable to load today's published timetable."
          );


          setClasses([]);

          setTodaySyllabusUnits(
            []
          );

          setTodaySyllabusTopics(
            []
          );

          setTodaySyllabusCompletions(
            []
          );

          setTeachingFocusBySubject(
            {}
          );

        } finally {

          setLoading(false);

        }
      },
      [
        profile.role,
      ]
    );


  useEffect(
    () => {
      void loadTodayClasses();
    },
    [
      loadTodayClasses,
    ]
  );


  useEffect(
    () => {

      /*
       * Build one teaching recommendation for every exact
       * batch_subject_id appearing in Today's Classes.
       *
       * Different sections remain fully independent even when
       * they use the same subject name.
       */

      if (
        !classes.length
      ) {
        setTeachingFocusBySubject(
          {}
        );

        return;
      }


      const batchSubjectIds =
        Array.from(
          new Set(
            classes
              .map(
                item =>
                  item.batch_subject_id
              )
              .filter(
                Boolean
              )
          )
        );


      const unitMap =
        new Map(
          todaySyllabusUnits.map(
            unit => [
              unit.id,
              unit,
            ]
          )
        );


      const coverageCounts =
        todaySyllabusCompletions.reduce<
          Record<
            string,
            number
          >
        >(
          (
            counts,
            completion
          ) => {

            const topicId =
              completion.topic_id;


            counts[
              topicId
            ] =
              (
                counts[
                  topicId
                ] ||
                0
              ) +
              1;


            return counts;
          },
          {}
        );


      const nextFocus:
        Record<
          string,
          FacultyTodayTeachingFocus
        > = {};


      for (
        const batchSubjectId
        of batchSubjectIds
      ) {

        const subjectTopics =
          todaySyllabusTopics
            .filter(
              topic =>
                topic.batch_subject_id ===
                batchSubjectId
            )
            .sort(
              (
                a,
                b
              ) => {

                const aUnitNumber =
                  unitMap.get(
                    a.unit_id
                  )?.unit_number ??
                  Number.MAX_SAFE_INTEGER;


                const bUnitNumber =
                  unitMap.get(
                    b.unit_id
                  )?.unit_number ??
                  Number.MAX_SAFE_INTEGER;


                if (
                  aUnitNumber !==
                  bUnitNumber
                ) {
                  return (
                    aUnitNumber -
                    bUnitNumber
                  );
                }


                return (
                  a.topic_order -
                  b.topic_order
                );
              }
            );


        /*
         * The subject exists in today's published timetable,
         * but Faculty has not configured syllabus topics yet.
         */
        if (
          !subjectTopics.length
        ) {

          nextFocus[
            batchSubjectId
          ] = {
            configured:
              false,

            complete:
              false,

            topic_id:
              "",

            topic_title:
              "",

            unit_number:
              0,

            unit_title:
              "",

            taught_classes:
              0,

            credited_classes:
              0,

            planned_classes:
              0,

            progress_percent:
              0,

            recommendation:
              "Next pending topic",
          };


          continue;
        }


        const incompleteTopics =
          subjectTopics.filter(
            topic => {

              const taughtClasses =
                coverageCounts[
                  topic.id
                ] ||
                0;


              const plannedClasses =
                Math.max(
                  1,
                  Number(
                    topic.planned_periods
                  ) ||
                    1
                );


              return (
                taughtClasses <
                plannedClasses
              );
            }
          );


        /*
         * Important multi-day rule:
         *
         * Continue an already-started topic before suggesting
         * a later untouched topic.
         *
         * Example:
         *
         * Sampling Theorem      2/3
         * Discrete Time Signals 0/2
         *
         * Recommendation:
         * Sampling Theorem.
         */
        const inProgressTopic =
          incompleteTopics.find(
            topic =>
              (
                coverageCounts[
                  topic.id
                ] ||
                0
              ) >
              0
          );


        const recommendedTopic =
          inProgressTopic ||
          incompleteTopics[0] ||
          null;


        /*
         * Syllabus exists and every configured topic has
         * reached its required teaching-class coverage.
         */
        if (
          !recommendedTopic
        ) {

          nextFocus[
            batchSubjectId
          ] = {
            configured:
              true,

            complete:
              true,

            topic_id:
              "",

            topic_title:
              "",

            unit_number:
              0,

            unit_title:
              "",

            taught_classes:
              0,

            credited_classes:
              0,

            planned_classes:
              0,

            progress_percent:
              100,

            recommendation:
              "Syllabus complete",
          };


          continue;
        }


        const unit =
          unitMap.get(
            recommendedTopic.unit_id
          );


        const taughtClasses =
          coverageCounts[
            recommendedTopic.id
          ] ||
          0;


        const plannedClasses =
          Math.max(
            1,
            Number(
              recommendedTopic
                .planned_periods
            ) ||
              1
          );


        const creditedClasses =
          Math.min(
            taughtClasses,
            plannedClasses
          );


        const progressPercent =
          Math.min(
            100,
            Math.max(
              0,
              Math.round(
                (
                  creditedClasses /
                  plannedClasses
                ) *
                  100
              )
            )
          );


        nextFocus[
          batchSubjectId
        ] = {
          configured:
            true,

          complete:
            false,

          topic_id:
            recommendedTopic.id,

          topic_title:
            recommendedTopic.topic_title,

          unit_number:
            unit?.unit_number ||
            0,

          unit_title:
            unit?.unit_title ||
            "",

          taught_classes:
            taughtClasses,

          credited_classes:
            creditedClasses,

          planned_classes:
            plannedClasses,

          progress_percent:
            progressPercent,

          recommendation:
            taughtClasses > 0
              ? "Continue current topic"
              : "Next pending topic",
        };
      }


      setTeachingFocusBySubject(
        nextFocus
      );

    },
    [
      classes,
      todaySyllabusUnits,
      todaySyllabusTopics,
      todaySyllabusCompletions,
    ]
  );


  const changeTestDay =
    (
      nextDay: string
    ) => {

      setTestDay(
        nextDay
      );

      const requestedDay =
        nextDay ||
        currentDayName();

      void loadTodayClasses(
        requestedDay
      );

    };


  const sessions =
    useMemo<
      FacultyTodaySession[]
    >(
      () => {

        const ordered =
          [...classes].sort(
            (a, b) =>
              (
                a.period_order -
                b.period_order
              ) ||
              a.start_time
                .localeCompare(
                  b.start_time
                )
          );


        const result:
          FacultyTodaySession[] =
            [];


        for (
          const entry
          of ordered
        ) {

          const previous =
            result[
              result.length - 1
            ];


          const sameClass =
            Boolean(
              previous &&
              previous.first
                .batch_id ===
                entry.batch_id &&
              previous.first
                .batch_subject_id ===
                entry.batch_subject_id &&
              previous.first
                .room ===
                entry.room &&
              previous.first
                .class_type ===
                entry.class_type &&
              previous.first
                .subgroup ===
                entry.subgroup
            );


          const consecutive =
            Boolean(
              previous &&
              entry.period_order ===
                previous.periodEnd +
                1
            );


          if (
            previous &&
            sameClass &&
            consecutive
          ) {

            previous.entries.push(
              entry
            );

            previous.periodEnd =
              entry.period_order;

            previous.endTime =
              entry.end_time;

            continue;
          }


          result.push({
            key:
              [
                entry.publication_id,
                entry.batch_id,
                entry.batch_subject_id,
                entry.period_order,
              ].join(":"),

            entries: [
              entry,
            ],

            first:
              entry,

            periodStart:
              entry.period_order,

            periodEnd:
              entry.period_order,

            startTime:
              entry.start_time,

            endTime:
              entry.end_time,
          });

        }


        return result;
      },
      [
        classes,
      ]
    );


  const nowMinutes =
    (() => {
      const now =
        new Date();

      return (
        now.getHours() *
          60 +
        now.getMinutes()
      );
    })();


  const openAttendanceForClass =
    (
      session:
        FacultyTodaySession
    ) => {

      const item =
        session.first;

      try {

        window.sessionStorage.setItem(
          FACULTY_ATTENDANCE_HANDOFF_KEY,
          JSON.stringify({
            batchId:
              item.batch_id,

            batchSubjectId:
              item.batch_subject_id,

            subjectName:
              item.subject_name,

            subjectCode:
              item.subject_code,

            publicationId:
              item.publication_id,

            timetableEntryId:
              item.entry_id,

            periodStart:
              session.periodStart,

            periodEnd:
              session.periodEnd,

            startTime:
              session.startTime,

            endTime:
              session.endTime,

            room:
              item.room,

            classType:
              item.class_type,

            subgroup:
              item.subgroup,

            requestedAt:
              Date.now(),
          })
        );

      } catch (
        storageError
      ) {

        console.error(
          "[Faculty attendance handoff]",
          storageError
        );

      }


      onOpenAttendance();
    };


  if (
    profile.role !==
    "Faculty"
  ) {
    return null;
  }


  return (
    <section className="facultyTodayPage">

      <header className="facultyTodayHero">

        <div>

          <span>
            FACULTY · LIVE TIMETABLE
          </span>

          <h1>
            Today&apos;s Classes
          </h1>

          <p>
            Your schedule is loaded only from the currently published CampusConnect timetable.
          </p>

        </div>


        <div className="facultyTodayHeroMetric">

          <strong>
            {
              sessions.length
            }
          </strong>

          <small>
            session
            {sessions.length === 1
              ? ""
              : "s"} today
          </small>

        </div>

      </header>


      <section className="facultyTodayToolbar">

        <div>

          <span>
            {
              dayName.toUpperCase()
            }
          </span>

          <h2>
            Published schedule
          </h2>

          <p>
            Classes are ordered by official timetable period sequence.
          </p>

        </div>


        <div className="facultyTodayToolbarActions">

          {localDevelopment && (
            <label className="facultyTodayTestDay">

              <span>
                TEST DAY
              </span>

              <select
                value={
                  testDay
                }
                onChange={
                  event =>
                    changeTestDay(
                      event.target.value
                    )
                }
              >
                <option value="">
                  Real day
                </option>

                {FACULTY_TEST_DAYS.map(
                  day => (
                    <option
                      key={
                        day
                      }
                      value={
                        day
                      }
                    >
                      {day}
                    </option>
                  )
                )}

              </select>

            </label>
          )}


          <button
            type="button"
            onClick={
              onOpenMyBatches
            }
          >
            My Batches
            <b>→</b>
          </button>

        </div>

      </section>


      {error && (
        <div className="facultyTodayError">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              void loadTodayClasses(
                testDay ||
                currentDayName()
              )
            }
          >
            Retry
          </button>

        </div>
      )}


      {loading ? (

        <div className="facultyTodayEmpty">

          <span>
            TC
          </span>

          <h3>
            Loading today&apos;s classes…
          </h3>

        </div>

      ) : sessions.length ? (

        <div className="facultyTodayTimeline">

          {sessions.map(
            session => {

              const item =
                session.first;


              const teachingFocus =
                teachingFocusBySubject[
                  item.batch_subject_id
                ] ||
                null;


              const startMinutes =
                minutesFromTime(
                  session.startTime
                );


              const endMinutes =
                minutesFromTime(
                  session.endTime
                );


              const state =
                startMinutes >= 0 &&
                endMinutes >= 0 &&
                nowMinutes >=
                  startMinutes &&
                nowMinutes <
                  endMinutes
                  ? "Live"
                  : startMinutes >= 0 &&
                    nowMinutes <
                      startMinutes
                    ? "Upcoming"
                    : "Completed";


              return (
                <article
                  key={
                    session.key
                  }
                  className="facultyTodayCard"
                >

                  <div className="facultyTodayTime">

                    <strong>
                      {cleanTime(
                        session.startTime
                      )}
                    </strong>

                    <span>
                      to
                    </span>

                    <strong>
                      {cleanTime(
                        session.endTime
                      )}
                    </strong>

                    <small>
                      Period{" "}
                      {
                        session.periodStart
                      }
                      {session.periodEnd !==
                      session.periodStart
                        ? `–${session.periodEnd}`
                        : ""}
                    </small>

                  </div>


                  <div className="facultyTodayContent">

                    <div className="facultyTodayTags">

                      <span
                        data-state={
                          state.toLowerCase()
                        }
                      >
                        {state}
                      </span>

                      <span>
                        {item.class_type ||
                          item.subject_type}
                      </span>

                      {item.subgroup && (
                        <span>
                          Group{" "}
                          {
                            item.subgroup
                          }
                        </span>
                      )}

                      {session.entries
                        .length >
                        1 && (
                        <span>
                          {
                            session
                              .entries
                              .length
                          }{" "}
                          periods
                        </span>
                      )}

                    </div>


                    <h3>
                      {item.subject_code
                        ? `${item.subject_code} · `
                        : ""}
                      {
                        item.subject_name
                      }
                    </h3>


                    <p>
                      {
                        item.batch_name
                      }

                      {item.section
                        ? ` · Section ${item.section}`
                        : ""}

                      {item.semester
                        ? ` · Semester ${item.semester}`
                        : ""}
                    </p>


                    <div className="facultyTodayInfo">

                      <span>
                        <small>
                          ROOM / LAB
                        </small>

                        <b>
                          {item.room ||
                            "Not assigned"}
                        </b>
                      </span>


                      <span>
                        <small>
                          DEPARTMENT
                        </small>

                        <b>
                          {item.department ||
                            "—"}
                        </b>
                      </span>


                      <span>
                        <small>
                          TIMETABLE
                        </small>

                        <b>
                          Version{" "}
                          {
                            item.version_number
                          }
                        </b>
                      </span>

                    </div>


                    {teachingFocus && (
                      <section
                        className={`facultyTodayTeachingFocus ${
                          !teachingFocus.configured
                            ? "unconfigured"
                            : teachingFocus.complete
                            ? "complete"
                            : teachingFocus.taught_classes >
                              0
                            ? "continuing"
                            : "pending"
                        }`}
                      >

                        {!teachingFocus.configured ? (
                          <>

                            <div className="facultyTodayTeachingFocusMark">
                              +
                            </div>


                            <div className="facultyTodayTeachingFocusCopy">

                              <span>
                                SYLLABUS NOT CONFIGURED
                              </span>

                              <strong>
                                Add syllabus topics for {
                                  item.subject_code ||
                                  item.subject_name
                                }
                              </strong>

                              <p>
                                Configure units, topics and planned classes to enable automatic teaching recommendations.
                              </p>


                              <button
                                type="button"
                                className="facultyTodayTeachingFocusAction"
                                onClick={
                                  onOpenSyllabusProgress
                                }
                              >
                                Configure Syllabus
                                <b>
                                  →
                                </b>
                              </button>

                            </div>

                          </>
                        ) : teachingFocus.complete ? (
                          <>

                            <div className="facultyTodayTeachingFocusMark">
                              ✓
                            </div>


                            <div className="facultyTodayTeachingFocusCopy">

                              <span>
                                SYLLABUS COMPLETE
                              </span>

                              <strong>
                                Planned syllabus coverage completed
                              </strong>

                              <p>
                                Every configured topic has reached its planned teaching-class coverage.
                              </p>

                            </div>

                          </>
                        ) : (
                          <>

                            <div className="facultyTodayTeachingFocusMark">
                              {teachingFocus.taught_classes >
                              0
                                ? "◐"
                                : "○"}
                            </div>


                            <div className="facultyTodayTeachingFocusCopy">

                              <span>
                                NEXT TEACHING FOCUS
                              </span>

                              <strong>
                                {
                                  teachingFocus.topic_title
                                }
                              </strong>

                              <p>
                                {teachingFocus.unit_number
                                  ? `Unit ${
                                      teachingFocus.unit_number
                                    }${
                                      teachingFocus.unit_title
                                        ? ` · ${teachingFocus.unit_title}`
                                        : ""
                                    }`
                                  : "Assigned syllabus"}
                              </p>


                              <div className="facultyTodayTeachingFocusProgress">

                                <i>
                                  <span
                                    style={{
                                      width:
                                        `${teachingFocus.progress_percent}%`,
                                    }}
                                  />
                                </i>


                                <b>
                                  {
                                    teachingFocus.credited_classes
                                  }
                                  /
                                  {
                                    teachingFocus.planned_classes
                                  }
                                  {" classes"}
                                </b>

                              </div>


                              <small>
                                {
                                  teachingFocus.recommendation
                                }
                              </small>

                            </div>

                          </>
                        )}

                      </section>
                    )}

                  </div>


                  <div className="facultyTodayActions">

                    <button
                      type="button"
                      className="primary"
                      onClick={() =>
                        openAttendanceForClass(
                          session
                        )
                      }
                    >
                      Take Attendance
                    </button>

                    <button
                      type="button"
                      onClick={
                        onOpenMyBatches
                      }
                    >
                      Open Batch
                    </button>

                  </div>

                </article>
              );
            }
          )}

        </div>

      ) : (

        <div className="facultyTodayEmpty">

          <span>
            ◇
          </span>

          <h3>
            No published classes scheduled for today
          </h3>

          <p>
            CampusConnect found no published timetable entries assigned to your account for {dayName}.
          </p>

          <button
            type="button"
            onClick={
              onOpenMyBatches
            }
          >
            Open My Batches
          </button>

        </div>

      )}

    </section>
  );
}
