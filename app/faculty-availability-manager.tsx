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


type Role =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";


type Profile = {
  name: string;
  email: string;
  department: string;
  year: string;
  role: Role;
};


type TeachingAllocation = {
  allocation_id: string;
  batch_id: string;
  batch_name: string;
  section: string;
  department: string;
  academic_year: string;
  batch_subject_id: string;
  subject_name: string;
  subject_code: string;
  subject_type: string;
  allocation_type: string;
  subgroup: string;
  weekly_hours: number;
  status: string;
};


type BatchProfile = {
  batch_id: string;
  profile_id: string;
};


type SchedulingProfile = {
  id: string;
  name: string;
  department: string;
  academic_year: string;
  semester: string;
  is_active: boolean;
};


type AvailabilityPeriod = {
  day_of_week: string;
  display_order: number;
  period_slot_id: string;
  period_order: number;
  period_label: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  availability_note: string;
};


type TimetableEntry = {
  id: string;
  batch_id: string;
  batch_subject_id: string;
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


type Unavailability = {
  id: string;
  faculty_id: string;
  profile_id: string;
  unavailable_date: string;
  period_slot_id: string | null;
  reason: string;
  status: "Active" | "Cancelled";
};


type CellState =
  | "busy"
  | "available"
  | "free";


const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];


const cleanTime = (
  value: string
) =>
  String(value || "")
    .slice(0, 5);


const todayIso = () => {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};


const friendlyDate = (
  value: string
) => {
  if (!value) {
    return "";
  }

  const parsed =
    new Date(`${value}T00:00:00`);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return value;
  }

  return parsed.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
};


export default function FacultyAvailabilityManager({
  profile,
}: {
  profile: Profile;
}) {
  const [loading, setLoading] =
    useState(true);

  const [savingKey, setSavingKey] =
    useState("");

  const [exceptionSaving, setExceptionSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [userId, setUserId] =
    useState("");

  const [allocations, setAllocations] =
    useState<TeachingAllocation[]>([]);

  const [profiles, setProfiles] =
    useState<SchedulingProfile[]>([]);

  const [batchProfiles, setBatchProfiles] =
    useState<BatchProfile[]>([]);

  const [selectedProfileId, setSelectedProfileId] =
    useState("");

  const [periods, setPeriods] =
    useState<AvailabilityPeriod[]>([]);

  const [timetable, setTimetable] =
    useState<TimetableEntry[]>([]);

  const [exceptions, setExceptions] =
    useState<Unavailability[]>([]);

  const [exceptionDate, setExceptionDate] =
    useState(todayIso());

  const [
    exceptionPeriodSlotId,
    setExceptionPeriodSlotId,
  ] = useState("");

  const [exceptionReason, setExceptionReason] =
    useState("");


  const assignedBatchIds =
    useMemo(
      () =>
        Array.from(
          new Set(
            allocations
              .filter(
                item =>
                  item.status ===
                  "Active"
              )
              .map(
                item =>
                  item.batch_id
              )
              .filter(Boolean)
          )
        ),
      [allocations]
    );


  const availableProfileIds =
    useMemo(
      () =>
        Array.from(
          new Set(
            batchProfiles
              .filter(
                item =>
                  assignedBatchIds
                    .includes(
                      item.batch_id
                    )
              )
              .map(
                item =>
                  item.profile_id
              )
              .filter(Boolean)
          )
        ),
      [
        assignedBatchIds,
        batchProfiles,
      ]
    );


  const usableProfiles =
    useMemo(
      () =>
        profiles.filter(
          item =>
            item.is_active &&
            availableProfileIds
              .includes(item.id)
        ),
      [
        profiles,
        availableProfileIds,
      ]
    );


  const selectedProfile =
    useMemo(
      () =>
        usableProfiles.find(
          item =>
            item.id ===
            selectedProfileId
        ) || null,
      [
        usableProfiles,
        selectedProfileId,
      ]
    );


  const days =
    useMemo(
      () =>
        Array.from(
          new Set(
            periods.map(
              item =>
                item.day_of_week
            )
          )
        ).sort(
          (a, b) =>
            DAYS.indexOf(a) -
            DAYS.indexOf(b)
        ),
      [periods]
    );


  const slots =
    useMemo(() => {
      const byId =
        new Map<
          string,
          AvailabilityPeriod
        >();

      periods.forEach(
        item => {
          if (
            !byId.has(
              item.period_slot_id
            )
          ) {
            byId.set(
              item.period_slot_id,
              item
            );
          }
        }
      );

      return Array.from(
        byId.values()
      ).sort(
        (a, b) =>
          a.period_order -
          b.period_order
      );
    }, [periods]);


  const myTimetable =
    useMemo(
      () =>
        timetable.filter(
          item =>
            item.faculty_id ===
            userId
        ),
      [
        timetable,
        userId,
      ]
    );


  const getPeriod = (
    day: string,
    slotId: string
  ) =>
    periods.find(
      item =>
        item.day_of_week === day &&
        item.period_slot_id ===
          slotId
    );


  const getBusyEntry = (
    period: AvailabilityPeriod
  ) =>
    myTimetable.find(
      entry =>
        entry.day_of_week ===
          period.day_of_week &&
        entry.start_time <
          period.end_time &&
        entry.end_time >
          period.start_time
    );


  const getCellState = (
    period: AvailabilityPeriod
  ): CellState => {
    if (getBusyEntry(period)) {
      return "busy";
    }

    return period.is_available
      ? "available"
      : "free";
  };


  const loadAvailability =
    useCallback(
      async (
        profileId: string
      ) => {
        const client =
          getSupabaseClient();

        if (!client) {
          return;
        }

        const {
          data,
          error: rpcError,
        } = await client.rpc(
          "get_my_faculty_availability",
          {
            p_profile_id:
              profileId,
          }
        );

        if (rpcError) {
          throw rpcError;
        }

        setPeriods(
          Array.isArray(data)
            ? data
            : []
        );
      },
      []
    );


  const loadExceptions =
    useCallback(
      async (
        facultyId: string,
        profileId: string
      ) => {
        const client =
          getSupabaseClient();

        if (!client) {
          return;
        }

        const {
          data,
          error: queryError,
        } = await client
          .from(
            "faculty_unavailability"
          )
          .select(
            "id,faculty_id,profile_id,unavailable_date,period_slot_id,reason,status"
          )
          .eq(
            "faculty_id",
            facultyId
          )
          .eq(
            "profile_id",
            profileId
          )
          .eq(
            "status",
            "Active"
          )
          .gte(
            "unavailable_date",
            todayIso()
          )
          .order(
            "unavailable_date",
            {
              ascending: true,
            }
          );

        if (queryError) {
          throw queryError;
        }

        setExceptions(
          (data || []) as
            Unavailability[]
        );
      },
      []
    );


  const loadTimetable =
    useCallback(
      async (
        batchIds: string[]
      ) => {
        const client =
          getSupabaseClient();

        if (
          !client ||
          !batchIds.length
        ) {
          setTimetable([]);
          return;
        }

        const {
          data,
          error: queryError,
        } = await client.rpc(
          "get_current_batch_timetable_entries",
          {
            p_batch_ids:
              batchIds,
          }
        );

        if (queryError) {
          throw queryError;
        }

        setTimetable(
          (data || []) as
            TimetableEntry[]
        );
      },
      []
    );


  useEffect(() => {
    if (
      profile.role !==
      "Faculty"
    ) {
      setLoading(false);
      return;
    }

    let active = true;

    const load =
      async () => {
        const client =
          getSupabaseClient();

        if (!client) {
          if (active) {
            setError(
              "Campus database is unavailable."
            );
            setLoading(false);
          }

          return;
        }

        setLoading(true);
        setError("");

        try {
          const {
            data: auth,
            error: authError,
          } =
            await client.auth
              .getUser();

          if (
            authError ||
            !auth.user
          ) {
            throw new Error(
              authError?.message ||
                "Faculty session is unavailable."
            );
          }

          const facultyId =
            auth.user.id;

          const [
            allocationResult,
            profileResult,
            batchProfileResult,
          ] =
            await Promise.all([
              client.rpc(
                "get_my_teaching_allocations"
              ),

              client
                .from(
                  "timetable_scheduling_profiles"
                )
                .select(
                  "id,name,department,academic_year,semester,is_active"
                )
                .eq(
                  "is_active",
                  true
                ),

              client
                .from(
                  "timetable_batch_profiles"
                )
                .select(
                  "batch_id,profile_id"
                ),
            ]);

          if (!active) {
            return;
          }

          if (
            allocationResult.error
          ) {
            throw allocationResult.error;
          }

          if (
            profileResult.error
          ) {
            throw profileResult.error;
          }

          if (
            batchProfileResult.error
          ) {
            throw batchProfileResult.error;
          }

          const nextAllocations =
            Array.isArray(
              allocationResult.data
            )
              ? (
                  allocationResult.data as
                    TeachingAllocation[]
                )
              : [];

          const nextProfiles =
            (
              profileResult.data ||
              []
            ) as SchedulingProfile[];

          const nextBatchProfiles =
            (
              batchProfileResult.data ||
              []
            ) as BatchProfile[];

          const nextBatchIds =
            Array.from(
              new Set(
                nextAllocations
                  .filter(
                    item =>
                      item.status ===
                      "Active"
                  )
                  .map(
                    item =>
                      item.batch_id
                  )
                  .filter(Boolean)
              )
            );

          const nextProfileIds =
            Array.from(
              new Set(
                nextBatchProfiles
                  .filter(
                    item =>
                      nextBatchIds
                        .includes(
                          item.batch_id
                        )
                  )
                  .map(
                    item =>
                      item.profile_id
                  )
              )
            );

          const nextUsableProfiles =
            nextProfiles.filter(
              item =>
                item.is_active &&
                nextProfileIds
                  .includes(item.id)
            );

          setUserId(
            facultyId
          );

          setAllocations(
            nextAllocations
          );

          setProfiles(
            nextProfiles
          );

          setBatchProfiles(
            nextBatchProfiles
          );

          setSelectedProfileId(
            current =>
              nextUsableProfiles.some(
                item =>
                  item.id ===
                  current
              )
                ? current
                : (
                    nextUsableProfiles[0]
                      ?.id || ""
                  )
          );

          await loadTimetable(
            nextBatchIds
          );
        } catch (loadError) {
          if (!active) {
            return;
          }

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load faculty availability."
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
  }, [
    profile.role,
    loadTimetable,
  ]);


  useEffect(() => {
    if (
      !selectedProfileId ||
      !userId
    ) {
      setPeriods([]);
      setExceptions([]);
      return;
    }

    let active = true;

    const loadProfileData =
      async () => {
        try {
          setError("");

          await Promise.all([
            loadAvailability(
              selectedProfileId
            ),
            loadExceptions(
              userId,
              selectedProfileId
            ),
          ]);
        } catch (loadError) {
          if (!active) {
            return;
          }

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load availability."
          );
        }
      };

    void loadProfileData();

    return () => {
      active = false;
    };
  }, [
    selectedProfileId,
    userId,
    loadAvailability,
    loadExceptions,
  ]);


  const toggleAvailability =
    async (
      period: AvailabilityPeriod
    ) => {
      const client =
        getSupabaseClient();

      if (
        !client ||
        !userId ||
        !selectedProfileId
      ) {
        return;
      }

      if (
        getBusyEntry(period)
      ) {
        return;
      }

      const key =
        `${period.day_of_week}:${period.period_slot_id}`;

      setSavingKey(key);
      setError("");
      setStatus("");

      try {
        const nextValue =
          !period.is_available;

        const {
          error: upsertError,
        } = await client
          .from(
            "faculty_recurring_availability"
          )
          .upsert(
            {
              faculty_id:
                userId,

              profile_id:
                selectedProfileId,

              period_slot_id:
                period.period_slot_id,

              day_of_week:
                period.day_of_week,

              is_available:
                nextValue,

              note:
                period.availability_note ||
                "",
            },
            {
              onConflict:
                "faculty_id,profile_id,day_of_week,period_slot_id",
            }
          );

        if (upsertError) {
          throw upsertError;
        }

        setPeriods(
          current =>
            current.map(
              item =>
                item.day_of_week ===
                  period.day_of_week &&
                item.period_slot_id ===
                  period.period_slot_id
                  ? {
                      ...item,
                      is_available:
                        nextValue,
                    }
                  : item
            )
        );

        setStatus(
          nextValue
            ? `${period.day_of_week} ${period.period_label || `Period ${period.period_order}`} is available for substitution.`
            : `${period.day_of_week} ${period.period_label || `Period ${period.period_order}`} is no longer available for substitution.`
        );
      } catch (saveError) {
        setError(
          saveError instanceof
            Error
            ? saveError.message
            : "Unable to update availability."
        );
      } finally {
        setSavingKey("");
      }
    };


  const createException =
    async () => {
      const client =
        getSupabaseClient();

      if (
        !client ||
        !userId ||
        !selectedProfileId ||
        !exceptionDate
      ) {
        return;
      }

      if (
        exceptionDate <
        todayIso()
      ) {
        setError(
          "Choose today or a future date."
        );
        return;
      }

      setExceptionSaving(true);
      setError("");
      setStatus("");

      try {
        const payload = {
          faculty_id:
            userId,

          profile_id:
            selectedProfileId,

          unavailable_date:
            exceptionDate,

          period_slot_id:
            exceptionPeriodSlotId ||
            null,

          reason:
            exceptionReason
              .trim(),

          status:
            "Active",
        };

        const {
          error: insertError,
        } = await client
          .from(
            "faculty_unavailability"
          )
          .insert(payload);

        if (insertError) {
          throw insertError;
        }

        await loadExceptions(
          userId,
          selectedProfileId
        );

        setExceptionPeriodSlotId(
          ""
        );

        setExceptionReason(
          ""
        );

        setStatus(
          "Date-specific unavailability saved."
        );
      } catch (saveError) {
        setError(
          saveError instanceof
            Error
            ? saveError.message
            : "Unable to save unavailability."
        );
      } finally {
        setExceptionSaving(false);
      }
    };


  const cancelException =
    async (
      exception: Unavailability
    ) => {
      const client =
        getSupabaseClient();

      if (
        !client ||
        !userId ||
        !selectedProfileId
      ) {
        return;
      }

      setExceptionSaving(true);
      setError("");
      setStatus("");

      try {
        const {
          error: updateError,
        } = await client
          .from(
            "faculty_unavailability"
          )
          .update({
            status:
              "Cancelled",
          })
          .eq(
            "id",
            exception.id
          )
          .eq(
            "faculty_id",
            userId
          );

        if (updateError) {
          throw updateError;
        }

        setExceptions(
          current =>
            current.filter(
              item =>
                item.id !==
                exception.id
            )
        );

        setStatus(
          "Unavailability exception cancelled."
        );
      } catch (saveError) {
        setError(
          saveError instanceof
            Error
            ? saveError.message
            : "Unable to cancel unavailability."
        );
      } finally {
        setExceptionSaving(false);
      }
    };


  const metrics =
    useMemo(() => {
      let busy = 0;
      let available = 0;
      let free = 0;

      periods.forEach(
        period => {
          const state =
            getCellState(
              period
            );

          if (
            state === "busy"
          ) {
            busy += 1;
          } else if (
            state ===
            "available"
          ) {
            available += 1;
          } else {
            free += 1;
          }
        }
      );

      return {
        busy,
        available,
        free,
      };
    }, [
      periods,
      myTimetable,
    ]);


  if (
    profile.role !==
    "Faculty"
  ) {
    return null;
  }


  return (
    <section
      className="facultyAvailabilityShell"
      id="faculty-availability"
    >
      <header className="facultyAvailabilityHero">
        <div>
          <span>
            ECE · FACULTY OPERATIONS
          </span>

          <h2>
            My Availability
          </h2>

          <p>
            CampusConnect detects your scheduled
            classes automatically. Mark only the
            free periods when you are willing to
            take a substitute class.
          </p>
        </div>

        <strong>
          {profile.department ||
            "ECE"}
        </strong>
      </header>


      {loading ? (
        <div className="facultyAvailabilityMessage">
          <span>LOADING</span>

          <h3>
            Preparing your weekly availability
          </h3>

          <p>
            Reading your teaching allocations,
            scheduling profile and published
            timetable.
          </p>
        </div>
      ) : error &&
        !usableProfiles.length ? (
        <div className="facultyAvailabilityMessage error">
          <span>UNAVAILABLE</span>
          <h3>Availability could not be loaded</h3>
          <p>{error}</p>
        </div>
      ) : !allocations.length ? (
        <div className="facultyAvailabilityMessage">
          <span>NO ALLOCATION</span>

          <h3>
            No active teaching allocation
          </h3>

          <p>
            Your batch and subject allocation
            must be configured before an
            availability schedule can be
            created.
          </p>
        </div>
      ) : !usableProfiles.length ? (
        <div className="facultyAvailabilityMessage">
          <span>SETUP REQUIRED</span>

          <h3>
            Scheduling profile not assigned
          </h3>

          <p>
            Your teaching batch does not yet
            have an active timetable scheduling
            profile. Main Admin must complete
            Timetable Automation configuration.
          </p>
        </div>
      ) : (
        <>
          <section className="facultyAvailabilityToolbar">
            <div>
              <label
                htmlFor="faculty-availability-profile"
              >
                Scheduling profile
              </label>

              <select
                id="faculty-availability-profile"
                value={
                  selectedProfileId
                }
                onChange={
                  event =>
                    setSelectedProfileId(
                      event.target
                        .value
                    )
                }
              >
                {usableProfiles.map(
                  item => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                      {item.semester
                        ? ` · Sem ${item.semester}`
                        : ""}
                      {item.academic_year
                        ? ` · ${item.academic_year}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="facultyAvailabilityLegend">
              <span className="busy">
                <i />
                Scheduled
              </span>

              <span className="available">
                <i />
                Available
              </span>

              <span className="free">
                <i />
                Free
              </span>
            </div>
          </section>


          <section className="facultyAvailabilityMetrics">
            <article>
              <span>
                SCHEDULED
              </span>

              <strong>
                {metrics.busy}
              </strong>

              <small>
                Automatically locked
              </small>
            </article>

            <article>
              <span>
                AVAILABLE
              </span>

              <strong>
                {metrics.available}
              </strong>

              <small>
                Opted in for coverage
              </small>
            </article>

            <article>
              <span>
                FREE
              </span>

              <strong>
                {metrics.free}
              </strong>

              <small>
                Not opted in
              </small>
            </article>

            <article>
              <span>
                EXCEPTIONS
              </span>

              <strong>
                {exceptions.length}
              </strong>

              <small>
                Upcoming unavailable
              </small>
            </article>
          </section>


          {error ? (
            <div className="facultyAvailabilityAlert error">
              {error}
            </div>
          ) : null}

          {status ? (
            <div className="facultyAvailabilityAlert success">
              {status}
            </div>
          ) : null}


          <section className="facultyAvailabilityBoard">
            <header>
              <div>
                <span>
                  WEEKLY AVAILABILITY
                </span>

                <h3>
                  Choose your coverage periods
                </h3>

                <p>
                  Scheduled classes are locked.
                  Clicking a free cell opts you
                  in or out of substitute
                  matching for that recurring
                  period.
                </p>
              </div>

              {selectedProfile ? (
                <strong>
                  {selectedProfile.name}
                </strong>
              ) : null}
            </header>


            {!periods.length ? (
              <div className="facultyAvailabilityEmpty">
                No active teaching periods are
                configured for this scheduling
                profile.
              </div>
            ) : (
              <div className="facultyAvailabilityTableWrap">
                <table className="facultyAvailabilityTable">
                  <thead>
                    <tr>
                      <th>
                        Period
                      </th>

                      {days.map(
                        day => (
                          <th
                            key={day}
                          >
                            {day}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {slots.map(
                      slot => (
                        <tr
                          key={
                            slot.period_slot_id
                          }
                        >
                          <th>
                            <strong>
                              {slot.period_label ||
                                `P${slot.period_order}`}
                            </strong>

                            <small>
                              {cleanTime(
                                slot.start_time
                              )}
                              {" – "}
                              {cleanTime(
                                slot.end_time
                              )}
                            </small>
                          </th>

                          {days.map(
                            day => {
                              const period =
                                getPeriod(
                                  day,
                                  slot.period_slot_id
                                );

                              if (
                                !period
                              ) {
                                return (
                                  <td
                                    key={
                                      day
                                    }
                                  >
                                    <div className="facultyAvailabilityCell unavailable">
                                      Not scheduled
                                    </div>
                                  </td>
                                );
                              }

                              const busy =
                                getBusyEntry(
                                  period
                                );

                              const state =
                                getCellState(
                                  period
                                );

                              const key =
                                `${day}:${period.period_slot_id}`;

                              return (
                                <td
                                  key={
                                    day
                                  }
                                >
                                  <button
                                    type="button"
                                    className={
                                      "facultyAvailabilityCell " +
                                      state
                                    }
                                    disabled={
                                      Boolean(
                                        busy
                                      ) ||
                                      savingKey ===
                                        key
                                    }
                                    onClick={() =>
                                      void toggleAvailability(
                                        period
                                      )
                                    }
                                  >
                                    <strong>
                                      {savingKey ===
                                      key
                                        ? "Saving…"
                                        : state ===
                                            "busy"
                                          ? "Scheduled"
                                          : state ===
                                              "available"
                                            ? "Available"
                                            : "Free"}
                                    </strong>

                                    <small>
                                      {busy
                                        ? `${busy.class_type || "Class"}${busy.room ? ` · ${busy.room}` : ""}`
                                        : state ===
                                            "available"
                                          ? "Coverage opt-in"
                                          : "Click to opt in"}
                                    </small>
                                  </button>
                                </td>
                              );
                            }
                          )}
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>


          <section className="facultyAvailabilityExceptions">
            <header>
              <div>
                <span>
                  DATE-SPECIFIC OVERRIDE
                </span>

                <h3>
                  Mark yourself unavailable
                </h3>

                <p>
                  Use this for a specific date.
                  Choosing no period marks the
                  entire day unavailable.
                </p>
              </div>
            </header>

            <div className="facultyAvailabilityExceptionForm">
              <label>
                <span>Date</span>

                <input
                  type="date"
                  min={todayIso()}
                  value={
                    exceptionDate
                  }
                  onChange={
                    event =>
                      setExceptionDate(
                        event.target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>Period</span>

                <select
                  value={
                    exceptionPeriodSlotId
                  }
                  onChange={
                    event =>
                      setExceptionPeriodSlotId(
                        event.target
                          .value
                      )
                  }
                >
                  <option value="">
                    Whole day
                  </option>

                  {slots.map(
                    slot => (
                      <option
                        key={
                          slot.period_slot_id
                        }
                        value={
                          slot.period_slot_id
                        }
                      >
                        {slot.period_label ||
                          `Period ${slot.period_order}`}
                        {" · "}
                        {cleanTime(
                          slot.start_time
                        )}
                        {"–"}
                        {cleanTime(
                          slot.end_time
                        )}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="facultyAvailabilityReason">
                <span>
                  Private note
                </span>

                <input
                  type="text"
                  maxLength={500}
                  value={
                    exceptionReason
                  }
                  placeholder="Optional reason"
                  onChange={
                    event =>
                      setExceptionReason(
                        event.target
                          .value
                      )
                  }
                />
              </label>

              <button
                type="button"
                disabled={
                  exceptionSaving ||
                  !exceptionDate
                }
                onClick={() =>
                  void createException()
                }
              >
                {exceptionSaving
                  ? "Saving…"
                  : "Mark unavailable"}
              </button>
            </div>


            <div className="facultyAvailabilityExceptionList">
              {!exceptions.length ? (
                <div className="facultyAvailabilityEmpty">
                  No upcoming unavailability
                  exceptions.
                </div>
              ) : (
                exceptions.map(
                  exception => {
                    const slot =
                      slots.find(
                        item =>
                          item.period_slot_id ===
                          exception.period_slot_id
                      );

                    return (
                      <article
                        key={
                          exception.id
                        }
                      >
                        <div>
                          <span>
                            {friendlyDate(
                              exception.unavailable_date
                            )}
                          </span>

                          <strong>
                            {slot
                              ? slot.period_label ||
                                `Period ${slot.period_order}`
                              : "Whole day"}
                          </strong>

                          {exception.reason ? (
                            <small>
                              {exception.reason}
                            </small>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          disabled={
                            exceptionSaving
                          }
                          onClick={() =>
                            void cancelException(
                              exception
                            )
                          }
                        >
                          Cancel
                        </button>
                      </article>
                    );
                  }
                )
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
