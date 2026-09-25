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

import "./role-action-center.css";


type ProfessionalRole =
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";


type DataRow =
  Record<string, unknown>;


type Severity =
  | "Information"
  | "Attention"
  | "Urgent";


type SourceDefinition = {
  key: string;
  table: string;
  label: string;
  description: string;
  target: string;
  icon: string;
  countOnly?: boolean;
};


type ActionItem = {
  key: string;
  sourceKey: string;
  label: string;
  title: string;
  description: string;
  target: string;
  icon: string;
  severity: Severity;
  recordCount: number;
  overdueCount: number;
  upcomingCount: number;
  sourceTable: string;
};


type ActionState = {
  readAt: string | null;
  dismissedAt: string | null;
};


type Props = {
  role: ProfessionalRole;
  go: (view: any) => void;
};


const roleSources:
  Record<
    ProfessionalRole,
    SourceDefinition[]
  > = {

  Faculty: [
    {
      key: "coursework",
      table: "assignments",
      label: "COURSEWORK",
      description:
        "Review assignments, deadlines and active coursework.",
      target: "Assignments",
      icon: "A",
    },
    {
      key: "attendance",
      table: "attendance_sessions",
      label: "ATTENDANCE",
      description:
        "Review class sessions and attendance workflows.",
      target: "Attendance",
      icon: "%",
    },
    {
      key: "learning",
      table: "learning_resources",
      label: "LEARNING",
      description:
        "Review published academic resources.",
      target: "Learning",
      icon: "L",
    },
    {
      key: "communication",
      table: "announcements",
      label: "COMMUNICATION",
      description:
        "Review current institutional announcements.",
      target: "Announcements",
      icon: "N",
    },
  ],

  "Placement Cell": [
    {
      key: "drives",
      table: "placement_drives",
      label: "RECRUITMENT DRIVES",
      description:
        "Review visible recruitment drives and deadlines.",
      target: "Placements",
      icon: "D",
    },
    {
      key: "applications",
      table: "placement_applications",
      label: "APPLICATION PIPELINE",
      description:
        "Review active student application records.",
      target: "Applications",
      icon: "A",
    },
    {
      key: "interviews",
      table: "placement_interviews",
      label: "INTERVIEWS",
      description:
        "Review interview schedules and pending outcomes.",
      target: "Applications",
      icon: "I",
    },
    {
      key: "offers",
      table: "placement_offers",
      label: "OFFERS",
      description:
        "Review recorded placement offers.",
      target: "Applications",
      icon: "O",
    },
  ],

  Coordinator: [
    {
      key: "events",
      table: "campus_events",
      label: "CAMPUS EVENTS",
      description:
        "Review upcoming events and coordination deadlines.",
      target: "Campus",
      icon: "E",
    },
    {
      key: "announcements",
      table: "announcements",
      label: "ANNOUNCEMENTS",
      description:
        "Review active campus communication.",
      target: "Announcements",
      icon: "N",
    },
    {
      key: "groups",
      table: "community_groups",
      label: "COMMUNITIES",
      description:
        "Review campus groups and community activity.",
      target: "Groups",
      icon: "G",
    },
    {
      key: "clubs",
      table: "campus_clubs",
      label: "CLUB OPERATIONS",
      description:
        "Review active club records and activities.",
      target: "Activity Center",
      icon: "C",
    },
  ],

  Volunteer: [
    {
      key: "events",
      table: "campus_events",
      label: "EVENT SUPPORT",
      description:
        "Review published events and dated responsibilities.",
      target: "Campus",
      icon: "E",
    },
    {
      key: "notices",
      table: "announcements",
      label: "CAMPUS NOTICES",
      description:
        "Review current campus instructions and updates.",
      target: "Announcements",
      icon: "N",
    },
    {
      key: "groups",
      table: "community_groups",
      label: "COMMUNITIES",
      description:
        "Review visible campus communities.",
      target: "Groups",
      icon: "G",
    },
    {
      key: "activities",
      table: "campus_sports",
      label: "ACTIVITIES",
      description:
        "Review current sports and activity records.",
      target: "Activity Center",
      icon: "S",
    },
  ],

  "Main Admin": [
    {
      key: "accounts",
      table: "profiles",
      label: "PLATFORM ACCESS",
      description:
        "Review verified platform account operations.",
      target: "Admin",
      icon: "U",
      countOnly: true,
    },
    {
      key: "announcements",
      table: "announcements",
      label: "COMMUNICATION",
      description:
        "Review institution-wide announcements.",
      target: "Announcements",
      icon: "N",
    },
    {
      key: "events",
      table: "campus_events",
      label: "CAMPUS OPERATIONS",
      description:
        "Review campus events and dated operations.",
      target: "Campus",
      icon: "E",
    },
    {
      key: "resources",
      table: "learning_resources",
      label: "ACADEMIC CONTENT",
      description:
        "Review published learning-resource activity.",
      target: "Learning",
      icon: "L",
    },
  ],
};


const dateFields = [
  "deadline",
  "due_date",
  "event_date",
  "start_date",
  "starts_at",
  "scheduled_at",
  "interview_at",
  "published_at",
];


const terminalStatuses = new Set([
  "completed",
  "closed",
  "cancelled",
  "canceled",
  "archived",
  "rejected",
  "withdrawn",
  "expired",
]);


function rowStatus(
  row: DataRow
) {
  return String(
    row.status ??
    row.state ??
    ""
  )
    .trim()
    .toLowerCase();
}


function rowDate(
  row: DataRow
) {
  for (
    const field of
    dateFields
  ) {
    const raw =
      row[field];

    if (
      typeof raw !==
        "string" ||
      !raw.trim()
    ) {
      continue;
    }

    const value =
      Date.parse(raw);

    if (
      Number.isFinite(value)
    ) {
      return value;
    }
  }

  return null;
}


function todayKey() {
  return new Intl
    .DateTimeFormat(
      "en-CA",
      {
        timeZone:
          Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    )
    .format(new Date());
}


function formatCurrentDate() {
  return new Intl
    .DateTimeFormat(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
      }
    )
    .format(new Date());
}


function buildAction(
  role: ProfessionalRole,
  definition: SourceDefinition,
  rows: DataRow[],
  exactCount: number
): ActionItem | null {

  const recordCount =
    Math.max(
      exactCount,
      rows.length
    );

  if (
    recordCount <= 0
  ) {
    return null;
  }

  const now =
    Date.now();

  const weekAhead =
    now +
    7 *
    24 *
    60 *
    60 *
    1000;

  let overdueCount = 0;
  let upcomingCount = 0;

  for (
    const row of
    rows
  ) {
    const status =
      rowStatus(row);

    if (
      terminalStatuses.has(
        status
      )
    ) {
      continue;
    }

    const date =
      rowDate(row);

    if (
      date === null
    ) {
      continue;
    }

    if (
      date < now
    ) {
      overdueCount += 1;
    } else if (
      date <= weekAhead
    ) {
      upcomingCount += 1;
    }
  }

  const severity:
    Severity =
      overdueCount > 0
        ? "Urgent"
        : upcomingCount > 0
        ? "Attention"
        : "Information";

  const title =
    overdueCount > 0
      ? `${overdueCount} dated ${
          overdueCount === 1
            ? "item needs"
            : "items need"
        } review`
      : upcomingCount > 0
      ? `${upcomingCount} upcoming ${
          upcomingCount === 1
            ? "item"
            : "items"
        } this week`
      : `${recordCount} authorized ${
          recordCount === 1
            ? "record"
            : "records"
        } available`;

  const detail =
    overdueCount > 0
      ? `${definition.description} CampusConnect found ${overdueCount} non-closed dated ${
          overdueCount === 1
            ? "record"
            : "records"
        } whose recorded date has passed.`
      : upcomingCount > 0
      ? `${definition.description} ${upcomingCount} non-closed dated ${
          upcomingCount === 1
            ? "record falls"
            : "records fall"
        } within the next seven days.`
      : `${definition.description} No dated urgency was inferred from the currently visible records.`;

  return {
    key:
      [
        todayKey(),
        role,
        definition.key,
      ].join(":"),
    sourceKey:
      definition.key,
    label:
      definition.label,
    title,
    description:
      detail,
    target:
      definition.target,
    icon:
      definition.icon,
    severity,
    recordCount,
    overdueCount,
    upcomingCount,
    sourceTable:
      definition.table,
  };
}


function severityWeight(
  severity: Severity
) {
  if (
    severity === "Urgent"
  ) {
    return 0;
  }

  if (
    severity === "Attention"
  ) {
    return 1;
  }

  return 2;
}


export function RoleActionCenter({
  role,
  go,
}: Props) {
  const [selectedAiSource, setSelectedAiSource] = useState("");

  const [
    items,
    setItems,
  ] =
    useState<ActionItem[]>([]);

  const [
    states,
    setStates,
  ] =
    useState<
      Record<
        string,
        ActionState
      >
    >({});

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
    status,
    setStatus,
  ] =
    useState("");

  const [
    lastUpdated,
    setLastUpdated,
  ] =
    useState<Date | null>(
      null
    );


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
            "Sign in to load your authorized action center."
          );

          setLoading(false);
          setRefreshing(false);
          return;
        }

        const definitions = [
          {
            key: "staff-operations",
            table: "campus_operational_tasks",
            label: "STAFF OPERATIONS",
            description:
              "Review assigned, unclaimed and dated professional tasks.",
            target: "Dashboard",
            icon: "T",
          },
          ...roleSources[role],
        ];

        const results =
          await Promise.all(
            definitions.map(
              async definition => {

                if (
                  definition.countOnly
                ) {
                  const response =
                    await client
                      .from(
                        definition.table
                      )
                      .select(
                        "id",
                        {
                          count:
                            "exact",
                          head:
                            true,
                        }
                      );

                  return {
                    definition,
                    rows:
                      [] as DataRow[],
                    count:
                      response.count ||
                      0,
                    error:
                      response.error,
                  };
                }

                const response =
                  await client
                    .from(
                      definition.table
                    )
                    .select(
                      "*",
                      {
                        count:
                          "exact",
                      }
                    )
                    .limit(120);

                return {
                  definition,
                  rows:
                    (
                      response.data ||
                      []
                    ) as DataRow[],
                  count:
                    response.count ||
                    0,
                  error:
                    response.error,
                };
              }
            )
          );

        const available =
          results.filter(
            result =>
              !result.error
          );

        const nextItems =
          available
            .map(result =>
              buildAction(
                role,
                result.definition,
                result.rows,
                result.count
              )
            )
            .filter(
              (
                item
              ): item is ActionItem =>
                Boolean(item)
            )
            .sort(
              (a, b) =>
                severityWeight(
                  a.severity
                ) -
                  severityWeight(
                    b.severity
                  ) ||
                b.upcomingCount -
                  a.upcomingCount ||
                b.recordCount -
                  a.recordCount
            );

        const keys =
          nextItems.map(
            item =>
              item.key
          );

        const nextStates:
          Record<
            string,
            ActionState
          > = {};

        if (
          keys.length
        ) {
          const {
            data:
              stateRows,
          } =
            await client
              .from(
                "campus_action_states"
              )
              .select(
                "action_key,read_at,dismissed_at"
              )
              .eq(
                "user_id",
                auth.user.id
              )
              .in(
                "action_key",
                keys
              );

          for (
            const row of
            stateRows || []
          ) {
            nextStates[
              row.action_key
            ] = {
              readAt:
                row.read_at,
              dismissedAt:
                row.dismissed_at,
            };
          }
        }

        setItems(
          nextItems
        );

        setStates(
          nextStates
        );

        setLastUpdated(
          new Date()
        );

        if (
          available.length === 0
        ) {
          setStatus(
            "No authorized action sources are currently available for this role."
          );
        } else if (
          nextItems.length === 0
        ) {
          setStatus(
            "No actionable records are currently visible in your workspace."
          );
        } else {
          setStatus("");
        }

        setLoading(false);
        setRefreshing(false);
      },
      [role]
    );


  useEffect(
    () => {
      void load();

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

      const refreshOnFocus =
        () => {
          void load(true);
        };

      window.addEventListener(
        "focus",
        refreshOnFocus
      );

      return () => {
        window.clearInterval(
          interval
        );

        window.removeEventListener(
          "focus",
          refreshOnFocus
        );
      };
    },
    [load]
  );


  const visibleItems =
    useMemo(
      () =>
        items.filter(
          item =>
            !states[
              item.key
            ]?.dismissedAt
        ),
      [
        items,
        states,
      ]
    );


  const unreadCount =
    visibleItems.filter(
      item =>
        !states[
          item.key
        ]?.readAt
    ).length;


  async function saveState(
    item: ActionItem,
    changes: Partial<
      ActionState
    >
  ) {
    const client =
      getSupabaseClient();

    if (
      !client
    ) {
      return;
    }

    const {
      data: auth,
    } =
      await client.auth
        .getUser();

    if (
      !auth.user
    ) {
      return;
    }

    const current =
      states[item.key] || {
        readAt: null,
        dismissedAt: null,
      };

    const next = {
      ...current,
      ...changes,
    };

    setStates(
      previous => ({
        ...previous,
        [item.key]:
          next,
      })
    );

    const {
      error,
    } =
      await client
        .from(
          "campus_action_states"
        )
        .upsert(
          {
            user_id:
              auth.user.id,
            action_key:
              item.key,
            read_at:
              next.readAt,
            dismissed_at:
              next.dismissedAt,
            updated_at:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              "user_id,action_key",
          }
        );

    if (
      error
    ) {
      console.error(
        "[Action Center] state save failed:",
        error
      );

      setStates(
        previous => ({
          ...previous,
          [item.key]:
            current,
        })
      );
    }
  }


  function openItem(
    item: ActionItem
  ) {
    void saveState(
      item,
      {
        readAt:
          new Date()
            .toISOString(),
      }
    );

    if (
      item.sourceTable ===
      "campus_operational_tasks"
    ) {
      document
        .getElementById(
          "staff-operations-board"
        )
        ?.scrollIntoView({
          behavior:
            window.matchMedia(
              "(prefers-reduced-motion: reduce)"
            ).matches
              ? "auto"
              : "smooth",
          block: "start",
        });

      return;
    }

    go(
      item.target
    );

    window.scrollTo({
      top: 0,
      behavior:
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
          ? "auto"
          : "smooth",
    });
  }


  function askCampusAi(
    item: ActionItem
  ) {
    const evidence = [
      `${item.recordCount} visible authorized records`,
      item.overdueCount
        ? `${item.overdueCount} non-closed records with a passed recorded date`
        : "",
      item.upcomingCount
        ? `${item.upcomingCount} non-closed records dated within seven days`
        : "",
    ]
      .filter(Boolean)
      .join(", ");

    window.sessionStorage
      .setItem(
        "campusconnect-ai-intent",
        JSON.stringify({
          mode:
            "general",
          prompt:
            `Act as my CampusConnect ${role} workspace assistant. Review the authorized ${item.label.toLowerCase()} records available to my account. The deterministic dashboard signal currently reports: ${evidence}. Verify everything from the supplied CampusConnect data, explain what genuinely needs attention, and give no more than three practical next actions. Do not invent deadlines, identities, assignments, outcomes or urgency.`,
          createdAt:
            Date.now(),
        })
      );

    void saveState(
      item,
      {
        readAt:
          new Date()
            .toISOString(),
      }
    );

    go(
      "My Campus"
    );

    window.setTimeout(
      () => {
        document
          .getElementById(
            "campusconnect-ai-workspace"
          )
          ?.scrollIntoView({
            behavior:
              window.matchMedia(
                "(prefers-reduced-motion: reduce)"
              ).matches
                ? "auto"
                : "smooth",
            block:
              "start",
          });
      },
      80
    );
  }


  return (
    <section
      className="roleActionCenter"
      aria-labelledby="role-action-center-title"
    >
      <header className="roleActionCenterHeader">
        <div>
          <span>
            ROLE INTELLIGENCE
          </span>

          <h3
            id="role-action-center-title"
          >
            Today&apos;s action center
          </h3>

          <p>
            Evidence-based priorities from
            records your {role} account is
            authorized to access.
          </p>
        </div>

        <div className="roleActionCenterHeaderActions">
          <span className="roleActionCenterDate">
            {formatCurrentDate()}
          </span>

          {role === "Faculty" && visibleItems.length > 0 && (
            <div className="roleActionAiPicker">
              <label htmlFor="faculty-ai-signal">Ask AI about</label>
              <select
                id="faculty-ai-signal"
                value={visibleItems.some(item => item.key === selectedAiSource) ? selectedAiSource : ""}
                onChange={event => setSelectedAiSource(event.target.value)}
              >
                <option value="">Choose a signal</option>
                {visibleItems.map(item => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!visibleItems.some(item => item.key === selectedAiSource)}
                onClick={() => {
                  const item = visibleItems.find(signal => signal.key === selectedAiSource);
                  if (item) askCampusAi(item);
                }}
              >Ask Campus AI</button>
            </div>
          )}

          {role === "Faculty" && !loading && visibleItems.length === 0 && (
            <button type="button" onClick={() => go("My Campus")}>Campus AI</button>
          )}

          <button
            type="button"
            onClick={() =>
              void load(true)
            }
            disabled={
              refreshing
            }
          >
            <i
              aria-hidden="true"
            >
              ↻
            </i>

            {refreshing
              ? "Refreshing"
              : role === "Faculty" ? "Refresh signals" : "Refresh"}
          </button>
        </div>
      </header>

      <div className="roleActionCenterSummary">
        <div>
          <strong>
            {loading
              ? "—"
              : visibleItems.length}
          </strong>

          <span>
            ACTIVE SIGNALS
          </span>
        </div>

        <div>
          <strong>
            {loading
              ? "—"
              : unreadCount}
          </strong>

          <span>
            UNREAD
          </span>
        </div>

        <p>
          <i />

          {lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString(
                "en-IN",
                {
                  hour:
                    "2-digit",
                  minute:
                    "2-digit",
                }
              )}`
            : "Loading authorized records"}
        </p>
      </div>

      {loading ? (
        <div
          className="roleActionCenterLoading"
          aria-label="Loading action center"
        >
          <span />
          <span />
          <span />
        </div>
      ) : visibleItems.length ? (
        <div className="roleActionGrid">
          {visibleItems.map(
            item => {
              const isRead =
                Boolean(
                  states[
                    item.key
                  ]?.readAt
                );

              return (
                <article
                  className={
                    `roleActionCard ${
                      item.severity
                        .toLowerCase()
                    } ${
                      isRead
                        ? "read"
                        : "unread"
                    }`
                  }
                  key={
                    item.key
                  }
                >
                  <header>
                    <span className="roleActionIcon">
                      {item.icon}
                    </span>

                    <div>
                      <span>
                        {item.label}
                      </span>

                      <small>
                        {item.recordCount}
                        {" "}
                        visible
                      </small>
                    </div>

                    <em>
                      {item.severity}
                    </em>
                  </header>

                  <h4>
                    {item.title}
                  </h4>

                  <p>
                    {item.description}
                  </p>

                  <footer>
                    <button
                      type="button"
                      className="roleActionOpen"
                      onClick={() =>
                        openItem(
                          item
                        )
                      }
                    >
                      {role === "Faculty" ? `Review ${item.label.toLowerCase()}` : "Open workspace"}
                      <span>
                        →
                      </span>
                    </button>

                    {role !== "Faculty" && (
                    <button
                      type="button"
                      className="roleActionAi"
                      onClick={() =>
                        askCampusAi(
                          item
                        )
                      }
                    >
                      <span>
                        ✦
                      </span>
                      Ask Campus AI
                    </button>
                    )}

                    <button
                      type="button"
                      className="roleActionDismiss"
                      onClick={() =>
                        void saveState(
                          item,
                          {
                            readAt:
                              new Date()
                                .toISOString(),
                            dismissedAt:
                              new Date()
                                .toISOString(),
                          }
                        )
                      }
                      aria-label={
                        `Dismiss ${item.label} signal for today`
                      }
                      title="Dismiss for today"
                    >
                      <span className="roleActionDismissIcon" aria-hidden="true">×</span>
                      <span className="roleActionDismissLabel">Dismiss</span>
                    </button>
                  </footer>
                </article>
              );
            }
          )}
        </div>
      ) : (
        <div className="roleActionCenterEmpty">
          <span>
            ✓
          </span>

          <div>
            <strong>
              Workspace is clear
            </strong>

            <p>
              {status ||
                "There are no visible action signals for today."}
            </p>
          </div>
        </div>
      )}

      {status &&
        visibleItems.length >
          0 && (
        <p className="roleActionCenterStatus">
          {status}
        </p>
      )}

      <footer className="roleActionCenterFootnote">
        <span>
          <i>
            ✓
          </i>
          Supabase RLS protected
        </span>

        <p>
          Urgency is derived only from
          recorded dates and statuses.
          Campus AI must verify the
          underlying authorized records
          before recommending action.
        </p>
      </footer>
    </section>
  );
}
