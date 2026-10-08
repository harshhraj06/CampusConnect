"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSupabaseClient,
} from "../lib/supabase";


type TimetableRow = {
  id?: string;
  subject_name?: string;
  subject_code?: string;
  faculty_name?: string;
  day_of_week?: string;
  period_order?: number;
  start_time?: string;
  end_time?: string;
  room?: string;
  class_type?: string;
};


type SubstitutionRow = {
  timetable_entry_id?: string;
  substitute_faculty_name?: string;
};


type ClassItem = {
  key: string;
  subject: string;
  code: string;
  faculty: string;
  room: string;
  classType: string;
  period: number;
  start: Date;
  end: Date;
  dayLabel: string;
  live: boolean;
};


const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];


function dateKey(
  value: Date
) {
  return [
    value.getFullYear(),
    String(
      value.getMonth() + 1
    ).padStart(2, "0"),
    String(
      value.getDate()
    ).padStart(2, "0"),
  ].join("-");
}


function readTime(
  value?: string
) {
  const match =
    String(value || "")
      .match(
        /^(\d{1,2}):(\d{2})/
      );

  if (!match) {
    return null;
  }

  return {
    hour:
      Number(match[1]),

    minute:
      Number(match[2]),
  };
}


function displayTime(
  value: Date
) {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      hour:
        "numeric",

      minute:
        "2-digit",
    }
  ).format(value);
}


function dayLabel(
  offset: number,
  date: Date
) {
  if (offset === 0) {
    return "Today";
  }

  if (offset === 1) {
    return "Tomorrow";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      weekday:
        "short",

      day:
        "numeric",

      month:
        "short",
    }
  ).format(date);
}


export function StudentUpcomingClasses({
  onOpenTimetable,
}: {
  onOpenTimetable: () => void;
}) {

  const [
    timetable,
    setTimetable,
  ] =
    useState<TimetableRow[]>([]);


  const [
    substitutions,
    setSubstitutions,
  ] =
    useState<SubstitutionRow[]>([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    now,
    setNow,
  ] =
    useState(
      () => new Date()
    );


  useEffect(
    () => {

      const timer =
        window.setInterval(
          () =>
            setNow(
              new Date()
            ),
          60_000
        );

      return () =>
        window.clearInterval(
          timer
        );

    },
    []
  );


  useEffect(
    () => {

      let active =
        true;


      const load =
        async () => {

          const client =
            getSupabaseClient();

          if (!client) {
            setError(
              "Timetable connection unavailable."
            );

            setLoading(false);

            return;
          }


          try {

            const today =
              new Date();


            const [
              timetableResult,
              substitutionResult,
            ] =
              await Promise.all([
                client.rpc(
                  "get_my_timetable"
                ),

                client.rpc(
                  "get_my_timetable_substitutions",
                  {
                    target_date:
                      dateKey(today),
                  }
                ),
              ]);


            if (!active) {
              return;
            }


            if (
              timetableResult.error
            ) {
              throw timetableResult.error;
            }


            setTimetable(
              Array.isArray(
                timetableResult.data
              )
                ? timetableResult.data
                : []
            );


            setSubstitutions(
              !substitutionResult.error &&
              Array.isArray(
                substitutionResult.data
              )
                ? substitutionResult.data
                : []
            );

          } catch (caught) {

            if (!active) {
              return;
            }


            console.error(
              "Upcoming classes:",
              caught
            );


            setError(
              "Unable to load your upcoming classes."
            );

          } finally {

            if (active) {
              setLoading(false);
            }

          }
        };


      void load();


      return () => {
        active = false;
      };

    },
    []
  );


  const classes =
    useMemo(
      () => {

        const result:
          ClassItem[] =
            [];


        const substitutionMap =
          new Map<
            string,
            string
          >();


        substitutions.forEach(
          item => {

            const id =
              String(
                item.timetable_entry_id ||
                  ""
              );


            const name =
              String(
                item.substitute_faculty_name ||
                  ""
              ).trim();


            if (
              id &&
              name
            ) {
              substitutionMap.set(
                id,
                name
              );
            }

          }
        );


        for (
          let offset = 0;
          offset <= 7;
          offset += 1
        ) {

          const date =
            new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() +
                offset
            );


          const weekday =
            DAYS[
              date.getDay()
            ];


          timetable.forEach(
            row => {

              if (
                String(
                  row.day_of_week ||
                    ""
                )
                  .trim()
                  .toLowerCase() !==
                weekday.toLowerCase()
              ) {
                return;
              }


              const startValue =
                readTime(
                  row.start_time
                );


              const endValue =
                readTime(
                  row.end_time
                );


              if (
                !startValue ||
                !endValue
              ) {
                return;
              }


              const start =
                new Date(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate(),
                  startValue.hour,
                  startValue.minute
                );


              const end =
                new Date(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate(),
                  endValue.hour,
                  endValue.minute
                );


              if (
                end.getTime() <=
                now.getTime()
              ) {
                return;
              }


              const live =
                start.getTime() <=
                  now.getTime() &&
                now.getTime() <
                  end.getTime();


              const id =
                String(
                  row.id ||
                    ""
                );


              result.push({
                key:
                  [
                    id ||
                      row.subject_code ||
                      row.subject_name ||
                      "class",

                    dateKey(date),

                    row.start_time,
                  ].join("-"),

                subject:
                  String(
                    row.subject_name ||
                      row.subject_code ||
                      "Scheduled class"
                  ),

                code:
                  String(
                    row.subject_code ||
                      ""
                  ),

                faculty:
                  offset === 0
                    ? (
                        substitutionMap.get(
                          id
                        ) ||
                        String(
                          row.faculty_name ||
                            "Assigned faculty"
                        )
                      )
                    : String(
                        row.faculty_name ||
                          "Assigned faculty"
                      ),

                room:
                  String(
                    row.room ||
                      "Room not set"
                  ),

                classType:
                  String(
                    row.class_type ||
                      "Class"
                  ),

                period:
                  Number(
                    row.period_order ||
                      0
                  ),

                start,
                end,

                dayLabel:
                  live
                    ? "Now"
                    : dayLabel(
                        offset,
                        date
                      ),

                live,
              });

            }
          );

        }


        result.sort(
          (
            first,
            second
          ) =>
            first.start.getTime() -
            second.start.getTime()
        );


        const seen =
          new Set<string>();


        return result
          .filter(
            item => {

              const key =
                [
                  item.subject,
                  item.start.getTime(),
                  item.room,
                ].join("|");


              if (
                seen.has(key)
              ) {
                return false;
              }


              seen.add(key);

              return true;
            }
          )
          .slice(
            0,
            3
          );

      },
      [
        timetable,
        substitutions,
        now,
      ]
    );


  return (
    <section className="studentNextClasses">

      <header className="studentNextClassesHeader">

        <div>

          <span>
            ACADEMIC DAY
          </span>

          <h2>
            Next upcoming classes
          </h2>

          <p>
            What is coming next from
            your published timetable.
          </p>

        </div>


        <button
          type="button"
          onClick={
            onOpenTimetable
          }
        >
          Timetable

          <span>
            →
          </span>
        </button>

      </header>


      {loading ? (

        <div className="studentNextClassesLoading">

          <i />

          <i />

          <i />

        </div>

      ) : error ? (

        <div className="studentNextClassesEmpty">

          <strong>
            Timetable unavailable
          </strong>

          <p>
            {error}
          </p>

        </div>

      ) : classes.length ? (

        <div className="studentNextClassesGrid">

          {classes.map(
            (
              item,
              index
            ) => (

              <article
                key={
                  item.key
                }
                className={
                  item.live
                    ? "live"
                    : ""
                }
              >

                <header>

                  <span>
                    {
                      item.dayLabel
                    }
                  </span>

                  {item.period >
                    0 && (
                    <small>
                      P{item.period}
                    </small>
                  )}

                </header>


                <div className="studentNextClassTitle">

                  <i>
                    {String(
                      index + 1
                    ).padStart(
                      2,
                      "0"
                    )}
                  </i>

                  <div>

                    <h3>
                      {
                        item.subject
                      }
                    </h3>

                    <p>
                      {item.code
                        ? `${item.code} · `
                        : ""}
                      {
                        item.classType
                      }
                    </p>

                  </div>

                </div>


                <footer>

                  <span>
                    <small>
                      TIME
                    </small>

                    <strong>
                      {displayTime(
                        item.start
                      )}
                      {" – "}
                      {displayTime(
                        item.end
                      )}
                    </strong>
                  </span>


                  <span>
                    <small>
                      ROOM
                    </small>

                    <strong>
                      {
                        item.room
                      }
                    </strong>
                  </span>


                  <span>
                    <small>
                      FACULTY
                    </small>

                    <strong>
                      {
                        item.faculty
                      }
                    </strong>
                  </span>

                </footer>

              </article>

            )
          )}

        </div>

      ) : (

        <div className="studentNextClassesEmpty">

          <strong>
            No upcoming classes
          </strong>

          <p>
            Nothing else is scheduled
            in the next seven days.
          </p>

        </div>

      )}

    </section>
  );
}
