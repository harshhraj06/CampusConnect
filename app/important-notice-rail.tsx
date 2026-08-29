"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  getSupabaseClient,
} from "../lib/supabase";

import "./important-notice-rail.css";

type NoticeRole =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";

type NoticeProfile = {
  name: string;
  role: NoticeRole;
};

type ImportantNotice = {
  id: string;
  author_id: string;
  author_name: string;
  author_role: NoticeRole;
  notice_type: string;
  priority: string;
  title: string;
  message: string;
  link_url: string;
  link_label: string;
  audience_roles: NoticeRole[];
  audience_departments: string[];
  requires_acknowledgement: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
};

type NoticeReceipt = {
  notice_id: string;
  viewed_at: string;
  acknowledged_at: string | null;
};

type NoticeStats = {
  notice_id: string;
  recipient_count: number;
  viewed_count: number;
  acknowledged_count: number;
};

type NoticeForm = {
  noticeType: string;
  priority: string;
  title: string;
  message: string;
  linkUrl: string;
  linkLabel: string;
  expiresAt: string;
  audienceRoles: NoticeRole[];
  departments: string;
  requiresAcknowledgement: boolean;
};

const allRoles: NoticeRole[] = [
  "Student",
  "Faculty",
  "Placement Cell",
  "Coordinator",
  "Volunteer",
  "Main Admin",
];

const publisherRoles:
  NoticeRole[] = [
    "Faculty",
    "Placement Cell",
    "Coordinator",
    "Volunteer",
    "Main Admin",
  ];

const initialForm: NoticeForm = {
  noticeType: "Important",
  priority: "Normal",
  title: "",
  message: "",
  linkUrl: "",
  linkLabel: "Open details",
  expiresAt: "",
  audienceRoles: [...allRoles],
  departments: "",
  requiresAcknowledgement: false,
};

function safeExternalUrl(
  value: string
): string {
  const trimmed = value.trim();

  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function noticeSymbol(
  type: string
): string {
  if (type === "Result") return "R";
  if (type === "Exam") return "E";
  if (type === "Recruitment") return "H";
  if (type === "Academic") return "A";
  if (type === "Event") return "V";
  return "!";
}

function roleLabel(
  role: NoticeRole
): string {
  return role === "Main Admin"
    ? "Admin"
    : role;
}

export default function
ImportantNoticeRail({
  profile,
}: {
  profile: NoticeProfile;
}) {
  const [notices, setNotices] =
    useState<ImportantNotice[]>([]);

  const [receipts, setReceipts] =
    useState<
      Record<string, NoticeReceipt>
    >({});

  const [stats, setStats] =
    useState<
      Record<string, NoticeStats>
    >({});

  const [userId, setUserId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [composerOpen, setComposerOpen] =
    useState(false);

  const [publishing, setPublishing] =
    useState(false);

  const [status, setStatus] =
    useState("");

  const [form, setForm] =
    useState<NoticeForm>(
      initialForm
    );

  const canPublish =
    publisherRoles.includes(
      profile.role
    );

  async function loadNotices() {
    const client =
      getSupabaseClient();

    if (!client) {
      setLoading(false);
      return;
    }

    const {data: auth} =
      await client.auth.getUser();

    const authenticatedUser =
      auth.user;

    if (!authenticatedUser) {
      setNotices([]);
      setLoading(false);
      return;
    }

    setUserId(authenticatedUser.id);

    const now =
      new Date().toISOString();

    const {data, error} =
      await client
        .from("campus_notice_rail")
        .select(
          "id,author_id,author_name,author_role,notice_type,priority,title,message,link_url,link_label,audience_roles,audience_departments,requires_acknowledgement,starts_at,expires_at,created_at"
        )
        .eq("is_active", true)
        .lte("starts_at", now)
        .or(
          `expires_at.is.null,expires_at.gt.${now}`
        )
        .order("priority", {
          ascending: true,
        })
        .order("created_at", {
          ascending: false,
        })
        .limit(30);

    if (error) {
      console.error(
        "[Campus notice rail] load:",
        error
      );

      setStatus(
        "Important notices are temporarily unavailable."
      );
      setLoading(false);
      return;
    }

    const rows =
      (data || []) as
        ImportantNotice[];

    setNotices(rows);

    if (rows.length) {
      const viewedAt =
        new Date().toISOString();

      await client
        .from(
          "campus_notice_receipts"
        )
        .upsert(
          rows.map(notice => ({
            notice_id: notice.id,
            user_id:
              authenticatedUser.id,
            viewed_at: viewedAt,
          })),
          {
            onConflict:
              "notice_id,user_id",
          }
        );

      const {data: receiptRows} =
        await client
          .from(
            "campus_notice_receipts"
          )
          .select(
            "notice_id,viewed_at,acknowledged_at"
          )
          .in(
            "notice_id",
            rows.map(
              notice => notice.id
            )
          )
          .eq(
            "user_id",
            authenticatedUser.id
          );

      setReceipts(
        Object.fromEntries(
          (
            (receiptRows || []) as
              NoticeReceipt[]
          ).map(receipt => [
            receipt.notice_id,
            receipt,
          ])
        )
      );

      const managedNoticeIds =
        rows
          .filter(
            notice =>
              profile.role ===
                "Main Admin" ||
              notice.author_id ===
                authenticatedUser.id
          )
          .map(notice => notice.id);

      if (managedNoticeIds.length) {
        const {data: statRows} =
          await client.rpc(
            "get_campus_notice_stats",
            {
              p_notice_ids:
                managedNoticeIds,
            }
          );

        setStats(
          Object.fromEntries(
            (
              (statRows || []) as
                NoticeStats[]
            ).map(item => [
              item.notice_id,
              {
                ...item,
                recipient_count:
                  Number(
                    item.recipient_count
                  ),
                viewed_count:
                  Number(
                    item.viewed_count
                  ),
                acknowledged_count:
                  Number(
                    item.acknowledged_count
                  ),
              },
            ])
          )
        );
      }
    } else {
      setReceipts({});
      setStats({});
    }

    setLoading(false);
  }

  useEffect(() => {
    const client =
      getSupabaseClient();

    if (!client) {
      setLoading(false);
      return;
    }

    void loadNotices();

    const channel =
      client
        .channel(
          `important-notices-${profile.role}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "campus_notice_rail",
          },
          () => {
            void loadNotices();
          }
        )
        .subscribe();

    const refresh =
      window.setInterval(
        () => {
          void loadNotices();
        },
        30_000
      );

    return () => {
      window.clearInterval(refresh);
      void client.removeChannel(channel);
    };
  }, [profile.role]);

  function toggleAudienceRole(
    role: NoticeRole
  ) {
    setForm(current => {
      const selected =
        current.audienceRoles.includes(
          role
        );

      return {
        ...current,
        audienceRoles: selected
          ? current.audienceRoles.filter(
              item => item !== role
            )
          : [
              ...current.audienceRoles,
              role,
            ],
      };
    });
  }

  async function publishNotice(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!canPublish) return;

    const client =
      getSupabaseClient();

    if (!client) {
      setStatus(
        "CampusConnect database connection is unavailable."
      );
      return;
    }

    const title =
      form.title.trim();

    const message =
      form.message.trim();

    const linkUrl =
      safeExternalUrl(
        form.linkUrl
      );

    if (!title || !message) {
      setStatus(
        "Add both a title and notice details."
      );
      return;
    }

    if (
      form.linkUrl.trim() &&
      !linkUrl
    ) {
      setStatus(
        "Use a valid HTTP or HTTPS link."
      );
      return;
    }

    if (
      !form.audienceRoles.length
    ) {
      setStatus(
        "Select at least one audience role."
      );
      return;
    }

    const expiresAt =
      form.expiresAt
        ? new Date(
            form.expiresAt
          )
        : null;

    if (
      expiresAt &&
      expiresAt.getTime() <=
        Date.now()
    ) {
      setStatus(
        "The expiry must be in the future."
      );
      return;
    }

    const departments =
      Array.from(
        new Set(
          form.departments
            .split(",")
            .map(item =>
              item.trim()
            )
            .filter(Boolean)
        )
      ).slice(0, 20);

    setPublishing(true);
    setStatus("");

    const {error} =
      await client
        .from("campus_notice_rail")
        .insert({
          notice_type:
            form.noticeType,
          priority:
            form.priority,
          title,
          message,
          link_url: linkUrl,
          link_label:
            form.linkLabel.trim() ||
            "Open details",
          audience_roles:
            form.audienceRoles,
          audience_departments:
            departments,
          requires_acknowledgement:
            form.requiresAcknowledgement,
          starts_at:
            new Date().toISOString(),
          expires_at:
            expiresAt
              ? expiresAt.toISOString()
              : null,
          is_active: true,
        });

    setPublishing(false);

    if (error) {
      console.error(
        "[Campus notice rail] publish:",
        error
      );

      setStatus(
        error.message ||
          "The notice could not be published."
      );
      return;
    }

    setForm(initialForm);
    setComposerOpen(false);
    setStatus(
      "Targeted notice published."
    );

    await loadNotices();
  }

  async function acknowledgeNotice(
    noticeId: string
  ) {
    const client =
      getSupabaseClient();

    if (!client || !userId) return;

    const now =
      new Date().toISOString();

    const {error} =
      await client
        .from(
          "campus_notice_receipts"
        )
        .upsert(
          {
            notice_id: noticeId,
            user_id: userId,
            viewed_at:
              receipts[noticeId]
                ?.viewed_at || now,
            acknowledged_at: now,
          },
          {
            onConflict:
              "notice_id,user_id",
          }
        );

    if (error) {
      setStatus(
        "Acknowledgement could not be saved."
      );
      return;
    }

    setReceipts(current => ({
      ...current,
      [noticeId]: {
        notice_id: noticeId,
        viewed_at:
          current[noticeId]
            ?.viewed_at || now,
        acknowledged_at: now,
      },
    }));

    setStatus(
      "Notice acknowledged."
    );

    await loadNotices();
  }

  async function removeNotice(
    notice: ImportantNotice
  ) {
    const client =
      getSupabaseClient();

    if (!client) return;

    if (
      profile.role !==
        "Main Admin" &&
      notice.author_id !== userId
    ) {
      return;
    }

    const {error} =
      await client
        .from("campus_notice_rail")
        .update({
          is_active: false,
        })
        .eq("id", notice.id);

    if (error) {
      setStatus(
        "The notice could not be removed."
      );
      return;
    }

    setStatus("Notice removed.");
    await loadNotices();
  }

  const movingNotices =
    notices.length > 1
      ? [...notices, ...notices]
      : notices;

  return (
    <>
      <section
        className={`importantNoticeRail ${
          notices.length > 1
            ? "moving"
            : ""
        }`}
        aria-label="Important campus notices"
      >
        <header className="importantNoticeRailHead">
          <span className="importantNoticePulse">
            <i aria-hidden="true" />
            IMPORTANT
          </span>

          <strong>
            Campus notice rail
          </strong>
        </header>

        <div className="importantNoticeViewport">
          {loading ? (
            <p className="importantNoticeEmpty">
              Loading targeted notices…
            </p>
          ) : movingNotices.length ? (
            <div className="importantNoticeTrack">
              {movingNotices.map(
                (notice, index) => {
                  const url =
                    safeExternalUrl(
                      notice.link_url
                    );

                  const acknowledged =
                    Boolean(
                      receipts[notice.id]
                        ?.acknowledged_at
                    );

                  const canRemove =
                    profile.role ===
                      "Main Admin" ||
                    notice.author_id ===
                      userId;

                  const noticeStats =
                    stats[notice.id];

                  return (
                    <article
                      className={`importantNoticeItem priority-${notice.priority.toLowerCase()}`}
                      key={`${notice.id}-${index}`}
                    >
                      <span className="importantNoticeIcon">
                        {noticeSymbol(
                          notice.notice_type
                        )}
                      </span>

                      <span className="importantNoticeCopy">
                        <small>
                          {notice.priority}
                          {" · "}
                          {notice.notice_type}
                          {" · "}
                          {notice.author_role}
                        </small>

                        <strong>
                          {notice.title}
                        </strong>

                        <p>
                          {notice.message}
                        </p>

                        {noticeStats && (
                          <span className="importantNoticeAnalytics">
                            {noticeStats.viewed_count}
                            {" viewed"}

                            {notice.requires_acknowledgement && (
                              <>
                                {" · "}
                                {noticeStats.acknowledged_count}
                                {" acknowledged"}
                              </>
                            )}

                            {" · "}
                            {noticeStats.recipient_count}
                            {" targeted"}
                          </span>
                        )}
                      </span>

                      <span className="importantNoticeAudience">
                        <small>Audience</small>

                        <b>
                          {notice.audience_roles
                            .map(roleLabel)
                            .join(", ")}
                        </b>
                      </span>

                      <span className="importantNoticeActions">
                        {url && (
                          <button
                            type="button"
                            className="importantNoticeLink"
                            onClick={() =>
                              window.open(
                                url,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            {notice.link_label}
                            <span>↗</span>
                          </button>
                        )}

                        {notice.requires_acknowledgement && (
                          <button
                            type="button"
                            className={`importantNoticeAcknowledge ${
                              acknowledged
                                ? "complete"
                                : ""
                            }`}
                            disabled={
                              acknowledged
                            }
                            onClick={() =>
                              void acknowledgeNotice(
                                notice.id
                              )
                            }
                          >
                            {acknowledged
                              ? "Acknowledged"
                              : "Acknowledge"}
                          </button>
                        )}

                        {canRemove && (
                          <button
                            type="button"
                            className="importantNoticeRemove"
                            onClick={() =>
                              void removeNotice(
                                notice
                              )
                            }
                            aria-label={`Remove ${notice.title}`}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    </article>
                  );
                }
              )}
            </div>
          ) : (
            <p className="importantNoticeEmpty">
              No active notice for your role.
            </p>
          )}
        </div>

        {canPublish && (
          <button
            type="button"
            className="importantNoticeAdd"
            onClick={() => {
              setStatus("");
              setComposerOpen(true);
            }}
          >
            <span>＋</span>
            Add notice
          </button>
        )}
      </section>

      {status && (
        <p
          className="importantNoticeStatus"
          role="status"
        >
          {status}
        </p>
      )}

      {composerOpen && canPublish && (
        <div
          className="importantNoticeScrim"
          onMouseDown={event => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setComposerOpen(false);
            }
          }}
        >
          <section
            className="importantNoticeComposer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="targeted-notice-title"
          >
            <header>
              <span>
                TARGETED VERIFIED NOTICE
              </span>

              <button
                type="button"
                onClick={() =>
                  setComposerOpen(false)
                }
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <div className="importantNoticeComposerIntro">
              <span>!</span>

              <div>
                <h2 id="targeted-notice-title">
                  Publish an important notice
                </h2>

                <p>
                  Choose exactly who should see it
                  and whether acknowledgement is
                  required.
                </p>
              </div>
            </div>

            <form onSubmit={publishNotice}>
              <div className="importantNoticeFormGrid">
                <label>
                  Notice type

                  <select
                    value={form.noticeType}
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        noticeType:
                          event.target.value,
                      }))
                    }
                  >
                    <option>Important</option>
                    <option>Academic</option>
                    <option>Result</option>
                    <option>Exam</option>
                    <option>Recruitment</option>
                    <option>Event</option>
                  </select>
                </label>

                <label>
                  Priority

                  <select
                    value={form.priority}
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        priority:
                          event.target.value,
                      }))
                    }
                  >
                    <option>Normal</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </label>
              </div>

              <label>
                Notice title

                <input
                  value={form.title}
                  maxLength={120}
                  placeholder="Example: Semester results announced"
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      title:
                        event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label>
                Notice details

                <textarea
                  value={form.message}
                  maxLength={500}
                  rows={4}
                  placeholder="Write only verified information."
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      message:
                        event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <fieldset className="importantNoticeAudiencePicker">
                <legend>
                  Audience roles
                </legend>

                <div>
                  {allRoles.map(role => (
                    <label key={role}>
                      <input
                        type="checkbox"
                        checked={
                          form.audienceRoles.includes(
                            role
                          )
                        }
                        onChange={() =>
                          toggleAudienceRole(
                            role
                          )
                        }
                      />

                      <span>
                        {roleLabel(role)}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="importantNoticeFormGrid">
                <label>
                  Departments

                  <input
                    value={form.departments}
                    placeholder="ECE, CSE — leave empty for all"
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        departments:
                          event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Visible until

                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        expiresAt:
                          event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="importantNoticeFormGrid">
                <label>
                  Related link

                  <input
                    type="url"
                    value={form.linkUrl}
                    placeholder="https://..."
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        linkUrl:
                          event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Link button text

                  <input
                    value={form.linkLabel}
                    maxLength={40}
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        linkLabel:
                          event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label className="importantNoticeAckOption">
                <input
                  type="checkbox"
                  checked={
                    form.requiresAcknowledgement
                  }
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      requiresAcknowledgement:
                        event.target.checked,
                    }))
                  }
                />

                <span>
                  <b>
                    Require acknowledgement
                  </b>

                  <small>
                    Recipients must confirm that
                    they have read this notice.
                  </small>
                </span>
              </label>

              <p className="importantNoticeSecurity">
                <i aria-hidden="true" />
                Audience filtering and receipts
                are protected by authenticated
                Supabase RLS.
              </p>

              {status && (
                <p
                  className="importantNoticeComposerStatus"
                  role="alert"
                >
                  {status}
                </p>
              )}

              <footer>
                <button
                  type="button"
                  className="importantNoticeCancel"
                  onClick={() =>
                    setComposerOpen(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="importantNoticePublish"
                  disabled={publishing}
                >
                  {publishing
                    ? "Publishing…"
                    : "Publish targeted notice"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
