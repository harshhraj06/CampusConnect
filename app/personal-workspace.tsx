"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {getSupabaseClient} from "../lib/supabase";

type WorkspaceTab =
  | "All"
  | "Notes"
  | "Important"
  | "Reminders"
  | "Completed";

type PersonalNote = {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  category: string;
  color_key: string;
  tags: string[];
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

type PersonalTask = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "To Do" | "In Progress" | "Completed" | "Archived";
  due_at: string | null;
  is_important: boolean;
  is_pinned: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type PersonalSubtask = {
  id: string;
  task_id: string;
  owner_id: string;
  title: string;
  is_completed: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

type PersonalReminder = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  remind_at: string;
  repeat_rule: "None" | "Daily" | "Weekly" | "Monthly";
  status: "Pending" | "Completed" | "Dismissed";
  is_important: boolean;
  completed_at: string | null;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
};

type ComposerMode =
  | "note"
  | "task"
  | "reminder"
  | null;

const noteCategories = [
  "General",
  "Academic",
  "Placement",
  "Project",
  "Personal",
  "Idea",
];

const taskCategories = [
  "General",
  "Academic",
  "Placement",
  "Project",
  "Personal",
];

const noteColors = [
  "Cream",
  "Blue",
  "Sage",
  "Gold",
  "Terracotta",
  "Lavender",
  "Burgundy",
];

function formatWorkspaceDate(value: string | null) {
  if (!value) return "No deadline";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No deadline";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function toLocalInputValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset =
    date.getTimezoneOffset() * 60 * 1000;

  return new Date(
    date.getTime() - offset
  )
    .toISOString()
    .slice(0, 16);
}

function isOverdue(value: string | null) {
  if (!value) return false;

  const date = new Date(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() < Date.now()
  );
}

export default function PersonalWorkspace() {
  const [tab, setTab] =
    useState<WorkspaceTab>("All");

  const [notes, setNotes] =
    useState<PersonalNote[]>([]);

  const [tasks, setTasks] =
    useState<PersonalTask[]>([]);

  const [reminders, setReminders] =
    useState<PersonalReminder[]>([]);

  const [subtasks, setSubtasks] =
    useState<PersonalSubtask[]>([]);

  const [newSubtask, setNewSubtask] =
    useState("");

  const [query, setQuery] = useState("");
  const [loading, setLoading] =
    useState(true);

  const [status, setStatus] =
    useState("");

  const [busyId, setBusyId] =
    useState("");

  const [composer, setComposer] =
    useState<ComposerMode>(null);

  const [editingNote, setEditingNote] =
    useState<PersonalNote | null>(null);

  const [editingTask, setEditingTask] =
    useState<PersonalTask | null>(null);

  const [
    editingReminder,
    setEditingReminder,
  ] = useState<PersonalReminder | null>(
    null
  );

  const [noteForm, setNoteForm] =
    useState({
      title: "",
      body: "",
      category: "General",
      color_key: "Cream",
      tags: "",
      is_pinned: false,
    });

  const [taskForm, setTaskForm] =
    useState({
      title: "",
      description: "",
      category: "General",
      priority: "Medium" as
        PersonalTask["priority"],
      status: "To Do" as
        PersonalTask["status"],
      due_at: "",
      is_important: true,
      is_pinned: false,
    });

  const [reminderForm, setReminderForm] =
    useState({
      title: "",
      description: "",
      remind_at: "",
      repeat_rule: "None" as
        PersonalReminder["repeat_rule"],
      is_important: false,
    });

  const loadWorkspace = useCallback(
    async () => {
      const client = getSupabaseClient();

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
        noteResult,
        taskResult,
        reminderResult,
        subtaskResult,
      ] = await Promise.all([
        client
          .from("personal_notes")
          .select("*")
          .order("is_pinned", {
            ascending: false,
          })
          .order("updated_at", {
            ascending: false,
          }),

        client
          .from("personal_tasks")
          .select("*")
          .order("is_pinned", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          }),

        client
          .from("personal_reminders")
          .select("*")
          .order("remind_at", {
            ascending: true,
          }),

        client
          .from("personal_task_subtasks")
          .select("*")
          .order("display_order", {
            ascending: true,
          })
          .order("created_at", {
            ascending: true,
          }),
      ]);

      const error =
        noteResult.error ||
        taskResult.error ||
        reminderResult.error ||
        subtaskResult.error;

      if (error) {
        setStatus(error.message);
        setLoading(false);
        return;
      }

      setNotes(
        (noteResult.data ||
          []) as PersonalNote[]
      );

      setTasks(
        (taskResult.data ||
          []) as PersonalTask[]
      );

      setReminders(
        (reminderResult.data ||
          []) as PersonalReminder[]
      );

      setSubtasks(
        (subtaskResult.data ||
          []) as PersonalSubtask[]
      );

      setLoading(false);
    },
    []
  );

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  function resetNoteForm() {
    setEditingNote(null);
    setNoteForm({
      title: "",
      body: "",
      category: "General",
      color_key: "Cream",
      tags: "",
      is_pinned: false,
    });
  }

  function resetTaskForm() {
    setEditingTask(null);
    setTaskForm({
      title: "",
      description: "",
      category: "General",
      priority: "Medium",
      status: "To Do",
      due_at: "",
      is_important: true,
      is_pinned: false,
    });
  }

  function resetReminderForm() {
    setEditingReminder(null);
    setReminderForm({
      title: "",
      description: "",
      remind_at: "",
      repeat_rule: "None",
      is_important: false,
    });
  }

  function closeComposer() {
    setComposer(null);
    resetNoteForm();
    resetTaskForm();
    resetReminderForm();
  }

  async function saveNote(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const client = getSupabaseClient();

    if (!client) return;

    if (
      !noteForm.title.trim() &&
      !noteForm.body.trim()
    ) {
      setStatus(
        "Add a title or some note content."
      );
      return;
    }

    const {data: auth} =
      await client.auth.getUser();

    if (!auth.user) {
      setStatus(
        "Your session has expired."
      );
      return;
    }

    setBusyId("note-save");

    const payload = {
      title: noteForm.title.trim(),
      body: noteForm.body.trim(),
      category: noteForm.category,
      color_key: noteForm.color_key,
      tags: noteForm.tags
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean)
        .slice(0, 12),
      is_pinned: noteForm.is_pinned,
    };

    const result = editingNote
      ? await client
          .from("personal_notes")
          .update(payload)
          .eq("id", editingNote.id)
      : await client
          .from("personal_notes")
          .insert({
            ...payload,
            owner_id: auth.user.id,
          });

    setBusyId("");

    if (result.error) {
      setStatus(result.error.message);
      return;
    }

    setStatus(
      editingNote
        ? "Note updated."
        : "Note saved."
    );

    closeComposer();
    await loadWorkspace();
  }

  async function saveTask(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const client = getSupabaseClient();

    if (!client) return;

    if (!taskForm.title.trim()) {
      setStatus(
        "Enter a title for this task."
      );
      return;
    }

    const {data: auth} =
      await client.auth.getUser();

    if (!auth.user) {
      setStatus(
        "Your session has expired."
      );
      return;
    }

    setBusyId("task-save");

    const completed =
      taskForm.status === "Completed";

    const payload = {
      title: taskForm.title.trim(),
      description:
        taskForm.description.trim(),
      category: taskForm.category,
      priority: taskForm.priority,
      status: taskForm.status,
      due_at: taskForm.due_at
        ? new Date(
            taskForm.due_at
          ).toISOString()
        : null,
      is_important:
        taskForm.is_important,
      is_pinned:
        taskForm.is_pinned,
      completed_at: completed
        ? new Date().toISOString()
        : null,
    };

    const result = editingTask
      ? await client
          .from("personal_tasks")
          .update(payload)
          .eq("id", editingTask.id)
      : await client
          .from("personal_tasks")
          .insert({
            ...payload,
            owner_id: auth.user.id,
          });

    setBusyId("");

    if (result.error) {
      setStatus(result.error.message);
      return;
    }

    setStatus(
      editingTask
        ? "Task updated."
        : "Important work added."
    );

    closeComposer();
    await loadWorkspace();
  }

  async function saveReminder(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const client = getSupabaseClient();

    if (!client) return;

    if (
      !reminderForm.title.trim() ||
      !reminderForm.remind_at
    ) {
      setStatus(
        "Enter a reminder title and time."
      );
      return;
    }

    const remindAt =
      new Date(
        reminderForm.remind_at
      );

    if (
      Number.isNaN(
        remindAt.getTime()
      )
    ) {
      setStatus(
        "Choose a valid reminder time."
      );
      return;
    }

    const {data: auth} =
      await client.auth.getUser();

    if (!auth.user) {
      setStatus(
        "Your session has expired."
      );
      return;
    }

    setBusyId("reminder-save");

    const payload = {
      title:
        reminderForm.title.trim(),
      description:
        reminderForm.description.trim(),
      remind_at:
        remindAt.toISOString(),
      repeat_rule:
        reminderForm.repeat_rule,
      is_important:
        reminderForm.is_important,
    };

    const result = editingReminder
      ? await client
          .from("personal_reminders")
          .update(payload)
          .eq(
            "id",
            editingReminder.id
          )
      : await client
          .from("personal_reminders")
          .insert({
            ...payload,
            owner_id: auth.user.id,
            status: "Pending",
          });

    setBusyId("");

    if (result.error) {
      setStatus(result.error.message);
      return;
    }

    setStatus(
      editingReminder
        ? "Reminder updated."
        : "Reminder created."
    );

    closeComposer();
    await loadWorkspace();
  }

  function editNote(
    note: PersonalNote
  ) {
    setEditingNote(note);

    setNoteForm({
      title: note.title,
      body: note.body,
      category: note.category,
      color_key: note.color_key,
      tags: note.tags.join(", "),
      is_pinned: note.is_pinned,
    });

    setComposer("note");
  }

  function editTask(
    task: PersonalTask
  ) {
    setNewSubtask("");
    setEditingTask(task);

    setTaskForm({
      title: task.title,
      description:
        task.description,
      category: task.category,
      priority: task.priority,
      status: task.status,
      due_at:
        toLocalInputValue(
          task.due_at
        ),
      is_important:
        task.is_important,
      is_pinned:
        task.is_pinned,
    });

    setComposer("task");
  }

  function editReminder(
    reminder: PersonalReminder
  ) {
    setEditingReminder(reminder);

    setReminderForm({
      title: reminder.title,
      description:
        reminder.description,
      remind_at:
        toLocalInputValue(
          reminder.remind_at
        ),
      repeat_rule:
        reminder.repeat_rule,
      is_important:
        reminder.is_important,
    });

    setComposer("reminder");
  }

  async function deleteRow(
    table:
      | "personal_notes"
      | "personal_tasks"
      | "personal_reminders",
    id: string
  ) {
    if (
      !window.confirm(
        "Delete this item permanently?"
      )
    ) {
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) return;

    setBusyId(id);

    const {error} =
      await client
        .from(table)
        .delete()
        .eq("id", id);

    setBusyId("");

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Item deleted.");
    await loadWorkspace();
  }

  async function toggleNotePin(
    note: PersonalNote
  ) {
    const client =
      getSupabaseClient();

    if (!client) return;

    setBusyId(note.id);

    const {error} =
      await client
        .from("personal_notes")
        .update({
          is_pinned:
            !note.is_pinned,
        })
        .eq("id", note.id);

    setBusyId("");

    if (error) {
      setStatus(error.message);
      return;
    }

    await loadWorkspace();
  }

  function subtasksForTask(
    taskId: string
  ) {
    return subtasks.filter(
      item => item.task_id === taskId
    );
  }

  async function addSubtask() {
    if (
      !editingTask ||
      !newSubtask.trim()
    ) {
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) return;

    const {data: auth} =
      await client.auth.getUser();

    if (!auth.user) {
      setStatus(
        "Your session has expired."
      );
      return;
    }

    const existing =
      subtasksForTask(
        editingTask.id
      );

    setBusyId("subtask-add");

    const {error} =
      await client
        .from(
          "personal_task_subtasks"
        )
        .insert({
          task_id:
            editingTask.id,
          owner_id:
            auth.user.id,
          title:
            newSubtask.trim(),
          display_order:
            existing.length,
        });

    setBusyId("");

    if (error) {
      setStatus(error.message);
      return;
    }

    setNewSubtask("");
    await loadWorkspace();
  }

  async function toggleSubtask(
    subtask: PersonalSubtask
  ) {
    const client =
      getSupabaseClient();

    if (!client) return;

    setBusyId(subtask.id);

    const {error} =
      await client
        .from(
          "personal_task_subtasks"
        )
        .update({
          is_completed:
            !subtask.is_completed,
        })
        .eq(
          "id",
          subtask.id
        );

    setBusyId("");

    if (error) {
      setStatus(error.message);
      return;
    }

    await loadWorkspace();
  }

  async function deleteSubtask(
    subtask: PersonalSubtask
  ) {
    const client =
      getSupabaseClient();

    if (!client) return;

    setBusyId(subtask.id);

    const {error} =
      await client
        .from(
          "personal_task_subtasks"
        )
        .delete()
        .eq(
          "id",
          subtask.id
        );

    setBusyId("");

    if (error) {
      setStatus(error.message);
      return;
    }

    await loadWorkspace();
  }

  async function completeTask(
    task: PersonalTask
  ) {
    const client =
      getSupabaseClient();

    if (!client) return;

    const completed =
      task.status !== "Completed";

    setBusyId(task.id);

    const {error} =
      await client
        .from("personal_tasks")
        .update({
          status: completed
            ? "Completed"
            : "To Do",
          completed_at: completed
            ? new Date().toISOString()
            : null,
        })
        .eq("id", task.id);

    setBusyId("");

    if (error) {
      setStatus(error.message);
      return;
    }

    await loadWorkspace();
  }

  async function completeReminder(
    reminder: PersonalReminder
  ) {
    const client =
      getSupabaseClient();

    if (!client) return;

    const completed =
      reminder.status !==
      "Completed";

    setBusyId(reminder.id);

    const {error} =
      await client
        .from("personal_reminders")
        .update({
          status: completed
            ? "Completed"
            : "Pending",
          completed_at: completed
            ? new Date().toISOString()
            : null,
        })
        .eq("id", reminder.id);

    setBusyId("");

    if (error) {
      setStatus(error.message);
      return;
    }

    await loadWorkspace();
  }

  const normalizedQuery =
    query.trim().toLowerCase();

  const visibleNotes = useMemo(
    () =>
      notes.filter(note => {
        if (note.is_archived) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [
          note.title,
          note.body,
          note.category,
          ...note.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      }),
    [notes, normalizedQuery]
  );

  const visibleTasks = useMemo(
    () =>
      tasks.filter(task => {
        if (
          task.status ===
          "Archived"
        ) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [
          task.title,
          task.description,
          task.category,
          task.priority,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      }),
    [tasks, normalizedQuery]
  );

  const visibleReminders =
    useMemo(
      () =>
        reminders.filter(
          reminder => {
            if (!normalizedQuery) {
              return true;
            }

            return [
              reminder.title,
              reminder.description,
              reminder.repeat_rule,
            ]
              .join(" ")
              .toLowerCase()
              .includes(
                normalizedQuery
              );
          }
        ),
      [
        reminders,
        normalizedQuery,
      ]
    );

  const activeTasks =
    visibleTasks.filter(
      task =>
        task.status !==
        "Completed"
    );

  const activeReminders =
    visibleReminders.filter(
      reminder =>
        reminder.status ===
        "Pending"
    );

  const completedCount =
    tasks.filter(
      task =>
        task.status ===
        "Completed"
    ).length +
    reminders.filter(
      reminder =>
        reminder.status ===
        "Completed"
    ).length;

  const overdueCount =
    tasks.filter(
      task =>
        task.status !==
          "Completed" &&
        isOverdue(task.due_at)
    ).length +
    reminders.filter(
      reminder =>
        reminder.status ===
          "Pending" &&
        isOverdue(
          reminder.remind_at
        )
    ).length;

  const todayStart =
    new Date();

  todayStart.setHours(
    0,
    0,
    0,
    0
  );

  const todayEnd =
    new Date(todayStart);

  todayEnd.setDate(
    todayEnd.getDate() + 1
  );

  const dueToday =
    tasks.filter(task => {
      if (
        !task.due_at ||
        task.status ===
          "Completed"
      ) {
        return false;
      }

      const date =
        new Date(task.due_at);

      return (
        date >= todayStart &&
        date < todayEnd
      );
    }).length +
    reminders.filter(
      reminder => {
        if (
          reminder.status !==
          "Pending"
        ) {
          return false;
        }

        const date =
          new Date(
            reminder.remind_at
          );

        return (
          date >= todayStart &&
          date < todayEnd
        );
      }
    ).length;

  return (
    <section className="personalWorkspace">

      <section className="personalWorkspaceHero">

        <div>
          <span>
            PERSONAL PRODUCTIVITY
          </span>

          <h2>
            Notes & Tasks
          </h2>

          <p>
            Capture ideas, remember important work
            and keep your personal campus life organized.
          </p>
        </div>

        <div className="personalWorkspaceHeroActions">

          <button
            type="button"
            onClick={() => {
              resetNoteForm();
              setComposer("note");
            }}
          >
            + New note
          </button>

          <button
            type="button"
            onClick={() => {
              resetReminderForm();
              setComposer(
                "reminder"
              );
            }}
          >
            + Reminder
          </button>

          <button
            type="button"
            className="primary"
            onClick={() => {
              resetTaskForm();
              setComposer("task");
            }}
          >
            + Important work
          </button>

        </div>

      </section>


      <section className="personalWorkspaceStats">

        <article>
          <span>TODAY</span>
          <strong>
            {dueToday}
          </strong>
          <small>
            items due today
          </small>
        </article>

        <article>
          <span>IMPORTANT</span>
          <strong>
            {
              tasks.filter(
                task =>
                  task.is_important &&
                  task.status !==
                    "Completed"
              ).length
            }
          </strong>
          <small>
            active priorities
          </small>
        </article>

        <article className={
          overdueCount
            ? "warning"
            : ""
        }>
          <span>OVERDUE</span>
          <strong>
            {overdueCount}
          </strong>
          <small>
            need attention
          </small>
        </article>

        <article>
          <span>COMPLETED</span>
          <strong>
            {completedCount}
          </strong>
          <small>
            finished items
          </small>
        </article>

      </section>


      <section className="personalWorkspaceToolbar">

        <div className="personalWorkspaceTabs">

          {(
            [
              "All",
              "Notes",
              "Important",
              "Reminders",
              "Completed",
            ] as WorkspaceTab[]
          ).map(item => (
            <button
              type="button"
              key={item}
              className={
                tab === item
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTab(item)
              }
            >
              {item}
            </button>
          ))}

        </div>

        <div className="personalWorkspaceSearch">

          <span>⌕</span>

          <input
            value={query}
            onChange={event =>
              setQuery(
                event.target.value
              )
            }
            placeholder="Search your notes and work..."
          />

          {query && (
            <button
              type="button"
              onClick={() =>
                setQuery("")
              }
            >
              ×
            </button>
          )}

        </div>

      </section>


      {status && (
        <div className="personalWorkspaceStatus">
          {status}
        </div>
      )}


      {loading ? (
        <div className="personalWorkspaceEmpty">
          Loading your workspace...
        </div>
      ) : (
        <div className="personalWorkspaceContent">

          {(tab === "All" ||
            tab === "Important") &&
            activeTasks.length >
              0 && (
              <section className="workspaceSection">

                <header>
                  <div>
                    <span>
                      PRIORITIES
                    </span>

                    <h3>
                      Important work
                    </h3>
                  </div>

                  <strong>
                    {
                      activeTasks.length
                    }
                  </strong>
                </header>

                <div className="workspaceTaskGrid">

                  {activeTasks.map(
                    task => (
                      <article
                        key={task.id}
                        className={`workspaceTaskCard priority-${task.priority.toLowerCase()} ${
                          isOverdue(
                            task.due_at
                          )
                            ? "overdue"
                            : ""
                        }`}
                      >

                        <div className="workspaceTaskTop">

                          <span>
                            {task.priority}
                          </span>

                          {task.is_important && (
                            <b>
                              Important
                            </b>
                          )}

                        </div>

                        <h4>
                          {task.title}
                        </h4>

                        {task.description && (
                          <p>
                            {
                              task.description
                            }
                          </p>
                        )}

                        {subtasksForTask(
                          task.id
                        ).length > 0 && (
                          <div className="workspaceChecklistProgress">

                            <div>
                              <span>
                                Checklist
                              </span>

                              <b>
                                {
                                  subtasksForTask(
                                    task.id
                                  ).filter(
                                    item =>
                                      item.is_completed
                                  ).length
                                }
                                /
                                {
                                  subtasksForTask(
                                    task.id
                                  ).length
                                }
                              </b>
                            </div>

                            <div className="workspaceChecklistBar">
                              <i
                                style={{
                                  width: `${
                                    (
                                      subtasksForTask(
                                        task.id
                                      ).filter(
                                        item =>
                                          item.is_completed
                                      ).length /
                                      subtasksForTask(
                                        task.id
                                      ).length
                                    ) * 100
                                  }%`,
                                }}
                              />
                            </div>

                          </div>
                        )}

                        <div className="workspaceTaskMeta">

                          <span>
                            {
                              task.category
                            }
                          </span>

                          <span>
                            {
                              isOverdue(
                                task.due_at
                              )
                                ? "Overdue · "
                                : ""
                            }
                            {
                              formatWorkspaceDate(
                                task.due_at
                              )
                            }
                          </span>

                        </div>

                        <footer>

                          <button
                            type="button"
                            disabled={
                              busyId ===
                              task.id
                            }
                            onClick={() =>
                              void completeTask(
                                task
                              )
                            }
                          >
                            Complete
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              editTask(task)
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="danger"
                            onClick={() =>
                              void deleteRow(
                                "personal_tasks",
                                task.id
                              )
                            }
                          >
                            Delete
                          </button>

                        </footer>

                      </article>
                    )
                  )}

                </div>

              </section>
            )}


          {(tab === "All" ||
            tab === "Notes") &&
            visibleNotes.length >
              0 && (
              <section className="workspaceSection">

                <header>
                  <div>
                    <span>
                      CAPTURE
                    </span>

                    <h3>
                      Your notes
                    </h3>
                  </div>

                  <strong>
                    {
                      visibleNotes.length
                    }
                  </strong>
                </header>

                <div className="workspaceNoteGrid">

                  {visibleNotes.map(
                    note => (
                      <article
                        key={note.id}
                        className={`workspaceNoteCard color-${note.color_key.toLowerCase()}`}
                      >

                        <div className="workspaceNoteTop">

                          <span>
                            {
                              note.category
                            }
                          </span>

                          {note.is_pinned && (
                            <b>
                              Pinned
                            </b>
                          )}

                        </div>

                        <h4>
                          {
                            note.title ||
                            "Untitled note"
                          }
                        </h4>

                        <p>
                          {note.body}
                        </p>

                        {note.tags.length >
                          0 && (
                          <div className="workspaceTags">

                            {note.tags.map(
                              tag => (
                                <span
                                  key={
                                    tag
                                  }
                                >
                                  #{tag}
                                </span>
                              )
                            )}

                          </div>
                        )}

                        <footer>

                          <button
                            type="button"
                            onClick={() =>
                              void toggleNotePin(
                                note
                              )
                            }
                          >
                            {
                              note.is_pinned
                                ? "Unpin"
                                : "Pin"
                            }
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              editNote(note)
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="danger"
                            onClick={() =>
                              void deleteRow(
                                "personal_notes",
                                note.id
                              )
                            }
                          >
                            Delete
                          </button>

                        </footer>

                      </article>
                    )
                  )}

                </div>

              </section>
            )}


          {(tab === "All" ||
            tab === "Reminders") &&
            activeReminders.length >
              0 && (
              <section className="workspaceSection">

                <header>
                  <div>
                    <span>
                      REMEMBER
                    </span>

                    <h3>
                      Upcoming reminders
                    </h3>
                  </div>

                  <strong>
                    {
                      activeReminders.length
                    }
                  </strong>
                </header>

                <div className="workspaceReminderList">

                  {activeReminders.map(
                    reminder => (
                      <article
                        key={
                          reminder.id
                        }
                        className={
                          isOverdue(
                            reminder.remind_at
                          )
                            ? "overdue"
                            : ""
                        }
                      >

                        <div className="workspaceReminderTime">
                          <span>
                            {
                              isOverdue(
                                reminder.remind_at
                              )
                                ? "OVERDUE"
                                : "REMIND"
                            }
                          </span>

                          <strong>
                            {
                              formatWorkspaceDate(
                                reminder.remind_at
                              )
                            }
                          </strong>
                        </div>

                        <div className="workspaceReminderCopy">

                          <h4>
                            {
                              reminder.title
                            }
                          </h4>

                          {reminder.description && (
                            <p>
                              {
                                reminder.description
                              }
                            </p>
                          )}

                          <small>
                            Repeat:{" "}
                            {
                              reminder.repeat_rule
                            }
                          </small>

                        </div>

                        <div className="workspaceReminderActions">

                          <button
                            type="button"
                            onClick={() =>
                              void completeReminder(
                                reminder
                              )
                            }
                          >
                            Done
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              editReminder(
                                reminder
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="danger"
                            onClick={() =>
                              void deleteRow(
                                "personal_reminders",
                                reminder.id
                              )
                            }
                          >
                            Delete
                          </button>

                        </div>

                      </article>
                    )
                  )}

                </div>

              </section>
            )}


          {tab === "Completed" && (
            <section className="workspaceSection">

              <header>
                <div>
                  <span>
                    FINISHED
                  </span>

                  <h3>
                    Completed work
                  </h3>
                </div>

                <strong>
                  {completedCount}
                </strong>
              </header>

              <div className="workspaceCompletedList">

                {tasks
                  .filter(
                    task =>
                      task.status ===
                      "Completed"
                  )
                  .map(task => (
                    <article
                      key={task.id}
                    >
                      <span>
                        ✓
                      </span>

                      <div>
                        <b>
                          {task.title}
                        </b>

                        <small>
                          {
                            task.category
                          }
                        </small>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void completeTask(
                            task
                          )
                        }
                      >
                        Reopen
                      </button>
                    </article>
                  ))}

                {reminders
                  .filter(
                    reminder =>
                      reminder.status ===
                      "Completed"
                  )
                  .map(reminder => (
                    <article
                      key={
                        reminder.id
                      }
                    >
                      <span>
                        ✓
                      </span>

                      <div>
                        <b>
                          {
                            reminder.title
                          }
                        </b>

                        <small>
                          Reminder
                        </small>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void completeReminder(
                            reminder
                          )
                        }
                      >
                        Reopen
                      </button>
                    </article>
                  ))}

                {!completedCount && (
                  <div className="personalWorkspaceEmpty">
                    Completed items will appear here.
                  </div>
                )}

              </div>

            </section>
          )}


          {tab !== "Completed" &&
            !visibleNotes.length &&
            !activeTasks.length &&
            !activeReminders.length && (
              <div className="personalWorkspaceEmpty">

                <span>
                  ✦
                </span>

                <h3>
                  Your workspace is ready
                </h3>

                <p>
                  Add a note, reminder or important task
                  to start organizing your day.
                </p>

              </div>
            )}

        </div>
      )}


      {composer && (
        <div
          className="personalWorkspaceModalBackdrop"
          onClick={closeComposer}
        >
          <section
            className="personalWorkspaceModal"
            role="dialog"
            aria-modal="true"
            onClick={event =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              className="personalWorkspaceModalClose"
              onClick={
                closeComposer
              }
            >
              ×
            </button>

            {composer === "note" && (
              <form
                onSubmit={
                  saveNote
                }
              >

                <header>
                  <span>
                    PERSONAL NOTE
                  </span>

                  <h3>
                    {
                      editingNote
                        ? "Edit note"
                        : "New note"
                    }
                  </h3>
                </header>

                <label>
                  Title
                  <input
                    value={
                      noteForm.title
                    }
                    onChange={event =>
                      setNoteForm({
                        ...noteForm,
                        title:
                          event.target
                            .value,
                      })
                    }
                    placeholder="What do you want to remember?"
                  />
                </label>

                <label>
                  Note
                  <textarea
                    value={
                      noteForm.body
                    }
                    onChange={event =>
                      setNoteForm({
                        ...noteForm,
                        body:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Write anything..."
                  />
                </label>

                <div className="personalWorkspaceFormGrid">

                  <label>
                    Category
                    <select
                      value={
                        noteForm.category
                      }
                      onChange={event =>
                        setNoteForm({
                          ...noteForm,
                          category:
                            event
                              .target
                              .value,
                        })
                      }
                    >
                      {noteCategories.map(
                        category => (
                          <option
                            key={
                              category
                            }
                          >
                            {
                              category
                            }
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    Card color
                    <select
                      value={
                        noteForm.color_key
                      }
                      onChange={event =>
                        setNoteForm({
                          ...noteForm,
                          color_key:
                            event
                              .target
                              .value,
                        })
                      }
                    >
                      {noteColors.map(
                        color => (
                          <option
                            key={
                              color
                            }
                          >
                            {color}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                </div>

                <label>
                  Tags
                  <input
                    value={
                      noteForm.tags
                    }
                    onChange={event =>
                      setNoteForm({
                        ...noteForm,
                        tags:
                          event.target
                            .value,
                      })
                    }
                    placeholder="ECE, VLSI, viva"
                  />
                </label>

                <label className="personalWorkspaceCheck">
                  <input
                    type="checkbox"
                    checked={
                      noteForm.is_pinned
                    }
                    onChange={event =>
                      setNoteForm({
                        ...noteForm,
                        is_pinned:
                          event.target
                            .checked,
                      })
                    }
                  />
                  Pin this note
                </label>

                <footer>
                  <button
                    type="button"
                    onClick={
                      closeComposer
                    }
                  >
                    Cancel
                  </button>

                  <button
                    className="primary"
                    disabled={
                      busyId ===
                      "note-save"
                    }
                  >
                    {
                      busyId ===
                      "note-save"
                        ? "Saving..."
                        : "Save note"
                    }
                  </button>
                </footer>

              </form>
            )}


            {composer === "task" && (
              <form
                onSubmit={
                  saveTask
                }
              >

                <header>
                  <span>
                    IMPORTANT WORK
                  </span>

                  <h3>
                    {
                      editingTask
                        ? "Edit work"
                        : "Add important work"
                    }
                  </h3>
                </header>

                <label>
                  Title
                  <input
                    required
                    value={
                      taskForm.title
                    }
                    onChange={event =>
                      setTaskForm({
                        ...taskForm,
                        title:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Finish DSP presentation"
                  />
                </label>

                <label>
                  Details
                  <textarea
                    value={
                      taskForm.description
                    }
                    onChange={event =>
                      setTaskForm({
                        ...taskForm,
                        description:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Add any useful details..."
                  />
                </label>

                <div className="personalWorkspaceFormGrid">

                  <label>
                    Category
                    <select
                      value={
                        taskForm.category
                      }
                      onChange={event =>
                        setTaskForm({
                          ...taskForm,
                          category:
                            event
                              .target
                              .value,
                        })
                      }
                    >
                      {taskCategories.map(
                        category => (
                          <option
                            key={
                              category
                            }
                          >
                            {
                              category
                            }
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    Priority
                    <select
                      value={
                        taskForm.priority
                      }
                      onChange={event =>
                        setTaskForm({
                          ...taskForm,
                          priority:
                            event.target
                              .value as PersonalTask["priority"],
                        })
                      }
                    >
                      <option>
                        Low
                      </option>
                      <option>
                        Medium
                      </option>
                      <option>
                        High
                      </option>
                      <option>
                        Urgent
                      </option>
                    </select>
                  </label>

                  <label>
                    Due date
                    <input
                      type="datetime-local"
                      value={
                        taskForm.due_at
                      }
                      onChange={event =>
                        setTaskForm({
                          ...taskForm,
                          due_at:
                            event.target
                              .value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Status
                    <select
                      value={
                        taskForm.status
                      }
                      onChange={event =>
                        setTaskForm({
                          ...taskForm,
                          status:
                            event.target
                              .value as PersonalTask["status"],
                        })
                      }
                    >
                      <option>
                        To Do
                      </option>
                      <option>
                        In Progress
                      </option>
                      <option>
                        Completed
                      </option>
                    </select>
                  </label>

                </div>

                {editingTask && (
                  <section className="personalTaskChecklistEditor">

                    <div className="personalTaskChecklistHeading">
                      <div>
                        <span>
                          CHECKLIST
                        </span>

                        <strong>
                          Break this work into smaller steps
                        </strong>
                      </div>

                      <b>
                        {
                          subtasksForTask(
                            editingTask.id
                          ).filter(
                            item =>
                              item.is_completed
                          ).length
                        }
                        /
                        {
                          subtasksForTask(
                            editingTask.id
                          ).length
                        }
                      </b>
                    </div>

                    <div className="personalTaskChecklistAdd">

                      <input
                        value={
                          newSubtask
                        }
                        onChange={event =>
                          setNewSubtask(
                            event.target.value
                          )
                        }
                        onKeyDown={event => {
                          if (
                            event.key ===
                            "Enter"
                          ) {
                            event.preventDefault();
                            void addSubtask();
                          }
                        }}
                        placeholder="Add checklist item..."
                      />

                      <button
                        type="button"
                        disabled={
                          !newSubtask.trim() ||
                          busyId ===
                            "subtask-add"
                        }
                        onClick={() =>
                          void addSubtask()
                        }
                      >
                        Add
                      </button>

                    </div>

                    <div className="personalTaskChecklistItems">

                      {subtasksForTask(
                        editingTask.id
                      ).map(
                        subtask => (
                          <div
                            key={
                              subtask.id
                            }
                            className={
                              subtask.is_completed
                                ? "completed"
                                : ""
                            }
                          >

                            <button
                              type="button"
                              className="check"
                              disabled={
                                busyId ===
                                subtask.id
                              }
                              onClick={() =>
                                void toggleSubtask(
                                  subtask
                                )
                              }
                            >
                              {
                                subtask.is_completed
                                  ? "✓"
                                  : ""
                              }
                            </button>

                            <span>
                              {
                                subtask.title
                              }
                            </span>

                            <button
                              type="button"
                              className="remove"
                              disabled={
                                busyId ===
                                subtask.id
                              }
                              onClick={() =>
                                void deleteSubtask(
                                  subtask
                                )
                              }
                            >
                              ×
                            </button>

                          </div>
                        )
                      )}

                      {!subtasksForTask(
                        editingTask.id
                      ).length && (
                        <small>
                          No checklist items yet.
                        </small>
                      )}

                    </div>

                  </section>
                )}

                {!editingTask && (
                  <div className="personalTaskChecklistHint">
                    Save this work first, then open Edit to add checklist items.
                  </div>
                )}

                <label className="personalWorkspaceCheck">
                  <input
                    type="checkbox"
                    checked={
                      taskForm.is_important
                    }
                    onChange={event =>
                      setTaskForm({
                        ...taskForm,
                        is_important:
                          event.target
                            .checked,
                      })
                    }
                  />
                  Mark as important
                </label>

                <footer>
                  <button
                    type="button"
                    onClick={
                      closeComposer
                    }
                  >
                    Cancel
                  </button>

                  <button
                    className="primary"
                    disabled={
                      busyId ===
                      "task-save"
                    }
                  >
                    {
                      busyId ===
                      "task-save"
                        ? "Saving..."
                        : "Save work"
                    }
                  </button>
                </footer>

              </form>
            )}


            {composer ===
              "reminder" && (
              <form
                onSubmit={
                  saveReminder
                }
              >

                <header>
                  <span>
                    REMINDER
                  </span>

                  <h3>
                    {
                      editingReminder
                        ? "Edit reminder"
                        : "Create reminder"
                    }
                  </h3>
                </header>

                <label>
                  Reminder
                  <input
                    required
                    value={
                      reminderForm.title
                    }
                    onChange={event =>
                      setReminderForm({
                        ...reminderForm,
                        title:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Submit project report"
                  />
                </label>

                <label>
                  Details
                  <textarea
                    value={
                      reminderForm.description
                    }
                    onChange={event =>
                      setReminderForm({
                        ...reminderForm,
                        description:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Optional details..."
                  />
                </label>

                <div className="personalWorkspaceFormGrid">

                  <label>
                    Remind me at
                    <input
                      required
                      type="datetime-local"
                      value={
                        reminderForm.remind_at
                      }
                      onChange={event =>
                        setReminderForm({
                          ...reminderForm,
                          remind_at:
                            event.target
                              .value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Repeat
                    <select
                      value={
                        reminderForm.repeat_rule
                      }
                      onChange={event =>
                        setReminderForm({
                          ...reminderForm,
                          repeat_rule:
                            event.target
                              .value as PersonalReminder["repeat_rule"],
                        })
                      }
                    >
                      <option>
                        None
                      </option>
                      <option>
                        Daily
                      </option>
                      <option>
                        Weekly
                      </option>
                      <option>
                        Monthly
                      </option>
                    </select>
                  </label>

                </div>

                <label className="personalWorkspaceCheck">
                  <input
                    type="checkbox"
                    checked={
                      reminderForm.is_important
                    }
                    onChange={event =>
                      setReminderForm({
                        ...reminderForm,
                        is_important:
                          event.target
                            .checked,
                      })
                    }
                  />
                  Important reminder
                </label>

                <footer>
                  <button
                    type="button"
                    onClick={
                      closeComposer
                    }
                  >
                    Cancel
                  </button>

                  <button
                    className="primary"
                    disabled={
                      busyId ===
                      "reminder-save"
                    }
                  >
                    {
                      busyId ===
                      "reminder-save"
                        ? "Saving..."
                        : "Save reminder"
                    }
                  </button>
                </footer>

              </form>
            )}

          </section>
        </div>
      )}

    </section>
  );
}
