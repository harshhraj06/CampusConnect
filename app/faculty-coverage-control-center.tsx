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


type Profile = {
  name?: string;
  email?: string;
  department?: string;
  graduation_year?: string;
  role:
    | "Student"
    | "Faculty"
    | "Placement Cell"
    | "Coordinator"
    | "Volunteer"
    | "Main Admin";
};


type Batch = {
  id: string;
  batch_name: string;
  section: string;
  department: string;
  academic_year: string;
  semester: string;
};


type BatchSubject = {
  id: string;
  batch_id: string;
  subject_name: string;
  subject_code: string;
  subject_type: string;
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
  subgroup?: string | null;
};


type CoverageStatus =
  | "Open"
  | "Offered"
  | "Covered"
  | "Uncovered"
  | "Cancelled";


type CoverageRequest = {
  id: string;
  timetable_entry_id: string;
  class_date: string;
  original_faculty_id: string;
  reason: string;
  status: CoverageStatus;
  requested_by: string;
  created_at: string;
  updated_at: string;
};


type OfferStatus =
  | "Pending"
  | "Accepted"
  | "Declined"
  | "Expired"
  | "Withdrawn";


type CoverageOffer = {
  id: string;
  coverage_request_id: string;
  candidate_faculty_id: string;
  candidate_faculty_name: string;
  match_score: number | string;
  match_reason: string;
  status: OfferStatus;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};


type OverrideStatus =
  | "Active"
  | "Cancelled"
  | "Completed";


type SubstitutionOverride = {
  id: string;
  coverage_request_id: string;
  timetable_entry_id: string;
  class_date: string;
  original_faculty_id: string;
  substitute_faculty_id: string;
  substitute_faculty_name: string;
  status: OverrideStatus;
  accepted_offer_id: string | null;
  created_at: string;
  updated_at: string;
};


type View =
  | "attention"
  | "active"
  | "covered"
  | "history";


function errorMessage(
  value: unknown
) {
  if (
    value &&
    typeof value === "object" &&
    "message" in value
  ) {
    return String(
      (
        value as {
          message?: unknown;
        }
      ).message ||
        "Unexpected error"
    );
  }

  if (
    value instanceof Error
  ) {
    return value.message;
  }

  return String(
    value ||
      "Unexpected error"
  );
}


function shortTime(
  value: string
) {
  if (!value) {
    return "—";
  }

  return value.slice(
    0,
    5
  );
}


function formatDate(
  value: string
) {
  if (!value) {
    return "—";
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

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(parsed);
}


function statusClass(
  status: string
) {
  return status
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    );
}


export default function FacultyCoverageControlCenter({
  profile,
}: {
  profile: Profile;
}) {
  const [
    batches,
    setBatches,
  ] =
    useState<Batch[]>([]);

  const [
    subjects,
    setSubjects,
  ] =
    useState<
      BatchSubject[]
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
    actionKey,
    setActionKey,
  ] =
    useState("");

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
    view,
    setView,
  ] =
    useState<View>(
      "attention"
    );


  const loadAll =
    useCallback(
      async () => {
        if (
          profile.role !==
          "Main Admin"
        ) {
          return;
        }

        const client =
          getSupabaseClient();

        if (!client) {
          setError(
            "Campus database is unavailable."
          );

          setLoading(
            false
          );

          return;
        }

        setLoading(true);
        setError("");

        try {
          const {
            data:
              batchData,
            error:
              batchError,
          } =
            await client
              .from(
                "attendance_batches"
              )
              .select(
                "id,batch_name,section,department,academic_year,semester"
              )
              .eq(
                "department",
                "ECE"
              )
              .order(
                "batch_name"
              );

          if (batchError) {
            throw batchError;
          }

          const eceBatches =
            (
              batchData ||
              []
            ) as Batch[];

          setBatches(
            eceBatches
          );

          const batchIds =
            eceBatches.map(
              item =>
                item.id
            );

          if (
            batchIds.length ===
            0
          ) {
            setSubjects([]);
            setTimetable([]);
            setRequests([]);
            setOffers([]);
            setOverrides([]);
            return;
          }

          const [
            subjectResult,
            timetableResult,
          ] =
            await Promise.all([
              client
                .from(
                  "attendance_batch_subjects"
                )
                .select(
                  "id,batch_id,subject_name,subject_code,subject_type"
                )
                .in(
                  "batch_id",
                  batchIds
                ),

              client.rpc(
                "get_current_batch_timetable_entries",
                {
                  p_batch_ids:
                    batchIds,
                }
              ),
            ]);

          if (
            subjectResult.error
          ) {
            throw subjectResult.error;
          }

          if (
            timetableResult.error
          ) {
            throw timetableResult.error;
          }

          const subjectRows =
            (
              subjectResult.data ||
              []
            ) as BatchSubject[];

          const timetableRows =
            (
              timetableResult.data ||
              []
            ) as TimetableEntry[];

          setSubjects(
            subjectRows
          );

          setTimetable(
            timetableRows
          );

          const entryIds =
            timetableRows.map(
              item =>
                item.id
            );

          if (
            entryIds.length ===
            0
          ) {
            setRequests([]);
            setOffers([]);
            setOverrides([]);
            return;
          }

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
              .select(
                "id,timetable_entry_id,class_date,original_faculty_id,reason,status,requested_by,created_at,updated_at"
              )
              .in(
                "timetable_entry_id",
                entryIds
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

          const requestRows =
            (
              requestData ||
              []
            ) as CoverageRequest[];

          setRequests(
            requestRows
          );

          const requestIds =
            requestRows.map(
              item =>
                item.id
            );

          if (
            requestIds.length ===
            0
          ) {
            setOffers([]);
            setOverrides([]);
            return;
          }

          const [
            offerResult,
            overrideResult,
          ] =
            await Promise.all([
              client
                .from(
                  "faculty_coverage_offers"
                )
                .select(
                  "id,coverage_request_id,candidate_faculty_id,candidate_faculty_name,match_score,match_reason,status,responded_at,created_at,updated_at"
                )
                .in(
                  "coverage_request_id",
                  requestIds
                )
                .order(
                  "match_score",
                  {
                    ascending:
                      false,
                  }
                ),

              client
                .from(
                  "faculty_substitution_overrides"
                )
                .select(
                  "id,coverage_request_id,timetable_entry_id,class_date,original_faculty_id,substitute_faculty_id,substitute_faculty_name,status,accepted_offer_id,created_at,updated_at"
                )
                .in(
                  "coverage_request_id",
                  requestIds
                )
                .order(
                  "class_date",
                  {
                    ascending:
                      false,
                  }
                ),
            ]);

          if (
            offerResult.error
          ) {
            throw offerResult.error;
          }

          if (
            overrideResult.error
          ) {
            throw overrideResult.error;
          }

          setOffers(
            (
              offerResult.data ||
              []
            ) as CoverageOffer[]
          );

          setOverrides(
            (
              overrideResult.data ||
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
          setLoading(
            false
          );
        }
      },
      [
        profile.role,
      ]
    );


  useEffect(
    () => {
      void loadAll();
    },
    [loadAll]
  );


  const batchById =
    useMemo(
      () =>
        new Map(
          batches.map(
            item => [
              item.id,
              item,
            ]
          )
        ),
      [batches]
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
      [subjects]
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


  const offersByRequest =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            CoverageOffer[]
          >();

        for (
          const offer of offers
        ) {
          const existing =
            map.get(
              offer.coverage_request_id
            ) || [];

          existing.push(
            offer
          );

          map.set(
            offer.coverage_request_id,
            existing
          );
        }

        return map;
      },
      [offers]
    );


  const overrideByRequest =
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


  const metrics =
    useMemo(
      () => ({
        open:
          requests.filter(
            item =>
              item.status ===
              "Open"
          ).length,

        offered:
          requests.filter(
            item =>
              item.status ===
              "Offered"
          ).length,

        covered:
          requests.filter(
            item =>
              item.status ===
              "Covered"
          ).length,

        uncovered:
          requests.filter(
            item =>
              item.status ===
              "Uncovered"
          ).length,
      }),
      [requests]
    );


  const visibleRequests =
    useMemo(
      () => {
        const sorted =
          [...requests].sort(
            (a, b) => {
              const priority:
                Record<
                  CoverageStatus,
                  number
                > = {
                  Uncovered: 0,
                  Open: 1,
                  Offered: 2,
                  Covered: 3,
                  Cancelled: 4,
                };

              const difference =
                priority[
                  a.status
                ] -
                priority[
                  b.status
                ];

              if (
                difference !==
                0
              ) {
                return difference;
              }

              return (
                b.class_date.localeCompare(
                  a.class_date
                )
              );
            }
          );

        if (
          view ===
          "attention"
        ) {
          return sorted.filter(
            item =>
              item.status ===
                "Uncovered" ||
              item.status ===
                "Open"
          );
        }

        if (
          view ===
          "active"
        ) {
          return sorted.filter(
            item =>
              item.status ===
                "Open" ||
              item.status ===
                "Offered" ||
              item.status ===
                "Uncovered"
          );
        }

        if (
          view ===
          "covered"
        ) {
          return sorted.filter(
            item =>
              item.status ===
              "Covered"
          );
        }

        return sorted;
      },
      [
        requests,
        view,
      ]
    );


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

      setActionKey(
        `retry:${requestId}`
      );

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

        if (
          rpcError
        ) {
          throw rpcError;
        }

        const count =
          Array.isArray(
            data
          )
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


  const cancelRequest =
    async (
      requestId: string
    ) => {
      const confirmed =
        window.confirm(
          "Cancel this coverage request? Pending substitute offers will be withdrawn."
        );

      if (!confirmed) {
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

      setActionKey(
        `cancel:${requestId}`
      );

      setError("");
      setSuccess("");

      try {
        const {
          error:
            rpcError,
        } =
          await client.rpc(
            "cancel_faculty_coverage_request",
            {
              p_coverage_request_id:
                requestId,
            }
          );

        if (
          rpcError
        ) {
          throw rpcError;
        }

        setSuccess(
          "Coverage request cancelled and pending offers withdrawn."
        );

        await loadAll();
      } catch (
        cancelError
      ) {
        setError(
          errorMessage(
            cancelError
          )
        );
      } finally {
        setActionKey("");
      }
    };


  if (
    profile.role !==
    "Main Admin"
  ) {
    return null;
  }


  return (
    <section className="facultyCoverageControl">

      <header className="facultyCoverageControlHero">

        <div>
          <span>
            LIVE ECE COVERAGE
          </span>

          <h2>
            Coverage Control Center
          </h2>

          <p>
            Supervise date-specific substitute
            requests, eligible faculty matches and
            active class coverage. Permanent
            timetable entries are never changed
            by this workspace.
          </p>
        </div>

        <button
          type="button"
          className="facultyCoverageControlRefresh"
          disabled={loading}
          onClick={() =>
            void loadAll()
          }
        >
          {loading
            ? "Refreshing…"
            : "Refresh live data"}
        </button>

      </header>


      {(error ||
        success) && (
        <div
          className={
            error
              ? "facultyCoverageControlNotice error"
              : "facultyCoverageControlNotice success"
          }
        >
          {error ||
            success}
        </div>
      )}


      <section className="facultyCoverageControlMetrics">

        <button
          type="button"
          onClick={() =>
            setView(
              "active"
            )
          }
        >
          <span>OPEN</span>
          <strong>
            {metrics.open}
          </strong>
          <small>
            Awaiting matching
          </small>
        </button>

        <button
          type="button"
          onClick={() =>
            setView(
              "active"
            )
          }
        >
          <span>OFFERED</span>
          <strong>
            {metrics.offered}
          </strong>
          <small>
            Faculty responses pending
          </small>
        </button>

        <button
          type="button"
          onClick={() =>
            setView(
              "covered"
            )
          }
        >
          <span>COVERED</span>
          <strong>
            {metrics.covered}
          </strong>
          <small>
            Substitute assigned
          </small>
        </button>

        <button
          type="button"
          onClick={() =>
            setView(
              "attention"
            )
          }
        >
          <span>UNCOVERED</span>
          <strong>
            {metrics.uncovered}
          </strong>
          <small>
            Requires attention
          </small>
        </button>

      </section>


      <nav className="facultyCoverageControlTabs">

        <button
          type="button"
          className={
            view ===
            "attention"
              ? "active"
              : ""
          }
          onClick={() =>
            setView(
              "attention"
            )
          }
        >
          Needs attention
        </button>

        <button
          type="button"
          className={
            view ===
            "active"
              ? "active"
              : ""
          }
          onClick={() =>
            setView(
              "active"
            )
          }
        >
          Active requests
        </button>

        <button
          type="button"
          className={
            view ===
            "covered"
              ? "active"
              : ""
          }
          onClick={() =>
            setView(
              "covered"
            )
          }
        >
          Covered
        </button>

        <button
          type="button"
          className={
            view ===
            "history"
              ? "active"
              : ""
          }
          onClick={() =>
            setView(
              "history"
            )
          }
        >
          History
        </button>

      </nav>


      {loading ? (
        <div className="facultyCoverageControlEmpty">
          Loading ECE coverage operations…
        </div>
      ) : visibleRequests.length ===
        0 ? (
        <div className="facultyCoverageControlEmpty">
          No coverage requests in this view.
        </div>
      ) : (
        <div className="facultyCoverageControlRequestList">

          {visibleRequests.map(
            request => {
              const entry =
                entryById.get(
                  request.timetable_entry_id
                );

              const batch =
                entry
                  ? batchById.get(
                      entry.batch_id
                    )
                  : undefined;

              const subject =
                entry
                  ? subjectById.get(
                      entry.batch_subject_id
                    )
                  : undefined;

              const requestOffers =
                offersByRequest.get(
                  request.id
                ) || [];

              const substitution =
                overrideByRequest.get(
                  request.id
                );

              const pendingCount =
                requestOffers.filter(
                  item =>
                    item.status ===
                    "Pending"
                ).length;

              const canRetry =
                request.status ===
                  "Open" ||
                request.status ===
                  "Offered" ||
                request.status ===
                  "Uncovered";

              const canCancel =
                request.status !==
                  "Covered" &&
                request.status !==
                  "Cancelled";

              return (
                <article
                  key={
                    request.id
                  }
                  className={`facultyCoverageControlRequest ${statusClass(request.status)}`}
                >

                  <header className="facultyCoverageControlRequestHeader">

                    <div>
                      <span>
                        {batch?.batch_name ||
                          "ECE batch"}

                        {batch?.section
                          ? ` · Section ${batch.section}`
                          : ""}
                      </span>

                      <h3>
                        {subject?.subject_name ||
                          "Scheduled class"}
                      </h3>

                      <p>
                        {subject?.subject_code
                          ? `${subject.subject_code} · `
                          : ""}

                        {subject?.subject_type ||
                          entry?.class_type ||
                          "Class"}
                      </p>
                    </div>

                    <span
                      className={`facultyCoverageControlStatus ${statusClass(request.status)}`}
                    >
                      {
                        request.status
                      }
                    </span>

                  </header>


                  <div className="facultyCoverageControlClassGrid">

                    <div>
                      <small>
                        ORIGINAL FACULTY
                      </small>

                      <strong>
                        {entry?.faculty_name ||
                          "Faculty"}
                      </strong>
                    </div>

                    <div>
                      <small>
                        CLASS DATE
                      </small>

                      <strong>
                        {formatDate(
                          request.class_date
                        )}
                      </strong>
                    </div>

                    <div>
                      <small>
                        PERIOD
                      </small>

                      <strong>
                        {entry
                          ? `P${entry.period_order} · ${shortTime(entry.start_time)}–${shortTime(entry.end_time)}`
                          : "—"}
                      </strong>
                    </div>

                    <div>
                      <small>
                        ROOM
                      </small>

                      <strong>
                        {entry?.room ||
                          "Not specified"}
                      </strong>
                    </div>

                  </div>


                  {request.reason && (
                    <div className="facultyCoverageControlReason">
                      <small>
                        ADMINISTRATIVE NOTE
                      </small>

                      <p>
                        {request.reason}
                      </p>
                    </div>
                  )}


                  {substitution && (
                    <div className="facultyCoverageControlSubstitution">

                      <div>
                        <span>
                          ACTIVE SUBSTITUTE
                        </span>

                        <strong>
                          {substitution.substitute_faculty_name ||
                            "Assigned faculty"}
                        </strong>
                      </div>

                      <span
                        className={`facultyCoverageControlStatus ${statusClass(substitution.status)}`}
                      >
                        {
                          substitution.status
                        }
                      </span>

                    </div>
                  )}


                  <section className="facultyCoverageControlCandidates">

                    <header>
                      <div>
                        <span>
                          CANDIDATE MATCHING
                        </span>

                        <strong>
                          {requestOffers.length}
                          {" "}
                          {requestOffers.length ===
                          1
                            ? "candidate"
                            : "candidates"}
                        </strong>
                      </div>

                      <small>
                        {pendingCount}
                        {" pending"}
                      </small>
                    </header>


                    {requestOffers.length ===
                    0 ? (
                      <p className="facultyCoverageControlNoCandidates">
                        No candidate offers have been generated for this request.
                      </p>
                    ) : (
                      <div className="facultyCoverageControlCandidateList">

                        {requestOffers.map(
                          offer => (
                            <div
                              key={
                                offer.id
                              }
                              className="facultyCoverageControlCandidate"
                            >

                              <div className="facultyCoverageControlCandidateIdentity">

                                <span>
                                  {offer.candidate_faculty_name ||
                                    "Faculty"}
                                </span>

                                <small>
                                  {offer.match_reason ||
                                    "Eligible substitute"}
                                </small>

                              </div>

                              <div className="facultyCoverageControlCandidateScore">

                                <small>
                                  MATCH
                                </small>

                                <strong>
                                  {Number(
                                    offer.match_score ||
                                      0
                                  )}
                                </strong>

                              </div>

                              <span
                                className={`facultyCoverageControlStatus ${statusClass(offer.status)}`}
                              >
                                {
                                  offer.status
                                }
                              </span>

                            </div>
                          )
                        )}

                      </div>
                    )}

                  </section>


                  <footer className="facultyCoverageControlActions">

                    {canRetry && (
                      <button
                        type="button"
                        className="primary"
                        disabled={
                          Boolean(
                            actionKey
                          )
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
                              "Uncovered"
                            ? "Retry matching"
                            : "Regenerate matches"}
                      </button>
                    )}

                    {canCancel && (
                      <button
                        type="button"
                        className="danger"
                        disabled={
                          Boolean(
                            actionKey
                          )
                        }
                        onClick={() =>
                          void cancelRequest(
                            request.id
                          )
                        }
                      >
                        {actionKey ===
                        `cancel:${request.id}`
                          ? "Cancelling…"
                          : "Cancel request"}
                      </button>
                    )}

                    {request.status ===
                      "Covered" && (
                      <span className="facultyCoverageControlLocked">
                        Substitute acceptance is date-specific. Permanent timetable unchanged.
                      </span>
                    )}

                  </footer>

                </article>
              );
            }
          )}

        </div>
      )}

    </section>
  );
}
