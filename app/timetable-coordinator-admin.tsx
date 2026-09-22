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


type AdminProfile = {
  role?: string | null;
  name?: string | null;
  email?: string | null;
};


type TimetableCoordinatorAdminProps = {
  profile:
    AdminProfile;
};


type CoordinatorCandidate = {
  id: string;

  fullName: string;
  email: string;

  department: string;
  campusUid: string;
};


type ActiveAssignment = {
  id: string;

  department: string;

  coordinatorId: string;

  coordinatorName: string;
  coordinatorEmail: string;

  assignedAt: string;

  assignedBy: string;
};


type AdminPanelData = {
  departments: string[];

  coordinators:
    CoordinatorCandidate[];

  assignments:
    ActiveAssignment[];
};


const clean = (
  value: unknown
) =>
  String(
    value ??
    ""
  ).trim();


const normalizePanel = (
  input: unknown
): AdminPanelData => {

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


  const coordinators =
    Array.isArray(
      row.coordinators
    )
      ? row.coordinators
      : [];


  const assignments =
    Array.isArray(
      row.assignments
    )
      ? row.assignments
      : [];


  return {

    departments:
      departments
        .map(clean)
        .filter(Boolean),

    coordinators:
      coordinators.map(
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

            fullName:
              clean(
                value.fullName
              ),

            email:
              clean(
                value.email
              ),

            department:
              clean(
                value.department
              ),

            campusUid:
              clean(
                value.campusUid
              ),

          };
        }
      ),

    assignments:
      assignments.map(
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

            department:
              clean(
                value.department
              ),

            coordinatorId:
              clean(
                value.coordinatorId
              ),

            coordinatorName:
              clean(
                value.coordinatorName
              ),

            coordinatorEmail:
              clean(
                value.coordinatorEmail
              ),

            assignedAt:
              clean(
                value.assignedAt
              ),

            assignedBy:
              clean(
                value.assignedBy
              ),

          };
        }
      ),
  };
};


const coordinatorLabel = (
  coordinator:
    CoordinatorCandidate
) =>
  coordinator.fullName ||
  coordinator.email ||
  "Coordinator";


const formatDate = (
  value: string
) => {

  if (!value) {
    return "—";
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


export default function TimetableCoordinatorAdmin({
  profile,
}: TimetableCoordinatorAdminProps) {

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
    panel,
    setPanel,
  ] =
    useState<AdminPanelData>({
      departments: [],
      coordinators: [],
      assignments: [],
    });


  const [
    selectedDepartment,
    setSelectedDepartment,
  ] =
    useState("");


  const [
    selectedCoordinator,
    setSelectedCoordinator,
  ] =
    useState("");


  const [
    search,
    setSearch,
  ] =
    useState("");


  const load =
    useCallback(
      async (
        silent = false
      ) => {

        if (
          profile.role !==
          "Main Admin"
        ) {

          setError(
            "Main Admin permission required."
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
              loadError,
          } =
            await client.rpc(
              "get_timetable_coordinator_admin_panel"
            );


          if (
            loadError
          ) {
            throw loadError;
          }


          const normalized =
            normalizePanel(
              data
            );


          setPanel(
            normalized
          );


          setSelectedDepartment(
            current =>
              current ||
              normalized.departments[0] ||
              ""
          );

        } catch (
          caughtError
        ) {

          console.error(
            "[Timetable Coordinator Admin]",
            caughtError
          );


          setError(
            caughtError instanceof
              Error
              ? caughtError.message
              : "Unable to load Timetable Coordinator assignments."
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

      void load();

    },
    [
      load,
    ]
  );


  const assignmentByDepartment =
    useMemo(
      () =>
        new Map(
          panel.assignments.map(
            assignment => [
              assignment.department
                .trim()
                .toLowerCase(),

              assignment,
            ]
          )
        ),
      [
        panel.assignments,
      ]
    );


  const unassignedCount =
    panel.departments.filter(
      department =>
        !assignmentByDepartment.has(
          department
            .trim()
            .toLowerCase()
        )
    ).length;


  const normalizedSearch =
    search
      .trim()
      .toLowerCase();


  const filteredCoordinators =
    panel.coordinators.filter(
      coordinator => {

        if (
          !normalizedSearch
        ) {
          return true;
        }


        return [
          coordinator.fullName,
          coordinator.email,
          coordinator.department,
          coordinator.campusUid,
        ]
          .join(" ")
          .toLowerCase()
          .includes(
            normalizedSearch
          );
      }
    );


  const selectedCandidate =
    panel.coordinators.find(
      coordinator =>
        coordinator.id ===
        selectedCoordinator
    ) ||
    null;


  const selectedExistingAssignment =
    selectedDepartment
      ? assignmentByDepartment.get(
          selectedDepartment
            .trim()
            .toLowerCase()
        ) ||
        null
      : null;


  const assign =
    async () => {

      if (
        !selectedDepartment
      ) {

        setError(
          "Select a department."
        );

        return;
      }


      if (
        !selectedCoordinator
      ) {

        setError(
          "Select a Coordinator account."
        );

        return;
      }


      const candidate =
        panel.coordinators.find(
          coordinator =>
            coordinator.id ===
            selectedCoordinator
        );


      if (!candidate) {

        setError(
          "The selected Coordinator account is no longer available."
        );

        return;
      }


      const replacing =
        Boolean(
          selectedExistingAssignment &&
          selectedExistingAssignment
            .coordinatorId !==
            candidate.id
        );


      const confirmed =
        window.confirm(
          replacing
            ? `Replace the active Timetable Coordinator for ${selectedDepartment}?\n\n` +
              `${selectedExistingAssignment?.coordinatorName || "Current Coordinator"} → ${coordinatorLabel(candidate)}`
            : `Assign ${coordinatorLabel(candidate)} as Timetable Coordinator for ${selectedDepartment}?`
        );


      if (!confirmed) {
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
            assignmentError,
        } =
          await client.rpc(
            "set_timetable_coordinator_assignment",
            {
              p_department:
                selectedDepartment,

              p_coordinator_id:
                selectedCoordinator,
            }
          );


        if (
          assignmentError
        ) {
          throw assignmentError;
        }


        setSuccess(
          `${coordinatorLabel(candidate)} is now the active Timetable Coordinator for ${selectedDepartment}.`
        );


        setSelectedCoordinator(
          ""
        );


        await load(
          true
        );

      } catch (
        caughtError
      ) {

        setError(
          caughtError instanceof
            Error
              ? caughtError.message
              : "Unable to assign Timetable Coordinator."
        );

      } finally {

        setSaving(false);
      }
    };


  const unassign =
    async (
      assignment:
        ActiveAssignment
    ) => {

      const confirmed =
        window.confirm(
          `Remove Timetable Coordinator authority for ${assignment.department}?\n\n` +
          `${assignment.coordinatorName || assignment.coordinatorEmail} will lose Timetable Coordinator Studio access for this department.\n\n` +
          `Existing timetable history and published schedules will remain unchanged.`
        );


      if (!confirmed) {
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
            unassignError,
        } =
          await client.rpc(
            "set_timetable_coordinator_assignment",
            {
              p_department:
                assignment.department,

              p_coordinator_id:
                null,
            }
          );


        if (
          unassignError
        ) {
          throw unassignError;
        }


        setSuccess(
          `Timetable Coordinator authority removed from ${assignment.department}.`
        );


        await load(
          true
        );

      } catch (
        caughtError
      ) {

        setError(
          caughtError instanceof
            Error
              ? caughtError.message
              : "Unable to remove Timetable Coordinator."
        );

      } finally {

        setSaving(false);
      }
    };


  if (
    loading
  ) {

    return (
      <section className="timetableAdminConsole">

        <div className="timetableAdminSkeleton timetableAdminSkeletonHero" />

        <div className="timetableAdminSkeletonMetrics">

          {Array.from({
            length: 3,
          }).map(
            (
              _,
              index
            ) => (
              <div
                className="timetableAdminSkeleton timetableAdminSkeletonMetric"
                key={index}
              />
            )
          )}

        </div>

        <div className="timetableAdminSkeleton timetableAdminSkeletonBody" />

      </section>
    );
  }


  return (
    <section className="timetableAdminConsole">

      <header className="timetableAdminHero">

        <div>

          <div className="timetableAdminEyebrow">

            <span />

            MAIN ADMIN · TIMETABLE AUTHORITY

          </div>


          <h1>
            Timetable Coordinator Assignment
          </h1>


          <p>
            Assign one active Timetable Coordinator to each academic department.
            Coordinator authority is limited to timetable operations for the assigned department.
          </p>

        </div>


        <button
          type="button"
          disabled={
            refreshing
          }
          onClick={() =>
            void load(
              true
            )
          }
        >
          {refreshing
            ? "Refreshing…"
            : "Refresh"}
        </button>

      </header>


      {error && (
        <div
          className="timetableAdminAlert error"
          role="alert"
        >
          {error}
        </div>
      )}


      {success && (
        <div
          className="timetableAdminAlert success"
          role="status"
        >
          {success}
        </div>
      )}


      <section className="timetableAdminMetrics">

        <article>

          <span>
            Academic departments
          </span>

          <strong>
            {panel.departments.length}
          </strong>

          <small>
            Timetable-enabled departments
          </small>

        </article>


        <article>

          <span>
            Active assignments
          </span>

          <strong>
            {panel.assignments.length}
          </strong>

          <small>
            Department coordinators
          </small>

        </article>


        <article>

          <span>
            Awaiting assignment
          </span>

          <strong>
            {unassignedCount}
          </strong>

          <small>
            Departments without authority
          </small>

        </article>

      </section>


      <section className="timetableAdminGrid">

        <div className="timetableAdminAssignmentPanel">

          <header>

            <span>
              ASSIGN AUTHORITY
            </span>

            <h2>
              Choose department and Coordinator
            </h2>

            <p>
              Reassigning a department automatically deactivates its previous timetable assignment.
            </p>

          </header>


          <label className="timetableAdminField">

            <span>
              Department
            </span>


            <select
              value={
                selectedDepartment
              }
              onChange={
                event => {

                  setSelectedDepartment(
                    event.target.value
                  );

                  setSelectedCoordinator(
                    ""
                  );
                }
              }
            >

              <option value="">
                Select department
              </option>


              {panel.departments.map(
                department => (
                  <option
                    key={
                      department
                    }
                    value={
                      department
                    }
                  >
                    {department}
                  </option>
                )
              )}

            </select>

          </label>


          {selectedExistingAssignment && (
            <div className="timetableAdminCurrentAssignment">

              <span>
                CURRENT ASSIGNMENT
              </span>

              <strong>
                {selectedExistingAssignment.coordinatorName ||
                  selectedExistingAssignment.coordinatorEmail}
              </strong>

              <small>
                {selectedExistingAssignment.department}
                {" · "}
                assigned{" "}
                {formatDate(
                  selectedExistingAssignment.assignedAt
                )}
              </small>

            </div>
          )}


          <label className="timetableAdminSearch">

            <span aria-hidden="true">
              ⌕
            </span>

            <input
              type="search"
              value={
                search
              }
              placeholder="Search Coordinator by name, email or department…"
              onChange={
                event =>
                  setSearch(
                    event.target.value
                  )
              }
            />

          </label>


          <div className="timetableAdminCandidates">

            {filteredCoordinators.map(
              coordinator => {

                const selected =
                  coordinator.id ===
                  selectedCoordinator;


                return (
                  <button
                    type="button"
                    key={
                      coordinator.id
                    }
                    className={
                      selected
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setSelectedCoordinator(
                        coordinator.id
                      )
                    }
                  >

                    <span className="timetableAdminCandidateAvatar">
                      {coordinatorLabel(
                        coordinator
                      )
                        .slice(
                          0,
                          1
                        )
                        .toUpperCase()}
                    </span>


                    <div>

                      <strong>
                        {coordinatorLabel(
                          coordinator
                        )}
                      </strong>

                      <span>
                        {coordinator.email ||
                          coordinator.campusUid ||
                          "Coordinator"}
                      </span>

                      <small>
                        {coordinator.department ||
                          "Department not specified"}
                      </small>

                    </div>


                    <i>
                      {selected
                        ? "✓"
                        : ""}
                    </i>

                  </button>
                );
              }
            )}


            {!filteredCoordinators.length && (
              <div className="timetableAdminEmptyCandidates">

                <strong>
                  No Coordinator accounts found
                </strong>

                <p>
                  Create or change a staff account to the Coordinator role from Main Admin user management first.
                </p>

              </div>
            )}

          </div>


          <footer className="timetableAdminAssignFooter">

            <div>

              <strong>
                Department-scoped permission
              </strong>

              <span>
                This does not grant Main Admin permissions or global timetable configuration access.
              </span>

            </div>


            <button
              type="button"
              disabled={
                saving ||
                !selectedDepartment ||
                !selectedCoordinator
              }
              onClick={() =>
                void assign()
              }
            >
              {saving
                ? "Saving…"
                : selectedExistingAssignment
                  ? "Assign / Replace"
                  : "Assign Coordinator"}
            </button>

          </footer>

        </div>


        <div className="timetableAdminActivePanel">

          <header>

            <span>
              ACTIVE ASSIGNMENTS
            </span>

            <h2>
              Department control
            </h2>

            <p>
              One active Timetable Coordinator is permitted per department.
            </p>

          </header>


          <div className="timetableAdminAssignmentList">

            {panel.departments.map(
              department => {

                const assignment =
                  assignmentByDepartment.get(
                    department
                      .trim()
                      .toLowerCase()
                  );


                return (
                  <article
                    key={
                      department
                    }
                    className={
                      assignment
                        ? "assigned"
                        : "unassigned"
                    }
                  >

                    <div className="timetableAdminAssignmentTop">

                      <span>
                        {department}
                      </span>

                      <i>
                        {assignment
                          ? "Active"
                          : "Unassigned"}
                      </i>

                    </div>


                    {assignment ? (
                      <>

                        <strong>
                          {assignment.coordinatorName ||
                            assignment.coordinatorEmail}
                        </strong>

                        <small>
                          {assignment.coordinatorEmail}
                        </small>


                        <div className="timetableAdminAssignmentMeta">

                          <span>
                            Assigned{" "}
                            {formatDate(
                              assignment.assignedAt
                            )}
                          </span>

                        </div>


                        <footer>

                          <button
                            type="button"
                            onClick={() => {

                              setSelectedDepartment(
                                department
                              );

                              setSelectedCoordinator(
                                assignment.coordinatorId
                              );

                              window.scrollTo({
                                top: 0,
                                behavior: "smooth",
                              });
                            }}
                          >
                            Change
                          </button>


                          <button
                            type="button"
                            className="danger"
                            disabled={
                              saving
                            }
                            onClick={() =>
                              void unassign(
                                assignment
                              )
                            }
                          >
                            Remove authority
                          </button>

                        </footer>

                      </>
                    ) : (
                      <>

                        <strong>
                          No Timetable Coordinator
                        </strong>

                        <small>
                          Assign a Coordinator before department timetable operations can be managed.
                        </small>


                        <footer>

                          <button
                            type="button"
                            onClick={() => {

                              setSelectedDepartment(
                                department
                              );

                              window.scrollTo({
                                top: 0,
                                behavior: "smooth",
                              });
                            }}
                          >
                            Assign
                          </button>

                        </footer>

                      </>
                    )}

                  </article>
                );
              }
            )}

          </div>

        </div>

      </section>


      <section className="timetableAdminSecurity">

        <div>
          ✓
        </div>

        <div>

          <strong>
            Separation of authority
          </strong>

          <p>
            Main Admin controls who receives timetable authority. Assigned Coordinators manage timetable workflow only for their department. Faculty can request changes but cannot publish them directly.
          </p>

        </div>

      </section>

    </section>
  );
}
