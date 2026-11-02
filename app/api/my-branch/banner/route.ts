import { NextResponse, type NextRequest } from "next/server";
import { withSecurity } from "@/lib/api-auth";

const MANAGE = ["Faculty", "Coordinator", "Main Admin"];
const VIEW = ["Student", "Faculty", "Placement Cell", "Coordinator", "Volunteer", "Main Admin"];
const BUCKET = "my-branch-media";
const headers = { "Cache-Control": "no-store, max-age=0" };

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers });
}
function folder(department: string) {
  return department.normalize("NFKD").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "department";
}
async function actorFor(client: any, id: string) {
  const { data, error } = await client.from("profiles")
    .select("role,account_status,department").eq("id", id).maybeSingle();
  if (error || !data || !VIEW.includes(data.role) ||
      (data.account_status || "Active") !== "Active") return null;
  return { id, role: String(data.role), department: String(data.department || "").trim() };
}
async function resolveBranch(client: any, actor: any, requested: string) {
  if (actor.role !== "Main Admin") {
    if (!actor.department) throw new Error("Your profile needs a department assignment.");
    if (requested && requested !== actor.department) throw new Error("You can only access your own department.");
    return actor.department;
  }
  const { data, error } = await client.from("profiles")
    .select("department").not("department", "is", null).limit(5000);
  if (error) throw new Error("Could not load departments.");
  const list = [...new Set((data || []).map((x: {department?: string}) =>
    String(x.department || "").trim()).filter(Boolean))];
  const branch = requested || (list.includes(actor.department) ? actor.department : list[0]);
  if (!branch || !list.includes(branch)) throw new Error("Choose a valid department.");
  return branch;
}
function manager(actor: any) { return actor && MANAGE.includes(actor.role); }
function validUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.length > 500) throw new Error("Link is too long.");
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Links must use HTTP or HTTPS.");
  return url.toString();
}
function validImage(path: string, department: string) {
  return !path || (
    path.startsWith(`${folder(department)}/banner/`) &&
    !path.includes("..") && !path.startsWith("/")
  );
}

const readOptions = {
  requireAuth: true, allowedRoles: VIEW, requireBody: false, maxBodySize: 16 * 1024,
};
const writeOptions = {
  requireAuth: true, allowedRoles: MANAGE, requireBody: false, maxBodySize: 16 * 1024,
};

export const GET = withSecurity(async (request: NextRequest, { session }) => {
  const actor = await actorFor(session.adminClient, session.user.id);
  if (!actor) return fail("An active campus account is required.", 403);
  try {
    const department = await resolveBranch(
      session.adminClient, actor, (request.nextUrl.searchParams.get("branch") || "").trim()
    );
    const { data, error } = await session.adminClient.from("branch_hub_banners")
      .select("*").eq("department", department).maybeSingle();
    if (error) {
      console.error("[My Branch banner] Read failed:", error.message);
      return fail("Could not load the branch banner. Check the banner migration.", 503);
    }
    if (!data || (!manager(actor) && data.status !== "published")) {
      return NextResponse.json({ department, banner: null }, { headers });
    }
    let imageUrl = "";
    if (data.image_path) {
      const { data: signed, error: signError } = await session.adminClient.storage
        .from(BUCKET).createSignedUrl(data.image_path, 3600);
      if (!signError) imageUrl = signed?.signedUrl || "";
    }
    return NextResponse.json({ department, banner: { ...data, image_url: imageUrl } }, { headers });
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : "Could not load banner.", 400);
  }
}, { ...readOptions, rateLimit: { windowMs: 60000, maxRequests: 60, keyPrefix: "my-branch-banner-get" } });

export const POST = withSecurity(async (request: NextRequest, { session }) => {
  const actor = await actorFor(session.adminClient, session.user.id);
  if (!actor || !MANAGE.includes(actor.role)) return fail("Only Faculty, Coordinators and Main Admin can manage the banner.", 403);
  let body: any;
  try { body = await request.json(); } catch { return fail("Send valid JSON."); }

  try {
    const department = await resolveBranch(session.adminClient, actor, String(body.department || "").trim());
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const imagePath = String(body.image_path || "").trim();
    if (!title || title.length > 160) return fail("Banner title is required and must be at most 160 characters.");
    if (description.length > 1000) return fail("Banner description is too long.");
    if (!validImage(imagePath, department)) return fail("Upload a banner image belonging to this department.");

    let linkUrl = "";
    try { linkUrl = validUrl(body.link_url); }
    catch (cause) { return fail(cause instanceof Error ? cause.message : "Invalid link."); }

    const { data, error } = await session.adminClient.from("branch_hub_banners")
      .upsert({
        department, title, description, image_path: imagePath, link_url: linkUrl,
        status: body.status === "draft" ? "draft" : "published",
        created_by: session.user.id, updated_at: new Date().toISOString(),
      }, { onConflict: "department" }).select("*").single();

    if (error || !data) {
      console.error("[My Branch banner] Save failed:", error?.message);
      return fail("Could not save the banner.", 503);
    }
    return NextResponse.json({ ok: true, banner: data }, { headers });
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : "Could not save banner.", 400);
  }
}, { ...writeOptions, rateLimit: { windowMs: 60000, maxRequests: 30, keyPrefix: "my-branch-banner-post" } });

export const DELETE = withSecurity(async (request: NextRequest, { session }) => {
  const actor = await actorFor(session.adminClient, session.user.id);
  if (!actor || !MANAGE.includes(actor.role)) return fail("Only Faculty, Coordinators and Main Admin can remove the banner.", 403);
  try {
    const department = await resolveBranch(
      session.adminClient, actor, (request.nextUrl.searchParams.get("branch") || "").trim()
    );
    const { data: current, error: lookupError } = await session.adminClient.from("branch_hub_banners")
      .select("image_path").eq("department", department).maybeSingle();
    if (lookupError) return fail("Could not locate banner.", 500);
    const { error } = await session.adminClient.from("branch_hub_banners").delete().eq("department", department);
    if (error) return fail("Could not remove banner.", 500);
    if (current?.image_path) {
      await session.adminClient.storage.from(BUCKET).remove([current.image_path]);
    }
    return NextResponse.json({ ok: true }, { headers });
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : "Could not remove banner.", 400);
  }
}, { ...writeOptions, rateLimit: { windowMs: 60000, maxRequests: 20, keyPrefix: "my-branch-banner-delete" } });
