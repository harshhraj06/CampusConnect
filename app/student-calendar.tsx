"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {getSupabaseClient} from "../lib/supabase";
import "./student-calendar.css";
import {CalendarRsvp} from "./calendar-rsvp";

type CalendarRole =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";

type CalendarCategory =
  | "Holiday"
  | "Event"
  | "Exam"
  | "Academic"
  | "Workshop"
  | "Placement"
  | "Deadline"
  | "Meeting"
  | "Other";

type CalendarEntry = {
  id: string;
  source: "calendar" | "campus-event";
  title: string;
  description: string;
  category: CalendarCategory;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  venue: string;
  organizer: string;
  status: string;
  relatedUrl: string;
};

type CalendarRow = {
  id: string;
  title: string;
  description: string | null;
  category: CalendarCategory;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  venue: string | null;
  organizer: string | null;
  status: string;
  related_url: string | null;
};

type CampusEventRow = {
  id: string;
  title: string;
  short_description: string | null;
  description: string | null;
  category: string | null;
  venue: string | null;
  organizer: string | null;
  event_date: string;
  end_date: string | null;
  registration_url: string | null;
  status: string | null;
};

const categories: Array<
  "All" | CalendarCategory
> = [
  "All",
  "Holiday",
  "Event",
  "Exam",
  "Academic",
  "Workshop",
  "Placement",
  "Deadline",
  "Meeting",
  "Other",
];

const emptyForm = {
  title: "",
  description: "",
  category: "Academic" as CalendarCategory,
  startAt: "",
  endAt: "",
  allDay: false,
  venue: "",
  organizer: "",
  relatedUrl: "",
  status: "Published",
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function inputDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

function sameDay(
  first: Date,
  second: Date
) {
  return (
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate()
  );
}

function dateLabel(
  value: string,
  allDay = false
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(allDay
        ? {}
        : {
            hour: "numeric",
            minute: "2-digit",
          }),
    }
  ).format(date);
}

function shortTime(
  value: string,
  allDay: boolean
) {
  if (allDay) {
    return "All day";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

function categoryClass(
  category: CalendarCategory
) {
  return `calendarCategory${category.replace(
    /\s+/g,
    ""
  )}`;
}

function mapCampusCategory(
  raw: string | null
): CalendarCategory {
  const value =
    (raw || "").toLowerCase();

  if (value.includes("workshop")) {
    return "Workshop";
  }

  if (value.includes("placement")) {
    return "Placement";
  }

  if (value.includes("exam")) {
    return "Exam";
  }

  if (value.includes("academic")) {
    return "Academic";
  }

  return "Event";
}

export default function StudentCalendar({
  role,
}: {
  role: CalendarRole;
}) {
  const canManage =
    role === "Faculty" ||
    role === "Main Admin";

  const [entries, setEntries] =
    useState<CalendarEntry[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [status, setStatus] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState<
      "All" | CalendarCategory
    >("All");

  const [selectedDate, setSelectedDate] =
    useState<Date>(new Date());

  const [monthCursor, setMonthCursor] =
    useState<Date>(
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      )
    );

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [form, setForm] =
    useState(emptyForm);

  const loadCalendar = async () => {
    const client =
      getSupabaseClient();

    if (!client) {
      setStatus(
        "Calendar database is unavailable."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const [
        calendarResult,
        campusEventsResult,
      ] = await Promise.all([
        client
          .from(
            "campus_calendar_entries"
          )
          .select(
            "id,title,description,category,start_at,end_at,all_day,venue,organizer,status,related_url"
          )
          .order(
            "start_at",
            {ascending: true}
          ),

        client
          .from("campus_events")
          .select(
            "id,title,short_description,description,category,venue,organizer,event_date,end_date,registration_url,status"
          )
          .order(
            "event_date",
            {ascending: true}
          ),
      ]);

      if (calendarResult.error) {
        throw calendarResult.error;
      }

      if (campusEventsResult.error) {
        console.warn(
          "[Calendar] Campus events could not be loaded:",
          campusEventsResult.error
        );
      }

      const calendarItems =
        (
          calendarResult.data ||
          []
        ).map(row => {
          const item =
            row as CalendarRow;

          return {
            id: item.id,
            source:
              "calendar" as const,
            title: item.title,
            description:
              item.description || "",
            category:
              item.category,
            startAt:
              item.start_at,
            endAt:
              item.end_at,
            allDay:
              item.all_day,
            venue:
              item.venue || "",
            organizer:
              item.organizer || "",
            status:
              item.status,
            relatedUrl:
              item.related_url || "",
          };
        });

      const campusItems =
        (
          campusEventsResult.data ||
          []
        )
          .filter(row => {
            const event =
              row as CampusEventRow;

            return (
              !event.status ||
              event.status ===
                "Published" ||
              event.status ===
                "Upcoming" ||
              event.status ===
                "Open"
            );
          })
          .map(row => {
            const event =
              row as CampusEventRow;

            return {
              id: `campus-${event.id}`,
              source:
                "campus-event" as const,
              title: event.title,
              description:
                event.short_description ||
                event.description ||
                "",
              category:
                mapCampusCategory(
                  event.category
                ),
              startAt:
                event.event_date,
              endAt:
                event.end_date,
              allDay: false,
              venue:
                event.venue || "",
              organizer:
                event.organizer || "",
              status:
                event.status ||
                "Published",
              relatedUrl:
                event.registration_url ||
                "",
            };
          });

      setEntries([
        ...calendarItems,
        ...campusItems,
      ]);
    } catch (error) {
      console.error(
        "[Calendar] Load failed:",
        error
      );

      setStatus(
        "Unable to load the campus calendar."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCalendar();
  }, []);

  const filteredEntries =
    useMemo(() => {
      return entries
        .filter(item =>
          selectedCategory ===
          "All"
            ? true
            : item.category ===
              selectedCategory
        )
        .sort(
          (a, b) =>
            new Date(
              a.startAt
            ).getTime() -
            new Date(
              b.startAt
            ).getTime()
        );
    }, [
      entries,
      selectedCategory,
    ]);

  const upcoming =
    useMemo(() => {
      const start =
        new Date();

      start.setHours(
        0,
        0,
        0,
        0
      );

      return filteredEntries
        .filter(
          item =>
            new Date(
              item.startAt
            ).getTime() >=
            start.getTime()
        )
        .slice(0, 8);
    }, [filteredEntries]);

  const selectedDayEntries =
    useMemo(
      () =>
        filteredEntries.filter(
          item =>
            sameDay(
              new Date(
                item.startAt
              ),
              selectedDate
            )
        ),
      [
        filteredEntries,
        selectedDate,
      ]
    );

  const monthDays =
    useMemo(() => {
      const year =
        monthCursor.getFullYear();

      const month =
        monthCursor.getMonth();

      const first =
        new Date(
          year,
          month,
          1
        );

      const gridStart =
        new Date(first);

      gridStart.setDate(
        gridStart.getDate() -
          gridStart.getDay()
      );

      return Array.from(
        {length: 42},
        (_, index) => {
          const date =
            new Date(
              gridStart
            );

          date.setDate(
            gridStart.getDate() +
              index
          );

          return date;
        }
      );
    }, [monthCursor]);

  const openNew = () => {
    const now =
      new Date();

    now.setMinutes(
      Math.ceil(
        now.getMinutes() / 15
      ) * 15
    );

    setEditingId(null);
    setForm({
      ...emptyForm,
      startAt:
        inputDateTime(
          now.toISOString()
        ),
    });
    setShowForm(true);
    setStatus("");
  };

  const openEdit = (
    item: CalendarEntry
  ) => {
    if (
      item.source !==
      "calendar"
    ) {
      setStatus(
        "Campus Life events are managed from the Events section."
      );
      return;
    }

    setEditingId(item.id);
    setForm({
      title: item.title,
      description:
        item.description,
      category:
        item.category,
      startAt:
        inputDateTime(
          item.startAt
        ),
      endAt: item.endAt
        ? inputDateTime(
            item.endAt
          )
        : "",
      allDay:
        item.allDay,
      venue:
        item.venue,
      organizer:
        item.organizer,
      relatedUrl:
        item.relatedUrl,
      status:
        item.status ||
        "Published",
    });
    setShowForm(true);
    setStatus("");
  };

  const saveEntry = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    const client =
      getSupabaseClient();

    if (!client) {
      return;
    }

    if (
      !form.title.trim() ||
      !form.startAt
    ) {
      setStatus(
        "Title and start date are required."
      );
      return;
    }

    setSaving(true);
    setStatus("");

    try {
      const {
        data: authData,
        error: authError,
      } =
        await client.auth.getUser();

      if (
        authError ||
        !authData.user
      ) {
        throw new Error(
          "Authentication required."
        );
      }

      const payload = {
        title:
          form.title.trim(),
        description:
          form.description.trim(),
        category:
          form.category,
        start_at:
          new Date(
            form.startAt
          ).toISOString(),
        end_at:
          form.endAt
            ? new Date(
                form.endAt
              ).toISOString()
            : null,
        all_day:
          form.allDay,
        venue:
          form.venue.trim(),
        organizer:
          form.organizer.trim(),
        related_url:
          form.relatedUrl.trim() ||
          null,
        status:
          form.status,
        created_by:
          authData.user.id,
      };

      if (editingId) {
        const {
          error,
        } =
          await client
            .from(
              "campus_calendar_entries"
            )
            .update({
              ...payload,
              created_by:
                undefined,
            })
            .eq(
              "id",
              editingId
            );

        if (error) {
          throw error;
        }

        setStatus(
          "Calendar entry updated."
        );
      } else {
        const {
          error,
        } =
          await client
            .from(
              "campus_calendar_entries"
            )
            .insert(
              payload
            );

        if (error) {
          throw error;
        }

        setStatus(
          "Calendar entry published."
        );
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadCalendar();
    } catch (error) {
      console.error(
        "[Calendar] Save failed:",
        error
      );

      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to save calendar entry."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (
    item: CalendarEntry
  ) => {
    if (
      item.source !==
      "calendar"
    ) {
      return;
    }

    if (
      !window.confirm(
        `Delete "${item.title}" from the calendar?`
      )
    ) {
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) {
      return;
    }

    const {error} =
      await client
        .from(
          "campus_calendar_entries"
        )
        .delete()
        .eq(
          "id",
          item.id
        );

    if (error) {
      console.error(
        "[Calendar] Delete failed:",
        error
      );
      setStatus(
        "Unable to delete calendar entry."
      );
      return;
    }

    setStatus(
      "Calendar entry deleted."
    );

    await loadCalendar();
  };

  const previousMonth = () =>
    setMonthCursor(
      current =>
        new Date(
          current.getFullYear(),
          current.getMonth() -
            1,
          1
        )
    );

  const nextMonth = () =>
    setMonthCursor(
      current =>
        new Date(
          current.getFullYear(),
          current.getMonth() +
            1,
          1
        )
    );

  const today = () => {
    const now =
      new Date();

    setMonthCursor(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      )
    );

    setSelectedDate(now);
  };

  return (
    <div className="studentCalendarPage">
      <section className="studentCalendarHero">
        <div>
          <span className="studentCalendarEyebrow">
            CAMPUS CALENDAR
          </span>

          <h2>
            Everything important,
            in one calendar.
          </h2>

          <p>
            Holidays, campus events,
            exams, academic dates,
            workshops, placement
            activities and important
            deadlines.
          </p>
        </div>

        <div className="studentCalendarHeroActions">
          <button
            type="button"
            className="calendarSecondaryButton"
            onClick={today}
          >
            Today
          </button>

          {canManage && (
            <button
              type="button"
              className="calendarPrimaryButton"
              onClick={openNew}
            >
              + Add calendar item
            </button>
          )}
        </div>
      </section>

      {status && (
        <div className="calendarStatus">
          {status}
        </div>
      )}

      <section className="calendarSummaryGrid">
        <article>
          <small>
            UPCOMING
          </small>
          <strong>
            {upcoming.length}
          </strong>
          <p>
            Next scheduled items
          </p>
        </article>

        <article>
          <small>
            EVENTS
          </small>
          <strong>
            {
              entries.filter(
                item =>
                  item.category ===
                  "Event"
              ).length
            }
          </strong>
          <p>
            Campus activities
          </p>
        </article>

        <article>
          <small>
            ACADEMIC
          </small>
          <strong>
            {
              entries.filter(
                item =>
                  item.category ===
                    "Academic" ||
                  item.category ===
                    "Exam"
              ).length
            }
          </strong>
          <p>
            Academic dates
          </p>
        </article>

        <article>
          <small>
            HOLIDAYS
          </small>
          <strong>
            {
              entries.filter(
                item =>
                  item.category ===
                  "Holiday"
              ).length
            }
          </strong>
          <p>
            Published holidays
          </p>
        </article>
      </section>

      <section className="calendarFilterBar">
        {categories.map(
          category => (
            <button
              type="button"
              key={category}
              className={
                selectedCategory ===
                category
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSelectedCategory(
                  category
                )
              }
            >
              {category}
            </button>
          )
        )}
      </section>

      <div className="calendarWorkspace">
        <section className="calendarMonthCard">
          <header>
            <div>
              <span>
                MONTH VIEW
              </span>

              <h3>
                {new Intl.DateTimeFormat(
                  "en-IN",
                  {
                    month: "long",
                    year: "numeric",
                  }
                ).format(
                  monthCursor
                )}
              </h3>
            </div>

            <div className="calendarMonthNavigation">
              <button
                type="button"
                onClick={
                  previousMonth
                }
                aria-label="Previous month"
              >
                ←
              </button>

              <button
                type="button"
                onClick={
                  nextMonth
                }
                aria-label="Next month"
              >
                →
              </button>
            </div>
          </header>

          <div className="calendarWeekHeaders">
            {[
              "SUN",
              "MON",
              "TUE",
              "WED",
              "THU",
              "FRI",
              "SAT",
            ].map(day => (
              <span key={day}>
                {day}
              </span>
            ))}
          </div>

          <div className="calendarMonthGrid">
            {monthDays.map(
              day => {
                const dayEntries =
                  filteredEntries.filter(
                    item =>
                      sameDay(
                        new Date(
                          item.startAt
                        ),
                        day
                      )
                  );

                const outside =
                  day.getMonth() !==
                  monthCursor.getMonth();

                const isToday =
                  sameDay(
                    day,
                    new Date()
                  );

                const selected =
                  sameDay(
                    day,
                    selectedDate
                  );

                return (
                  <button
                    type="button"
                    key={
                      day.toISOString()
                    }
                    className={[
                      "calendarDay",
                      outside
                        ? "outside"
                        : "",
                      isToday
                        ? "today"
                        : "",
                      selected
                        ? "selected"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      setSelectedDate(
                        day
                      )
                    }
                  >
                    <strong>
                      {day.getDate()}
                    </strong>

                    <div className="calendarDayItems">
                      {dayEntries
                        .slice(0, 3)
                        .map(item => (
                          <span
                            key={
                              item.id
                            }
                            className={
                              categoryClass(
                                item.category
                              )
                            }
                          >
                            {
                              item.title
                            }
                          </span>
                        ))}

                      {dayEntries.length >
                        3 && (
                        <small>
                          +
                          {dayEntries.length -
                            3}{" "}
                          more
                        </small>
                      )}
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </section>

        <aside className="calendarSideColumn">
          <section className="calendarSelectedDay">
            <header>
              <span>
                SELECTED DAY
              </span>

              <h3>
                {new Intl.DateTimeFormat(
                  "en-IN",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }
                ).format(
                  selectedDate
                )}
              </h3>
            </header>

            {loading ? (
              <p className="calendarEmpty">
                Loading calendar…
              </p>
            ) : selectedDayEntries.length ===
              0 ? (
              <p className="calendarEmpty">
                Nothing scheduled for
                this day.
              </p>
            ) : (
              <div className="calendarSelectedList">
                {selectedDayEntries.map(
                  item => (
                    <article
                      key={
                        item.id
                      }
                    >
                      <div>
                        <span
                          className={
                            categoryClass(
                              item.category
                            )
                          }
                        >
                          {
                            item.category
                          }
                        </span>

                        <small>
                          {shortTime(
                            item.startAt,
                            item.allDay
                          )}
                        </small>
                      </div>

                      <h4>
                        {
                          item.title
                        }
                      </h4>

                      {item.venue && (
                        <p>
                          ◇{" "}
                          {
                            item.venue
                          }
                        </p>
                      )}

                      {item.description && (
                        <p>
                          {
                            item.description
                          }
                        </p>
                      )}

                      {item.relatedUrl && (
                        <a
                          href={
                            item.relatedUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open related
                          link ↗
                        </a>
                      )}

                      <CalendarRsvp
                        itemId={item.id}
                        source={item.source}
                      />

                      {canManage &&
                        item.source ===
                          "calendar" && (
                          <div className="calendarManageActions">
                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  item
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void deleteEntry(
                                  item
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
                        )}
                    </article>
                  )
                )}
              </div>
            )}
          </section>

          <section className="calendarUpcomingCard">
            <header>
              <span>
                UP NEXT
              </span>

              <h3>
                Upcoming
              </h3>
            </header>

            {upcoming.length ===
            0 ? (
              <p className="calendarEmpty">
                No upcoming items.
              </p>
            ) : (
              <div className="calendarUpcomingList">
                {upcoming.map(
                  item => (
                    <button
                      type="button"
                      key={
                        item.id
                      }
                      onClick={() => {
                        const date =
                          new Date(
                            item.startAt
                          );

                        setSelectedDate(
                          date
                        );

                        setMonthCursor(
                          new Date(
                            date.getFullYear(),
                            date.getMonth(),
                            1
                          )
                        );
                      }}
                    >
                      <i
                        className={
                          categoryClass(
                            item.category
                          )
                        }
                      />

                      <span>
                        <b>
                          {
                            item.title
                          }
                        </b>

                        <small>
                          {dateLabel(
                            item.startAt,
                            item.allDay
                          )}
                        </small>
                      </span>

                      <strong>
                        →
                      </strong>
                    </button>
                  )
                )}
              </div>
            )}
          </section>
        </aside>
      </div>

      {showForm &&
        canManage && (
          <div
            className="calendarModalScrim"
            role="presentation"
            onMouseDown={event => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setShowForm(
                  false
                );
              }
            }}
          >
            <form
              className="calendarEditor"
              onSubmit={
                saveEntry
              }
            >
              <header>
                <div>
                  <span>
                    CALENDAR MANAGEMENT
                  </span>

                  <h2>
                    {editingId
                      ? "Edit calendar item"
                      : "Add calendar item"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowForm(
                      false
                    )
                  }
                >
                  ×
                </button>
              </header>

              <label>
                Title
                <input
                  value={
                    form.title
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        title:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  required
                  maxLength={180}
                />
              </label>

              <label>
                Description
                <textarea
                  value={
                    form.description
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        description:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  rows={4}
                />
              </label>

              <div className="calendarEditorTwo">
                <label>
                  Category
                  <select
                    value={
                      form.category
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          category:
                            event
                              .target
                              .value as CalendarCategory,
                        })
                      )
                    }
                  >
                    {categories
                      .filter(
                        item =>
                          item !==
                          "All"
                      )
                      .map(
                        item => (
                          <option
                            key={
                              item
                            }
                          >
                            {
                              item
                            }
                          </option>
                        )
                      )}
                  </select>
                </label>

                <label>
                  Status
                  <select
                    value={
                      form.status
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          status:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  >
                    <option>
                      Published
                    </option>
                    <option>
                      Draft
                    </option>
                    <option>
                      Cancelled
                    </option>
                  </select>
                </label>
              </div>

              <div className="calendarEditorTwo">
                <label>
                  Starts
                  <input
                    type="datetime-local"
                    value={
                      form.startAt
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          startAt:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    required
                  />
                </label>

                <label>
                  Ends
                  <input
                    type="datetime-local"
                    value={
                      form.endAt
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          endAt:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </label>
              </div>

              <label className="calendarAllDay">
                <input
                  type="checkbox"
                  checked={
                    form.allDay
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        allDay:
                          event
                            .target
                            .checked,
                      })
                    )
                  }
                />
                All-day item
              </label>

              <div className="calendarEditorTwo">
                <label>
                  Venue
                  <input
                    value={
                      form.venue
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          venue:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </label>

                <label>
                  Organizer
                  <input
                    value={
                      form.organizer
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          organizer:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </label>
              </div>

              <label>
                Related link
                <input
                  type="url"
                  value={
                    form.relatedUrl
                  }
                  placeholder="https://..."
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        relatedUrl:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </label>

              <footer>
                <button
                  type="button"
                  onClick={() =>
                    setShowForm(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save changes"
                    : "Publish item"}
                </button>
              </footer>
            </form>
          </div>
        )}
    </div>
  );
}
