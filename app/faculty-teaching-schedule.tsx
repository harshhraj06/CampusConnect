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

import FacultyTimetableChangeCenter, {
  type FacultyTimetableChangeEntry,
} from "./faculty-timetable-change-center";


const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;


type WeekDay =
  typeof WEEK_DAYS[number];


type FacultyTeachingScheduleProfile = {
  role?: string | null;
  name?: string | null;
  email?: string | null;
};


type FacultyTeachingScheduleProps = {
  profile:
    FacultyTeachingScheduleProfile;
};


type TeachingScheduleEntry = {
  id: string;

  publicationId: string;
  versionNumber: number;

  batchId: string;
  batchName: string;
  section: string;
  department: string;
  academicYear: string;
  semester: string;

  batchSubjectId: string;

  subjectName: string;
  subjectCode: string;
  subjectType: string;

  facultyId: string;
  facultyName: string;

  dayOfWeek: WeekDay;
  periodOrder: number;

  startTime: string;
  endTime: string;

  room: string;

  resourceId: string | null;
  resourceCode: string;
  resourceName: string;
  resourceType: string;

  classType: string;
  subgroup: string;
};


const displayName = (
  profile:
    FacultyTeachingScheduleProfile
) =>
  profile.name?.trim() ||
  profile.email
    ?.split("@")[0]
    ?.trim() ||
  "Faculty";


const cleanText = (
  value: unknown
) =>
  String(
    value ??
    ""
  ).trim();


const numberValue = (
  value: unknown
) => {

  const result =
    Number(value);

  return Number.isFinite(
    result
  )
    ? result
    : 0;
};


const timeToMinutes = (
  value: string
) => {

  const [
    hour = "0",
    minute = "0",
  ] =
    value
      .split(":");


  return (
    Number(hour) *
      60 +
    Number(minute)
  );
};


const formatTime = (
  value: string
) => {

  if (!value) {
    return "—";
  }


  const [
    hourRaw = "0",
    minuteRaw = "0",
  ] =
    value
      .split(":");


  const hour =
    Number(hourRaw);

  const minute =
    Number(minuteRaw);


  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return value;
  }


  const suffix =
    hour >= 12
      ? "PM"
      : "AM";


  const displayHour =
    hour % 12 ||
    12;


  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
};


const formatDuration = (
  start: string,
  end: string
) => {

  const minutes =
    Math.max(
      0,
      timeToMinutes(end) -
      timeToMinutes(start)
    );


  if (minutes < 60) {
    return `${minutes} min`;
  }


  const hours =
    Math.floor(
      minutes / 60
    );

  const remaining =
    minutes % 60;


  return remaining
    ? `${hours}h ${remaining}m`
    : `${hours}h`;
};


const isLabEntry = (
  entry:
    TeachingScheduleEntry
) => {

  const value =
    [
      entry.classType,
      entry.subjectType,
      entry.resourceType,
      entry.resourceName,
    ]
      .join(" ")
      .toLowerCase();


  return value.includes(
    "lab"
  );
};


const currentWeekDay = () => {

  const names = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];


  const name =
    names[
      new Date().getDay()
    ];


  return WEEK_DAYS.includes(
    name as WeekDay
  )
    ? name as WeekDay
    : "Monday";
};


const normalizeSchedule = (
  input: unknown
): TeachingScheduleEntry[] => {

  if (
    !Array.isArray(input)
  ) {
    return [];
  }


  return input
    .filter(
      item =>
        item &&
        typeof item ===
          "object"
    )
    .map(
      item => {

        const row =
          item as Record<
            string,
            unknown
          >;


        return {

          id:
            cleanText(
              row.id
            ),

          publicationId:
            cleanText(
              row.publicationId
            ),

          versionNumber:
            numberValue(
              row.versionNumber
            ),

          batchId:
            cleanText(
              row.batchId
            ),

          batchName:
            cleanText(
              row.batchName
            ),

          section:
            cleanText(
              row.section
            ),

          department:
            cleanText(
              row.department
            ),

          academicYear:
            cleanText(
              row.academicYear
            ),

          semester:
            cleanText(
              row.semester
            ),

          batchSubjectId:
            cleanText(
              row.batchSubjectId
            ),

          subjectName:
            cleanText(
              row.subjectName
            ),

          subjectCode:
            cleanText(
              row.subjectCode
            ),

          subjectType:
            cleanText(
              row.subjectType
            ),

          facultyId:
            cleanText(
              row.facultyId
            ),

          facultyName:
            cleanText(
              row.facultyName
            ),

          dayOfWeek:
            (
              WEEK_DAYS.includes(
                cleanText(
                  row.dayOfWeek
                ) as WeekDay
              )
                ? cleanText(
                    row.dayOfWeek
                  )
                : "Monday"
            ) as WeekDay,

          periodOrder:
            numberValue(
              row.periodOrder
            ),

          startTime:
            cleanText(
              row.startTime
            ),

          endTime:
            cleanText(
              row.endTime
            ),

          room:
            cleanText(
              row.room
            ),

          resourceId:
            cleanText(
              row.resourceId
            ) ||
            null,

          resourceCode:
            cleanText(
              row.resourceCode
            ),

          resourceName:
            cleanText(
              row.resourceName
            ),

          resourceType:
            cleanText(
              row.resourceType
            ),

          classType:
            cleanText(
              row.classType
            ),

          subgroup:
            cleanText(
              row.subgroup
            ),
        };
      }
    )
    .filter(
      item =>
        Boolean(
          item.id
        )
    );
};


export default function FacultyTeachingSchedule({
  profile,
}: FacultyTeachingScheduleProps) {

  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    entries,
    setEntries,
  ] =
    useState<
      TeachingScheduleEntry[]
    >([]);


  const [
    selectedDay,
    setSelectedDay,
  ] =
    useState<WeekDay>(
      currentWeekDay()
    );


  const [
    viewMode,
    setViewMode,
  ] =
    useState<
      "day" |
      "week"
    >("day");


  const [
    query,
    setQuery,
  ] =
    useState("");


  const [
    now,
    setNow,
  ] =
    useState(
      () =>
        new Date()
    );


  const [
    lastSyncedAt,
    setLastSyncedAt,
  ] =
    useState<Date | null>(
      null
    );


  const [
    requestMode,
    setRequestMode,
  ] =
    useState<
      "create" |
      "history" |
      null
    >(
      null
    );


  const [
    requestEntry,
    setRequestEntry,
  ] =
    useState<
      FacultyTimetableChangeEntry |
      null
    >(
      null
    );


  useEffect(
    () => {

      const timer =
        window.setInterval(
          () => {
            setNow(
              new Date()
            );
          },
          30000
        );


      return () => {
        window.clearInterval(
          timer
        );
      };
    },
    []
  );


  const loadSchedule =
    useCallback(
      async (
        silent = false
      ) => {

        if (
          profile.role !==
          "Faculty"
        ) {

          setError(
            "My Teaching Schedule is available only to Faculty accounts."
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


        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }


        setError("");


        try {

          const {
            data,
            error:
              scheduleError,
          } =
            await client.rpc(
              "get_my_faculty_timetable"
            );


          if (
            scheduleError
          ) {
            throw scheduleError;
          }


          const next =
            normalizeSchedule(
              data
            );


          setEntries(
            next
          );

          setLastSyncedAt(
            new Date()
          );

        } catch (
          requestError
        ) {

          console.error(
            "[Faculty Teaching Schedule]",
            requestError
          );


          const message =
            requestError instanceof
              Error
              ? requestError.message
              : (
                  requestError &&
                  typeof requestError ===
                    "object" &&
                  "message" in
                    requestError
                )
                ? String(
                    (
                      requestError as {
                        message?: unknown;
                      }
                    ).message ||
                    "Unable to load your teaching schedule."
                  )
                : "Unable to load your teaching schedule.";


          setError(
            message
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

      void loadSchedule();

    },
    [
      loadSchedule,
    ]
  );


  const normalizedQuery =
    query
      .trim()
      .toLowerCase();


  const filteredEntries =
    useMemo(
      () => {

        if (
          !normalizedQuery
        ) {
          return entries;
        }


        return entries.filter(
          entry => {

            const haystack =
              [
                entry.subjectCode,
                entry.subjectName,
                entry.batchName,
                entry.section,
                entry.department,
                entry.room,
                entry.resourceCode,
                entry.resourceName,
                entry.classType,
                entry.subgroup,
              ]
                .join(" ")
                .toLowerCase();


            return haystack.includes(
              normalizedQuery
            );
          }
        );
      },
      [
        entries,
        normalizedQuery,
      ]
    );


  const entriesByDay =
    useMemo(
      () => {

        const result =
          new Map<
            WeekDay,
            TeachingScheduleEntry[]
          >();


        WEEK_DAYS.forEach(
          day => {
            result.set(
              day,
              []
            );
          }
        );


        filteredEntries.forEach(
          entry => {

            result
              .get(
                entry.dayOfWeek
              )
              ?.push(
                entry
              );
          }
        );


        result.forEach(
          rows => {

            rows.sort(
              (
                left,
                right
              ) =>
                timeToMinutes(
                  left.startTime
                ) -
                timeToMinutes(
                  right.startTime
                ) ||
                left.periodOrder -
                right.periodOrder
            );
          }
        );


        return result;
      },
      [
        filteredEntries,
      ]
    );


  const today =
    currentWeekDay();


  const todayRows =
    entriesByDay.get(
      today
    ) ||
    [];


  const selectedRows =
    entriesByDay.get(
      selectedDay
    ) ||
    [];


  const nowMinutes =
    now.getHours() *
      60 +
    now.getMinutes();


  const liveClass =
    todayRows.find(
      entry =>
        timeToMinutes(
          entry.startTime
        ) <=
          nowMinutes &&
        timeToMinutes(
          entry.endTime
        ) >
          nowMinutes
    ) ||
    null;


  const nextClass =
    todayRows.find(
      entry =>
        timeToMinutes(
          entry.startTime
        ) >
          nowMinutes
    ) ||
    null;


  const uniqueBatchKeys =
    new Set(
      entries.map(
        entry =>
          `${entry.batchId}:${entry.section}`
      )
    );


  const uniqueSubjectIds =
    new Set(
      entries.map(
        entry =>
          entry.batchSubjectId
      )
    );


  const labCount =
    entries.filter(
      isLabEntry
    ).length;


  const totalMinutes =
    entries.reduce(
      (
        total,
        entry
      ) =>
        total +
        Math.max(
          0,
          timeToMinutes(
            entry.endTime
          ) -
          timeToMinutes(
            entry.startTime
          )
        ),
      0
    );


  const teachingHours =
    totalMinutes /
    60;


  const displayHours =
    Number.isInteger(
      teachingHours
    )
      ? String(
          teachingHours
        )
      : teachingHours
          .toFixed(1);


  const latestVersion =
    entries.reduce(
      (
        current,
        entry
      ) =>
        Math.max(
          current,
          entry.versionNumber
        ),
      0
    );


  const currentOrNext =
    liveClass ||
    nextClass;


  if (
    loading
  ) {

    return (
      <section className="facultyTeachingSchedule">

        <div className="facultyTeachingScheduleSkeletonHero">

          <div className="facultyScheduleSkeleton facultyScheduleSkeletonTag" />

          <div className="facultyScheduleSkeleton facultyScheduleSkeletonTitle" />

          <div className="facultyScheduleSkeleton facultyScheduleSkeletonText" />

        </div>


        <div className="facultyTeachingScheduleSkeletonMetrics">

          {Array.from(
            {
              length: 4,
            }
          ).map(
            (
              _,
              index
            ) => (
              <div
                className="facultyScheduleSkeleton facultyScheduleSkeletonMetric"
                key={index}
              />
            )
          )}

        </div>


        <div className="facultyScheduleSkeleton facultyScheduleSkeletonPanel" />

      </section>
    );
  }


  return (
    <section className="facultyTeachingSchedule">

      <header className="facultyTeachingScheduleHero">

        <div className="facultyTeachingScheduleHeroTop">

          <div>

            <div className="facultyTeachingScheduleEyebrow">

              <span className="facultyTeachingScheduleLiveDot" />

              FACULTY · PUBLISHED SCHEDULE

            </div>


            <h1>
              My Teaching Schedule
            </h1>


            <p>
              Your classes, labs, batches and rooms in one private schedule.
              Only timetable entries assigned to your Faculty account appear here.
            </p>

          </div>


          <div className="facultyTeachingScheduleHeroActions">

            <button
              type="button"
              className="facultyTeachingScheduleRequests"
              onClick={() => {
                setRequestEntry(
                  null
                );

                setRequestMode(
                  "history"
                );
              }}
            >
              Requests
            </button>

            <div className="facultyTeachingScheduleVersion">

              <span>
                Published
              </span>

              <strong>
                {latestVersion
                  ? `Version ${latestVersion}`
                  : "No version"}
              </strong>

            </div>


            <button
              type="button"
              className="facultyTeachingScheduleRefresh"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadSchedule(
                  true
                )
              }
            >
              <span
                aria-hidden="true"
                className={
                  refreshing
                    ? "facultyTeachingScheduleRefreshIcon is-spinning"
                    : "facultyTeachingScheduleRefreshIcon"
                }
              >
                ↻
              </span>

              {refreshing
                ? "Refreshing"
                : "Refresh"}

            </button>

          </div>

        </div>


        <div className="facultyTeachingScheduleIdentity">

          <div className="facultyTeachingScheduleAvatar">
            {displayName(
              profile
            )
              .slice(
                0,
                1
              )
              .toUpperCase()}
          </div>


          <div>

            <strong>
              {displayName(
                profile
              )}
            </strong>

            <span>
              Private Faculty timetable
            </span>

          </div>


          {lastSyncedAt && (
            <small>
              Synced{" "}
              {lastSyncedAt.toLocaleTimeString(
                [],
                {
                  hour:
                    "2-digit",
                  minute:
                    "2-digit",
                }
              )}
            </small>
          )}

        </div>

      </header>


      {error && (
        <div
          className="facultyTeachingScheduleAlert"
          role="alert"
        >

          <div>

            <strong>
              Schedule unavailable
            </strong>

            <span>
              {error}
            </span>

          </div>


          <button
            type="button"
            onClick={() =>
              void loadSchedule()
            }
          >
            Try again
          </button>

        </div>
      )}


      {!error && (
        <>

          <section
            className="facultyTeachingScheduleMetrics"
            aria-label="Teaching schedule summary"
          >

            <article>

              <span>
                Weekly sessions
              </span>

              <strong>
                {entries.length}
              </strong>

              <small>
                Published classes
              </small>

            </article>


            <article>

              <span>
                Teaching hours
              </span>

              <strong>
                {displayHours}
              </strong>

              <small>
                Hours per week
              </small>

            </article>


            <article>

              <span>
                Assigned batches
              </span>

              <strong>
                {uniqueBatchKeys.size}
              </strong>

              <small>
                Across your schedule
              </small>

            </article>


            <article>

              <span>
                Labs
              </span>

              <strong>
                {labCount}
              </strong>

              <small>
                Lab sessions
              </small>

            </article>

          </section>


          <section className="facultyTeachingScheduleFocus">

            <div className="facultyTeachingScheduleFocusCopy">

              <span>
                {liveClass
                  ? "HAPPENING NOW"
                  : nextClass
                    ? "UP NEXT"
                    : todayRows.length
                      ? "TODAY"
                      : "TODAY"}
              </span>


              {currentOrNext ? (
                <>

                  <h2>
                    {currentOrNext.subjectCode && (
                      <>
                        {currentOrNext.subjectCode}
                        {" · "}
                      </>
                    )}

                    {currentOrNext.subjectName}
                  </h2>


                  <p>
                    {formatTime(
                      currentOrNext.startTime
                    )}
                    {" – "}
                    {formatTime(
                      currentOrNext.endTime
                    )}

                    {" · "}

                    {currentOrNext.batchName}

                    {currentOrNext.section
                      ? ` · Section ${currentOrNext.section}`
                      : ""}

                    {" · "}

                    {currentOrNext.resourceName ||
                      currentOrNext.room ||
                      "Room not assigned"}
                  </p>

                </>
              ) : (
                <>

                  <h2>
                    No more classes today
                  </h2>

                  <p>
                    Your published teaching schedule has no upcoming session for today.
                  </p>

                </>
              )}

            </div>


            {currentOrNext && (
              <div className="facultyTeachingScheduleFocusMeta">

                <div>

                  <span>
                    TYPE
                  </span>

                  <strong>
                    {currentOrNext.classType ||
                      currentOrNext.subjectType ||
                      "Class"}
                  </strong>

                </div>


                <div>

                  <span>
                    DURATION
                  </span>

                  <strong>
                    {formatDuration(
                      currentOrNext.startTime,
                      currentOrNext.endTime
                    )}
                  </strong>

                </div>

              </div>
            )}

          </section>


          <section className="facultyTeachingSchedulePanel">

            <div className="facultyTeachingScheduleToolbar">

              <div>

                <span className="facultyTeachingSchedulePanelEyebrow">
                  WEEKLY SCHEDULE
                </span>

                <h2>
                  Teaching calendar
                </h2>

              </div>


              <div className="facultyTeachingScheduleToolbarActions">

                <label className="facultyTeachingScheduleSearch">

                  <span aria-hidden="true">
                    ⌕
                  </span>

                  <input
                    type="search"
                    value={
                      query
                    }
                    placeholder="Search subject, batch, room…"
                    aria-label="Search teaching schedule"
                    onChange={
                      event =>
                        setQuery(
                          event
                            .target
                            .value
                        )
                    }
                  />

                  {query && (
                    <button
                      type="button"
                      aria-label="Clear schedule search"
                      onClick={() =>
                        setQuery("")
                      }
                    >
                      ×
                    </button>
                  )}

                </label>


                <div
                  className="facultyTeachingScheduleViewSwitch"
                  role="group"
                  aria-label="Schedule display"
                >

                  <button
                    type="button"
                    aria-pressed={
                      viewMode ===
                      "day"
                    }
                    className={
                      viewMode ===
                      "day"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setViewMode(
                        "day"
                      )
                    }
                  >
                    Day
                  </button>


                  <button
                    type="button"
                    aria-pressed={
                      viewMode ===
                      "week"
                    }
                    className={
                      viewMode ===
                      "week"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setViewMode(
                        "week"
                      )
                    }
                  >
                    Week
                  </button>

                </div>

              </div>

            </div>


            {viewMode ===
              "day" && (
              <>

                <nav
                  className="facultyTeachingScheduleDays"
                  aria-label="Teaching schedule days"
                >

                  {WEEK_DAYS.map(
                    day => {

                      const count =
                        entriesByDay
                          .get(day)
                          ?.length ||
                        0;


                      return (
                        <button
                          type="button"
                          key={day}
                          className={
                            selectedDay ===
                            day
                              ? "active"
                              : ""
                          }
                          aria-current={
                            selectedDay ===
                            day
                              ? "date"
                              : undefined
                          }
                          onClick={() =>
                            setSelectedDay(
                              day
                            )
                          }
                        >

                          <span>
                            {day.slice(
                              0,
                              3
                            )}
                          </span>

                          <small>
                            {count}
                          </small>

                        </button>
                      );
                    }
                  )}

                </nav>


                {selectedRows.length ? (
                  <div className="facultyTeachingScheduleTimeline">

                    {selectedRows.map(
                      (
                        entry,
                        index
                      ) => {

                        const lab =
                          isLabEntry(
                            entry
                          );


                        return (
                          <article
                            className={
                              "facultyTeachingScheduleClass " +
                              (
                                lab
                                  ? "is-lab"
                                  : ""
                              )
                            }
                            key={
                              entry.id
                            }
                          >

                            <div className="facultyTeachingScheduleTime">

                              <strong>
                                {formatTime(
                                  entry.startTime
                                )}
                              </strong>

                              <span>
                                {formatTime(
                                  entry.endTime
                                )}
                              </span>

                              <small>
                                {formatDuration(
                                  entry.startTime,
                                  entry.endTime
                                )}
                              </small>

                            </div>


                            <div className="facultyTeachingScheduleRail">

                              <span />

                              {index <
                                selectedRows.length -
                                  1 && (
                                <i />
                              )}

                            </div>


                            <div className="facultyTeachingScheduleClassBody">

                              <div className="facultyTeachingScheduleClassTop">

                                <div>

                                  <div className="facultyTeachingScheduleClassBadges">

                                    <span>
                                      {entry.subjectCode ||
                                        "SUBJECT"}
                                    </span>

                                    <span>
                                      {lab
                                        ? "LAB"
                                        : entry.classType ||
                                          "CLASS"}
                                    </span>

                                    {entry.subgroup && (
                                      <span>
                                        {entry.subgroup}
                                      </span>
                                    )}

                                  </div>


                                  <h3>
                                    {entry.subjectName ||
                                      "Untitled subject"}
                                  </h3>

                                </div>


                                <span className="facultyTeachingSchedulePeriod">
                                  Period{" "}
                                  {entry.periodOrder}
                                </span>

                              </div>


                              <div className="facultyTeachingScheduleClassDetails">

                                <div>

                                  <span>
                                    BATCH
                                  </span>

                                  <strong>
                                    {entry.batchName ||
                                      "Batch"}

                                    {entry.section
                                      ? ` · ${entry.section}`
                                      : ""}
                                  </strong>

                                </div>


                                <div>

                                  <span>
                                    ROOM
                                  </span>

                                  <strong>
                                    {entry.resourceName ||
                                      entry.room ||
                                      "Not assigned"}
                                  </strong>

                                  {entry.resourceCode && (
                                    <small>
                                      {entry.resourceCode}
                                    </small>
                                  )}

                                </div>


                                <div>

                                  <span>
                                    SEMESTER
                                  </span>

                                  <strong>
                                    {entry.semester ||
                                      "—"}
                                  </strong>

                                </div>

                              </div>


                              <div className="facultyTeachingScheduleClassFooter">

                                <span>
                                  {entry.department ||
                                    "Department"}

                                  {entry.academicYear
                                    ? ` · ${entry.academicYear}`
                                    : ""}
                                </span>


                                <div className="facultyTeachingScheduleClassActions">

                                  <span className="facultyTeachingScheduleVerified">
                                    ✓ Published timetable
                                  </span>


                                  <button
                                    type="button"
                                    onClick={() => {

                                      setRequestEntry({
                                        id:
                                          entry.id,

                                        subjectCode:
                                          entry.subjectCode,

                                        subjectName:
                                          entry.subjectName,

                                        batchName:
                                          entry.batchName,

                                        section:
                                          entry.section,

                                        dayOfWeek:
                                          entry.dayOfWeek,

                                        periodOrder:
                                          entry.periodOrder,

                                        startTime:
                                          entry.startTime,

                                        endTime:
                                          entry.endTime,

                                        room:
                                          entry.room,

                                        resourceName:
                                          entry.resourceName,

                                        classType:
                                          entry.classType ||
                                          entry.subjectType,
                                      });

                                      setRequestMode(
                                        "create"
                                      );
                                    }}
                                  >
                                    Request change
                                  </button>

                                </div>

                              </div>

                            </div>

                          </article>
                        );
                      }
                    )}

                  </div>
                ) : (
                  <div className="facultyTeachingScheduleEmpty">

                    <div className="facultyTeachingScheduleEmptyIcon">
                      ◷
                    </div>

                    <h3>
                      No classes found
                    </h3>

                    <p>
                      {query
                        ? "No teaching sessions match your current search."
                        : `You have no published teaching sessions on ${selectedDay}.`}
                    </p>

                    {query && (
                      <button
                        type="button"
                        onClick={() =>
                          setQuery("")
                        }
                      >
                        Clear search
                      </button>
                    )}

                  </div>
                )}

              </>
            )}


            {viewMode ===
              "week" && (
              <div className="facultyTeachingScheduleWeekScroll">

                <div className="facultyTeachingScheduleWeek">

                  {WEEK_DAYS.map(
                    day => {

                      const rows =
                        entriesByDay
                          .get(day) ||
                        [];


                      return (
                        <section
                          className={
                            day ===
                            today
                              ? "facultyTeachingScheduleWeekDay is-today"
                              : "facultyTeachingScheduleWeekDay"
                          }
                          key={day}
                        >

                          <header>

                            <div>

                              <span>
                                {day ===
                                today
                                  ? "TODAY"
                                  : "DAY"}
                              </span>

                              <strong>
                                {day}
                              </strong>

                            </div>


                            <small>
                              {rows.length}
                            </small>

                          </header>


                          <div className="facultyTeachingScheduleWeekEntries">

                            {rows.length ? (
                              rows.map(
                                entry => (
                                  <article
                                    key={
                                      entry.id
                                    }
                                  >

                                    <time>
                                      {formatTime(
                                        entry.startTime
                                      )}
                                    </time>

                                    <strong>
                                      {entry.subjectCode ||
                                        entry.subjectName}
                                    </strong>

                                    <span>
                                      {entry.subjectName}
                                    </span>

                                    <small>
                                      {entry.batchName}
                                      {entry.section
                                        ? ` · ${entry.section}`
                                        : ""}
                                    </small>

                                    <small>
                                      {entry.resourceName ||
                                        entry.room ||
                                        "Room TBD"}
                                    </small>

                                  </article>
                                )
                              )
                            ) : (
                              <div className="facultyTeachingScheduleWeekEmpty">
                                No classes
                              </div>
                            )}

                          </div>

                        </section>
                      );
                    }
                  )}

                </div>

              </div>
            )}

          </section>


          <footer className="facultyTeachingScheduleSecurity">

            <div>
              <span aria-hidden="true">
                ◉
              </span>
            </div>


            <div>

              <strong>
                Private schedule
              </strong>

              <p>
                CampusConnect only requests timetable entries assigned to your authenticated Faculty account.
                There is no faculty selector and no other Faculty timetable is exposed from this screen.
              </p>

            </div>

          </footer>

        </>
      )}


      {requestMode && (
        <FacultyTimetableChangeCenter
          mode={
            requestMode
          }
          entry={
            requestEntry
          }
          onClose={() => {
            setRequestMode(
              null
            );

            setRequestEntry(
              null
            );
          }}
        />
      )}

    </section>
  );
}
