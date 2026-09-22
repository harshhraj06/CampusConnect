"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSupabaseClient,
} from "../lib/supabase";


type PlannerSubject = {
  id: string;
  batch_id: string;
  subject_name: string;
  subject_code: string;
  subject_type: string;
  credits: number;
  faculty_id: string;
  faculty_name: string;
};


type PlannerBatch = {
  id: string;
  batch_name: string;
  section: string;
  department: string;
  academic_year: string;
  semester: string;
};


type PlannerTopic = {
  topicOrder: number;
  title: string;
  description: string;
};


type PlannerUnit = {
  unitNumber: number;
  title: string;
  description: string;
  topics: PlannerTopic[];
};


type PlannerDraft = {
  documentTitle: string;
  detectedSubject: string;
  units: PlannerUnit[];
  warnings: string[];
};


type PlannedTopic = {
  unitIndex: number;
  topicIndex: number;
  unitNumber: number;
  unitTitle: string;
  topicOrder: number;
  topicTitle: string;
  plannedClasses: number;
};


type TeachingAllocation = {
  id: string;
  weekly_hours: number;
  session_length_periods: number;
  allocation_type: string;
  subgroup: string;
  status: string;
};


type TimetableEntry = {
  id: string;
  batch_id: string;
  batch_subject_id: string;
  faculty_id: string;
  day_of_week: string;
  period_order: number;
  start_time: string;
  end_time: string;
  class_type: string;
  subgroup: string;
};


type CapacityState = {
  loading: boolean;
  weeklySessions: number;
  weeklyPeriods: number;
  source:
    | "allocation"
    | "timetable"
    | "unavailable";
  message: string;
};


type ScanPayload = {
  success?: boolean;
  readOnly?: boolean;
  sourceType?: string;
  mode?: string;
  fileName?: string;
  mimeType?: string;
  pages?: number;
  draft?: PlannerDraft;
  warnings?: string[];
  message?: string;
  error?: string;
};


type FacultySyllabusSmartPlannerProps = {
  subject: PlannerSubject;
  batch: PlannerBatch | null;

  onStatus: (
    value: string
  ) => void;

  onApplied: () =>
    void |
    Promise<void>;
};


const MAX_FILE_SIZE =
  20 * 1024 * 1024;


const ALLOWED_FILE_TYPES =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);


const cleanText = (
  value: unknown
) =>
  String(
    value ?? ""
  ).trim();


const roundTwo = (
  value: number
) =>
  Math.round(
    value * 100
  ) / 100;


const countTopics = (
  draft: PlannerDraft | null
) =>
  draft
    ? draft.units.reduce(
        (
          total,
          unit
        ) =>
          total +
          unit.topics.length,
        0
      )
    : 0;


const buildTeachingPlan = (
  draft: PlannerDraft,
  totalClasses: number
): PlannedTopic[] => {

  const topics =
    draft.units.flatMap(
      (
        unit,
        unitIndex
      ) =>
        unit.topics.map(
          (
            topic,
            topicIndex
          ) => ({
            unitIndex,
            topicIndex,
            unitNumber:
              unit.unitNumber,
            unitTitle:
              unit.title,
            topicOrder:
              topic.topicOrder,
            topicTitle:
              topic.title,
          })
        )
    );


  if (
    !topics.length ||
    totalClasses <= 0
  ) {
    return [];
  }


  /*
   * Production rule:
   *
   * 1. Every syllabus topic has equal baseline importance.
   * 2. Whole teaching classes are allocated only.
   * 3. Remaining classes are spread across the syllabus,
   *    instead of all extra classes being front-loaded.
   * 4. Faculty can edit the result before anything is saved.
   *
   * AI is intentionally NOT used to invent topic complexity.
   */
  const baseClasses =
    Math.floor(
      totalClasses /
      topics.length
    );


  const remainder =
    totalClasses %
    topics.length;


  const extraIndexes =
    new Set<number>();


  if (
    remainder > 0
  ) {
    for (
      let extra = 0;
      extra < remainder;
      extra += 1
    ) {

      const index =
        Math.floor(
          (
            extra *
            topics.length
          ) /
          remainder
        );


      extraIndexes.add(
        Math.min(
          topics.length - 1,
          index
        )
      );
    }
  }


  return topics.map(
    (
      topic,
      index
    ) => ({
      ...topic,

      plannedClasses:
        baseClasses +
        (
          extraIndexes.has(
            index
          )
            ? 1
            : 0
        ),
    })
  );
};


const countTimetableSessions = (
  entries: TimetableEntry[]
) => {

  const grouped =
    new Map<
      string,
      TimetableEntry[]
    >();


  entries.forEach(
    entry => {

      const key =
        [
          entry.day_of_week,
          cleanText(
            entry.subgroup
          ),
          cleanText(
            entry.class_type
          ),
        ].join(
          "::"
        );


      const current =
        grouped.get(
          key
        ) || [];


      current.push(
        entry
      );


      grouped.set(
        key,
        current
      );
    }
  );


  let sessions =
    0;


  grouped.forEach(
    rows => {

      const ordered =
        [...rows].sort(
          (
            a,
            b
          ) =>
            a.period_order -
            b.period_order
        );


      let previous:
        TimetableEntry |
        null = null;


      ordered.forEach(
        row => {

          const continuous =
            previous !==
              null &&
            row.period_order ===
              previous.period_order +
                1 &&
            cleanText(
              row.start_time
            ) ===
              cleanText(
                previous.end_time
              );


          if (
            !continuous
          ) {
            sessions +=
              1;
          }


          previous =
            row;
        }
      );
    }
  );


  return sessions;
};


export default function FacultySyllabusSmartPlanner({
  subject,
  batch,
  onStatus,
  onApplied,
}: FacultySyllabusSmartPlannerProps) {

  const [
    sourceMode,
    setSourceMode,
  ] =
    useState<
      "upload" |
      "drive"
    >(
      "upload"
    );


  const [
    file,
    setFile,
  ] =
    useState<
      File |
      null
    >(
      null
    );


  const [
    driveUrl,
    setDriveUrl,
  ] =
    useState(
      ""
    );


  const [
    scanning,
    setScanning,
  ] =
    useState(
      false
    );


  const [
    scanMessage,
    setScanMessage,
  ] =
    useState(
      ""
    );


  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );


  const [
    draft,
    setDraft,
  ] =
    useState<
      PlannerDraft |
      null
    >(
      null
    );


  const [
    capacity,
    setCapacity,
  ] =
    useState<
      CapacityState
    >({
      loading:
        true,

      weeklySessions:
        0,

      weeklyPeriods:
        0,

      source:
        "unavailable",

      message:
        "",
    });


  const [
    teachingWeeks,
    setTeachingWeeks,
  ] =
    useState(
      14
    );


  const [
    manualWeeklySessions,
    setManualWeeklySessions,
  ] =
    useState(
      ""
    );


  const [
    planRows,
    setPlanRows,
  ] =
    useState<
      PlannedTopic[]
    >(
      []
    );


  const topicCount =
    useMemo(
      () =>
        countTopics(
          draft
        ),
      [
        draft,
      ]
    );


  const effectiveWeeklySessions =
    useMemo(
      () => {

        const manual =
          Number(
            manualWeeklySessions
          );


        if (
          cleanText(
            manualWeeklySessions
          ) &&
          Number.isFinite(
            manual
          ) &&
          manual > 0
        ) {
          return Math.floor(
            manual
          );
        }


        return capacity
          .weeklySessions;
      },
      [
        manualWeeklySessions,
        capacity.weeklySessions,
      ]
    );


  const totalClasses =
    useMemo(
      () =>
        Math.max(
          0,
          Math.floor(
            effectiveWeeklySessions *
            Math.max(
              1,
              teachingWeeks
            )
          )
        ),
      [
        effectiveWeeklySessions,
        teachingWeeks,
      ]
    );


  const planTotal =
    useMemo(
      () =>
        planRows.reduce(
          (
            total,
            row
          ) =>
            total +
            row.plannedClasses,
          0
        ),
      [
        planRows,
      ]
    );


  const planBalance =
    totalClasses -
    planTotal;


  const uncoveredPlanTopics =
    useMemo(
      () =>
        planRows.filter(
          row =>
            row.plannedClasses <=
            0
        ).length,
      [
        planRows,
      ]
    );


  const classesPerTopic =
    useMemo(
      () => {

        if (
          !topicCount ||
          !totalClasses
        ) {
          return null;
        }


        return roundTwo(
          totalClasses /
          topicCount
        );
      },
      [
        topicCount,
        totalClasses,
      ]
    );


  const loadTeachingCapacity =
    useCallback(
      async () => {

        const client =
          getSupabaseClient();


        if (!client) {

          setCapacity({
            loading:
              false,

            weeklySessions:
              0,

            weeklyPeriods:
              0,

            source:
              "unavailable",

            message:
              "CampusConnect is not connected to Supabase.",
          });

          return;
        }


        setCapacity(
          current => ({
            ...current,
            loading:
              true,
          })
        );


        try {

          const {
            data:
              authData,
            error:
              authError,
          } =
            await client.auth
              .getUser();


          if (
            authError ||
            !authData.user
          ) {
            throw new Error(
              authError?.message ||
              "Your session is unavailable."
            );
          }


          const {
            data:
              allocationData,
            error:
              allocationError,
          } =
            await client
              .from(
                "faculty_teaching_allocations"
              )
              .select(
                "id,weekly_hours,session_length_periods,allocation_type,subgroup,status"
              )
              .eq(
                "batch_subject_id",
                subject.id
              )
              .eq(
                "status",
                "Active"
              );


          if (
            allocationError
          ) {
            throw allocationError;
          }


          const allocations =
            (
              allocationData ||
              []
            ) as TeachingAllocation[];


          const configuredAllocations =
            allocations.filter(
              item =>
                Number(
                  item.weekly_hours
                ) >
                0
            );


          if (
            configuredAllocations.length
          ) {

            const weeklyPeriods =
              configuredAllocations.reduce(
                (
                  total,
                  item
                ) =>
                  total +
                  Math.max(
                    0,
                    Number(
                      item.weekly_hours
                    ) ||
                      0
                  ),
                0
              );


            const weeklySessions =
              configuredAllocations.reduce(
                (
                  total,
                  item
                ) => {

                  const hours =
                    Math.max(
                      0,
                      Number(
                        item.weekly_hours
                      ) ||
                        0
                    );


                  const sessionLength =
                    Math.max(
                      1,
                      Math.floor(
                        Number(
                          item.session_length_periods
                        ) ||
                          1
                      )
                    );


                  return (
                    total +
                    hours /
                      sessionLength
                  );
                },
                0
              );


            setCapacity({
              loading:
                false,

              weeklySessions:
                roundTwo(
                  weeklySessions
                ),

              weeklyPeriods:
                roundTwo(
                  weeklyPeriods
                ),

              source:
                "allocation",

              message:
                "Calculated from your active faculty teaching allocation.",
            });

            return;
          }


          /*
           * Older/backfilled allocations may have weekly_hours = 0.
           * In that case use the currently published timetable as
           * a read-only fallback.
           */
          const {
            data:
              timetableData,
            error:
              timetableError,
          } =
            await client
              .rpc(
                "get_current_batch_timetable_entries",
                {
                  p_batch_ids: [
                    subject.batch_id,
                  ],
                }
              );


          if (
            timetableError
          ) {
            throw timetableError;
          }


          const ownEntries =
            (
              timetableData ||
              []
            )
              .filter(
                (
                  row:
                    TimetableEntry
                ) =>
                  row.batch_subject_id ===
                    subject.id &&
                  row.faculty_id ===
                    authData.user.id
              ) as TimetableEntry[];


          if (
            ownEntries.length
          ) {

            const sessions =
              countTimetableSessions(
                ownEntries
              );


            setCapacity({
              loading:
                false,

              weeklySessions:
                sessions,

              weeklyPeriods:
                ownEntries.length,

              source:
                "timetable",

              message:
                "Teaching allocation hours are not configured, so CampusConnect calculated this from your currently published timetable.",
            });

            return;
          }


          setCapacity({
            loading:
              false,

            weeklySessions:
              0,

            weeklyPeriods:
              0,

            source:
              "unavailable",

            message:
              "No weekly teaching hours or published timetable sessions are configured for this subject yet.",
          });

        } catch (
          error
        ) {

          console.error(
            "[Smart Syllabus Planner capacity]",
            error
          );


          setCapacity({
            loading:
              false,

            weeklySessions:
              0,

            weeklyPeriods:
              0,

            source:
              "unavailable",

            message:
              error instanceof
                Error
                ? error.message
                : "Unable to calculate teaching capacity.",
          });
        }
      },
      [
        subject.id,
        subject.batch_id,
      ]
    );


  useEffect(
    () => {

      setFile(
        null
      );

      setDriveUrl(
        ""
      );

      setDraft(
        null
      );

      setScanMessage(
        ""
      );

      setManualWeeklySessions(
        ""
      );

      setPlanRows(
        []
      );

      void loadTeachingCapacity();

    },
    [
      subject.id,
      loadTeachingCapacity,
    ]
  );


  useEffect(
    () => {

      /*
       * Any syllabus edit or capacity change invalidates the
       * previously generated allocation. This prevents stale
       * plans being mistaken for the current syllabus.
       */
      setPlanRows(
        []
      );

    },
    [
      draft,
      totalClasses,
    ]
  );


  const handleFile =
    (
      event:
        ChangeEvent<
          HTMLInputElement
        >
    ) => {

      const selected =
        event.target
          .files?.[0] ||
        null;


      if (!selected) {
        setFile(
          null
        );

        return;
      }


      if (
        selected.size >
        MAX_FILE_SIZE
      ) {
        event.target.value =
          "";

        setFile(
          null
        );

        setScanMessage(
          "Syllabus files must be 20 MB or smaller."
        );

        return;
      }


      if (
        selected.type &&
        !ALLOWED_FILE_TYPES.has(
          selected.type
        )
      ) {
        event.target.value =
          "";

        setFile(
          null
        );

        setScanMessage(
          "Use PDF, JPG, JPEG, PNG or WEBP."
        );

        return;
      }


      setFile(
        selected
      );

      setScanMessage(
        ""
      );

      setDraft(
        null
      );
    };


  const scanSyllabus =
    async () => {

      if (
        sourceMode ===
          "upload" &&
        !file
      ) {

        setScanMessage(
          "Choose a syllabus PDF or image first."
        );

        return;
      }


      if (
        sourceMode ===
          "drive" &&
        !cleanText(
          driveUrl
        )
      ) {

        setScanMessage(
          "Paste a shared Google Drive syllabus link."
        );

        return;
      }


      const client =
        getSupabaseClient();


      if (!client) {
        setScanMessage(
          "CampusConnect is not connected to Supabase."
        );

        return;
      }


      setScanning(
        true
      );

      setScanMessage(
        ""
      );

      setDraft(
        null
      );


      try {

        const {
          data:
            sessionData,
          error:
            sessionError,
        } =
          await client.auth
            .getSession();


        const accessToken =
          sessionData.session
            ?.access_token ||
          "";


        if (
          sessionError ||
          !accessToken
        ) {
          throw new Error(
            sessionError?.message ||
            "Your session is unavailable."
          );
        }


        const formData =
          new FormData();


        formData.set(
          "batchSubjectId",
          subject.id
        );


        if (
          sourceMode ===
            "upload" &&
          file
        ) {
          formData.set(
            "file",
            file
          );
        }


        if (
          sourceMode ===
            "drive"
        ) {
          formData.set(
            "driveUrl",
            cleanText(
              driveUrl
            )
          );
        }


        const response =
          await fetch(
            "/api/academics/syllabus/scan",
            {
              method:
                "POST",

              headers: {
                Authorization:
                  `Bearer ${accessToken}`,
              },

              body:
                formData,
            }
          );


        let payload:
          ScanPayload;


        try {
          payload =
            await response
              .json();
        } catch {
          throw new Error(
            `Syllabus scanner returned HTTP ${response.status}.`
          );
        }


        if (
          !response.ok ||
          !payload.success ||
          !payload.draft
        ) {
          throw new Error(
            payload.error ||
            "Unable to scan the syllabus."
          );
        }


        setDraft(
          payload.draft
        );


        const extractedTopics =
          countTopics(
            payload.draft
          );


        const message =
          `Extracted ${payload.draft.units.length} unit${payload.draft.units.length === 1 ? "" : "s"} and ${extractedTopics} topic${extractedTopics === 1 ? "" : "s"} for review. Nothing has been saved yet.`;


        setScanMessage(
          message
        );

        onStatus(
          message
        );

      } catch (
        error
      ) {

        console.error(
          "[Smart Syllabus Planner scan]",
          error
        );


        setScanMessage(
          error instanceof
            Error
            ? error.message
            : "Unable to scan syllabus."
        );

      } finally {

        setScanning(
          false
        );
      }
    };


  const updateUnit =
    (
      unitIndex:
        number,
      field:
        "title" |
        "description",
      value:
        string
    ) => {

      setDraft(
        current => {

          if (!current) {
            return current;
          }


          return {
            ...current,

            units:
              current.units.map(
                (
                  unit,
                  index
                ) =>
                  index ===
                    unitIndex
                    ? {
                        ...unit,
                        [field]:
                          value,
                      }
                    : unit
              ),
          };
        }
      );
    };


  const updateTopic =
    (
      unitIndex:
        number,
      topicIndex:
        number,
      field:
        "title" |
        "description",
      value:
        string
    ) => {

      setDraft(
        current => {

          if (!current) {
            return current;
          }


          return {
            ...current,

            units:
              current.units.map(
                (
                  unit,
                  index
                ) => {

                  if (
                    index !==
                    unitIndex
                  ) {
                    return unit;
                  }


                  return {
                    ...unit,

                    topics:
                      unit.topics.map(
                        (
                          topic,
                          childIndex
                        ) =>
                          childIndex ===
                            topicIndex
                            ? {
                                ...topic,
                                [field]:
                                  value,
                              }
                            : topic
                      ),
                  };
                }
              ),
          };
        }
      );
    };


  const removeTopic =
    (
      unitIndex:
        number,
      topicIndex:
        number
    ) => {

      setDraft(
        current => {

          if (!current) {
            return current;
          }


          return {
            ...current,

            units:
              current.units.map(
                (
                  unit,
                  index
                ) => {

                  if (
                    index !==
                    unitIndex
                  ) {
                    return unit;
                  }


                  return {
                    ...unit,

                    topics:
                      unit.topics
                        .filter(
                          (
                            _topic,
                            childIndex
                          ) =>
                            childIndex !==
                            topicIndex
                        )
                        .map(
                          (
                            topic,
                            childIndex
                          ) => ({
                            ...topic,
                            topicOrder:
                              childIndex +
                              1,
                          })
                        ),
                  };
                }
              ),
          };
        }
      );
    };


  const removeUnit =
    (
      unitIndex:
        number
    ) => {

      setDraft(
        current => {

          if (!current) {
            return current;
          }


          return {
            ...current,

            units:
              current.units
                .filter(
                  (
                    _unit,
                    index
                  ) =>
                    index !==
                    unitIndex
                )
                .map(
                  (
                    unit,
                    index
                  ) => ({
                    ...unit,
                    unitNumber:
                      index +
                      1,
                  })
                ),
          };
        }
      );
    };


  const generateTeachingPlan =
    () => {

      if (
        !draft ||
        !topicCount
      ) {

        setScanMessage(
          "Review at least one syllabus topic before generating the teaching plan."
        );

        return;
      }


      if (
        totalClasses <= 0
      ) {

        setScanMessage(
          "CampusConnect needs at least one available teaching class before it can generate the plan."
        );

        return;
      }


      const nextPlan =
        buildTeachingPlan(
          draft,
          totalClasses
        );


      setPlanRows(
        nextPlan
      );


      const zeroCount =
        nextPlan.filter(
          row =>
            row.plannedClasses <=
            0
        ).length;


      const message =
        zeroCount > 0
          ? `Generated a ${totalClasses}-class draft, but ${zeroCount} topic${zeroCount === 1 ? "" : "s"} currently have no dedicated class. Review or combine topics before saving.`
          : `Generated a ${totalClasses}-class teaching plan across ${nextPlan.length} topic${nextPlan.length === 1 ? "" : "s"}. Review every allocation before saving.`;


      setScanMessage(
        message
      );

      onStatus(
        message
      );
    };


  const updatePlannedClasses =
    (
      unitIndex:
        number,
      topicIndex:
        number,
      value:
        number
    ) => {

      const safeValue =
        Math.max(
          0,
          Math.min(
            1000,
            Math.floor(
              Number.isFinite(
                value
              )
                ? value
                : 0
            )
          )
        );


      setPlanRows(
        current =>
          current.map(
            row =>
              row.unitIndex ===
                unitIndex &&
              row.topicIndex ===
                topicIndex
                ? {
                    ...row,
                    plannedClasses:
                      safeValue,
                  }
                : row
          )
      );
    };


  const saveApprovedPlan =
    async () => {

      if (
        saving
      ) {
        return;
      }


      if (
        !draft ||
        !planRows.length
      ) {

        setScanMessage(
          "Generate the teaching plan before saving."
        );

        return;
      }


      if (
        planBalance !==
        0
      ) {

        setScanMessage(
          "The teaching plan is not balanced. Every available class must be allocated before saving."
        );

        return;
      }


      if (
        uncoveredPlanTopics >
        0
      ) {

        setScanMessage(
          "Every syllabus topic must have at least one planned teaching class before saving."
        );

        return;
      }


      if (
        effectiveWeeklySessions <=
          0 ||
        teachingWeeks <=
          0 ||
        totalClasses <=
          0
      ) {

        setScanMessage(
          "Teaching capacity is incomplete. Recalculate classes and regenerate the plan."
        );

        return;
      }


      const client =
        getSupabaseClient();


      if (!client) {

        setScanMessage(
          "CampusConnect is not connected to Supabase."
        );

        return;
      }


      setSaving(
        true
      );


      setScanMessage(
        "Checking existing syllabus and Faculty Diary progress…"
      );


      try {

        /*
         * First perform the read-only safety check.
         *
         * The atomic apply RPC repeats these checks inside the
         * transaction, so this browser check is UX only and
         * cannot be used to bypass database protection.
         */

        const {
          data:
            statusData,
          error:
            statusError,
        } =
          await client.rpc(
            "get_faculty_syllabus_apply_status",
            {
              p_batch_subject_id:
                subject.id,
            }
          );


        if (
          statusError
        ) {
          throw statusError;
        }


        const rawStatus =
          Array.isArray(
            statusData
          )
            ? statusData[0]
            : statusData;


        const statusRecord =
          (
            rawStatus &&
            typeof rawStatus ===
              "object"
          )
            ? rawStatus as Record<
                string,
                unknown
              >
            : null;


        if (
          !statusRecord
        ) {
          throw new Error(
            "CampusConnect could not verify the existing syllabus state."
          );
        }


        const hasExistingSyllabus =
          statusRecord
            .hasExistingSyllabus ===
          true;


        const hasProgress =
          statusRecord
            .hasProgress ===
          true;


        const existingUnits =
          Number(
            statusRecord
              .existingUnits
          ) ||
          0;


        const existingTopics =
          Number(
            statusRecord
              .existingTopics
          ) ||
          0;


        const completionEvents =
          Number(
            statusRecord
              .completionEvents
          ) ||
          0;


        if (
          hasProgress
        ) {

          const message =
            `This syllabus already has ${completionEvents} Faculty Diary progress event${completionEvents === 1 ? "" : "s"}. Smart replacement is blocked to protect teaching history. Use the existing manual syllabus tools for safe edits instead.`;


          setScanMessage(
            message
          );

          onStatus(
            message
          );

          return;
        }


        let replaceExisting =
          false;


        if (
          hasExistingSyllabus
        ) {

          const confirmed =
            window.confirm(
              [
                "Replace the existing syllabus?",
                "",
                `Existing units: ${existingUnits}`,
                `Existing topics: ${existingTopics}`,
                "",
                "No Faculty Diary progress has been recorded for this syllabus.",
                "",
                "Continuing will replace the current units and topics with the reviewed Smart Syllabus Planner version.",
                "",
                "This action cannot be undone automatically.",
              ].join(
                "\n"
              )
            );


          if (
            !confirmed
          ) {

            setScanMessage(
              "Save cancelled. The existing syllabus was not changed."
            );

            return;
          }


          replaceExisting =
            true;
        }


        /*
         * Join each reviewed topic with its faculty-controlled
         * planned class allocation.
         */

        const planLookup =
          new Map<
            string,
            number
          >();


        planRows.forEach(
          row => {

            planLookup.set(
              `${row.unitIndex}:${row.topicIndex}`,
              row.plannedClasses
            );
          }
        );


        const unitsPayload =
          draft.units.map(
            (
              unit,
              unitIndex
            ) => ({

              unitNumber:
                unitIndex +
                1,

              title:
                cleanText(
                  unit.title
                ),

              description:
                cleanText(
                  unit.description
                ),

              topics:
                unit.topics.map(
                  (
                    topic,
                    topicIndex
                  ) => {

                    const plannedClasses =
                      planLookup.get(
                        `${unitIndex}:${topicIndex}`
                      ) ||
                      0;


                    return {

                      topicOrder:
                        topicIndex +
                        1,

                      title:
                        cleanText(
                          topic.title
                        ),

                      description:
                        cleanText(
                          topic.description
                        ),

                      plannedClasses,
                    };
                  }
                ),
            })
          );


        /*
         * One PostgreSQL RPC performs:
         *
         * - final authorization
         * - final validation
         * - replacement protection
         * - units
         * - topics
         * - planned_periods
         * - planner configuration
         * - Diary progress backfill
         *
         * Any failure rolls the database transaction back.
         */

        setScanMessage(
          "Saving approved syllabus and teaching plan…"
        );


        const {
          data:
            applyData,
          error:
            applyError,
        } =
          await client.rpc(
            "apply_faculty_syllabus_plan",
            {

              p_batch_subject_id:
                subject.id,

              p_units:
                unitsPayload,

              p_weekly_sessions:
                effectiveWeeklySessions,

              p_teaching_weeks:
                teachingWeeks,

              p_total_planned_classes:
                totalClasses,

              p_replace_existing:
                replaceExisting,
            }
          );


        if (
          applyError
        ) {
          throw applyError;
        }


        const rawResult =
          Array.isArray(
            applyData
          )
            ? applyData[0]
            : applyData;


        const result =
          (
            rawResult &&
            typeof rawResult ===
              "object"
          )
            ? rawResult as Record<
                string,
                unknown
              >
            : null;


        if (
          !result ||
          result.success !==
            true
        ) {
          throw new Error(
            "CampusConnect did not confirm the syllabus save."
          );
        }


        const unitsInserted =
          Number(
            result
              .unitsInserted
          ) ||
          draft.units.length;


        const topicsInserted =
          Number(
            result
              .topicsInserted
          ) ||
          topicCount;


        const backfilled =
          Number(
            result
              .backfilledCompletionEvents
          ) ||
          0;


        /*
         * The save is already committed at this point.
         * Refresh failures must therefore NOT be reported as
         * database-save failures.
         */

        let refreshWarning =
          "";


        try {

          await onApplied();

        } catch (
          refreshError
        ) {

          console.error(
            "[Smart Syllabus Planner refresh]",
            refreshError
          );


          refreshWarning =
            " The syllabus was saved, but the screen could not refresh automatically.";

        }


        const message =
          `Approved syllabus saved: ${unitsInserted} unit${unitsInserted === 1 ? "" : "s"}, ${topicsInserted} topic${topicsInserted === 1 ? "" : "s"} and ${totalClasses} planned teaching class${totalClasses === 1 ? "" : "es"}.${backfilled > 0 ? ` ${backfilled} existing Faculty Diary class${backfilled === 1 ? "" : "es"} matched the approved syllabus automatically.` : ""}${refreshWarning}`;


        /*
         * Clear the temporary AI review state after a confirmed
         * save so the same draft cannot accidentally be applied
         * twice.
         */

        setDraft(
          null
        );

        setPlanRows(
          []
        );

        setFile(
          null
        );

        setDriveUrl(
          ""
        );

        setScanMessage(
          message
        );

        onStatus(
          message
        );

      } catch (
        error
      ) {

        console.error(
          "[Smart Syllabus Planner save]",
          error
        );


        const message =
          error instanceof
            Error
            ? error.message
            : (
                error &&
                typeof error ===
                  "object" &&
                "message" in
                  error
              )
              ? String(
                  (
                    error as {
                      message?: unknown;
                    }
                  ).message ||
                  "Unable to save the approved syllabus."
                )
              : "Unable to save the approved syllabus.";


        setScanMessage(
          message
        );

        onStatus(
          message
        );

      } finally {

        setSaving(
          false
        );
      }
    };


  return (
    <section className="facultySmartSyllabus">

      <header className="facultySmartSyllabusHeader">

        <div>

          <span>
            SMART SYLLABUS PLANNER
          </span>

          <h2>
            Upload once. Plan every class.
          </h2>

          <p>
            CampusConnect extracts the syllabus, calculates your real weekly teaching capacity and prepares a reviewable teaching plan before anything is saved.
          </p>

        </div>


        <div className="facultySmartSyllabusBadge">
          AI Assisted
        </div>

      </header>


      <div className="facultySmartSyllabusGrid">

        <section className="facultySmartSyllabusSource">

          <div className="facultySmartSyllabusSectionTitle">

            <div>
              1
            </div>

            <span>
              <strong>
                Add syllabus source
              </strong>

              <small>
                PDF, image or shared Google Drive file
              </small>
            </span>

          </div>


          <div
            className="facultySmartSyllabusTabs"
            role="tablist"
            aria-label="Syllabus source"
          >

            <button
              type="button"
              role="tab"
              aria-selected={
                sourceMode ===
                "upload"
              }
              className={
                sourceMode ===
                  "upload"
                  ? "active"
                  : ""
              }
              onClick={() => {
                setSourceMode(
                  "upload"
                );

                setScanMessage(
                  ""
                );
              }}
            >
              Upload File
            </button>


            <button
              type="button"
              role="tab"
              aria-selected={
                sourceMode ===
                "drive"
              }
              className={
                sourceMode ===
                  "drive"
                  ? "active"
                  : ""
              }
              onClick={() => {
                setSourceMode(
                  "drive"
                );

                setScanMessage(
                  ""
                );
              }}
            >
              Google Drive
            </button>

          </div>


          {sourceMode ===
          "upload" ? (
            <label className="facultySmartSyllabusDrop">

              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={
                  handleFile
                }
              />

              <span className="facultySmartSyllabusDropIcon">
                ↑
              </span>

              <strong>
                {file
                  ? file.name
                  : "Choose syllabus file"}
              </strong>

              <small>
                PDF · JPG · PNG · WEBP · Maximum 20 MB
              </small>

              {file && (
                <em>
                  {(
                    file.size /
                    1024 /
                    1024
                  ).toFixed(
                    2
                  )} MB
                </em>
              )}

            </label>
          ) : (
            <div className="facultySmartSyllabusDrive">

              <label htmlFor="faculty-syllabus-drive-url">
                Shared Google Drive link
              </label>

              <input
                id="faculty-syllabus-drive-url"
                type="url"
                inputMode="url"
                value={
                  driveUrl
                }
                onChange={
                  event => {
                    setDriveUrl(
                      event.target
                        .value
                    );

                    setDraft(
                      null
                    );
                  }
                }
                placeholder="https://drive.google.com/file/d/..."
                autoComplete="off"
              />

              <small>
                The file must be shared as “Anyone with the link”. Private Drive files are not bypassed.
              </small>

            </div>
          )}


          <button
            type="button"
            className="facultySmartSyllabusScan"
            disabled={
              scanning ||
              (
                sourceMode ===
                  "upload"
                  ? !file
                  : !cleanText(
                      driveUrl
                    )
              )
            }
            onClick={() =>
              void scanSyllabus()
            }
          >
            {scanning
              ? "Reading syllabus…"
              : "Scan Syllabus with Campus AI"}
          </button>


          {scanMessage && (
            <div className="facultySmartSyllabusMessage">
              {scanMessage}
            </div>
          )}

        </section>


        <section className="facultySmartSyllabusCapacity">

          <div className="facultySmartSyllabusSectionTitle">

            <div>
              2
            </div>

            <span>
              <strong>
                Teaching capacity
              </strong>

              <small>
                Detected from CampusConnect
              </small>
            </span>

          </div>


          {capacity.loading ? (
            <div className="facultySmartSyllabusCapacityLoading">
              Calculating weekly classes…
            </div>
          ) : (
            <>

              <div className="facultySmartSyllabusCapacityCards">

                <article>

                  <span>
                    CLASSES / WEEK
                  </span>

                  <strong>
                    {
                      capacity
                        .weeklySessions
                    }
                  </strong>

                  <small>
                    Actual teaching sessions
                  </small>

                </article>


                <article>

                  <span>
                    PERIODS / WEEK
                  </span>

                  <strong>
                    {
                      capacity
                        .weeklyPeriods
                    }
                  </strong>

                  <small>
                    Timetable periods
                  </small>

                </article>

              </div>


              <label className="facultySmartSyllabusWeeks">

                <span>
                  Teaching weeks
                </span>

                <input
                  type="number"
                  min="1"
                  max="60"
                  value={
                    teachingWeeks
                  }
                  onChange={
                    event =>
                      setTeachingWeeks(
                        Math.max(
                          1,
                          Math.min(
                            60,
                            Math.floor(
                              Number(
                                event.target
                                  .value
                              ) ||
                                1
                            )
                          )
                        )
                      )
                  }
                />

              </label>


              <div className="facultySmartSyllabusTotal">

                <span>
                  Available teaching classes
                </span>

                <strong>
                  {
                    totalClasses
                  }
                </strong>

                <small>
                  {effectiveWeeklySessions} classes/week × {teachingWeeks} weeks
                </small>

              </div>


              <p className={`facultySmartSyllabusCapacityNote ${capacity.source}`}>
                {manualWeeklySessions
                  ? `Manual override active: ${effectiveWeeklySessions} teaching classes per week. CampusConnect detected ${capacity.weeklySessions} automatically.`
                  : capacity.message}
              </p>


              <label className="facultySmartSyllabusManualCapacity">

                <span>
                  Optional classes/week override
                </span>

                <input
                  type="number"
                  min="1"
                  max="60"
                  step="1"
                  inputMode="numeric"
                  value={
                    manualWeeklySessions
                  }
                  placeholder={
                    capacity.weeklySessions >
                      0
                      ? String(
                          capacity.weeklySessions
                        )
                      : "e.g. 4"
                  }
                  onChange={
                    event => {

                      const value =
                        event.target
                          .value;


                      if (
                        value ===
                        ""
                      ) {
                        setManualWeeklySessions(
                          ""
                        );

                        return;
                      }


                      const parsed =
                        Math.max(
                          1,
                          Math.min(
                            60,
                            Math.floor(
                              Number(
                                value
                              ) ||
                                1
                            )
                          )
                        );


                      setManualWeeklySessions(
                        String(
                          parsed
                        )
                      );
                    }
                  }
                />

                <small>
                  Leave blank to use the allocation or published timetable detected by CampusConnect.
                </small>

              </label>


              <button
                type="button"
                className="facultySmartSyllabusRefresh"
                onClick={() =>
                  void loadTeachingCapacity()
                }
              >
                Recalculate from CampusConnect
              </button>

            </>
          )}

        </section>

      </div>


      {draft && (
        <section className="facultySmartSyllabusReview">

          <div className="facultySmartSyllabusReviewHeader">

            <div>

              <span>
                3 · FACULTY REVIEW
              </span>

              <h3>
                Check extracted syllabus
              </h3>

              <p>
                AI extraction is never saved automatically. Edit or remove anything that does not match the official syllabus.
              </p>

            </div>


            <div className="facultySmartSyllabusReviewStats">

              <article>
                <strong>
                  {
                    draft.units
                      .length
                  }
                </strong>

                <span>
                  Units
                </span>
              </article>


              <article>
                <strong>
                  {
                    topicCount
                  }
                </strong>

                <span>
                  Topics
                </span>
              </article>


              <article>
                <strong>
                  {
                    totalClasses
                  }
                </strong>

                <span>
                  Classes
                </span>
              </article>

            </div>

          </div>


          {draft.detectedSubject && (
            <div className="facultySmartSyllabusDetected">

              <span>
                Detected from document
              </span>

              <strong>
                {
                  draft.detectedSubject
                }
              </strong>

              <small>
                Selected CampusConnect subject: {subject.subject_code} · {subject.subject_name}
              </small>

            </div>
          )}


          {!!draft.warnings.length && (
            <div className="facultySmartSyllabusWarnings">

              <strong>
                Review notes
              </strong>

              {draft.warnings.map(
                (
                  warning,
                  index
                ) => (
                  <p
                    key={`${warning}-${index}`}
                  >
                    {warning}
                  </p>
                )
              )}

            </div>
          )}


          {topicCount >
            totalClasses &&
          totalClasses >
            0 && (
            <div className="facultySmartSyllabusWarningStrong">

              There are {topicCount} extracted topics but only {totalClasses} available teaching classes. Some topics will need to be combined, additional teaching weeks added, or the timetable capacity increased.

            </div>
          )}


          {classesPerTopic !==
            null && (
            <div className="facultySmartSyllabusPlanningPreview">

              <div>

                <span>
                  CURRENT CAPACITY
                </span>

                <strong>
                  {totalClasses} classes for {topicCount} topics
                </strong>

              </div>


              <div>

                <span>
                  AVERAGE
                </span>

                <strong>
                  ~{classesPerTopic} classes/topic
                </strong>

              </div>


              <small>
                The final planner will distribute whole classes topic-by-topic after your review. Nothing is assigned yet.
              </small>

            </div>
          )}


          <div className="facultySmartSyllabusUnits">

            {draft.units.map(
              (
                unit,
                unitIndex
              ) => (
                <article
                  key={`unit-${unitIndex}`}
                  className="facultySmartSyllabusUnit"
                >

                  <header>

                    <div className="facultySmartSyllabusUnitNumber">
                      {
                        unit.unitNumber
                      }
                    </div>


                    <div className="facultySmartSyllabusUnitFields">

                      <label>

                        <span>
                          Unit title
                        </span>

                        <input
                          type="text"
                          value={
                            unit.title
                          }
                          maxLength={
                            240
                          }
                          onChange={
                            event =>
                              updateUnit(
                                unitIndex,
                                "title",
                                event.target
                                  .value
                              )
                          }
                        />

                      </label>


                      <label>

                        <span>
                          Description
                        </span>

                        <textarea
                          value={
                            unit.description
                          }
                          maxLength={
                            2000
                          }
                          rows={2}
                          onChange={
                            event =>
                              updateUnit(
                                unitIndex,
                                "description",
                                event.target
                                  .value
                              )
                          }
                        />

                      </label>

                    </div>


                    <button
                      type="button"
                      className="facultySmartSyllabusRemove"
                      onClick={() =>
                        removeUnit(
                          unitIndex
                        )
                      }
                      aria-label={`Remove Unit ${unit.unitNumber}`}
                    >
                      Remove
                    </button>

                  </header>


                  <div className="facultySmartSyllabusTopics">

                    {unit.topics.map(
                      (
                        topic,
                        topicIndex
                      ) => (
                        <div
                          key={`unit-${unitIndex}-topic-${topicIndex}`}
                          className="facultySmartSyllabusTopic"
                        >

                          <span className="facultySmartSyllabusTopicNumber">
                            {
                              topicIndex +
                              1
                            }
                          </span>


                          <div>

                            <input
                              type="text"
                              value={
                                topic.title
                              }
                              maxLength={
                                240
                              }
                              aria-label={`Unit ${unit.unitNumber} topic ${topicIndex + 1} title`}
                              onChange={
                                event =>
                                  updateTopic(
                                    unitIndex,
                                    topicIndex,
                                    "title",
                                    event.target
                                      .value
                                  )
                              }
                            />


                            <textarea
                              value={
                                topic.description
                              }
                              maxLength={
                                1500
                              }
                              rows={2}
                              aria-label={`Unit ${unit.unitNumber} topic ${topicIndex + 1} description`}
                              placeholder="Optional topic details"
                              onChange={
                                event =>
                                  updateTopic(
                                    unitIndex,
                                    topicIndex,
                                    "description",
                                    event.target
                                      .value
                                  )
                              }
                            />

                          </div>


                          <button
                            type="button"
                            className="facultySmartSyllabusTopicRemove"
                            onClick={() =>
                              removeTopic(
                                unitIndex,
                                topicIndex
                              )
                            }
                            aria-label={`Remove topic ${topicIndex + 1}`}
                          >
                            ×
                          </button>

                        </div>
                      )
                    )}

                  </div>

                </article>
              )
            )}

          </div>


          {!!planRows.length && (
            <section className="facultySmartSyllabusGeneratedPlan">

              <header>

                <div>

                  <span>
                    4 · TEACHING PLAN
                  </span>

                  <h3>
                    Class allocation
                  </h3>

                  <p>
                    CampusConnect used an equal deterministic baseline. Adjust any topic that needs more or fewer classes.
                  </p>

                </div>


                <div className="facultySmartSyllabusPlanMetrics">

                  <article>

                    <span>
                      AVAILABLE
                    </span>

                    <strong>
                      {
                        totalClasses
                      }
                    </strong>

                  </article>


                  <article>

                    <span>
                      ALLOCATED
                    </span>

                    <strong>
                      {
                        planTotal
                      }
                    </strong>

                  </article>


                  <article
                    className={
                      planBalance ===
                        0
                        ? "balanced"
                        : "unbalanced"
                    }
                  >

                    <span>
                      BALANCE
                    </span>

                    <strong>
                      {
                        planBalance >
                          0
                          ? `+${planBalance}`
                          : planBalance
                      }
                    </strong>

                  </article>

                </div>

              </header>


              {planBalance !==
                0 && (
                <div className="facultySmartSyllabusPlanAlert">

                  {planBalance > 0
                    ? `${planBalance} available class${planBalance === 1 ? "" : "es"} still need to be assigned.`
                    : `${Math.abs(planBalance)} too many class${Math.abs(planBalance) === 1 ? "" : "es"} are currently allocated.`}

                </div>
              )}


              {uncoveredPlanTopics >
                0 && (
                <div className="facultySmartSyllabusPlanAlert warning">

                  {uncoveredPlanTopics} topic{uncoveredPlanTopics === 1 ? "" : "s"} currently have 0 dedicated classes. Increase capacity, combine topics intentionally, or rebalance before saving.

                </div>
              )}


              <div className="facultySmartSyllabusPlanUnits">

                {draft.units.map(
                  (
                    unit,
                    unitIndex
                  ) => {

                    const unitRows =
                      planRows.filter(
                        row =>
                          row.unitIndex ===
                          unitIndex
                      );


                    if (
                      !unitRows.length
                    ) {
                      return null;
                    }


                    const unitClasses =
                      unitRows.reduce(
                        (
                          total,
                          row
                        ) =>
                          total +
                          row.plannedClasses,
                        0
                      );


                    return (
                      <article
                        key={`plan-unit-${unitIndex}`}
                        className="facultySmartSyllabusPlanUnit"
                      >

                        <header>

                          <div>

                            <span>
                              UNIT {unit.unitNumber}
                            </span>

                            <strong>
                              {unit.title}
                            </strong>

                          </div>


                          <b>
                            {unitClasses} class{unitClasses === 1 ? "" : "es"}
                          </b>

                        </header>


                        <div>

                          {unitRows.map(
                            row => (
                              <label
                                key={`plan-${row.unitIndex}-${row.topicIndex}`}
                                className="facultySmartSyllabusPlanRow"
                              >

                                <span className="facultySmartSyllabusPlanTopic">

                                  <small>
                                    Topic {row.topicOrder}
                                  </small>

                                  <strong>
                                    {row.topicTitle}
                                  </strong>

                                </span>


                                <span className="facultySmartSyllabusPlanInput">

                                  <input
                                    type="number"
                                    min="0"
                                    max="1000"
                                    step="1"
                                    value={
                                      row.plannedClasses
                                    }
                                    aria-label={`${row.topicTitle} planned classes`}
                                    onChange={
                                      event =>
                                        updatePlannedClasses(
                                          row.unitIndex,
                                          row.topicIndex,
                                          Number(
                                            event.target
                                              .value
                                          )
                                        )
                                    }
                                  />

                                  <small>
                                    classes
                                  </small>

                                </span>

                              </label>
                            )
                          )}

                        </div>

                      </article>
                    );
                  }
                )}

              </div>


              <footer>

                {planBalance ===
                  0 &&
                uncoveredPlanTopics ===
                  0 ? (
                  <strong className="ready">
                    ✓ Every available class is allocated and every topic has teaching time.
                  </strong>
                ) : (
                  <strong className="needsReview">
                    Review the allocation before this plan can be saved.
                  </strong>
                )}

                <span>
                  This is still a preview. No syllabus or class allocation has been written to Supabase.
                </span>

              </footer>

            </section>
          )}


          <footer className="facultySmartSyllabusReviewFooter">

            <div>

              <strong>
                Faculty-controlled planning
              </strong>

              <span>
                Generate a baseline, then adjust class counts before anything is saved.
              </span>

            </div>


            <div className="facultySmartSyllabusReviewActions">

              <button
                type="button"
                disabled={
                  saving ||
                  !draft ||
                  topicCount <=
                    0 ||
                  totalClasses <=
                    0
                }
                title={
                  totalClasses <=
                    0
                    ? "Set teaching capacity before generating the plan."
                    : "Generate an editable class allocation."
                }
                onClick={
                  generateTeachingPlan
                }
              >
                {planRows.length
                  ? "Regenerate Teaching Plan"
                  : "Generate Teaching Plan"}
              </button>


              <button
                type="button"
                className="facultySmartSyllabusSavePlan"
                disabled={
                  saving ||
                  !planRows.length ||
                  planBalance !==
                    0 ||
                  uncoveredPlanTopics >
                    0
                }
                title={
                  !planRows.length
                    ? "Generate the teaching plan first."
                    : planBalance !==
                        0
                      ? "Every available class must be allocated before saving."
                      : uncoveredPlanTopics >
                          0
                        ? "Every topic needs at least one planned class."
                        : "Save the reviewed syllabus and teaching plan."
                }
                onClick={() =>
                  void saveApprovedPlan()
                }
              >
                {saving
                  ? "Saving Approved Plan…"
                  : "Save Approved Plan"}
              </button>

            </div>

          </footer>

        </section>
      )}


      <footer className="facultySmartSyllabusContext">

        <span>
          {
            subject.subject_code
          }
        </span>

        <strong>
          {
            subject.subject_name
          }
        </strong>

        <small>
          {batch
            ? `${batch.batch_name} · Section ${batch.section} · ${batch.department}`
            : "Assigned faculty subject"}
        </small>

      </footer>

    </section>
  );
}
