"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { normalizeLegalSections, type LegalDocumentContent, type LegalSection } from "@/lib/legal-content";

type EditorDocument = LegalDocumentContent & {
  status: "draft" | "published";
  current_version: number;
  published_at: string | null;
};

export default function LegalEditor({ slug }: { slug: "privacy" | "terms" }) {
  const [authorized, setAuthorized] = useState(false);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [document, setDocument] = useState<EditorDocument | null>(null);
  const [revisions, setRevisions] = useState<Array<{ version: number; edit_summary: string; created_at: string }>>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const verify = async () => {
      const client = getSupabaseClient();
      if (!client) return;
      const { data: auth } = await client.auth.getUser();
      if (!auth.user) return;
      const { data: profile } = await client.from("profiles").select("role,account_status").eq("id", auth.user.id).maybeSingle();
      if (active && profile?.role === "Main Admin" && profile.account_status === "Active") setAuthorized(true);
    };
    void verify();
    return () => { active = false; };
  }, []);

  const openEditor = async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/legal/${slug}`, { cache: "no-store" });
      const result = await response.json() as { error?: string; document: EditorDocument };
      if (!response.ok) throw new Error(result.error || "Could not load the legal document.");
      setDocument({ ...result.document, sections: normalizeLegalSections(result.document.sections) });
      setEditing(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the legal document.");
    } finally {
      setBusy(false);
    }
  };

  const changeSection = (index: number, update: (section: LegalSection) => LegalSection) => {
    setDocument(current => current && ({ ...current, sections: current.sections.map((section, position) => position === index ? update(section) : section) }));
  };

  const save = async (action: "save_draft" | "publish") => {
    if (!document) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/legal/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...document, action, edit_summary: action === "publish" ? "Published from legal editor" : "Saved draft from legal editor" }),
      });
      const result = await response.json() as { error?: string; document: Partial<EditorDocument> };
      if (!response.ok) throw new Error(result.error || "The change was not saved.");
      setDocument(current => current ? { ...current, ...result.document } : current);
      setMessage(action === "publish" ? "Published successfully." : "Draft saved successfully.");
      if (action === "publish") setEditing(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The change was not saved.");
    } finally {
      setBusy(false);
    }
  };

  const loadRevisions = async () => {
    try {
      const response = await fetch(`/api/admin/legal/${slug}/revisions`, { cache: "no-store" });
      const result = await response.json() as { error?: string; revisions?: typeof revisions };
      if (!response.ok) throw new Error(result.error || "Could not load revision history.");
      setRevisions(result.revisions || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load revision history.");
    }
  };

  const restoreRevision = async (version: number) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/legal/${slug}/revisions/${version}/restore`, { method: "POST" });
      const result = await response.json() as { error?: string; document?: EditorDocument };
      if (!response.ok || !result.document) throw new Error(result.error || "Revision was not restored.");
      setDocument({ ...result.document, sections: normalizeLegalSections(result.document.sections) });
      setMessage(`Revision v${version} restored as a draft. Publish it to make it public.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Revision was not restored.");
    } finally {
      setBusy(false);
    }
  };

  if (!authorized) return null;
  return (
    <section className="ccLegalAdmin" aria-label="Legal document administration">
      {!editing ? <><button type="button" onClick={() => void openEditor()} disabled={busy}>{busy ? "Loading editor…" : "Edit this page"}</button>{message && <p role="status" aria-live="polite">{message}</p>}</> : (
        <>
          <div className="ccLegalEditorBar">
            <strong>{preview ? "Preview" : "Editing draft"}</strong>
            <div>
              <button type="button" onClick={() => setPreview(value => !value)}>{preview ? "Continue editing" : "Preview"}</button>
              {!preview && <button type="button" onClick={() => void save("save_draft")} disabled={busy}>Save draft</button>}
              {!preview && <button type="button" onClick={() => void save("publish")} disabled={busy}>Publish</button>}
              <button type="button" onClick={() => { if (window.confirm("Discard unsaved legal page changes?")) { setEditing(false); setPreview(false); setMessage(""); } }} disabled={busy}>Cancel</button>
            </div>
          </div>
          {message && <p role="status" aria-live="polite">{message}</p>}
          {preview && document && <article className="ccLegalEditorPreview">
            <h2>{document.title}</h2><p>{document.introduction}</p>
            {document.sections.map(section => <section key={section.id}><h3>{section.title}</h3>{section.blocks.map((block, index) => { const next = section.blocks[index + 1]; const previous = section.blocks[index - 1]; if (block.type === "paragraph" && next?.type === "link") return <p key={index}>{block.text}<a href={next.url}>{next.label}</a></p>; if (block.type === "link" && previous?.type === "paragraph") return null; return block.type === "list" ? <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul> : block.type === "link" ? <p key={index}>{block.prefix && `${block.prefix} `}<a href={block.url}>{block.label}</a></p> : block.type === "heading" ? <h4 key={index}>{block.text}</h4> : <p key={index}>{block.text}</p>; })}</section>)}
          </article>}
          {!preview && document && <div className="ccLegalEditorFields">
            <label>Page title<input value={document.title} onChange={event => setDocument({ ...document, title: event.target.value })} /></label>
            <label>Introduction<textarea value={document.introduction} onChange={event => setDocument({ ...document, introduction: event.target.value })} rows={3} /></label>
            <label>Search description<textarea value={document.meta_description} onChange={event => setDocument({ ...document, meta_description: event.target.value })} rows={2} /></label>
            {document.sections.map((section, index) => <fieldset key={section.id}>
              <legend>Section {index + 1}</legend>
              <label>Heading<input value={section.title} onChange={event => changeSection(index, item => ({ ...item, title: event.target.value }))} /></label>
              {section.blocks.map((block, blockIndex) => block.type === "list" ? <label key={blockIndex}>List items, one per line<textarea value={block.items.join("\n")} onChange={event => changeSection(index, item => ({ ...item, blocks: item.blocks.map((entry, position) => position === blockIndex ? { type: "list", items: event.target.value.split("\n") } : entry) }))} rows={4} /></label> : block.type === "link" ? <div className="ccLegalEditorLink" key={blockIndex}><label>Text before link<input value={block.prefix || ""} onChange={event => changeSection(index, item => ({ ...item, blocks: item.blocks.map((entry, position) => position === blockIndex ? { ...block, prefix: event.target.value } : entry) }))} /></label><label>Link text<input value={block.label} onChange={event => changeSection(index, item => ({ ...item, blocks: item.blocks.map((entry, position) => position === blockIndex ? { ...block, label: event.target.value } : entry) }))} /></label><label>Link URL<input value={block.url} onChange={event => changeSection(index, item => ({ ...item, blocks: item.blocks.map((entry, position) => position === blockIndex ? { ...block, url: event.target.value } : entry) }))} /></label></div> : <label key={blockIndex}>{block.type === "heading" ? "Subheading" : "Paragraph"}<textarea value={block.text} onChange={event => changeSection(index, item => ({ ...item, blocks: item.blocks.map((entry, position) => position === blockIndex ? { ...block, text: event.target.value } : entry) }))} rows={3} /></label>)}
              <div className="ccLegalEditorAdd"><button type="button" onClick={() => changeSection(index, item => ({ ...item, blocks: [...item.blocks, { type: "paragraph", text: "" }] }))}>Add paragraph</button><button type="button" onClick={() => changeSection(index, item => ({ ...item, blocks: [...item.blocks, { type: "heading", text: "" }] }))}>Add subheading</button><button type="button" onClick={() => changeSection(index, item => ({ ...item, blocks: [...item.blocks, { type: "list", items: [""] }] }))}>Add list</button><button type="button" onClick={() => changeSection(index, item => ({ ...item, blocks: [...item.blocks, { type: "link", label: "", url: "https://" }] }))}>Add link</button></div>
            </fieldset>)}
            <button type="button" onClick={() => setDocument({ ...document, sections: [...document.sections, { id: `section-${Date.now()}`, title: "", blocks: [] }] })}>Add section</button>
            <details className="ccLegalRevisionHistory" onToggle={event => { if (event.currentTarget.open && revisions.length === 0) void loadRevisions(); }}>
              <summary>Revision history</summary>
              {revisions.length === 0 ? <p>No saved revisions yet.</p> : revisions.map(revision => <div key={revision.version}><span>v{revision.version} · {new Date(revision.created_at).toLocaleString()}</span><span>{revision.edit_summary}</span><button type="button" disabled={busy} onClick={() => void restoreRevision(revision.version)}>Restore as draft</button></div>)}
            </details>
          </div>}
        </>
      )}
    </section>
  );
}