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


export type FacultyTimetableChangeEntry = {
  id: string;

  subjectCode: string;
  subjectName: string;

  batchName: string;
  section: string;

  dayOfWeek: string;
  periodOrder: number;

  startTime: string;
  endTime: string;

  room: string;
  resourceName: string;

  classType: string;
};


type ChangeOption = {
  dayOfWeek: string;

  periodSlotId: string;

  periodOrder: number;
  periodLabel: string;

  startTime: string;
  endTime: string;
};


type RequestAlternative = {
  id?: string;

  dayOfWeek: string;

  periodSlotId: string;

  periodOrder: number;
  periodLabel: string;

  startTime: string;
  endTime: string;
};


type RequestHistory = {
  id: string;

  timetableEntryId: string | null;

  facultyName: string;

  batchName: string;
  section: string;
  department: string;

  subjectName: string;
  subjectCode: string;

  originalDayOfWeek: string;
  originalPeriodOrder: number;
  originalStartTime: string;
  originalEndTime: string;
  originalRoom: string;
  originalClassType: string;

  reason: string;

  status:
    | "Pending"
    | "Reviewing"
    | "Approved"
    | "Rejected"
    | "Rebuilt"
    | "Cancelled";

  coordinatorNote: string;

  resolvedAt: string | null;
  createdAt: string;

  alternatives:
    RequestAlternative[];
};


type FacultyTimetableChangeCenterProps = {
  mode:
    | "create"
    | "history";

  entry:
    FacultyTimetableChangeEntry |
    null;

  onClose:
    () => void;

  onChanged?:
    () => void;
};


const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];


const clean = (
  value: unknown
) =>
  String(
    value ??
    ""
  ).trim();


const num = (
  value: unknown
) => {

  const next =
    Number(value);

  return Number.isFinite(next)
    ? next
    : 0;
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
    value.split(":");


  const hour =
    Number(hourRaw);

  const minute =
    Number(minuteRaw);


  const suffix =
    hour >= 12
      ? "PM"
      : "AM";


  return `${
    hour % 12 ||
    12
  }:${String(minute).padStart(2, "0")} ${suffix}`;
};


const formatDateTime = (
  value: string
) => {

  if (!value) {
    return "";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return date.toLocaleString(
    [],
    {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};


const normalizeOptions = (
  input: unknown
): ChangeOption[] => {

  if (
    !Array.isArray(input)
  ) {
    return [];
  }


  return input
    .map(
      item => {

        const row =
          (
            item &&
            typeof item ===
              "object"
          )
            ? item as Record<
                string,
                unknown
              >
            : {};


        return {
          dayOfWeek:
            clean(
              row.dayOfWeek
            ),

          periodSlotId:
            clean(
              row.periodSlotId
            ),

          periodOrder:
            num(
              row.periodOrder
            ),

          periodLabel:
            clean(
              row.periodLabel
            ),

          startTime:
            clean(
              row.startTime
            ),

          endTime:
            clean(
              row.endTime
            ),
        };
      }
    )
    .filter(
      item =>
        Boolean(
          item.dayOfWeek &&
          item.periodSlotId
        )
    );
};


const normalizeHistory = (
  input: unknown
): RequestHistory[] => {

  if (
    !Array.isArray(input)
  ) {
    return [];
  }


  return input.map(
    item => {

      const row =
        (
          item &&
          typeof item ===
            "object"
        )
          ? item as Record<
              string,
              unknown
            >
          : {};


      return {

        id:
          clean(row.id),

        timetableEntryId:
          clean(
            row.timetableEntryId
          ) ||
          null,

        facultyName:
          clean(
            row.facultyName
          ),

        batchName:
          clean(
            row.batchName
          ),

        section:
          clean(
            row.section
          ),

        department:
          clean(
            row.department
          ),

        subjectName:
          clean(
            row.subjectName
          ),

        subjectCode:
          clean(
            row.subjectCode
          ),

        originalDayOfWeek:
          clean(
            row.originalDayOfWeek
          ),

        originalPeriodOrder:
          num(
            row.originalPeriodOrder
          ),

        originalStartTime:
          clean(
            row.originalStartTime
          ),

        originalEndTime:
          clean(
            row.originalEndTime
          ),

        originalRoom:
          clean(
            row.originalRoom
          ),

        originalClassType:
          clean(
            row.originalClassType
          ),

        reason:
          clean(
            row.reason
          ),

        status:
          (
            clean(
              row.status
            ) ||
            "Pending"
          ) as RequestHistory["status"],

        coordinatorNote:
          clean(
            row.coordinatorNote
          ),

        resolvedAt:
          clean(
            row.resolvedAt
          ) ||
          null,

        createdAt:
          clean(
            row.createdAt
          ),

        alternatives:
          normalizeOptions(
            row.alternatives
          ),
      };
    }
  );
};


const statusLabel = (
  status:
    RequestHistory["status"]
) => {

  switch (
    status
  ) {

    case "Pending":
      return "Waiting for coordinator";

    case "Reviewing":
      return "Coordinator reviewing";

    case "Approved":
      return "Approved";

    case "Rebuilt":
      return "Applied to timetable";

    case "Rejected":
      return "Not approved";

    case "Cancelled":
      return "Cancelled";

    default:
      return status;
  }
};


export default function FacultyTimetableChangeCenter({
  mode,
  entry,
  onClose,
  onChanged,
}: FacultyTimetableChangeCenterProps) {

  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    success,
    setSuccess,
  ] =
    useState("");


  const [
    reason,
    setReason,
  ] =
    useState("");


  const [
    options,
    setOptions,
  ] =
    useState<
      ChangeOption[]
    >([]);


  const [
    selected,
    setSelected,
  ] =
    useState<
      string[]
    >([]);


  const [
    history,
    setHistory,
  ] =
    useState<
      RequestHistory[]
    >([]);


  const loadHistory =
    useCallback(
      async () => {

        const client =
          getSupabaseClient();


        if (!client) {
          throw new Error(
            "CampusConnect is not connected to Supabase."
          );
        }


        const {
          data,
          error:
            historyError,
        } =
          await client.rpc(
            "get_my_timetable_change_requests"
          );


        if (
          historyError
        ) {
          throw historyError;
        }


        setHistory(
          normalizeHistory(
            data
          )
        );
      },
      []
    );


  const load =
    useCallback(
      async () => {

        setLoading(true);
        setError("");


        try {

          await loadHistory();


          if (
            mode ===
              "create"
          ) {

            if (!entry) {
              throw new Error(
                "Select a class before requesting a timetable change."
              );
            }


            const client =
              getSupabaseClient();


            if (!client) {
              throw new Error(
                "CampusConnect is not connected to Supabase."
              );
            }


            const {
              data,
              error:
                optionError,
            } =
              await client.rpc(
                "get_my_timetable_change_options",
                {
                  p_timetable_entry_id:
                    entry.id,
                }
              );


            if (
              optionError
            ) {
              throw optionError;
            }


            setOptions(
              normalizeOptions(
                data
              )
            );
          }

        } catch (
          requestError
        ) {

          console.error(
            "[Timetable change center]",
            requestError
          );


          setError(
            requestError instanceof
              Error
              ? requestError.message
              : "Unable to load timetable change requests."
          );

        } finally {
          setLoading(false);
        }
      },
      [
        entry,
        loadHistory,
        mode,
      ]
    );


  useEffect(
    () => {
      void load();
    },
    [
      load,
    ]
  );


  useEffect(
    () => {

      const onKeyDown =
        (
          event:
            KeyboardEvent
        ) => {

          if (
            event.key ===
            "Escape"
          ) {
            onClose();
          }
        };


      window.addEventListener(
        "keydown",
        onKeyDown
      );


      return () => {
        window.removeEventListener(
          "keydown",
          onKeyDown
        );
      };
    },
    [
      onClose,
    ]
  );


  const groupedOptions =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            ChangeOption[]
          >();


        WEEK_DAYS.forEach(
          day => {
            map.set(
              day,
              []
            );
          }
        );


        options.forEach(
          option => {

            map
              .get(
                option.dayOfWeek
              )
              ?.push(
                option
              );
          }
        );


        return map;
      },
      [
        options,
      ]
    );


  const selectedOptions =
    options.filter(
      option =>
        selected.includes(
          option.periodSlotId +
          "::" +
          option.dayOfWeek
        )
    );


  const openRequestForEntry =
    entry
      ? history.find(
          item =>
            item.timetableEntryId ===
              entry.id &&
            (
              item.status ===
                "Pending" ||
              item.status ===
                "Reviewing"
            )
        ) ||
        null
      : null;


  const toggle =
    (
      option:
        ChangeOption
    ) => {

      const key =
        option.periodSlotId +
        "::" +
        option.dayOfWeek;


      setSelected(
        current => {

          if (
            current.includes(
              key
            )
          ) {
            return current.filter(
              item =>
                item !==
                key
            );
          }


          if (
            current.length >=
            12
          ) {
            return current;
          }


          return [
            ...current,
            key,
          ];
        }
      );
    };


  const submit =
    async () => {

      if (!entry) {
        return;
      }


      const cleanReason =
        reason.trim();


      if (
        cleanReason.length <
        5
      ) {
        setError(
          "Explain the clash or reason for changing this class."
        );

        return;
      }


      if (
        !selectedOptions.length
      ) {
        setError(
          "Select at least one time when you are available."
        );

        return;
      }


      const client =
        getSupabaseClient();


      if (!client) {
        setError(
          "CampusConnect is not connected to Supabase."
        );

        return;
      }


      setSaving(true);
      setError("");
      setSuccess("");


      try {

        const {
          error:
            createError,
        } =
          await client.rpc(
            "create_timetable_change_request",
            {
              p_timetable_entry_id:
                entry.id,

              p_reason:
                cleanReason,

              p_alternatives:
                selectedOptions.map(
                  option => ({
                    dayOfWeek:
                      option.dayOfWeek,

                    periodSlotId:
                      option.periodSlotId,
                  })
                ),
            }
          );


        if (
          createError
        ) {
          throw createError;
        }


        setSuccess(
          "Request sent to your Timetable Coordinator."
        );

        setReason("");
        setSelected([]);

        await loadHistory();

        onChanged?.();

      } catch (
        submitError
      ) {

        console.error(
          "[Submit timetable change request]",
          submitError
        );


        setError(
          submitError instanceof
            Error
              ? submitError.message
              : "Unable to send your timetable change request."
        );

      } finally {
        setSaving(false);
      }
    };


  const cancelRequest =
    async (
      requestId: string
    ) => {

      const client =
        getSupabaseClient();


      if (!client) {
        return;
      }


      setSaving(true);
      setError("");


      try {

        const {
          error:
            cancelError,
        } =
          await client.rpc(
            "cancel_my_timetable_change_request",
            {
              p_request_id:
                requestId,
            }
          );


        if (
          cancelError
        ) {
          throw cancelError;
        }


        await loadHistory();

        onChanged?.();

      } catch (
        cancelError
      ) {

        setError(
          cancelError instanceof
            Error
              ? cancelError.message
              : "Unable to cancel the request."
        );

      } finally {
        setSaving(false);
      }
    };


  return (
    <div
      className="facultyTimetableChangeOverlay"
      role="presentation"
      onMouseDown={
        event => {

          if (
            event.target ===
            event.currentTarget
          ) {
            onClose();
          }
        }
      }
    >

      <aside
        className="facultyTimetableChangeCenter"
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "create"
            ? "Request timetable change"
            : "My timetable requests"
        }
      >

        <header className="facultyTimetableChangeHeader">

          <div>

            <span>
              TIMETABLE · FACULTY REQUEST
            </span>

            <h2>
              {mode === "create"
                ? "Request a schedule change"
                : "My change requests"}
            </h2>

            <p>
              {mode === "create"
                ? "Tell the coordinator what is conflicting and when you are available."
                : "Track requests submitted to your Timetable Coordinator."}
            </p>

          </div>


          <button
            type="button"
            className="facultyTimetableChangeClose"
            aria-label="Close timetable request panel"
            onClick={
              onClose
            }
          >
            ×
          </button>

        </header>


        {loading ? (
          <div className="facultyTimetableChangeLoading">

            <span />

            <span />

            <span />

          </div>
        ) : (
          <div className="facultyTimetableChangeContent">

            {error && (
              <div
                className="facultyTimetableChangeMessage error"
                role="alert"
              >
                {error}
              </div>
            )}


            {success && (
              <div
                className="facultyTimetableChangeMessage success"
                role="status"
              >
                {success}
              </div>
            )}


            {mode ===
              "create" &&
              entry && (
              <>

                <section className="facultyTimetableChangeCurrent">

                  <div className="facultyTimetableChangeCurrentTop">

                    <div>

                      <span>
                        CURRENT CLASS
                      </span>

                      <h3>
                        {entry.subjectCode &&
                          `${entry.subjectCode} · `}

                        {entry.subjectName}
                      </h3>

                    </div>


                    <span className="facultyTimetableChangePeriod">
                      P{entry.periodOrder}
                    </span>

                  </div>


                  <div className="facultyTimetableChangeCurrentGrid">

                    <div>
                      <span>
                        DAY & TIME
                      </span>

                      <strong>
                        {entry.dayOfWeek}
                      </strong>

                      <small>
                        {formatTime(
                          entry.startTime
                        )}
                        {" – "}
                        {formatTime(
                          entry.endTime
                        )}
                      </small>
                    </div>


                    <div>
                      <span>
                        BATCH
                      </span>

                      <strong>
                        {entry.batchName}
                      </strong>

                      <small>
                        {entry.section
                          ? `Section ${entry.section}`
                          : "No section"}
                      </small>
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

                      <small>
                        {entry.classType ||
                          "Class"}
                      </small>
                    </div>

                  </div>

                </section>


                {openRequestForEntry ? (
                  <section className="facultyTimetableChangeAlreadyOpen">

                    <span>
                      REQUEST ALREADY OPEN
                    </span>

                    <h3>
                      {statusLabel(
                        openRequestForEntry.status
                      )}
                    </h3>

                    <p>
                      You already submitted a request for this class.
                      Wait for the coordinator or cancel the pending request before creating another one.
                    </p>


                    {openRequestForEntry.status ===
                      "Pending" && (
                      <button
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          void cancelRequest(
                            openRequestForEntry.id
                          )
                        }
                      >
                        Cancel request
                      </button>
                    )}

                  </section>
                ) : (
                  <>

                    <section className="facultyTimetableChangeReason">

                      <label htmlFor="faculty-timetable-change-reason">
                        What is the conflict?
                      </label>

                      <textarea
                        id="faculty-timetable-change-reason"
                        value={
                          reason
                        }
                        maxLength={
                          1000
                        }
                        placeholder="Example: Department meeting overlaps this class. I am available during the selected alternatives below."
                        onChange={
                          event =>
                            setReason(
                              event.target.value
                            )
                        }
                      />

                      <div>
                        <span>
                          Explain the actual reason so the coordinator can make a safe decision.
                        </span>

                        <small>
                          {reason.length}/1000
                        </small>
                      </div>

                    </section>


                    <section className="facultyTimetableChangeOptions">

                      <div className="facultyTimetableChangeSectionHeading">

                        <div>

                          <span>
                            YOUR AVAILABILITY
                          </span>

                          <h3>
                            Select alternative times
                          </h3>

                          <p>
                            Times where you already teach another published class are automatically removed.
                          </p>

                        </div>


                        <strong>
                          {selected.length}/12 selected
                        </strong>

                      </div>


                      {options.length ? (
                        <div className="facultyTimetableChangeDays">

                          {WEEK_DAYS.map(
                            day => {

                              const rows =
                                groupedOptions.get(
                                  day
                                ) ||
                                [];


                              if (
                                !rows.length
                              ) {
                                return null;
                              }


                              return (
                                <section
                                  key={
                                    day
                                  }
                                >

                                  <header>

                                    <strong>
                                      {day}
                                    </strong>

                                    <span>
                                      {rows.length} available
                                    </span>

                                  </header>


                                  <div className="facultyTimetableChangeSlots">

                                    {rows.map(
                                      option => {

                                        const key =
                                          option.periodSlotId +
                                          "::" +
                                          option.dayOfWeek;

                                        const active =
                                          selected.includes(
                                            key
                                          );


                                        return (
                                          <button
                                            type="button"
                                            key={
                                              key
                                            }
                                            className={
                                              active
                                                ? "selected"
                                                : ""
                                            }
                                            aria-pressed={
                                              active
                                            }
                                            onClick={() =>
                                              toggle(
                                                option
                                              )
                                            }
                                          >

                                            <span>
                                              {option.periodLabel ||
                                                `P${option.periodOrder}`}
                                            </span>

                                            <strong>
                                              {formatTime(
                                                option.startTime
                                              )}
                                            </strong>

                                            <small>
                                              {formatTime(
                                                option.endTime
                                              )}
                                            </small>


                                            <i>
                                              {active
                                                ? "✓"
                                                : "+"}
                                            </i>

                                          </button>
                                        );
                                      }
                                    )}

                                  </div>

                                </section>
                              );
                            }
                          )}

                        </div>
                      ) : (
                        <div className="facultyTimetableChangeNoOptions">

                          <strong>
                            No conflict-free alternatives found
                          </strong>

                          <p>
                            Your currently published timetable occupies all other teaching slots for this scheduling profile.
                          </p>

                        </div>
                      )}

                    </section>


                    <footer className="facultyTimetableChangeSubmit">

                      <div>

                        <strong>
                          Coordinator review required
                        </strong>

                        <span>
                          Submitting this request never changes the published timetable automatically.
                        </span>

                      </div>


                      <button
                        type="button"
                        disabled={
                          saving ||
                          reason.trim().length <
                            5 ||
                          !selected.length
                        }
                        onClick={
                          () =>
                            void submit()
                        }
                      >
                        {saving
                          ? "Sending…"
                          : "Send request"}
                      </button>

                    </footer>

                  </>
                )}

              </>
            )}


            {mode ===
              "history" && (
              <section className="facultyTimetableRequestHistory">

                {history.length ? (
                  history.map(
                    request => (
                      <article
                        key={
                          request.id
                        }
                      >

                        <header>

                          <div>

                            <span>
                              {request.subjectCode ||
                                "SUBJECT"}
                            </span>

                            <h3>
                              {request.subjectName}
                            </h3>

                          </div>


                          <span
                            className={
                              "facultyTimetableRequestStatus status-" +
                              request.status
                                .toLowerCase()
                            }
                          >
                            {request.status}
                          </span>

                        </header>


                        <div className="facultyTimetableRequestMeta">

                          <div>
                            <span>
                              ORIGINAL
                            </span>

                            <strong>
                              {request.originalDayOfWeek}
                            </strong>

                            <small>
                              {formatTime(
                                request.originalStartTime
                              )}
                              {" – "}
                              {formatTime(
                                request.originalEndTime
                              )}
                            </small>
                          </div>


                          <div>
                            <span>
                              BATCH
                            </span>

                            <strong>
                              {request.batchName}
                            </strong>

                            <small>
                              {request.section
                                ? `Section ${request.section}`
                                : "No section"}
                            </small>
                          </div>


                          <div>
                            <span>
                              STATUS
                            </span>

                            <strong>
                              {statusLabel(
                                request.status
                              )}
                            </strong>

                            <small>
                              {formatDateTime(
                                request.createdAt
                              )}
                            </small>
                          </div>

                        </div>


                        <p className="facultyTimetableRequestReason">
                          {request.reason}
                        </p>


                        {request.alternatives.length >
                          0 && (
                          <div className="facultyTimetableRequestAlternatives">

                            <span>
                              PROPOSED TIMES
                            </span>


                            <div>

                              {request.alternatives.map(
                                (
                                  option,
                                  index
                                ) => (
                                  <span
                                    key={
                                      option.id ||
                                      `${request.id}-${index}`
                                    }
                                  >
                                    {option.dayOfWeek}
                                    {" · "}
                                    {formatTime(
                                      option.startTime
                                    )}
                                  </span>
                                )
                              )}

                            </div>

                          </div>
                        )}


                        {request.coordinatorNote && (
                          <div className="facultyTimetableCoordinatorNote">

                            <span>
                              COORDINATOR NOTE
                            </span>

                            <p>
                              {request.coordinatorNote}
                            </p>

                          </div>
                        )}


                        {request.status ===
                          "Pending" && (
                          <button
                            type="button"
                            className="facultyTimetableCancelRequest"
                            disabled={
                              saving
                            }
                            onClick={() =>
                              void cancelRequest(
                                request.id
                              )
                            }
                          >
                            Cancel request
                          </button>
                        )}

                      </article>
                    )
                  )
                ) : (
                  <div className="facultyTimetableChangeHistoryEmpty">

                    <div>
                      ✓
                    </div>

                    <h3>
                      No timetable requests
                    </h3>

                    <p>
                      Your submitted clash and change requests will appear here.
                    </p>

                  </div>
                )}

              </section>
            )}

          </div>
        )}

      </aside>

    </div>
  );
}
