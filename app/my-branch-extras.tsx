"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { LayoutGrid } from "@/components/ui/layout-grid";

type Props = {
  profile: { name: string; department: string; role: string };
  branch: string;
  canManage: boolean;
  section: "banner" | "gallery";
};

type Banner = {
  department: string; title: string; description: string; image_path: string;
  image_url: string; link_url: string; status: "published" | "draft";
};
type GalleryEntry = {
  id: string; department: string; title: string; description: string;
  image_path: string; image_url: string; status: "published" | "draft";
};
type Uploaded = { path: string; signedUrl: string; filename: string; mimeType: string; size: number };

async function authHeaders(extra: Record<string, string> = {}) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Please sign in again.");
  const { data, error } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Authentication required. Please sign in again.");
  return { ...extra, Authorization: `Bearer ${token}` };
}

async function uploadMedia(file: File, category: string, department: string): Promise<Uploaded> {
  const form = new FormData();
  form.set("file", file);
  form.set("category", category);
  form.set("department", department);
  const response = await fetch("/api/my-branch/media", {
    method: "POST", credentials: "same-origin", headers: await authHeaders(), body: form,
  });
  const result = await response.json() as Uploaded & { error?: string };
  if (!response.ok) throw new Error(result.error || "Upload failed.");
  return result;
}

export default function MyBranchExtras({ profile, branch, canManage, section }: Props) {
  const isBanner = section === "banner";
  const [banner, setBanner] = useState<Banner | null>(null);
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerDescription, setBannerDescription] = useState("");
  const [bannerLink, setBannerLink] = useState("");
  const [bannerStatus, setBannerStatus] = useState<"published" | "draft">("published");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [gallery, setGallery] = useState<GalleryEntry[]>([]);
  const [galleryTitle, setGalleryTitle] = useState("");
  const [galleryDescription, setGalleryDescription] = useState("");
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [galleryStatus, setGalleryStatus] = useState<"published" | "draft">("published");
  const [showGalleryForm, setShowGalleryForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!branch) return;
    setLoading(true);
    setError("");
    try {
      const headers = await authHeaders();
      if (isBanner) {
        const response = await fetch(`/api/my-branch/banner?branch=${encodeURIComponent(branch)}`, {
          credentials: "same-origin", cache: "no-store", headers,
        });
        const result = await response.json() as { banner?: Banner | null; error?: string };
        if (!response.ok) throw new Error(result.error || "Could not load featured banner.");
        const current = result.banner || null;
        setBanner(current);
        if (current) {
          setBannerTitle(current.title);
          setBannerDescription(current.description);
          setBannerLink(current.link_url || "");
          setBannerStatus(current.status);
        } else {
          setBannerTitle(""); setBannerDescription(""); setBannerLink(""); setBannerStatus("published");
        }
      } else {
        const response = await fetch(`/api/my-branch/gallery?branch=${encodeURIComponent(branch)}`, {
          credentials: "same-origin", cache: "no-store", headers,
        });
        const result = await response.json() as { entries?: GalleryEntry[]; error?: string };
        if (!response.ok) throw new Error(result.error || "Could not load the gallery.");
        setGallery(result.entries || []);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this section.");
    } finally {
      setLoading(false);
    }
  }, [branch, isBanner]);

  useEffect(() => { void load(); }, [load]);

  async function saveBanner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branch) return;
    setBusy(true); setError(""); setNotice("");
    try {
      let imagePath = banner?.image_path || "";
      if (bannerFile) {
        const uploaded = await uploadMedia(bannerFile, "banner", branch);
        imagePath = uploaded.path;
      }
      const response = await fetch("/api/my-branch/banner", {
        method: "POST", credentials: "same-origin",
        headers: await authHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
        body: JSON.stringify({
          department: branch, title: bannerTitle, description: bannerDescription,
          link_url: bannerLink, image_path: imagePath, status: bannerStatus,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save banner.");
      setBannerFile(null); setShowBannerForm(false);
      setNotice("Featured announcement saved.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save banner.");
    } finally { setBusy(false); }
  }

  async function removeBanner() {
    if (!window.confirm(`Remove the featured announcement for ${branch}?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/my-branch/banner?branch=${encodeURIComponent(branch)}`, {
        method: "DELETE", credentials: "same-origin", headers: await authHeaders(),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not remove banner.");
      setBanner(null); setShowBannerForm(false); setNotice("Featured announcement removed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove banner.");
    } finally { setBusy(false); }
  }

  async function addGalleryItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branch || !galleryFile) { setError("Choose a gallery image first."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const uploaded = await uploadMedia(galleryFile, "gallery", branch);
      const response = await fetch("/api/my-branch/gallery", {
        method: "POST", credentials: "same-origin",
        headers: await authHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
        body: JSON.stringify({
          department: branch, title: galleryTitle, description: galleryDescription,
          image_path: uploaded.path, status: galleryStatus,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save gallery item.");
      setGalleryTitle(""); setGalleryDescription(""); setGalleryFile(null);
      setGalleryStatus("published"); setShowGalleryForm(false);
      setNotice("Photo added to My Branch Gallery.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add photo.");
    } finally { setBusy(false); }
  }

  async function deleteGalleryItem(entry: GalleryEntry) {
    if (!window.confirm(`Delete "${entry.title}" from My Branch Gallery?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/my-branch/gallery?id=${encodeURIComponent(entry.id)}`, {
        method: "DELETE", credentials: "same-origin", headers: await authHeaders(),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not delete gallery item.");
      setNotice("Gallery photo deleted.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete gallery photo.");
    } finally { setBusy(false); }
  }

  if (!branch) return null;

  if (isBanner) {
    return (
      <section className="myBranchFeaturedWrap">
        {banner && banner.status === "published" && (
          <article className="myBranchFeatured">
            {banner.image_url && <img className="myBranchFeaturedImage" src={banner.image_url} alt="" />}
            <div className="myBranchFeaturedContent">
              <span className="myBranchKicker">FEATURED · {branch.toUpperCase()}</span>
              <h2>{banner.title}</h2>
              {banner.description && <p>{banner.description}</p>}
              {banner.link_url && <a href={banner.link_url} target="_blank" rel="noreferrer">Explore announcement ↗</a>}
            </div>
          </article>
        )}
        {canManage && (
          <div className="myBranchFeatureManage">
            <button type="button" className="myBranchQuietButton" onClick={() => setShowBannerForm(v => !v)}>
              {showBannerForm ? "Close banner editor" : banner ? "Edit featured banner" : "＋ Add featured banner"}
            </button>
            {banner && <button type="button" className="myBranchQuietButton" onClick={() => void removeBanner()} disabled={busy}>Remove banner</button>}
          </div>
        )}
        {canManage && showBannerForm && (
          <form className="myBranchEditor myBranchExtrasForm" onSubmit={saveBanner}>
            <div className="myBranchEditorHeading"><div><span className="myBranchKicker">DEPARTMENT PROMOTION</span><h3>Featured announcement</h3></div></div>
            <label>Headline<input required maxLength={160} value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} /></label>
            <label>Description<textarea rows={3} maxLength={1000} value={bannerDescription} onChange={e => setBannerDescription(e.target.value)} /></label>
            <label>Website or registration link<input type="url" maxLength={500} value={bannerLink} onChange={e => setBannerLink(e.target.value)} placeholder="https://..." /></label>
            <label>Banner image (optional)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={e => setBannerFile(e.target.files?.[0] || null)} /></label>
            <label>Publishing<select value={bannerStatus} onChange={e => setBannerStatus(e.target.value as "published" | "draft")}><option value="published">Publish for the branch</option><option value="draft">Save as draft</option></select></label>
            <div className="myBranchEditorFooter"><span>Department: <strong>{branch}</strong></span><button type="submit" className="myBranchPrimaryButton" disabled={busy}>{busy ? "Saving…" : "Save banner"}</button></div>
          </form>
        )}
        {error && <div className="myBranchMessage myBranchError" role="alert">{error}</div>}
        {notice && <div className="myBranchMessage" role="status">{notice}</div>}
      </section>
    );
  }

  const cards = gallery.filter(item => item.image_url).map((item, index) => ({
    id: index + 1,
    className: index % 4 === 0 ? "md:col-span-2" : "col-span-1",
    thumbnail: item.image_url,
    content: (
      <div className="myBranchGalleryCaption">
        <p className="myBranchGalleryCaptionTitle">{item.title}</p>
        <p className="myBranchGalleryCaptionDescription">{item.description}</p>
        {canManage && <button type="button" className="myBranchGalleryDelete" disabled={busy}
          onClick={(event) => { event.stopPropagation(); void deleteGalleryItem(item); }}>Delete photo</button>}
      </div>
    ),
  }));

  return (
    <section className="myBranchGallerySection">
      <div className="myBranchSectionHeading">
        <div><span className="myBranchKicker">MEMORIES & MOMENTS</span><h2>My Branch Gallery</h2>
          <p>Department moments, celebrations and achievements.</p></div>
        {canManage && <button type="button" className="myBranchPrimaryButton" onClick={() => setShowGalleryForm(v => !v)}>＋ Add photo</button>}
      </div>

      {error && <div className="myBranchMessage myBranchError" role="alert">{error}</div>}
      {notice && <div className="myBranchMessage" role="status">{notice}</div>}

      {canManage && showGalleryForm && (
        <form className="myBranchEditor myBranchExtrasForm" onSubmit={addGalleryItem}>
          <div className="myBranchEditorHeading"><div><span className="myBranchKicker">ADD TO THE COLLECTION</span><h3>Gallery photo and caption</h3></div></div>
          <label>Photo title<input required maxLength={160} value={galleryTitle} onChange={e => setGalleryTitle(e.target.value)} /></label>
          <label>Description<textarea rows={3} maxLength={2000} value={galleryDescription} onChange={e => setGalleryDescription(e.target.value)} placeholder="Describe the event, people or achievement." /></label>
          <label>Image<input type="file" required accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={e => setGalleryFile(e.target.files?.[0] || null)} /></label>
          <label>Publishing<select value={galleryStatus} onChange={e => setGalleryStatus(e.target.value as "published" | "draft")}><option value="published">Publish to gallery</option><option value="draft">Save as draft</option></select></label>
          <div className="myBranchEditorFooter"><span>Department: <strong>{branch}</strong></span><button type="submit" className="myBranchPrimaryButton" disabled={busy}>{busy ? "Uploading…" : "Add to gallery"}</button></div>
        </form>
      )}

      {loading ? <div className="myBranchEmpty"><span className="myBranchLoader" /><p>Loading gallery…</p></div>
        : cards.length ? <div className="myBranchGalleryGrid"><LayoutGrid cards={cards} /></div>
        : <div className="myBranchEmpty"><div className="myBranchEmptyMark">MB</div><h3>Gallery is ready for its first photo</h3><p>Published department photos will appear here in the animated layout.</p></div>}
      <div className="myBranchGalleryRoleNote"><span>{branch}</span><span>{canManage ? `${profile.role} · Gallery manager` : "Published department gallery"}</span></div>
    </section>
  );
}
