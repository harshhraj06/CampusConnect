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


type BuilderProfile = {
  role?: string | null;
};


type WorkspaceBatch = {
  id: string;
  batchName: string;
  section: string;
  department: string;
  academicYear: string;
  semester: string;

  profileId: string;

  profileName: string;

  publishedPublicationId: string;
  publishedVersion: number;

  draftPublicationId: string;
  draftVersion: number;
};


type BuilderWorkspace = {
  departments: string[];
  batches: WorkspaceBatch[];
};


type WorkingDay = {
  id: string;
  dayOfWeek: string;
  displayOrder: number;
  isWorkingDay: boolean;
};


type PeriodSlot = {
  id: string;

  periodOrder: number;

  label: string;

  startTime: string;
  endTime: string;

  isTeachingSlot: boolean;
};


type Resource = {
  id: string;

  code: string;
  name: string;
  type: string;

  building: string;
  floor: string;

  capacity: number | null;
};


type Subject = {
  id: string;

  subjectName: string;
  subjectCode: string;
  subjectType: string;

  facultyId: string;
  facultyName: string;
};


type Allocation = {
  id: string;

  batchSubjectId: string;

  facultyId: string;
  facultyName: string;

  allocationType: string;

  subgroup: string;

  weeklyHours: number;

  sessionLengthPeriods: number;

  isPrimary: boolean;
};


type BuilderEntry = {
  id: string;
  sessionGroupId?: string | null;

  batchId: string;
  batchSubjectId: string;

  subjectCode: string;
  subjectName: string;

  facultyId: string;
  facultyName: string;

  dayOfWeek: string;

  periodOrder: number;

  startTime: string;
  endTime: string;

  subgroup: string;

  resourceId: string;

  room: string;

  classType: string;

  notes: string;
};


type Publication = {
  id: string;
  versionNumber: number;

  publishedAt?: string;
  createdAt?: string;
};


type BuilderBatchData = {
  batch: {
    id: string;
    batchName: string;
    section: string;
    department: string;
    academicYear: string;
    semester: string;
  } | null;

  profile: {
    id: string;
    name: string;
    department: string;
    academicYear: string;
    semester: string;
  } | null;

  workingDays: WorkingDay[];

  periodSlots: PeriodSlot[];

  resources: Resource[];

  subjects: Subject[];

  allocations: Allocation[];

  publishedPublication:
    Publication | null;

  draftPublication:
    Publication | null;

  mode:
    | "Draft"
    | "Published"
    | "Empty";

  entries: BuilderEntry[];
};


type BuilderValidation = {
  valid: boolean;

  issueCount: number;

  issues: string[];

  entryCount: number;

  publicationId?: string;
};


type EditorState = {
  open: boolean;

  day: string;

  startSlotId: string;

  periodCount: number;

  subjectId: string;

  facultyId: string;

  resourceId: string;

  room: string;

  classType: string;

  subgroup: string;

  notes: string;

  replaceEntryIds: string[];
};


type FacultyOption = {
  id: string;
  name: string;

  allocationType: string;

  subgroup: string;

  sessionLengthPeriods: number;

  isPrimary: boolean;
};


const emptyEditor = (): EditorState => ({
  open: false,

  day: "",

  startSlotId: "",

  periodCount: 1,

  subjectId: "",

  facultyId: "",

  resourceId: "",

  room: "",

  classType: "Lecture",

  subgroup: "",

  notes: "",

  replaceEntryIds: [],
});


const textValue = (
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


const formatClock = (
  value: unknown
) => {

  const raw =
    textValue(value);

  const match =
    raw.match(
      /^(\d{1,2}):(\d{2})/
    );


  if (!match) {
    return raw || "—";
  }


  const hour =
    Number(
      match[1]
    );

  const minute =
    match[2];

  const twelve =
    hour % 12 ||
    12;


  return `${twelve}:${minute} ${
    hour >= 12
      ? "PM"
      : "AM"
  }`;
};


const normalizeWorkspace = (
  value: unknown
): BuilderWorkspace => {

  const row =
    (
      value &&
      typeof value ===
        "object"
    )
      ? value as Record<
          string,
          unknown
        >
      : {};


  const batches =
    Array.isArray(
      row.batches
    )
      ? row.batches
      : [];


  const departments =
    Array.isArray(
      row.departments
    )
      ? row.departments
      : [];


  return {

    departments:
      departments
        .map(textValue)
        .filter(Boolean),

    batches:
      batches.map(
        item => {

          const batch =
            item as Record<
              string,
              unknown
            >;


          return {
            id:
              textValue(
                batch.id
              ),

            batchName:
              textValue(
                batch.batchName
              ),

            section:
              textValue(
                batch.section
              ),

            department:
              textValue(
                batch.department
              ),

            academicYear:
              textValue(
                batch.academicYear
              ),

            semester:
              textValue(
                batch.semester
              ),

            profileId:
              textValue(
                batch.profileId
              ),

            profileName:
              textValue(
                batch.profileName
              ),

            publishedPublicationId:
              textValue(
                batch.publishedPublicationId
              ),

            publishedVersion:
              numberValue(
                batch.publishedVersion
              ),

            draftPublicationId:
              textValue(
                batch.draftPublicationId
              ),

            draftVersion:
              numberValue(
                batch.draftVersion
              ),
          };
        }
      ),
  };
};


const normalizeBatchData = (
  value: unknown
): BuilderBatchData => {

  const row =
    (
      value &&
      typeof value ===
        "object"
    )
      ? value as Record<
          string,
          any
        >
      : {};


  return {

    batch:
      row.batch &&
      typeof row.batch ===
        "object"
        ? {
            id:
              textValue(
                row.batch.id
              ),

            batchName:
              textValue(
                row.batch.batchName
              ),

            section:
              textValue(
                row.batch.section
              ),

            department:
              textValue(
                row.batch.department
              ),

            academicYear:
              textValue(
                row.batch.academicYear
              ),

            semester:
              textValue(
                row.batch.semester
              ),
          }
        : null,


    profile:
      row.profile &&
      typeof row.profile ===
        "object"
        ? {
            id:
              textValue(
                row.profile.id
              ),

            name:
              textValue(
                row.profile.name
              ),

            department:
              textValue(
                row.profile.department
              ),

            academicYear:
              textValue(
                row.profile.academicYear
              ),

            semester:
              textValue(
                row.profile.semester
              ),
          }
        : null,


    workingDays:
      (
        Array.isArray(
          row.workingDays
        )
          ? row.workingDays
          : []
      ).map(
        (item: any) => ({
          id:
            textValue(
              item.id
            ),

          dayOfWeek:
            textValue(
              item.dayOfWeek
            ),

          displayOrder:
            numberValue(
              item.displayOrder
            ),

          isWorkingDay:
            Boolean(
              item.isWorkingDay
            ),
        })
      ),


    periodSlots:
      (
        Array.isArray(
          row.periodSlots
        )
          ? row.periodSlots
          : []
      ).map(
        (item: any) => ({
          id:
            textValue(
              item.id
            ),

          periodOrder:
            numberValue(
              item.periodOrder
            ),

          label:
            textValue(
              item.label
            ),

          startTime:
            textValue(
              item.startTime
            ),

          endTime:
            textValue(
              item.endTime
            ),

          isTeachingSlot:
            Boolean(
              item.isTeachingSlot
            ),
        })
      ),


    resources:
      (
        Array.isArray(
          row.resources
        )
          ? row.resources
          : []
      ).map(
        (item: any) => ({
          id:
            textValue(
              item.id
            ),

          code:
            textValue(
              item.code
            ),

          name:
            textValue(
              item.name
            ),

          type:
            textValue(
              item.type
            ),

          building:
            textValue(
              item.building
            ),

          floor:
            textValue(
              item.floor
            ),

          capacity:
            item.capacity ===
              null ||
            item.capacity ===
              undefined
              ? null
              : numberValue(
                  item.capacity
                ),
        })
      ),


    subjects:
      (
        Array.isArray(
          row.subjects
        )
          ? row.subjects
          : []
      ).map(
        (item: any) => ({
          id:
            textValue(
              item.id
            ),

          subjectName:
            textValue(
              item.subjectName
            ),

          subjectCode:
            textValue(
              item.subjectCode
            ),

          subjectType:
            textValue(
              item.subjectType
            ),

          facultyId:
            textValue(
              item.facultyId
            ),

          facultyName:
            textValue(
              item.facultyName
            ),
        })
      ),


    allocations:
      (
        Array.isArray(
          row.allocations
        )
          ? row.allocations
          : []
      ).map(
        (item: any) => ({
          id:
            textValue(
              item.id
            ),

          batchSubjectId:
            textValue(
              item.batchSubjectId
            ),

          facultyId:
            textValue(
              item.facultyId
            ),

          facultyName:
            textValue(
              item.facultyName
            ),

          allocationType:
            textValue(
              item.allocationType
            ),

          subgroup:
            textValue(
              item.subgroup
            ),

          weeklyHours:
            numberValue(
              item.weeklyHours
            ),

          sessionLengthPeriods:
            Math.max(
              1,
              numberValue(
                item.sessionLengthPeriods
              ) ||
              1
            ),

          isPrimary:
            Boolean(
              item.isPrimary
            ),
        })
      ),


    publishedPublication:
      row.publishedPublication
        ? {
            id:
              textValue(
                row.publishedPublication.id
              ),

            versionNumber:
              numberValue(
                row.publishedPublication.versionNumber
              ),

            publishedAt:
              textValue(
                row.publishedPublication.publishedAt
              ),
          }
        : null,


    draftPublication:
      row.draftPublication
        ? {
            id:
              textValue(
                row.draftPublication.id
              ),

            versionNumber:
              numberValue(
                row.draftPublication.versionNumber
              ),

            createdAt:
              textValue(
                row.draftPublication.createdAt
              ),
          }
        : null,


    mode:
      row.mode ===
        "Draft"
        ? "Draft"
        : row.mode ===
            "Published"
          ? "Published"
          : "Empty",


    entries:
      (
        Array.isArray(
          row.entries
        )
          ? row.entries
          : []
      ).map(
        (item: any) => ({
          id:
            textValue(
              item.id
            ),

          batchId:
            textValue(
              item.batchId
            ),

          batchSubjectId:
            textValue(
              item.batchSubjectId
            ),

          subjectCode:
            textValue(
              item.subjectCode
            ),

          subjectName:
            textValue(
              item.subjectName
            ),

          facultyId:
            textValue(
              item.facultyId
            ),

          facultyName:
            textValue(
              item.facultyName
            ),

          dayOfWeek:
            textValue(
              item.dayOfWeek
            ),

          periodOrder:
            numberValue(
              item.periodOrder
            ),

          startTime:
            textValue(
              item.startTime
            ),

          endTime:
            textValue(
              item.endTime
            ),

          subgroup:
            textValue(
              item.subgroup
            ),

          resourceId:
            textValue(
              item.resourceId
            ),

          room:
            textValue(
              item.room
            ),

          classType:
            textValue(
              item.classType
            ) ||
            "Lecture",

          notes:
            textValue(
              item.notes
            ),
        })
      ),
  };
};


const normalizeValidation = (
  value: unknown
): BuilderValidation => {

  const row =
    (
      value &&
      typeof value ===
        "object"
    )
      ? value as Record<
          string,
          any
        >
      : {};


  return {

    valid:
      Boolean(
        row.valid
      ),

    issueCount:
      numberValue(
        row.issueCount
      ),

    issues:
      (
        Array.isArray(
          row.issues
        )
          ? row.issues
          : []
      )
        .map(textValue)
        .filter(Boolean),

    entryCount:
      numberValue(
        row.entryCount
      ),

    publicationId:
      textValue(
        row.publicationId
      ),
  };
};


export default function TimetableDigitalBuilder({
  profile,
}: {
  profile:
    BuilderProfile;
}) {

  const canManage =
    profile.role ===
    "Coordinator";


  const [
    workspace,
    setWorkspace,
  ] =
    useState<BuilderWorkspace>({
      departments: [],
      batches: [],
    });


  const [
    selectedBatchId,
    setSelectedBatchId,
  ] =
    useState("");


  const [
    data,
    setData,
  ] =
    useState<BuilderBatchData | null>(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    batchLoading,
    setBatchLoading,
  ] =
    useState(false);


  const [
    busy,
    setBusy,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    status,
    setStatus,
  ] =
    useState("");


  const [
    validation,
    setValidation,
  ] =
    useState<BuilderValidation | null>(
      null
    );


  const [
    editor,
    setEditor,
  ] =
    useState<EditorState>(
      emptyEditor
    );


  const loadWorkspace =
    useCallback(
      async (
        preserveSelection = true
      ) => {

        if (!canManage) {

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


        setError("");


        try {

          const {
            data:
              result,
            error:
              rpcError,
          } =
            await client.rpc(
              "get_my_timetable_builder_workspace"
            );


          if (rpcError) {
            throw rpcError;
          }


          const next =
            normalizeWorkspace(
              result
            );


          setWorkspace(
            next
          );


          setSelectedBatchId(
            current => {

              if (
                preserveSelection &&
                current &&
                next.batches.some(
                  item =>
                    item.id ===
                    current
                )
              ) {
                return current;
              }


              return (
                next.batches[0]?.id ||
                ""
              );
            }
          );

        } catch (
          caught
        ) {

          setError(
            caught instanceof
              Error
              ? caught.message
              : "Unable to load Timetable Builder."
          );

        } finally {

          setLoading(false);
        }
      },
      [
        canManage,
      ]
    );


  const loadBatch =
    useCallback(
      async (
        batchId: string
      ) => {

        if (
          !canManage ||
          !batchId
        ) {

          setData(null);
          return;
        }


        const client =
          getSupabaseClient();


        if (!client) {
          return;
        }


        setBatchLoading(true);
        setError("");


        try {

          const {
            data:
              result,
            error:
              rpcError,
          } =
            await client.rpc(
              "get_my_timetable_builder_batch",
              {
                p_batch_id:
                  batchId,
              }
            );


          if (rpcError) {
            throw rpcError;
          }


          setData(
            normalizeBatchData(
              result
            )
          );

        } catch (
          caught
        ) {

          setError(
            caught instanceof
              Error
              ? caught.message
              : "Unable to load this batch timetable."
          );

          setData(null);

        } finally {

          setBatchLoading(
            false
          );
        }
      },
      [
        canManage,
      ]
    );


  useEffect(
    () => {

      void loadWorkspace(
        false
      );

    },
    [
      loadWorkspace,
    ]
  );


  useEffect(
    () => {

      setValidation(null);
      setEditor(
        emptyEditor()
      );

      if (
        selectedBatchId
      ) {
        void loadBatch(
          selectedBatchId
        );
      }

    },
    [
      selectedBatchId,
      loadBatch,
    ]
  );


  const selectedBatch =
    useMemo(
      () =>
        workspace.batches.find(
          item =>
            item.id ===
            selectedBatchId
        ) ||
        null,
      [
        workspace.batches,
        selectedBatchId,
      ]
    );


  const days =
    useMemo(
      () =>
        (
          data?.workingDays ||
          []
        )
          .filter(
            item =>
              item.isWorkingDay
          )
          .sort(
            (
              a,
              b
            ) =>
              a.displayOrder -
              b.displayOrder
          ),
      [
        data?.workingDays,
      ]
    );


  const slots =
    useMemo(
      () =>
        [
          ...(
            data?.periodSlots ||
            []
          ),
        ].sort(
          (
            a,
            b
          ) =>
            a.periodOrder -
            b.periodOrder
        ),
      [
        data?.periodSlots,
      ]
    );


  const entriesForCell =
    (
      day: string,
      periodOrder: number
    ) =>
      (
        data?.entries ||
        []
      ).filter(
        item =>
          item.dayOfWeek ===
            day &&
          item.periodOrder ===
            periodOrder
      );


  const teachingRunFrom =
    (
      slotId: string
    ) => {

      const index =
        slots.findIndex(
          item =>
            item.id ===
            slotId
        );


      if (
        index < 0
      ) {
        return [] as PeriodSlot[];
      }


      const result:
        PeriodSlot[] = [];

      let expected =
        slots[index]
          .periodOrder;


      for (
        let cursor =
          index;

        cursor <
          slots.length;

        cursor += 1
      ) {

        const slot =
          slots[cursor];


        if (
          !slot.isTeachingSlot ||
          slot.periodOrder !==
            expected
        ) {
          break;
        }


        result.push(
          slot
        );


        if (
          result.length >=
          6
        ) {
          break;
        }


        expected += 1;
      }


      return result;
    };


  const facultyOptions =
    useMemo(
      () => {

        if (
          !data ||
          !editor.subjectId
        ) {
          return [];
        }


        const subject =
          data.subjects.find(
            item =>
              item.id ===
              editor.subjectId
          );


        const options =
          new Map<
            string,
            FacultyOption
          >();


        data.allocations
          .filter(
            item =>
              item.batchSubjectId ===
              editor.subjectId
          )
          .forEach(
            allocation => {

              options.set(
                allocation.facultyId,
                {
                  id:
                    allocation.facultyId,

                  name:
                    allocation.facultyName ||
                    "Faculty",

                  allocationType:
                    allocation.allocationType,

                  subgroup:
                    allocation.subgroup,

                  sessionLengthPeriods:
                    Math.max(
                      1,
                      allocation.sessionLengthPeriods ||
                      1
                    ),

                  isPrimary:
                    allocation.isPrimary,
                }
              );
            }
          );


        if (
          subject?.facultyId &&
          !options.has(
            subject.facultyId
          )
        ) {

          options.set(
            subject.facultyId,
            {
              id:
                subject.facultyId,

              name:
                subject.facultyName ||
                "Faculty",

              allocationType:
                subject.subjectType ||
                "Theory",

              subgroup:
                "",

              sessionLengthPeriods:
                1,

              isPrimary:
                true,
            }
          );
        }


        return Array.from(
          options.values()
        ).sort(
          (
            a,
            b
          ) => {

            if (
              a.isPrimary !==
              b.isPrimary
            ) {
              return a.isPrimary
                ? -1
                : 1;
            }


            return a.name.localeCompare(
              b.name
            );
          }
        );
      },
      [
        data,
        editor.subjectId,
      ]
    );


  const selectedFaculty =
    facultyOptions.find(
      item =>
        item.id ===
        editor.facultyId
    ) ||
    null;


  const availableRun =
    teachingRunFrom(
      editor.startSlotId
    );


  const allowedPeriodCounts =
    availableRun.map(
      (
        _,
        index
      ) =>
        index + 1
    );


  const startDraft =
    async () => {

      if (
        !selectedBatchId
      ) {
        return;
      }


      const client =
        getSupabaseClient();


      if (!client) {
        return;
      }


      setBusy(true);
      setError("");
      setStatus("");


      try {

        const {
          data:
            result,
          error:
            rpcError,
        } =
          await client.rpc(
            "start_timetable_builder_draft",
            {
              p_batch_id:
                selectedBatchId,
            }
          );


        if (rpcError) {
          throw rpcError;
        }


        const row =
          (
            result &&
            typeof result ===
              "object"
          )
            ? result as Record<
                string,
                any
              >
            : {};


        setStatus(
          row.resumed
            ? `Draft v${numberValue(
                row.versionNumber
              )} resumed.`
            : `Draft v${numberValue(
                row.versionNumber
              )} created. Click an empty period to start building.`
        );


        await Promise.all([
          loadBatch(
            selectedBatchId
          ),
          loadWorkspace(
            true
          ),
        ]);

      } catch (
        caught
      ) {

        setError(
          caught instanceof
            Error
            ? caught.message
            : "Unable to start timetable draft."
        );

      } finally {

        setBusy(false);
      }
    };


  const openAdd =
    (
      day: WorkingDay,
      slot: PeriodSlot
    ) => {

      if (
        data?.mode !==
          "Draft" ||
        !slot.isTeachingSlot
      ) {
        return;
      }


      setValidation(null);


      setEditor({
        ...emptyEditor(),

        open:
          true,

        day:
          day.dayOfWeek,

        startSlotId:
          slot.id,

        periodCount:
          1,
      });
    };


  const sameSession =
    (
      a: BuilderEntry,
      b: BuilderEntry
    ) =>
      a.dayOfWeek ===
        b.dayOfWeek
      &&
      a.batchSubjectId ===
        b.batchSubjectId
      &&
      a.facultyId ===
        b.facultyId
      &&
      a.subgroup
        .trim()
        .toUpperCase()
      ===
      b.subgroup
        .trim()
        .toUpperCase();


  const sessionEntriesFor =
    (
      entry:
        BuilderEntry
    ) => {

      if (!data) {
        return [
          entry,
        ];
      }


      const matching =
        data.entries
          .filter(
            item =>
              sameSession(
                item,
                entry
              )
          )
          .sort(
            (
              a,
              b
            ) =>
              a.periodOrder -
              b.periodOrder
          );


      const groups:
        BuilderEntry[][] = [];

      let current:
        BuilderEntry[] = [];


      matching.forEach(
        item => {

          const previous =
            current[
              current.length - 1
            ];


          if (
            !previous ||
            item.periodOrder ===
              previous.periodOrder +
              1
          ) {

            current.push(
              item
            );

            return;
          }


          if (
            current.length
          ) {
            groups.push(
              current
            );
          }


          current = [
            item,
          ];
        }
      );


      if (
        current.length
      ) {
        groups.push(
          current
        );
      }


      const allocation =
        data.allocations.find(
          item =>
            item.batchSubjectId ===
              entry.batchSubjectId
            &&
            item.facultyId ===
              entry.facultyId
            &&
            (
              !item.subgroup.trim()
              ||
              item.subgroup
                .trim()
                .toUpperCase()
              ===
              entry.subgroup
                .trim()
                .toUpperCase()
            )
        );



    const explicitSessionGroupId =
      entry.sessionGroupId?.trim() ||
      "";

    if (explicitSessionGroupId) {
      return data.entries
        .filter(
          item =>
            item.sessionGroupId ===
            explicitSessionGroupId
        )
        .sort(
          (a, b) =>
            a.periodOrder -
            b.periodOrder
        );
    }


const expectedLength =
        Math.max(
          1,
          allocation
            ?.sessionLengthPeriods ||
          1
        );


      const contiguous =
        groups.find(
          group =>
            group.some(
              item =>
                item.id ===
                entry.id
            )
        ) ||
        [
          entry,
        ];


      /*
       * A one-period teaching allocation must edit/remove only
       * the clicked row.
       *
       * Two independent back-to-back lectures may have the
       * same subject + Faculty + subgroup. Treating the entire
       * contiguous run as one session would accidentally edit
       * or delete both periods.
       */
      if (
        expectedLength <=
        1
      ) {
        return [
          entry,
        ];
      }


      if (
        contiguous.length <=
        expectedLength
      ) {
        return contiguous;
      }


      const clickedIndex =
        contiguous.findIndex(
          item =>
            item.id ===
            entry.id
        );


      const chunkStart =
        Math.floor(
          clickedIndex /
          expectedLength
        ) *
        expectedLength;


      return contiguous.slice(
        chunkStart,
        chunkStart +
          expectedLength
      );
    };


  const openEdit =
    (
      entry:
        BuilderEntry
    ) => {

      if (
        data?.mode !==
        "Draft"
      ) {
        return;
      }


      const session =
        sessionEntriesFor(
          entry
        );


      const first =
        [
          ...session,
        ].sort(
          (
            a,
            b
          ) =>
            a.periodOrder -
            b.periodOrder
        )[0];


      const startSlot =
        slots.find(
          item =>
            item.periodOrder ===
            first.periodOrder
        );


      setValidation(null);


      setEditor({
        open:
          true,

        day:
          first.dayOfWeek,

        startSlotId:
          startSlot?.id ||
          "",

        periodCount:
          Math.max(
            1,
            session.length
          ),

        subjectId:
          first.batchSubjectId,

        facultyId:
          first.facultyId,

        resourceId:
          first.resourceId,

        room:
          first.room,

        classType:
          first.classType ||
          "Lecture",

        subgroup:
          first.subgroup,

        notes:
          first.notes,

        replaceEntryIds:
          session.map(
            item =>
              item.id
          ),
      });
    };


  const subjectChanged =
    (
      subjectId: string
    ) => {

      const subject =
        data?.subjects.find(
          item =>
            item.id ===
            subjectId
        );


      const allocations =
        (
          data?.allocations ||
          []
        ).filter(
          item =>
            item.batchSubjectId ===
            subjectId
        );


      const primary =
        allocations.find(
          item =>
            item.isPrimary
        ) ||
        allocations[0];


      setEditor(
        current => ({
          ...current,

          subjectId,

          facultyId:
            primary
              ?.facultyId ||
            subject
              ?.facultyId ||
            "",

          classType:
            primary
              ?.allocationType ===
            "Lab"
              ? "Lab"
              : subject
                  ?.subjectType ||
                "Lecture",

          subgroup:
            primary
              ?.subgroup ||
            "",

          periodCount:
            Math.max(
              1,
              Math.min(
                primary
                  ?.sessionLengthPeriods ||
                1,
                Math.max(
                  1,
                  teachingRunFrom(
                    current.startSlotId
                  ).length
                )
              )
            ),
        })
      );
    };


  const facultyChanged =
    (
      facultyId: string
    ) => {

      const option =
        facultyOptions.find(
          item =>
            item.id ===
            facultyId
        );


      setEditor(
        current => ({
          ...current,

          facultyId,

          classType:
            option
              ?.allocationType ===
            "Lab"
              ? "Lab"
              : current.classType,

          subgroup:
            option
              ?.subgroup ||
            current.subgroup,

          periodCount:
            Math.max(
              1,
              Math.min(
                option
                  ?.sessionLengthPeriods ||
                current.periodCount,
                Math.max(
                  1,
                  teachingRunFrom(
                    current.startSlotId
                  ).length
                )
              )
            ),
        })
      );
    };


  const startSlotChanged =
    (
      slotId: string
    ) => {

      const run =
        teachingRunFrom(
          slotId
        );


      setEditor(
        current => ({
          ...current,

          startSlotId:
            slotId,

          periodCount:
            Math.min(
              Math.max(
                1,
                current.periodCount
              ),
              Math.max(
                1,
                run.length
              )
            ),
        })
      );
    };


  const resourceChanged =
    (
      resourceId: string
    ) => {

      const resource =
        data?.resources.find(
          item =>
            item.id ===
            resourceId
        );


      setEditor(
        current => ({
          ...current,

          resourceId,

          room:
            resource
              ? resource.code ||
                resource.name
              : current.room,
        })
      );
    };


  const saveSession =
    async () => {

      if (
        !data ||
        !selectedBatchId
      ) {
        return;
      }


      if (
        !editor.day
      ) {

        setError(
          "Select a working day."
        );

        return;
      }


      if (
        !editor.startSlotId
      ) {

        setError(
          "Select the starting period."
        );

        return;
      }


      if (
        !editor.subjectId
      ) {

        setError(
          "Select a subject."
        );

        return;
      }


      if (
        !editor.facultyId
      ) {

        setError(
          "Select the Faculty assigned to this subject."
        );

        return;
      }


      const run =
        teachingRunFrom(
          editor.startSlotId
        );


      const selectedSlots =
        run.slice(
          0,
          editor.periodCount
        );


      if (
        selectedSlots.length !==
        editor.periodCount
      ) {

        setError(
          "This multi-period session would cross a break or the end of the timetable."
        );

        return;
      }


      const client =
        getSupabaseClient();


      if (!client) {
        return;
      }


      setBusy(true);
      setError("");
      setStatus("");


      try {

        const {
          error:
            rpcError,
        } =
          await client.rpc(
            "save_timetable_builder_session",
            {
              p_batch_id:
                selectedBatchId,

              p_day_of_week:
                editor.day,

              p_period_slot_ids:
                selectedSlots.map(
                  item =>
                    item.id
                ),

              p_batch_subject_id:
                editor.subjectId,

              p_faculty_id:
                editor.facultyId,

              p_resource_id:
                editor.resourceId ||
                null,

              p_room:
                editor.room.trim(),

              p_class_type:
                editor.classType ||
                "Lecture",

              p_subgroup:
                editor.subgroup.trim(),

              p_replace_entry_ids:
                editor.replaceEntryIds,

              p_notes:
                editor.notes.trim(),
            }
          );


        if (rpcError) {
          throw rpcError;
        }


        setEditor(
          emptyEditor()
        );

        setValidation(null);


        setStatus(
          editor.replaceEntryIds
            .length
            ? "Teaching session updated in the Draft."
            : `${editor.periodCount}-period teaching session added to the Draft.`
        );


        await loadBatch(
          selectedBatchId
        );

      } catch (
        caught
      ) {

        setError(
          caught instanceof
            Error
            ? caught.message
            : "Unable to save this teaching session."
        );

      } finally {

        setBusy(false);
      }
    };


  const removeSession =
    async () => {

      if (
        !selectedBatchId ||
        !editor.replaceEntryIds
          .length
      ) {
        return;
      }


      if (
        !window.confirm(
          `Remove this ${
            editor.replaceEntryIds
              .length
          }-period teaching session from the Draft?`
        )
      ) {
        return;
      }


      const client =
        getSupabaseClient();


      if (!client) {
        return;
      }


      setBusy(true);
      setError("");
      setStatus("");


      try {

        const {
          error:
            rpcError,
        } =
          await client.rpc(
            "remove_timetable_builder_session",
            {
              p_batch_id:
                selectedBatchId,

              p_entry_ids:
                editor.replaceEntryIds,
            }
          );


        if (rpcError) {
          throw rpcError;
        }


        setEditor(
          emptyEditor()
        );

        setValidation(null);

        setStatus(
          "Teaching session removed from the Draft."
        );


        await loadBatch(
          selectedBatchId
        );

      } catch (
        caught
      ) {

        setError(
          caught instanceof
            Error
            ? caught.message
            : "Unable to remove this session."
        );

      } finally {

        setBusy(false);
      }
    };


  const validateDraft =
    async () => {

      if (
        !selectedBatchId
      ) {
        return null;
      }


      const client =
        getSupabaseClient();


      if (!client) {
        return null;
      }


      setBusy(true);
      setError("");
      setStatus("");


      try {

        const {
          data:
            result,
          error:
            rpcError,
        } =
          await client.rpc(
            "validate_timetable_builder_draft",
            {
              p_batch_id:
                selectedBatchId,
            }
          );


        if (rpcError) {
          throw rpcError;
        }


        const next =
          normalizeValidation(
            result
          );


        setValidation(
          next
        );


        setStatus(
          next.valid
            ? `Validation passed. ${next.entryCount} teaching periods are ready to publish.`
            : `${next.issueCount} blocking timetable issue${
                next.issueCount ===
                1
                  ? ""
                  : "s"
              } found.`
        );


        return next;

      } catch (
        caught
      ) {

        setError(
          caught instanceof
            Error
            ? caught.message
            : "Unable to validate timetable."
        );

        return null;

      } finally {

        setBusy(false);
      }
    };


  const publishDraft =
    async () => {

      if (
        !selectedBatchId
      ) {
        return;
      }


      const client =
        getSupabaseClient();


      if (!client) {
        return;
      }


      const validationResult =
        await validateDraft();


      if (
        !validationResult ||
        !validationResult.valid
      ) {
        return;
      }


      const batchLabel =
        selectedBatch
          ? [
              selectedBatch.batchName,
              selectedBatch.section,
            ]
              .filter(Boolean)
              .join(" · ")
          : "this batch";


      if (
        !window.confirm(
          `Publish the Digital Timetable for ${batchLabel}?\n\nStudents will immediately see the new Published timetable and Faculty will see their own updated teaching schedules.`
        )
      ) {
        return;
      }


      setBusy(true);
      setError("");
      setStatus("");


      try {

        const {
          data:
            result,
          error:
            rpcError,
        } =
          await client.rpc(
            "publish_timetable_builder_draft",
            {
              p_batch_id:
                selectedBatchId,
            }
          );


        if (rpcError) {
          throw rpcError;
        }


        const row =
          (
            result &&
            typeof result ===
              "object"
          )
            ? result as Record<
                string,
                any
              >
            : {};


        setValidation(null);


        setStatus(
          `Published timetable v${numberValue(
            row.versionNumber
          )} with ${numberValue(
            row.entryCount
          )} teaching periods.`
        );


        await Promise.all([
          loadBatch(
            selectedBatchId
          ),
          loadWorkspace(
            true
          ),
        ]);

      } catch (
        caught
      ) {

        setError(
          caught instanceof
            Error
            ? caught.message
            : "Unable to publish timetable."
        );

      } finally {

        setBusy(false);
      }
    };


  const discardDraft =
    async () => {

      if (
        !selectedBatchId
      ) {
        return;
      }


      if (
        !window.confirm(
          "Discard this Timetable Builder Draft?\n\nThe current Published timetable will remain unchanged."
        )
      ) {
        return;
      }


      const client =
        getSupabaseClient();


      if (!client) {
        return;
      }


      setBusy(true);
      setError("");
      setStatus("");


      try {

        const {
          error:
            rpcError,
        } =
          await client.rpc(
            "discard_timetable_builder_draft",
            {
              p_batch_id:
                selectedBatchId,
            }
          );


        if (rpcError) {
          throw rpcError;
        }


        setEditor(
          emptyEditor()
        );

        setValidation(null);

        setStatus(
          "Draft discarded. Published timetable was not changed."
        );


        await Promise.all([
          loadBatch(
            selectedBatchId
          ),
          loadWorkspace(
            true
          ),
        ]);

      } catch (
        caught
      ) {

        setError(
          caught instanceof
            Error
            ? caught.message
            : "Unable to discard timetable draft."
        );

      } finally {

        setBusy(false);
      }
    };


  if (
    !canManage
  ) {

    return null;
  }


  return (
    <section className="digitalBuilder">

      <header className="digitalBuilderHero">

        <div>

          <div className="digitalBuilderEyebrow">

            <span />

            DIGITAL TIMETABLE BUILDER

          </div>


          <h1>
            Build every batch timetable visually.
          </h1>


          <p>
            Click an empty period to assign a subject,
            Faculty member, room or lab. Multi-period
            classes stay together and publication is
            conflict-validated before students see it.
          </p>

        </div>


        <div className="digitalBuilderHeroState">

          <span
            className={
              data?.mode ===
              "Draft"
                ? "draft"
                : data?.mode ===
                    "Published"
                  ? "published"
                  : "empty"
            }
          >
            {data?.mode ||
              "Loading"}
          </span>

          {data?.draftPublication && (
            <small>
              Draft v
              {
                data
                  .draftPublication
                  .versionNumber
              }
            </small>
          )}

          {!data?.draftPublication &&
            data?.publishedPublication && (
              <small>
                Published v
                {
                  data
                    .publishedPublication
                    .versionNumber
                }
              </small>
            )}

        </div>

      </header>


      <div className="digitalBuilderControlBar">

        <label>

          <span>
            BATCH / SECTION
          </span>

          <select
            value={
              selectedBatchId
            }
            disabled={
              loading ||
              busy
            }
            onChange={
              event =>
                setSelectedBatchId(
                  event.target.value
                )
            }
          >

            {!workspace.batches
              .length && (
              <option value="">
                No assigned batch
              </option>
            )}


            {workspace.batches.map(
              batch => (
                <option
                  value={
                    batch.id
                  }
                  key={
                    batch.id
                  }
                >
                  {[
                    batch.department,
                    batch.batchName,
                    batch.section,
                    batch.semester
                      ? `Sem ${batch.semester}`
                      : "",
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      " · "
                    )}
                </option>
              )
            )}

          </select>

        </label>


        <div className="digitalBuilderBatchMeta">

          <div>

            <span>
              DEPARTMENT
            </span>

            <strong>
              {selectedBatch
                ?.department ||
                "—"}
            </strong>

          </div>


          <div>

            <span>
              ACADEMIC YEAR
            </span>

            <strong>
              {selectedBatch
                ?.academicYear ||
                "—"}
            </strong>

          </div>


          <div>

            <span>
              PROFILE
            </span>

            <strong>
              {selectedBatch
                ?.profileName ||
                data
                  ?.profile
                  ?.name ||
                "Not configured"}
            </strong>

          </div>

        </div>


        <button
          type="button"
          className="digitalBuilderRefresh"
          disabled={
            busy ||
            batchLoading ||
            !selectedBatchId
          }
          onClick={() =>
            void loadBatch(
              selectedBatchId
            )
          }
        >
          Refresh
        </button>

      </div>


      {error && (
        <div
          className="digitalBuilderAlert error"
          role="alert"
        >
          {error}
        </div>
      )}


      {status && (
        <div
          className="digitalBuilderAlert success"
          role="status"
        >
          {status}
        </div>
      )}


      {loading ||
      batchLoading ? (

        <div className="digitalBuilderLoading">

          <span />

          Loading Digital Timetable Builder…

        </div>

      ) : !selectedBatchId ? (

        <div className="digitalBuilderEmpty">

          <strong>
            No batch assigned
          </strong>

          <p>
            Main Admin must assign your Timetable
            Coordinator authority to a department
            containing configured batches.
          </p>

        </div>

      ) : !data?.profile ? (

        <div className="digitalBuilderEmpty">

          <strong>
            Scheduling profile required
          </strong>

          <p>
            This batch does not yet have working
            days and period timings configured.
            Main Admin should configure its timetable
            profile first.
          </p>

        </div>

      ) : (
        <>

          <div className="digitalBuilderToolbar">

            <div>

              <strong>
                {data.batch
                  ?.batchName ||
                  "Selected Batch"}

                {data.batch
                  ?.section
                  ? ` · ${data.batch.section}`
                  : ""}
              </strong>

              <span>
                {data.entries.length}
                {" "}
                scheduled periods
                {" · "}
                {days.length}
                {" "}
                working days
              </span>

            </div>


            <div className="digitalBuilderToolbarActions">

              {data.mode !==
                "Draft" ? (

                <button
                  type="button"
                  className="primary"
                  disabled={
                    busy
                  }
                  onClick={() =>
                    void startDraft()
                  }
                >
                  {data.mode ===
                  "Published"
                    ? "Edit Published Timetable"
                    : "Start Timetable"}
                </button>

              ) : (
                <>

                  <button
                    type="button"
                    disabled={
                      busy
                    }
                    onClick={() =>
                      void validateDraft()
                    }
                  >
                    Validate
                  </button>


                  <button
                    type="button"
                    className="danger"
                    disabled={
                      busy
                    }
                    onClick={() =>
                      void discardDraft()
                    }
                  >
                    Discard Draft
                  </button>


                  <button
                    type="button"
                    className="primary"
                    disabled={
                      busy ||
                      !data.entries
                        .length
                    }
                    onClick={() =>
                      void publishDraft()
                    }
                  >
                    Publish
                  </button>

                </>
              )}

            </div>

          </div>


          {validation && (
            <section
              className={
                validation.valid
                  ? "digitalBuilderValidation valid"
                  : "digitalBuilderValidation invalid"
              }
            >

              <div>

                <strong>
                  {validation.valid
                    ? "✓ Timetable validation passed"
                    : `⚠ ${validation.issueCount} blocking issue${
                        validation.issueCount ===
                        1
                          ? ""
                          : "s"
                      }`}
                </strong>

                <span>
                  {validation.entryCount}
                  {" "}
                  teaching periods checked
                </span>

              </div>


              {!validation.valid &&
                validation.issues
                  .length > 0 && (
                  <ul>

                    {validation.issues.map(
                      (
                        issue,
                        index
                      ) => (
                        <li
                          key={
                            `${issue}-${index}`
                          }
                        >
                          {issue}
                        </li>
                      )
                    )}

                  </ul>
                )}

            </section>
          )}


          <div className="digitalBuilderLegend">

            <span>
              <i className="lecture" />
              Lecture
            </span>

            <span>
              <i className="lab" />
              Lab / Practical
            </span>

            <span>
              <i className="break" />
              Break / Lunch
            </span>

            <span>
              <i className="empty" />
              Click empty cell to add
            </span>

          </div>


          <div className="digitalBuilderScroller">

            <div
              className="digitalBuilderGrid"
              style={{
                gridTemplateColumns:
                  `132px repeat(${slots.length}, minmax(172px, 1fr))`,
              }}
            >

              <div className="digitalBuilderCorner">

                <strong>
                  DAY
                </strong>

                <small>
                  BATCH GRID
                </small>

              </div>


              {slots.map(
                slot => (
                  <div
                    key={
                      `header-${slot.id}`
                    }
                    className={
                      slot.isTeachingSlot
                        ? "digitalBuilderSlotHeader"
                        : "digitalBuilderSlotHeader break"
                    }
                  >

                    <strong>
                      {slot.label ||
                        (
                          slot.isTeachingSlot
                            ? `Period ${slot.periodOrder}`
                            : "Break"
                        )}
                    </strong>

                    <span>
                      {formatClock(
                        slot.startTime
                      )}
                    </span>

                    <small>
                      {formatClock(
                        slot.endTime
                      )}
                    </small>

                  </div>
                )
              )}


              {days.map(
                day => (
                  <div
                    key={
                      day.id
                    }
                    style={{
                      display:
                        "contents",
                    }}
                  >

                    <div className="digitalBuilderDay">

                      <strong>
                        {day.dayOfWeek}
                      </strong>

                      <span>
                        {
                          data.entries.filter(
                            item =>
                              item.dayOfWeek ===
                              day.dayOfWeek
                          ).length
                        }
                        {" "}
                        periods
                      </span>

                    </div>


                    {slots.map(
                      slot => {

                        if (
                          !slot.isTeachingSlot
                        ) {

                          return (
                            <div
                              key={
                                `${day.id}-${slot.id}`
                              }
                              className="digitalBuilderBreak"
                            >

                              <span>
                                {slot.label ||
                                  "Break"}
                              </span>

                            </div>
                          );
                        }


                        const cellEntries =
                          entriesForCell(
                            day.dayOfWeek,
                            slot.periodOrder
                          );


                        if (
                          !cellEntries.length
                        ) {

                          return (
                            <button
                              type="button"
                              key={
                                `${day.id}-${slot.id}`
                              }
                              className={
                                data.mode ===
                                "Draft"
                                  ? "digitalBuilderEmptyCell editable"
                                  : "digitalBuilderEmptyCell"
                              }
                              disabled={
                                data.mode !==
                                "Draft"
                              }
                              onClick={() =>
                                openAdd(
                                  day,
                                  slot
                                )
                              }
                            >

                              <span>
                                +
                              </span>

                              <strong>
                                Add class
                              </strong>

                              <small>
                                Period {
                                  slot.periodOrder
                                }
                              </small>

                            </button>
                          );
                        }


                        return (
                          <div
                            key={
                              `${day.id}-${slot.id}`
                            }
                            className="digitalBuilderFilledCell"
                          >

                            {cellEntries.map(
                              entry => {

                                const isLab =
                                  /lab|practical/i.test(
                                    entry.classType
                                  );


                                return (
                                  <button
                                    type="button"
                                    key={
                                      entry.id
                                    }
                                    disabled={
                                      data.mode !==
                                      "Draft"
                                    }
                                    className={
                                      isLab
                                        ? "digitalBuilderClass lab"
                                        : "digitalBuilderClass"
                                    }
                                    onClick={() =>
                                      openEdit(
                                        entry
                                      )
                                    }
                                  >

                                    <span className="digitalBuilderClassCode">
                                      {entry.subjectCode ||
                                        entry.classType}
                                    </span>


                                    <strong>
                                      {entry.subjectName}
                                    </strong>


                                    <small>
                                      {entry.facultyName ||
                                        "Faculty"}
                                    </small>


                                    <div>

                                      <span>
                                        {entry.room ||
                                          "Room TBA"}
                                      </span>

                                      {entry.subgroup && (
                                        <i>
                                          {entry.subgroup}
                                        </i>
                                      )}

                                    </div>

                                  </button>
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

          </div>


          <footer className="digitalBuilderGridFooter">

            <span>
              {data.mode ===
              "Draft"
                ? "Draft mode · Changes are hidden from Students and Faculty until Publish."
                : "Published mode · Start editing to create an isolated Draft."}
            </span>

            <strong>
              Faculty and room clashes are checked by the backend.
            </strong>

          </footer>

        </>
      )}


      {editor.open &&
        data && (
        <div
          className="digitalBuilderModalBackdrop"
          onMouseDown={
            event => {

              if (
                event.target ===
                event.currentTarget &&
                !busy
              ) {
                setEditor(
                  emptyEditor()
                );
              }
            }
          }
        >

          <section className="digitalBuilderModal">

            <header>

              <div>

                <span>
                  {editor.replaceEntryIds
                    .length
                    ? "EDIT TEACHING SESSION"
                    : "ADD TEACHING SESSION"}
                </span>

                <h2>
                  {editor.replaceEntryIds
                    .length
                    ? "Update this timetable block"
                    : "Add class to the timetable"}
                </h2>

                <p>
                  One teacher may teach multiple periods
                  and batches, but never overlapping times.
                </p>

              </div>


              <button
                type="button"
                disabled={
                  busy
                }
                onClick={() =>
                  setEditor(
                    emptyEditor()
                  )
                }
              >
                ×
              </button>

            </header>


            <div className="digitalBuilderFormGrid">

              <label>

                <span>
                  Working day
                </span>

                <select
                  value={
                    editor.day
                  }
                  disabled={
                    busy
                  }
                  onChange={
                    event =>
                      setEditor(
                        current => ({
                          ...current,

                          day:
                            event
                              .target
                              .value,
                        })
                      )
                  }
                >

                  {days.map(
                    day => (
                      <option
                        key={
                          day.id
                        }
                        value={
                          day.dayOfWeek
                        }
                      >
                        {day.dayOfWeek}
                      </option>
                    )
                  )}

                </select>

              </label>


              <label>

                <span>
                  Start period
                </span>

                <select
                  value={
                    editor.startSlotId
                  }
                  disabled={
                    busy
                  }
                  onChange={
                    event =>
                      startSlotChanged(
                        event.target
                          .value
                      )
                  }
                >

                  {slots
                    .filter(
                      item =>
                        item.isTeachingSlot
                    )
                    .map(
                      slot => (
                        <option
                          key={
                            slot.id
                          }
                          value={
                            slot.id
                          }
                        >
                          {slot.label ||
                            `Period ${slot.periodOrder}`}
                          {" · "}
                          {formatClock(
                            slot.startTime
                          )}
                        </option>
                      )
                    )}

                </select>

              </label>


              <label>

                <span>
                  Consecutive periods
                </span>

                <select
                  value={
                    editor.periodCount
                  }
                  disabled={
                    busy
                  }
                  onChange={
                    event =>
                      setEditor(
                        current => ({
                          ...current,

                          periodCount:
                            Number(
                              event.target
                                .value
                            ) ||
                            1,
                        })
                      )
                  }
                >

                  {allowedPeriodCounts.map(
                    count => (
                      <option
                        key={
                          count
                        }
                        value={
                          count
                        }
                      >
                        {count}
                        {" "}
                        period
                        {count ===
                        1
                          ? ""
                          : "s"}
                      </option>
                    )
                  )}

                </select>


                <small>
                  Break/Lunch automatically stops
                  multi-period selection.
                </small>

              </label>


              <label className="wide">

                <span>
                  Subject
                </span>

                <select
                  value={
                    editor.subjectId
                  }
                  disabled={
                    busy
                  }
                  onChange={
                    event =>
                      subjectChanged(
                        event.target
                          .value
                      )
                  }
                >

                  <option value="">
                    Select subject
                  </option>


                  {data.subjects.map(
                    subject => (
                      <option
                        key={
                          subject.id
                        }
                        value={
                          subject.id
                        }
                      >
                        {subject.subjectName}
                        {subject.subjectCode
                          ? ` · ${subject.subjectCode}`
                          : ""}
                      </option>
                    )
                  )}

                </select>

              </label>


              <label className="wide">

                <span>
                  Assigned Faculty
                </span>

                <select
                  value={
                    editor.facultyId
                  }
                  disabled={
                    busy ||
                    !editor.subjectId
                  }
                  onChange={
                    event =>
                      facultyChanged(
                        event.target
                          .value
                      )
                  }
                >

                  <option value="">
                    {editor.subjectId
                      ? "Select assigned Faculty"
                      : "Select subject first"}
                  </option>


                  {facultyOptions.map(
                    option => (
                      <option
                        key={
                          option.id
                        }
                        value={
                          option.id
                        }
                      >
                        {option.name}
                        {option.allocationType
                          ? ` · ${option.allocationType}`
                          : ""}
                        {option.subgroup
                          ? ` · ${option.subgroup}`
                          : ""}
                      </option>
                    )
                  )}

                </select>


                {editor.subjectId &&
                  !facultyOptions
                    .length && (
                    <small className="error">
                      No active Faculty allocation
                      exists for this subject.
                    </small>
                  )}

              </label>


              <label>

                <span>
                  Class type
                </span>

                <select
                  value={
                    editor.classType
                  }
                  disabled={
                    busy
                  }
                  onChange={
                    event =>
                      setEditor(
                        current => ({
                          ...current,

                          classType:
                            event.target
                              .value,
                        })
                      )
                  }
                >

                  {[
                    "Lecture",
                    "Lab",
                    "Tutorial",
                    "Project",
                    "Seminar",
                    "Activity",
                  ].map(
                    type => (
                      <option
                        key={
                          type
                        }
                        value={
                          type
                        }
                      >
                        {type}
                      </option>
                    )
                  )}

                </select>

              </label>


              <label>

                <span>
                  Subgroup
                </span>

                <input
                  value={
                    editor.subgroup
                  }
                  disabled={
                    busy
                  }
                  placeholder="Whole batch / A / B"
                  onChange={
                    event =>
                      setEditor(
                        current => ({
                          ...current,

                          subgroup:
                            event.target
                              .value,
                        })
                      )
                  }
                />

              </label>


              <label className="wide">

                <span>
                  Room / Lab resource
                </span>

                <select
                  value={
                    editor.resourceId
                  }
                  disabled={
                    busy
                  }
                  onChange={
                    event =>
                      resourceChanged(
                        event.target
                          .value
                      )
                  }
                >

                  <option value="">
                    Manual room / no registered resource
                  </option>


                  {data.resources.map(
                    resource => (
                      <option
                        key={
                          resource.id
                        }
                        value={
                          resource.id
                        }
                      >
                        {resource.code ||
                          resource.name}
                        {" · "}
                        {resource.type}

                        {resource.building
                          ? ` · ${resource.building}`
                          : ""}
                      </option>
                    )
                  )}

                </select>

              </label>


              <label className="wide">

                <span>
                  Room display
                </span>

                <input
                  value={
                    editor.room
                  }
                  disabled={
                    busy
                  }
                  placeholder="Example: ECE-204 or VLSI Lab"
                  onChange={
                    event =>
                      setEditor(
                        current => ({
                          ...current,

                          room:
                            event.target
                              .value,
                        })
                      )
                  }
                />

              </label>


              <label className="wide">

                <span>
                  Notes
                </span>

                <textarea
                  value={
                    editor.notes
                  }
                  disabled={
                    busy
                  }
                  rows={3}
                  placeholder="Optional coordinator note"
                  onChange={
                    event =>
                      setEditor(
                        current => ({
                          ...current,

                          notes:
                            event.target
                              .value,
                        })
                      )
                  }
                />

              </label>

            </div>


            {selectedFaculty && (
              <div className="digitalBuilderAllocationHint">

                <strong>
                  Faculty allocation
                </strong>

                <span>
                  {selectedFaculty.name}
                  {" · "}
                  {selectedFaculty.allocationType ||
                    "Teaching"}

                  {" · "}

                  {selectedFaculty.sessionLengthPeriods}
                  {" "}
                  period session

                  {selectedFaculty.subgroup
                    ? ` · subgroup ${selectedFaculty.subgroup}`
                    : ""}
                </span>

              </div>
            )}


            <footer>

              {editor.replaceEntryIds
                .length > 0 && (
                <button
                  type="button"
                  className="danger"
                  disabled={
                    busy
                  }
                  onClick={() =>
                    void removeSession()
                  }
                >
                  Remove Session
                </button>
              )}


              <div className="digitalBuilderModalSpacer" />


              <button
                type="button"
                disabled={
                  busy
                }
                onClick={() =>
                  setEditor(
                    emptyEditor()
                  )
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className="primary"
                disabled={
                  busy ||
                  !editor.subjectId ||
                  !editor.facultyId ||
                  !editor.startSlotId
                }
                onClick={() =>
                  void saveSession()
                }
              >
                {busy
                  ? "Saving…"
                  : editor.replaceEntryIds
                      .length
                    ? "Update Session"
                    : `Add ${
                        editor.periodCount
                      } Period${
                        editor.periodCount ===
                        1
                          ? ""
                          : "s"
                      }`}
              </button>

            </footer>

          </section>

        </div>
      )}

    </section>
  );
}
