/* eslint-disable @next/next/no-img-element -- Runtime-loaded announcement attachments use existing media URLs. */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import "./personal-announcements-module.css";

export type CampusUser = {
  id: string;
  full_name: string;
  role: string;
  department?: string;
  campus_uid?: string;
  usn?: string;
  employee_id?: string;
  email?: string;
};

export type PersonalAnnouncement = {
  id: string;
  student_id?: string;
  sender_id?: string;
  sender_role?: string;
  sender_name?: string;
  sender_cc_id?: string | null;
  title: string;
  message: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  created_at: string;
  read_at?: string | null;
};

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PersonalAnnouncementsModule() {
  const [mode, setMode] = useState<"inbox" | "sender" | "">("");
  const [role, setRole] = useState("");
  const [currentActor, setCurrentActor] = useState<CampusUser | null>(null);
  const [users, setUsers] = useState<CampusUser[]>([]);
  const [sentMessages, setSentMessages] = useState<PersonalAnnouncement[]>([]);
  const [inboxMessages, setInboxMessages] = useState<PersonalAnnouncement[]>([]);
  const [activeView, setActiveView] = useState<"compose" | "sent" | "inbox">("compose");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"error" | "success" | "info" | "">("");

  // Recipient Selection State
  const [selectedRecipient, setSelectedRecipient] = useState<CampusUser | null>(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Composer Form
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<{ url: string; name: string; type: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<PersonalAnnouncement | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editAttachment, setEditAttachment] = useState<{ url: string; name: string; type: string; size: number } | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unread" | "attachments">("all");

  const request = useCallback(async (path: string = "/api/personal-announcements", init?: RequestInit): Promise<Record<string, unknown>> => {
    const client = getSupabaseClient();
    const { data } = client ? await client.auth.getSession() : { data: { session: null } };
    const token = data.session?.access_token;
    if (!token) throw new Error("Your session has expired. Please sign in again.");

    const res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "Request failed.");
    return body;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request();
      setMode(data.mode);
      setRole(data.actor?.role || "Student");
      setCurrentActor(data.actor || null);
      const userList = (data.users || data.students || []) as CampusUser[];
      setUsers(userList);

      if (data.mode === "inbox") {
        setInboxMessages(data.announcements || []);
        setActiveView("inbox");
      } else {
        setSentMessages(data.announcements || []);
        setInboxMessages(data.inboxAnnouncements || []);
        setActiveView("compose");
      }
      setStatus("");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not load announcements.");
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // Click outside listener for recipient dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered recipient candidates for the searchable combobox
  const candidateRecipients = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return users.slice(0, 30);
    return users.filter(u =>
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.campus_uid && u.campus_uid.toLowerCase().includes(q)) ||
      (u.usn && u.usn.toLowerCase().includes(q)) ||
      (u.employee_id && u.employee_id.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [users, recipientSearch]);

  // File Upload Helper (via server route using admin client storage)
  const handleFileUpload = async (file: File, isEdit: boolean = false) => {
    if (file.size > 15 * 1024 * 1024) {
      setStatus("File must be smaller than 15 MB.");
      setStatusType("error");
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setStatus("Storage service unavailable.");
      setStatusType("error");
      return;
    }

    setUploading(true);
    setStatus("");
    try {
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session has expired. Please sign in again.");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/personal-announcements/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error(typeof result.error === "string" ? result.error : "Could not upload file.");

      const attachedData = {
        url: result.url,
        name: result.name || file.name,
        type: result.type || file.type || "application/octet-stream",
        size: result.size || file.size,
      };

      if (isEdit) {
        setEditAttachment(attachedData);
      } else {
        setAttachment(attachedData);
      }

      setStatus(`Attached file: ${file.name}`);
      setStatusType("success");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not upload file.");
      setStatusType("error");
    } finally {
      setUploading(false);
    }
  };

  // Send Direct Announcement
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRecipient || !title.trim() || !message.trim()) return;

    setSaving(true);
    setStatus("");
    try {
      await request("/api/personal-announcements", {
        method: "POST",
        body: JSON.stringify({
          recipient_id: selectedRecipient.id,
          title: title.trim(),
          message: message.trim(),
          attachment_url: attachment?.url || null,
          attachment_name: attachment?.name || null,
          attachment_type: attachment?.type || null,
          attachment_size: attachment?.size || null,
        }),
      });

      setTitle("");
      setMessage("");
      setAttachment(null);
      setSelectedRecipient(null);
      setRecipientSearch("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setStatus(`Direct announcement dispatched to ${selectedRecipient.full_name} (${selectedRecipient.campus_uid || selectedRecipient.role}).`);
      setStatusType("success");
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not send announcement.");
      setStatusType("error");
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Modal
  const startEdit = (item: PersonalAnnouncement) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditMessage(item.message);
    setEditAttachment(
      item.attachment_url && item.attachment_name
        ? {
            url: item.attachment_url,
            name: item.attachment_name,
            type: item.attachment_type || "",
            size: item.attachment_size || 0,
          }
        : null
    );
  };

  // Save Edit
  const saveEdit = async () => {
    if (!editingItem || !editTitle.trim() || !editMessage.trim()) return;

    setSaving(true);
    setStatus("");
    try {
      await request("/api/personal-announcements", {
        method: "POST",
        body: JSON.stringify({
          action: "edit",
          announcement_id: editingItem.id,
          title: editTitle.trim(),
          message: editMessage.trim(),
          attachment_url: editAttachment?.url || null,
          attachment_name: editAttachment?.name || null,
          attachment_type: editAttachment?.type || null,
          attachment_size: editAttachment?.size || null,
        }),
      });

      setEditingItem(null);
      setStatus("Announcement successfully updated.");
      setStatusType("success");
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not update announcement.");
      setStatusType("error");
    } finally {
      setSaving(false);
    }
  };

  // Delete Announcement
  const confirmDelete = async () => {
    if (!deleteId) return;

    setSaving(true);
    setStatus("");
    try {
      await request("/api/personal-announcements", {
        method: "POST",
        body: JSON.stringify({
          action: "delete",
          announcement_id: deleteId,
          target: activeView === "inbox" ? "inbox" : "sent",
        }),
      });

      setDeleteId(null);
      setStatus(
        activeView === "inbox"
          ? "Message removed from your inbox. Official communication record is retained by college administration."
          : "Announcement archived and removed from dispatch history."
      );
      setStatusType("success");
      await load();

      // Notify the unified notification center to re-fetch counts and items
      try {
        window.dispatchEvent(new CustomEvent("campus-notification-count-refresh"));
      } catch {}
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not delete announcement.");
      setStatusType("error");
    } finally {
      setSaving(false);
    }
  };

  // Mark Read
  const markRead = async (id: string) => {
    try {
      await request("/api/personal-announcements", {
        method: "POST",
        body: JSON.stringify({ action: "mark_read", announcement_id: id }),
      });
      setInboxMessages(old =>
        old.map(m => (m.id === id ? { ...m, read_at: new Date().toISOString() } : m))
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not mark as read.");
      setStatusType("error");
    }
  };

  const displayList = activeView === "inbox" ? inboxMessages : sentMessages;

  // Filtered Messages
  const filteredMessages = useMemo(() => {
    return displayList.filter(item => {
      const q = searchQuery.trim().toLowerCase();
      const targetUser = users.find(u => u.id === item.student_id);
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        (targetUser && targetUser.full_name.toLowerCase().includes(q)) ||
        (targetUser?.campus_uid && targetUser.campus_uid.toLowerCase().includes(q)) ||
        (item.sender_name && item.sender_name.toLowerCase().includes(q)) ||
        (item.sender_cc_id && item.sender_cc_id.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterType === "unread" && item.read_at) return false;
      if (filterType === "attachments" && !item.attachment_url) return false;

      return true;
    });
  }, [displayList, searchQuery, filterType, users]);

  const totalReceived = inboxMessages.length;
  const unreadInboxCount = inboxMessages.filter(m => !m.read_at).length;
  const totalSent = sentMessages.length;
  const totalAttachments = (activeView === "inbox" ? inboxMessages : sentMessages).filter(m => Boolean(m.attachment_url)).length;

  return (
    <div className="personalAnnounceRoot">
      {/* Metric KPI Banner */}
      <div className="announceKpiGrid">
        <div className="announceKpiCard">
          <span className="announceKpiLabel">Direct Inbox</span>
          <span className="announceKpiValue">{totalReceived}</span>
          <span className="announceKpiNote">{unreadInboxCount} unread message{unreadInboxCount === 1 ? "" : "s"}</span>
        </div>
        <div className="announceKpiCard">
          <span className="announceKpiLabel">Total Sent</span>
          <span className="announceKpiValue">{totalSent}</span>
          <span className="announceKpiNote">Messages dispatched</span>
        </div>
        <div className="announceKpiCard">
          <span className="announceKpiLabel">Attached Files</span>
          <span className="announceKpiValue">{totalAttachments}</span>
          <span className="announceKpiNote">Documents & media</span>
        </div>
        <div className="announceKpiCard">
          <span className="announceKpiLabel">Your Campus ID</span>
          <span className="announceKpiValue" style={{ fontSize: 18, color: "#1e3a24" }}>
            {currentActor?.campus_uid || "CC-ACTIVE"}
          </span>
          <span className="announceKpiNote">{role} Profile</span>
        </div>
      </div>

      {status && (
        <div className={`promoBanner ${statusType}`} role="status">
          <span>{status}</span>
          <button
            type="button"
            onClick={() => setStatus("")}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Mode View Switcher for Staff */}
      {mode === "sender" && (
        <div style={{ display: "flex", gap: 10, borderBottom: "1px solid #e2e8f0", paddingBottom: 14 }}>
          <button
            type="button"
            className={activeView === "compose" ? "announceBtnPrimary" : "announceBtnSecondary"}
            onClick={() => setActiveView("compose")}
          >
            ✏️ New Direct Message
          </button>
          <button
            type="button"
            className={activeView === "sent" ? "announceBtnPrimary" : "announceBtnSecondary"}
            onClick={() => setActiveView("sent")}
          >
            📤 Sent History ({totalSent})
          </button>
          <button
            type="button"
            className={activeView === "inbox" ? "announceBtnPrimary" : "announceBtnSecondary"}
            onClick={() => setActiveView("inbox")}
          >
            📥 My Inbox ({totalReceived}) {unreadInboxCount > 0 && <span style={{ background: "#b45309", color: "#fff", borderRadius: 999, padding: "2px 6px", fontSize: 10, marginLeft: 4 }}>{unreadInboxCount}</span>}
          </button>
        </div>
      )}

      {/* Composer Section */}
      {activeView === "compose" && mode === "sender" && (
        <section className="announceSectionCard">
          <div className="announceHeaderRow">
            <div>
              <span className="announceStepTag">Direct Dispatch · Any Campus Member</span>
              <h3 className="announceTitle">Send Private Message</h3>
              <p className="announceSubtitle">
                Select anyone across the campus by their <strong>Name, CC ID (Campus UID), USN, or Employee ID</strong> to deliver a confidential memo with attachments.
              </p>
            </div>
          </div>

          <form onSubmit={send}>
            <div className="announceFormGrid">
              {/* Recipient Search Combobox */}
              <div className="announceInputGroup" style={{ position: "relative" }} ref={dropdownRef}>
                <label className="announceInputLabel">Recipient (Search Name, CC ID, USN, Staff)</label>

                {!selectedRecipient ? (
                  <div>
                    <input
                      type="text"
                      className="announceInput"
                      placeholder="Type name, CC-ID (e.g. CC-...), USN, or role…"
                      value={recipientSearch}
                      onChange={e => {
                        setRecipientSearch(e.target.value);
                        setDropdownOpen(true);
                      }}
                      onFocus={() => setDropdownOpen(true)}
                    />

                    {dropdownOpen && (
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: 12,
                        boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
                        zIndex: 100,
                        maxHeight: 280,
                        overflowY: "auto",
                        marginTop: 4,
                      }}>
                        {candidateRecipients.length === 0 ? (
                          <div style={{ padding: 14, fontSize: 13, color: "#64748b", textAlign: "center" }}>
                            No campus accounts matched &quot;{recipientSearch}&quot;
                          </div>
                        ) : (
                          candidateRecipients.map(u => (
                            <div
                              key={u.id}
                              style={{
                                padding: "10px 14px",
                                borderBottom: "1px solid #f1f5f9",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                              onMouseLeave={e => (e.currentTarget.style.background = "#ffffff")}
                              onClick={() => {
                                setSelectedRecipient(u);
                                setDropdownOpen(false);
                                setRecipientSearch("");
                              }}
                            >
                              <div>
                                <strong style={{ fontSize: 13, color: "#0f172a" }}>{u.full_name}</strong>
                                <div style={{ fontSize: 11, color: "#64748b", display: "flex", gap: 6, marginTop: 2 }}>
                                  {u.campus_uid && <span style={{ fontFamily: "monospace", color: "#1e3a24", fontWeight: 700 }}>{u.campus_uid}</span>}
                                  {u.usn && <span>· USN: {u.usn}</span>}
                                  {u.employee_id && <span>· Emp: {u.employee_id}</span>}
                                  {u.department && <span>· {u.department}</span>}
                                </div>
                              </div>
                              <span style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: "3px 8px",
                                borderRadius: 999,
                                background: u.role === "Student" ? "#e0f2fe" : u.role === "Faculty" ? "#fef3c7" : "#eaf3ec",
                                color: u.role === "Student" ? "#0369a1" : u.role === "Faculty" ? "#b45309" : "#1e3a24",
                              }}>
                                {u.role}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "#eaf3ec",
                    border: "1px solid #cce3d1",
                    borderRadius: 10,
                  }}>
                    <div>
                      <strong style={{ fontSize: 13, color: "#1e3a24" }}>{selectedRecipient.full_name}</strong>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                        {selectedRecipient.campus_uid && <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{selectedRecipient.campus_uid} </span>}
                        · Role: {selectedRecipient.role}
                        {selectedRecipient.department ? ` · Dept: ${selectedRecipient.department}` : ""}
                        {selectedRecipient.usn ? ` · USN: ${selectedRecipient.usn}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRecipient(null)}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "#b91c1c", fontWeight: 700, fontSize: 14 }}
                      title="Clear recipient"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Subject Line */}
              <div className="announceInputGroup">
                <label className="announceInputLabel">
                  Subject Line <span>{title.length}/160</span>
                </label>
                <input
                  required
                  maxLength={160}
                  className="announceInput"
                  placeholder="e.g. Confidential Evaluation Feedback"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Message Body */}
            <div className="announceInputGroup" style={{ marginBottom: 16 }}>
              <label className="announceInputLabel">
                Message Content <span>{message.length}/5000</span>
              </label>
              <textarea
                required
                rows={4}
                maxLength={5000}
                className="announceTextarea"
                placeholder="Write your private message here. Preserves full formatting…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                disabled={saving}
              />
            </div>

            {/* File Attachment Dropzone */}
            <div className="announceInputGroup" style={{ marginBottom: 20 }}>
              <label className="announceInputLabel">Attach Document or File (Optional)</label>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file, false);
                }}
              />

              {!attachment ? (
                <div
                  className="announceFileDropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="announceFileDropzoneContent">
                    <div className="announceFileIcon">📎</div>
                    <div>
                      <strong style={{ fontSize: 13, color: "#1e293b", display: "block" }}>
                        {uploading ? "Uploading file to secure cloud…" : "Click to attach document or media"}
                      </strong>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        PDF, DOCX, XLSX, PNG, JPG up to 10 MB
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="announceBtnSecondary"
                    style={{ height: 32, fontSize: 11 }}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading…" : "Browse File"}
                  </button>
                </div>
              ) : (
                <div className="announceFileChip">
                  <span>📄 {attachment.name} ({formatBytes(attachment.size)})</span>
                  <button
                    type="button"
                    className="announceFileChipRemove"
                    onClick={() => {
                      setAttachment(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    title="Remove attachment"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                🔒 Delivered securely to recipient&apos;s direct inbox and notifications feed.
              </span>
              <button
                type="submit"
                className="announceBtnPrimary"
                disabled={saving || uploading || !selectedRecipient || !title.trim() || !message.trim()}
              >
                {saving ? "Transmitting…" : "Send Private Message"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Message Feed Section (Sent or Inbox) */}
      {(activeView !== "compose" || mode === "inbox") && (
        <section className="announceSectionCard">
          <div className="announceHeaderRow">
            <div>
              <span className="announceStepTag">{activeView === "inbox" ? "Direct Inbox" : "Dispatch History"}</span>
              <h3 className="announceTitle">
                {activeView === "inbox" ? "Received Private Messages" : "Sent Private Messages"} ({filteredMessages.length})
              </h3>
              <p className="announceSubtitle">
                {activeView === "inbox"
                  ? "Messages and confidential files addressed directly to you."
                  : "Complete record of direct announcements dispatched from your account."}
              </p>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              className="announceInput"
              style={{ flex: 1, minWidth: 220 }}
              placeholder="Search by subject, person, CC ID, or content…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />

            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className={filterType === "all" ? "announceBtnPrimary" : "announceBtnSecondary"}
                style={{ height: 38, padding: "0 14px", fontSize: 12 }}
                onClick={() => setFilterType("all")}
              >
                All ({displayList.length})
              </button>
              <button
                type="button"
                className={filterType === "unread" ? "announceBtnPrimary" : "announceBtnSecondary"}
                style={{ height: 38, padding: "0 14px", fontSize: 12 }}
                onClick={() => setFilterType("unread")}
              >
                Unread ({displayList.filter(m => !m.read_at).length})
              </button>
              <button
                type="button"
                className={filterType === "attachments" ? "announceBtnPrimary" : "announceBtnSecondary"}
                style={{ height: 38, padding: "0 14px", fontSize: 12 }}
                onClick={() => setFilterType("attachments")}
              >
                With Attachments ({displayList.filter(m => Boolean(m.attachment_url)).length})
              </button>
            </div>
          </div>

          {/* Message List */}
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "#64748b", fontSize: 14 }}>
              Loading announcements…
            </div>
          ) : filteredMessages.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📭</div>
              <strong style={{ fontSize: 15, color: "#1e293b", display: "block" }}>No messages found</strong>
              <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
                {searchQuery ? "Try searching with a different term." : "No messages found in this view."}
              </p>
            </div>
          ) : (
            <div className="announceMessageList">
              {filteredMessages.map(item => {
                const targetUser = users.find(u => u.id === item.student_id);
                const isUnread = !item.read_at;

                return (
                  <article
                    key={item.id}
                    className={`announceMessageCard ${activeView === "inbox" && isUnread ? "unread" : ""}`}
                  >
                    <div className="announceMessageHeader">
                      <div>
                        <h4 className="announceMessageTitle">{item.title}</h4>
                        <div className="announceMessageMeta">
                          {activeView === "inbox" ? (
                            <span>
                              From: <strong>{item.sender_name || item.sender_role || "Staff"}</strong>
                              {item.sender_cc_id && <span style={{ fontFamily: "monospace", color: "#1e3a24", fontWeight: 700, marginLeft: 4 }}>({item.sender_cc_id})</span>}
                            </span>
                          ) : (
                            <span>
                              To: <strong>{targetUser?.full_name || "Campus Member"}</strong>
                              {targetUser?.campus_uid && <span style={{ fontFamily: "monospace", color: "#1e3a24", fontWeight: 700, marginLeft: 4 }}>({targetUser.campus_uid})</span>}
                              {targetUser?.role && <span style={{ marginLeft: 4 }}>· {targetUser.role}</span>}
                            </span>
                          )}
                          <span>·</span>
                          <span>{new Date(item.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {activeView === "inbox" && isUnread && (
                          <span className="promoStatusPill status-warning">● Unread</span>
                        )}
                        {item.read_at && (
                          <span className="promoStatusPill status-eligible">✓ Read</span>
                        )}
                      </div>
                    </div>

                    <div className="announceMessageBody">{item.message}</div>

                    {/* Attachment Chip & Media Preview */}
                    {item.attachment_url && (
                      <div style={{ margin: "10px 0 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {item.attachment_type?.startsWith("image/") && (
                          <div style={{ maxWidth: 360, borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                            <img
                              src={item.attachment_url}
                              alt={item.attachment_name || "Attachment"}
                              style={{ width: "100%", maxHeight: 220, objectFit: "contain", display: "block" }}
                            />
                          </div>
                        )}
                        <a
                          href={item.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={item.attachment_name || "attachment"}
                          className="announceAttachmentBadge"
                          title="Open or download attachment"
                        >
                          <span style={{ fontSize: 15 }}>📎</span>
                          <span style={{ fontWeight: 700 }}>{item.attachment_name || "Download File"}</span>
                          {item.attachment_size && (
                            <span style={{ color: "#64748b", fontSize: 11, fontWeight: 500 }}>
                              ({formatBytes(item.attachment_size)})
                            </span>
                          )}
                          <span style={{ marginLeft: 6, fontSize: 11, color: "#1e3a24", fontWeight: 800 }}>⬇ View / Download</span>
                        </a>
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="announceActionsRow">
                      <div>
                        {activeView === "inbox" && isUnread && (
                          <button
                            type="button"
                            className="announceBtnSecondary"
                            style={{ height: 32, fontSize: 11 }}
                            onClick={() => void markRead(item.id)}
                          >
                            Mark as Read
                          </button>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        {activeView === "sent" && (
                          <button
                            type="button"
                            className="announceBtnSecondary"
                            style={{ height: 32, fontSize: 11 }}
                            onClick={() => startEdit(item)}
                          >
                            ✏️ Edit
                          </button>
                        )}

                        <button
                          type="button"
                          className="announceBtnDanger"
                          onClick={() => setDeleteId(item.id)}
                        >
                          {activeView === "inbox" ? "🗑️ Remove from Inbox" : "🗑️ Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="announceModalBackdrop" role="dialog" aria-modal="true">
          <div className="announceModalCard">
            <div className="announceHeaderRow" style={{ marginBottom: 16 }}>
              <div>
                <span className="announceStepTag">Edit Message</span>
                <h3 className="announceTitle">Modify Announcement</h3>
                <p className="announceSubtitle">Update subject, message, or file attachments for this announcement.</p>
              </div>
            </div>

            <div className="announceInputGroup" style={{ marginBottom: 14 }}>
              <label className="announceInputLabel">
                Subject Line <span>{editTitle.length}/160</span>
              </label>
              <input
                required
                maxLength={160}
                className="announceInput"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="announceInputGroup" style={{ marginBottom: 16 }}>
              <label className="announceInputLabel">
                Message Content <span>{editMessage.length}/5000</span>
              </label>
              <textarea
                required
                rows={4}
                maxLength={5000}
                className="announceTextarea"
                value={editMessage}
                onChange={e => setEditMessage(e.target.value)}
                disabled={saving}
              />
            </div>

            {/* Edit Attachment */}
            <div className="announceInputGroup" style={{ marginBottom: 20 }}>
              <label className="announceInputLabel">File Attachment</label>
              <input
                type="file"
                ref={editFileInputRef}
                style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file, true);
                }}
              />

              {!editAttachment ? (
                <button
                  type="button"
                  className="announceBtnSecondary"
                  onClick={() => editFileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading…" : "📎 Add Attachment"}
                </button>
              ) : (
                <div className="announceFileChip">
                  <span>📄 {editAttachment.name} ({formatBytes(editAttachment.size)})</span>
                  <button
                    type="button"
                    className="announceFileChipRemove"
                    onClick={() => {
                      setEditAttachment(null);
                      if (editFileInputRef.current) editFileInputRef.current.value = "";
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="announceBtnSecondary"
                onClick={() => setEditingItem(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="announceBtnPrimary"
                onClick={() => void saveEdit()}
                disabled={saving || !editTitle.trim() || !editMessage.trim()}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="announceModalBackdrop" role="dialog" aria-modal="true">
          <div className="announceModalCard" style={{ maxWidth: 440 }}>
            <div className="announceHeaderRow" style={{ marginBottom: 14 }}>
              <div>
                <span className="announceStepTag" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                  Confirm Removal
                </span>
                <h3 className="announceTitle">
                  {activeView === "inbox" ? "Remove from Inbox?" : "Archive Sent Announcement?"}
                </h3>
                <p className="announceSubtitle">
                  {activeView === "inbox"
                    ? "This message will be removed from your personal inbox view. The official institutional record is securely retained in college administrative archives."
                    : "This announcement will be archived and removed from your dispatch history."}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                className="announceBtnSecondary"
                onClick={() => setDeleteId(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="announceBtnDanger"
                style={{ height: 38, padding: "0 16px" }}
                onClick={() => void confirmDelete()}
                disabled={saving}
              >
                {saving ? "Processing…" : activeView === "inbox" ? "Remove from Inbox" : "Confirm Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
