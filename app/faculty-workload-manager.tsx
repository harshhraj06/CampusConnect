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


type FacultyAssignmentIdentity = {
  id: string;
  full_name: string;
  department: string;
  campus_uid: string | null;
  usn: string | null;
  avatar_url: string | null;
};


type AllocationType =
  | "Theory"
  | "Lab"
  | "Tutorial"
  | "Project"
  | "Mentoring";


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
  credits: number;
  allocation_type: AllocationType;
  subgroup: string;
  weekly_hours: number;
  session_length_periods: number;
  is_primary: boolean;
  status: string;
};


type Workload = {
  total_allocations: number;
  theory_hours: number;
  lab_hours: number;
  tutorial_hours: number;
  project_hours: number;
  mentoring_hours: number;
  total_weekly_hours: number;
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
  credits: number;
  faculty_id: string;
  faculty_name: string;
};


type ManagementAllocation = {
  id: string;
  batch_id: string;
  batch_subject_id: string;
  faculty_id: string;
  faculty_name: string;
  allocation_type: AllocationType;
  subgroup: string;
  weekly_hours: number;
  session_length_periods: number;
  is_primary: boolean;
  status: string;
  notes: string;
};


const allocationTypes: AllocationType[] = [
  "Theory",
  "Lab",
  "Tutorial",
  "Project",
  "Mentoring",
];


const numberValue = (
  value: unknown
) => {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};


export default function FacultyWorkloadManager({
  profile,
}: {
  profile: Profile;
}) {
  const canManage =
    profile.role === "Main Admin";

  const isFaculty =
    profile.role === "Faculty";

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [status, setStatus] =
    useState("");

  const [myAllocations, setMyAllocations] =
    useState<TeachingAllocation[]>([]);

  const [myWorkload, setMyWorkload] =
    useState<Workload | null>(null);

  const [batches, setBatches] =
    useState<Batch[]>([]);

  const [subjects, setSubjects] =
    useState<BatchSubject[]>([]);

  const [
    managementSubjects,
    setManagementSubjects,
  ] =
    useState<BatchSubject[]>([]);

  const [
    managementAllocations,
    setManagementAllocations,
  ] =
    useState<ManagementAllocation[]>([]);

  const [selectedBatchId, setSelectedBatchId] =
    useState("");

  const [
    selectedSubjectId,
    setSelectedSubjectId,
  ] =
    useState("");

  const [
    allocationType,
    setAllocationType,
  ] =
    useState<AllocationType>("Theory");

  const [subgroup, setSubgroup] =
    useState("");

  const [weeklyHours, setWeeklyHours] =
    useState("0");

  const [
    sessionLengthPeriods,
    setSessionLengthPeriods,
  ] =
    useState("1");

  const [isPrimary, setIsPrimary] =
    useState(true);

  const [notes, setNotes] =
    useState("");


  const [
    facultyIdentifier,
    setFacultyIdentifier,
  ] = useState("");


  const [
    selectedFaculty,
    setSelectedFaculty,
  ] =
    useState<
      FacultyAssignmentIdentity |
      null
    >(null);


  const [
    facultySearching,
    setFacultySearching,
  ] =
    useState(false);


  const selectedSubject =
    useMemo(
      () =>
        subjects.find(
          item =>
            item.id ===
            selectedSubjectId
        ) || null,
      [
        subjects,
        selectedSubjectId,
      ]
    );


  const loadFacultyWorkspace =
    useCallback(
      async () => {
        const client =
          getSupabaseClient();

        if (!client) {
          setStatus(
            "CampusConnect is not connected to Supabase."
          );
          setLoading(false);
          return;
        }

        setLoading(true);
        setStatus("");

        const [
          allocationResult,
          workloadResult,
        ] =
          await Promise.all([
            client.rpc(
              "get_my_teaching_allocations"
            ),
            client.rpc(
              "get_my_faculty_workload"
            ),
          ]);

        if (allocationResult.error) {
          console.error(
            "[Faculty workload allocations]",
            allocationResult.error
          );

          setStatus(
            allocationResult.error.message
          );
        } else {
          setMyAllocations(
            (
              allocationResult.data ||
              []
            ).map(
              (
                item:
                  Record<string, unknown>
              ) => ({
                ...item,
                credits:
                  numberValue(
                    item.credits
                  ),
                weekly_hours:
                  numberValue(
                    item.weekly_hours
                  ),

                session_length_periods:
                  Math.max(
                    1,
                    numberValue(
                      item.session_length_periods
                    ) || 1
                  ),
              })
            ) as TeachingAllocation[]
          );
        }

        if (workloadResult.error) {
          console.error(
            "[Faculty workload summary]",
            workloadResult.error
          );

          setStatus(
            current =>
              current ||
              workloadResult.error
                .message
          );
        } else {
          const row =
            workloadResult.data?.[0];

          setMyWorkload(
            row
              ? {
                  total_allocations:
                    numberValue(
                      row.total_allocations
                    ),
                  theory_hours:
                    numberValue(
                      row.theory_hours
                    ),
                  lab_hours:
                    numberValue(
                      row.lab_hours
                    ),
                  tutorial_hours:
                    numberValue(
                      row.tutorial_hours
                    ),
                  project_hours:
                    numberValue(
                      row.project_hours
                    ),
                  mentoring_hours:
                    numberValue(
                      row.mentoring_hours
                    ),
                  total_weekly_hours:
                    numberValue(
                      row.total_weekly_hours
                    ),
                }
              : null
          );
        }

        setLoading(false);
      },
      []
    );


  const loadManagementWorkspace =
    useCallback(
      async () => {
        const client =
          getSupabaseClient();

        if (!client) {
          setStatus(
            "CampusConnect is not connected to Supabase."
          );
          setLoading(false);
          return;
        }

        setLoading(true);
        setStatus("");

        const [
          batchesResult,
          allocationResult,
        ] =
          await Promise.all([
            client
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
                "batch_name",
                {
                  ascending: true,
                }
              ),

            client
              .from(
                "faculty_teaching_allocations"
              )
              .select(
                "id,batch_id,batch_subject_id,faculty_id,faculty_name,allocation_type,subgroup,weekly_hours,session_length_periods,is_primary,status,notes"
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
          ]);

        /*
         * Load subject metadata separately instead of relying on
         * PostgREST relationship-name inference.
         *
         * We already have confirmed foreign keys:
         * faculty_teaching_allocations.batch_subject_id
         *   -> attendance_batch_subjects.id
         *
         * This keeps the query explicit and avoids depending on an
         * inferred relationship alias.
         */
        let managementSubjectRows: BatchSubject[] =
          [];

        if (
          !batchesResult.error &&
          batchesResult.data?.length
        ) {
          const eceBatchIds =
            batchesResult.data.map(
              batch => batch.id
            );

          const subjectResult =
            await client
              .from(
                "attendance_batch_subjects"
              )
              .select(
                "id,batch_id,subject_name,subject_code,subject_type,credits,faculty_id,faculty_name"
              )
              .in(
                "batch_id",
                eceBatchIds
              )
              .order(
                "subject_name",
                {
                  ascending: true,
                }
              );

          if (subjectResult.error) {
            console.error(
              "[Faculty workload management subjects]",
              subjectResult.error
            );

            setStatus(
              current =>
                current ||
                subjectResult.error
                  .message
            );
          } else {
            managementSubjectRows =
              (
                subjectResult.data ||
                []
              ) as BatchSubject[];
          }
        }

        setManagementSubjects(
          managementSubjectRows
        );

        if (batchesResult.error) {
          console.error(
            "[Faculty workload batches]",
            batchesResult.error
          );

          setStatus(
            batchesResult.error.message
          );
        } else {
          const rows =
            (
              batchesResult.data ||
              []
            ) as Batch[];

          setBatches(rows);

          setSelectedBatchId(
            current =>
              current ||
              rows[0]?.id ||
              ""
          );
        }

        if (
          allocationResult.error
        ) {
          console.error(
            "[Faculty workload management]",
            allocationResult.error
          );

          setStatus(
            current =>
              current ||
              allocationResult.error
                .message
          );
        } else {
          setManagementAllocations(
            (
              allocationResult.data ||
              []
            ).map(
              (
                item:
                  Record<string, unknown>
              ) => ({
                ...item,
                weekly_hours:
                  numberValue(
                    item.weekly_hours
                  ),

                session_length_periods:
                  Math.max(
                    1,
                    numberValue(
                      item.session_length_periods
                    ) || 1
                  ),
              })
            ) as ManagementAllocation[]
          );
        }

        setLoading(false);
      },
      []
    );


  const loadBatchSubjects =
    useCallback(
      async (
        batchId: string
      ) => {
        const client =
          getSupabaseClient();

        if (
          !client ||
          !batchId
        ) {
          setSubjects([]);
          setSelectedSubjectId("");
          return;
        }

        const {
          data,
          error,
        } =
          await client
            .from(
              "attendance_batch_subjects"
            )
            .select(
              "id,batch_id,subject_name,subject_code,subject_type,credits,faculty_id,faculty_name"
            )
            .eq(
              "batch_id",
              batchId
            )
            .order(
              "subject_name",
              {
                ascending: true,
              }
            );

        if (error) {
          console.error(
            "[Faculty workload subjects]",
            error
          );

          setStatus(
            error.message
          );
          return;
        }

        const rows =
          (
            data ||
            []
          ) as BatchSubject[];

        setSubjects(rows);

        setSelectedSubjectId(
          rows[0]?.id ||
          ""
        );
      },
      []
    );


  useEffect(() => {
    if (isFaculty) {
      void loadFacultyWorkspace();
      return;
    }

    if (canManage) {
      void loadManagementWorkspace();
      return;
    }

    setLoading(false);
  }, [
    canManage,
    isFaculty,
    loadFacultyWorkspace,
    loadManagementWorkspace,
  ]);


  useEffect(() => {
    if (
      canManage &&
      selectedBatchId
    ) {
      void loadBatchSubjects(
        selectedBatchId
      );
    }
  }, [
    canManage,
    selectedBatchId,
    loadBatchSubjects,
  ]);


  useEffect(() => {
    setSelectedFaculty(null);
    setFacultyIdentifier("");

    if (!selectedSubject) {
      return;
    }

    if (
      selectedSubject.subject_type ===
      "Lab"
    ) {
      setAllocationType(
        "Lab"
      );
      return;
    }

    setAllocationType(
      "Theory"
    );

    setSessionLengthPeriods(
      "1"
    );
  }, [selectedSubject]);


  const findFacultyByIdentifier =
    async () => {
      const identifier =
        facultyIdentifier.trim();

      if (!identifier) {
        setSelectedFaculty(null);
        setStatus(
          "Enter a CampusConnect CC ID or USN."
        );
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        setStatus(
          "CampusConnect is not connected to Supabase."
        );
        return;
      }

      setFacultySearching(true);
      setSelectedFaculty(null);
      setStatus("");

      try {
        const {
          data,
          error,
        } =
          await client.rpc(
            "find_faculty_by_identifier",
            {
              p_identifier:
                identifier,
            }
          );

        if (error) {
          throw error;
        }

        const faculty =
          Array.isArray(data)
            ? data[0]
            : null;

        if (!faculty) {
          setStatus(
            "No verified Faculty account was found with that CC ID or USN."
          );
          return;
        }

        setSelectedFaculty(
          faculty as FacultyAssignmentIdentity
        );

        setStatus(
          `Verified faculty: ${faculty.full_name}.`
        );
      } catch (error) {
        console.error(
          "[Faculty identifier lookup]",
          error
        );

        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to search for this faculty account."
        );
      } finally {
        setFacultySearching(false);
      }
    };


  const saveAllocation =
    async () => {
      const client =
        getSupabaseClient();

      if (
        !client ||
        !canManage ||
        !selectedSubject
      ) {
        return;
      }

      if (!selectedFaculty) {
        setStatus(
          "Search and verify a Faculty account using CC ID or USN before assigning."
        );
        return;
      }

      const hours =
        Number(weeklyHours);

      const sessionLength =
        allocationType ===
          "Lab"
          ? Number(
              sessionLengthPeriods
            )
          : 1;

      if (
        !Number.isInteger(hours) ||
        hours < 0 ||
        hours > 60
      ) {
        setStatus(
          "Weekly periods must be a whole number between 0 and 60."
        );
        return;
      }

      if (
        !Number.isInteger(
          sessionLength
        ) ||
        sessionLength < 1 ||
        sessionLength > 6
      ) {
        setStatus(
          "Periods per session must be a whole number between 1 and 6."
        );
        return;
      }

      if (
        hours > 0 &&
        sessionLength > hours
      ) {
        setStatus(
          "Periods per session cannot be greater than weekly periods."
        );
        return;
      }

      if (
        hours > 0 &&
        hours %
          sessionLength !==
          0
      ) {
        setStatus(
          "Weekly periods must be divisible by periods per session."
        );
        return;
      }

      if (
        allocationType ===
          "Lab" &&
        !subgroup.trim()
      ) {
        setStatus(
          "Enter the lab subgroup, for example A1, A2 or A3."
        );
        return;
      }

      setSaving(true);
      setStatus("");

      const {
        error,
      } =
        await client.rpc(
          "assign_faculty_teaching_allocation",
          {
            p_batch_subject_id:
              selectedSubject.id,

            p_faculty_id:
              selectedFaculty.id,

            p_allocation_type:
              allocationType,

            p_subgroup:
              allocationType ===
              "Lab"
                ? subgroup
                    .trim()
                    .toUpperCase()
                : "",

            p_weekly_hours:
              hours,

            p_session_length_periods:
              sessionLength,

            p_is_primary:
              isPrimary,

            p_notes:
              notes.trim(),
          }
        );

      if (error) {
        console.error(
          "[Faculty allocation save]",
          error
        );

        setStatus(
          error.message
        );

        setSaving(false);
        return;
      }

      setStatus(
        "Teaching allocation saved."
      );

      setSubgroup("");
      setSessionLengthPeriods(
        "1"
      );
      setNotes("");
      setFacultyIdentifier("");
      setSelectedFaculty(null);

      await loadManagementWorkspace();

      setSaving(false);
    };


  const updateHours =
    async (
      allocation:
        ManagementAllocation,
      hours: number
    ) => {
      const client =
        getSupabaseClient();

      if (
        !client ||
        !canManage
      ) {
        return;
      }

      if (
        !Number.isInteger(hours) ||
        hours < 0 ||
        hours > 60
      ) {
        setStatus(
          "Weekly periods must be a whole number between 0 and 60."
        );
        return;
      }

      if (
        allocation.allocation_type ===
          "Lab" &&
        hours > 0 &&
        (
          allocation.session_length_periods >
            hours ||
          hours %
            allocation.session_length_periods !==
            0
        )
      ) {
        setStatus(
          "Weekly periods must be divisible by the lab periods per session."
        );
        return;
      }

      setSaving(true);

      const {
        error,
      } =
        await client
          .from(
            "faculty_teaching_allocations"
          )
          .update({
            weekly_hours:
              hours,
          })
          .eq(
            "id",
            allocation.id
          );

      if (error) {
        console.error(
          "[Faculty allocation hours]",
          error
        );

        setStatus(
          error.message
        );
      } else {
        setStatus(
          "Weekly workload updated."
        );

        await loadManagementWorkspace();
      }

      setSaving(false);
    };


  const updateSessionLength =
    async (
      allocation:
        ManagementAllocation,
      sessionLength: number
    ) => {
      const client =
        getSupabaseClient();

      if (
        !client ||
        !canManage
      ) {
        return;
      }

      if (
        allocation.allocation_type !==
        "Lab"
      ) {
        return;
      }

      if (
        !Number.isInteger(
          sessionLength
        ) ||
        sessionLength < 1 ||
        sessionLength > 6
      ) {
        setStatus(
          "Periods per session must be a whole number between 1 and 6."
        );
        return;
      }

      const weeklyPeriods =
        numberValue(
          allocation.weekly_hours
        );

      if (
        weeklyPeriods > 0 &&
        sessionLength >
          weeklyPeriods
      ) {
        setStatus(
          "Periods per session cannot be greater than weekly periods."
        );
        return;
      }

      if (
        weeklyPeriods > 0 &&
        weeklyPeriods %
          sessionLength !==
          0
      ) {
        setStatus(
          "Weekly periods must be divisible by periods per session."
        );
        return;
      }

      setSaving(true);
      setStatus("");

      const {
        error,
      } =
        await client
          .from(
            "faculty_teaching_allocations"
          )
          .update({
            session_length_periods:
              sessionLength,
          })
          .eq(
            "id",
            allocation.id
          );

      if (error) {
        console.error(
          "[Faculty allocation session length]",
          error
        );

        setStatus(
          error.message
        );
      } else {
        setStatus(
          "Session length updated."
        );

        await loadManagementWorkspace();
      }

      setSaving(false);
    };


  const deactivateAllocation =
    async (
      allocation:
        ManagementAllocation
    ) => {
      const client =
        getSupabaseClient();

      if (
        !client ||
        !canManage
      ) {
        return;
      }

      if (
        !window.confirm(
          `Deactivate ${allocation.faculty_name}'s ${allocation.allocation_type} allocation?`
        )
      ) {
        return;
      }

      setSaving(true);

      const {
        error,
      } =
        await client
          .from(
            "faculty_teaching_allocations"
          )
          .update({
            status:
              "Inactive",
          })
          .eq(
            "id",
            allocation.id
          );

      if (error) {
        console.error(
          "[Faculty allocation deactivate]",
          error
        );

        setStatus(
          error.message
        );
      } else {
        setStatus(
          "Teaching allocation deactivated."
        );

        await loadManagementWorkspace();
      }

      setSaving(false);
    };


  const activeManagementAllocations =
    useMemo(
      () =>
        managementAllocations.filter(
          item =>
            item.status ===
            "Active"
        ),
      [managementAllocations]
    );


  const managementSubjectById =
    useMemo(
      () =>
        new Map(
          managementSubjects.map(
            subject => [
              subject.id,
              subject,
            ]
          )
        ),
      [managementSubjects]
    );


  const managementBatchById =
    useMemo(
      () =>
        new Map(
          batches.map(
            batch => [
              batch.id,
              batch,
            ]
          )
        ),
      [batches]
    );


  const managementStats =
    useMemo(() => {
      const faculty =
        new Set(
          activeManagementAllocations.map(
            item =>
              item.faculty_id
          )
        );

      return {
        faculty:
          faculty.size,

        allocations:
          activeManagementAllocations.length,

        theory:
          activeManagementAllocations
            .filter(
              item =>
                item.allocation_type ===
                "Theory"
            )
            .reduce(
              (sum, item) =>
                sum +
                numberValue(
                  item.weekly_hours
                ),
              0
            ),

        lab:
          activeManagementAllocations
            .filter(
              item =>
                item.allocation_type ===
                "Lab"
            )
            .reduce(
              (sum, item) =>
                sum +
                numberValue(
                  item.weekly_hours
                ),
              0
            ),
      };
    }, [
      activeManagementAllocations,
    ]);


  const groupedAllocations =
    useMemo(() => {
      const groups =
        new Map<
          string,
          ManagementAllocation[]
        >();

      for (
        const allocation
        of activeManagementAllocations
      ) {
        const key =
          allocation.faculty_id;

        const current =
          groups.get(key) ||
          [];

        current.push(
          allocation
        );

        groups.set(
          key,
          current
        );
      }

      return Array.from(
        groups.entries()
      );
    }, [
      activeManagementAllocations,
    ]);


  if (
    !isFaculty &&
    !canManage
  ) {
    return (
      <section className="facultyWorkloadShell">
        <div className="facultyWorkloadNotice">
          <span>ECE ACADEMICS</span>
          <h2>
            Faculty workload
          </h2>
          <p>
            Workload management is currently available to Main Admin.
            Department-scoped HOD access will be enabled through database
            authorization rather than a client-side role bypass.
          </p>
        </div>
      </section>
    );
  }


  if (loading) {
    return (
      <section className="facultyWorkloadShell">
        <div className="facultyWorkloadNotice">
          <span>
            ECE FACULTY WORKLOAD
          </span>
          <h2>
            Loading teaching responsibilities…
          </h2>
        </div>
      </section>
    );
  }


  if (isFaculty) {
    return (
      <section className="facultyWorkloadShell">

        <header className="facultyWorkloadHero">
          <div>
            <span>
              MY TEACHING · ECE
            </span>

            <h2>
              Teaching workload
            </h2>

            <p>
              Your active teaching responsibilities are loaded automatically
              from your CampusConnect account.
            </p>
          </div>

          <strong>
            {numberValue(
              myWorkload
                ?.total_weekly_hours
            )}
            <small>
              periods / week
            </small>
          </strong>
        </header>


        {status && (
          <div className="facultyWorkloadStatus">
            {status}
          </div>
        )}


        <div className="facultyWorkloadMetrics">

          <article>
            <span>
              ALLOCATIONS
            </span>
            <strong>
              {numberValue(
                myWorkload
                  ?.total_allocations
              )}
            </strong>
          </article>

          <article>
            <span>
              THEORY
            </span>
            <strong>
              {numberValue(
                myWorkload
                  ?.theory_hours
              )}
              h
            </strong>
          </article>

          <article>
            <span>
              LAB
            </span>
            <strong>
              {numberValue(
                myWorkload
                  ?.lab_hours
              )}
              h
            </strong>
          </article>

          <article>
            <span>
              OTHER
            </span>
            <strong>
              {numberValue(
                myWorkload
                  ?.tutorial_hours
              ) +
                numberValue(
                  myWorkload
                    ?.project_hours
                ) +
                numberValue(
                  myWorkload
                    ?.mentoring_hours
                )}
              h
            </strong>
          </article>

        </div>


        <div className="facultyTeachingGrid">

          {myAllocations.map(
            allocation => (
              <article
                key={
                  allocation.allocation_id
                }
                className="facultyTeachingCard"
              >
                <header>
                  <div>
                    <span>
                      {allocation.subject_code ||
                        "SUBJECT"}
                    </span>

                    <h3>
                      {allocation.subject_name}
                    </h3>
                  </div>

                  <strong>
                    {allocation.weekly_hours
                      ? `${allocation.weekly_hours} periods`
                      : "Set periods"}
                  </strong>
                </header>

                <div className="facultyTeachingTags">
                  <span>
                    {allocation.allocation_type}
                  </span>

                  <span>
                    {allocation.batch_name}
                    {" · "}
                    Section {allocation.section}
                  </span>

                  {allocation.subgroup && (
                    <span>
                      Group {allocation.subgroup}
                    </span>
                  )}

                  {allocation.allocation_type ===
                    "Lab" && (
                    <span>
                      {allocation.session_length_periods}
                      {" "}
                      period
                      {allocation.session_length_periods ===
                      1
                        ? ""
                        : "s"}
                      {" / session"}
                    </span>
                  )}
                </div>

                <p>
                  {allocation.department}
                  {allocation.academic_year
                    ? ` · ${allocation.academic_year}`
                    : ""}
                </p>

                {!allocation.weekly_hours && (
                  <small className="facultyNeedsConfiguration">
                    Weekly periods require configuration by academic management.
                  </small>
                )}
              </article>
            )
          )}

          {!myAllocations.length && (
            <div className="facultyWorkloadEmpty">
              <span>◇</span>
              <h3>
                No active teaching allocations
              </h3>
              <p>
                Your assigned subjects and lab groups will appear here
                automatically when academic management assigns them.
              </p>
            </div>
          )}

        </div>

      </section>
    );
  }


  return (
    <section className="facultyWorkloadShell">

      <header className="facultyWorkloadHero">
        <div>
          <span>
            ECE · ACADEMIC CONTROL
          </span>

          <h2>
            Faculty workload & allocation
          </h2>

          <p>
            Assign ECE teaching responsibilities and configure the weekly
            workload that will later drive automated timetable generation.
          </p>
        </div>

        <strong>
          {managementStats.faculty}
          <small>
            active faculty
          </small>
        </strong>
      </header>


      {status && (
        <div className="facultyWorkloadStatus">
          {status}
        </div>
      )}


      <div className="facultyWorkloadMetrics">

        <article>
          <span>
            FACULTY
          </span>
          <strong>
            {managementStats.faculty}
          </strong>
        </article>

        <article>
          <span>
            ALLOCATIONS
          </span>
          <strong>
            {managementStats.allocations}
          </strong>
        </article>

        <article>
          <span>
            THEORY
          </span>
          <strong>
            {managementStats.theory} periods
          </strong>
        </article>

        <article>
          <span>
            LAB
          </span>
          <strong>
            {managementStats.lab} periods
          </strong>
        </article>

      </div>


      <div className="facultyWorkloadManagementGrid">

        <section className="facultyAllocationForm">

          <header>
            <span>
              ASSIGN RESPONSIBILITY
            </span>

            <h3>
              Teaching allocation
            </h3>

            <p>
              Existing batch subjects remain the academic source of truth.
              This layer adds workload and lab-group responsibilities.
            </p>
          </header>


          <label>
            <span>
              ECE BATCH
            </span>

            <select
              value={
                selectedBatchId
              }
              onChange={
                event =>
                  setSelectedBatchId(
                    event.target.value
                  )
              }
            >
              {batches.map(
                batch => (
                  <option
                    key={batch.id}
                    value={batch.id}
                  >
                    {batch.batch_name}
                    {" · "}
                    Section {batch.section}
                    {batch.semester
                      ? ` · Sem ${batch.semester}`
                      : ""}
                  </option>
                )
              )}
            </select>
          </label>


          <label>
            <span>
              SUBJECT
            </span>

            <select
              value={
                selectedSubjectId
              }
              onChange={
                event =>
                  setSelectedSubjectId(
                    event.target.value
                  )
              }
            >
              {subjects.map(
                subject => (
                  <option
                    key={subject.id}
                    value={subject.id}
                  >
                    {subject.subject_code
                      ? `${subject.subject_code} · `
                      : ""}
                    {subject.subject_name}
                  </option>
                )
              )}
            </select>
          </label>


          <section className="facultyAssignmentLookup">

            <header>
              <div>
                <span>
                  FACULTY IDENTITY
                </span>

                <strong>
                  Find verified faculty
                </strong>

                <small>
                  Search using the faculty member's CampusConnect CC ID or institutional USN / employee ID.
                </small>
              </div>
            </header>


            <div className="facultyAssignmentSearch">

              <input
                value={
                  facultyIdentifier
                }
                onChange={
                  event => {
                    setFacultyIdentifier(
                      event.target.value
                    );

                    setSelectedFaculty(
                      null
                    );
                  }
                }
                onKeyDown={
                  event => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      event.preventDefault();

                      void findFacultyByIdentifier();
                    }
                  }
                }
                placeholder="CC ID or USN"
                autoComplete="off"
                spellCheck={false}
              />

              <button
                type="button"
                disabled={
                  facultySearching ||
                  !facultyIdentifier.trim()
                }
                onClick={() =>
                  void findFacultyByIdentifier()
                }
              >
                {facultySearching
                  ? "Searching…"
                  : "Search"}
              </button>

            </div>


            {selectedFaculty && (
              <article className="facultyAssignmentVerified">

                <div className="facultyAssignmentAvatar">

                  {selectedFaculty.avatar_url ? (
                    <img
                      src={
                        selectedFaculty.avatar_url
                      }
                      alt=""
                    />
                  ) : (
                    <span>
                      {selectedFaculty.full_name
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}

                </div>


                <div className="facultyAssignmentPerson">

                  <span>
                    VERIFIED FACULTY
                  </span>

                  <strong>
                    {
                      selectedFaculty.full_name
                    }
                  </strong>

                  <small>
                    {
                      selectedFaculty.department ||
                      "Department not set"
                    }
                  </small>

                </div>


                <div className="facultyAssignmentIdentifiers">

                  <span>
                    <small>
                      CC ID
                    </small>

                    <b>
                      {selectedFaculty.campus_uid ||
                        "Not assigned"}
                    </b>
                  </span>

                  <span>
                    <small>
                      USN / EMPLOYEE ID
                    </small>

                    <b>
                      {selectedFaculty.usn ||
                        "Not assigned"}
                    </b>
                  </span>

                </div>

              </article>
            )}

          </section>


          <div className="facultyAllocationSplit">

            <label>
              <span>
                TYPE
              </span>

              <select
                value={
                  allocationType
                }
                onChange={
                  event =>
                    setAllocationType(
                      event.target
                        .value as AllocationType
                    )
                }
              >
                {allocationTypes.map(
                  type => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  )
                )}
              </select>
            </label>


            <label>
              <span>
                WEEKLY PERIODS
              </span>

              <input
                type="number"
                min="0"
                max="60"
                step="1"
                value={
                  weeklyHours
                }
                onChange={
                  event =>
                    setWeeklyHours(
                      event.target.value
                    )
                }
              />
            </label>

          </div>


          {allocationType ===
            "Lab" && (
            <>
              <label>
                <span>
                  LAB GROUP
                </span>

                <input
                  value={subgroup}
                  maxLength={40}
                  onChange={
                    event =>
                      setSubgroup(
                        event.target.value
                      )
                  }
                  placeholder="A1, A2, A3..."
                />
              </label>

              <label>
                <span>
                  PERIODS / SESSION
                </span>

                <input
                  type="number"
                  min="1"
                  max="6"
                  step="1"
                  value={
                    sessionLengthPeriods
                  }
                  onChange={
                    event =>
                      setSessionLengthPeriods(
                        event.target.value
                      )
                  }
                />

                <small>
                  {(() => {
                    const hours =
                      Number(
                        weeklyHours
                      );

                    const length =
                      Number(
                        sessionLengthPeriods
                      );

                    if (
                      !Number.isInteger(
                        hours
                      ) ||
                      !Number.isInteger(
                        length
                      ) ||
                      hours <= 0 ||
                      length <= 0 ||
                      hours % length !==
                        0
                    ) {
                      return "Set whole weekly periods divisible by this session length.";
                    }

                    const sessions =
                      hours / length;

                    return `${sessions} session${
                      sessions === 1
                        ? ""
                        : "s"
                    } / week`;
                  })()}
                </small>
              </label>
            </>
          )}


          <label>
            <span>
              NOTES
            </span>

            <textarea
              value={notes}
              onChange={
                event =>
                  setNotes(
                    event.target.value
                  )
              }
              placeholder="Optional academic note"
            />
          </label>


          <label className="facultyAllocationCheckbox">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={
                event =>
                  setIsPrimary(
                    event.target.checked
                  )
              }
            />

            <span>
              Primary teaching responsibility
            </span>
          </label>


          <button
            type="button"
            className="facultyAllocationPrimary"
            disabled={
              saving ||
              !selectedSubject ||
              !selectedFaculty
            }
            onClick={() =>
              void saveAllocation()
            }
          >
            {saving
              ? "Assigning…"
              : "Assign faculty"}
          </button>

        </section>


        <section className="facultyWorkloadBoard">

          <header>
            <span>
              LIVE WORKLOAD
            </span>

            <h3>
              Faculty workload board
            </h3>

            <p>
              Configure migrated zero-hour assignments before timetable
              generation.
            </p>
          </header>


          <div className="facultyWorkloadFacultyList">

            {groupedAllocations.map(
              ([
                facultyId,
                allocations,
              ]) => {
                const total =
                  allocations.reduce(
                    (
                      sum,
                      item
                    ) =>
                      sum +
                      numberValue(
                        item.weekly_hours
                      ),
                    0
                  );

                return (
                  <article
                    key={facultyId}
                    className="facultyWorkloadFaculty"
                  >
                    <header>
                      <div>
                        <span>
                          FACULTY
                        </span>

                        <h4>
                          {allocations[0]
                            ?.faculty_name ||
                            "Faculty"}
                        </h4>
                      </div>

                      <strong>
                        {total}h
                        <small>
                          / week
                        </small>
                      </strong>
                    </header>


                    <div className="facultyAllocationRows">

                      {allocations.map(
                        allocation => (
                          <div
                            key={
                              allocation.id
                            }
                            className={
                              allocation.weekly_hours ===
                              0
                                ? "facultyAllocationRow needsConfiguration"
                                : "facultyAllocationRow"
                            }
                          >
                            <div
                              className="facultyAllocationIdentity"
                            >
                              {(() => {
                                const subject =
                                  managementSubjectById.get(
                                    allocation.batch_subject_id
                                  );

                                const batch =
                                  managementBatchById.get(
                                    allocation.batch_id
                                  );

                                return (
                                  <>
                                    <div
                                      className="facultyAllocationMeta"
                                    >
                                      <span>
                                        {allocation.allocation_type}
                                      </span>

                                      {allocation.subgroup && (
                                        <span>
                                          {allocation.subgroup}
                                        </span>
                                      )}

                                      {allocation.is_primary && (
                                        <span>
                                          Primary
                                        </span>
                                      )}
                                    </div>

                                    <b>
                                      {subject?.subject_code
                                        ? `${subject.subject_code} · `
                                        : ""}
                                      {subject?.subject_name ||
                                        "Subject unavailable"}
                                    </b>

                                    <small>
                                      {batch
                                        ? [
                                            batch.batch_name,
                                            batch.section
                                              ? `Section ${batch.section}`
                                              : "",
                                            batch.semester
                                              ? `Semester ${batch.semester}`
                                              : "",
                                          ]
                                            .filter(Boolean)
                                            .join(" · ")
                                        : "Batch unavailable"}
                                    </small>

                                    {allocation.weekly_hours ===
                                      0 && (
                                      <small
                                        className="facultyNeedsConfiguration"
                                      >
                                        Weekly workload needs configuration
                                      </small>
                                    )}
                                  </>
                                );
                              })()}
                            </div>


                            <label>
                              <span>
                                PERIODS
                              </span>

                              <input
                                type="number"
                                min="0"
                                max="60"
                                step="1"
                                defaultValue={
                                  allocation.weekly_hours
                                }
                                onBlur={
                                  event => {
                                    const next =
                                      Number(
                                        event.target.value
                                      );

                                    if (
                                      next !==
                                      allocation.weekly_hours
                                    ) {
                                      void updateHours(
                                        allocation,
                                        next
                                      );
                                    }
                                  }
                                }
                              />
                            </label>


                            {allocation.allocation_type ===
                              "Lab" && (
                              <label>
                                <span>
                                  PERIODS / SESSION
                                </span>

                                <input
                                  type="number"
                                  min="1"
                                  max="6"
                                  step="1"
                                  defaultValue={
                                    allocation.session_length_periods
                                  }
                                  onBlur={
                                    event => {
                                      const next =
                                        Number(
                                          event.target.value
                                        );

                                      if (
                                        next !==
                                        allocation.session_length_periods
                                      ) {
                                        void updateSessionLength(
                                          allocation,
                                          next
                                        );
                                      }
                                    }
                                  }
                                />

                                <small>
                                  {allocation.weekly_hours >
                                    0 &&
                                  allocation.session_length_periods >
                                    0 &&
                                  allocation.weekly_hours %
                                    allocation.session_length_periods ===
                                    0
                                    ? `${
                                        allocation.weekly_hours /
                                        allocation.session_length_periods
                                      } session${
                                        allocation.weekly_hours /
                                          allocation.session_length_periods ===
                                        1
                                          ? ""
                                          : "s"
                                      } / week`
                                    : "Needs valid session configuration"}
                                </small>
                              </label>
                            )}


                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                void deactivateAllocation(
                                  allocation
                                )
                              }
                            >
                              Deactivate
                            </button>
                          </div>
                        )
                      )}

                    </div>

                  </article>
                );
              }
            )}


            {!groupedAllocations.length && (
              <div className="facultyWorkloadEmpty">
                <span>◇</span>
                <h3>
                  No ECE allocations yet
                </h3>
                <p>
                  Add batch subjects first, then configure their teaching
                  responsibilities here.
                </p>
              </div>
            )}

          </div>

        </section>

      </div>

    </section>
  );
}
