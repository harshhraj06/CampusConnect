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


type CoverageRequest = {
  id: string;
  timetable_entry_id: string;
  class_date: string;
  original_faculty_id: string;
  reason: string;
  status:
    | "Open"
    | "Offered"
    | "Covered"
    | "Uncovered"
    | "Cancelled";
  requested_by: string;
  created_at: string;
  updated_at: string;
};


type CoverageOffer = {
  id: string;
  coverage_request_id: string;
  candidate_faculty_id: string;
  candidate_faculty_name: string;
  match_score: number;
  match_reason: string;
  status:
    | "Pending"
    | "Accepted"
    | "Declined"
    | "Expired"
    | "Withdrawn";
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};


type SubstitutionOverride = {
  id: string;
  coverage_request_id: string;
  timetable_entry_id: string;
  class_date: string;
  original_faculty_id: string;
  substitute_faculty_id: string;
  substitute_faculty_name: string;
  status:
    | "Active"
    | "Cancelled"
    | "Completed";
  accepted_offer_id: string | null;
  created_at: string;
  updated_at: string;
};


type RequestDraft = {
  entry: TimetableEntry;
  date: string;
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


const cleanTime = (
  value: string
) =>
  String(value || "")
    .slice(0, 5);


const localIsoDate = (
  date: Date
) => {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};


const todayIso = () =>
  localIsoDate(
    new Date()
  );


const friendlyDate = (
  value: string
) => {
  if (!value) {
    return "";
  }

  const parsed =
    new Date(
      `${value}T00:00:00`
    );

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
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
};


const nextDateForDay = (
  dayName: string
) => {
  const target =
    DAYS.indexOf(
      dayName
    );

  const now =
    new Date();

  if (target < 0) {
    return todayIso();
  }

  const difference =
    (
      target -
      now.getDay() +
      7
    ) % 7;

  const result =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() +
        difference
    );

  return localIsoDate(
    result
  );
};


const dayForIsoDate = (
  value: string
) => {
  const parsed =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "";
  }

  return DAYS[
    parsed.getDay()
  ] || "";
};


const statusClass = (
  value: string
) =>
  String(value || "")
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    );


const errorMessage = (
  error: unknown
) => {
  if (
    error &&
    typeof error ===
      "object" &&
    "message" in error
  ) {
    const message =
      (error as {
        message?: unknown;
      }).message;

    if (
      typeof message ===
      "string" &&
      message.trim()
    ) {
      return message;
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Something went wrong.";
};


export default function FacultyCoverageManager({
  profile,
}: {
  profile: Profile;
}) {
  const [
    userId,
    setUserId,
  ] =
    useState("");

  const [
    allocations,
    setAllocations,
  ] =
    useState<
      TeachingAllocation[]
    >([]);

  const [
    timetable,
    setTimetable,
  ] =
    useState<
      TimetableEntry[]
    >([]);

  const [
    requests,
    setRequests,
  ] =
    useState<
      CoverageRequest[]
    >([]);

  const [
    offers,
    setOffers,
  ] =
    useState<
      CoverageOffer[]
    >([]);

  const [
    overrides,
    setOverrides,
  ] =
    useState<
      SubstitutionOverride[]
    >([]);

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
    success,
    setSuccess,
  ] =
    useState("");

  const [
    requestDraft,
    setRequestDraft,
  ] =
    useState<
      RequestDraft | null
    >(null);

  const [
    reason,
    setReason,
  ] =
    useState("");

  const [
    actionKey,
    setActionKey,
  ] =
    useState("");

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<
      | "classes"
      | "requests"
      | "offers"
    >("classes");


  const subjectById =
    useMemo(
      () =>
        new Map(
          allocations.map(
            item => [
              item.batch_subject_id,
              item,
            ]
          )
        ),
      [allocations]
    );


  const entryById =
    useMemo(
      () =>
        new Map(
          timetable.map(
            item => [
              item.id,
              item,
            ]
          )
        ),
      [timetable]
    );


  const requestById =
    useMemo(
      () =>
        new Map(
          requests.map(
            item => [
              item.id,
              item,
            ]
          )
        ),
      [requests]
    );


  const overrideByRequestId =
    useMemo(
      () =>
        new Map(
          overrides.map(
            item => [
              item.coverage_request_id,
              item,
            ]
          )
        ),
      [overrides]
    );


  const ownTimetable =
    useMemo(
      () =>
        timetable
          .filter(
            item =>
              item.faculty_id ===
              userId
          )
          .sort(
            (a, b) => {
              const dayA =
                DAYS.indexOf(
                  a.day_of_week
                );

              const dayB =
                DAYS.indexOf(
                  b.day_of_week
                );

              if (
                dayA !== dayB
              ) {
                return (
                  dayA - dayB
                );
              }

              return (
                a.period_order -
                b.period_order
              );
            }
          ),
      [
        timetable,
        userId,
      ]
    );


  const ownRequests =
    useMemo(
      () =>
        requests
          .filter(
            item =>
              item.original_faculty_id ===
              userId
          )
          .sort(
            (a, b) =>
              b.class_date.localeCompare(
                a.class_date
              )
          ),
      [
        requests,
        userId,
      ]
    );


  const incomingOffers =
    useMemo(
      () =>
        offers
          .filter(
            item =>
              item.candidate_faculty_id ===
                userId &&
              item.status ===
                "Pending"
          )
          .sort(
            (a, b) => {
              const requestA =
                requestById.get(
                  a.coverage_request_id
                );

              const requestB =
                requestById.get(
                  b.coverage_request_id
                );

              return String(
                requestA?.class_date ||
                  ""
              ).localeCompare(
                String(
                  requestB?.class_date ||
                    ""
                )
              );
            }
          ),
      [
        offers,
        requestById,
        userId,
      ]
    );


  const loadAll =
    useCallback(
      async (
        showSpinner =
          false
      ) => {
        const client =
          getSupabaseClient();

        if (!client) {
          setError(
            "Campus database is unavailable."
          );
          setLoading(false);
          return;
        }

        if (showSpinner) {
          setRefreshing(true);
        }

        try {
          setError("");

          const {
            data: authData,
            error: authError,
          } =
            await client.auth.getUser();

          if (authError) {
            throw authError;
          }

          const currentUserId =
            authData.user?.id;

          if (!currentUserId) {
            throw new Error(
              "Faculty session is unavailable."
            );
          }

          setUserId(
            currentUserId
          );

          const {
            data:
              allocationData,
            error:
              allocationError,
          } =
            await client.rpc(
              "get_my_teaching_allocations"
            );

          if (
            allocationError
          ) {
            throw allocationError;
          }

          const nextAllocations =
            (
              allocationData ||
              []
            ) as TeachingAllocation[];

          setAllocations(
            nextAllocations
          );

          const batchIds =
            Array.from(
              new Set(
                nextAllocations
                  .map(
                    item =>
                      item.batch_id
                  )
                  .filter(Boolean)
              )
            );

          let nextTimetable:
            TimetableEntry[] =
              [];

          if (
            batchIds.length
          ) {
            const {
              data:
                timetableData,
              error:
                timetableError,
            } =
              await client.rpc(
                "get_current_batch_timetable_entries",
                {
                  p_batch_ids:
                    batchIds,
                }
              );

            if (
              timetableError
            ) {
              throw timetableError;
            }

            nextTimetable =
              (
                timetableData ||
                []
              ) as TimetableEntry[];
          }

          setTimetable(
            nextTimetable
          );

          const {
            data: requestData,
            error: requestError,
          } =
            await client
              .from(
                "faculty_coverage_requests"
              )
              .select(
                "id,timetable_entry_id,class_date,original_faculty_id,reason,status,requested_by,created_at,updated_at"
              )
              .order(
                "class_date",
                {
                  ascending:
                    false,
                }
              );

          if (
            requestError
          ) {
            throw requestError;
          }

          const nextRequests =
            (
              requestData ||
              []
            ) as CoverageRequest[];

          setRequests(
            nextRequests
          );

          const {
            data: offerData,
            error: offerError,
          } =
            await client
              .from(
                "faculty_coverage_offers"
              )
              .select(
                "id,coverage_request_id,candidate_faculty_id,candidate_faculty_name,match_score,match_reason,status,responded_at,created_at,updated_at"
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              );

          if (
            offerError
          ) {
            throw offerError;
          }

          setOffers(
            (
              offerData ||
              []
            ) as CoverageOffer[]
          );

          const {
            data:
              overrideData,
            error:
              overrideError,
          } =
            await client
              .from(
                "faculty_substitution_overrides"
              )
              .select(
                "id,coverage_request_id,timetable_entry_id,class_date,original_faculty_id,substitute_faculty_id,substitute_faculty_name,status,accepted_offer_id,created_at,updated_at"
              )
              .order(
                "class_date",
                {
                  ascending:
                    false,
                }
              );

          if (
            overrideError
          ) {
            throw overrideError;
          }

          setOverrides(
            (
              overrideData ||
              []
            ) as SubstitutionOverride[]
          );
        } catch (
          loadError
        ) {
          setError(
            errorMessage(
              loadError
            )
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
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

    void loadAll();
  }, [
    loadAll,
    profile.role,
  ]);


  const openRequest =
    (
      entry:
        TimetableEntry
    ) => {
      setError("");
      setSuccess("");
      setReason("");

      setRequestDraft({
        entry,
        date:
          nextDateForDay(
            entry.day_of_week
          ),
      });
    };


  const createRequest =
    async () => {
      if (
        !requestDraft ||
        !userId
      ) {
        return;
      }

      const {
        entry,
        date,
      } =
        requestDraft;

      if (!date) {
        setError(
          "Choose the class date."
        );
        return;
      }

      if (
        date <
        todayIso()
      ) {
        setError(
          "Coverage cannot be requested for a past class."
        );
        return;
      }

      if (
        dayForIsoDate(
          date
        ) !==
        entry.day_of_week
      ) {
        setError(
          `Choose a ${entry.day_of_week} date for this timetable class.`
        );
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        setError(
          "Campus database is unavailable."
        );
        return;
      }

      const key =
        `request:${entry.id}:${date}`;

      setActionKey(key);
      setError("");
      setSuccess("");

      try {
        const {
          data:
            requestData,
          error:
            requestError,
        } =
          await client
            .from(
              "faculty_coverage_requests"
            )
            .insert({
              timetable_entry_id:
                entry.id,
              class_date:
                date,
              original_faculty_id:
                userId,
              reason:
                reason.trim(),
              status:
                "Open",
              requested_by:
                userId,
            })
            .select(
              "id"
            )
            .single();

        if (
          requestError
        ) {
          throw requestError;
        }

        const requestId =
          String(
            requestData?.id ||
              ""
          );

        if (!requestId) {
          throw new Error(
            "Coverage request was created but its ID was not returned."
          );
        }

        const {
          data:
            generatedOffers,
          error:
            generationError,
        } =
          await client.rpc(
            "generate_faculty_coverage_offers",
            {
              p_coverage_request_id:
                requestId,
            }
          );

        if (
          generationError
        ) {
          setSuccess(
            "Coverage request was created. Candidate matching needs to be retried."
          );

          setRequestDraft(
            null
          );

          setReason("");

          await loadAll();

          setActiveTab(
            "requests"
          );

          setError(
            generationError.message
          );

          return;
        }

        const count =
          Array.isArray(
            generatedOffers
          )
            ? generatedOffers.length
            : 0;

        setSuccess(
          count > 0
            ? `Coverage request created and ${count} eligible ${count === 1 ? "faculty member was" : "faculty members were"} matched.`
            : "Coverage request created. No eligible substitute is currently available."
        );

        setRequestDraft(
          null
        );

        setReason("");

        await loadAll();

        setActiveTab(
          "requests"
        );
      } catch (
        requestError
      ) {
        setError(
          errorMessage(
            requestError
          )
        );
      } finally {
        setActionKey("");
      }
    };


  const retryMatching =
    async (
      requestId: string
    ) => {
      const client =
        getSupabaseClient();

      if (!client) {
        setError(
          "Campus database is unavailable."
        );
        return;
      }

      const key =
        `retry:${requestId}`;

      setActionKey(key);
      setError("");
      setSuccess("");

      try {
        const {
          data,
          error:
            rpcError,
        } =
          await client.rpc(
            "generate_faculty_coverage_offers",
            {
              p_coverage_request_id:
                requestId,
            }
          );

        if (rpcError) {
          throw rpcError;
        }

        const count =
          Array.isArray(data)
            ? data.length
            : 0;

        setSuccess(
          count > 0
            ? `${count} eligible ${count === 1 ? "faculty member" : "faculty members"} matched.`
            : "No eligible substitute is currently available."
        );

        await loadAll();
      } catch (
        retryError
      ) {
        setError(
          errorMessage(
            retryError
          )
        );
      } finally {
        setActionKey("");
      }
    };


  const respond =
    async (
      offerId: string,
      response:
        | "Accepted"
        | "Declined"
    ) => {
      const client =
        getSupabaseClient();

      if (!client) {
        setError(
          "Campus database is unavailable."
        );
        return;
      }

      const key =
        `${response}:${offerId}`;

      setActionKey(key);
      setError("");
      setSuccess("");

      try {
        const {
          error:
            rpcError,
        } =
          await client.rpc(
            "respond_to_faculty_coverage_offer",
            {
              p_offer_id:
                offerId,
              p_response:
                response,
            }
          );

        if (rpcError) {
          throw rpcError;
        }

        setSuccess(
          response ===
            "Accepted"
            ? "Class accepted. The date-specific substitute assignment is now active."
            : "Coverage request declined."
        );

        await loadAll();
      } catch (
        responseError
      ) {
        setError(
          errorMessage(
            responseError
          )
        );
      } finally {
        setActionKey("");
      }
    };


  if (
    profile.role !==
    "Faculty"
  ) {
    return null;
  }


  return (
    <section
      className="facultyCoverage"
      id="faculty-coverage"
    >
      <header
        className="facultyCoverageHero"
      >
        <div>
          <span>
            FACULTY COVERAGE
          </span>

          <h2>
            Smart class
            substitution
          </h2>

          <p>
            Request coverage for
            a scheduled class,
            receive eligible
            substitute matches,
            and respond to
            incoming coverage
            offers without
            changing the permanent
            timetable.
          </p>
        </div>

        <div
          className="facultyCoverageHeroStats"
        >
          <div>
            <small>
              MY CLASSES
            </small>
            <strong>
              {
                ownTimetable.length
              }
            </strong>
          </div>

          <div>
            <small>
              INCOMING
            </small>
            <strong>
              {
                incomingOffers.length
              }
            </strong>
          </div>

          <div>
            <small>
              COVERED
            </small>
            <strong>
              {
                ownRequests.filter(
                  item =>
                    item.status ===
                    "Covered"
                ).length
              }
            </strong>
          </div>
        </div>
      </header>


      {(error ||
        success) && (
        <div
          className={
            error
              ? "facultyCoverageNotice error"
              : "facultyCoverageNotice success"
          }
        >
          <span>
            {error
              ? "!"
              : "✓"}
          </span>

          <p>
            {error ||
              success}
          </p>

          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
            }}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}


      <div
        className="facultyCoverageToolbar"
      >
        <div
          className="facultyCoverageTabs"
          role="tablist"
          aria-label="Faculty coverage sections"
        >
          <button
            type="button"
            className={
              activeTab ===
              "classes"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "classes"
              )
            }
          >
            My Classes
            <b>
              {
                ownTimetable.length
              }
            </b>
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "requests"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "requests"
              )
            }
          >
            My Requests
            <b>
              {
                ownRequests.length
              }
            </b>
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "offers"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "offers"
              )
            }
          >
            Incoming
            <b>
              {
                incomingOffers.length
              }
            </b>
          </button>
        </div>

        <button
          type="button"
          className="facultyCoverageRefresh"
          disabled={
            refreshing
          }
          onClick={() =>
            void loadAll(true)
          }
        >
          {refreshing
            ? "Refreshing…"
            : "Refresh"}
        </button>
      </div>


      {loading ? (
        <div
          className="facultyCoverageEmpty"
        >
          <strong>
            Loading faculty
            coverage…
          </strong>

          <p>
            Reading your teaching
            allocations, timetable
            and coverage activity.
          </p>
        </div>
      ) : null}


      {!loading &&
        activeTab ===
          "classes" && (
          <div
            className="facultyCoverageGrid"
          >
            {ownTimetable.length ? (
              ownTimetable.map(
                entry => {
                  const subject =
                    subjectById.get(
                      entry.batch_subject_id
                    );

                  const suggestedDate =
                    nextDateForDay(
                      entry.day_of_week
                    );

                  const existing =
                    ownRequests.find(
                      item =>
                        item.timetable_entry_id ===
                          entry.id &&
                        item.class_date ===
                          suggestedDate &&
                        item.status !==
                          "Cancelled"
                    );

                  return (
                    <article
                      key={
                        entry.id
                      }
                      className="facultyCoverageClassCard"
                    >
                      <div
                        className="facultyCoverageClassTop"
                      >
                        <span>
                          {
                            entry.day_of_week
                          }
                          {" · "}
                          Period{" "}
                          {
                            entry.period_order
                          }
                        </span>

                        <em>
                          {
                            entry.class_type ||
                            "Class"
                          }
                        </em>
                      </div>

                      <h3>
                        {subject?.subject_name ||
                          "Scheduled class"}
                      </h3>

                      <p>
                        {subject?.subject_code
                          ? `${subject.subject_code} · `
                          : ""}
                        {subject?.batch_name ||
                          "Assigned batch"}

                        {subject?.section
                          ? ` · Section ${subject.section}`
                          : ""}

                        {entry.subgroup
                          ? ` · ${entry.subgroup}`
                          : ""}
                      </p>

                      <div
                        className="facultyCoverageClassMeta"
                      >
                        <span>
                          <small>
                            TIME
                          </small>
                          <b>
                            {cleanTime(
                              entry.start_time
                            )}
                            {" – "}
                            {cleanTime(
                              entry.end_time
                            )}
                          </b>
                        </span>

                        <span>
                          <small>
                            ROOM
                          </small>
                          <b>
                            {entry.room ||
                              "Not set"}
                          </b>
                        </span>
                      </div>

                      {existing ? (
                        <div
                          className="facultyCoverageExisting"
                        >
                          <span
                            className={`facultyCoverageStatus ${statusClass(existing.status)}`}
                          >
                            {
                              existing.status
                            }
                          </span>

                          <p>
                            Coverage already
                            requested for{" "}
                            {friendlyDate(
                              existing.class_date
                            )}
                            .
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="facultyCoverageRequestButton"
                          onClick={() =>
                            openRequest(
                              entry
                            )
                          }
                        >
                          I can&apos;t take
                          this class
                          <span>
                            →
                          </span>
                        </button>
                      )}
                    </article>
                  );
                }
              )
            ) : (
              <div
                className="facultyCoverageEmpty"
              >
                <strong>
                  No scheduled
                  classes found
                </strong>

                <p>
                  Coverage actions
                  appear after your
                  assigned batches
                  have structured
                  timetable entries.
                </p>
              </div>
            )}
          </div>
        )}


      {!loading &&
        activeTab ===
          "requests" && (
          <div
            className="facultyCoverageRequestList"
          >
            {ownRequests.length ? (
              ownRequests.map(
                request => {
                  const entry =
                    entryById.get(
                      request.timetable_entry_id
                    );

                  const subject =
                    entry
                      ? subjectById.get(
                          entry.batch_subject_id
                        )
                      : undefined;

                  const requestOffers =
                    offers.filter(
                      item =>
                        item.coverage_request_id ===
                        request.id
                    );

                  const activeOverride =
                    overrideByRequestId.get(
                      request.id
                    );

                  return (
                    <article
                      key={
                        request.id
                      }
                      className="facultyCoverageRequestCard"
                    >
                      <div
                        className="facultyCoverageRequestHeading"
                      >
                        <div>
                          <span>
                            {friendlyDate(
                              request.class_date
                            )}
                          </span>

                          <h3>
                            {subject?.subject_name ||
                              "Coverage request"}
                          </h3>

                          <p>
                            {subject?.batch_name ||
                              "Assigned batch"}

                            {subject?.section
                              ? ` · Section ${subject.section}`
                              : ""}

                            {entry
                              ? ` · ${cleanTime(entry.start_time)}–${cleanTime(entry.end_time)}`
                              : ""}
                          </p>
                        </div>

                        <span
                          className={`facultyCoverageStatus ${statusClass(request.status)}`}
                        >
                          {
                            request.status
                          }
                        </span>
                      </div>

                      <div
                        className="facultyCoverageRequestMetrics"
                      >
                        <span>
                          <small>
                            MATCHES
                          </small>
                          <strong>
                            {
                              requestOffers.length
                            }
                          </strong>
                        </span>

                        <span>
                          <small>
                            PENDING
                          </small>
                          <strong>
                            {
                              requestOffers.filter(
                                item =>
                                  item.status ===
                                  "Pending"
                              ).length
                            }
                          </strong>
                        </span>

                        <span>
                          <small>
                            SUBSTITUTE
                          </small>
                          <strong>
                            {activeOverride?.substitute_faculty_name ||
                              "—"}
                          </strong>
                        </span>
                      </div>

                      {activeOverride ? (
                        <div
                          className="facultyCoverageAssigned"
                        >
                          <span>
                            ✓
                          </span>

                          <div>
                            <strong>
                              Coverage
                              confirmed
                            </strong>

                            <p>
                              {
                                activeOverride.substitute_faculty_name
                              }{" "}
                              is assigned
                              for this date
                              only. Your
                              permanent
                              timetable is
                              unchanged.
                            </p>
                          </div>
                        </div>
                      ) : null}

                      {(request.status ===
                        "Open" ||
                        request.status ===
                          "Offered" ||
                        request.status ===
                          "Uncovered") && (
                        <button
                          type="button"
                          className="facultyCoverageRetry"
                          disabled={
                            actionKey ===
                            `retry:${request.id}`
                          }
                          onClick={() =>
                            void retryMatching(
                              request.id
                            )
                          }
                        >
                          {actionKey ===
                          `retry:${request.id}`
                            ? "Matching…"
                            : request.status ===
                                "Offered"
                              ? "Refresh candidate matches"
                              : "Find substitute faculty"}
                        </button>
                      )}

                      {request.status ===
                        "Uncovered" && (
                        <p
                          className="facultyCoverageUncoveredNote"
                        >
                          No eligible
                          substitute is
                          currently
                          available. This
                          request requires
                          administrative
                          follow-up.
                        </p>
                      )}
                    </article>
                  );
                }
              )
            ) : (
              <div
                className="facultyCoverageEmpty"
              >
                <strong>
                  No coverage
                  requests yet
                </strong>

                <p>
                  Use “I can&apos;t
                  take this class”
                  from My Classes
                  when you need a
                  substitute.
                </p>
              </div>
            )}
          </div>
        )}


      {!loading &&
        activeTab ===
          "offers" && (
          <div
            className="facultyCoverageOfferList"
          >
            {incomingOffers.length ? (
              incomingOffers.map(
                offer => {
                  const request =
                    requestById.get(
                      offer.coverage_request_id
                    );

                  const entry =
                    request
                      ? entryById.get(
                          request.timetable_entry_id
                        )
                      : undefined;

                  const subject =
                    entry
                      ? subjectById.get(
                          entry.batch_subject_id
                        )
                      : undefined;

                  return (
                    <article
                      key={
                        offer.id
                      }
                      className="facultyCoverageOfferCard"
                    >
                      <div
                        className="facultyCoverageOfferIcon"
                      >
                        ↔
                      </div>

                      <div
                        className="facultyCoverageOfferBody"
                      >
                        <div
                          className="facultyCoverageOfferHeading"
                        >
                          <div>
                            <span>
                              SUBSTITUTE
                              REQUEST
                            </span>

                            <h3>
                              {subject?.subject_name ||
                                "Class coverage"}
                            </h3>
                          </div>

                          <strong>
                            {Number(
                              offer.match_score ||
                                0
                            ).toFixed(
                              0
                            )}
                            <small>
                              match
                            </small>
                          </strong>
                        </div>

                        <p
                          className="facultyCoverageOfferContext"
                        >
                          {subject?.batch_name ||
                            "Assigned batch"}

                          {subject?.section
                            ? ` · Section ${subject.section}`
                            : ""}

                          {request?.class_date
                            ? ` · ${friendlyDate(request.class_date)}`
                            : ""}

                          {entry
                            ? ` · ${cleanTime(entry.start_time)}–${cleanTime(entry.end_time)}`
                            : ""}
                        </p>

                        {offer.match_reason ? (
                          <div
                            className="facultyCoverageMatchReason"
                          >
                            {
                              offer.match_reason
                            }
                          </div>
                        ) : null}

                        <div
                          className="facultyCoverageOfferActions"
                        >
                          <button
                            type="button"
                            className="decline"
                            disabled={
                              Boolean(
                                actionKey
                              )
                            }
                            onClick={() =>
                              void respond(
                                offer.id,
                                "Declined"
                              )
                            }
                          >
                            {actionKey ===
                            `Declined:${offer.id}`
                              ? "Declining…"
                              : "Decline"}
                          </button>

                          <button
                            type="button"
                            className="accept"
                            disabled={
                              Boolean(
                                actionKey
                              )
                            }
                            onClick={() =>
                              void respond(
                                offer.id,
                                "Accepted"
                              )
                            }
                          >
                            {actionKey ===
                            `Accepted:${offer.id}`
                              ? "Accepting…"
                              : "Accept class"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }
              )
            ) : (
              <div
                className="facultyCoverageEmpty"
              >
                <strong>
                  No incoming
                  coverage requests
                </strong>

                <p>
                  When CampusConnect
                  matches you as an
                  eligible substitute,
                  the request will
                  appear here for your
                  approval.
                </p>
              </div>
            )}
          </div>
        )}


      {requestDraft ? (
        <div
          className="facultyCoverageModalBackdrop"
          role="presentation"
          onMouseDown={event => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setRequestDraft(
                null
              );
            }
          }}
        >
          <div
            className="facultyCoverageModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coverage-request-title"
          >
            <header>
              <div>
                <span>
                  REQUEST
                  SUBSTITUTE
                </span>

                <h3
                  id="coverage-request-title"
                >
                  I can&apos;t take
                  this class
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRequestDraft(
                    null
                  )
                }
                aria-label="Close coverage request"
              >
                ×
              </button>
            </header>

            <div
              className="facultyCoverageModalClass"
            >
              <strong>
                {subjectById.get(
                  requestDraft.entry
                    .batch_subject_id
                )?.subject_name ||
                  "Scheduled class"}
              </strong>

              <p>
                {
                  requestDraft.entry
                    .day_of_week
                }
                {" · "}
                {cleanTime(
                  requestDraft.entry
                    .start_time
                )}
                {"–"}
                {cleanTime(
                  requestDraft.entry
                    .end_time
                )}
              </p>
            </div>

            <label>
              <span>
                Class date
              </span>

              <input
                type="date"
                min={todayIso()}
                value={
                  requestDraft.date
                }
                onChange={event =>
                  setRequestDraft(
                    current =>
                      current
                        ? {
                            ...current,
                            date:
                              event
                                .target
                                .value,
                          }
                        : current
                  )
                }
              />

              <small>
                This must be a{" "}
                {
                  requestDraft.entry
                    .day_of_week
                }{" "}
                because the
                coverage request is
                tied to this
                permanent timetable
                class.
              </small>
            </label>

            <label>
              <span>
                Private note
                <em>
                  Optional
                </em>
              </span>

              <textarea
                maxLength={500}
                value={reason}
                onChange={event =>
                  setReason(
                    event.target
                      .value
                  )
                }
                placeholder="Add a short private note for your own coverage record."
              />

              <small>
                This note is not
                shown to substitute
                candidates by this
                interface.
              </small>
            </label>

            <div
              className="facultyCoverageModalActions"
            >
              <button
                type="button"
                className="secondary"
                disabled={
                  Boolean(
                    actionKey
                  )
                }
                onClick={() =>
                  setRequestDraft(
                    null
                  )
                }
              >
                Keep class
              </button>

              <button
                type="button"
                className="primary"
                disabled={
                  Boolean(
                    actionKey
                  )
                }
                onClick={() =>
                  void createRequest()
                }
              >
                {actionKey.startsWith(
                  "request:"
                )
                  ? "Finding coverage…"
                  : "Request coverage"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
