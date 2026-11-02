"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../lib/supabase";
import "./student-notice-board.css";

type BoardRole =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";

type BoardProfile = {
  name: string;
  department: string;
  year: string;
};

type NoticeBatch = {
  batch_id: string;
  batch_name: string;
  section: string;
  department: string;
  semester: string;
  academic_year: string;
};

type Notice = {
  id: string;
  target_batch_id: string;
  title: string;
  body: string;
  category: string;
  is_pinned: boolean;
  author_name: string;
  created_at: string;
  updated_at: string;
};

const categories = ["Academic", "Exam", "Event", "Placement", "Urgent", "General"];

export default function StudentNoticeBoard({
  role,
  profile,
}: {
  role: BoardRole;
  profile: BoardProfile;
}) {
  const [batches, setBatches] = useState<NoticeBatch[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Academic");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canPost = role === "Faculty" || role === "Coordinator" || role === "Main Admin";
  const client = getSupabaseClient();

  const loadBoard = useCallback(async () => {
    if (!client) {
      setError("CampusConnect could not connect to the database. Check your Supabase configuration.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: batchRows, error: batchError } =
        await client.rpc("get_my_notice_batches");

      if (batchError) throw batchError;

      const safeBatches = (batchRows ?? []) as NoticeBatch[];
      setBatches(safeBatches);

      const batchIds = safeBatches.map((batch) => batch.batch_id);
      if (!batchIds.length) {
        setNotices([]);
        setLoading(false);
        return;
      }

      const { data: noticeRows, error: noticeError } = await client
        .from("student_notices")
        .select("id,target_batch_id,title,body,category,is_pinned,author_name,created_at,updated_at")
        .in("target_batch_id", batchIds)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (noticeError) throw noticeError;
      setNotices((noticeRows ?? []) as Notice[]);
    } catch (cause) {
      console.error("[CampusConnect Notice Board]", cause);
      setError("Notices could not be loaded. Apply the Notice Board database migration and try again.");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const batchMap = useMemo(
    () => new Map(batches.map((batch) => [batch.batch_id, batch])),
    [batches],
  );

  function resetComposer() {
    setShowComposer(false);
    setEditing(null);
    setTitle("");
    setBody("");
    setCategory("Academic");
    setPinned(false);
    setError("");
  }

  function beginCreate() {
    setEditing(null);
    setTitle("");
    setBody("");
    setCategory("Academic");
    setPinned(false);
    setSelectedBatch((current) => current || batches[0]?.batch_id || "");
    setError("");
    setShowComposer(true);
  }

  function beginEdit(notice: Notice) {
    setActiveNotice(null);
    setEditing(notice);
    setSelectedBatch(notice.target_batch_id);
    setTitle(notice.title);
    setBody(notice.body);
    setCategory(notice.category);
    setPinned(notice.is_pinned);
    setError("");
    setShowComposer(true);
  }

  async function saveNotice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || saving) return;

    setSaving(true);
    setError("");

    try {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Please sign in again.");

      const batch = batchMap.get(selectedBatch);
      if (!batch) throw new Error("Choose a valid assigned batch.");

      const payload = {
        target_batch_id: selectedBatch,
        title: title.trim(),
        body: body.trim(),
        category,
        is_pinned: pinned,
        author_id: userData.user.id,
        author_name: profile.name.trim() || "CampusConnect Staff",
      };

      const result = editing
        ? await client.from("student_notices").update(payload).eq("id", editing.id)
        : await client.from("student_notices").insert(payload);

      if (result.error) throw result.error;

      resetComposer();
      await loadBoard();
    } catch (cause) {
      console.error("[CampusConnect Notice Board save]", cause);
      setError(cause instanceof Error ? cause.message : "Could not save this notice. Check your permissions.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNotice(notice: Notice) {
    if (!client || !window.confirm(`Delete "${notice.title}"? This cannot be undone.`)) return;

    setError("");
    const { error: deleteError } = await client
      .from("student_notices")
      .delete()
      .eq("id", notice.id);

    if (deleteError) {
      setError("Could not delete this notice. Check your batch permissions.");
      return;
    }

    setActiveNotice(null);
    await loadBoard();
  }

  return (
    <section className="studentNoticeBoard">
      <div className="noticeBoardHeader">
        <div>
          <span className="noticeEyebrow">CAMPUSCONNECT · CLASS UPDATES</span>
          <h2>Notice Board</h2>
          <p>Important updates, pinned for your campus community.</p>
        </div>
        {canPost && (
          <button className="noticePrimaryButton" onClick={beginCreate} type="button">
            <span aria-hidden="true">＋</span> Post a notice
          </button>
        )}
      </div>

      <div className="noticeBoardMeta">
        <span className="noticeBoardPin" aria-hidden="true">📌</span>
        <span>
          {batches.length
            ? batches.length === 1
              ? `${batches[0].semester || "Class"} · Section ${batches[0].section || "—"}`
              : `${batches.length} assigned classes`
            : "Your class notices"}
        </span>
        <span className="noticeBoardCount">{notices.length} {notices.length === 1 ? "notice" : "notices"}</span>
      </div>

      {error && <div className="noticeBoardError" role="alert">{error}</div>}

      {loading ? (
        <div className="noticeBoardEmpty"><span className="noticeLoadingDot" /> Gathering your notices…</div>
      ) : notices.length === 0 ? (
        <div className="noticeBoardEmpty">
          <span className="noticeEmptyIcon" aria-hidden="true">✉</span>
          <strong>No notices pinned yet</strong>
          <p>New updates for your semester and section will appear here.</p>
          {canPost && batches.length > 0 && (
            <button className="noticeTextButton" onClick={beginCreate} type="button">Post the first notice</button>
          )}
        </div>
      ) : (
        <div className="noticeCorkSurface">
          <div className="noticeCorkGrain" aria-hidden="true" />
          <div className="noticeCardGrid">
            {notices.map((notice, index) => {
              const batch = batchMap.get(notice.target_batch_id);
              return (
                <article className={`noticePaper noticePaperTone${index % 4}`} key={notice.id}>
                  <span className="noticePaperPin" aria-hidden="true" />
                  {notice.is_pinned && <span className="noticePinnedLabel">PINNED</span>}
                  <button className="noticePaperOpen" type="button" onClick={() => setActiveNotice(notice)} aria-label={`Read ${notice.title}`}>
                    <span className="noticeCategory">{notice.category}</span>
                    <strong>{notice.title}</strong>
                    <span className="noticePaperPreview">{notice.body}</span>
                    <span className="noticePaperFooter">
                      <span>{batch ? `${batch.semester || "Class"} · ${batch.section || "Section"}` : "Class notice"}</span>
                      <time dateTime={notice.created_at}>{new Date(notice.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</time>
                    </span>
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {activeNotice && (
        <div className="noticeModalBackdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setActiveNotice(null);
        }}>
          <section className="noticeModal" role="dialog" aria-modal="true" aria-labelledby="noticeModalTitle">
            <button className="noticeModalClose" type="button" onClick={() => setActiveNotice(null)} aria-label="Close notice">×</button>
            <span className="noticeCategory">{activeNotice.category}</span>
            {activeNotice.is_pinned && <span className="noticePinnedLabel">PINNED NOTICE</span>}
            <h3 id="noticeModalTitle">{activeNotice.title}</h3>
            <div className="noticeModalMeta">
              <span>{activeNotice.author_name}</span>
              <span>{new Date(activeNotice.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
            </div>
            <p className="noticeModalBody">{activeNotice.body}</p>
            <div className="noticeModalAudience">
              <strong>For</strong>
              <span>
                {(() => {
                  const batch = batchMap.get(activeNotice.target_batch_id);
                  return batch
                    ? `${batch.department} · ${batch.semester} · Section ${batch.section}${batch.academic_year ? ` · ${batch.academic_year}` : ""}`
                    : "Your assigned class";
                })()}
              </span>
            </div>
            {canPost && (
              <div className="noticeModalActions">
                <button className="noticeSecondaryButton" type="button" onClick={() => beginEdit(activeNotice)}>Edit notice</button>
                <button className="noticeDeleteButton" type="button" onClick={() => void deleteNotice(activeNotice)}>Delete</button>
              </div>
            )}
          </section>
        </div>
      )}

      {showComposer && (
        <div className="noticeModalBackdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) resetComposer();
        }}>
          <section className="noticeModal noticeComposer" role="dialog" aria-modal="true" aria-labelledby="noticeComposerTitle">
            <button className="noticeModalClose" type="button" onClick={resetComposer} disabled={saving} aria-label="Close form">×</button>
            <span className="noticeEyebrow">NOTICE BOARD MANAGEMENT</span>
            <h3 id="noticeComposerTitle">{editing ? "Edit notice" : "Post a notice"}</h3>
            <p className="noticeComposerHint">This notice will be visible to students in the selected class.</p>
            <form onSubmit={saveNotice}>
              <label>
                Class / section
                <select value={selectedBatch} onChange={(event) => setSelectedBatch(event.target.value)} required>
                  {batches.map((batch) => (
                    <option key={batch.batch_id} value={batch.batch_id}>
                      {batch.department} · {batch.semester} · Section {batch.section}{batch.academic_year ? ` · ${batch.academic_year}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Notice title
                <input value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={180} placeholder="e.g. Internal assessment schedule" required />
              </label>
              <label>
                Category
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                Details
                <textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={3} maxLength={4000} rows={5} placeholder="Share the date, instructions, venue, or other important details…" required />
              </label>
              <label className="noticePinToggle">
                <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
                Pin this notice near the top
              </label>
              {error && <div className="noticeBoardError" role="alert">{error}</div>}
              <div className="noticeComposerActions">
                <button className="noticeSecondaryButton" type="button" onClick={resetComposer} disabled={saving}>Cancel</button>
                <button className="noticePrimaryButton" type="submit" disabled={saving || !batches.length}>
                  {saving ? "Saving…" : editing ? "Save changes" : "Publish notice"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
