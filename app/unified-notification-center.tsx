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

import "./unified-notification-center.css";


type NotificationCategory =
  | "all"
  | "unread"
  | "tasks"
  | "notices"
  | "academic"
  | "placement"
  | "events";


type UnifiedItem = {
  id: string;
  source:
    | "existing"
    | "task"
    | "notice";
  category:
    Exclude<
      NotificationCategory,
      "all" |
      "unread"
    >;
  label: string;
  title: string;
  message: string;
  createdAt: string;
  timeLabel: string;
  target: string;
  priority:
    | "Normal"
    | "High"
    | "Critical";
  unread: boolean;
  taskId?: string;
  noticeId?: string;
  actionUrl?: string;
  requiresAcknowledgement?: boolean;
  acknowledged?: boolean;
  original?: any;
};


type Props = {
  role: string;
  items: any[];
  readIds: string[];
  filter?: unknown;
  onFilter?: (...args: any[]) => void;
  onClose: () => void;
  onOpen: (item: any) => void;
  onReadAll: () => void;
};


type WatcherProps = {
  onCount:
    (count: number) =>
      void;
};


function relativeTime(
  value: string
) {
  const timestamp =
    Date.parse(value);

  if (
    !Number.isFinite(
      timestamp
    )
  ) {
    return value ||
      "Recently";
  }

  const difference =
    Date.now() -
    timestamp;

  const minutes =
    Math.max(
      0,
      Math.floor(
        difference /
        60_000
      )
    );

  if (
    minutes < 1
  ) {
    return "Just now";
  }

  if (
    minutes < 60
  ) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes /
      60
    );

  if (
    hours < 24
  ) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(
      hours /
      24
    );

  if (
    days < 7
  ) {
    return `${days}d ago`;
  }

  return new Intl
    .DateTimeFormat(
      "en-IN",
      {
        day: "numeric",
        month: "short",
      }
    )
    .format(
      new Date(
        timestamp
      )
    );
}


function inferCategory(
  item: any
): UnifiedItem["category"] {

  const text = [
    item.kind,
    item.label,
    item.title,
    item.message,
    item.target,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    text.includes(
      "placement"
    ) ||
    text.includes(
      "application"
    ) ||
    text.includes(
      "interview"
    ) ||
    text.includes(
      "offer"
    )
  ) {
    return "placement";
  }

  if (
    text.includes(
      "event"
    ) ||
    text.includes(
      "campus life"
    )
  ) {
    return "events";
  }

  if (
    text.includes(
      "assignment"
    ) ||
    text.includes(
      "attendance"
    ) ||
    text.includes(
      "academic"
    ) ||
    text.includes(
      "learning"
    ) ||
    text.includes(
      "result"
    )
  ) {
    return "academic";
  }

  return "notices";
}


function noticeText(
  row:
    Record<
      string,
      unknown
    >
) {
  return String(
    row.message ??
    row.body ??
    row.description ??
    row.details ??
    ""
  ).trim();
}


function noticeTitle(
  row:
    Record<
      string,
      unknown
    >
) {
  return String(
    row.title ??
    row.heading ??
    "Important campus notice"
  ).trim();
}


async function loadExternalUnreadCount() {
  const client =
    getSupabaseClient();

  if (
    !client
  ) {
    return 0;
  }

  const {
    data: auth,
  } =
    await client.auth
      .getUser();

  if (
    !auth.user
  ) {
    return 0;
  }

  const [
    taskResult,
    noticeResult,
    receiptResult,
  ] =
    await Promise.all([
      client
        .from(
          "campus_task_notifications"
        )
        .select(
          "id",
          {
            count:
              "exact",
            head:
              true,
          }
        )
        .is(
          "read_at",
          null
        ),

      client
        .from(
          "campus_notice_rail"
        )
        .select(
          "id,requires_acknowledgement"
        )
        .limit(100),

      client
        .from(
          "campus_notice_receipts"
        )
        .select(
          "notice_id,viewed_at"
        )
        .eq(
          "user_id",
          auth.user.id
        )
        .limit(200),
    ]);

  const viewed =
    new Set(
      (
        receiptResult.data ||
        []
      )
        .filter(
          row =>
            Boolean(
              row.viewed_at
            )
        )
        .map(
          row =>
            row.notice_id
        )
    );

  const unreadNotices =
    (
      noticeResult.data ||
      []
    ).filter(
      row =>
        !viewed.has(
          row.id
        )
    ).length;

  return (
    (
      taskResult.count ||
      0
    ) +
    unreadNotices
  );
}


export function
UnifiedNotificationWatcher({
  onCount,
}: WatcherProps) {

  const refresh =
    useCallback(
      async () => {
        onCount(
          await loadExternalUnreadCount()
        );
      },
      [onCount]
    );


  useEffect(
    () => {
      void refresh();

      const client =
        getSupabaseClient();

      const handleRefresh =
        () => {
          void refresh();
        };

      window.addEventListener(
        "campus-notification-count-refresh",
        handleRefresh
      );

      window.addEventListener(
        "focus",
        handleRefresh
      );

      const interval =
        window.setInterval(
          handleRefresh,
          60_000
        );

      const channel =
        client
          ?.channel(
            "unified-notification-watcher"
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table:
                "campus_task_notifications",
            },
            handleRefresh
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table:
                "campus_notice_receipts",
            },
            handleRefresh
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table:
                "campus_notice_rail",
            },
            handleRefresh
          )
          .subscribe();

      return () => {
        window.clearInterval(
          interval
        );

        window.removeEventListener(
          "campus-notification-count-refresh",
          handleRefresh
        );

        window.removeEventListener(
          "focus",
          handleRefresh
        );

        if (
          client &&
          channel
        ) {
          void client
            .removeChannel(
              channel
            );
        }
      };
    },
    [refresh]
  );

  return null;
}


export function
UnifiedNotificationCenter({
  role,
  items,
  readIds,
  onClose,
  onOpen,
  onReadAll,
}: Props) {

  const [
    databaseItems,
    setDatabaseItems,
  ] =
    useState<
      UnifiedItem[]
    >([]);

  const [
    activeFilter,
    setActiveFilter,
  ] =
    useState<
      NotificationCategory
    >("all");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    markingAll,
    setMarkingAll,
  ] =
    useState(false);

  const [
    status,
    setStatus,
  ] =
    useState("");


  const loadDatabaseItems =
    useCallback(
      async () => {
        const client =
          getSupabaseClient();

        if (
          !client
        ) {
          setLoading(false);
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
          setLoading(false);
          return;
        }

        const [
          taskResult,
          noticeResult,
          receiptResult,
        ] =
          await Promise.all([
            client
              .from(
                "campus_task_notifications"
              )
              .select(
                "id,task_id,title,message,read_at,created_at"
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(100),

            client
              .from(
                "campus_notice_rail"
              )
              .select("*")
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(100),

            client
              .from(
                "campus_notice_receipts"
              )
              .select(
                "notice_id,viewed_at,acknowledged_at"
              )
              .eq(
                "user_id",
                auth.user.id
              )
              .limit(200),
          ]);

        const receipts =
          new Map<
            string,
            {
              viewedAt:
                string | null;
              acknowledgedAt:
                string | null;
            }
          >();

        for (
          const row of
          receiptResult.data ||
          []
        ) {
          receipts.set(
            row.notice_id,
            {
              viewedAt:
                row.viewed_at,
              acknowledgedAt:
                row.acknowledged_at,
            }
          );
        }

        const taskItems:
          UnifiedItem[] =
          (
            taskResult.data ||
            []
          ).map(
            row => ({
              id:
                `task-${row.id}`,
              source:
                "task",
              category:
                "tasks",
              label:
                "STAFF OPERATIONS",
              title:
                row.title,
              message:
                row.message,
              createdAt:
                row.created_at,
              timeLabel:
                relativeTime(
                  row.created_at
                ),
              target:
                "Dashboard",
              priority:
                row.message
                  .toLowerCase()
                  .includes(
                    "critical"
                  )
                  ? "Critical"
                  : "Normal",
              unread:
                !row.read_at,
              taskId:
                row.task_id,
            })
          );

        const noticeItems:
          UnifiedItem[] =
          (
            noticeResult.data ||
            []
          ).map(
            raw => {
              const row =
                raw as Record<
                  string,
                  unknown
                >;

              const id =
                String(
                  row.id
                );

              const receipt =
                receipts.get(
                  id
                );

              const rawPriority =
                String(
                  row.priority ??
                  "Normal"
                );

              const priority:
                UnifiedItem["priority"] =
                  rawPriority ===
                    "Critical"
                    ? "Critical"
                    : rawPriority ===
                      "High"
                    ? "High"
                    : "Normal";

              return {
                id:
                  `notice-${id}`,
                source:
                  "notice",
                category:
                  "notices",
                label:
                  String(
                    row.category ??
                    "IMPORTANT NOTICE"
                  ).toUpperCase(),
                title:
                  noticeTitle(
                    row
                  ),
                message:
                  noticeText(
                    row
                  ),
                createdAt:
                  String(
                    row.created_at ??
                    ""
                  ),
                timeLabel:
                  relativeTime(
                    String(
                      row.created_at ??
                      ""
                    )
                  ),
                target:
                  "Dashboard",
                priority,
                unread:
                  !receipt
                    ?.viewedAt,
                noticeId:
                  id,
                actionUrl:
                  typeof row.link_url ===
                    "string"
                    ? row.link_url
                    : typeof row.action_url ===
                      "string"
                    ? row.action_url
                    : undefined,
                requiresAcknowledgement:
                  Boolean(
                    row.requires_acknowledgement
                  ),
                acknowledged:
                  Boolean(
                    receipt
                      ?.acknowledgedAt
                  ),
              };
            }
          );

        setDatabaseItems([
          ...taskItems,
          ...noticeItems,
        ]);

        setLoading(
          false
        );
      },
      []
    );


  useEffect(
    () => {
      void loadDatabaseItems();

      const client =
        getSupabaseClient();

      if (
        !client
      ) {
        return;
      }

      const refresh =
        () => {
          void loadDatabaseItems();
        };

      const channel =
        client
          .channel(
            "unified-notification-center"
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table:
                "campus_task_notifications",
            },
            refresh
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table:
                "campus_notice_rail",
            },
            refresh
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table:
                "campus_notice_receipts",
            },
            refresh
          )
          .subscribe();

      return () => {
        void client
          .removeChannel(
            channel
          );
      };
    },
    [loadDatabaseItems]
  );


  const existingItems =
    useMemo<
      UnifiedItem[]
    >(
      () =>
        items.map(
          item => ({
            id:
              `existing-${item.id}`,
            source:
              "existing",
            category:
              inferCategory(
                item
              ),
            label:
              String(
                item.label ||
                "CAMPUS UPDATE"
              ),
            title:
              String(
                item.title ||
                "Campus update"
              ),
            message:
              String(
                item.message ||
                ""
              ),
            createdAt:
              String(
                item.created_at ||
                item.updated_at ||
                ""
              ),
            timeLabel:
              String(
                item.time ||
                "Recently"
              ),
            target:
              String(
                item.target ||
                "Dashboard"
              ),
            priority:
              "Normal",
            unread:
              !readIds.includes(
                item.id
              ),
            original:
              item,
          })
        ),
      [
        items,
        readIds,
      ]
    );


  const unifiedItems =
    useMemo(
      () =>
        [
          ...databaseItems,
          ...existingItems,
        ].sort(
          (a, b) => {
            if (
              a.unread !==
              b.unread
            ) {
              return a.unread
                ? -1
                : 1;
            }

            const aTime =
              Date.parse(
                a.createdAt
              );

            const bTime =
              Date.parse(
                b.createdAt
              );

            return (
              (
                Number.isFinite(
                  bTime
                )
                  ? bTime
                  : 0
              ) -
              (
                Number.isFinite(
                  aTime
                )
                  ? aTime
                  : 0
              )
            );
          }
        ),
      [
        databaseItems,
        existingItems,
      ]
    );


  const visibleItems =
    useMemo(
      () =>
        unifiedItems.filter(
          item => {
            if (
              activeFilter ===
              "all"
            ) {
              return true;
            }

            if (
              activeFilter ===
              "unread"
            ) {
              return item.unread;
            }

            return (
              item.category ===
              activeFilter
            );
          }
        ),
      [
        unifiedItems,
        activeFilter,
      ]
    );


  const unreadCount =
    unifiedItems.filter(
      item =>
        item.unread
    ).length;


  async function markTaskRead(
    item: UnifiedItem
  ) {
    const client =
      getSupabaseClient();

    if (
      !client ||
      !item.taskId
    ) {
      return;
    }

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
        item.taskId
      )
      .is(
        "read_at",
        null
      );
  }


  async function markNoticeViewed(
    item: UnifiedItem
  ) {
    const client =
      getSupabaseClient();

    if (
      !client ||
      !item.noticeId
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

    await client
      .from(
        "campus_notice_receipts"
      )
      .upsert(
        {
          user_id:
            auth.user.id,
          notice_id:
            item.noticeId,
          viewed_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            "user_id,notice_id",
        }
      );
  }


  async function openItem(
    item: UnifiedItem
  ) {
    if (
      item.source ===
      "existing"
    ) {
      onOpen(
        item.original
      );

      onClose();
      return;
    }

    if (
      item.source ===
      "task"
    ) {
      await markTaskRead(
        item
      );

      if (
        item.taskId
      ) {
        window.sessionStorage
          .setItem(
            "campusconnect-focus-operational-task",
            item.taskId
          );
      }

      onOpen({
        id:
          item.id,
        kind:
          "task",
        label:
          item.label,
        title:
          item.title,
        message:
          item.message,
        time:
          item.timeLabel,
        target:
          "Dashboard",
      });

      window.setTimeout(
        () => {
          window.dispatchEvent(
            new CustomEvent(
              "campus-open-operational-task",
              {
                detail:
                  item.taskId,
              }
            )
          );
        },
        180
      );
    } else {
      await markNoticeViewed(
        item
      );

      onOpen({
        id:
          item.id,
        kind:
          "announcement",
        label:
          item.label,
        title:
          item.title,
        message:
          item.message,
        time:
          item.timeLabel,
        target:
          "Dashboard",
      });

      window.setTimeout(
        () => {
          window.scrollTo({
            top: 0,
            behavior:
              window.matchMedia(
                "(prefers-reduced-motion: reduce)"
              ).matches
                ? "auto"
                : "smooth",
          });
        },
        120
      );
    }

    setDatabaseItems(
      current =>
        current.map(
          currentItem =>
            currentItem.id ===
            item.id
              ? {
                  ...currentItem,
                  unread:
                    false,
                }
              : currentItem
        )
    );

    window.dispatchEvent(
      new Event(
        "campus-notification-count-refresh"
      )
    );

    onClose();
  }


  async function acknowledgeNotice(
    item: UnifiedItem
  ) {
    const client =
      getSupabaseClient();

    if (
      !client ||
      !item.noticeId
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

    const timestamp =
      new Date()
        .toISOString();

    const {
      error,
    } =
      await client
        .from(
          "campus_notice_receipts"
        )
        .upsert(
          {
            user_id:
              auth.user.id,
            notice_id:
              item.noticeId,
            viewed_at:
              timestamp,
            acknowledged_at:
              timestamp,
          },
          {
            onConflict:
              "user_id,notice_id",
          }
        );

    if (
      error
    ) {
      setStatus(
        error.message ||
        "Unable to acknowledge this notice."
      );
      return;
    }

    setDatabaseItems(
      current =>
        current.map(
          currentItem =>
            currentItem.id ===
            item.id
              ? {
                  ...currentItem,
                  unread:
                    false,
                  acknowledged:
                    true,
                }
              : currentItem
        )
    );

    window.dispatchEvent(
      new Event(
        "campus-notification-count-refresh"
      )
    );
  }


  async function markEverythingRead() {
    const client =
      getSupabaseClient();

    if (
      !client
    ) {
      onReadAll();
      return;
    }

    setMarkingAll(
      true
    );

    const {
      data: auth,
    } =
      await client.auth
        .getUser();

    if (
      auth.user
    ) {
      const timestamp =
        new Date()
          .toISOString();

      const noticeRows =
        databaseItems
          .filter(
            item =>
              item.source ===
                "notice" &&
              item.noticeId &&
              item.unread
          )
          .map(
            item => ({
              user_id:
                auth.user!.id,
              notice_id:
                item.noticeId!,
              viewed_at:
                timestamp,
            })
          );

      await Promise.all([
        client
          .from(
            "campus_task_notifications"
          )
          .update({
            read_at:
              timestamp,
          })
          .is(
            "read_at",
            null
          ),

        noticeRows.length
          ? client
              .from(
                "campus_notice_receipts"
              )
              .upsert(
                noticeRows,
                {
                  onConflict:
                    "user_id,notice_id",
                }
              )
          : Promise.resolve(),
      ]);
    }

    onReadAll();

    setDatabaseItems(
      current =>
        current.map(
          item => ({
            ...item,
            unread:
              false,
          })
        )
    );

    setMarkingAll(
      false
    );

    window.dispatchEvent(
      new Event(
        "campus-notification-count-refresh"
      )
    );
  }


  const filters:
    {
      id:
        NotificationCategory;
      label:
        string;
    }[] = [
      {
        id: "all",
        label: "All",
      },
      {
        id: "unread",
        label: "Unread",
      },
      {
        id: "tasks",
        label: "Tasks",
      },
      {
        id: "notices",
        label: "Notices",
      },
      {
        id: "academic",
        label: "Academic",
      },
      {
        id: "placement",
        label: "Placement",
      },
      {
        id: "events",
        label: "Events",
      },
    ];


  return (
    <section
      className="unifiedNotificationCenter"
      role="dialog"
      aria-modal="false"
      aria-label="CampusConnect notifications"
    >
      <header className="unifiedNotificationHeader">
        <div>
          <span>
            LIVE WORKSPACE
          </span>

          <h3>
            Notifications
          </h3>

          <p>
            {role} workspace
            {" · "}
            {unreadCount} unread
          </p>
        </div>

        <button
          type="button"
          onClick={
            onClose
          }
          aria-label="Close notifications"
        >
          ×
        </button>
      </header>

      <nav
        className="unifiedNotificationFilters"
        aria-label="Notification filters"
      >
        {filters.map(
          filterItem => {
            const count =
              filterItem.id ===
                "all"
                ? unifiedItems.length
                : filterItem.id ===
                  "unread"
                ? unreadCount
                : unifiedItems.filter(
                    item =>
                      item.category ===
                      filterItem.id
                  ).length;

            return (
              <button
                type="button"
                className={
                  activeFilter ===
                  filterItem.id
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFilter(
                    filterItem.id
                  )
                }
                key={
                  filterItem.id
                }
              >
                {filterItem.label}

                {count > 0 && (
                  <span>
                    {count}
                  </span>
                )}
              </button>
            );
          }
        )}
      </nav>

      {status && (
        <p
          className="unifiedNotificationStatus"
          role="status"
        >
          {status}
        </p>
      )}

      <div className="unifiedNotificationList">
        {loading ? (
          <div className="unifiedNotificationLoading">
            <span />
            <span />
            <span />
          </div>
        ) : visibleItems.length ? (
          visibleItems.map(
            item => (
              <article
                className={
                  `unifiedNotificationItem ${
                    item.unread
                      ? "unread"
                      : "read"
                  } priority-${item.priority
                    .toLowerCase()}`
                }
                key={
                  item.id
                }
              >
                <button
                  type="button"
                  className="unifiedNotificationMain"
                  onClick={() =>
                    void openItem(
                      item
                    )
                  }
                >
                  <i
                    aria-hidden="true"
                  >
                    {item.category ===
                      "tasks"
                      ? "T"
                      : item.category ===
                        "placement"
                      ? "P"
                      : item.category ===
                        "academic"
                      ? "A"
                      : item.category ===
                        "events"
                      ? "E"
                      : "N"}
                  </i>

                  <span>
                    <span className="unifiedNotificationMeta">
                      <b>
                        {item.label}
                      </b>

                      <small>
                        {item.timeLabel}
                      </small>
                    </span>

                    <strong>
                      {item.title}
                    </strong>

                    <p>
                      {item.message}
                    </p>

                    <span className="unifiedNotificationBadges">
                      <em>
                        {item.category}
                      </em>

                      {item.priority !==
                        "Normal" && (
                        <em
                          className="priority"
                        >
                          {item.priority}
                        </em>
                      )}

                      {item.requiresAcknowledgement &&
                        !item.acknowledged && (
                        <em
                          className="acknowledgement"
                        >
                          Acknowledgement required
                        </em>
                      )}

                      {item.acknowledged && (
                        <em
                          className="acknowledged"
                        >
                          ✓ Acknowledged
                        </em>
                      )}
                    </span>
                  </span>

                  <strong
                    aria-hidden="true"
                  >
                    →
                  </strong>
                </button>

                <footer>
                  {item.actionUrl && (
                    <a
                      href={
                        item.actionUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open link ↗
                    </a>
                  )}

                  {item.requiresAcknowledgement &&
                    !item.acknowledged && (
                    <button
                      type="button"
                      onClick={() =>
                        void acknowledgeNotice(
                          item
                        )
                      }
                    >
                      Acknowledge
                    </button>
                  )}
                </footer>
              </article>
            )
          )
        ) : (
          <div className="unifiedNotificationEmpty">
            <i>
              ✓
            </i>

            <strong>
              You&apos;re all caught up
            </strong>

            <p>
              No notifications match this filter.
            </p>
          </div>
        )}
      </div>

      <footer className="unifiedNotificationFooter">
        <span>
          <i />
          Supabase RLS protected
        </span>

        <button
          type="button"
          onClick={() =>
            void markEverythingRead()
          }
          disabled={
            markingAll ||
            unreadCount ===
              0
          }
        >
          {markingAll
            ? "Updating…"
            : "Mark all read"}
        </button>
      </footer>
    </section>
  );
}
