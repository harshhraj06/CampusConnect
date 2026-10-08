"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSupabaseClient,
} from "../lib/supabase";

import {
  RoleActionCenter,
} from "./role-action-center";

import {
  StaffOperationsBoard,
} from "./staff-operations-board";

import "./faculty-dashboard-premium.css";


type Counts = {
  primary: number;
  secondary: number;
  tertiary: number;
  fourth: number;
};


type Props = {
  department: string;
  counts: Counts;
  loading: boolean;
  go: (view: any) => void;
  onOpenCalculator?: () => void;
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


type MetricIcon =
  | "coursework"
  | "attendance"
  | "resources"
  | "announcements";


const cleanTime = (
  value: string
) =>
  String(value || "")
    .slice(
      0,
      5
    );


const minutesFromTime = (
  value: string
) => {
  const [
    hours,
    minutes,
  ] =
    cleanTime(value)
      .split(":")
      .map(Number);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return null;
  }

  return (
    hours * 60 +
    minutes
  );
};


const displayTime = (
  value: string
) => {
  const total =
    minutesFromTime(
      value
    );

  if (
    total === null
  ) {
    return "—";
  }

  const hours =
    Math.floor(
      total / 60
    );

  const minutes =
    total % 60;

  const suffix =
    hours >= 12
      ? "PM"
      : "AM";

  const displayHours =
    hours % 12 ||
    12;

  return `${displayHours}:${String(
    minutes
  ).padStart(
    2,
    "0"
  )} ${suffix}`;
};


function MetricIconGraphic({
  type,
}: {
  type: MetricIcon;
}) {

  if (
    type ===
    "attendance"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="8"
        />

        <path
          d="M8 12.1l2.6 2.5 5.5-6"
        />
      </svg>
    );
  }


  if (
    type ===
    "resources"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M5.5 5.5c2.7-.7 4.8-.3 6.5 1.2v11c-1.7-1.5-3.8-1.9-6.5-1.2z"
        />

        <path
          d="M18.5 5.5c-2.7-.7-4.8-.3-6.5 1.2v11c1.7-1.5 3.8-1.9 6.5-1.2z"
        />
      </svg>
    );
  }


  if (
    type ===
    "announcements"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M7 9.5h7l3-2.5v10l-3-2.5H7z"
        />

        <path
          d="M9 14.5 10 19h3"
        />
      </svg>
    );
  }


  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M7 4.5h7l3 3v12H7z"
      />

      <path
        d="M14 4.5v3h3"
      />

      <path
        d="M10 11h4M10 14h4"
      />
    </svg>
  );
}


function FacultyMetric({
  label,
  value,
  detail,
  loading,
  target,
  icon,
  go,
}: {
  label: string;
  value: number;
  detail: string;
  loading: boolean;
  target: string;
  icon: MetricIcon;
  go: (view: any) => void;
}) {

  const [
    displayed,
    setDisplayed,
  ] =
    useState(0);


  useEffect(
    () => {

      if (
        loading
      ) {
        return;
      }


      if (
        window
          .matchMedia(
            "(prefers-reduced-motion: reduce)"
          )
          .matches
      ) {
        setDisplayed(
          value
        );

        return;
      }


      let frame =
        0;

      const started =
        performance.now();


      const tick =
        (
          now: number
        ) => {

          const progress =
            Math.min(
              1,
              (
                now -
                started
              ) /
                420
            );


          setDisplayed(
            Math.round(
              value *
                (
                  1 -
                  (
                    1 -
                    progress
                  ) ** 3
                )
            )
          );


          if (
            progress < 1
          ) {
            frame =
              requestAnimationFrame(
                tick
              );
          }
        };


      frame =
        requestAnimationFrame(
          tick
        );


      return () =>
        cancelAnimationFrame(
          frame
        );

    },
    [
      value,
      loading,
    ]
  );


  return (
    <button
      type="button"
      className="fdp-metric"
      onClick={() =>
        go(
          target
        )
      }
      aria-label={`Open ${label}`}
    >

      <span className="fdp-metric-icon">
        <MetricIconGraphic
          type={
            icon
          }
        />
      </span>


      <span className="fdp-metric-copy">

        <span className="fdp-metric-label">
          {label}
        </span>


        {loading ? (
          <span
            className="fdp-metric-skeleton"
            role="status"
            aria-label={`Loading ${label.toLowerCase()}`}
          />
        ) : (
          <strong
            aria-label={`${value} ${label.toLowerCase()} records`}
          >
            <span
              aria-hidden="true"
            >
              {displayed.toLocaleString(
                "en-IN"
              )}
            </span>
          </strong>
        )}


        <small>
          {detail}
        </small>

      </span>


      <span
        className="fdp-metric-arrow"
        aria-hidden="true"
      >
        →
      </span>

    </button>
  );
}


export function FacultyDashboardPremium({
  department,
  counts,
  loading,
  go,
  onOpenCalculator,
}: Props) {

  const [
    scheduleLoading,
    setScheduleLoading,
  ] =
    useState(true);


  const [
    scheduleError,
    setScheduleError,
  ] =
    useState("");


  const [
    todayClasses,
    setTodayClasses,
  ] =
    useState<
      FacultyTodayClass[]
    >([]);


  const [
    now,
    setNow,
  ] =
    useState<
      Date | null
    >(null);


  useEffect(
    () => {

      setNow(
        new Date()
      );


      const interval =
        window.setInterval(
          () =>
            setNow(
              new Date()
            ),
          60_000
        );


      return () =>
        window.clearInterval(
          interval
        );

    },
    []
  );


  useEffect(
    () => {

      let active =
        true;


      const loadToday =
        async () => {

          const client =
            getSupabaseClient();


          if (
            !client
          ) {

            if (
              active
            ) {
              setScheduleError(
                "CampusConnect schedule connection is unavailable."
              );

              setScheduleLoading(
                false
              );
            }

            return;
          }


          const day =
            new Intl.DateTimeFormat(
              "en-US",
              {
                weekday:
                  "long",
              }
            ).format(
              new Date()
            );


          try {

            const {
              data,
              error,
            } =
              await client.rpc(
                "get_my_faculty_today_classes",
                {
                  p_day_of_week:
                    day,
                }
              );


            if (
              error
            ) {
              throw error;
            }


            if (
              active
            ) {

              setTodayClasses(
                (
                  data ||
                  []
                ) as FacultyTodayClass[]
              );

              setScheduleError(
                ""
              );
            }

          } catch (
            error
          ) {

            console.error(
              "[Faculty dashboard schedule]",
              error
            );


            if (
              active
            ) {
              setScheduleError(
                "Today’s published schedule could not be loaded."
              );
            }

          } finally {

            if (
              active
            ) {
              setScheduleLoading(
                false
              );
            }
          }
        };


      void loadToday();


      return () => {
        active =
          false;
      };

    },
    []
  );


  const schedule =
    useMemo(
      () => {

        if (
          !now
        ) {
          return {
            focus:
              null as
                FacultyTodayClass |
                null,

            status:
              "Loading",

            detail:
              "Preparing today’s schedule",
          };
        }


        const currentMinutes =
          now.getHours() *
            60 +
          now.getMinutes();


        const rows =
          [
            ...todayClasses,
          ].sort(
            (
              a,
              b
            ) =>
              (
                minutesFromTime(
                  a.start_time
                ) ??
                Number.MAX_SAFE_INTEGER
              ) -
              (
                minutesFromTime(
                  b.start_time
                ) ??
                Number.MAX_SAFE_INTEGER
              )
          );


        const live =
          rows.find(
            row => {

              const start =
                minutesFromTime(
                  row.start_time
                );

              const end =
                minutesFromTime(
                  row.end_time
                );


              return (
                start !==
                  null &&
                end !==
                  null &&
                currentMinutes >=
                  start &&
                currentMinutes <
                  end
              );
            }
          );


        if (
          live
        ) {
          return {
            focus:
              live,

            status:
              "In progress",

            detail:
              "Current teaching period",
          };
        }


        const next =
          rows.find(
            row => {

              const start =
                minutesFromTime(
                  row.start_time
                );


              return (
                start !==
                  null &&
                start >
                  currentMinutes
              );
            }
          );


        if (
          next
        ) {

          const start =
            minutesFromTime(
              next.start_time
            );


          const wait =
            start ===
            null
              ? null
              : Math.max(
                  0,
                  start -
                    currentMinutes
                );


          return {
            focus:
              next,

            status:
              "Up next",

            detail:
              wait ===
                null
                ? "Upcoming class"
                : wait < 60
                  ? `Starts in ${wait} min`
                  : `Starts in ${Math.floor(
                      wait /
                        60
                    )}h ${wait % 60}m`,
          };
        }


        return {
          focus:
            null,

          status:
            rows.length
              ? "Teaching complete"
              : "No classes today",

          detail:
            rows.length
              ? "No remaining published classes"
              : "No published teaching periods",
        };

      },
      [
        todayClasses,
        now,
      ]
    );


  const metrics = [
    {
      label:
        "Assignments",

      value:
        counts.primary,

      detail:
        "Coursework records",

      target:
        "Assignments",

      icon:
        "coursework" as const,
    },

    {
      label:
        "Attendance",

      value:
        counts.secondary,

      detail:
        "Recorded sessions",

      target:
        "Attendance",

      icon:
        "attendance" as const,
    },

    {
      label:
        "Resources",

      value:
        counts.tertiary,

      detail:
        "Learning assets",

      target:
        "Learning",

      icon:
        "resources" as const,
    },

    {
      label:
        "Announcements",

      value:
        counts.fourth,

      detail:
        "Campus notices",

      target:
        "Announcements",

      icon:
        "announcements" as const,
    },
  ];


  const primaryTarget =
    schedule.focus
      ? "Today's Classes"
      : "My Teaching Schedule";


  const primaryLabel =
    schedule.focus
      ? schedule.status ===
          "In progress"
        ? "Open current class"
        : "Open next class"
      : "Open teaching schedule";


  return (
    <section
      className="facultyDashboardPremium"
      aria-label="Faculty dashboard"
    >

      <section
        className="fdp-hero"
        aria-labelledby="fdp-heading"
      >

        <div
          className="fdp-hero-pattern"
          aria-hidden="true"
        />


        <div className="fdp-hero-copy">

          <span className="fdp-eyebrow">
            <span
              aria-hidden="true"
            />
            TODAY&apos;S TEACHING
          </span>


          <h2
            id="fdp-heading"
          >
            {scheduleLoading
              ? "Preparing your teaching day."
              : schedule.focus
                ? schedule.status ===
                    "In progress"
                  ? "Your current class is in focus."
                  : "Your next class is ready."
                : "Your teaching day is clear."}
          </h2>


          <p>
            <strong>
              {department ||
                "Faculty"}
            </strong>

            {" · "}

            Start with the next teaching
            commitment, then move through
            priorities and operational work
            without repeating the same actions
            across the dashboard.
          </p>


          <div className="fdp-hero-actions">

            <button
              type="button"
              className="fdp-button fdp-button-primary"
              onClick={() =>
                go(
                  primaryTarget
                )
              }
            >
              {primaryLabel}

              <span
                aria-hidden="true"
              >
                →
              </span>
            </button>


            <button
              type="button"
              className="fdp-button fdp-button-quiet"
              onClick={() =>
                go(
                  "Faculty Workspace"
                )
              }
            >
              Faculty workspace
            </button>

          </div>

        </div>


        <aside
          className="fdp-next"
          aria-label="Next teaching commitment"
        >

          <header>

            <span>
              NEXT COMMITMENT
            </span>


            {!scheduleLoading &&
              !scheduleError && (
                <small>
                  {schedule.status}
                </small>
              )}

          </header>


          {scheduleLoading ? (

            <div
              className="fdp-next-loading"
              role="status"
              aria-label="Loading today's teaching schedule"
            >
              <span />
              <span />
              <span />
            </div>

          ) : scheduleError ? (

            <div className="fdp-next-empty">

              <strong>
                Schedule unavailable
              </strong>


              <p>
                {scheduleError}
              </p>


              <button
                type="button"
                onClick={() =>
                  go(
                    "My Teaching Schedule"
                  )
                }
              >
                Open schedule

                <span
                  aria-hidden="true"
                >
                  →
                </span>
              </button>

            </div>

          ) : schedule.focus ? (

            <div className="fdp-next-class">

              <span className="fdp-next-time">

                {displayTime(
                  schedule.focus
                    .start_time
                )}


                <i
                  aria-hidden="true"
                />


                {displayTime(
                  schedule.focus
                    .end_time
                )}

              </span>


              <h3>
                {schedule.focus
                  .subject_name}
              </h3>


              <p>
                {[
                  schedule.focus
                    .subject_code,

                  schedule.focus
                    .batch_name,

                  schedule.focus
                    .section
                    ? `Section ${
                        schedule.focus
                          .section
                      }`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>


              <div className="fdp-next-details">

                <span>

                  <small>
                    ROOM
                  </small>

                  <strong>
                    {schedule.focus
                      .room ||
                      "Not assigned"}
                  </strong>

                </span>


                <span>

                  <small>
                    PERIOD
                  </small>

                  <strong>
                    {schedule.focus
                      .period_order ||
                      "—"}
                  </strong>

                </span>

              </div>


              <footer>

                <span>
                  {schedule.detail}
                </span>


                <button
                  type="button"
                  onClick={() =>
                    go(
                      "Today's Classes"
                    )
                  }
                >
                  Open class

                  <span
                    aria-hidden="true"
                  >
                    →
                  </span>
                </button>

              </footer>

            </div>

          ) : (

            <div className="fdp-next-empty">

              <strong>
                {schedule.status}
              </strong>


              <p>
                {schedule.detail}
              </p>


              <button
                type="button"
                onClick={() =>
                  go(
                    "My Teaching Schedule"
                  )
                }
              >
                Review week

                <span
                  aria-hidden="true"
                >
                  →
                </span>
              </button>

            </div>

          )}

        </aside>

      </section>


      <section
        className="fdp-overview"
        aria-labelledby="fdp-overview-title"
      >

        <div className="fdp-section-heading">

          <div>

            <span className="fdp-kicker">
              WORK OVERVIEW
            </span>


            <h2
              id="fdp-overview-title"
            >
              Live faculty records
            </h2>

          </div>


          <p>
            Authenticated CampusConnect data
          </p>

        </div>


        <div className="fdp-metrics">

          {metrics.map(
            metric => (
              <FacultyMetric
                key={
                  metric.label
                }
                {...metric}
                loading={
                  loading
                }
                go={
                  go
                }
              />
            )
          )}

        </div>

      </section>


      <RoleActionCenter
        role="Faculty"
        go={
          go
        }
      />


      <StaffOperationsBoard
        role="Faculty"
        go={
          go
        }
      />


      {onOpenCalculator && (

        <div className="fdp-utility">

          <div>

            <span>
              ACADEMIC TOOL
            </span>

            <strong>
              Need a quick grade calculation?
            </strong>

          </div>


          <button
            className="fdp-button fdp-button-secondary"
            type="button"
            onClick={
              onOpenCalculator
            }
          >
            Open SGPA / CGPA calculator

            <span
              aria-hidden="true"
            >
              →
            </span>
          </button>

        </div>

      )}

    </section>
  );
}
