"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  getSupabaseClient,
} from "../lib/supabase";

import "./staff-operations-board.css";


type ProfessionalRole =
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";


type TaskStatus =
  | "Open"
  | "In Progress"
  | "Blocked"
  | "Completed"
  | "Cancelled";


type TaskPriority =
  | "Low"
  | "Normal"
  | "High"
  | "Critical";


type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: string | null;
  action_url: string | null;
  target_role: ProfessionalRole | null;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_campus_uid: string | null;
  created_by: string;
  creator_name: string;
  creator_role: ProfessionalRole;
  created_at: string;
  updated_at: string;
  completion_note: string | null;
};


type TaskActivity = {
  id: string;
  task_id: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: string;
  activity_type: string;
  message: string;
  evidence_url: string | null;
  created_at: string;
};


type Filter =
  | "Active"
  | "Mine"
  | "Overdue"
  | "Completed"
  | "All";


type Props = {
  role: ProfessionalRole;
  go: (view: any) => void;
};


const professionalRoles:
  ProfessionalRole[] = [
    "Faculty",
    "Placement Cell",
    "Coordinator",
    "Volunteer",
    "Main Admin",
  ];


const statuses:
  TaskStatus[] = [
    "Open",
    "In Progress",
    "Blocked",
    "Completed",
    "Cancelled",
  ];


const priorities:
  TaskPriority[] = [
    "Low",
    "Normal",
    "High",
    "Critical",
  ];


const categories = [
  "Operations",
  "Academic",
  "Placement",
  "Event",
  "Communication",
  "Administration",
  "Other",
];


const initialForm = {
  title: "",
  description: "",
  category: "Operations",
  priority:
    "Normal" as TaskPriority,
  dueAt: "",
  actionUrl: "",
  targetRole: "",
  assigneeUid: "",
};


function isClosed(
  task: Task
) {
  return (
    task.status ===
      "Completed" ||
    task.status ===
      "Cancelled"
  );
}


function isOverdue(
  task: Task
) {
  if (
    !task.due_at ||
    isClosed(task)
  ) {
    return false;
  }

  return (
    Date.parse(
      task.due_at
    ) < Date.now()
  );
}


function isUpcoming(
  task: Task
) {
  if (
    !task.due_at ||
    isClosed(task)
  ) {
    return false;
  }

  const value =
    Date.parse(
      task.due_at
    );

  return (
    value >= Date.now() &&
    value <=
      Date.now() +
      7 *
      24 *
      60 *
      60 *
      1000
  );
}


function formatDate(
  value: string | null
) {
  if (
    !value
  ) {
    return "No deadline";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Invalid date";
  }

  return new Intl
    .DateTimeFormat(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    )
    .format(date);
}


function priorityWeight(
  priority: TaskPriority
) {
  if (
    priority === "Critical"
  ) {
    return 0;
  }

  if (
    priority === "High"
  ) {
    return 1;
  }

  if (
    priority === "Normal"
  ) {
    return 2;
  }

  return 3;
}


export function StaffOperationsBoard({
  role,
  go,
}: Props) {

  const [
    tasks,
    setTasks,
  ] =
    useState<Task[]>([]);

  const [
    currentUserId,
    setCurrentUserId,
  ] =
    useState("");

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
    formOpen,
    setFormOpen,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    form,
    setForm,
  ] =
    useState(
      initialForm
    );

  const [
    filter,
    setFilter,
  ] =
    useState<Filter>(
      "Active"
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    status,
    setStatus,
  ] =
    useState("");

  const [
    expandedTaskId,
    setExpandedTaskId,
  ] =
    useState("");

  const [
    activities,
    setActivities,
  ] =
    useState<
      TaskActivity[]
    >([]);

  const [
    activityCounts,
    setActivityCounts,
  ] =
    useState<
      Record<string, number>
    >({});

  const [
    unreadCounts,
    setUnreadCounts,
  ] =
    useState<
      Record<string, number>
    >({});

  const [
    activityLoading,
    setActivityLoading,
  ] =
    useState(false);

  const [
    comment,
    setComment,
  ] =
    useState("");

  const [
    evidenceUrl,
    setEvidenceUrl,
  ] =
    useState("");

  const [
    postingComment,
    setPostingComment,
  ] =
    useState(false);

  const [
    pendingCompletion,
    setPendingCompletion,
  ] =
    useState<Task | null>(
      null
    );

  const [
    completionNote,
    setCompletionNote,
  ] =
    useState("");


  const load =
    useCallback(
      async (
        background = false
      ) => {
        const client =
          getSupabaseClient();

        if (
          !client
        ) {
          setStatus(
            "CampusConnect data connection is unavailable."
          );

          setLoading(false);
          setRefreshing(false);
          return;
        }

        if (
          background
        ) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const {
          data: auth,
        } =
          await client.auth
            .getUser();

        if (
          !auth.user
        ) {
          setStatus(
            "Sign in to load staff operations."
          );

          setLoading(false);
          setRefreshing(false);
          return;
        }

        setCurrentUserId(
          auth.user.id
        );

        const {
          data,
          error,
        } =
          await client
            .from(
              "campus_operational_tasks"
            )
            .select("*")
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(200);

        if (
          error
        ) {
          console.error(
            "[Staff Operations] load failed:",
            error
          );

          setStatus(
            error.message ||
            "Unable to load operational tasks."
          );

          setTasks([]);
        } else {
          setTasks(
            (
              data ||
              []
            ) as Task[]
          );

          const [
            activityResult,
            notificationResult,
          ] =
            await Promise.all([
              client
                .from(
                  "campus_operational_task_activity"
                )
                .select(
                  "task_id"
                )
                .limit(2000),

              client
                .from(
                  "campus_task_notifications"
                )
                .select(
                  "id,task_id"
                )
                .is(
                  "read_at",
                  null
                )
                .limit(1000),
            ]);

          const nextActivityCounts:
            Record<string, number> =
              {};

          for (
            const row of
            activityResult.data ||
            []
          ) {
            nextActivityCounts[
              row.task_id
            ] =
              (
                nextActivityCounts[
                  row.task_id
                ] ||
                0
              ) +
              1;
          }

          const nextUnreadCounts:
            Record<string, number> =
              {};

          for (
            const row of
            notificationResult.data ||
            []
          ) {
            nextUnreadCounts[
              row.task_id
            ] =
              (
                nextUnreadCounts[
                  row.task_id
                ] ||
                0
              ) +
              1;
          }

          setActivityCounts(
            nextActivityCounts
          );

          setUnreadCounts(
            nextUnreadCounts
          );

          setStatus("");
        }

        setLoading(false);
        setRefreshing(false);
      },
      []
    );


  useEffect(
    () => {
      void load();

      const client =
        getSupabaseClient();

      if (
        !client
      ) {
        return;
      }

      const channel =
        client
          .channel(
            `staff-operations-${role
              .toLowerCase()
              .replace(
                /\s+/g,
                "-"
              )}`
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table:
                "campus_operational_tasks",
            },
            () => {
              void load(true);
            }
          )
          .subscribe();

      const interval =
        window.setInterval(
          () => {
            if (
              document.visibilityState ===
              "visible"
            ) {
              void load(true);
            }
          },
          60_000
        );

      return () => {
        window.clearInterval(
          interval
        );

        void client
          .removeChannel(
            channel
          );
      };
    },
    [
      load,
      role,
    ]
  );


  useEffect(
    () => {
      const openFocusedTask =
        () => {
          const eventTaskId =
            window.sessionStorage
              .getItem(
                "campusconnect-focus-operational-task"
              );

          if (
            !eventTaskId
          ) {
            return;
          }

          window.sessionStorage
            .removeItem(
              "campusconnect-focus-operational-task"
            );

          setFilter(
            "All"
          );

          setSearch("");

          void loadTaskActivity(
            eventTaskId
          );

          window.setTimeout(
            () => {
              document
                .getElementById(
                  `campus-task-${eventTaskId}`
                )
                ?.scrollIntoView({
                  behavior:
                    window.matchMedia(
                      "(prefers-reduced-motion: reduce)"
                    ).matches
                      ? "auto"
                      : "smooth",
                  block:
                    "center",
                });
            },
            240
          );
        };

      const handleOpen =
        (
          event:
            Event
        ) => {
          const taskEvent =
            event as
              CustomEvent<string>;

          if (
            taskEvent.detail
          ) {
            window.sessionStorage
              .setItem(
                "campusconnect-focus-operational-task",
                taskEvent.detail
              );
          }

          openFocusedTask();
        };

      window.addEventListener(
        "campus-open-operational-task",
        handleOpen
      );

      openFocusedTask();

      return () => {
        window.removeEventListener(
          "campus-open-operational-task",
          handleOpen
        );
      };
    },
    []
  );


  const counts =
    useMemo(
      () => ({
        active:
          tasks.filter(
            task =>
              !isClosed(
                task
              )
          ).length,

        mine:
          tasks.filter(
            task =>
              task.assignee_id ===
              currentUserId
          ).length,

        overdue:
          tasks.filter(
            isOverdue
          ).length,

        completed:
          tasks.filter(
            task =>
              task.status ===
              "Completed"
          ).length,
      }),
      [
        tasks,
        currentUserId,
      ]
    );


  const visibleTasks =
    useMemo(
      () => {
        const normalized =
          search
            .trim()
            .toLowerCase();

        return tasks
          .filter(
            task => {
              if (
                filter ===
                "Active"
              ) {
                return !isClosed(
                  task
                );
              }

              if (
                filter ===
                "Mine"
              ) {
                return (
                  task.assignee_id ===
                  currentUserId
                );
              }

              if (
                filter ===
                "Overdue"
              ) {
                return isOverdue(
                  task
                );
              }

              if (
                filter ===
                "Completed"
              ) {
                return (
                  task.status ===
                  "Completed"
                );
              }

              return true;
            }
          )
          .filter(
            task => {
              if (
                !normalized
              ) {
                return true;
              }

              return [
                task.title,
                task.description,
                task.category,
                task.creator_name,
                task.assignee_name,
                task.assignee_campus_uid,
                task.target_role,
                task.status,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(
                  normalized
                );
            }
          )
          .sort(
            (a, b) => {
              const overdueDifference =
                Number(
                  isOverdue(b)
                ) -
                Number(
                  isOverdue(a)
                );

              if (
                overdueDifference
              ) {
                return overdueDifference;
              }

              const priorityDifference =
                priorityWeight(
                  a.priority
                ) -
                priorityWeight(
                  b.priority
                );

              if (
                priorityDifference
              ) {
                return priorityDifference;
              }

              const aDue =
                a.due_at
                  ? Date.parse(
                      a.due_at
                    )
                  : Number.MAX_SAFE_INTEGER;

              const bDue =
                b.due_at
                  ? Date.parse(
                      b.due_at
                    )
                  : Number.MAX_SAFE_INTEGER;

              return (
                aDue -
                bDue
              );
            }
          );
      },
      [
        tasks,
        filter,
        search,
        currentUserId,
      ]
    );


  async function createTask(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const client =
      getSupabaseClient();

    if (
      !client
    ) {
      setStatus(
        "CampusConnect data connection is unavailable."
      );
      return;
    }

    const title =
      form.title.trim();

    if (
      title.length < 3
    ) {
      setStatus(
        "Enter a clear task title."
      );
      return;
    }

    setSaving(true);
    setStatus("");

    let assigneeId:
      string | null =
        null;

    if (
      form.assigneeUid
        .trim()
    ) {
      const uid =
        form.assigneeUid
          .trim()
          .toUpperCase();

      const {
        data:
          assignee,
        error:
          assigneeError,
      } =
        await client
          .from(
            "profiles"
          )
          .select(
            "id,full_name,role,campus_uid"
          )
          .eq(
            "campus_uid",
            uid
          )
          .maybeSingle();

      if (
        assigneeError ||
        !assignee ||
        !professionalRoles
          .includes(
            assignee.role as
              ProfessionalRole
          )
      ) {
        setStatus(
          "No verified professional account matched that CampusConnect UID."
        );

        setSaving(false);
        return;
      }

      assigneeId =
        assignee.id;
    }

    let dueAt:
      string | null =
        null;

    if (
      form.dueAt
    ) {
      const date =
        new Date(
          form.dueAt
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        setStatus(
          "Enter a valid deadline."
        );

        setSaving(false);
        return;
      }

      dueAt =
        date.toISOString();
    }

    const {
      data,
      error,
    } =
      await client
        .from(
          "campus_operational_tasks"
        )
        .insert({
          title,
          description:
            form.description
              .trim(),
          category:
            form.category,
          priority:
            form.priority,
          due_at:
            dueAt,
          action_url:
            form.actionUrl
              .trim() ||
            null,
          target_role:
            form.targetRole ||
            null,
          assignee_id:
            assigneeId,
        })
        .select("*")
        .single();

    if (
      error
    ) {
      console.error(
        "[Staff Operations] create failed:",
        error
      );

      setStatus(
        error.message ||
        "Unable to create the task."
      );

      setSaving(false);
      return;
    }

    setTasks(
      current => [
        data as Task,
        ...current.filter(
          item =>
            item.id !==
            data.id
        ),
      ]
    );

    setForm(
      initialForm
    );

    setFormOpen(
      false
    );

    setSaving(
      false
    );

    setStatus(
      "Operational task created successfully."
    );
  }


  async function loadTaskActivity(
    taskId: string
  ) {
    const client =
      getSupabaseClient();

    if (
      !client
    ) {
      return;
    }

    setExpandedTaskId(
      taskId
    );

    setActivityLoading(
      true
    );

    setComment("");
    setEvidenceUrl("");

    const {
      data,
      error,
    } =
      await client
        .from(
          "campus_operational_task_activity"
        )
        .select("*")
        .eq(
          "task_id",
          taskId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(100);

    if (
      error
    ) {
      setStatus(
        error.message ||
        "Unable to load the task timeline."
      );

      setActivities([]);
    } else {
      setActivities(
        (
          data ||
          []
        ) as TaskActivity[]
      );

      await client
        .from(
          "campus_task_notifications"
        )
        .update({
          read_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "task_id",
          taskId
        )
        .is(
          "read_at",
          null
        );

      setUnreadCounts(
        current => ({
          ...current,
          [taskId]:
            0,
        })
      );
    }

    setActivityLoading(
      false
    );
  }


  async function postTaskComment(
    event:
      FormEvent<HTMLFormElement>,
    task: Task
  ) {
    event.preventDefault();

    const message =
      comment.trim();

    if (
      message.length < 2
    ) {
      setStatus(
        "Enter a meaningful progress note."
      );
      return;
    }

    const client =
      getSupabaseClient();

    if (
      !client
    ) {
      return;
    }

    setPostingComment(
      true
    );

    const {
      error,
    } =
      await client.rpc(
        "add_campus_task_comment",
        {
          p_task_id:
            task.id,
          p_message:
            message,
          p_evidence_url:
            evidenceUrl
              .trim() ||
            null,
        }
      );

    if (
      error
    ) {
      setStatus(
        error.message ||
        "Unable to add the task update."
      );

      setPostingComment(
        false
      );
      return;
    }

    setComment("");
    setEvidenceUrl("");
    setPostingComment(
      false
    );

    await loadTaskActivity(
      task.id
    );

    await load(true);
  }


  async function persistTaskStatus(
    task: Task,
    nextStatus: TaskStatus,
    note: string | null
  ) {
    if (
      task.status ===
      nextStatus
    ) {
      return true;
    }

    const client =
      getSupabaseClient();

    if (
      !client
    ) {
      return false;
    }

    const previousStatus =
      task.status;

    const previousNote =
      task.completion_note;

    const nextNote =
      nextStatus ===
        "Completed"
        ? note
        : null;

    setTasks(
      current =>
        current.map(
          item =>
            item.id ===
            task.id
              ? {
                  ...item,
                  status:
                    nextStatus,
                  completion_note:
                    nextNote,
                }
              : item
        )
    );

    const {
      error,
    } =
      await client
        .from(
          "campus_operational_tasks"
        )
        .update({
          status:
            nextStatus,
          completion_note:
            nextNote,
        })
        .eq(
          "id",
          task.id
        );

    if (
      error
    ) {
      console.error(
        "[Staff Operations] status update failed:",
        error
      );

      setTasks(
        current =>
          current.map(
            item =>
              item.id ===
              task.id
                ? {
                    ...item,
                    status:
                      previousStatus,
                    completion_note:
                      previousNote,
                  }
                : item
          )
      );

      setStatus(
        error.message ||
        "You do not have permission to update this task."
      );

      return false;
    }

    if (
      expandedTaskId ===
      task.id
    ) {
      await loadTaskActivity(
        task.id
      );
    }

    return true;
  }


  async function updateTaskStatus(
    task: Task,
    nextStatus: TaskStatus
  ) {
    if (
      task.status ===
      nextStatus
    ) {
      return;
    }

    if (
      nextStatus ===
        "Completed" &&
      task.priority ===
        "Critical" &&
      !task.completion_note
    ) {
      setPendingCompletion(
        task
      );

      setCompletionNote("");
      return;
    }

    await persistTaskStatus(
      task,
      nextStatus,
      nextStatus ===
        "Completed"
        ? task.completion_note
        : null
    );
  }


  async function claimTask(
    task: Task
  ) {
    const client =
      getSupabaseClient();

    if (
      !client ||
      !currentUserId
    ) {
      return;
    }

    const {
      error,
    } =
      await client
        .from(
          "campus_operational_tasks"
        )
        .update({
          assignee_id:
            currentUserId,
          status:
            task.status ===
              "Open"
              ? "In Progress"
              : task.status,
        })
        .eq(
          "id",
          task.id
        )
        .is(
          "assignee_id",
          null
        );

    if (
      error
    ) {
      setStatus(
        error.message ||
        "This task could not be claimed."
      );

      return;
    }

    await load(true);
  }


  async function removeTask(
    task: Task
  ) {
    if (
      !window.confirm(
        `Remove “${task.title}”?`
      )
    ) {
      return;
    }

    const client =
      getSupabaseClient();

    if (
      !client
    ) {
      return;
    }

    const {
      error,
    } =
      await client
        .from(
          "campus_operational_tasks"
        )
        .delete()
        .eq(
          "id",
          task.id
        );

    if (
      error
    ) {
      setStatus(
        error.message ||
        "You do not have permission to remove this task."
      );

      return;
    }

    setTasks(
      current =>
        current.filter(
          item =>
            item.id !==
            task.id
        )
    );
  }


  function askCampusAi(
    task: Task
  ) {
    window.sessionStorage
      .setItem(
        "campusconnect-ai-intent",
        JSON.stringify({
          mode:
            "general",
          prompt:
            `Act as my CampusConnect ${role} operations assistant. Review the authorized operational task titled “${task.title}” and any related CampusConnect records available to my account. Its recorded category is ${task.category}, priority is ${task.priority}, status is ${task.status}, and deadline is ${task.due_at ? formatDate(task.due_at) : "not provided"}. Explain what is supported by the records and give no more than three practical next actions. Do not invent people, deadlines, progress or outcomes.`,
          createdAt:
            Date.now(),
        })
      );

    go(
      "My Campus"
    );
  }


  return (
    <section
      className="staffOperationsBoard"
      id="staff-operations-board"
      aria-labelledby="staff-operations-title"
    >
      <header className="staffOperationsHeader">
        <div>
          <span>
            PROFESSIONAL WORKFLOW
          </span>

          <h3
            id="staff-operations-title"
          >
            Staff operations board
          </h3>

          <p>
            Assign, claim and complete
            operational work without mixing
            it with student coursework.
          </p>
        </div>

        <div className="staffOperationsHeaderActions">
          <button
            type="button"
            className="staffOperationsRefresh"
            onClick={() =>
              void load(true)
            }
            disabled={
              refreshing
            }
          >
            {refreshing
              ? "Refreshing…"
              : role === "Faculty" ? "↻ Refresh tasks" : "↻ Refresh"}
          </button>

          <button
            type="button"
            className="staffOperationsCreate"
            onClick={() =>
              setFormOpen(
                current =>
                  !current
              )
            }
            aria-expanded={
              formOpen
            }
          >
            {formOpen
              ? "Close"
              : "+ New task"}
          </button>
        </div>
      </header>

      <div className="staffOperationsMetrics">
        <button
          type="button"
          className={
            filter ===
            "Active"
              ? "active"
              : ""
          }
          onClick={() =>
            setFilter(
              "Active"
            )
          }
        >
          <strong>
            {counts.active}
          </strong>
          <span>
            ACTIVE
          </span>
        </button>

        <button
          type="button"
          className={
            filter ===
            "Mine"
              ? "active"
              : ""
          }
          onClick={() =>
            setFilter(
              "Mine"
            )
          }
        >
          <strong>
            {counts.mine}
          </strong>
          <span>
            ASSIGNED TO ME
          </span>
        </button>

        <button
          type="button"
          className={
            filter ===
            "Overdue"
              ? "active overdue"
              : "overdue"
          }
          onClick={() =>
            setFilter(
              "Overdue"
            )
          }
        >
          <strong>
            {counts.overdue}
          </strong>
          <span>
            OVERDUE
          </span>
        </button>

        <button
          type="button"
          className={
            filter ===
            "Completed"
              ? "active"
              : ""
          }
          onClick={() =>
            setFilter(
              "Completed"
            )
          }
        >
          <strong>
            {counts.completed}
          </strong>
          <span>
            COMPLETED
          </span>
        </button>
      </div>

      {formOpen && (
        <form
          className="staffOperationsForm"
          onSubmit={
            createTask
          }
        >
          <header>
            <div>
              <span>
                CREATE OPERATIONAL TASK
              </span>

              <h4>
                Define ownership and outcome
              </h4>
            </div>

            <small>
              Verified professional roles only
            </small>
          </header>

          <div className="staffOperationsFormGrid">
            <label className="staffOperationsWide">
              <span>
                Task title
              </span>

              <input
                value={
                  form.title
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        title:
                          event.target
                            .value,
                      })
                    )
                }
                maxLength={
                  160
                }
                placeholder="Example: Confirm auditorium setup"
                required
              />
            </label>

            <label className="staffOperationsWide">
              <span>
                Description
              </span>

              <textarea
                value={
                  form.description
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        description:
                          event.target
                            .value,
                      })
                    )
                }
                maxLength={
                  3000
                }
                rows={
                  3
                }
                placeholder="Add the expected outcome, context and required action."
              />
            </label>

            <label>
              <span>
                Category
              </span>

              <select
                value={
                  form.category
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        category:
                          event.target
                            .value,
                      })
                    )
                }
              >
                {categories.map(
                  category => (
                    <option
                      value={
                        category
                      }
                      key={
                        category
                      }
                    >
                      {category}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Priority
              </span>

              <select
                value={
                  form.priority
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        priority:
                          event.target
                            .value as
                            TaskPriority,
                      })
                    )
                }
              >
                {priorities.map(
                  priority => (
                    <option
                      value={
                        priority
                      }
                      key={
                        priority
                      }
                    >
                      {priority}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Deadline
              </span>

              <input
                type="datetime-local"
                value={
                  form.dueAt
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        dueAt:
                          event.target
                            .value,
                      })
                    )
                }
              />
            </label>

            <label>
              <span>
                Target role
              </span>

              <select
                value={
                  form.targetRole
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        targetRole:
                          event.target
                            .value,
                      })
                    )
                }
              >
                <option value="">
                  All professional roles
                </option>

                {professionalRoles.map(
                  item => (
                    <option
                      value={
                        item
                      }
                      key={
                        item
                      }
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Assignee Campus UID
              </span>

              <input
                value={
                  form.assigneeUid
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        assigneeUid:
                          event.target
                            .value
                            .toUpperCase(),
                      })
                    )
                }
                placeholder="Optional verified UID"
              />
            </label>

            <label className="staffOperationsWide">
              <span>
                Supporting link
              </span>

              <input
                type="url"
                value={
                  form.actionUrl
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        actionUrl:
                          event.target
                            .value,
                      })
                    )
                }
                placeholder="https://..."
              />
            </label>
          </div>

          <footer>
            <p>
              Leave the assignee blank to let
              an authorized member of the
              target role claim the task.
            </p>

            <div>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(
                    false
                  );

                  setForm(
                    initialForm
                  );
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  saving
                }
              >
                {saving
                  ? "Creating…"
                  : "Create task"}
              </button>
            </div>
          </footer>
        </form>
      )}

      <div className="staffOperationsToolbar">
        <div className="staffOperationsFilters">
          {(
            [
              "Active",
              "Mine",
              "Overdue",
              "Completed",
              "All",
            ] as Filter[]
          ).map(
            item => (
              <button
                type="button"
                className={
                  filter ===
                  item
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(
                    item
                  )
                }
                key={
                  item
                }
              >
                {item}
                {role === "Faculty" && item !== "All" && (
                  <span className="staffFilterCount">
                    {counts[item === "Active" ? "active" : item === "Mine" ? "mine" : item === "Overdue" ? "overdue" : "completed"]}
                  </span>
                )}
              </button>
            )
          )}
        </div>

        <label>
          <span
            aria-hidden="true"
          >
            ⌕
          </span>

          <input
            value={
              search
            }
            onChange={
              event =>
                setSearch(
                  event.target
                    .value
                )
            }
            placeholder="Search tasks"
            aria-label="Search operational tasks"
          />
        </label>
      </div>

      {status && (
        <p
          className="staffOperationsStatus"
          role="status"
        >
          {status}
        </p>
      )}

      {loading ? (
        <div className="staffOperationsLoading">
          <span />
          <span />
          <span />
        </div>
      ) : visibleTasks.length ? (
        <div className="staffOperationsGrid">
          {visibleTasks.map(
            task => {
              const overdue =
                isOverdue(
                  task
                );

              const upcoming =
                isUpcoming(
                  task
                );

              const canRemove =
                task.created_by ===
                  currentUserId ||
                role ===
                  "Main Admin";

              return (
                <article
                  id={`campus-task-${task.id}`}
                  className={
                    `staffOperationCard priority-${task.priority
                      .toLowerCase()} ${
                      overdue
                        ? "overdue"
                        : ""
                    }`
                  }
                  key={
                    task.id
                  }
                >
                  <header>
                    <span>
                      {task.category}
                    </span>

                    <em>
                      {task.priority}
                    </em>
                  </header>

                  <h4>
                    {task.title}
                  </h4>

                  {task.description && (
                    <p>
                      {task.description}
                    </p>
                  )}

                  <div className="staffOperationOwnership">
                    <span>
                      <small>
                        OWNER
                      </small>

                      <strong>
                        {task.assignee_name ||
                          task.target_role ||
                          "Any professional"}
                      </strong>
                    </span>

                    <span>
                      <small>
                        CREATED BY
                      </small>

                      <strong>
                        {task.creator_name}
                      </strong>
                    </span>
                  </div>

                  <div
                    className={
                      overdue
                        ? "staffOperationDue overdue"
                        : upcoming
                        ? "staffOperationDue upcoming"
                        : "staffOperationDue"
                    }
                  >
                    <i
                      aria-hidden="true"
                    >
                      ◷
                    </i>

                    <span>
                      <small>
                        {overdue
                          ? "OVERDUE"
                          : upcoming
                          ? "DUE THIS WEEK"
                          : "DEADLINE"}
                      </small>

                      <strong>
                        {formatDate(
                          task.due_at
                        )}
                      </strong>
                    </span>
                  </div>

                  <div className="staffOperationControls">
                    <label>
                      <span>
                        Status
                      </span>

                      <select
                        value={
                          task.status
                        }
                        onChange={
                          event =>
                            void updateTaskStatus(
                              task,
                              event.target
                                .value as
                                TaskStatus
                            )
                        }
                      >
                        {statuses.map(
                          item => (
                            <option
                              value={
                                item
                              }
                              key={
                                item
                              }
                            >
                              {item}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    {!task.assignee_id &&
                      !isClosed(
                        task
                      ) && (
                      <button
                        type="button"
                        className="staffOperationClaim"
                        onClick={() =>
                          void claimTask(
                            task
                          )
                        }
                      >
                        Claim task
                      </button>
                    )}
                  </div>

                  <footer>
                    {task.action_url && (
                      <a
                        href={
                          task.action_url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open link ↗
                      </a>
                    )}

                    <button
                      type="button"
                      className="staffOperationTimelineButton"
                      onClick={() => {
                        if (
                          expandedTaskId ===
                          task.id
                        ) {
                          setExpandedTaskId("");
                          setActivities([]);
                        } else {
                          void loadTaskActivity(
                            task.id
                          );
                        }
                      }}
                    >
                      Timeline
                      <span>
                        {activityCounts[
                          task.id
                        ] || 0}
                      </span>

                      {Boolean(
                        unreadCounts[
                          task.id
                        ]
                      ) && (
                        <em>
                          {unreadCounts[
                            task.id
                          ]}
                        </em>
                      )}
                    </button>

                    <button
                      type="button"
                      className="staffOperationAi"
                      onClick={() =>
                        askCampusAi(
                          task
                        )
                      }
                    >
                      ✦ Ask AI
                    </button>

                    {canRemove && (
                      <button
                        type="button"
                        className="staffOperationDelete"
                        onClick={() =>
                          void removeTask(
                            task
                          )
                        }
                        aria-label={
                          `Remove ${task.title}`
                        }
                        title="Remove task"
                      >
                        ×
                      </button>
                    )}
                  </footer>

                  {expandedTaskId ===
                    task.id && (
                    <section className="staffTaskTimeline">
                      <header>
                        <div>
                          <span>
                            IMMUTABLE ACTIVITY
                          </span>

                          <strong>
                            Task timeline
                          </strong>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void loadTaskActivity(
                              task.id
                            )
                          }
                        >
                          ↻
                        </button>
                      </header>

                      {activityLoading ? (
                        <div className="staffTaskTimelineLoading">
                          Loading verified activity…
                        </div>
                      ) : activities.length ? (
                        <div className="staffTaskTimelineList">
                          {activities.map(
                            activity => (
                              <article
                                key={
                                  activity.id
                                }
                              >
                                <i>
                                  {activity.activity_type ===
                                  "Comment"
                                    ? "C"
                                    : activity.activity_type ===
                                      "Evidence"
                                    ? "E"
                                    : activity.activity_type ===
                                      "Status Changed"
                                    ? "S"
                                    : "•"}
                                </i>

                                <div>
                                  <header>
                                    <strong>
                                      {activity.actor_name}
                                    </strong>

                                    <span>
                                      {activity.actor_role}
                                    </span>
                                  </header>

                                  <p>
                                    {activity.message}
                                  </p>

                                  {activity.evidence_url && (
                                    <a
                                      href={
                                        activity.evidence_url
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      View evidence ↗
                                    </a>
                                  )}

                                  <small>
                                    {formatDate(
                                      activity.created_at
                                    )}
                                    {" · "}
                                    {activity.activity_type}
                                  </small>
                                </div>
                              </article>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="staffTaskTimelineEmpty">
                          No activity has been recorded yet.
                        </p>
                      )}

                      <form
                        className="staffTaskCommentForm"
                        onSubmit={
                          event =>
                            void postTaskComment(
                              event,
                              task
                            )
                        }
                      >
                        <label>
                          <span>
                            Progress note
                          </span>

                          <textarea
                            value={
                              comment
                            }
                            onChange={
                              event =>
                                setComment(
                                  event.target
                                    .value
                                )
                            }
                            rows={
                              2
                            }
                            maxLength={
                              2000
                            }
                            placeholder="Add a factual progress update…"
                            required
                          />
                        </label>

                        <label>
                          <span>
                            Evidence link
                          </span>

                          <input
                            type="url"
                            value={
                              evidenceUrl
                            }
                            onChange={
                              event =>
                                setEvidenceUrl(
                                  event.target
                                    .value
                                )
                            }
                            placeholder="https://…"
                          />
                        </label>

                        <button
                          type="submit"
                          disabled={
                            postingComment
                          }
                        >
                          {postingComment
                            ? "Posting…"
                            : "Post update"}
                        </button>
                      </form>
                    </section>
                  )}
                </article>
              );
            }
          )}
        </div>
      ) : (
        <div className="staffOperationsEmpty">
          <span>
            ✓
          </span>

          <div>
            <strong>
              No matching operational tasks
            </strong>

            <p>
              Create a task or select another
              filter to review professional work.
            </p>
          </div>
        </div>
      )}

      {pendingCompletion && (
        <div className="staffCompletionLayer">
          <button
            type="button"
            className="staffCompletionBackdrop"
            onClick={() => {
              setPendingCompletion(
                null
              );

              setCompletionNote("");
            }}
            aria-label="Close completion dialog"
          />

          <form
            className="staffCompletionDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="critical-completion-title"
            onSubmit={async event => {
              event.preventDefault();

              const note =
                completionNote
                  .trim();

              if (
                note.length < 10
              ) {
                setStatus(
                  "Critical tasks require a completion note of at least 10 characters."
                );
                return;
              }

              const completed =
                await persistTaskStatus(
                  pendingCompletion,
                  "Completed",
                  note
                );

              if (
                completed
              ) {
                setPendingCompletion(
                  null
                );

                setCompletionNote("");
              }
            }}
          >
            <span>
              CRITICAL TASK VERIFICATION
            </span>

            <h4
              id="critical-completion-title"
            >
              Confirm completed work
            </h4>

            <p>
              Explain what was completed.
              This note becomes part of the
              task&apos;s immutable audit
              timeline.
            </p>

            <textarea
              value={
                completionNote
              }
              onChange={
                event =>
                  setCompletionNote(
                    event.target
                      .value
                  )
              }
              rows={
                4
              }
              maxLength={
                2000
              }
              placeholder="Describe the verified outcome…"
              autoFocus
              required
            />

            <footer>
              <button
                type="button"
                onClick={() => {
                  setPendingCompletion(
                    null
                  );

                  setCompletionNote("");
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
              >
                Confirm completion
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
