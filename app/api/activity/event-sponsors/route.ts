import { NextRequest, NextResponse } from "next/server";
import { withSecurity, createAdminClient, getUserRole, authenticateRequest } from "@/lib/api-auth";

const BUCKET = "campus-content";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MANAGER_ROLES = ["Main Admin", "Coordinator"];

function normalizeSponsorWebsite(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol) || !url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}


function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/\.{2,}/g, ".");
  return cleaned.slice(-100) || "sponsor-logo.webp";
}

async function uploadLogo(client: ReturnType<typeof createAdminClient>, userId: string, file: File) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Only PNG, JPEG and WebP logo images are supported.");
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) throw new Error("Logo image must be between 1 byte and 5 MB.");
  const objectPath = `activity-event-sponsors/${userId}/${crypto.randomUUID()}-${safeFileName(file.name || "sponsor-logo.webp")}`;
  const { error } = await client.storage.from(BUCKET).upload(objectPath, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error("Could not upload logo to Supabase Storage.");
  const { data } = client.storage.from(BUCKET).getPublicUrl(objectPath);
  return { objectPath, imageUrl: data.publicUrl };
}

export const GET = withSecurity(
  async (request: NextRequest, { session }) => {
    let adminClient = session?.adminClient;
    let isManager = false;
    if (!adminClient) {
      const authHeader = request.headers.get("authorization");
      if (authHeader) {
        const authResult = await authenticateRequest(request);
        if (!(authResult instanceof NextResponse)) {
          adminClient = authResult.adminClient;
          const role = await getUserRole(adminClient, authResult.user.id);
          isManager = (role !== null && MANAGER_ROLES.includes(role));
        }
      }
    } else if (session?.user?.id) {
      const role = await getUserRole(adminClient, session.user.id);
      isManager = (role !== null && MANAGER_ROLES.includes(role));
    }
    if (!adminClient) adminClient = createAdminClient();
    let query = adminClient.from("activity_event_sponsors")
      .select("id, name, image_url, website_url, is_active, display_order, created_at")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (!isManager) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Could not load sponsor logos. Apply the sponsor migration and try again." }, { status: 500 });
    return NextResponse.json({ sponsors: data || [] }, { headers: { "Cache-Control": "no-store" } });
  },
  { requireAuth: false, requireBody: false, rateLimit: { windowMs: 60_000, maxRequests: 90, keyPrefix: "activity-sponsors-get" } },
);

export const POST = withSecurity(
  async (request: NextRequest, { session }) => {
    const form = await request.formData();
    const name = String(form.get("name") || "").trim();
    const websiteUrl = normalizeSponsorWebsite(String(form.get("website_url") || ""));
    if (!websiteUrl) {
      return NextResponse.json(
        { error: "Enter a valid official website URL starting with https://." },
        { status: 400 }
      );
    }

    const file = form.get("file");
    const isActive = String(form.get("is_active") ?? "true") === "true";
    const displayOrder = Number.parseInt(String(form.get("display_order") || "0"), 10);
    if (!name || name.length > 90) return NextResponse.json({ error: "Sponsor name is required and must be 90 characters or fewer." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a logo image to upload." }, { status: 400 });
    let uploaded: { objectPath: string; imageUrl: string } | null = null;
    try {
      const client = session.adminClient;
      uploaded = await uploadLogo(client, session.user.id, file);
      const { data, error } = await client.from("activity_event_sponsors").insert({
        name, website_url: websiteUrl,  image_url: uploaded.imageUrl, storage_path: uploaded.objectPath, is_active: isActive,
        display_order: Number.isFinite(displayOrder) ? Math.min(9999, Math.max(0, displayOrder)) : 0,
        created_by: session.user.id, updated_by: session.user.id,
      }).select("id, name, image_url, website_url, is_active, display_order, created_at").single();
      if (error || !data) {
        await client.storage.from(BUCKET).remove([uploaded.objectPath]);
        return NextResponse.json({ error: "Logo uploaded but sponsor record could not be saved." }, { status: 500 });
      }
      return NextResponse.json({ ok: true, sponsor: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (reason) {
      if (uploaded) await session.adminClient.storage.from(BUCKET).remove([uploaded.objectPath]);
      return NextResponse.json({ error: reason instanceof Error ? reason.message : "Sponsor upload failed." }, { status: 400 });
    }
  },
  { requireAuth: true, allowedRoles: MANAGER_ROLES, maxBodySize: MAX_FILE_SIZE + 64 * 1024, requireBody: false, rateLimit: { windowMs: 60_000, maxRequests: 20, keyPrefix: "activity-sponsors-post" } },
);

export const PATCH = withSecurity(
  async (request: NextRequest, { session }) => {
    const form = await request.formData();
    const id = String(form.get("id") || "").trim();
    const name = String(form.get("name") || "").trim();
    const rawWebsiteUrl = String(form.get("website_url") || "").trim();
    const websiteUrl = rawWebsiteUrl ? normalizeSponsorWebsite(rawWebsiteUrl) : null;
    if (rawWebsiteUrl && !websiteUrl) {
      return NextResponse.json(
        { error: "Enter a valid official website URL starting with https://." },
        { status: 400 }
      );
    }

    if (!id || !name || name.length > 90) return NextResponse.json({ error: "A valid sponsor ID and name are required." }, { status: 400 });
    const client = session.adminClient;
    const { data: current, error: fetchError } = await client.from("activity_event_sponsors")
      .select("id, storage_path").eq("id", id).maybeSingle();
    if (fetchError || !current) return NextResponse.json({ error: "Sponsor not found." }, { status: 404 });

    const file = form.get("file");
    let uploaded: { objectPath: string; imageUrl: string } | null = null;
    try {
      if (file instanceof File && file.size > 0) uploaded = await uploadLogo(client, session.user.id, file);
      const rawOrder = Number.parseInt(String(form.get("display_order") || "0"), 10);
      const updates: Record<string, string | boolean | number | null> = {
        name,
        website_url: websiteUrl,
        is_active: String(form.get("is_active") ?? "true") === "true",
        display_order: Number.isFinite(rawOrder) ? Math.min(9999, Math.max(0, rawOrder)) : 0,
        updated_by: session.user.id,
        updated_at: new Date().toISOString(),
      };
      if (uploaded) {
        updates.image_url = uploaded.imageUrl;
        updates.storage_path = uploaded.objectPath;
      }
      const { data, error } = await client.from("activity_event_sponsors").update(updates)
        .eq("id", id).select("id, name, image_url, website_url, is_active, display_order, created_at").single();
      if (error || !data) {
        if (uploaded) await client.storage.from(BUCKET).remove([uploaded.objectPath]);
        return NextResponse.json({ error: "Could not update sponsor." }, { status: 500 });
      }
      if (uploaded && current.storage_path) await client.storage.from(BUCKET).remove([current.storage_path]);
      return NextResponse.json({ ok: true, sponsor: data }, { headers: { "Cache-Control": "no-store" } });
    } catch (reason) {
      if (uploaded) await client.storage.from(BUCKET).remove([uploaded.objectPath]);
      return NextResponse.json({ error: reason instanceof Error ? reason.message : "Could not update sponsor." }, { status: 400 });
    }
  },
  { requireAuth: true, allowedRoles: MANAGER_ROLES, maxBodySize: MAX_FILE_SIZE + 64 * 1024, requireBody: false, rateLimit: { windowMs: 60_000, maxRequests: 40, keyPrefix: "activity-sponsors-patch" } },
);

export const DELETE = withSecurity(
  async (request: NextRequest, { session }) => {
    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return NextResponse.json({ error: "Sponsor ID is required." }, { status: 400 });
    const client = session.adminClient;
    const { data: current, error: fetchError } = await client.from("activity_event_sponsors")
      .select("id, storage_path").eq("id", id).maybeSingle();
    if (fetchError || !current) return NextResponse.json({ error: "Sponsor not found." }, { status: 404 });
    const { error } = await client.from("activity_event_sponsors").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Could not delete sponsor record." }, { status: 500 });
    if (current.storage_path) await client.storage.from(BUCKET).remove([current.storage_path]);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  },
  { requireAuth: true, allowedRoles: MANAGER_ROLES, requireBody: false, rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: "activity-sponsors-delete" } },
);
