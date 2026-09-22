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

import FacultySyllabusSmartPlanner from "./faculty-syllabus-smart-planner";


type FacultySyllabusProfile = {
  name?: string | null;
  email?: string | null;
  campus_uid?: string | null;
  department?: string | null;
  role?: string | null;
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


type Batch = {
  id: string;
  batch_name: string;
  section: string;
  department: string;
  academic_year: string;
  semester: string;
};


type SyllabusUnit = {
  id: string;
  batch_subject_id: string;
  unit_number: number;
  unit_title: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};


type SyllabusTopic = {
  id: string;
  unit_id: string;
  batch_subject_id: string;
  topic_order: number;
  topic_title: string;
  description: string;
  planned_periods: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};


type TopicCoverage = {
  id: string;
  topic_id: string;
  batch_subject_id: string;
  diary_id: string;
  faculty_id: string;
  completed_at: string;
};


type FacultySyllabusProgressProps = {
  profile: FacultySyllabusProfile;
  onOpenAttendance: () => void;
  onOpenDiary: () => void;
};


const cleanText = (
  value: unknown
) =>
  String(
    value ?? ""
  ).trim();


const clampPercent = (
  value: number
) =>
  Math.max(
    0,
    Math.min(
      100,
      Math.round(
        value
      )
    )
  );


const formatDate = (
  value: string
) => {

  if (!value) {
    return "";
  }

  const date =
    new Date(
      `${value.slice(
        0,
        10
      )}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
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
  ).format(
    date
  );
};


export default function FacultySyllabusProgress({
  profile,
  onOpenAttendance,
  onOpenDiary,
}: FacultySyllabusProgressProps) {

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
    subjects,
    setSubjects,
  ] = useState<
    BatchSubject[]
  >([]);


  const [
    batches,
    setBatches,
  ] = useState<
    Batch[]
  >([]);


  const [
    units,
    setUnits,
  ] = useState<
    SyllabusUnit[]
  >([]);


  const [
    topics,
    setTopics,
  ] = useState<
    SyllabusTopic[]
  >([]);


  const [
    coverage,
    setCoverage,
  ] = useState<
    TopicCoverage[]
  >([]);


  const [
    selectedSubjectId,
    setSelectedSubjectId,
  ] = useState("");


  const [
    unitEditorOpen,
    setUnitEditorOpen,
  ] = useState(false);


  const [
    topicEditorOpen,
    setTopicEditorOpen,
  ] = useState(false);


  const [
    unitForm,
    setUnitForm,
  ] = useState({
    id: "",
    unit_number: 1,
    unit_title: "",
    description: "",
  });


  const [
    topicForm,
    setTopicForm,
  ] = useState({
    id: "",
    unit_id: "",
    topic_order: 1,
    topic_title: "",
    description: "",
    planned_periods: 1,
  });


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


  const batchMap =
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
      [
        batches,
      ]
    );


  const selectedBatch =
    selectedSubject
      ? batchMap.get(
          selectedSubject.batch_id
        ) || null
      : null;


  const subjectUnits =
    useMemo(
      () =>
        units
          .filter(
            item =>
              item.batch_subject_id ===
              selectedSubjectId
          )
          .sort(
            (
              a,
              b
            ) =>
              a.unit_number -
              b.unit_number
          ),
      [
        units,
        selectedSubjectId,
      ]
    );


  const subjectTopics =
    useMemo(
      () =>
        topics
          .filter(
            item =>
              item.batch_subject_id ===
              selectedSubjectId
          ),
      [
        topics,
        selectedSubjectId,
      ]
    );


  const coverageByTopic =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            TopicCoverage[]
          >();


        coverage.forEach(
          item => {

            const current =
              map.get(
                item.topic_id
              ) || [];


            current.push(
              item
            );


            map.set(
              item.topic_id,
              current
            );
          }
        );


        map.forEach(
          rows =>
            rows.sort(
              (
                a,
                b
              ) =>
                a.completed_at.localeCompare(
                  b.completed_at
                )
            )
        );


        return map;
      },
      [
        coverage,
      ]
    );


  const recommendedTopic =
    useMemo(
      () => {

        const orderedTopics =
          subjectUnits.flatMap(
            unit =>
              subjectTopics
                .filter(
                  topic =>
                    topic.unit_id ===
                    unit.id
                )
                .sort(
                  (
                    a,
                    b
                  ) =>
                    a.topic_order -
                    b.topic_order
                )
          );


        const incompleteTopics =
          orderedTopics.filter(
            topic => {

              const taught =
                coverageByTopic.get(
                  topic.id
                )?.length ||
                0;


              const planned =
                Math.max(
                  1,
                  Number(
                    topic.planned_periods
                  ) ||
                    1
                );


              return (
                taught <
                planned
              );
            }
          );


        const inProgress =
          incompleteTopics.find(
            topic =>
              (
                coverageByTopic.get(
                  topic.id
                )?.length ||
                0
              ) >
              0
          );


        return (
          inProgress ||
          incompleteTopics[0] ||
          null
        );
      },
      [
        subjectUnits,
        subjectTopics,
        coverageByTopic,
      ]
    );


  const loadData =
    useCallback(
      async (
        quiet = false
      ) => {

        if (
          profile.role !==
          "Faculty"
        ) {
          setStatus(
            "Syllabus Progress is available to Faculty accounts."
          );

          setLoading(
            false
          );

          return;
        }


        const client =
          getSupabaseClient();


        if (!client) {
          setStatus(
            "CampusConnect is not connected to Supabase."
          );

          setLoading(
            false
          );

          return;
        }


        if (!quiet) {
          setLoading(
            true
          );
        }


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


          /*
           * Do NOT add a frontend faculty_id restriction here.
           *
           * attendance_batch_subjects RLS already allows:
           * 1. direct faculty assignment
           * 2. active faculty_teaching_allocations
           *
           * This is important for co-teaching / allocation-based
           * assignments.
           */
          const {
            data:
              subjectData,
            error:
              subjectError,
          } = await client
            .from(
              "attendance_batch_subjects"
            )
            .select(
              "id,batch_id,subject_name,subject_code,subject_type,credits,faculty_id,faculty_name"
            )
            .order(
              "subject_name",
              {
                ascending:
                  true,
              }
            );


          if (
            subjectError
          ) {
            throw subjectError;
          }


          const nextSubjects =
            (
              subjectData ||
              []
            ) as BatchSubject[];


          const batchIds =
            Array.from(
              new Set(
                nextSubjects.map(
                  item =>
                    item.batch_id
                )
              )
            );


          let nextBatches:
            Batch[] = [];


          if (
            batchIds.length
          ) {

            const {
              data:
                batchData,
              error:
                batchError,
            } = await client
              .from(
                "attendance_batches"
              )
              .select(
                "id,batch_name,section,department,academic_year,semester"
              )
              .in(
                "id",
                batchIds
              );


            if (
              batchError
            ) {
              throw batchError;
            }


            nextBatches =
              (
                batchData ||
                []
              ) as Batch[];
          }


          const subjectIds =
            nextSubjects.map(
              item =>
                item.id
            );


          let nextUnits:
            SyllabusUnit[] = [];

          let nextTopics:
            SyllabusTopic[] = [];

          let nextCoverage:
            TopicCoverage[] = [];


          if (
            subjectIds.length
          ) {

            const [
              unitResult,
              topicResult,
              coverageResult,
            ] =
              await Promise.all([

                client
                  .from(
                    "faculty_syllabus_units"
                  )
                  .select(
                    "id,batch_subject_id,unit_number,unit_title,description,created_by,created_at,updated_at"
                  )
                  .in(
                    "batch_subject_id",
                    subjectIds
                  )
                  .order(
                    "unit_number",
                    {
                      ascending:
                        true,
                    }
                  ),

                client
                  .from(
                    "faculty_syllabus_topics"
                  )
                  .select(
                    "id,unit_id,batch_subject_id,topic_order,topic_title,description,planned_periods,created_by,created_at,updated_at"
                  )
                  .in(
                    "batch_subject_id",
                    subjectIds
                  )
                  .order(
                    "topic_order",
                    {
                      ascending:
                        true,
                    }
                  ),

                client
                  .from(
                    "faculty_syllabus_topic_completions"
                  )
                  .select(
                    "id,topic_id,batch_subject_id,diary_id,faculty_id,completed_at"
                  )
                  .in(
                    "batch_subject_id",
                    subjectIds
                  )
                  .order(
                    "completed_at",
                    {
                      ascending:
                        true,
                    }
                  ),
              ]);


            if (
              unitResult.error
            ) {
              throw unitResult.error;
            }


            if (
              topicResult.error
            ) {
              throw topicResult.error;
            }


            if (
              coverageResult.error
            ) {
              throw coverageResult.error;
            }


            nextUnits =
              (
                unitResult.data ||
                []
              ) as SyllabusUnit[];


            nextTopics =
              (
                topicResult.data ||
                []
              ) as SyllabusTopic[];


            nextCoverage =
              (
                coverageResult.data ||
                []
              ) as TopicCoverage[];
          }


          setSubjects(
            nextSubjects
          );

          setBatches(
            nextBatches
          );

          setUnits(
            nextUnits
          );

          setTopics(
            nextTopics
          );

          setCoverage(
            nextCoverage
          );


          setSelectedSubjectId(
            current => {

              if (
                current &&
                nextSubjects.some(
                  item =>
                    item.id ===
                    current
                )
              ) {
                return current;
              }


              return (
                nextSubjects[0]
                  ?.id ||
                ""
              );
            }
          );


          setStatus(
            ""
          );

        } catch (
          loadError
        ) {

          console.error(
            "Faculty syllabus progress:",
            loadError
          );


          setStatus(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load syllabus progress."
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
      void loadData();
    },
    [
      loadData,
    ]
  );


  useEffect(
    () => {

      setUnitEditorOpen(
        false
      );

      setTopicEditorOpen(
        false
      );

      setUnitForm({
        id: "",
        unit_number:
          subjectUnits.length
            ? Math.max(
                ...subjectUnits.map(
                  item =>
                    item.unit_number
                )
              ) + 1
            : 1,
        unit_title: "",
        description: "",
      });

      setTopicForm({
        id: "",
        unit_id: "",
        topic_order: 1,
        topic_title: "",
        description: "",
        planned_periods: 1,
      });

    },
    [
      selectedSubjectId,
    ]
  );


  const topicStats =
    (
      topic:
        SyllabusTopic
    ) => {

      const events =
        coverageByTopic.get(
          topic.id
        ) || [];


      const taughtClasses =
        events.length;


      const plannedClasses =
        Math.max(
          1,
          Number(
            topic.planned_periods
          ) || 1
        );


      const creditedClasses =
        Math.min(
          taughtClasses,
          plannedClasses
        );


      const percent =
        clampPercent(
          (
            creditedClasses /
            plannedClasses
          ) *
            100
        );


      const lastEvent =
        events[
          events.length - 1
        ];


      return {
        taughtClasses,
        plannedClasses,
        creditedClasses,
        percent,
        completed:
          creditedClasses >=
          plannedClasses,
        lastTaught:
          lastEvent
            ?.completed_at
            ?.slice(
              0,
              10
            ) || "",
      };
    };


  const subjectProgress =
    useMemo(
      () => {

        const planned =
          subjectTopics.reduce(
            (
              total,
              topic
            ) =>
              total +
              Math.max(
                1,
                Number(
                  topic.planned_periods
                ) || 1
              ),
            0
          );


        const credited =
          subjectTopics.reduce(
            (
              total,
              topic
            ) => {

              const count =
                coverageByTopic.get(
                  topic.id
                )?.length || 0;


              return (
                total +
                Math.min(
                  count,
                  Math.max(
                    1,
                    Number(
                      topic.planned_periods
                    ) || 1
                  )
                )
              );
            },
            0
          );


        return {
          planned,
          credited,
          percent:
            planned
              ? clampPercent(
                  (
                    credited /
                    planned
                  ) *
                    100
                )
              : 0,
        };
      },
      [
        subjectTopics,
        coverageByTopic,
      ]
    );


  const openNewUnit =
    () => {

      if (
        !selectedSubject
      ) {
        return;
      }


      const nextNumber =
        subjectUnits.length
          ? Math.max(
              ...subjectUnits.map(
                item =>
                  item.unit_number
              )
            ) + 1
          : 1;


      setUnitForm({
        id: "",
        unit_number:
          nextNumber,
        unit_title: "",
        description: "",
      });

      setUnitEditorOpen(
        true
      );

      setTopicEditorOpen(
        false
      );
    };


  const editUnit =
    (
      unit:
        SyllabusUnit
    ) => {

      setUnitForm({
        id:
          unit.id,
        unit_number:
          unit.unit_number,
        unit_title:
          unit.unit_title,
        description:
          unit.description,
      });

      setUnitEditorOpen(
        true
      );

      setTopicEditorOpen(
        false
      );
    };


  const saveUnit =
    async () => {

      if (
        !selectedSubject
      ) {
        return;
      }


      const title =
        cleanText(
          unitForm.unit_title
        );


      if (
        !title
      ) {
        setStatus(
          "Enter a unit title."
        );

        return;
      }


      const unitNumber =
        Math.max(
          1,
          Math.floor(
            Number(
              unitForm.unit_number
            ) || 1
          )
        );


      const client =
        getSupabaseClient();


      if (!client) {
        return;
      }


      setSaving(
        true
      );


      try {

        const {
          data: auth,
          error:
            authError,
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


        if (
          unitForm.id
        ) {

          const {
            error,
          } = await client
            .from(
              "faculty_syllabus_units"
            )
            .update({
              unit_number:
                unitNumber,
              unit_title:
                title,
              description:
                cleanText(
                  unitForm.description
                ),
              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              unitForm.id
            );


          if (error) {
            throw error;
          }

        } else {

          const {
            error,
          } = await client
            .from(
              "faculty_syllabus_units"
            )
            .insert({
              batch_subject_id:
                selectedSubject.id,
              unit_number:
                unitNumber,
              unit_title:
                title,
              description:
                cleanText(
                  unitForm.description
                ),
              created_by:
                auth.user.id,
            });


          if (error) {
            throw error;
          }
        }


        setUnitEditorOpen(
          false
        );

        setStatus(
          unitForm.id
            ? "Syllabus unit updated."
            : "Syllabus unit created."
        );


        await loadData(
          true
        );

      } catch (
        saveError
      ) {

        console.error(
          "Save syllabus unit:",
          saveError
        );


        setStatus(
          saveError instanceof Error
            ? saveError.message
            : "Unable to save syllabus unit."
        );

      } finally {

        setSaving(
          false
        );
      }
    };


  const deleteUnit =
    async (
      unit:
        SyllabusUnit
    ) => {

      const unitTopics =
        subjectTopics.filter(
          topic =>
            topic.unit_id ===
            unit.id
        );


      if (
        !window.confirm(
          unitTopics.length
            ? `Delete Unit ${unit.unit_number} and its ${unitTopics.length} syllabus topic(s)? Existing syllabus progress for those topics will also be removed.`
            : `Delete Unit ${unit.unit_number}?`
        )
      ) {
        return;
      }


      const client =
        getSupabaseClient();


      if (!client) {
        return;
      }


      setSaving(
        true
      );


      try {

        const {
          error,
        } = await client
          .from(
            "faculty_syllabus_units"
          )
          .delete()
          .eq(
            "id",
            unit.id
          );


        if (error) {
          throw error;
        }


        setStatus(
          "Syllabus unit deleted."
        );


        await loadData(
          true
        );

      } catch (
        deleteError
      ) {

        setStatus(
          deleteError instanceof Error
            ? deleteError.message
            : "Unable to delete syllabus unit."
        );

      } finally {

        setSaving(
          false
        );
      }
    };


  const openNewTopic =
    (
      unit:
        SyllabusUnit
    ) => {

      const unitTopics =
        subjectTopics.filter(
          topic =>
            topic.unit_id ===
            unit.id
        );


      const nextOrder =
        unitTopics.length
          ? Math.max(
              ...unitTopics.map(
                item =>
                  item.topic_order
              )
            ) + 1
          : 1;


      setTopicForm({
        id: "",
        unit_id:
          unit.id,
        topic_order:
          nextOrder,
        topic_title: "",
        description: "",
        planned_periods: 1,
      });

      setTopicEditorOpen(
        true
      );

      setUnitEditorOpen(
        false
      );
    };


  const useTopicInAttendance =
    (
      topic:
        SyllabusTopic
    ) => {

      if (
        !selectedSubject ||
        !selectedBatch
      ) {

        setStatus(
          "Select an assigned subject before opening Attendance."
        );

        return;
      }


      try {

        window.sessionStorage.setItem(
          "campusconnect:faculty-attendance-class",
          JSON.stringify({
            batchId:
              selectedBatch.id,

            batchSubjectId:
              selectedSubject.id,

            subjectName:
              selectedSubject.subject_name,

            subjectCode:
              selectedSubject.subject_code,

            publicationId:
              "",

            timetableEntryId:
              "",

            periodStart:
              1,

            periodEnd:
              1,

            startTime:
              "",

            endTime:
              "",

            room:
              "",

            classType:
              selectedSubject.subject_type ||
              "",

            subgroup:
              "",

            source:
              "syllabus",

            syllabusTopicId:
              topic.id,

            syllabusTopicTitle:
              topic.topic_title,

            requestedAt:
              Date.now(),
          })
        );

      } catch (
        storageError
      ) {

        console.error(
          "[Syllabus attendance handoff]",
          storageError
        );


        setStatus(
          "Unable to prepare Attendance for this syllabus topic."
        );

        return;
      }


      onOpenAttendance();
    };


  const editTopic =
    (
      topic:
        SyllabusTopic
    ) => {

      setTopicForm({
        id:
          topic.id,
        unit_id:
          topic.unit_id,
        topic_order:
          topic.topic_order,
        topic_title:
          topic.topic_title,
        description:
          topic.description,
        planned_periods:
          topic.planned_periods,
      });

      setTopicEditorOpen(
        true
      );

      setUnitEditorOpen(
        false
      );
    };


  const saveTopic =
    async () => {

      if (
        !selectedSubject ||
        !topicForm.unit_id
      ) {
        return;
      }


      const topicTitle =
        cleanText(
          topicForm.topic_title
        );


      if (
        !topicTitle
      ) {
        setStatus(
          "Enter a syllabus topic."
        );

        return;
      }


      const plannedClasses =
        Math.max(
          1,
          Math.floor(
            Number(
              topicForm.planned_periods
            ) || 1
          )
        );


      const topicOrder =
        Math.max(
          1,
          Math.floor(
            Number(
              topicForm.topic_order
            ) || 1
          )
        );


      const client =
        getSupabaseClient();


      if (!client) {
        return;
      }


      setSaving(
        true
      );


      try {

        const {
          data: auth,
          error:
            authError,
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


        if (
          topicForm.id
        ) {

          const {
            error,
          } = await client
            .from(
              "faculty_syllabus_topics"
            )
            .update({
              unit_id:
                topicForm.unit_id,
              topic_order:
                topicOrder,
              topic_title:
                topicTitle,
              description:
                cleanText(
                  topicForm.description
                ),
              planned_periods:
                plannedClasses,
              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              topicForm.id
            );


          if (error) {
            throw error;
          }

        } else {

          const {
            error,
          } = await client
            .from(
              "faculty_syllabus_topics"
            )
            .insert({
              unit_id:
                topicForm.unit_id,
              batch_subject_id:
                selectedSubject.id,
              topic_order:
                topicOrder,
              topic_title:
                topicTitle,
              description:
                cleanText(
                  topicForm.description
                ),
              planned_periods:
                plannedClasses,
              created_by:
                auth.user.id,
            });


          if (error) {
            throw error;
          }
        }


        setTopicEditorOpen(
          false
        );


        setStatus(
          topicForm.id
            ? "Syllabus topic updated."
            : `Syllabus topic added with ${plannedClasses} planned class${plannedClasses === 1 ? "" : "es"}.`
        );


        await loadData(
          true
        );

      } catch (
        saveError
      ) {

        console.error(
          "Save syllabus topic:",
          saveError
        );


        setStatus(
          saveError instanceof Error
            ? saveError.message
            : "Unable to save syllabus topic."
        );

      } finally {

        setSaving(
          false
        );
      }
    };


  const deleteTopic =
    async (
      topic:
        SyllabusTopic
    ) => {

      const stats =
        topicStats(
          topic
        );


      if (
        !window.confirm(
          stats.taughtClasses
            ? `Delete "${topic.topic_title}"? It already has ${stats.taughtClasses} recorded teaching class${stats.taughtClasses === 1 ? "" : "es"}, and that syllabus progress will be removed.`
            : `Delete "${topic.topic_title}"?`
        )
      ) {
        return;
      }


      const client =
        getSupabaseClient();


      if (!client) {
        return;
      }


      setSaving(
        true
      );


      try {

        const {
          error,
        } = await client
          .from(
            "faculty_syllabus_topics"
          )
          .delete()
          .eq(
            "id",
            topic.id
          );


        if (error) {
          throw error;
        }


        setStatus(
          "Syllabus topic deleted."
        );


        await loadData(
          true
        );

      } catch (
        deleteError
      ) {

        setStatus(
          deleteError instanceof Error
            ? deleteError.message
            : "Unable to delete syllabus topic."
        );

      } finally {

        setSaving(
          false
        );
      }
    };


  if (
    loading
  ) {
    return (
      <section className="facultySyllabusShell">
        <div className="facultySyllabusLoading">
          Loading assigned syllabus…
        </div>
      </section>
    );
  }


  return (
    <section className="facultySyllabusShell">

      <header className="facultySyllabusHero">

        <div>

          <span>
            FACULTY ACADEMIC AUTOMATION
          </span>

          <h1>
            Syllabus Progress
          </h1>

          <p>
            Plan syllabus coverage once. Attendance and Faculty Diary automatically record how many classes were actually used for each topic.
          </p>

        </div>


        <div className="facultySyllabusHeroActions">

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={
              onOpenDiary
            }
          >
            Faculty Diary
          </button>

          <button
            type="button"
            className="primary"
            onClick={
              onOpenAttendance
            }
          >
            Take Attendance
          </button>

        </div>

      </header>


      {status && (
        <div className="facultySyllabusStatus">
          {status}
        </div>
      )}


      {!subjects.length ? (
        <section className="facultySyllabusEmpty">

          <strong>
            No assigned subjects
          </strong>

          <p>
            Syllabus Progress only shows subjects currently assigned to your Faculty account.
          </p>

        </section>
      ) : (
        <>

          <section className="facultySyllabusSubjectStrip">

            {subjects.map(
              item => {

                const batch =
                  batchMap.get(
                    item.batch_id
                  );


                const itemTopics =
                  topics.filter(
                    topic =>
                      topic.batch_subject_id ===
                      item.id
                  );


                const planned =
                  itemTopics.reduce(
                    (
                      total,
                      topic
                    ) =>
                      total +
                      Math.max(
                        1,
                        Number(
                          topic.planned_periods
                        ) || 1
                      ),
                    0
                  );


                const credited =
                  itemTopics.reduce(
                    (
                      total,
                      topic
                    ) =>
                      total +
                      Math.min(
                        coverageByTopic.get(
                          topic.id
                        )?.length || 0,
                        Math.max(
                          1,
                          Number(
                            topic.planned_periods
                          ) || 1
                        )
                      ),
                    0
                  );


                const percent =
                  planned
                    ? clampPercent(
                        (
                          credited /
                          planned
                        ) *
                          100
                      )
                    : 0;


                return (
                  <button
                    key={
                      item.id
                    }
                    type="button"
                    className={
                      selectedSubjectId ===
                      item.id
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSelectedSubjectId(
                        item.id
                      )
                    }
                  >

                    <div>

                      <span>
                        {
                          item.subject_code
                        }
                      </span>

                      <strong>
                        {
                          item.subject_name
                        }
                      </strong>

                      <small>
                        {batch
                          ? `${batch.batch_name} · Section ${batch.section}`
                          : "Assigned subject"}
                      </small>

                    </div>


                    <div className="facultySyllabusSubjectProgress">

                      <b>
                        {percent}%
                      </b>

                      <i>
                        <span
                          style={{
                            width:
                              `${percent}%`,
                          }}
                        />
                      </i>

                    </div>

                  </button>
                );
              }
            )}

          </section>


          {selectedSubject && (
            <>

              <section className="facultySyllabusOverview">

                <div>

                  <span>
                    {
                      selectedSubject
                        .subject_code
                    }
                  </span>

                  <h2>
                    {
                      selectedSubject
                        .subject_name
                    }
                  </h2>

                  <p>
                    {selectedBatch
                      ? `${selectedBatch.batch_name} · Section ${selectedBatch.section} · ${selectedBatch.department}`
                      : selectedSubject.subject_type}
                  </p>

                </div>


                <div className="facultySyllabusMetrics">

                  <article>
                    <span>
                      UNITS
                    </span>

                    <strong>
                      {
                        subjectUnits.length
                      }
                    </strong>
                  </article>

                  <article>
                    <span>
                      TOPICS
                    </span>

                    <strong>
                      {
                        subjectTopics.length
                      }
                    </strong>
                  </article>

                  <article>
                    <span>
                      CLASS COVERAGE
                    </span>

                    <strong>
                      {
                        subjectProgress
                          .credited
                      }
                      /
                      {
                        subjectProgress
                          .planned
                      }
                    </strong>
                  </article>

                  <article>
                    <span>
                      SYLLABUS
                    </span>

                    <strong>
                      {
                        subjectProgress
                          .percent
                      }%
                    </strong>
                  </article>

                </div>


                <div className="facultySyllabusOverallBar">

                  <span
                    style={{
                      width:
                        `${subjectProgress.percent}%`,
                    }}
                  />

                </div>

              </section>


              <FacultySyllabusSmartPlanner
                subject={
                  selectedSubject
                }
                batch={
                  selectedBatch
                }
                onStatus={
                  setStatus
                }
                onApplied={
                  async () => {
                    await loadData();
                  }
                }
              />


              <section className="facultySyllabusToolbar">

                <div>

                  <strong>
                    Syllabus structure
                  </strong>

                  <small>
                    One topic can span multiple teaching days. Set the expected number of classes for each topic.
                  </small>

                </div>


                <button
                  type="button"
                  onClick={
                    openNewUnit
                  }
                >
                  + Add Unit
                </button>

              </section>


              {unitEditorOpen && (
                <section className="facultySyllabusEditor">

                  <header>
                    <div>
                      <span>
                        SYLLABUS UNIT
                      </span>

                      <h3>
                        {unitForm.id
                          ? "Edit unit"
                          : "Add unit"}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setUnitEditorOpen(
                          false
                        )
                      }
                    >
                      ×
                    </button>
                  </header>


                  <div className="facultySyllabusEditorGrid">

                    <label>
                      <span>
                        UNIT NUMBER
                      </span>

                      <input
                        type="number"
                        min="1"
                        value={
                          unitForm.unit_number
                        }
                        onChange={
                          event =>
                            setUnitForm(
                              current => ({
                                ...current,
                                unit_number:
                                  Number(
                                    event.target.value
                                  ),
                              })
                            )
                        }
                      />
                    </label>


                    <label className="wide">
                      <span>
                        UNIT TITLE
                      </span>

                      <input
                        value={
                          unitForm.unit_title
                        }
                        onChange={
                          event =>
                            setUnitForm(
                              current => ({
                                ...current,
                                unit_title:
                                  event.target.value,
                              })
                            )
                        }
                        placeholder="Signals and Systems"
                      />
                    </label>


                    <label className="wide">
                      <span>
                        DESCRIPTION
                      </span>

                      <textarea
                        value={
                          unitForm.description
                        }
                        onChange={
                          event =>
                            setUnitForm(
                              current => ({
                                ...current,
                                description:
                                  event.target.value,
                              })
                            )
                        }
                        placeholder="Optional unit description"
                      />
                    </label>

                  </div>


                  <footer>

                    <button
                      type="button"
                      onClick={() =>
                        setUnitEditorOpen(
                          false
                        )
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="primary"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        void saveUnit()
                      }
                    >
                      {saving
                        ? "Saving…"
                        : unitForm.id
                        ? "Update Unit"
                        : "Create Unit"}
                    </button>

                  </footer>

                </section>
              )}


              {topicEditorOpen && (
                <section className="facultySyllabusEditor">

                  <header>
                    <div>
                      <span>
                        SYLLABUS TOPIC
                      </span>

                      <h3>
                        {topicForm.id
                          ? "Edit topic"
                          : "Add topic"}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setTopicEditorOpen(
                          false
                        )
                      }
                    >
                      ×
                    </button>
                  </header>


                  <div className="facultySyllabusEditorGrid">

                    <label>
                      <span>
                        UNIT
                      </span>

                      <select
                        value={
                          topicForm.unit_id
                        }
                        onChange={
                          event =>
                            setTopicForm(
                              current => ({
                                ...current,
                                unit_id:
                                  event.target.value,
                              })
                            )
                        }
                      >
                        {subjectUnits.map(
                          unit => (
                            <option
                              key={
                                unit.id
                              }
                              value={
                                unit.id
                              }
                            >
                              Unit {unit.unit_number} · {unit.unit_title}
                            </option>
                          )
                        )}
                      </select>
                    </label>


                    <label>
                      <span>
                        TOPIC ORDER
                      </span>

                      <input
                        type="number"
                        min="1"
                        value={
                          topicForm.topic_order
                        }
                        onChange={
                          event =>
                            setTopicForm(
                              current => ({
                                ...current,
                                topic_order:
                                  Number(
                                    event.target.value
                                  ),
                              })
                            )
                        }
                      />
                    </label>


                    <label className="wide">
                      <span>
                        TOPIC TITLE
                      </span>

                      <input
                        value={
                          topicForm.topic_title
                        }
                        onChange={
                          event =>
                            setTopicForm(
                              current => ({
                                ...current,
                                topic_title:
                                  event.target.value,
                              })
                            )
                        }
                        placeholder="Sampling Theorem"
                      />
                    </label>


                    <label>
                      <span>
                        PLANNED CLASSES
                      </span>

                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={
                          topicForm.planned_periods
                        }
                        onChange={
                          event =>
                            setTopicForm(
                              current => ({
                                ...current,
                                planned_periods:
                                  Number(
                                    event.target.value
                                  ),
                              })
                            )
                        }
                      />

                      <small>
                        Example: enter 3 when this topic normally takes three classes/days.
                      </small>
                    </label>


                    <label className="wide">
                      <span>
                        DESCRIPTION
                      </span>

                      <textarea
                        value={
                          topicForm.description
                        }
                        onChange={
                          event =>
                            setTopicForm(
                              current => ({
                                ...current,
                                description:
                                  event.target.value,
                              })
                            )
                        }
                        placeholder="Optional notes about what should be covered"
                      />
                    </label>

                  </div>


                  <footer>

                    <button
                      type="button"
                      onClick={() =>
                        setTopicEditorOpen(
                          false
                        )
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="primary"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        void saveTopic()
                      }
                    >
                      {saving
                        ? "Saving…"
                        : topicForm.id
                        ? "Update Topic"
                        : "Add Topic"}
                    </button>

                  </footer>

                </section>
              )}


              {!subjectUnits.length ? (
                <section className="facultySyllabusEmpty">

                  <strong>
                    No syllabus configured
                  </strong>

                  <p>
                    Create the first unit for {selectedSubject.subject_code}. No fake or default syllabus is added automatically.
                  </p>

                  <button
                    type="button"
                    onClick={
                      openNewUnit
                    }
                  >
                    + Create First Unit
                  </button>

                </section>
              ) : (
                <section className="facultySyllabusUnits">

                  {subjectUnits.map(
                    unit => {

                      const unitTopics =
                        subjectTopics
                          .filter(
                            topic =>
                              topic.unit_id ===
                              unit.id
                          )
                          .sort(
                            (
                              a,
                              b
                            ) =>
                              a.topic_order -
                              b.topic_order
                          );


                      const unitPlanned =
                        unitTopics.reduce(
                          (
                            total,
                            topic
                          ) =>
                            total +
                            Math.max(
                              1,
                              topic.planned_periods
                            ),
                          0
                        );


                      const unitCredited =
                        unitTopics.reduce(
                          (
                            total,
                            topic
                          ) =>
                            total +
                            Math.min(
                              coverageByTopic.get(
                                topic.id
                              )?.length || 0,
                              Math.max(
                                1,
                                topic.planned_periods
                              )
                            ),
                          0
                        );


                      const unitPercent =
                        unitPlanned
                          ? clampPercent(
                              (
                                unitCredited /
                                unitPlanned
                              ) *
                                100
                            )
                          : 0;


                      return (
                        <article
                          key={
                            unit.id
                          }
                          className="facultySyllabusUnitCard"
                        >

                          <header>

                            <div className="facultySyllabusUnitNumber">
                              {unit.unit_number}
                            </div>


                            <div className="facultySyllabusUnitTitle">

                              <span>
                                UNIT {unit.unit_number}
                              </span>

                              <h3>
                                {
                                  unit.unit_title
                                }
                              </h3>

                              {unit.description && (
                                <p>
                                  {
                                    unit.description
                                  }
                                </p>
                              )}

                            </div>


                            <div className="facultySyllabusUnitProgress">

                              <strong>
                                {unitPercent}%
                              </strong>

                              <small>
                                {unitCredited}/{unitPlanned} planned classes
                              </small>

                              <i>
                                <span
                                  style={{
                                    width:
                                      `${unitPercent}%`,
                                  }}
                                />
                              </i>

                            </div>


                            <div className="facultySyllabusUnitActions">

                              <button
                                type="button"
                                onClick={() =>
                                  openNewTopic(
                                    unit
                                  )
                                }
                              >
                                + Topic
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  editUnit(
                                    unit
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="danger"
                                onClick={() =>
                                  void deleteUnit(
                                    unit
                                  )
                                }
                              >
                                Delete
                              </button>

                            </div>

                          </header>


                          {!unitTopics.length ? (
                            <div className="facultySyllabusUnitEmpty">
                              No topics added to this unit yet.
                            </div>
                          ) : (
                            <div className="facultySyllabusTopicList">

                              {unitTopics.map(
                                topic => {

                                  const stats =
                                    topicStats(
                                      topic
                                    );


                                  return (
                                    <div
                                      key={
                                        topic.id
                                      }
                                      className={`facultySyllabusTopicRow ${
                                        stats.completed
                                          ? "completed"
                                          : stats.taughtClasses
                                          ? "inProgress"
                                          : ""
                                      }`}
                                    >

                                      <div className="facultySyllabusTopicState">

                                        <span>
                                          {stats.completed
                                            ? "✓"
                                            : stats.taughtClasses
                                            ? "◐"
                                            : "○"}
                                        </span>

                                      </div>


                                      <div className="facultySyllabusTopicInfo">

                                        <div>

                                          <span>
                                            TOPIC {topic.topic_order}
                                          </span>

                                          <strong>
                                            {
                                              topic.topic_title
                                            }
                                          </strong>

                                        </div>


                                        {topic.description && (
                                          <p>
                                            {
                                              topic.description
                                            }
                                          </p>
                                        )}


                                        <div className="facultySyllabusTopicBar">

                                          <i>
                                            <span
                                              style={{
                                                width:
                                                  `${stats.percent}%`,
                                              }}
                                            />
                                          </i>

                                          <b>
                                            {stats.percent}%
                                          </b>

                                        </div>

                                      </div>


                                      <div className="facultySyllabusTopicCoverage">

                                        <strong>
                                          {stats.creditedClasses}
                                          /
                                          {stats.plannedClasses}
                                        </strong>

                                        <span>
                                          planned classes
                                        </span>


                                        {stats.taughtClasses >
                                          stats.plannedClasses && (
                                          <small>
                                            {stats.taughtClasses} classes actually taught
                                          </small>
                                        )}


                                        {stats.lastTaught && (
                                          <small>
                                            Last taught: {formatDate(stats.lastTaught)}
                                          </small>
                                        )}

                                      </div>


                                      <div className="facultySyllabusTopicStatus">

                                        <span
                                          className={
                                            stats.completed
                                              ? "complete"
                                              : stats.taughtClasses
                                              ? "progress"
                                              : "pending"
                                          }
                                        >
                                          {stats.completed
                                            ? "Completed"
                                            : stats.taughtClasses
                                            ? "In Progress"
                                            : "Pending"}
                                        </span>

                                      </div>


                                      <div className="facultySyllabusTopicActions">

                                        {recommendedTopic?.id ===
                                          topic.id &&
                                          !stats.completed && (
                                          <button
                                            type="button"
                                            className="useAttendance"
                                            onClick={() =>
                                              useTopicInAttendance(
                                                topic
                                              )
                                            }
                                          >
                                            Use in Attendance
                                            <b>
                                              →
                                            </b>
                                          </button>
                                        )}


                                        <button
                                          type="button"
                                          onClick={() =>
                                            editTopic(
                                              topic
                                            )
                                          }
                                        >
                                          Edit
                                        </button>

                                        <button
                                          type="button"
                                          className="danger"
                                          onClick={() =>
                                            void deleteTopic(
                                              topic
                                            )
                                          }
                                        >
                                          Delete
                                        </button>

                                      </div>

                                    </div>
                                  );
                                }
                              )}

                            </div>
                          )}

                        </article>
                      );
                    }
                  )}

                </section>
              )}

            </>
          )}

        </>
      )}

    </section>
  );
}
