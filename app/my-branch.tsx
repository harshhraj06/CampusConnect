"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import MyBranchExtras from "./my-branch-extras";

type BranchProfile = { name: string; email?: string; department: string; role: string };
type EntryType = "achievement" | "topper" | "event";
type BranchAttachment = { path: string; filename: string; mimeType: string; size: number; signedUrl?: string };
type Entry = {
  id: string; department: string; entry_type: EntryType; title: string;
  summary: string; details: string; person_name: string; award: string;
  semester: string; academic_year: string; event_start: string | null;
  event_end: string | null; venue: string; registration_url: string;
  status: "published" | "draft"; created_at: string; updated_at: string;
  student_photo_path?: string; student_photo_url?: string; attachments?: BranchAttachment[];
};
type Form = {
  entry_type: EntryType; title: string; summary: string; details: string;
  person_name: string; award: string; semester: string; academic_year: string;
  event_start: string; event_end: string; venue: string;
  registration_url: string; status: "published" | "draft";
  student_photo_path: string; attachments: BranchAttachment[];
};
const EMPTY: Form = {
  entry_type: "achievement", title: "", summary: "", details: "",
  person_name: "", award: "", semester: "", academic_year: "",
  event_start: "", event_end: "", venue: "", registration_url: "",
  status: "published", student_photo_path: "", attachments: [],
};
const FILTERS = [
  ["all", "All updates"], ["achievement", "Achievements"],
  ["topper", "Toppers"], ["event", "Events"],
] as const;

function niceDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" :
    new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
function localInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" :
    new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
}
function labelType(type: EntryType) {
  return type === "topper" ? "Academic topper" : type === "event" ? "Branch event" : "Achievement";
}
function statusEvent(entry: Entry) {
  if (!entry.event_start) return "";
  const now = Date.now();
  const start = new Date(entry.event_start).getTime();
  const end = entry.event_end ? new Date(entry.event_end).getTime() : start + 3 * 3600000;
  return start <= now && end >= now ? "HAPPENING NOW" : start > now ? "UPCOMING" : "PAST EVENT";
}

async function getMyBranchAuthHeaders(extra: Record<string, string> = {}) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Authentication required. Please sign in again.");

  const { data, error } = await client.auth.getSession();
  const accessToken = data.session?.access_token;
  if (error || !accessToken) {
    throw new Error("Authentication required. Please sign in again.");
  }

  return { ...extra, Authorization: `Bearer ${accessToken}` };
}


async function uploadMyBranchFile(file: File, category: "student-photo" | "attachment", department: string): Promise<BranchAttachment> {
  const body = new FormData();
  body.set("file", file);
  body.set("category", category);
  body.set("department", department);

  const response = await fetch("/api/my-branch/media", {
    method: "POST", credentials: "same-origin",
    headers: await getMyBranchAuthHeaders(), body,
  });
  const result = await response.json() as BranchAttachment & { error?: string };
  if (!response.ok) throw new Error(result.error || `Could not upload ${file.name}.`);
  return {
    path: result.path, filename: result.filename || file.name,
    mimeType: result.mimeType || file.type, size: result.size || file.size,
  };
}

export default function MyBranchHub({ profile }: { profile: BranchProfile }) {
  const isAdmin = profile.role === "Main Admin";
  const canManage = ["Faculty", "Coordinator", "Main Admin"].includes(profile.role);
  const allowed = ["Student", "Faculty", "Placement Cell", "Coordinator", "Volunteer", "Main Admin"].includes(profile.role);
  const [branch, setBranch] = useState(isAdmin ? "" : profile.department);
  const [branches, setBranches] = useState<string[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  const load = useCallback(async () => {
    if (!allowed) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/my-branch${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`,
        { credentials: "same-origin", cache: "no-store", headers: await getMyBranchAuthHeaders() },
      );
      const result = await response.json() as {
        branch?: string; branches?: string[]; entries?: Entry[]; error?: string;
      };
      if (!response.ok) throw new Error(result.error || "Unable to load this branch.");
      setEntries(result.entries || []);
      setBranches(result.branches || []);
      if (result.branch && result.branch !== branch) setBranch(result.branch);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load this branch.");
    } finally {
      setLoading(false);
    }
  }, [allowed, branch]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries
      .filter((entry) => filter === "all" || entry.entry_type === filter)
      .filter((entry) => !needle || [
        entry.title, entry.summary, entry.details, entry.person_name,
        entry.award, entry.venue, entry.department,
      ].join(" ").toLowerCase().includes(needle));
  }, [entries, filter, query]);

  const published = entries.filter((entry) => entry.status === "published");
  const achievements = published.filter((entry) => entry.entry_type === "achievement").length;
  const toppers = published.filter((entry) => entry.entry_type === "topper").length;
  const events = published.filter((entry) =>
    entry.entry_type === "event" && entry.event_start &&
    new Date(entry.event_end || entry.event_start).getTime() >= Date.now()
  ).length;

  function create(type: EntryType = "achievement") {
    setEditing(""); setForm({ ...EMPTY, entry_type: type });
    setCoverFile(null); setAttachmentFiles([]);
    setError(""); setNotice(""); setShowForm(true);
  }
  function edit(entry: Entry) {
    setEditing(entry.id);
    setForm({
      entry_type: entry.entry_type, title: entry.title, summary: entry.summary,
      details: entry.details, person_name: entry.person_name, award: entry.award,
      semester: entry.semester, academic_year: entry.academic_year,
      event_start: localInput(entry.event_start), event_end: localInput(entry.event_end),
      venue: entry.venue, registration_url: entry.registration_url, status: entry.status,
      student_photo_path: entry.student_photo_path || "", attachments: entry.attachments || [],
    });
    setCoverFile(null); setAttachmentFiles([]);
    setError(""); setNotice(""); setShowForm(true);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      if (form.attachments.length + attachmentFiles.length > 10) {
        throw new Error("You can attach up to 10 files per update.");
      }
      let photoPath = form.student_photo_path;
      if (coverFile) {
        const uploaded = await uploadMyBranchFile(coverFile, "student-photo", branch);
        photoPath = uploaded.path;
      }
      const uploadedAttachments = await Promise.all(
        attachmentFiles.map((file) => uploadMyBranchFile(file, "attachment", branch))
      );
      const attachments = [...form.attachments, ...uploadedAttachments].map((file) => ({
        path: file.path, filename: file.filename, mimeType: file.mimeType, size: file.size,
      }));
      const payload = {
        ...form, department: branch, student_photo_path: photoPath, attachments,
        event_start: form.event_start ? new Date(form.event_start).toISOString() : null,
        event_end: form.event_end ? new Date(form.event_end).toISOString() : null,
      };
      const response = await fetch("/api/my-branch", {
        method: editing ? "PATCH" : "POST", credentials: "same-origin",
        headers: await getMyBranchAuthHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
        body: JSON.stringify({ ...payload, id: editing || undefined }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save the update.");
      setShowForm(false); setEditing(""); setForm(EMPTY);
      setCoverFile(null); setAttachmentFiles([]);
      setNotice(editing ? "Branch update saved." : "Branch update saved.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the update.");
    } finally { setSaving(false); }
  }
  async function remove(entry: Entry) {
    if (!window.confirm(`Delete "${entry.title}" from ${entry.department}?`)) return;
    setError(""); setNotice("");
    try {
      const response = await fetch(`/api/my-branch?id=${encodeURIComponent(entry.id)}`, {
        method: "DELETE", credentials: "same-origin", headers: await getMyBranchAuthHeaders(),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not delete the update.");
      setNotice("Branch update deleted."); await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the update.");
    }
  }

  if (!allowed) return (
    <section className="myBranchRoot"><div className="myBranchEmpty">
      <span className="myBranchKicker">MY BRANCH</span>
      <h2>Access restricted</h2>
      <p>View published achievements, toppers and events from your own department.</p>
    </div></section>
  );

  return (
    <section className="myBranchRoot">
      <header className="myBranchHero">
        <div className="myBranchHeroOrnament" aria-hidden="true"><span /><span /><span /></div>
        <div className="myBranchHeroTop">
          <span className="myBranchKicker">CAMPUSCONNECT / DEPARTMENT HUB</span>
          <span className="myBranchAccess"><i /> {canManage ? "STAFF WORKSPACE" : "READ-ONLY VIEW"}</span>
        </div>
        <div className="myBranchHeroContent">
          <div>
            <p className="myBranchOverline">YOUR DEPARTMENT, IN FOCUS</p>
            <h1>My <em>Branch.</em></h1>
            <p className="myBranchHeroCopy">
              Celebrate progress, recognise student excellence and keep every department event in one place.
            </p>
            <div className="myBranchHeroMeta">
              <span className="myBranchBranchSeal">MB</span>
              <span><strong>{branch || profile.department || "Your department"}</strong>
                <small>{isAdmin ? "Main Admin · All branches" : `${profile.role} · Assigned branch`}</small>
              </span>
            </div>
          </div>
          <div className="myBranchEmblem" aria-hidden="true">
            <div className="myBranchEmblemRing">
              <svg viewBox="0 0 100 100" fill="none">
                <path d="M17 28C28 23 40 27 50 35V76C39 68 28 66 17 71V28Z"/>
                <path d="M83 28C72 23 60 27 50 35V76C61 68 72 66 83 71V28Z"/>
                <path d="M50 35V76M25 39C32 37 38 39 43 43M75 39C68 37 62 39 57 43"/>
              </svg>
            </div>
            <small>BELONG · BUILD · ACHIEVE</small>
          </div>
        </div>
        {isAdmin && <label className="myBranchSelector">
          <span>VIEW DEPARTMENT</span>
          <select value={branch} disabled={!branches.length} onChange={(event) => {
            setBranch(event.target.value); setNotice(""); setError("");
          }}>
            {branches.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>}
      </header>

      <MyBranchExtras profile={profile} branch={branch || profile.department} canManage={canManage} section="banner" />

      <div className="myBranchStats">
        <article><span>✦</span><small>Achievements</small><strong>{String(achievements).padStart(2,"0")}</strong><p>Published milestones</p></article>
        <article><span>✧</span><small>Topper highlights</small><strong>{String(toppers).padStart(2,"0")}</strong><p>Academic recognitions</p></article>
        <article><span>◷</span><small>Upcoming events</small><strong>{String(events).padStart(2,"0")}</strong><p>Branch opportunities</p></article>
      </div>

      <div className="myBranchSectionHeading">
        <div><span className="myBranchKicker">THE DEPARTMENT BULLETIN</span>
          <h2>Branch highlights</h2><p>Updates entered by authorised branch staff.</p>
        </div>
        <div className="myBranchActions">
          <button type="button" className="myBranchQuietButton" onClick={() => void load()} disabled={loading}>↻ Refresh</button>
          {canManage && <button type="button" className="myBranchPrimaryButton" onClick={() => create()}>＋ Add update</button>}
        </div>
      </div>

      {error && <div className="myBranchMessage myBranchError" role="alert">{error}</div>}
      {notice && <div className="myBranchMessage" role="status">{notice}</div>}

      {canManage && showForm && <form className="myBranchEditor" onSubmit={save}>
        <div className="myBranchEditorHeading"><div>
          <span className="myBranchKicker">{editing ? "EDIT UPDATE" : "NEW BRANCH UPDATE"}</span>
          <h3>{editing ? "Update the details" : "Share something worth celebrating"}</h3>
        </div><button type="button" className="myBranchClose" onClick={() => setShowForm(false)}>×</button></div>
        <div className="myBranchFormGrid">
          <label>Update type<select value={form.entry_type} onChange={(e) => setForm({...form,entry_type:e.target.value as EntryType})}>
            <option value="achievement">Achievement</option><option value="topper">Academic topper</option><option value="event">Branch event</option>
          </select></label>
          <label>Headline<input required maxLength={160} value={form.title} onChange={(e) => setForm({...form,title:e.target.value})} placeholder="e.g. First place at the project expo"/></label>
          <label className="myBranchWide">Short summary<input maxLength={500} value={form.summary} onChange={(e) => setForm({...form,summary:e.target.value})} placeholder="A clear one-line overview"/></label>
          <label>{form.entry_type === "topper" ? "Student name" : "Person or team"}<input maxLength={120} value={form.person_name} onChange={(e) => setForm({...form,person_name:e.target.value})} placeholder="Name (optional)"/></label>
          <label>{form.entry_type === "topper" ? "Semester" : "Recognition / award"}<input maxLength={200} value={form.entry_type === "topper" ? form.semester : form.award} onChange={(e) => setForm(form.entry_type === "topper" ? {...form,semester:e.target.value} : {...form,award:e.target.value})}/></label>
          <label>Academic year<input maxLength={40} value={form.academic_year} onChange={(e) => setForm({...form,academic_year:e.target.value})} placeholder="e.g. 2026–27"/></label>

          <label className="myBranchWide">{form.entry_type === "event" ? "Event poster / cover image" : "Topper or achiever photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
          </label>
          {coverFile && <p className="myBranchUploadHint myBranchWide">Selected image: {coverFile.name}</p>}
          {form.student_photo_path && !coverFile && <p className="myBranchUploadHint myBranchWide">Existing image retained. Choose a new file to replace it.</p>}
          <label className="myBranchWide">Photos, PDFs and documents — up to 10 files, 15 MiB each
            <input type="file" multiple
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
              onChange={(e) => setAttachmentFiles(Array.from(e.target.files || []))} />
          </label>
          {attachmentFiles.length > 0 && <p className="myBranchUploadHint myBranchWide">Selected: {attachmentFiles.map((file) => file.name).join(", ")}</p>}
          {form.attachments.length > 0 && <div className="myBranchExistingAttachments myBranchWide">
            <strong>Saved attachments</strong>
            {form.attachments.map((file) => <div className="myBranchExistingAttachment" key={file.path}>
              <span>{file.filename}</span>
              <button type="button" onClick={() => setForm({...form, attachments: form.attachments.filter((item) => item.path !== file.path)})}>Remove</button>
            </div>)}
          </div>}

          {form.entry_type === "event" ? <>
            <label>Starts at<input required type="datetime-local" value={form.event_start} onChange={(e) => setForm({...form,event_start:e.target.value})}/></label>
            <label>Ends at<input type="datetime-local" value={form.event_end} min={form.event_start || undefined} onChange={(e) => setForm({...form,event_end:e.target.value})}/></label>
            <label>Venue<input maxLength={180} value={form.venue} onChange={(e) => setForm({...form,venue:e.target.value})} placeholder="Hall, lab or online"/></label>
            <label>Registration URL<input type="url" maxLength={500} value={form.registration_url} onChange={(e) => setForm({...form,registration_url:e.target.value})} placeholder="https://..."/></label>
          </> : <label>Recognition date<input type="date" value={form.event_start.slice(0,10)} onChange={(e) => setForm({...form,event_start:e.target.value ? `${e.target.value}T12:00` : ""})}/></label>}
          <label className="myBranchWide">Details<textarea rows={4} maxLength={5000} value={form.details} onChange={(e) => setForm({...form,details:e.target.value})} placeholder="Add verified details, recognition context or event information."/></label>
          <label>Publishing<select value={form.status} onChange={(e) => setForm({...form,status:e.target.value as Form["status"]})}><option value="published">Publish to branch hub</option><option value="draft">Save as draft</option></select></label>
        </div>
        <div className="myBranchEditorFooter"><span>Saved for <strong>{branch || "selected branch"}</strong>.</span>
          <button className="myBranchQuietButton" type="button" onClick={() => setShowForm(false)}>Cancel</button>
          <button className="myBranchPrimaryButton" type="submit" disabled={saving}>{saving ? "Saving…" : "Save update"}</button>
        </div>
      </form>}

      <div className="myBranchToolbar">
        <div className="myBranchFilters" role="group" aria-label="Filter branch updates">
          {FILTERS.map(([key,label]) => <button key={key} type="button" className={filter === key ? "isActive" : ""} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}
        </div>
        <label className="myBranchSearch"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search updates..." aria-label="Search branch updates"/></label>
      </div>

      {loading ? <div className="myBranchEmpty" aria-live="polite"><span className="myBranchLoader"/><p>Loading your branch workspace…</p></div>
      : visible.length === 0 ? <div className="myBranchEmpty">
        <div className="myBranchEmptyMark">MB</div><span className="myBranchKicker">A FRESH CHAPTER</span>
        <h3>No branch updates yet</h3><p>Verified achievements, topper highlights and events will appear here once authorised staff add them.</p>
        {canManage && <button type="button" className="myBranchPrimaryButton" onClick={() => create()}>＋ Add the first update</button>}
      </div> : <div className="myBranchEntryGrid">
        {visible.map((entry) => <article className={`myBranchEntryCard type-${entry.entry_type}`} key={entry.id}>
          <div className="myBranchEntryTop"><span>{labelType(entry.entry_type)}</span><small className={entry.status}>{entry.status.toUpperCase()}</small></div>
          {entry.entry_type === "topper" && <div className="myBranchTrophy">✦</div>}
          {entry.student_photo_url && <img className="myBranchEntryCover" src={entry.student_photo_url} alt={`${entry.title} cover`} loading="lazy" />}
          <h3>{entry.title}</h3>{entry.summary && <p className="myBranchSummary">{entry.summary}</p>}
          {entry.person_name && <div className="myBranchPerson"><span>{entry.person_name.charAt(0).toUpperCase()}</span><div><strong>{entry.person_name}</strong><small>{entry.entry_type === "topper" ? [entry.semester,entry.academic_year].filter(Boolean).join(" · ") : entry.award}</small></div></div>}
          {entry.details && <p className="myBranchDetails">{entry.details}</p>}
          {entry.entry_type === "event" && <div className="myBranchEventMeta">
            <span className="myBranchEventState">{statusEvent(entry)}</span>
            {entry.event_start && <small>◷ {niceDate(entry.event_start)}</small>}
            {entry.venue && <small>⌖ {entry.venue}</small>}
            {entry.registration_url && <a href={entry.registration_url} target="_blank" rel="noreferrer">Registration ↗</a>}
          </div>}
          {entry.entry_type !== "event" && entry.event_start && <small className="myBranchDate">Recognition · {niceDate(entry.event_start)}</small>}
          {!!entry.attachments?.length && <div className="myBranchAttachments">
            <strong>Attachments</strong>
            {entry.attachments.map((file) => <a key={file.path}
              href={file.signedUrl || undefined} target="_blank" rel="noreferrer"
              aria-disabled={!file.signedUrl} className={!file.signedUrl ? "isUnavailable" : ""}>
              <span aria-hidden="true">{file.mimeType === "application/pdf" ? "PDF" : file.mimeType.startsWith("image/") ? "IMG" : "FILE"}</span>
              {file.filename}{file.signedUrl ? " ↗" : " (unavailable)"}
            </a>)}
          </div>}
          <footer className="myBranchEntryFooter"><small>Updated {niceDate(entry.updated_at)}</small>
            {canManage && <div>
              <button type="button" onClick={() => edit(entry)}>Edit</button><button type="button" onClick={() => void remove(entry)}>Delete</button>
            </div>}
          </footer>
        </article>)}
      </div>}
      <MyBranchExtras profile={profile} branch={branch || profile.department} canManage={canManage} section="gallery" />
      <footer className="myBranchHubFooter"><span className="myBranchHubSeal">MB</span><span><strong>One branch. Many milestones.</strong><small>Keep this space accurate and up to date.</small></span><small>{profile.role}</small></footer>
    </section>
  );
}
