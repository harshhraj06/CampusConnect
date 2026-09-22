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
  bio: string;
  skills: string;
  phone: string;
  usn: string;
  cgpa?: number | string | null;
  campus_uid?: string;
  avatar_url?: string;
};

type SchedulingProfile = {
  id: string;
  name: string;
  department: string;
  academic_year: string;
  semester: string;
  is_active: boolean;
  created_by: string;
};

type Batch = {
  id: string;
  batch_name: string;
  department: string;
  academic_year: string;
  semester: string;
  section: string;
};

type BatchProfile = {
  batch_id: string;
  profile_id: string;
};

type WorkingDay = {
  id: string;
  profile_id: string;
  day_of_week: DayName;
  display_order: number;
  is_working_day: boolean;
};

type PeriodSlot = {
  id: string;
  profile_id: string;
  period_order: number;
  label: string;
  start_time: string;
  end_time: string;
  is_teaching_slot: boolean;
};

type BatchSubject = {
  id: string;
  batch_id: string;
  subject_name: string;
  subject_code: string;
  subject_type:
    | "Theory"
    | "Lab"
    | "Theory + Lab";
};

type TeachingAllocation = {
  id: string;
  batch_id: string;
  batch_subject_id: string;
  faculty_id: string;
  faculty_name: string;
  allocation_type:
    | "Theory"
    | "Lab"
    | "Tutorial"
    | "Project"
    | "Mentoring";
  subgroup: string;
  weekly_hours: number;
  session_length_periods: number;
  is_primary: boolean;
  status:
    | "Active"
    | "Inactive";
};

type ResourceType =
  | "Classroom"
  | "Laboratory"
  | "Seminar Hall"
  | "Other";

type Resource = {
  id: string;
  department: string;
  resource_code: string;
  resource_name: string;
  resource_type: ResourceType;
  building: string;
  floor: string;
  capacity: number | null;
  is_active: boolean;
};


type GeneratedTimetableEntry = {
  draft_id: string;
  allocation_id: string;
  batch_id: string;
  batch_subject_id: string;
  faculty_id: string;
  faculty_name: string;
  day_of_week: DayName;
  period_order: number;
  start_time: string;
  end_time: string;
  subgroup: string;
  resource_id: string | null;
  room: string;
  class_type: string;
};

type TimetableDraft = {
  id: string;
  label: string;
  description: string;
  score: number;
  entries: GeneratedTimetableEntry[];
  unscheduled: string[];
  metrics: {
    scheduled: number;
    requested: number;
    facultyGaps: number;
    repeatedDayPenalty: number;
    lateSlotPenalty: number;
  };
};

type DayName =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

const DAYS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const RESOURCE_TYPES: ResourceType[] = [
  "Classroom",
  "Laboratory",
  "Seminar Hall",
  "Other",
];

const cleanTime = (
  value: string
) => value.slice(0, 5);

const errorText = (
  error: unknown,
  fallback: string
) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object"
  ) {
    const candidate =
      error as {
        message?: unknown;
        details?: unknown;
        hint?: unknown;
        code?: unknown;
      };

    const parts = [
      typeof candidate.message ===
      "string"
        ? candidate.message
        : "",
      typeof candidate.details ===
      "string"
        ? candidate.details
        : "",
      typeof candidate.hint ===
      "string"
        ? candidate.hint
        : "",
      typeof candidate.code ===
      "string"
        ? `Code: ${candidate.code}`
        : "",
    ].filter(Boolean);

    if (parts.length) {
      return parts.join(" · ");
    }
  }

  return fallback;
};

export default function TimetableAutomationManager({
  profile,
  onOpenFacultyWorkload,
}: {
  profile: Profile;
  onOpenFacultyWorkload?: () => void;
}) {
  const canManage =
    profile.role === "Main Admin";

  const [
    timetableDrafts,
    setTimetableDrafts,
  ] = useState<TimetableDraft[]>([]);

  const [
    selectedDraftId,
    setSelectedDraftId,
  ] = useState("");

  const [
    generating,
    setGenerating,
  ] = useState(false);

  const [
    publishing,
    setPublishing,
  ] = useState(false);

  const [
    schedulingProfiles,
    setSchedulingProfiles,
  ] = useState<SchedulingProfile[]>([]);

  const [
    batches,
    setBatches,
  ] = useState<Batch[]>([]);

  const [
    batchProfiles,
    setBatchProfiles,
  ] = useState<BatchProfile[]>([]);

  const [
    workingDays,
    setWorkingDays,
  ] = useState<WorkingDay[]>([]);

  const [
    periodSlots,
    setPeriodSlots,
  ] = useState<PeriodSlot[]>([]);

  const [
    resources,
    setResources,
  ] = useState<Resource[]>([]);

  const [
    batchSubjects,
    setBatchSubjects,
  ] = useState<BatchSubject[]>([]);

  const [
    teachingAllocations,
    setTeachingAllocations,
  ] = useState<TeachingAllocation[]>([]);

  const [
    selectedProfileId,
    setSelectedProfileId,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    status,
    setStatus,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    profileForm,
    setProfileForm,
  ] = useState({
    name: "",
    academicYear: "",
    semester: "",
  });

  const [
    periodForm,
    setPeriodForm,
  ] = useState({
    label: "",
    startTime: "",
    endTime: "",
    teaching: true,
  });

  const [
    editingPeriodId,
    setEditingPeriodId,
  ] = useState<string | null>(
    null
  );

  const [
    resourceForm,
    setResourceForm,
  ] = useState({
    code: "",
    name: "",
    type: "Classroom" as ResourceType,
    building: "",
    floor: "",
    capacity: "",
  });

  const selectedProfile =
    useMemo(
      () =>
        schedulingProfiles.find(
          item =>
            item.id ===
            selectedProfileId
        ) || null,
      [
        schedulingProfiles,
        selectedProfileId,
      ]
    );

  const assignedBatchIds =
    useMemo(
      () =>
        new Set(
          batchProfiles
            .filter(
              item =>
                item.profile_id ===
                selectedProfileId
            )
            .map(
              item =>
                item.batch_id
            )
        ),
      [
        batchProfiles,
        selectedProfileId,
      ]
    );

  const profileWorkingDays =
    useMemo(
      () =>
        workingDays
          .filter(
            item =>
              item.profile_id ===
              selectedProfileId
          )
          .sort(
            (a, b) =>
              a.display_order -
              b.display_order
          ),
      [
        workingDays,
        selectedProfileId,
      ]
    );

  const profilePeriodSlots =
    useMemo(
      () =>
        periodSlots
          .filter(
            item =>
              item.profile_id ===
              selectedProfileId
          )
          .sort(
            (a, b) =>
              a.period_order -
              b.period_order
          ),
      [
        periodSlots,
        selectedProfileId,
      ]
    );

  const selectedBatches =
    useMemo(
      () =>
        batches.filter(
          batch =>
            assignedBatchIds.has(
              batch.id
            )
        ),
      [
        batches,
        assignedBatchIds,
      ]
    );


  const selectedBatchSubjects =
    useMemo(
      () =>
        batchSubjects.filter(
          subject =>
            assignedBatchIds.has(
              subject.batch_id
            )
        ),
      [
        batchSubjects,
        assignedBatchIds,
      ]
    );


  const selectedAllocations =
    useMemo(
      () =>
        teachingAllocations.filter(
          allocation =>
            assignedBatchIds.has(
              allocation.batch_id
            ) &&
            allocation.status ===
              "Active"
        ),
      [
        teachingAllocations,
        assignedBatchIds,
      ]
    );


  const activeWorkingDays =
    useMemo(
      () =>
        profileWorkingDays.filter(
          day =>
            day.is_working_day
        ),
      [
        profileWorkingDays,
      ]
    );


  const teachingSlots =
    useMemo(
      () =>
        profilePeriodSlots.filter(
          slot =>
            slot.is_teaching_slot
        ),
      [
        profilePeriodSlots,
      ]
    );


  const subjectsWithoutAllocation =
    useMemo(
      () =>
        selectedBatchSubjects.filter(
          subject =>
            !selectedAllocations.some(
              allocation =>
                allocation.batch_subject_id ===
                subject.id
            )
        ),
      [
        selectedBatchSubjects,
        selectedAllocations,
      ]
    );


  const allocationsWithoutHours =
    useMemo(
      () =>
        selectedAllocations.filter(
          allocation =>
            Number(
              allocation.weekly_hours
            ) <= 0
        ),
      [
        selectedAllocations,
      ]
    );


  const selectedLabSubjects =
    useMemo(
      () =>
        selectedBatchSubjects.filter(
          subject =>
            subject.subject_type ===
              "Lab" ||
            subject.subject_type ===
              "Theory + Lab"
        ),
      [
        selectedBatchSubjects,
      ]
    );


  const activeLaboratories =
    useMemo(
      () =>
        resources.filter(
          resource =>
            resource.is_active &&
            resource.resource_type ===
              "Laboratory"
        ),
      [
        resources,
      ]
    );


  const totalTeachingCapacity =
    useMemo(
      () =>
        activeWorkingDays.length *
        teachingSlots.length,
      [
        activeWorkingDays,
        teachingSlots,
      ]
    );


  const batchSchedulingDemand =
    useMemo(
      () =>
        selectedBatches.map(
          batch => {
            const batchAllocations =
              selectedAllocations.filter(
                allocation =>
                  allocation.batch_id ===
                  batch.id &&
                  Number(
                    allocation.weekly_hours
                  ) > 0
              );

            /*
             * Whole-batch allocations consume one batch
             * timetable slot per scheduled hour.
             *
             * Subgroup allocations are handled separately:
             * different non-empty subgroups may run in
             * parallel, therefore their hours must not be
             * blindly summed as whole-batch demand.
             */
            const wholeBatchHours =
              batchAllocations
                .filter(
                  allocation =>
                    !allocation.subgroup
                      .trim()
                )
                .reduce(
                  (
                    total,
                    allocation
                  ) =>
                    total +
                    Number(
                      allocation.weekly_hours
                    ),
                  0
                );

            const subgroupDemand =
              new Map<
                string,
                number
              >();

            batchAllocations
              .filter(
                allocation =>
                  Boolean(
                    allocation.subgroup
                      .trim()
                  )
              )
              .forEach(
                allocation => {
                  const subgroup =
                    allocation.subgroup
                      .trim()
                      .toUpperCase();

                  subgroupDemand.set(
                    subgroup,
                    (
                      subgroupDemand.get(
                        subgroup
                      ) || 0
                    ) +
                      Number(
                        allocation.weekly_hours
                      )
                  );
                }
              );

            /*
             * Different subgroups may operate simultaneously.
             * Capacity pressure is therefore determined by the
             * largest subgroup workload, not the sum of all
             * subgroup workloads.
             *
             * This is only the structural capacity check.
             * The generator will still validate faculty and
             * resource collisions while placing individual
             * classes.
             */
            const parallelSubgroupHours =
              Math.max(
                0,
                ...Array.from(
                  subgroupDemand.values()
                )
              );

            return {
              batch,
              wholeBatchHours,
              parallelSubgroupHours,
              requiredSlots:
                wholeBatchHours +
                parallelSubgroupHours,
            };
          }
        ),
      [
        selectedBatches,
        selectedAllocations,
      ]
    );


  const batchesOverCapacity =
    useMemo(
      () =>
        batchSchedulingDemand.filter(
          demand =>
            demand.requiredSlots >
            totalTeachingCapacity
        ),
      [
        batchSchedulingDemand,
        totalTeachingCapacity,
      ]
    );


  const readinessChecks =
    useMemo(
      () => [
        {
          id: "profile",
          label:
            "Scheduling profile",
          detail:
            selectedProfile
              ? selectedProfile.name
              : "Select or create an ECE scheduling profile.",
          ready:
            Boolean(
              selectedProfile
            ),
          blocking: true,
        },
        {
          id: "batches",
          label:
            "ECE batch mapping",
          detail:
            selectedBatches.length
              ? `${selectedBatches.length} batch${
                  selectedBatches.length ===
                  1
                    ? ""
                    : "es"
                } assigned`
              : "Assign at least one ECE batch.",
          ready:
            selectedBatches.length >
            0,
          blocking: true,
        },
        {
          id: "days",
          label:
            "Working days",
          detail:
            activeWorkingDays.length
              ? `${activeWorkingDays.length} working day${
                  activeWorkingDays.length ===
                  1
                    ? ""
                    : "s"
                } enabled`
              : "Enable the real college working days.",
          ready:
            activeWorkingDays.length >
            0,
          blocking: true,
        },
        {
          id: "periods",
          label:
            "Teaching periods",
          detail:
            teachingSlots.length
              ? `${teachingSlots.length} teaching slot${
                  teachingSlots.length ===
                  1
                    ? ""
                    : "s"
                } configured`
              : "Configure at least one teaching period.",
          ready:
            teachingSlots.length >
            0,
          blocking: true,
        },
        {
          id: "subjects",
          label:
            "Batch subjects",
          detail:
            selectedBatchSubjects.length
              ? `${selectedBatchSubjects.length} subject${
                  selectedBatchSubjects.length ===
                  1
                    ? ""
                    : "s"
                } found`
              : "Assigned batches have no configured subjects.",
          ready:
            selectedBatchSubjects.length >
            0,
          blocking: true,
        },
        {
          id: "allocations",
          label:
            "Faculty allocations",
          detail:
            subjectsWithoutAllocation.length
              ? `${subjectsWithoutAllocation.length} subject${
                  subjectsWithoutAllocation.length ===
                  1
                    ? ""
                    : "s"
                } missing an active allocation`
              : selectedBatchSubjects.length
                ? "Every configured subject has an active allocation."
                : "Waiting for batch subjects.",
          ready:
            selectedBatchSubjects.length >
              0 &&
            subjectsWithoutAllocation.length ===
              0,
          blocking: true,
        },
        {
          id: "hours",
          label:
            "Weekly teaching hours",
          detail:
            allocationsWithoutHours.length
              ? `${allocationsWithoutHours.length} active allocation${
                  allocationsWithoutHours.length ===
                  1
                    ? ""
                    : "s"
                } still have 0 weekly hours`
              : selectedAllocations.length
                ? "All active allocations have scheduling hours."
                : "Waiting for faculty allocations.",
          ready:
            selectedAllocations.length >
              0 &&
            allocationsWithoutHours.length ===
              0,
          blocking: true,
        },
        {
          id: "capacity",
          label:
            "Weekly timetable capacity",
          detail:
            totalTeachingCapacity <= 0
              ? "No weekly teaching capacity is available."
              : batchesOverCapacity.length
                ? `${batchesOverCapacity.length} batch${
                    batchesOverCapacity.length ===
                    1
                      ? ""
                      : "es"
                  } require more periods than this profile provides.`
                : `${totalTeachingCapacity} teaching slot${
                    totalTeachingCapacity ===
                    1
                      ? ""
                      : "s"
                  } available per batch each week.`,
          ready:
            totalTeachingCapacity >
              0 &&
            batchesOverCapacity.length ===
              0,
          blocking: true,
        },
        {
          id: "resources",
          label:
            "Rooms & laboratories",
          detail:
            selectedLabSubjects.length
              ? activeLaboratories.length
                ? `${activeLaboratories.length} active laborator${
                    activeLaboratories.length ===
                    1
                      ? "y"
                      : "ies"
                  } configured`
                : "Lab subjects exist but no active ECE laboratory is configured."
              : resources.some(
                    resource =>
                      resource.is_active
                  )
                ? "Academic resources are available."
                : "No resource configured. Optional for theory-only scheduling.",
          ready:
            selectedLabSubjects.length
              ? activeLaboratories.length >
                0
              : true,
          blocking:
            selectedLabSubjects.length >
            0,
        },
      ],
      [
        selectedProfile,
        selectedBatches,
        activeWorkingDays,
        teachingSlots,
        selectedBatchSubjects,
        subjectsWithoutAllocation,
        selectedAllocations,
        allocationsWithoutHours,
        totalTeachingCapacity,
        batchesOverCapacity,
        selectedLabSubjects,
        activeLaboratories,
        resources,
      ]
    );


  const blockingReadinessIssues =
    useMemo(
      () =>
        readinessChecks.filter(
          check =>
            check.blocking &&
            !check.ready
        ),
      [
        readinessChecks,
      ]
    );


  const generatorReady =
    blockingReadinessIssues.length ===
    0;


  const generateTimetableDrafts =
    useCallback(() => {
      if (!generatorReady) {
        setError(
          "Resolve all blocking configuration requirements before generating timetable drafts."
        );
        return;
      }

      setGenerating(true);
      setError("");
      setStatus("");

      try {
        /*
         * Generator Phase 1
         *
         * This creates local candidate drafts only.
         * Nothing is written to batch_timetable_entries.
         */

        const activeResources =
          resources.filter(
            resource =>
              resource.is_active
          );

        const classrooms =
          activeResources.filter(
            resource =>
              resource.resource_type ===
                "Classroom" ||
              resource.resource_type ===
                "Seminar Hall"
          );

        const laboratories =
          activeResources.filter(
            resource =>
              resource.resource_type ===
                "Laboratory"
          );

        const orderedDays =
          [...activeWorkingDays].sort(
            (a, b) =>
              a.display_order -
              b.display_order
          );

        const orderedSlots =
          [...teachingSlots].sort(
            (a, b) =>
              a.period_order -
              b.period_order
          );

        /*
         * weekly_hours currently represents discrete timetable
         * periods. Fractional values are rejected rather than
         * silently rounded.
         */
        const fractional =
          selectedAllocations.filter(
            allocation => {
              const hours =
                Number(
                  allocation.weekly_hours
                );

              return (
                hours > 0 &&
                !Number.isInteger(
                  hours
                )
              );
            }
          );

        if (fractional.length) {
          throw new Error(
            `${fractional.length} active allocation${
              fractional.length === 1
                ? ""
                : "s"
            } use fractional weekly hours. The current generator schedules discrete periods and will not round them automatically.`
          );
        }

        const subjectById =
          new Map(
            selectedBatchSubjects.map(
              subject => [
                subject.id,
                subject,
              ]
            )
          );

        /*
         * Validate explicit session structure before generating.
         *
         * weekly_hours is the total weekly timetable demand.
         * session_length_periods is the number of consecutive
         * periods that form one session.
         *
         * For now, consecutive multi-period sessions are used
         * by Lab allocations. Other allocation types continue
         * to schedule as independent one-period sessions.
         */
        const invalidSessionAllocations =
          selectedAllocations.filter(
            allocation => {
              if (
                allocation.allocation_type !==
                "Lab"
              ) {
                return false;
              }

              const weeklyPeriods =
                Number(
                  allocation.weekly_hours
                );

              const sessionLength =
                Number(
                  allocation.session_length_periods
                );

              return (
                weeklyPeriods > 0 &&
                (
                  !Number.isInteger(
                    sessionLength
                  ) ||
                  sessionLength < 1 ||
                  sessionLength > 6 ||
                  sessionLength >
                    weeklyPeriods ||
                  weeklyPeriods %
                    sessionLength !==
                    0
                )
              );
            }
          );

        if (
          invalidSessionAllocations.length
        ) {
          throw new Error(
            `${invalidSessionAllocations.length} active lab allocation${
              invalidSessionAllocations.length ===
              1
                ? ""
                : "s"
            } have invalid session lengths. Weekly periods must be divisible by periods per session.`
          );
        }

        const allocationRequests =
          selectedAllocations
            .filter(
              allocation =>
                Number(
                  allocation.weekly_hours
                ) > 0
            )
            .flatMap(
              allocation => {
                const weeklyPeriods =
                  Number(
                    allocation.weekly_hours
                  );

                const sessionLength =
                  allocation.allocation_type ===
                    "Lab"
                    ? Math.max(
                        1,
                        Number(
                          allocation.session_length_periods
                        ) || 1
                      )
                    : 1;

                const sessionCount =
                  weeklyPeriods /
                  sessionLength;

                return Array.from(
                  {
                    length:
                      sessionCount,
                  },
                  (_, occurrence) => ({
                    allocation,
                    occurrence,
                    sessionLength,
                  })
                );
              }
            );


        const buildDraft = (
          draftIndex: number
        ): TimetableDraft => {
          const entries:
            GeneratedTimetableEntry[] =
              [];

          const unscheduled:
            string[] = [];

          /*
           * Occupancy keys deliberately separate:
           * - batch whole-class occupancy
           * - subgroup occupancy
           * - faculty occupancy
           * - resource occupancy
           *
           * This mirrors the database collision rules.
           */
          const facultyBusy =
            new Set<string>();

          const resourceBusy =
            new Set<string>();

          const wholeBatchBusy =
            new Set<string>();

          const subgroupBusy =
            new Set<string>();

          const subjectDayCount =
            new Map<string, number>();

          const facultyDayCount =
            new Map<string, number>();

          const requests =
            [...allocationRequests];

          /*
           * Three deterministic strategies:
           *
           * A: balanced by subject/faculty
           * B: rotates day preference
           * C: rotates period preference
           *
           * No random scheduling means the same configuration
           * produces reproducible candidates.
           */
          requests.sort(
            (left, right) => {
              const leftAllocation =
                left.allocation;

              const rightAllocation =
                right.allocation;

              const leftLab =
                leftAllocation.allocation_type ===
                  "Lab"
                  ? 1
                  : 0;

              const rightLab =
                rightAllocation.allocation_type ===
                  "Lab"
                  ? 1
                  : 0;

              /*
               * Place labs first because they have the
               * strongest resource constraint.
               */
              if (
                leftLab !==
                rightLab
              ) {
                return (
                  rightLab -
                  leftLab
                );
              }

              return (
                Number(
                  rightAllocation.weekly_hours
                ) -
                Number(
                  leftAllocation.weekly_hours
                )
              );
            }
          );

          const canUseSlot = (
            allocation:
              TeachingAllocation,
            day: WorkingDay,
            slot: PeriodSlot,
            resource:
              Resource | null
          ) => {
            const subgroup =
              allocation.subgroup
                .trim()
                .toUpperCase();

            const base =
              `${day.day_of_week}:${slot.period_order}`;

            const facultyKey =
              `${allocation.faculty_id}:${base}`;

            if (
              facultyBusy.has(
                facultyKey
              )
            ) {
              return false;
            }

            if (subgroup) {
              if (
                wholeBatchBusy.has(
                  `${allocation.batch_id}:${base}`
                )
              ) {
                return false;
              }

              if (
                subgroupBusy.has(
                  `${allocation.batch_id}:${subgroup}:${base}`
                )
              ) {
                return false;
              }
            } else {
              if (
                wholeBatchBusy.has(
                  `${allocation.batch_id}:${base}`
                )
              ) {
                return false;
              }

              const subgroupPrefix =
                `${allocation.batch_id}:`;

              const subgroupSuffix =
                `:${base}`;

              if (
                Array.from(
                  subgroupBusy
                ).some(
                  key =>
                    key.startsWith(
                      subgroupPrefix
                    ) &&
                    key.endsWith(
                      subgroupSuffix
                    )
                )
              ) {
                return false;
              }
            }

            if (resource) {
              const resourceKey =
                `${resource.id}:${base}`;

              if (
                resourceBusy.has(
                  resourceKey
                )
              ) {
                return false;
              }
            }

            return true;
          };

          const reserve = (
            allocation:
              TeachingAllocation,
            day: WorkingDay,
            slot: PeriodSlot,
            resource:
              Resource | null
          ) => {
            const subgroup =
              allocation.subgroup
                .trim()
                .toUpperCase();

            const base =
              `${day.day_of_week}:${slot.period_order}`;

            facultyBusy.add(
              `${allocation.faculty_id}:${base}`
            );

            if (subgroup) {
              subgroupBusy.add(
                `${allocation.batch_id}:${subgroup}:${base}`
              );
            } else {
              wholeBatchBusy.add(
                `${allocation.batch_id}:${base}`
              );
            }

            if (resource) {
              resourceBusy.add(
                `${resource.id}:${base}`
              );
            }
          };

          /*
           * The complete chronological slot sequence includes
           * both teaching periods and protected non-teaching
           * slots such as Break/Lunch.
           *
           * A multi-period session is valid only when every
           * chronological slot in the requested block is a
           * teaching slot. This prevents a lab from jumping
           * across a break.
           */
          const chronologicalSlots =
            [...profilePeriodSlots].sort(
              (a, b) =>
                a.period_order -
                b.period_order
            );

          const teachingRankByOrder =
            new Map(
              orderedSlots.map(
                (slot, index) => [
                  slot.period_order,
                  index + 1,
                ]
              )
            );

          const getSessionSlots = (
            startSlot: PeriodSlot,
            sessionLength: number
          ): PeriodSlot[] | null => {
            const startIndex =
              chronologicalSlots.findIndex(
                slot =>
                  slot.id ===
                  startSlot.id
              );

            if (startIndex < 0) {
              return null;
            }

            const block =
              chronologicalSlots.slice(
                startIndex,
                startIndex +
                  sessionLength
              );

            if (
              block.length !==
              sessionLength
            ) {
              return null;
            }

            if (
              block.some(
                slot =>
                  !slot.is_teaching_slot
              )
            ) {
              return null;
            }

            return block;
          };


          for (
            const request of requests
          ) {
            const {
              allocation,
              occurrence,
              sessionLength,
            } = request;

            const subject =
              subjectById.get(
                allocation.batch_subject_id
              );

            if (!subject) {
              unscheduled.push(
                `${allocation.faculty_name || "Faculty"} · missing subject`
              );
              continue;
            }

            const isLab =
              allocation.allocation_type ===
                "Lab";

            const resourcePool =
              isLab
                ? laboratories
                : classrooms.length
                  ? classrooms
                  : [
                      null,
                    ];

            if (
              isLab &&
              !resourcePool.length
            ) {
              unscheduled.push(
                `${subject.subject_code || subject.subject_name} · no active laboratory`
              );
              continue;
            }

            const dayCandidates =
              [...orderedDays];

            if (
              dayCandidates.length
            ) {
              const shift =
                (
                  draftIndex +
                  occurrence
                ) %
                dayCandidates.length;

              dayCandidates.push(
                ...dayCandidates.splice(
                  0,
                  shift
                )
              );
            }

            const slotCandidates =
              [...orderedSlots];

            if (
              draftIndex === 2 &&
              slotCandidates.length
            ) {
              const shift =
                occurrence %
                slotCandidates.length;

              slotCandidates.push(
                ...slotCandidates.splice(
                  0,
                  shift
                )
              );
            }

            type Candidate = {
              day: WorkingDay;
              slots: PeriodSlot[];
              resource:
                Resource | null;
              cost: number;
            };

            const candidates:
              Candidate[] = [];

            for (
              const day of
              dayCandidates
            ) {
              for (
                const startSlot of
                slotCandidates
              ) {
                const sessionSlots =
                  getSessionSlots(
                    startSlot,
                    sessionLength
                  );

                if (!sessionSlots) {
                  continue;
                }

                for (
                  const resource of
                  resourcePool
                ) {
                  /*
                   * A block is atomic: every period must be
                   * available for faculty, batch/subgroup and
                   * resource before any period is reserved.
                   */
                  const blockAvailable =
                    sessionSlots.every(
                      slot =>
                        canUseSlot(
                          allocation,
                          day,
                          slot,
                          resource
                        )
                    );

                  if (!blockAvailable) {
                    continue;
                  }

                  const subjectDayKey =
                    `${allocation.batch_subject_id}:${day.day_of_week}`;

                  const facultyDayKey =
                    `${allocation.faculty_id}:${day.day_of_week}`;

                  const sameSubjectDay =
                    subjectDayCount.get(
                      subjectDayKey
                    ) || 0;

                  const sameFacultyDay =
                    facultyDayCount.get(
                      facultyDayKey
                    ) || 0;

                  /*
                   * Lower cost is preferred.
                   */
                  let cost =
                    sameFacultyDay *
                    4;

                  if (!isLab) {
                    cost +=
                      sameSubjectDay *
                      20;
                  }

                  /*
                   * Prefer earlier TEACHING positions, not raw
                   * chronological period_order.
                   *
                   * A break consumes chronological order but
                   * should not make the following teaching
                   * period look artificially late.
                   */
                  const teachingRank =
                    teachingRankByOrder.get(
                      startSlot.period_order
                    ) || 1;

                  cost +=
                    teachingRank *
                    0.15;

                  if (
                    draftIndex === 1
                  ) {
                    cost +=
                      day.display_order *
                      0.08;
                  }

                  candidates.push({
                    day,
                    slots:
                      sessionSlots,
                    resource,
                    cost,
                  });
                }
              }
            }

            candidates.sort(
              (a, b) =>
                a.cost -
                b.cost
            );

            const chosen =
              candidates[0];

            if (!chosen) {
              unscheduled.push(
                `${subject.subject_code || subject.subject_name} · ${allocation.faculty_name || "Faculty"}${
                  allocation.subgroup
                    ? ` · ${allocation.subgroup}`
                    : ""
                }${
                  sessionLength > 1
                    ? ` · ${sessionLength}-period block`
                    : ""
                }`
              );
              continue;
            }

            /*
             * Reserve the complete block only after a valid
             * candidate has been selected.
             */
            chosen.slots.forEach(
              slot =>
                reserve(
                  allocation,
                  chosen.day,
                  slot,
                  chosen.resource
                )
            );

            const subjectDayKey =
              `${allocation.batch_subject_id}:${chosen.day.day_of_week}`;

            /*
             * One scheduled block counts as one subject session
             * for repeated-day distribution.
             */
            subjectDayCount.set(
              subjectDayKey,
              (
                subjectDayCount.get(
                  subjectDayKey
                ) || 0
              ) + 1
            );

            const facultyDayKey =
              `${allocation.faculty_id}:${chosen.day.day_of_week}`;

            /*
             * Faculty daily load still reflects actual occupied
             * timetable periods.
             */
            facultyDayCount.set(
              facultyDayKey,
              (
                facultyDayCount.get(
                  facultyDayKey
                ) || 0
              ) +
                chosen.slots.length
            );

            /*
             * Persist one generated entry for every occupied
             * teaching period. This keeps the existing preview
             * and future batch_timetable_entries publishing
             * model compatible.
             */
            chosen.slots.forEach(
              slot => {
                entries.push({
                  draft_id:
                    `draft-${draftIndex + 1}`,
                  allocation_id:
                    allocation.id,
                  batch_id:
                    allocation.batch_id,
                  batch_subject_id:
                    allocation.batch_subject_id,
                  faculty_id:
                    allocation.faculty_id,
                  faculty_name:
                    allocation.faculty_name,
                  day_of_week:
                    chosen.day.day_of_week,
                  period_order:
                    slot.period_order,
                  start_time:
                    cleanTime(
                      slot.start_time
                    ),
                  end_time:
                    cleanTime(
                      slot.end_time
                    ),
                  subgroup:
                    allocation.subgroup
                      .trim()
                      .toUpperCase(),
                  resource_id:
                    chosen.resource?.id ||
                    null,
                  room:
                    chosen.resource
                      ?.resource_code ||
                    "",
                  class_type:
                    isLab
                      ? "Lab"
                      : allocation.allocation_type ===
                          "Tutorial"
                        ? "Tutorial"
                        : allocation.allocation_type ===
                            "Project"
                          ? "Project"
                          : allocation.allocation_type ===
                              "Mentoring"
                            ? "Mentoring"
                            : "Lecture",
                });
              }
            );
          }


          let repeatedDayPenalty =
            0;

          subjectDayCount.forEach(
            count => {
              if (count > 1) {
                repeatedDayPenalty +=
                  count - 1;
              }
            }
          );

          const lateSlotThreshold =
            Math.max(
              1,
              Math.ceil(
                orderedSlots.length *
                  0.75
              )
            );

          const lateSlotPenalty =
            entries.filter(
              entry =>
                (
                  teachingRankByOrder.get(
                    entry.period_order
                  ) || 1
                ) >
                lateSlotThreshold
            ).length;

          const requested =
            selectedAllocations.reduce(
              (
                total,
                allocation
              ) =>
                total +
                Math.max(
                  0,
                  Number(
                    allocation.weekly_hours
                  ) || 0
                ),
              0
            );

          const scheduled =
            entries.length;

          /*
           * Score is explanatory rather than authoritative.
           * Unscheduled periods carry a dominant penalty.
           */
          const score =
            Math.max(
              0,
              Math.round(
                100 -
                  unscheduled.length *
                    15 -
                  repeatedDayPenalty *
                    2 -
                  lateSlotPenalty *
                    0.5
              )
            );

          const descriptions = [
            "Balanced distribution across working days with constrained resources.",
            "Alternative day rotation to reduce repeated scheduling patterns.",
            "Alternative period rotation for a different daily class distribution.",
          ];

          return {
            id:
              `draft-${draftIndex + 1}`,
            label:
              `Draft ${String.fromCharCode(
                65 + draftIndex
              )}`,
            description:
              descriptions[
                draftIndex
              ],
            score,
            entries,
            unscheduled,
            metrics: {
              scheduled,
              requested,
              facultyGaps:
                unscheduled.length,
              repeatedDayPenalty,
              lateSlotPenalty,
            },
          };
        };

        const drafts = [
          buildDraft(0),
          buildDraft(1),
          buildDraft(2),
        ].sort(
          (a, b) =>
            b.score -
            a.score
        );

        setTimetableDrafts(
          drafts
        );

        setSelectedDraftId(
          drafts[0]?.id || ""
        );

        setStatus(
          `Generated ${drafts.length} timetable drafts locally. Nothing has been published.`
        );
      } catch (generationError) {
        setError(
          errorText(
            generationError,
            "Unable to generate timetable drafts."
          )
        );
      } finally {
        setGenerating(false);
      }
    }, [
      generatorReady,
      resources,
      activeWorkingDays,
      teachingSlots,
      selectedAllocations,
      selectedBatchSubjects,
    ]);


  const selectedDraft =
    useMemo(
      () =>
        timetableDrafts.find(
          draft =>
            draft.id ===
            selectedDraftId
        ) || null,
      [
        timetableDrafts,
        selectedDraftId,
      ]
    );


  const publishSelectedDraft =
    async () => {

      /*
       * Timetable publication authority belongs only
       * to the department's assigned Timetable Coordinator.
       *
       * Main Admin continues to configure timetable
       * profiles/resources and assign coordinators,
       * but cannot publish timetable content.
       */
      setStatus("");

      setError(
        "Timetable publishing has moved to the assigned Timetable Coordinator. Open Timetable Assignment to manage coordinator authority."
      );

    };


  const loadWorkspace =
    useCallback(
      async () => {
        if (!canManage) {
          setLoading(false);
          return;
        }

        const client =
          getSupabaseClient();

        if (!client) {
          setError(
            "Supabase is unavailable."
          );
          setLoading(false);
          return;
        }

        setLoading(true);
        setError("");

        try {
          const [
            profilesResult,
            batchesResult,
            batchProfilesResult,
            daysResult,
            slotsResult,
            resourcesResult,
            subjectsResult,
            allocationsResult,
          ] =
            await Promise.all([
              client
                .from(
                  "timetable_scheduling_profiles"
                )
                .select(
                  "id,name,department,academic_year,semester,is_active,created_by"
                )
                .eq(
                  "department",
                  "ECE"
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                ),

              client
                .from(
                  "attendance_batches"
                )
                .select(
                  "id,batch_name,department,academic_year,semester,section"
                )
                .eq(
                  "department",
                  "ECE"
                )
                .order(
                  "batch_name",
                  {
                    ascending:
                      true,
                  }
                ),

              client
                .from(
                  "timetable_batch_profiles"
                )
                .select(
                  "batch_id,profile_id"
                ),

              client
                .from(
                  "timetable_working_days"
                )
                .select(
                  "id,profile_id,day_of_week,display_order,is_working_day"
                )
                .order(
                  "display_order",
                  {
                    ascending:
                      true,
                  }
                ),

              client
                .from(
                  "timetable_period_slots"
                )
                .select(
                  "id,profile_id,period_order,label,start_time,end_time,is_teaching_slot"
                )
                .order(
                  "period_order",
                  {
                    ascending:
                      true,
                  }
                ),

              client
                .from(
                  "timetable_resources"
                )
                .select(
                  "id,department,resource_code,resource_name,resource_type,building,floor,capacity,is_active"
                )
                .eq(
                  "department",
                  "ECE"
                )
                .order(
                  "resource_code",
                  {
                    ascending:
                      true,
                  }
                ),

              client
                .from(
                  "attendance_batch_subjects"
                )
                .select(
                  "id,batch_id,subject_name,subject_code,subject_type"
                ),

              client
                .from(
                  "faculty_teaching_allocations"
                )
                .select(
                  "id,batch_id,batch_subject_id,faculty_id,faculty_name,allocation_type,subgroup,weekly_hours,session_length_periods,is_primary,status"
                ),
            ]);

          const firstError =
            profilesResult.error ||
            batchesResult.error ||
            batchProfilesResult.error ||
            daysResult.error ||
            slotsResult.error ||
            resourcesResult.error ||
            subjectsResult.error ||
            allocationsResult.error;

          if (firstError) {
            throw firstError;
          }

          const nextProfiles =
            (
              profilesResult.data ||
              []
            ) as SchedulingProfile[];

          setSchedulingProfiles(
            nextProfiles
          );

          setBatches(
            (
              batchesResult.data ||
              []
            ) as Batch[]
          );

          setBatchProfiles(
            (
              batchProfilesResult.data ||
              []
            ) as BatchProfile[]
          );

          setWorkingDays(
            (
              daysResult.data ||
              []
            ) as WorkingDay[]
          );

          setPeriodSlots(
            (
              slotsResult.data ||
              []
            ) as PeriodSlot[]
          );

          setResources(
            (
              resourcesResult.data ||
              []
            ) as Resource[]
          );

          setBatchSubjects(
            (
              subjectsResult.data ||
              []
            ) as BatchSubject[]
          );

          setTeachingAllocations(
            (
              allocationsResult.data ||
              []
            ) as TeachingAllocation[]
          );

          setSelectedProfileId(
            current => {
              if (
                current &&
                nextProfiles.some(
                  item =>
                    item.id ===
                    current
                )
              ) {
                return current;
              }

              return (
                nextProfiles[0]
                  ?.id || ""
              );
            }
          );
        } catch (
          caughtError
        ) {
          setError(
            errorText(
              caughtError,
              "Unable to load timetable configuration."
            )
          );
        } finally {
          setLoading(false);
        }
      },
      [canManage]
    );

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const createProfile =
    async () => {
      const name =
        profileForm.name.trim();

      if (name.length < 2) {
        setError(
          "Enter a scheduling profile name."
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
      setStatus("");

      try {
        const {
          data: auth,
          error: authError,
        } =
          await client.auth.getUser();

        if (
          authError ||
          !auth.user
        ) {
          throw new Error(
            authError?.message ||
            "Authentication required."
          );
        }

        const {
          data,
          error: insertError,
        } =
          await client
            .from(
              "timetable_scheduling_profiles"
            )
            .insert({
              name,
              department:
                "ECE",
              academic_year:
                profileForm
                  .academicYear
                  .trim(),
              semester:
                profileForm
                  .semester
                  .trim(),
              created_by:
                auth.user.id,
            })
            .select(
              "id,name,department,academic_year,semester,is_active,created_by"
            )
            .single();

        if (insertError) {
          throw insertError;
        }

        setSchedulingProfiles(
          current => [
            data as SchedulingProfile,
            ...current,
          ]
        );

        setSelectedProfileId(
          data.id
        );

        setProfileForm({
          name: "",
          academicYear: "",
          semester: "",
        });

        setStatus(
          "Scheduling profile created."
        );
      } catch (
        caughtError
      ) {
        setError(
          errorText(
            caughtError,
            "Unable to create scheduling profile."
          )
        );
      } finally {
        setSaving(false);
      }
    };

  const toggleBatch =
    async (
      batchId: string
    ) => {
      if (!selectedProfileId) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setSaving(true);
      setError("");
      setStatus("");

      try {
        if (
          assignedBatchIds.has(
            batchId
          )
        ) {
          const {
            error:
              deleteError,
          } =
            await client
              .from(
                "timetable_batch_profiles"
              )
              .delete()
              .eq(
                "batch_id",
                batchId
              );

          if (deleteError) {
            throw deleteError;
          }
        } else {
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
              "Authentication required."
            );
          }

          const {
            error:
              upsertError,
          } =
            await client
              .from(
                "timetable_batch_profiles"
              )
              .upsert(
                {
                  batch_id:
                    batchId,
                  profile_id:
                    selectedProfileId,
                  created_by:
                    auth.user.id,
                },
                {
                  onConflict:
                    "batch_id",
                }
              );

          if (upsertError) {
            throw upsertError;
          }
        }

        await loadWorkspace();

        setStatus(
          "Batch assignment updated."
        );
      } catch (
        caughtError
      ) {
        setError(
          errorText(
            caughtError,
            "Unable to update batch assignment."
          )
        );
      } finally {
        setSaving(false);
      }
    };

  const toggleDay =
    async (
      day: DayName,
      enabled: boolean
    ) => {
      if (!selectedProfileId) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setSaving(true);
      setError("");
      setStatus("");

      try {
        const displayOrder =
          DAYS.indexOf(day) + 1;

        const {
          error:
            upsertError,
        } =
          await client
            .from(
              "timetable_working_days"
            )
            .upsert(
              {
                profile_id:
                  selectedProfileId,
                day_of_week:
                  day,
                display_order:
                  displayOrder,
                is_working_day:
                  enabled,
              },
              {
                onConflict:
                  "profile_id,day_of_week",
              }
            );

        if (upsertError) {
          throw upsertError;
        }

        await loadWorkspace();
      } catch (
        caughtError
      ) {
        setError(
          errorText(
            caughtError,
            "Unable to update working day."
          )
        );
      } finally {
        setSaving(false);
      }
    };

  const resetPeriodForm =
    () => {
      setEditingPeriodId(
        null
      );

      setPeriodForm({
        label: "",
        startTime: "",
        endTime: "",
        teaching: true,
      });
    };


  const editPeriod =
    (
      slot: PeriodSlot
    ) => {
      setEditingPeriodId(
        slot.id
      );

      setPeriodForm({
        label:
          slot.label || "",
        startTime:
          cleanTime(
            slot.start_time
          ),
        endTime:
          cleanTime(
            slot.end_time
          ),
        teaching:
          slot.is_teaching_slot,
      });

      setError("");
      setStatus("");

      window.setTimeout(
        () => {
          document
            .getElementById(
              "timetable-period-editor"
            )
            ?.scrollIntoView({
              behavior:
                "smooth",
              block:
                "center",
            });
        },
        0
      );
    };


  const savePeriod =
    async () => {
      if (
        !selectedProfileId ||
        !periodForm.startTime ||
        !periodForm.endTime
      ) {
        setError(
          "Enter the slot start and end time."
        );
        return;
      }

      if (
        periodForm.endTime <=
        periodForm.startTime
      ) {
        setError(
          "Slot end time must be after its start time."
        );
        return;
      }

      const overlappingSlot =
        profilePeriodSlots.find(
          slot =>
            slot.id !==
              editingPeriodId &&
            periodForm.startTime <
              cleanTime(
                slot.end_time
              ) &&
            periodForm.endTime >
              cleanTime(
                slot.start_time
              )
        );

      if (overlappingSlot) {
        setError(
          `This time overlaps with ${
            overlappingSlot.label ||
            `slot ${overlappingSlot.period_order}`
          }.`
        );
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        setError(
          "CampusConnect database connection is unavailable."
        );
        return;
      }

      setSaving(true);
      setError("");
      setStatus("");

      try {
        if (editingPeriodId) {
          const {
            data:
              updatedRows,
            error:
              updateError,
          } =
            await client.rpc(
              "save_timetable_period_slot",
              {
                p_profile_id:
                  selectedProfileId,
                p_slot_id:
                  editingPeriodId,
                p_label:
                  periodForm.label
                    .trim(),
                p_start_time:
                  periodForm
                    .startTime,
                p_end_time:
                  periodForm
                    .endTime,
                p_is_teaching_slot:
                  periodForm
                    .teaching,
              }
            );

          if (updateError) {
            throw updateError;
          }

          const updatedSlot =
            Array.isArray(
              updatedRows
            )
              ? updatedRows[0]
              : null;

          if (!updatedSlot) {
            throw new Error(
              "The period slot was not updated. Refresh the timetable configuration and try again."
            );
          }

          await loadWorkspace();

          resetPeriodForm();

          setStatus(
            `${updatedSlot.label || `Period ${updatedSlot.period_order}`} updated and reordered chronologically.`
          );

          return;
        }

        const {
          error:
            insertError,
        } =
          await client.rpc(
            "save_timetable_period_slot",
            {
              p_profile_id:
                selectedProfileId,
              p_slot_id:
                null,
              p_label:
                periodForm.label
                  .trim(),
              p_start_time:
                periodForm
                  .startTime,
              p_end_time:
                periodForm
                  .endTime,
              p_is_teaching_slot:
                periodForm
                  .teaching,
            }
          );

        if (insertError) {
          throw insertError;
        }

        resetPeriodForm();

        await loadWorkspace();

        setStatus(
          "Period slot added and reordered chronologically."
        );
      } catch (
        caughtError
      ) {
        setError(
          errorText(
            caughtError,
            editingPeriodId
              ? "Unable to update period slot."
              : "Unable to add period slot."
          )
        );
      } finally {
        setSaving(false);
      }
    };


  const removePeriod =
    async (
      slot: PeriodSlot
    ) => {
      const confirmed =
        window.confirm(
          `Remove ${
            slot.label ||
            `period ${slot.period_order}`
          }?`
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
      setStatus("");

      try {
        const {
          error:
            deleteError,
        } =
          await client.rpc(
            "delete_timetable_period_slot",
            {
              p_slot_id:
                slot.id,
            }
          );

        if (deleteError) {
          throw deleteError;
        }

        await loadWorkspace();

        setStatus(
          "Period slot removed and remaining slots reordered."
        );
      } catch (
        caughtError
      ) {
        setError(
          errorText(
            caughtError,
            "Unable to remove period slot."
          )
        );
      } finally {
        setSaving(false);
      }
    };

  const addResource =
    async () => {
      const code =
        resourceForm.code.trim();

      const name =
        resourceForm.name.trim();

      if (!code || !name) {
        setError(
          "Enter both resource code and resource name."
        );
        return;
      }

      const capacity =
        resourceForm.capacity
          ? Number(
              resourceForm.capacity
            )
          : null;

      if (
        capacity !== null &&
        (
          !Number.isInteger(
            capacity
          ) ||
          capacity <= 0
        )
      ) {
        setError(
          "Capacity must be a positive whole number."
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
      setStatus("");

      try {
        const {
          data: auth,
          error: authError,
        } =
          await client.auth.getUser();

        if (
          authError ||
          !auth.user
        ) {
          throw new Error(
            authError?.message ||
            "Authentication required."
          );
        }

        const {
          error:
            insertError,
        } =
          await client
            .from(
              "timetable_resources"
            )
            .insert({
              department:
                "ECE",
              resource_code:
                code,
              resource_name:
                name,
              resource_type:
                resourceForm.type,
              building:
                resourceForm
                  .building
                  .trim(),
              floor:
                resourceForm.floor
                  .trim(),
              capacity,
              created_by:
                auth.user.id,
            });

        if (insertError) {
          throw insertError;
        }

        setResourceForm({
          code: "",
          name: "",
          type: "Classroom",
          building: "",
          floor: "",
          capacity: "",
        });

        await loadWorkspace();

        setStatus(
          "Room or laboratory added."
        );
      } catch (
        caughtError
      ) {
        setError(
          errorText(
            caughtError,
            "Unable to add timetable resource."
          )
        );
      } finally {
        setSaving(false);
      }
    };

  const deactivateResource =
    async (
      resource: Resource
    ) => {
      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setSaving(true);
      setError("");
      setStatus("");

      try {
        const {
          error:
            updateError,
        } =
          await client
            .from(
              "timetable_resources"
            )
            .update({
              is_active:
                !resource.is_active,
            })
            .eq(
              "id",
              resource.id
            );

        if (updateError) {
          throw updateError;
        }

        await loadWorkspace();

        setStatus(
          resource.is_active
            ? "Resource deactivated."
            : "Resource activated."
        );
      } catch (
        caughtError
      ) {
        setError(
          errorText(
            caughtError,
            "Unable to update resource."
          )
        );
      } finally {
        setSaving(false);
      }
    };

  if (!canManage) {
    return null;
  }

  if (loading) {
    return (
      <section className="timetableAutomationShell">
        <div className="timetableAutomationEmpty">
          Loading timetable automation...
        </div>
      </section>
    );
  }

  return (
    <section
      id="timetable-automation"
      className="timetableAutomationShell"
    >
      <header className="timetableAutomationHero">
        <div>
          <span>
            ECE · TIMETABLE AUTOMATION
          </span>

          <h2>
            Timetable Control Center
          </h2>

          <p>
            Configure the real academic schedule once.
            CampusConnect will use these constraints for
            automatic timetable generation and conflict
            detection.
          </p>
        </div>

        <div className="timetableAutomationHeroStats">
          <div>
            <strong>
              {schedulingProfiles.length}
            </strong>
            <span>Profiles</span>
          </div>

          <div>
            <strong>
              {
                profileWorkingDays.filter(
                  item =>
                    item.is_working_day
                ).length
              }
            </strong>
            <span>Working days</span>
          </div>

          <div>
            <strong>
              {
                profilePeriodSlots.filter(
                  item =>
                    item.is_teaching_slot
                ).length
              }
            </strong>
            <span>Teaching slots</span>
          </div>

          <div>
            <strong>
              {
                resources.filter(
                  item =>
                    item.is_active
                ).length
              }
            </strong>
            <span>Resources</span>
          </div>
        </div>
      </header>

      {status ? (
        <div className="timetableAutomationStatus">
          {status}
        </div>
      ) : null}

      {error ? (
        <div className="timetableAutomationError">
          {error}
        </div>
      ) : null}

      <div className="timetableAutomationGrid">
        <article className="timetableAutomationCard">
          <header>
            <span>01</span>
            <div>
              <h3>
                Scheduling Profile
              </h3>
              <p>
                Define the academic schedule that one or
                more ECE batches will follow.
              </p>
            </div>
          </header>

          {schedulingProfiles.length ? (
            <label className="timetableAutomationField">
              <span>Active profile</span>

              <select
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
                {schedulingProfiles.map(
                  item => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                      {item.semester
                        ? ` · Sem ${item.semester}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </label>
          ) : (
            <div className="timetableAutomationEmpty">
              No ECE scheduling profile exists yet.
            </div>
          )}

          <div className="timetableAutomationForm">
            <label>
              <span>Profile name</span>
              <input
                value={
                  profileForm.name
                }
                placeholder="Enter profile name"
                onChange={
                  event =>
                    setProfileForm(
                      current => ({
                        ...current,
                        name:
                          event.target
                            .value,
                      })
                    )
                }
              />
            </label>

            <div className="timetableAutomationSplit">
              <label>
                <span>
                  Academic year
                </span>
                <input
                  value={
                    profileForm
                      .academicYear
                  }
                  placeholder="Enter academic year"
                  onChange={
                    event =>
                      setProfileForm(
                        current => ({
                          ...current,
                          academicYear:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>

              <label>
                <span>Semester</span>
                <input
                  value={
                    profileForm.semester
                  }
                  placeholder="Enter semester"
                  onChange={
                    event =>
                      setProfileForm(
                        current => ({
                          ...current,
                          semester:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={
                () =>
                  void createProfile()
              }
            >
              Create Scheduling Profile
            </button>
          </div>

          {selectedProfile ? (
            <div className="timetableAutomationSelected">
              <span>
                CURRENT CONFIGURATION
              </span>
              <strong>
                {selectedProfile.name}
              </strong>
              <small>
                ECE
                {selectedProfile.academic_year
                  ? ` · ${selectedProfile.academic_year}`
                  : ""}
                {selectedProfile.semester
                  ? ` · Semester ${selectedProfile.semester}`
                  : ""}
              </small>
            </div>
          ) : null}
        </article>

        <article className="timetableAutomationCard">
          <header>
            <span>02</span>
            <div>
              <h3>
                Assign ECE Batches
              </h3>
              <p>
                Choose which batches use the selected
                scheduling profile.
              </p>
            </div>
          </header>

          {!selectedProfileId ? (
            <div className="timetableAutomationEmpty">
              Create or select a scheduling profile first.
            </div>
          ) : !batches.length ? (
            <div className="timetableAutomationEmpty">
              No ECE batches are available.
            </div>
          ) : (
            <div className="timetableAutomationBatchList">
              {batches.map(
                batch => {
                  const checked =
                    assignedBatchIds.has(
                      batch.id
                    );

                  return (
                    <label
                      key={batch.id}
                      className={
                        checked
                          ? "selected"
                          : ""
                      }
                    >
                      <input
                        type="checkbox"
                        checked={
                          checked
                        }
                        disabled={
                          saving
                        }
                        onChange={
                          () =>
                            void toggleBatch(
                              batch.id
                            )
                        }
                      />

                      <div>
                        <strong>
                          {batch.batch_name ||
                            "ECE Batch"}
                        </strong>

                        <small>
                          {[
                            batch.academic_year,
                            batch.semester
                              ? `Semester ${batch.semester}`
                              : "",
                            batch.section
                              ? `Section ${batch.section}`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </div>
                    </label>
                  );
                }
              )}
            </div>
          )}
        </article>

        <article className="timetableAutomationCard">
          <header>
            <span>03</span>
            <div>
              <h3>
                Working Days
              </h3>
              <p>
                Enable only the days on which this
                scheduling profile can place classes.
              </p>
            </div>
          </header>

          {!selectedProfileId ? (
            <div className="timetableAutomationEmpty">
              Select a scheduling profile first.
            </div>
          ) : (
            <div className="timetableAutomationDays">
              {DAYS.map(
                day => {
                  const stored =
                    profileWorkingDays.find(
                      item =>
                        item.day_of_week ===
                        day
                    );

                  const enabled =
                    stored?.is_working_day ??
                    false;

                  return (
                    <label
                      key={day}
                      className={
                        enabled
                          ? "active"
                          : ""
                      }
                    >
                      <input
                        type="checkbox"
                        checked={
                          enabled
                        }
                        disabled={
                          saving
                        }
                        onChange={
                          event =>
                            void toggleDay(
                              day,
                              event.target
                                .checked
                            )
                        }
                      />

                      <span>
                        {day.slice(
                          0,
                          3
                        )}
                      </span>

                      <small>
                        {enabled
                          ? "Working"
                          : "Off"}
                      </small>
                    </label>
                  );
                }
              )}
            </div>
          )}
        </article>

        <article className="timetableAutomationCard timetableAutomationWide">
          <header>
            <span>04</span>
            <div>
              <h3>
                Period Structure
              </h3>
              <p>
                Enter the real college period, break and
                lunch timings. Overlapping slots are
                rejected by the database.
              </p>
            </div>
          </header>

          <div
            id="timetable-period-editor"
            className={
              editingPeriodId
                ? "timetableAutomationPeriodEditor editing"
                : "timetableAutomationPeriodEditor"
            }
          >
            <div className="timetableAutomationPeriodEditorHeader">
              <div>
                <span>
                  {editingPeriodId
                    ? "EDIT SLOT"
                    : "NEW SLOT"}
                </span>

                <strong>
                  {editingPeriodId
                    ? "Update period structure"
                    : "Add period structure"}
                </strong>
              </div>

              {editingPeriodId && (
                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={
                    resetPeriodForm
                  }
                >
                  Cancel edit
                </button>
              )}
            </div>


            <div className="timetableAutomationPeriodForm">
              <label>
                <span>Label</span>

                <input
                  value={
                    periodForm.label
                  }
                  placeholder="Period 1 / Break / Lunch"
                  disabled={
                    !selectedProfileId ||
                    saving
                  }
                  onChange={
                    event =>
                      setPeriodForm(
                        current => ({
                          ...current,
                          label:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label>
                <span>Start</span>

                <input
                  type="time"
                  value={
                    periodForm.startTime
                  }
                  disabled={
                    !selectedProfileId ||
                    saving
                  }
                  onChange={
                    event =>
                      setPeriodForm(
                        current => ({
                          ...current,
                          startTime:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label>
                <span>End</span>

                <input
                  type="time"
                  value={
                    periodForm.endTime
                  }
                  disabled={
                    !selectedProfileId ||
                    saving
                  }
                  onChange={
                    event =>
                      setPeriodForm(
                        current => ({
                          ...current,
                          endTime:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label>
                <span>Slot type</span>

                <select
                  value={
                    periodForm.teaching
                      ? "teaching"
                      : "break"
                  }
                  disabled={
                    !selectedProfileId ||
                    saving
                  }
                  onChange={
                    event =>
                      setPeriodForm(
                        current => ({
                          ...current,
                          teaching:
                            event.target
                              .value ===
                            "teaching",
                        })
                      )
                  }
                >
                  <option value="teaching">
                    Teaching
                  </option>

                  <option value="break">
                    Break / Lunch
                  </option>
                </select>
              </label>


              <button
                type="button"
                disabled={
                  saving ||
                  !selectedProfileId
                }
                onClick={
                  () =>
                    void savePeriod()
                }
              >
                {saving
                  ? "Saving..."
                  : editingPeriodId
                    ? "Save Changes"
                    : "Add Slot"}
              </button>
            </div>


            <p className="timetableAutomationPeriodHint">
              Teaching slots can receive classes.
              Break and lunch slots stay protected
              from timetable generation.
            </p>
          </div>


          {!profilePeriodSlots.length ? (
            <div className="timetableAutomationEmpty">
              No period slots configured for this profile.
            </div>
          ) : (
            <div className="timetableAutomationPeriods">
              {profilePeriodSlots.map(
                slot => (
                  <div
                    key={
                      slot.id
                    }
                    className={
                      [
                        slot.is_teaching_slot
                          ? "teaching"
                          : "nonTeaching",
                        editingPeriodId ===
                          slot.id
                          ? "isEditing"
                          : "",
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          " "
                        )
                    }
                  >
                    <span className="timetableAutomationPeriodNumber">
                      {slot.period_order}
                    </span>

                    <div>
                      <strong>
                        {slot.label ||
                          `Period ${slot.period_order}`}
                      </strong>

                      <small>
                        {cleanTime(
                          slot.start_time
                        )}
                        {" — "}
                        {cleanTime(
                          slot.end_time
                        )}
                      </small>
                    </div>

                    <em
                      className={
                        slot.is_teaching_slot
                          ? "teaching"
                          : "break"
                      }
                    >
                      {slot.is_teaching_slot
                        ? "Teaching"
                        : "Break / Lunch"}
                    </em>

                    <div className="timetableAutomationPeriodActions">
                      <button
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={
                          () =>
                            editPeriod(
                              slot
                            )
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={
                          () =>
                            void removePeriod(
                              slot
                            )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </article>

        <article
          id="timetable-resources"
          className="timetableAutomationCard timetableAutomationWide"
        >
          <header>
            <span>05</span>
            <div>
              <h3>
                Rooms & Laboratories
              </h3>
              <p>
                Register real ECE teaching resources.
                The published timetable already has
                database-level resource collision
                protection.
              </p>
            </div>
          </header>

          <div className="timetableAutomationResourceForm">
            <label>
              <span>Code</span>
              <input
                value={
                  resourceForm.code
                }
                placeholder="Resource code"
                onChange={
                  event =>
                    setResourceForm(
                      current => ({
                        ...current,
                        code:
                          event.target
                            .value,
                      })
                    )
                }
              />
            </label>

            <label>
              <span>Name</span>
              <input
                value={
                  resourceForm.name
                }
                placeholder="Room / lab name"
                onChange={
                  event =>
                    setResourceForm(
                      current => ({
                        ...current,
                        name:
                          event.target
                            .value,
                      })
                    )
                }
              />
            </label>

            <label>
              <span>Type</span>
              <select
                value={
                  resourceForm.type
                }
                onChange={
                  event =>
                    setResourceForm(
                      current => ({
                        ...current,
                        type:
                          event.target
                            .value as ResourceType,
                      })
                    )
                }
              >
                {RESOURCE_TYPES.map(
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
              <span>Building</span>
              <input
                value={
                  resourceForm.building
                }
                placeholder="Optional"
                onChange={
                  event =>
                    setResourceForm(
                      current => ({
                        ...current,
                        building:
                          event.target
                            .value,
                      })
                    )
                }
              />
            </label>

            <label>
              <span>Floor</span>
              <input
                value={
                  resourceForm.floor
                }
                placeholder="Optional"
                onChange={
                  event =>
                    setResourceForm(
                      current => ({
                        ...current,
                        floor:
                          event.target
                            .value,
                      })
                    )
                }
              />
            </label>

            <label>
              <span>Capacity</span>
              <input
                type="number"
                min="1"
                step="1"
                value={
                  resourceForm.capacity
                }
                placeholder="Optional"
                onChange={
                  event =>
                    setResourceForm(
                      current => ({
                        ...current,
                        capacity:
                          event.target
                            .value,
                      })
                    )
                }
              />
            </label>

            <button
              type="button"
              disabled={saving}
              onClick={
                () =>
                  void addResource()
              }
            >
              Add Resource
            </button>
          </div>

          {!resources.length ? (
            <div className="timetableAutomationEmpty">
              No ECE rooms or laboratories configured.
            </div>
          ) : (
            <div className="timetableAutomationResources">
              {resources.map(
                resource => (
                  <div
                    key={resource.id}
                    className={
                      resource.is_active
                        ? ""
                        : "inactive"
                    }
                  >
                    <span>
                      {
                        resource.resource_code
                      }
                    </span>

                    <div>
                      <strong>
                        {
                          resource.resource_name
                        }
                      </strong>

                      <small>
                        {[
                          resource.resource_type,
                          resource.building,
                          resource.floor
                            ? `Floor ${resource.floor}`
                            : "",
                          resource.capacity
                            ? `Capacity ${resource.capacity}`
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </div>

                    <em>
                      {resource.is_active
                        ? "Active"
                        : "Inactive"}
                    </em>

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={
                        () =>
                          void deactivateResource(
                            resource
                          )
                      }
                    >
                      {resource.is_active
                        ? "Deactivate"
                        : "Activate"}
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </article>
      </div>

      <section className="timetableReadiness">
        <header className="timetableReadinessHeader">
          <div>
            <span>
              CONFIGURATION READINESS
            </span>

            <h3>
              Timetable Generator
            </h3>

            <p>
              CampusConnect validates the selected
              scheduling profile before timetable
              generation is allowed.
            </p>
          </div>

          <div
            className={
              generatorReady
                ? "timetableReadinessScore ready"
                : "timetableReadinessScore blocked"
            }
          >
            <small>
              STATUS
            </small>

            <strong>
              {generatorReady
                ? "READY"
                : "ACTION REQUIRED"}
            </strong>

            <span>
              {
                readinessChecks.filter(
                  check =>
                    check.ready
                ).length
              }
              {" / "}
              {readinessChecks.length}
              {" checks"}
            </span>
          </div>
        </header>


        <div className="timetableReadinessGrid">
          {readinessChecks.map(
            check => (
              <article
                key={
                  check.id
                }
                className={
                  check.ready
                    ? "ready"
                    : check.blocking
                      ? "blocked"
                      : "optional"
                }
              >
                <div className="timetableReadinessIcon">
                  {check.ready
                    ? "✓"
                    : check.blocking
                      ? "!"
                      : "○"}
                </div>

                <div>
                  <strong>
                    {check.label}
                  </strong>

                  <p>
                    {check.detail}
                  </p>
                </div>

                <em>
                  {check.ready
                    ? "Ready"
                    : check.blocking
                      ? "Required"
                      : "Optional"}
                </em>
              </article>
            )
          )}
        </div>


        {blockingReadinessIssues.length >
          0 && (
          <div className="timetableReadinessIssues">
            <div>
              <span>
                BLOCKING ISSUES
              </span>

              <strong>
                {
                  blockingReadinessIssues.length
                }{" "}
                configuration requirement{
                  blockingReadinessIssues.length ===
                  1
                    ? ""
                    : "s"
                } remaining
              </strong>
            </div>

            <ul>
              {blockingReadinessIssues.map(
                issue => (
                  <li
                    key={
                      issue.id
                    }
                  >
                    <b>
                      {issue.label}
                    </b>

                    <span>
                      {issue.detail}
                    </span>

                    {issue.id === "hours" &&
                      onOpenFacultyWorkload && (
                        <button
                          type="button"
                          className="timetableReadinessIssueAction"
                          onClick={
                            onOpenFacultyWorkload
                          }
                        >
                          Configure Workload
                          <span>→</span>
                        </button>
                      )}

                    {issue.id === "resources" && (
                      <button
                        type="button"
                        className="timetableReadinessIssueAction"
                        onClick={() => {
                          document
                            .getElementById(
                              "timetable-resources"
                            )
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                        }}
                      >
                        Configure Resources
                        <span>↓</span>
                      </button>
                    )}
                  </li>
                )
              )}
            </ul>
          </div>
        )}


        {allocationsWithoutHours.length >
          0 && (
          <div className="timetableReadinessAllocationWarning">
            <div>
              <span>
                FACULTY WORKLOAD REQUIRED
              </span>

              <strong>
                Configure real weekly hours
              </strong>

              <p>
                These active allocations cannot be
                scheduled until their weekly teaching
                requirement is greater than zero.
              </p>

              {onOpenFacultyWorkload && (
                <button
                  type="button"
                  className="timetableReadinessPrimaryAction"
                  onClick={
                    onOpenFacultyWorkload
                  }
                >
                  Open Faculty Workload
                  <span>→</span>
                </button>
              )}
            </div>

            <div>
              {allocationsWithoutHours
                .slice(
                  0,
                  8
                )
                .map(
                  allocation => {
                    const subject =
                      batchSubjects.find(
                        item =>
                          item.id ===
                          allocation.batch_subject_id
                      );

                    const batch =
                      batches.find(
                        item =>
                          item.id ===
                          allocation.batch_id
                      );

                    return (
                      <span
                        key={
                          allocation.id
                        }
                      >
                        <b>
                          {subject?.subject_code ||
                            subject?.subject_name ||
                            "Subject"}
                        </b>

                        {batch?.batch_name ||
                          "ECE Batch"}
                        {" · "}
                        {allocation.faculty_name ||
                          "Faculty"}
                      </span>
                    );
                  }
                )}
            </div>
          </div>
        )}


        {timetableDrafts.length > 0 && (
          <section className="timetableGeneratorPreview">

            <header className="timetableGeneratorPreviewHeader">
              <div>
                <span>
                  GENERATED LOCALLY
                </span>

                <h3>
                  Candidate Timetables
                </h3>

                <p>
                  Compare three scheduling candidates before
                  anything is published to students or faculty.
                </p>
              </div>

              <div className="timetableGeneratorSafeBadge">
                <small>
                  DATABASE
                </small>
                <strong>
                  NOT PUBLISHED
                </strong>
              </div>
            </header>


            <div className="timetableGeneratorDraftTabs">
              {timetableDrafts.map(
                draft => (
                  <button
                    key={draft.id}
                    type="button"
                    className={
                      selectedDraftId ===
                      draft.id
                        ? "active"
                        : ""
                    }
                    onClick={
                      () =>
                        setSelectedDraftId(
                          draft.id
                        )
                    }
                  >
                    <span>
                      {draft.label}
                    </span>

                    <strong>
                      {draft.score}
                    </strong>

                    <small>
                      {draft.metrics.scheduled}
                      {" / "}
                      {draft.metrics.requested}
                      {" periods"}
                    </small>
                  </button>
                )
              )}
            </div>


            {selectedDraft && (
              <>
                <div className="timetableGeneratorSummary">
                  <div>
                    <span>
                      SCORE
                    </span>
                    <strong>
                      {selectedDraft.score}
                    </strong>
                  </div>

                  <div>
                    <span>
                      SCHEDULED
                    </span>
                    <strong>
                      {selectedDraft.metrics.scheduled}
                      {" / "}
                      {selectedDraft.metrics.requested}
                    </strong>
                  </div>

                  <div>
                    <span>
                      UNSCHEDULED
                    </span>
                    <strong>
                      {selectedDraft.unscheduled.length}
                    </strong>
                  </div>

                  <div>
                    <span>
                      REPEAT PENALTY
                    </span>
                    <strong>
                      {selectedDraft.metrics.repeatedDayPenalty}
                    </strong>
                  </div>
                </div>


                <p className="timetableGeneratorDescription">
                  {selectedDraft.description}
                </p>


                {selectedDraft.unscheduled.length >
                  0 && (
                  <div className="timetableGeneratorWarnings">
                    <strong>
                      Unscheduled requirements
                    </strong>

                    <div>
                      {selectedDraft.unscheduled.map(
                        (
                          issue,
                          index
                        ) => (
                          <span
                            key={
                              `${issue}-${index}`
                            }
                          >
                            {issue}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}


                <div className="timetableGeneratorBatchPreview">
                  {selectedBatches.map(
                    batch => {
                      const batchEntries =
                        selectedDraft.entries.filter(
                          entry =>
                            entry.batch_id ===
                            batch.id
                        );

                      return (
                        <article
                          key={batch.id}
                        >
                          <header>
                            <div>
                              <span>
                                ECE TIMETABLE
                              </span>

                              <strong>
                                {batch.batch_name}
                              </strong>

                              <small>
                                {batch.semester
                                  ? `Semester ${batch.semester}`
                                  : ""}
                                {batch.section
                                  ? ` · Section ${batch.section}`
                                  : ""}
                              </small>
                            </div>

                            <b>
                              {batchEntries.length}
                              {" periods"}
                            </b>
                          </header>

                          <div className="timetableGeneratorGrid">
                            <div className="timetableGeneratorGridHead">
                              <span>
                                Day
                              </span>

                              {teachingSlots.map(
                                slot => (
                                  <span
                                    key={
                                      slot.id
                                    }
                                  >
                                    {slot.label ||
                                      `P${slot.period_order}`}
                                    <small>
                                      {cleanTime(
                                        slot.start_time
                                      )}
                                    </small>
                                  </span>
                                )
                              )}
                            </div>

                            {activeWorkingDays.map(
                              day => (
                                <div
                                  key={
                                    day.id
                                  }
                                  className="timetableGeneratorGridRow"
                                >
                                  <strong>
                                    {day.day_of_week}
                                  </strong>

                                  {teachingSlots.map(
                                    slot => {
                                      const entries =
                                        batchEntries.filter(
                                          entry =>
                                            entry.day_of_week ===
                                              day.day_of_week &&
                                            entry.period_order ===
                                              slot.period_order
                                        );

                                      return (
                                        <div
                                          key={
                                            slot.id
                                          }
                                          className={
                                            entries.length
                                              ? "filled"
                                              : ""
                                          }
                                        >
                                          {!entries.length
                                            ? (
                                              <span className="timetableGeneratorFree">
                                                —
                                              </span>
                                            )
                                            : entries.map(
                                                entry => {
                                                  const subject =
                                                    selectedBatchSubjects.find(
                                                      item =>
                                                        item.id ===
                                                        entry.batch_subject_id
                                                    );

                                                  return (
                                                    <section
                                                      key={
                                                        `${entry.allocation_id}-${entry.day_of_week}-${entry.period_order}`
                                                      }
                                                    >
                                                      <b>
                                                        {subject?.subject_code ||
                                                          subject?.subject_name ||
                                                          "Subject"}
                                                      </b>

                                                      <span>
                                                        {entry.faculty_name ||
                                                          "Faculty"}
                                                      </span>

                                                      <small>
                                                        {entry.subgroup
                                                          ? `${entry.subgroup} · `
                                                          : ""}
                                                        {entry.room ||
                                                          entry.class_type}
                                                      </small>
                                                    </section>
                                                  );
                                                }
                                              )}
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>


                <footer className="timetableGeneratorPublishLock">
                  <div>
                    <span>
                      PUBLISH REVIEW
                    </span>

                    <strong>
                      Publish selected timetable version
                    </strong>

                    <p>
                      Review the selected draft carefully.
                      Publishing creates a new timetable version
                      and preserves the previous version for
                      historical coverage and substitution records.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      publishing ||
                      !selectedDraft ||
                      selectedDraft
                        .unscheduled
                        .length > 0 ||
                      selectedDraft
                        .metrics
                        .scheduled !==
                        selectedDraft
                          .metrics
                          .requested
                    }
                    title={
                      !selectedDraft
                        ? "Select a timetable draft first."
                        : selectedDraft
                              .unscheduled
                              .length > 0
                          ? "Resolve unscheduled periods before publishing."
                          : selectedDraft
                                .metrics
                                .scheduled !==
                              selectedDraft
                                .metrics
                                .requested
                            ? "The selected draft is incomplete."
                            : "Publish this draft as the current timetable."
                    }
                    onClick={
                      publishSelectedDraft
                    }
                  >
                    {publishing
                      ? "Publishing..."
                      : "Publish Timetable"}
                  </button>
                </footer>
              </>
            )}
          </section>
        )}


        <footer className="timetableAutomationNext">
          <div>
            <span>
              NEXT ENGINE
            </span>

            <strong>
              Automatic Timetable Generator
            </strong>

            <p>
              {generatorReady
                ? "The selected ECE scheduling profile has passed all blocking configuration checks."
                : "Resolve the blocking configuration issues above before timetable generation."}
            </p>
          </div>

          <button
            type="button"
            disabled={
              !generatorReady ||
              generating
            }
            title={
              generatorReady
                ? "Generate three local timetable candidates for review."
                : `${blockingReadinessIssues.length} blocking configuration requirement(s) remain.`
            }
            onClick={
              generateTimetableDrafts
            }
          >
            {generating
              ? "Generating..."
              : generatorReady
                ? "Generate Timetable"
                : "Configuration Incomplete"}
          </button>
        </footer>
      </section>
    </section>
  );
}
