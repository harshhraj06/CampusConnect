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


type FacultyWorkspaceProfile = {
  name: string;
  email: string;
  department: string;
  role: string;
  campus_uid?: string;
  usn?: string;
  avatar_url?: string;
};


type FacultyBatch = {
  id: string;
  batch_name: string;
  section: string;
  department: string;
  academic_year: string;
  semester: string;
  total_students: number;
};


type FacultySubject = {
  id: string;
  batch_id: string;
  subject_name: string;
  subject_code: string;
  subject_type: string;
  credits: number | null;
  faculty_id: string;
  faculty_name: string;
};


type FacultyAllocation = {
  id: string;
  batch_id: string;
  batch_subject_id: string;
  faculty_id: string;
  faculty_name: string;
  allocation_type: string;
  subgroup: string;
  weekly_hours: number;
  session_length_periods: number;
  is_primary: boolean;
  status: string;
};


type FacultyBatchWorkspace = {
  batch: FacultyBatch;
  subjects: Array<{
    subject: FacultySubject;
    allocation: FacultyAllocation | null;
  }>;
  weeklyPeriods: number;
  labPeriods: number;
};


type FacultyWorkspaceProps = {
  mode: "dashboard" | "batches";

  profile: FacultyWorkspaceProfile;

  onOpenMyBatches: () => void;
  onOpenTodayClasses: () => void;
  onOpenAttendance: () => void;
  onOpenSyllabusProgress: () => void;
  onOpenAssignments: () => void;
  onOpenLearning: () => void;
  onOpenAcademics: () => void;
};


const displayName = (
  profile: FacultyWorkspaceProfile
) =>
  profile.name?.trim() ||
  profile.email?.split("@")[0] ||
  "Faculty";


const cleanText = (
  value: unknown
) =>
  String(value ?? "").trim();


export default function FacultyWorkspace({
  mode,
  profile,
  onOpenMyBatches,
  onOpenTodayClasses,
  onOpenAttendance,
  onOpenSyllabusProgress,
  onOpenAssignments,
  onOpenLearning,
  onOpenAcademics,
}: FacultyWorkspaceProps) {

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    batches,
    setBatches,
  ] = useState<FacultyBatch[]>([]);

  const [
    subjects,
    setSubjects,
  ] = useState<FacultySubject[]>([]);

  const [
    allocations,
    setAllocations,
  ] = useState<FacultyAllocation[]>([]);


  const loadWorkspace =
    useCallback(
      async () => {

        if (
          profile.role !==
          "Faculty"
        ) {
          setError(
            "Faculty workspace is available to Faculty accounts."
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
              "Your session is unavailable."
            );
          }


          const userId =
            auth.user.id;


          /*
           * Access can currently originate from either:
           *
           * 1. faculty_teaching_allocations
           * 2. attendance_batch_subjects.faculty_id
           *
           * This keeps the Faculty Workspace compatible with
           * both the newer workload engine and older direct
           * faculty subject assignments.
           */

          const [
            allocationResult,
            directSubjectResult,
          ] =
            await Promise.all([

              client
                .from(
                  "faculty_teaching_allocations"
                )
                .select(
                  "id,batch_id,batch_subject_id,faculty_id,faculty_name,allocation_type,subgroup,weekly_hours,session_length_periods,is_primary,status"
                )
                .eq(
                  "faculty_id",
                  userId
                )
                .eq(
                  "status",
                  "Active"
                )
                .order(
                  "faculty_name",
                  {
                    ascending: true,
                  }
                ),

              client
                .from(
                  "attendance_batch_subjects"
                )
                .select(
                  "id,batch_id,subject_name,subject_code,subject_type,credits,faculty_id,faculty_name"
                )
                .eq(
                  "faculty_id",
                  userId
                )
                .order(
                  "subject_name",
                  {
                    ascending: true,
                  }
                ),
            ]);


          if (
            allocationResult.error
          ) {
            throw allocationResult.error;
          }


          if (
            directSubjectResult.error
          ) {
            throw directSubjectResult.error;
          }


          const nextAllocations =
            (
              allocationResult.data ||
              []
            ) as FacultyAllocation[];


          const directSubjects =
            (
              directSubjectResult.data ||
              []
            ) as FacultySubject[];


          const allocationSubjectIds =
            Array.from(
              new Set(
                nextAllocations
                  .map(
                    item =>
                      item.batch_subject_id
                  )
                  .filter(Boolean)
              )
            );


          let allocationSubjects:
            FacultySubject[] = [];


          if (
            allocationSubjectIds.length >
            0
          ) {

            const {
              data,
              error:
                allocationSubjectError,
            } =
              await client
                .from(
                  "attendance_batch_subjects"
                )
                .select(
                  "id,batch_id,subject_name,subject_code,subject_type,credits,faculty_id,faculty_name"
                )
                .in(
                  "id",
                  allocationSubjectIds
                )
                .order(
                  "subject_name",
                  {
                    ascending: true,
                  }
                );


            if (
              allocationSubjectError
            ) {
              throw allocationSubjectError;
            }


            allocationSubjects =
              (
                data ||
                []
              ) as FacultySubject[];
          }


          const subjectMap =
            new Map<
              string,
              FacultySubject
            >();


          [
            ...directSubjects,
            ...allocationSubjects,
          ].forEach(
            subject => {
              subjectMap.set(
                subject.id,
                subject
              );
            }
          );


          const nextSubjects =
            Array.from(
              subjectMap.values()
            );


          const batchIds =
            Array.from(
              new Set([
                ...nextAllocations.map(
                  item =>
                    item.batch_id
                ),

                ...nextSubjects.map(
                  item =>
                    item.batch_id
                ),
              ].filter(Boolean))
            );


          let nextBatches:
            FacultyBatch[] = [];


          if (
            batchIds.length >
            0
          ) {

            const {
              data,
              error:
                batchError,
            } =
              await client
                .from(
                  "attendance_batches"
                )
                .select(
                  "id,batch_name,section,department,academic_year,semester,total_students"
                )
                .in(
                  "id",
                  batchIds
                )
                .order(
                  "batch_name",
                  {
                    ascending: true,
                  }
                );


            if (batchError) {
              throw batchError;
            }


            nextBatches =
              (
                data ||
                []
              ) as FacultyBatch[];
          }


          setAllocations(
            nextAllocations
          );

          setSubjects(
            nextSubjects
          );

          setBatches(
            nextBatches
          );

        } catch (
          caughtError
        ) {

          console.error(
            "[Faculty Workspace]",
            caughtError
          );

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load your assigned faculty workspace."
          );

        } finally {

          setLoading(false);

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


  const workspaces =
    useMemo<
      FacultyBatchWorkspace[]
    >(
      () =>
        batches
          .map(
            batch => {

              const batchAllocations =
                allocations.filter(
                  item =>
                    item.batch_id ===
                    batch.id
                );


              const allocationBySubject =
                new Map<
                  string,
                  FacultyAllocation
                >();


              batchAllocations.forEach(
                allocation => {
                  allocationBySubject.set(
                    allocation.batch_subject_id,
                    allocation
                  );
                }
              );


              const batchSubjects =
                subjects
                  .filter(
                    subject =>
                      subject.batch_id ===
                      batch.id
                  )
                  .map(
                    subject => ({
                      subject,
                      allocation:
                        allocationBySubject.get(
                          subject.id
                        ) || null,
                    })
                  );


              const weeklyPeriods =
                batchAllocations.reduce(
                  (
                    total,
                    allocation
                  ) =>
                    total +
                    Number(
                      allocation.weekly_hours ||
                      0
                    ),
                  0
                );


              const labPeriods =
                batchAllocations
                  .filter(
                    allocation =>
                      allocation
                        .allocation_type
                        .toLowerCase() ===
                        "lab"
                  )
                  .reduce(
                    (
                      total,
                      allocation
                    ) =>
                      total +
                      Number(
                        allocation.weekly_hours ||
                        0
                      ),
                    0
                  );


              return {
                batch,
                subjects:
                  batchSubjects,
                weeklyPeriods,
                labPeriods,
              };
            }
          )
          .sort(
            (a, b) =>
              a.batch.batch_name
                .localeCompare(
                  b.batch.batch_name
                )
          ),
      [
        batches,
        subjects,
        allocations,
      ]
    );


  const totalSubjects =
    useMemo(
      () =>
        new Set(
          workspaces.flatMap(
            workspace =>
              workspace.subjects.map(
                item =>
                  item.subject.id
              )
          )
        ).size,
      [
        workspaces,
      ]
    );


  const weeklyPeriods =
    useMemo(
      () =>
        allocations.reduce(
          (
            total,
            allocation
          ) =>
            total +
            Number(
              allocation.weekly_hours ||
              0
            ),
          0
        ),
      [
        allocations,
      ]
    );


  const labAllocations =
    useMemo(
      () =>
        allocations.filter(
          allocation =>
            allocation
              .allocation_type
              .toLowerCase() ===
              "lab"
        ).length,
      [
        allocations,
      ]
    );


  const openFacultyView =
    (target: string) => {

      if (
        typeof window ===
        "undefined"
      ) {
        return;
      }

      window.dispatchEvent(
        new CustomEvent(
          "campus-navigate",
          {
            detail:
              target,
          }
        )
      );
    };


  if (
    profile.role !==
    "Faculty"
  ) {
    return (
      <section className="facultyWorkspace">
        <div className="facultyWorkspaceEmpty">
          <strong>
            Faculty access required
          </strong>

          <p>
            This workspace is reserved for authenticated faculty accounts.
          </p>
        </div>
      </section>
    );
  }


  return (
    <section className="facultyWorkspace">

      <header className="facultyWorkspaceHero">

        <div>

          <span className="facultyWorkspaceEyebrow">
            FACULTY WORKSPACE
          </span>

          <h1>
            {mode === "batches"
              ? "My Batches"
              : `Welcome, ${displayName(
                  profile
                )}`}
          </h1>

          <p>
            {mode === "batches"
              ? "Only batches assigned to your faculty account are shown here."
              : "Manage today's teaching, students, academic progress and faculty responsibilities from one focused workspace."}
          </p>

        </div>


        <div className="facultyWorkspaceIdentity">

          {profile.avatar_url ? (
            <img
              src={
                profile.avatar_url
              }
              alt=""
            />
          ) : (
            <i>
              {displayName(
                profile
              )
                .charAt(0)
                .toUpperCase()}
            </i>
          )}

          <div>
            <strong>
              {displayName(
                profile
              )}
            </strong>

            <span>
              {cleanText(
                profile.department
              ) || "Faculty"}

              {profile.campus_uid
                ? ` · ${profile.campus_uid}`
                : ""}
            </span>
          </div>

        </div>

      </header>


      {error && (
        <div
          className="facultyWorkspaceMessage error"
          role="alert"
        >
          {error}

          <button
            type="button"
            onClick={() =>
              void loadWorkspace()
            }
          >
            Retry
          </button>
        </div>
      )}


      {loading ? (
        <div className="facultyWorkspaceLoading">
          <span />
          Loading your assigned academic workspace...
        </div>
      ) : mode === "dashboard" ? (
        <>

          <section className="facultyWorkspaceMetrics">

            <article>
              <span>
                ASSIGNED BATCHES
              </span>

              <strong>
                {workspaces.length}
              </strong>

              <small>
                Available through your faculty assignments
              </small>
            </article>


            <article>
              <span>
                MY SUBJECTS
              </span>

              <strong>
                {totalSubjects}
              </strong>

              <small>
                Subjects currently linked to your account
              </small>
            </article>


            <article>
              <span>
                WEEKLY PERIODS
              </span>

              <strong>
                {weeklyPeriods}
              </strong>

              <small>
                Active workload allocation
              </small>
            </article>


            <article>
              <span>
                LAB ALLOCATIONS
              </span>

              <strong>
                {labAllocations}
              </strong>

              <small>
                Active laboratory teaching allocations
              </small>
            </article>

          </section>


          <section className="facultyWorkspaceSection facultyWorkspaceCommandCenter">

            <header className="facultyWorkspaceCommandHeader">

              <div>

                <span>
                  FACULTY COMMAND CENTER
                </span>

                <h2>
                  Your academic work, organized.
                </h2>

                <p>
                  Start with today's teaching, continue with student and academic work, then open supporting faculty tools when needed.
                </p>

              </div>


              <div className="facultyWorkspaceCommandStatus">

                <i />

                <span>

                  <strong>
                    Live workspace
                  </strong>

                  <small>
                    Based on your current Faculty access
                  </small>

                </span>

              </div>

            </header>


            <div className="facultyWorkspaceToolGroups">

              <article className="facultyWorkspaceToolGroup primary">

                <header>

                  <div className="facultyWorkspaceGroupIndex">
                    01
                  </div>

                  <div>

                    <span>
                      TEACHING
                    </span>

                    <h3>
                      Today &amp; schedule
                    </h3>

                    <p>
                      Prepare for classes and manage your published teaching schedule.
                    </p>

                  </div>

                </header>


                <div className="facultyWorkspaceGroupActions">

                  <button
                    type="button"
                    className="featured"
                    onClick={
                      onOpenTodayClasses
                    }
                  >

                    <i>
                      TC
                    </i>

                    <span>

                      <strong>
                        Today's Classes
                      </strong>

                      <small>
                        See today's classes from the published timetable.
                      </small>

                    </span>

                    <b>→</b>

                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      openFacultyView(
                        "My Teaching Schedule"
                      )
                    }
                  >

                    <i>
                      TS
                    </i>

                    <span>

                      <strong>
                        Teaching Schedule
                      </strong>

                      <small>
                        Open your complete published teaching timetable.
                      </small>

                    </span>

                    <b>→</b>

                  </button>


                  <button
                    type="button"
                    onClick={
                      onOpenMyBatches
                    }
                  >

                    <i>
                      MB
                    </i>

                    <span>

                      <strong>
                        My Batches
                      </strong>

                      <small>
                        View batches and subjects assigned to you.
                      </small>

                    </span>

                    <b>→</b>

                  </button>

                </div>

              </article>


              <article className="facultyWorkspaceToolGroup">

                <header>

                  <div className="facultyWorkspaceGroupIndex">
                    02
                  </div>

                  <div>

                    <span>
                      ACADEMIC WORK
                    </span>

                    <h3>
                      Students &amp; delivery
                    </h3>

                    <p>
                      Keep attendance, coursework and teaching progress current.
                    </p>

                  </div>

                </header>


                <div className="facultyWorkspaceGroupActions">

                  <button
                    type="button"
                    onClick={
                      onOpenAttendance
                    }
                  >

                    <i>
                      AT
                    </i>

                    <span>

                      <strong>
                        Attendance
                      </strong>

                      <small>
                        Record and review attendance for your classes.
                      </small>

                    </span>

                    <b>→</b>

                  </button>


                  <button
                    type="button"
                    onClick={
                      onOpenSyllabusProgress
                    }
                  >

                    <i>
                      SP
                    </i>

                    <span>

                      <strong>
                        Syllabus Progress
                      </strong>

                      <small>
                        Track unit and topic completion.
                      </small>

                    </span>

                    <b>→</b>

                  </button>


                  <button
                    type="button"
                    onClick={
                      onOpenAssignments
                    }
                  >

                    <i>
                      AS
                    </i>

                    <span>

                      <strong>
                        Assignments
                      </strong>

                      <small>
                        Create coursework and review completion.
                      </small>

                    </span>

                    <b>→</b>

                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      openFacultyView(
                        "Faculty Diary"
                      )
                    }
                  >

                    <i>
                      DY
                    </i>

                    <span>

                      <strong>
                        Faculty Diary
                      </strong>

                      <small>
                        Maintain your teaching and academic activity record.
                      </small>

                    </span>

                    <b>→</b>

                  </button>

                </div>

              </article>


              <article className="facultyWorkspaceToolGroup">

                <header>

                  <div className="facultyWorkspaceGroupIndex">
                    03
                  </div>

                  <div>

                    <span>
                      RESOURCES
                    </span>

                    <h3>
                      Academic support
                    </h3>

                    <p>
                      Reach learning material, academic tools and Faculty contacts.
                    </p>

                  </div>

                </header>


                <div className="facultyWorkspaceGroupActions">

                  <button
                    type="button"
                    onClick={
                      onOpenLearning
                    }
                  >

                    <i>
                      LR
                    </i>

                    <span>

                      <strong>
                        Learning Resources
                      </strong>

                      <small>
                        Manage verified teaching and learning material.
                      </small>

                    </span>

                    <b>→</b>

                  </button>


                  <button
                    type="button"
                    onClick={
                      onOpenAcademics
                    }
                  >

                    <i>
                      AC
                    </i>

                    <span>

                      <strong>
                        Academic Tools
                      </strong>

                      <small>
                        Open Faculty-facing academic management tools.
                      </small>

                    </span>

                    <b>→</b>

                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      openFacultyView(
                        "Faculty Directory"
                      )
                    }
                  >

                    <i>
                      DR
                    </i>

                    <span>

                      <strong>
                        Faculty Directory
                      </strong>

                      <small>
                        Find verified Faculty members across campus.
                      </small>

                    </span>

                    <b>→</b>

                  </button>

                </div>

              </article>

            </div>

          </section>


          <section className="facultyWorkspaceSection facultyWorkspaceOperations">

            <header>

              <div>

                <span>
                  FACULTY OPERATIONS
                </span>

                <h2>
                  Manage your teaching operations.
                </h2>

                <p>
                  Workload, availability and class coverage now have dedicated workspaces instead of being mixed into Academics.
                </p>

              </div>

            </header>


            <div className="facultyWorkspaceOperationsGrid">

              <button
                type="button"
                onClick={() =>
                  openFacultyView(
                    "Faculty Workload"
                  )
                }
              >

                <div className="facultyWorkspaceOperationIcon">
                  WL
                </div>

                <div>

                  <span>
                    TEACHING LOAD
                  </span>

                  <strong>
                    Workload &amp; Allocations
                  </strong>

                  <p>
                    Review subjects, weekly hours, labs, tutorials, projects and mentoring allocations.
                  </p>

                </div>

                <b>
                  →
                </b>

              </button>


              <button
                type="button"
                onClick={() =>
                  openFacultyView(
                    "Faculty Availability"
                  )
                }
              >

                <div className="facultyWorkspaceOperationIcon">
                  AV
                </div>

                <div>

                  <span>
                    AVAILABILITY
                  </span>

                  <strong>
                    Availability &amp; Exceptions
                  </strong>

                  <p>
                    Manage available periods and record date-specific unavailability safely.
                  </p>

                </div>

                <b>
                  →
                </b>

              </button>


              <button
                type="button"
                onClick={() =>
                  openFacultyView(
                    "Faculty Coverage"
                  )
                }
              >

                <div className="facultyWorkspaceOperationIcon">
                  CV
                </div>

                <div>

                  <span>
                    CLASS CONTINUITY
                  </span>

                  <strong>
                    Coverage &amp; Substitution
                  </strong>

                  <p>
                    Request class coverage, review offers and manage substitute Faculty assignments.
                  </p>

                </div>

                <b>
                  →
                </b>

              </button>

            </div>

          </section>


          <section className="facultyWorkspaceSection">

            <header>
              <div>
                <span>
                  CURRENT ASSIGNMENTS
                </span>

                <h2>
                  My teaching batches
                </h2>

                <p>
                  These are derived from your live subject and workload assignments.
                </p>
              </div>

              <button
                type="button"
                className="facultyWorkspaceTextButton"
                onClick={
                  onOpenMyBatches
                }
              >
                View all
                <b>
                  →
                </b>
              </button>
            </header>


            {workspaces.length ? (
              <div className="facultyBatchPreviewGrid">

                {workspaces
                  .slice(
                    0,
                    3
                  )
                  .map(
                    workspace => (
                      <article
                        key={
                          workspace.batch.id
                        }
                      >

                        <span>
                          {
                            workspace.batch.department
                          }
                          {" · "}
                          Section{" "}
                          {
                            workspace.batch.section
                          }
                        </span>

                        <h3>
                          {
                            workspace.batch.batch_name
                          }
                        </h3>

                        <p>
                          Semester{" "}
                          {
                            workspace.batch.semester ||
                            "—"
                          }

                          {workspace.batch.academic_year
                            ? ` · ${workspace.batch.academic_year}`
                            : ""}
                        </p>

                        <div>
                          <strong>
                            {
                              workspace.subjects.length
                            }
                            <small>
                              subjects
                            </small>
                          </strong>

                          <strong>
                            {
                              workspace.weeklyPeriods
                            }
                            <small>
                              periods/week
                            </small>
                          </strong>
                        </div>

                      </article>
                    )
                  )}

              </div>
            ) : (
              <div className="facultyWorkspaceEmpty">

                <strong>
                  No batch has been assigned yet
                </strong>

                <p>
                  Once the HOD or Main Admin assigns you to a batch or subject, it will automatically appear here.
                </p>

              </div>
            )}

          </section>

        </>
      ) : (
        <section className="facultyWorkspaceSection facultyMyBatches">

          <header>

            <div>
              <span>
                ASSIGNED ACCESS
              </span>

              <h2>
                My teaching batches
              </h2>

              <p>
                Batch access is derived from your active teaching allocations and direct subject assignments.
              </p>
            </div>

          </header>


          {workspaces.length ? (
            <div className="facultyBatchGrid">

              {workspaces.map(
                workspace => (
                  <article
                    className="facultyBatchCard"
                    key={
                      workspace.batch.id
                    }
                  >

                    <header>

                      <div>

                        <span>
                          {
                            workspace.batch.department
                          }
                          {" · "}
                          Section{" "}
                          {
                            workspace.batch.section
                          }
                        </span>

                        <h3>
                          {
                            workspace.batch.batch_name
                          }
                        </h3>

                        <p>
                          Semester{" "}
                          {
                            workspace.batch.semester ||
                            "—"
                          }

                          {workspace.batch.academic_year
                            ? ` · ${workspace.batch.academic_year}`
                            : ""}
                        </p>

                      </div>


                      <div className="facultyBatchStudentCount">

                        <strong>
                          {
                            workspace.batch.total_students ||
                            0
                          }
                        </strong>

                        <small>
                          students
                        </small>

                      </div>

                    </header>


                    <div className="facultyBatchMetrics">

                      <span>
                        <b>
                          {
                            workspace.subjects.length
                          }
                        </b>
                        Subjects
                      </span>

                      <span>
                        <b>
                          {
                            workspace.weeklyPeriods
                          }
                        </b>
                        Periods/week
                      </span>

                      <span>
                        <b>
                          {
                            workspace.labPeriods
                          }
                        </b>
                        Lab periods
                      </span>

                    </div>


                    <div className="facultyBatchSubjects">

                      {workspace.subjects.length ? (
                        workspace.subjects.map(
                          ({
                            subject,
                            allocation,
                          }) => (
                            <article
                              key={
                                subject.id
                              }
                            >

                              <div>
                                <span>
                                  {subject.subject_code ||
                                    "SUBJECT"}
                                </span>

                                <strong>
                                  {subject.subject_name}
                                </strong>

                                <small>
                                  {allocation?.allocation_type ||
                                    subject.subject_type}

                                  {allocation?.subgroup
                                    ? ` · Group ${allocation.subgroup}`
                                    : ""}
                                </small>
                              </div>


                              <div>
                                {allocation ? (
                                  <>
                                    <b>
                                      {
                                        allocation.weekly_hours
                                      }
                                    </b>

                                    <small>
                                      periods/week
                                    </small>
                                  </>
                                ) : (
                                  <small>
                                    Direct subject assignment
                                  </small>
                                )}
                              </div>

                            </article>
                          )
                        )
                      ) : (
                        <p>
                          Your batch assignment exists, but no subject metadata is currently available.
                        </p>
                      )}

                    </div>


                    <footer>

                      <button
                        type="button"
                        onClick={
                          onOpenAttendance
                        }
                      >
                        Open Attendance
                      </button>

                      <button
                        type="button"
                        onClick={
                          onOpenAssignments
                        }
                      >
                        Assignments
                      </button>

                      <button
                        type="button"
                        onClick={
                          onOpenAcademics
                        }
                      >
                        Academics
                      </button>

                    </footer>

                  </article>
                )
              )}

            </div>
          ) : (
            <div className="facultyWorkspaceEmpty">

              <strong>
                No assigned batches
              </strong>

              <p>
                You do not currently have an active batch or subject assignment. Ask your HOD or Main Admin to assign your faculty account.
              </p>

            </div>
          )}

        </section>
      )}

    </section>
  );
}
