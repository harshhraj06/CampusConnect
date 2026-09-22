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


type CoordinatorProfile = {
  role?: string | null;
  name?: string | null;
  email?: string | null;
};


type TimetableCoordinatorStudioProps = {
  profile:
    CoordinatorProfile;
};


type CoordinatorDepartment = {
  assignmentId: string;
  department: string;
  assignedAt: string;
};


type CoordinatorBatch = {
  id: string;

  batchName: string;
  section: string;

  department: string;

  academicYear: string;
  semester: string;

  publicationId:
    string |
    null;

  versionNumber: number;

  publishedAt:
    string |
    null;

  entryCount: number;
};


type CoordinatorWorkspace = {
  assigned: boolean;

  departments:
    CoordinatorDepartment[];

  batches:
    CoordinatorBatch[];

  requestSummary: {
    pending: number;
    reviewing: number;
    resolved: number;
  };
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


type CoordinatorRequest = {
  id: string;

  timetableEntryId:
    string |
    null;

  publicationId:
    string |
    null;

  batchId: string;
  batchSubjectId: string;

  facultyId:
    string |
    null;

  facultyName: string;

  batchName: string;
  section: string;
  department: string;

  subjectName: string;
  subjectCode: string;

  originalDayOfWeek: string;

  originalPeriodOrder:
    number;

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

  createdAt: string;

  updatedAt: string;

  alternatives:
    RequestAlternative[];
};


const clean = (
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


const formatTime = (
  value: string
) => {

  if (!value) {
    return "—";
  }


  const [
    h = "0",
    m = "0",
  ] =
    value.split(":");


  const hour =
    Number(h);


  const suffix =
    hour >= 12
      ? "PM"
      : "AM";


  return `${
    hour % 12 ||
    12
  }:${String(
    Number(m)
  ).padStart(
    2,
    "0"
  )} ${suffix}`;
};


const formatDate = (
  value:
    string |
    null
) => {

  if (!value) {
    return "Not published";
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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};


const displayName = (
  profile:
    CoordinatorProfile
) =>
  profile.name?.trim() ||
  profile.email
    ?.split("@")[0]
    ?.trim() ||
  "Coordinator";


const normalizeWorkspace = (
  input: unknown
): CoordinatorWorkspace => {

  const row =
    (
      input &&
      typeof input ===
        "object"
    )
      ? input as Record<
          string,
          unknown
        >
      : {};


  const departments =
    Array.isArray(
      row.departments
    )
      ? row.departments
      : [];


  const batches =
    Array.isArray(
      row.batches
    )
      ? row.batches
      : [];


  const summary =
    (
      row.requestSummary &&
      typeof row.requestSummary ===
        "object"
    )
      ? row.requestSummary as Record<
          string,
          unknown
        >
      : {};


  return {

    assigned:
      Boolean(
        row.assigned
      ),

    departments:
      departments.map(
        item => {

          const value =
            item as Record<
              string,
              unknown
            >;


          return {
            assignmentId:
              clean(
                value.assignmentId
              ),

            department:
              clean(
                value.department
              ),

            assignedAt:
              clean(
                value.assignedAt
              ),
          };
        }
      ),

    batches:
      batches.map(
        item => {

          const value =
            item as Record<
              string,
              unknown
            >;


          return {

            id:
              clean(
                value.id
              ),

            batchName:
              clean(
                value.batchName
              ),

            section:
              clean(
                value.section
              ),

            department:
              clean(
                value.department
              ),

            academicYear:
              clean(
                value.academicYear
              ),

            semester:
              clean(
                value.semester
              ),

            publicationId:
              clean(
                value.publicationId
              ) ||
              null,

            versionNumber:
              numberValue(
                value.versionNumber
              ),

            publishedAt:
              clean(
                value.publishedAt
              ) ||
              null,

            entryCount:
              numberValue(
                value.entryCount
              ),
          };
        }
      ),

    requestSummary: {

      pending:
        numberValue(
          summary.pending
        ),

      reviewing:
        numberValue(
          summary.reviewing
        ),

      resolved:
        numberValue(
          summary.resolved
        ),
    },
  };
};


const normalizeRequests = (
  input: unknown
): CoordinatorRequest[] => {

  if (
    !Array.isArray(input)
  ) {
    return [];
  }


  return input.map(
    item => {

      const row =
        item as Record<
          string,
          unknown
        >;


      const alternatives =
        Array.isArray(
          row.alternatives
        )
          ? row.alternatives
          : [];


      return {

        id:
          clean(row.id),

        timetableEntryId:
          clean(
            row.timetableEntryId
          ) ||
          null,

        publicationId:
          clean(
            row.publicationId
          ) ||
          null,

        batchId:
          clean(
            row.batchId
          ),

        batchSubjectId:
          clean(
            row.batchSubjectId
          ),

        facultyId:
          clean(
            row.facultyId
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
          numberValue(
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
          ) as CoordinatorRequest[
            "status"
          ],

        coordinatorNote:
          clean(
            row.coordinatorNote
          ),

        createdAt:
          clean(
            row.createdAt
          ),

        updatedAt:
          clean(
            row.updatedAt
          ),

        alternatives:
          alternatives.map(
            option => {

              const value =
                option as Record<
                  string,
                  unknown
                >;


              return {

                id:
                  clean(
                    value.id
                  ),

                dayOfWeek:
                  clean(
                    value.dayOfWeek
                  ),

                periodSlotId:
                  clean(
                    value.periodSlotId
                  ),

                periodOrder:
                  numberValue(
                    value.periodOrder
                  ),

                periodLabel:
                  clean(
                    value.periodLabel
                  ),

                startTime:
                  clean(
                    value.startTime
                  ),

                endTime:
                  clean(
                    value.endTime
                  ),
              };
            }
          ),
      };
    }
  );
};


export default function TimetableCoordinatorStudio({
  profile,
}: TimetableCoordinatorStudioProps) {

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
    workspace,
    setWorkspace,
  ] =
    useState<
      CoordinatorWorkspace
    >({
      assigned: false,

      departments: [],

      batches: [],

      requestSummary: {
        pending: 0,
        reviewing: 0,
        resolved: 0,
      },
    });


  const [
    requests,
    setRequests,
  ] =
    useState<
      CoordinatorRequest[]
    >([]);


  const [
    activeTab,
    setActiveTab,
  ] =
    useState<
      "overview" |
      "requests"
    >(
      "overview"
    );


  const [
    requestFilter,
    setRequestFilter,
  ] =
    useState<
      "Open" |
      "All"
    >(
      "Open"
    );


  const [
    selectedRequestId,
    setSelectedRequestId,
  ] =
    useState("");


  const [
    coordinatorNote,
    setCoordinatorNote,
  ] =
    useState("");


  const [
    selectedAlternativeId,
    setSelectedAlternativeId,
  ] =
    useState("");


  const loadWorkspace =
    useCallback(
      async (
        silent = false
      ) => {

        if (
          profile.role !==
          "Coordinator"
        ) {

          setError(
            "Timetable Coordinator Studio is available only to Coordinator accounts."
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
        setSuccess("");


        try {

          const [
            workspaceResult,
            requestResult,
          ] =
            await Promise.all([

              client.rpc(
                "get_my_timetable_coordinator_workspace"
              ),

              client.rpc(
                "get_coordinator_timetable_change_requests"
              ),

            ]);


          if (
            workspaceResult.error
          ) {
            throw workspaceResult.error;
          }


          if (
            requestResult.error
          ) {
            throw requestResult.error;
          }


          setWorkspace(
            normalizeWorkspace(
              workspaceResult.data
            )
          );


          setRequests(
            normalizeRequests(
              requestResult.data
            )
          );

        } catch (
          caughtError
        ) {

          console.error(
            "[Timetable Coordinator Studio]",
            caughtError
          );


          const message =
            (
              caughtError &&
              typeof caughtError ===
                "object" &&
              "message" in
                caughtError
            )
              ? String(
                  (
                    caughtError as {
                      message?: unknown;
                    }
                  ).message ||
                  "Unable to load Timetable Coordinator Studio."
                )
              : "Unable to load Timetable Coordinator Studio.";


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

      void loadWorkspace();

    },
    [
      loadWorkspace,
    ]
  );


  const visibleRequests =
    useMemo(
      () => {

        if (
          requestFilter ===
          "All"
        ) {
          return requests;
        }


        return requests.filter(
          request =>
            request.status ===
              "Pending" ||
            request.status ===
              "Reviewing"
        );
      },
      [
        requestFilter,
        requests,
      ]
    );


  const selectedRequest =
    requests.find(
      request =>
        request.id ===
        selectedRequestId
    ) ||
    null;


  useEffect(
    () => {

      if (!selectedRequest) {

        setCoordinatorNote("");

        return;
      }


      setCoordinatorNote(
        selectedRequest
          .coordinatorNote
      );

      setSelectedAlternativeId(
        ""
      );

    },
    [
      selectedRequestId,
      selectedRequest,
    ]
  );


  const reviewRequest =
    async (
      action:
        "Reviewing" |
        "Rejected"
    ) => {

      if (
        !selectedRequest
      ) {
        return;
      }


      if (
        action ===
          "Rejected" &&
        coordinatorNote
          .trim()
          .length < 3
      ) {

        setError(
          "Add a short coordinator note before rejecting the request."
        );

        return;
      }


      const client =
        getSupabaseClient();


      if (!client) {
        return;
      }


      setSaving(true);
      setError("");
      setSuccess("");


      try {

        const {
          error:
            reviewError,
        } =
          await client.rpc(
            "review_timetable_change_request",
            {
              p_request_id:
                selectedRequest.id,

              p_action:
                action,

              p_note:
                coordinatorNote
                  .trim(),
            }
          );


        if (
          reviewError
        ) {
          throw reviewError;
        }


        setSuccess(
          action ===
            "Rejected"
            ? "Request rejected. The published timetable was not changed."
            : "Request marked as Reviewing."
        );


        await loadWorkspace(
          true
        );


      } catch (
        reviewError
      ) {

        setError(
          reviewError instanceof
            Error
            ? reviewError.message
            : "Unable to update the timetable request."
        );

      } finally {

        setSaving(false);
      }
    };


  const applyReplacement =
    async () => {

      if (
        !selectedRequest
      ) {
        return;
      }


      if (
        !selectedAlternativeId
      ) {

        setError(
          "Select one Faculty-provided alternative before rebuilding the timetable."
        );

        return;
      }


      const selectedAlternative =
        selectedRequest
          .alternatives
          .find(
            option =>
              option.id ===
              selectedAlternativeId
          );


      if (
        !selectedAlternative
      ) {

        setError(
          "The selected alternative is no longer available."
        );

        return;
      }


      const confirmed =
        window.confirm(
          `Publish a new timetable version?\n\n` +
          `${selectedRequest.subjectCode || selectedRequest.subjectName}\n` +
          `${selectedRequest.originalDayOfWeek} ${formatTime(selectedRequest.originalStartTime)} → ` +
          `${selectedAlternative.dayOfWeek} ${formatTime(selectedAlternative.startTime)}\n\n` +
          `CampusConnect will clone the complete current timetable, move this class, run conflict checks and publish a new version.\n\n` +
          `The current version will remain preserved as Superseded.`
        );


      if (
        !confirmed
      ) {
        return;
      }


      const client =
        getSupabaseClient();


      if (
        !client
      ) {
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
          data,
          error:
            rebuildError,
        } =
          await client.rpc(
            "apply_timetable_change_request",
            {
              p_request_id:
                selectedRequest.id,

              p_option_id:
                selectedAlternativeId,

              p_note:
                coordinatorNote
                  .trim(),
            }
          );


        if (
          rebuildError
        ) {
          throw rebuildError;
        }


        const result =
          (
            data &&
            typeof data ===
              "object"
          )
            ? data as {
                versionNumber?: unknown;
                entryCount?: unknown;
              }
            : {};


        const version =
          numberValue(
            result.versionNumber
          );


        const count =
          numberValue(
            result.entryCount
          );


        setSuccess(
          `Timetable rebuilt successfully${
            version
              ? ` as Version ${version}`
              : ""
          }.${
            count
              ? ` ${count} periods published.`
              : ""
          }`
        );


        setSelectedAlternativeId(
          ""
        );


        await loadWorkspace(
          true
        );

      } catch (
        rebuildError
      ) {

        console.error(
          "[Coordinator timetable rebuild]",
          rebuildError
        );


        const message =
          (
            rebuildError &&
            typeof rebuildError ===
              "object" &&
            "message" in rebuildError
          )
            ? String(
                (
                  rebuildError as {
                    message?: unknown;
                  }
                ).message ||
                "Unable to rebuild timetable."
              )
            : "Unable to rebuild timetable.";


        setError(
          message
        );

      } finally {

        setSaving(false);
      }
    };


  const publishedBatches =
    workspace.batches.filter(
      batch =>
        Boolean(
          batch.publicationId
        )
    );


  const unpublishedBatches =
    workspace.batches.length -
    publishedBatches.length;


  if (
    loading
  ) {

    return (
      <section className="timetableCoordinatorStudio">

        <div className="timetableCoordinatorSkeleton timetableCoordinatorSkeletonHero" />

        <div className="timetableCoordinatorSkeletonMetrics">

          {Array.from({
            length: 4,
          }).map(
            (
              _,
              index
            ) => (
              <div
                key={index}
                className="timetableCoordinatorSkeleton timetableCoordinatorSkeletonMetric"
              />
            )
          )}

        </div>

        <div className="timetableCoordinatorSkeleton timetableCoordinatorSkeletonBody" />

      </section>
    );
  }


  if (
    !workspace.assigned &&
    !error
  ) {

    return (
      <section className="timetableCoordinatorStudio">

        <div className="timetableCoordinatorUnassigned">

          <div className="timetableCoordinatorUnassignedIcon">
            TC
          </div>

          <span>
            TIMETABLE COORDINATOR
          </span>

          <h1>
            Assignment required
          </h1>

          <p>
            Your account has the Coordinator role, but Main Admin has not assigned you as the active Timetable Coordinator for a department yet.
          </p>

          <div>
            Main Admin must assign the timetable department before timetable requests or batch schedules become visible here.
          </div>

        </div>

      </section>
    );
  }


  return (
    <section className="timetableCoordinatorStudio">

      <header className="timetableCoordinatorHero">

        <div>

          <div className="timetableCoordinatorEyebrow">

            <span />

            TIMETABLE CONTROL PLANE

          </div>


          <h1>
            Timetable Coordinator Studio
          </h1>


          <p>
            Review faculty schedule conflicts, monitor published batch timetables and prepare safe timetable rebuilds without exposing global academic configuration.
          </p>

        </div>


        <div className="timetableCoordinatorHeroActions">

          <div className="timetableCoordinatorIdentity">

            <span>
              TC
            </span>

            <div>

              <strong>
                {displayName(
                  profile
                )}
              </strong>

              <small>
                Active coordinator
              </small>

            </div>

          </div>


          <button
            type="button"
            disabled={
              refreshing
            }
            onClick={() =>
              void loadWorkspace(
                true
              )
            }
          >
            {refreshing
              ? "Refreshing…"
              : "Refresh"}
          </button>

        </div>

      </header>


      {error && (
        <div
          className="timetableCoordinatorAlert error"
          role="alert"
        >
          {error}
        </div>
      )}


      {success && (
        <div
          className="timetableCoordinatorAlert success"
          role="status"
        >
          {success}
        </div>
      )}


      <section
        className="timetableCoordinatorMetrics"
        aria-label="Timetable coordinator summary"
      >

        <article>

          <span>
            Assigned departments
          </span>

          <strong>
            {workspace
              .departments
              .length}
          </strong>

          <small>
            Department-scoped control
          </small>

        </article>


        <article>

          <span>
            Published batches
          </span>

          <strong>
            {publishedBatches.length}
          </strong>

          <small>
            {unpublishedBatches
              ? `${unpublishedBatches} awaiting timetable`
              : "All assigned batches published"}
          </small>

        </article>


        <article>

          <span>
            Pending requests
          </span>

          <strong>
            {workspace
              .requestSummary
              .pending}
          </strong>

          <small>
            Faculty awaiting review
          </small>

        </article>


        <article>

          <span>
            Reviewing
          </span>

          <strong>
            {workspace
              .requestSummary
              .reviewing}
          </strong>

          <small>
            Active timetable cases
          </small>

        </article>

      </section>


      <section className="timetableCoordinatorScope">

        <div>

          <span>
            YOUR CONTROL SCOPE
          </span>

          <h2>
            Assigned departments
          </h2>

        </div>


        <div className="timetableCoordinatorDepartmentTags">

          {workspace
            .departments
            .map(
              department => (
                <span
                  key={
                    department.assignmentId
                  }
                >
                  {department.department}
                </span>
              )
            )}

        </div>

      </section>


      <nav className="timetableCoordinatorTabs">

        <button
          type="button"
          className={
            activeTab ===
            "overview"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "overview"
            )
          }
        >
          Overview
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
          Change requests

          {workspace
            .requestSummary
            .pending >
            0 && (
            <span>
              {workspace
                .requestSummary
                .pending}
            </span>
          )}

        </button>

      </nav>


      {activeTab ===
        "overview" && (
        <>

          <section className="timetableCoordinatorPanel">

            <header>

              <div>

                <span>
                  PUBLISHED TIMETABLES
                </span>

                <h2>
                  Batch schedule health
                </h2>

                <p>
                  Every batch keeps its current published version while the next timetable is prepared separately.
                </p>

              </div>

            </header>


            <div className="timetableCoordinatorBatchGrid">

              {workspace.batches.map(
                batch => (
                  <article
                    key={
                      batch.id
                    }
                    className={
                      batch.publicationId
                        ? "published"
                        : "unpublished"
                    }
                  >

                    <div className="timetableCoordinatorBatchTop">

                      <span>
                        {batch.department}
                      </span>

                      <i>
                        {batch.publicationId
                          ? "Published"
                          : "No timetable"}
                      </i>

                    </div>


                    <h3>
                      {batch.batchName}

                      {batch.section
                        ? ` · Section ${batch.section}`
                        : ""}
                    </h3>


                    <p>
                      {batch.academicYear ||
                        "Academic year"}

                      {batch.semester
                        ? ` · Semester ${batch.semester}`
                        : ""}
                    </p>


                    <div className="timetableCoordinatorBatchMeta">

                      <div>

                        <span>
                          VERSION
                        </span>

                        <strong>
                          {batch.versionNumber
                            ? `v${batch.versionNumber}`
                            : "—"}
                        </strong>

                      </div>


                      <div>

                        <span>
                          PERIODS
                        </span>

                        <strong>
                          {batch.entryCount}
                        </strong>

                      </div>

                    </div>


                    <footer>

                      <span>
                        {formatDate(
                          batch.publishedAt
                        )}
                      </span>

                      <button
                        type="button"
                        disabled
                        title="Safe rebuild and publishing will be enabled after the Coordinator publication cutover."
                      >
                        Rebuild
                      </button>

                    </footer>

                  </article>
                )
              )}

            </div>


            {!workspace
              .batches
              .length && (
              <div className="timetableCoordinatorEmpty">

                <strong>
                  No batches found
                </strong>

                <p>
                  There are no academic batches in your assigned timetable department.
                </p>

              </div>
            )}

          </section>


          <section className="timetableCoordinatorSafety">

            <div>
              ✓
            </div>

            <div>

              <strong>
                Safe publication boundary
              </strong>

              <p>
                This Studio can review requests now, but it cannot yet modify the published timetable. Rebuild and publish stay locked until the versioned publication RPC is safely transferred to department-scoped coordinator authorization.
              </p>

            </div>

          </section>

        </>
      )}


      {activeTab ===
        "requests" && (
        <section className="timetableCoordinatorRequests">

          <div className="timetableCoordinatorRequestList">

            <header>

              <div>

                <span>
                  FACULTY REQUESTS
                </span>

                <h2>
                  Schedule conflicts
                </h2>

              </div>


              <div className="timetableCoordinatorRequestFilter">

                <button
                  type="button"
                  className={
                    requestFilter ===
                    "Open"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setRequestFilter(
                      "Open"
                    )
                  }
                >
                  Open
                </button>


                <button
                  type="button"
                  className={
                    requestFilter ===
                    "All"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setRequestFilter(
                      "All"
                    )
                  }
                >
                  All
                </button>

              </div>

            </header>


            <div>

              {visibleRequests.map(
                request => (
                  <button
                    type="button"
                    key={
                      request.id
                    }
                    className={
                      selectedRequestId ===
                      request.id
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSelectedRequestId(
                        request.id
                      )
                    }
                  >

                    <div>

                      <span
                        className={
                          "status " +
                          request.status
                            .toLowerCase()
                        }
                      >
                        {request.status}
                      </span>

                      <small>
                        {request.department}
                      </small>

                    </div>


                    <strong>
                      {request.subjectCode ||
                        "Subject"}

                      {" · "}

                      {request.subjectName}
                    </strong>


                    <span>
                      {request.facultyName ||
                        "Faculty"}

                      {" · "}

                      {request.batchName}

                      {request.section
                        ? ` ${request.section}`
                        : ""}
                    </span>


                    <small>
                      {request.originalDayOfWeek}
                      {" · "}
                      {formatTime(
                        request.originalStartTime
                      )}
                      {" – "}
                      {formatTime(
                        request.originalEndTime
                      )}
                    </small>

                  </button>
                )
              )}


              {!visibleRequests.length && (
                <div className="timetableCoordinatorRequestEmpty">

                  <strong>
                    No requests in this view
                  </strong>

                  <span>
                    New faculty timetable requests will appear here automatically.
                  </span>

                </div>
              )}

            </div>

          </div>


          <div className="timetableCoordinatorRequestDetail">

            {selectedRequest ? (
              <>

                <header>

                  <div>

                    <span>
                      REQUEST DETAIL
                    </span>

                    <h2>
                      {selectedRequest.subjectCode &&
                        `${selectedRequest.subjectCode} · `}

                      {selectedRequest.subjectName}
                    </h2>

                    <p>
                      {selectedRequest.facultyName}
                      {" · "}
                      {selectedRequest.batchName}

                      {selectedRequest.section
                        ? ` · Section ${selectedRequest.section}`
                        : ""}
                    </p>

                  </div>


                  <span
                    className={
                      "timetableCoordinatorRequestStatus " +
                      selectedRequest.status
                        .toLowerCase()
                    }
                  >
                    {selectedRequest.status}
                  </span>

                </header>


                <section className="timetableCoordinatorOriginalClass">

                  <span>
                    CURRENT PUBLISHED CLASS
                  </span>


                  <div>

                    <strong>
                      {selectedRequest.originalDayOfWeek}
                    </strong>

                    <span>
                      {formatTime(
                        selectedRequest.originalStartTime
                      )}
                      {" – "}
                      {formatTime(
                        selectedRequest.originalEndTime
                      )}
                    </span>

                    <small>
                      {selectedRequest.originalRoom ||
                        "Room not assigned"}

                      {" · "}

                      {selectedRequest.originalClassType ||
                        "Class"}
                    </small>

                  </div>

                </section>


                <section className="timetableCoordinatorReason">

                  <span>
                    FACULTY REASON
                  </span>

                  <p>
                    {selectedRequest.reason}
                  </p>

                </section>


                <section className="timetableCoordinatorAlternatives">

                  <span>
                    FACULTY AVAILABLE TIMES
                  </span>


                  <div>

                    {selectedRequest
                      .alternatives
                      .map(
                        (
                          option,
                          index
                        ) => (
                          <button
                            type="button"
                            key={
                              option.id ||
                              `${selectedRequest.id}-${index}`
                            }
                            className={
                              option.id &&
                              selectedAlternativeId ===
                                option.id
                                ? "selected"
                                : ""
                            }
                            aria-pressed={
                              Boolean(
                                option.id &&
                                selectedAlternativeId ===
                                  option.id
                              )
                            }
                            disabled={
                              !option.id ||
                              saving
                            }
                            onClick={() =>
                              setSelectedAlternativeId(
                                option.id ||
                                ""
                              )
                            }
                          >

                            <strong>
                              {option.dayOfWeek}
                            </strong>

                            <span>
                              {option.periodLabel ||
                                `P${option.periodOrder}`}
                            </span>

                            <small>
                              {formatTime(
                                option.startTime
                              )}
                              {" – "}
                              {formatTime(
                                option.endTime
                              )}
                            </small>

                            <i>
                              {option.id &&
                              selectedAlternativeId ===
                                option.id
                                ? "✓ Selected"
                                : "Select"}
                            </i>

                          </button>
                        )
                      )}

                  </div>

                </section>


                <section className="timetableCoordinatorNote">

                  <label htmlFor="timetable-coordinator-note">
                    Coordinator note
                  </label>

                  <textarea
                    id="timetable-coordinator-note"
                    value={
                      coordinatorNote
                    }
                    maxLength={
                      2000
                    }
                    placeholder="Add review context, rejection reason, or scheduling notes…"
                    disabled={
                      !(
                        selectedRequest.status ===
                          "Pending" ||
                        selectedRequest.status ===
                          "Reviewing"
                      )
                    }
                    onChange={
                      event =>
                        setCoordinatorNote(
                          event.target.value
                        )
                    }
                  />

                  <small>
                    {coordinatorNote.length}/2000
                  </small>

                </section>


                {(
                  selectedRequest.status ===
                    "Pending" ||
                  selectedRequest.status ===
                    "Reviewing"
                ) && (
                  <footer className="timetableCoordinatorRequestActions">

                    <button
                      type="button"
                      className="secondary"
                      disabled={
                        saving ||
                        selectedRequest.status ===
                          "Reviewing"
                      }
                      onClick={() =>
                        void reviewRequest(
                          "Reviewing"
                        )
                      }
                    >
                      {selectedRequest.status ===
                        "Reviewing"
                        ? "Reviewing"
                        : "Mark reviewing"}
                    </button>


                    <button
                      type="button"
                      className="danger"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        void reviewRequest(
                          "Rejected"
                        )
                      }
                    >
                      Reject request
                    </button>


                    <button
                      type="button"
                      className="primary"
                      disabled={
                        saving ||
                        !selectedAlternativeId
                      }
                      title={
                        selectedAlternativeId
                          ? "Clone, validate and publish a new timetable version."
                          : "Select one Faculty-provided alternative first."
                      }
                      onClick={() =>
                        void applyReplacement()
                      }
                    >
                      {saving
                        ? "Publishing…"
                        : "Build replacement"}
                    </button>

                  </footer>
                )}

              </>
            ) : (
              <div className="timetableCoordinatorDetailEmpty">

                <div>
                  ↗
                </div>

                <h3>
                  Select a faculty request
                </h3>

                <p>
                  Review the class conflict, faculty reason and proposed available time slots here.
                </p>

              </div>
            )}

          </div>

        </section>
      )}

    </section>
  );
}
