"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { getSupabaseClient } from "../../../lib/supabase";


async function sponsorFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const required = method !== "GET";
  const client = getSupabaseClient();

  if (!client) {
    throw new Error(
      "Supabase is not ready. Refresh CampusConnect and sign in again."
    );
  }

  const { data, error } = await client.auth.getSession();
  const token = data.session?.access_token;

  if (!token && required) {
    throw new Error(
      error
        ? "Could not read your session. Please sign in again."
        : "Your session has expired. Please sign in again."
    );
  }

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, { ...init, headers });
}

type Sponsor = {
  id: string;
  name: string;
  image_url: string;
  website_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at?: string;
};

function SponsorLogo({ sponsor }: { sponsor: Sponsor }) {
  const content = (
    <div className="activityPromoSponsorTickerItem" title={sponsor.name}>
      <span className="activityPromoSponsorTickerLogo">
        <img src={sponsor.image_url} alt={`${sponsor.name} logo`} loading="lazy" />
      </span>
      <span className="activityPromoSponsorTickerName">{sponsor.name}</span>
    </div>
  );

  if (!sponsor.website_url) return content;

  return (
    <a
      className="activityPromoSponsorTickerLink"
      href={sponsor.website_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit ${sponsor.name} official website in a new tab`}
    >
      {content}
    </a>
  );
}

export default function ActivityEventSponsors({
  showEmptyState = false,
}: {
  showEmptyState?: boolean;
}) {
  const [sponsors, setSponsors] = React.useState<Sponsor[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [managerOpen, setManagerOpen] = React.useState(false);
  const sponsorDialogRef = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = sponsorDialogRef.current;
    if (managerOpen && dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [managerOpen]);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [websiteUrl, setWebsiteUrl] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [active, setActive] = React.useState(true);
  const [order, setOrder] = React.useState("0");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const loadSponsors = React.useCallback(async () => {
    try {
      const response = await sponsorFetch("/api/activity/event-sponsors", { cache: "no-store" });
      const body = (await response.json()) as {
        error?: string;
        sponsors?: Sponsor[];
        sponsor?: Sponsor;
        ok?: boolean;
      };
      if (!response.ok) throw new Error(body.error || "Could not load sponsors.");
      setSponsors(Array.isArray(body.sponsors) ? body.sponsors : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load sponsors.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSponsors();
  }, [loadSponsors]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setWebsiteUrl("");
    setFile(null);
    setActive(true);
    setOrder("0");
    if (fileRef.current) fileRef.current.value = "";
  }

  function beginEdit(sponsor: Sponsor) {
    setEditingId(sponsor.id);
    setName(sponsor.name);
    setWebsiteUrl(sponsor.website_url ?? "");
    setFile(null);
    setActive(sponsor.is_active);
    setOrder(String(sponsor.display_order));
    if (fileRef.current) fileRef.current.value = "";
    setError("");
    setNotice("");
  }

  async function submitSponsor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!name.trim()) {
      setError("Enter a sponsor or partner name.");
      return;
    }

    let normalizedWebsite: string;
    try {
      const parsed = new URL(websiteUrl.trim());
      if (!["https:", "http:"].includes(parsed.protocol) || !parsed.hostname) {
        throw new Error("Invalid URL");
      }
      normalizedWebsite = parsed.toString();
    } catch {
      setError("Enter a valid official website URL starting with https://.");
      return;
    }
    if (!editingId && !file) {
      setError("Choose a sponsor logo image to upload.");
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      if (editingId) form.set("id", editingId);
      form.set("name", name.trim());
      form.set("website_url", normalizedWebsite);
      form.set("is_active", String(active));
      form.set("display_order", String(Math.max(0, Number.parseInt(order, 10) || 0)));
      if (file) form.set("file", file);
      const response = await sponsorFetch("/api/activity/event-sponsors", {
        method: editingId ? "PATCH" : "POST",
        body: form,
      });
      const body = (await response.json()) as {
        error?: string;
        sponsors?: Sponsor[];
        sponsor?: Sponsor;
        ok?: boolean;
      };
      if (!response.ok) throw new Error(body.error || "Could not save sponsor.");
      resetForm();
      setNotice(editingId ? "Sponsor updated." : "Sponsor uploaded.");
      await loadSponsors();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save sponsor.");
    } finally {
      setSaving(false);
    }
  }

  async function updateSponsor(sponsor: Sponsor, changes: { is_active?: boolean; display_order?: number }) {
    setError("");
    setNotice("");
    const form = new FormData();
    form.set("id", sponsor.id);
    form.set("name", sponsor.name);
    form.set("website_url", sponsor.website_url ?? "");
    form.set("is_active", String(changes.is_active ?? sponsor.is_active));
    form.set("display_order", String(changes.display_order ?? sponsor.display_order));
    try {
      const response = await sponsorFetch("/api/activity/event-sponsors", { method: "PATCH", body: form });
      const body = (await response.json()) as {
        error?: string;
        sponsors?: Sponsor[];
        sponsor?: Sponsor;
        ok?: boolean;
      };
      if (!response.ok) throw new Error(body.error || "Could not update sponsor.");
      await loadSponsors();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update sponsor.");
    }
  }

  async function deleteSponsor(sponsor: Sponsor) {
    if (!window.confirm(`Delete the sponsor “${sponsor.name}”?`)) return;
    setError("");
    setNotice("");
    try {
      const response = await sponsorFetch(`/api/activity/event-sponsors?id=${encodeURIComponent(sponsor.id)}`, { method: "DELETE" });
      const body = (await response.json()) as {
        error?: string;
        sponsors?: Sponsor[];
        sponsor?: Sponsor;
        ok?: boolean;
      };
      if (!response.ok) throw new Error(body.error || "Could not delete sponsor.");
      if (editingId === sponsor.id) resetForm();
      setNotice("Sponsor deleted.");
      await loadSponsors();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete sponsor.");
    }
  }

  const visibleSponsors = sponsors.filter((sponsor) => sponsor.is_active);
  const tickerItems = visibleSponsors.length > 0 ? [...visibleSponsors, ...visibleSponsors] : [];

  if (visibleSponsors.length === 0 && !showEmptyState) return null;

  return (
    <>
      <section className="activityPromoSponsorTicker" aria-label="Event sponsors and partners">
        <div className="activityPromoSponsorTickerLabel">
          <span className="activityPromoSponsorTickerEyebrow">SUPPORTED BY</span>
          <strong>OUR SPONSORS</strong>
          {showEmptyState && (
            <button type="button" className="activityPromoSponsorManageButton" onClick={() => { setManagerOpen(true); setError(""); setNotice(""); }}>
              Manage sponsors
            </button>
          )}
        </div>
        <div className="activityPromoSponsorTickerViewport">
          {visibleSponsors.length > 0 ? (
            <div className="activityPromoSponsorTickerTrack" aria-label={`${visibleSponsors.length} active sponsors`}>
              {tickerItems.map((sponsor, index) => (
                <SponsorLogo key={`${sponsor.id}-${index}`} sponsor={sponsor} />
              ))}
            </div>
          ) : (
            <span className="activityPromoSponsorTickerEmpty">
              {loading ? "Loading sponsors…" : showEmptyState ? "Upload sponsor logos here" : ""}
            </span>
          )}
        </div>
      </section>

      {showEmptyState && managerOpen && typeof document !== "undefined" && createPortal(
        <dialog
          ref={sponsorDialogRef}
          className="activityPromoSponsorNativeDialog"
          aria-label="Sponsor management"
          onCancel={(event) => {
            event.preventDefault();
            setManagerOpen(false);
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setManagerOpen(false);
          }}
        >
          <section
            className="activityPromoSponsorModal"
            aria-labelledby="activityPromoSponsorModalTitle"
          >
            <header className="activityPromoSponsorModalHeader">
              <div>
                <span className="activityPromoSponsorsEyebrow">ACTIVITY CENTER · ADMIN STUDIO</span>
                <h2 id="activityPromoSponsorModalTitle">Sponsor management</h2>
                <p>Upload logos and manage the sponsor ticker displayed inside this event banner.</p>
              </div>
              <button type="button" className="activityPromoSponsorModalClose" aria-label="Close sponsor manager" onClick={() => { setManagerOpen(false); resetForm(); }}>×</button>
            </header>
            <div className="activityPromoSponsorModalBody">
              {error && <p className="activityPromoSponsorFeedback is-error" role="alert">{error}</p>}
              {notice && <p className="activityPromoSponsorFeedback" role="status">{notice}</p>}
              <form className="activityPromoSponsorForm" onSubmit={submitSponsor}>
                <label>
                  <span>Sponsor / partner name</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} maxLength={90} required placeholder="e.g. Campus event partner" />
                </label>
                                <label>
                  <span>Official website URL</span>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(event) => setWebsiteUrl(event.target.value)}
                    maxLength={500}
                    required
                    placeholder="https://www.example.com"
                  />
                  <small>Clicking this sponsor in the ticker opens its website.</small>
                </label>

<label>
                  <span>Logo image {editingId ? "(optional when keeping current logo)" : "(required)"}</span>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required={!editingId} />
                  <small>PNG, JPG or WebP · maximum 5 MB</small>
                </label>
                <div className="activityPromoSponsorFormRow">
                  <label>
                    <span>Display priority</span>
                    <input type="number" min={0} max={9999} value={order} onChange={(event) => setOrder(event.target.value)} />
                  </label>
                  <label className="activityPromoSponsorActiveLabel">
                    <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
                    <span>Show in ticker</span>
                  </label>
                </div>
                <div className="activityPromoSponsorFormActions">
                  {editingId && <button type="button" className="activityPromoSponsorSecondaryButton" onClick={resetForm}>Cancel edit</button>}
                  <button type="submit" className="activityPromoSponsorPrimaryButton" disabled={saving}>{saving ? "Saving…" : editingId ? "Save sponsor" : "Upload sponsor"}</button>
                </div>
              </form>

              <div className="activityPromoSponsorListHeader">
                <h3>Saved sponsors ({sponsors.length})</h3>
                <button type="button" className="activityPromoSponsorSecondaryButton" onClick={() => { resetForm(); setError(""); setNotice(""); }}>Add new</button>
              </div>
              {loading ? <p className="activityPromoSponsorListEmpty">Loading sponsors…</p> : sponsors.length === 0 ? <p className="activityPromoSponsorListEmpty">No sponsors uploaded yet. Add the first logo above.</p> : (
                <div className="activityPromoSponsorAdminList">
                  {sponsors.map((sponsor, index) => (
                    <article className="activityPromoSponsorAdminItem" key={sponsor.id}>
                      <img src={sponsor.image_url} alt="" />
                      <div className="activityPromoSponsorAdminCopy"><strong>{sponsor.name}</strong><small>{sponsor.is_active ? "Visible in ticker" : "Hidden from ticker"} · Priority {sponsor.display_order}</small></div>
                      <div className="activityPromoSponsorAdminActions">
                        <button type="button" title="Move earlier" aria-label={`Move ${sponsor.name} earlier`} disabled={index === 0} onClick={() => void updateSponsor(sponsor, { display_order: Math.max(0, sponsor.display_order - 1) })}>↑</button>
                        <button type="button" title="Move later" aria-label={`Move ${sponsor.name} later`} disabled={index === sponsors.length - 1} onClick={() => void updateSponsor(sponsor, { display_order: sponsor.display_order + 1 })}>↓</button>
                        <button type="button" onClick={() => beginEdit(sponsor)}>Edit</button>
                        <button type="button" onClick={() => void updateSponsor(sponsor, { is_active: !sponsor.is_active })}>{sponsor.is_active ? "Hide" : "Show"}</button>
                        <button type="button" className="is-danger" onClick={() => void deleteSponsor(sponsor)}>Delete</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

          </section>
        </dialog>,
        document.body
      )}
    </>
  );
}
