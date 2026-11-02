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
async function departments(client: any) {
  const { data, error } = await client.from("profiles")
    .select("department").not("department", "is", null).limit(5000);
  if (error) throw new Error("Could not load departments.");
  return [...new Set((data || []).map((x: {department?: string}) =>
    String(x.department || "").trim()).filter(Boolean))];
}
async function resolveBranch(client: any, actor: any, requested: string) {
  if (actor.role !== "Main Admin") {
    if (!actor.department) throw new Error("Your profile needs a department assignment.");
    if (requested && requested !== actor.department) throw new Error("You can only access your own department.");
    return actor.department;
  }
  const list = await departments(client);
  const branch = requested || (list.includes(actor.department) ? actor.department : list[0]);
  if (!branch || !list.includes(branch)) throw new Error("Choose a valid department.");
  return branch;
}
function validMediaPath(path: string, department: string) {
  return path.startsWith(`${folder(department)}/gallery/`) &&
    !path.includes("..") && !path.startsWith("/");
}
function manager(actor: any) {
  return actor && MANAGE.includes(actor.role);
}

const readOptions = {
  requireAuth: true, allowedRoles: VIEW, requireBody: false, maxBodySize: 16 * 1024,
};
const writeOptions = {
  requireAuth: true, allowedRoles: MANAGE, requireBody: false, maxBodySize: 64 * 1024,
};

export const GET = withSecurity(async (request: NextRequest, { session }) => {
  const actor = await actorFor(session.adminClient, session.user.id);
  if (!actor) return fail("An active campus account is required.", 403);
  try {
    const department = await resolveBranch(
      session.adminClient, actor, (request.nextUrl.searchParams.get("branch") || "").trim()
    );
    let query = session.adminClient.from("branch_hub_gallery").select("*")
      .eq("department", department).order("created_at", { ascending: false }).limit(200);
    if (!manager(actor)) query = query.eq("status", "published");
    const { data, error } = await query;
    if (error) {
      console.error("[My Branch gallery] Read failed:", error.message);
      return fail("Could not load the branch gallery. Check the gallery migration.", 503);
    }

    const rows = data || [];
    const paths = [...new Set(rows.map((x: any) => String(x.image_path || "")).filter(Boolean))];
    let signedByPath = new Map<string, string>();
    if (paths.length) {
      const { data: signed, error: signedError } = await session.adminClient.storage
        .from(BUCKET).createSignedUrls(paths, 3600);
      if (!signedError) {
        signedByPath = new Map((signed || []).map((x: any) => [x.path, x.signedUrl || ""]));
      } else {
        console.error("[My Branch gallery] Signing failed:", signedError.message);
      }
    }
    return NextResponse.json({
      department,
      entries: rows.map((x: any) => ({ ...x, image_url: signedByPath.get(x.image_path) || "" })),
    }, { headers });
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : "Could not load gallery.", 400);
  }
}, { ...readOptions, rateLimit: { windowMs: 60000, maxRequests: 60, keyPrefix: "my-branch-gallery-get" } });

export const POST = withSecurity(async (request: NextRequest, { session }) => {
  const actor = await actorFor(session.adminClient, session.user.id);
  if (!actor || !MANAGE.includes(actor.role)) return fail("Only Faculty, Coordinators and Main Admin can manage the gallery.", 403);

  let body: any;
  try { body = await request.json(); } catch { return fail("Send valid JSON."); }
  try {
    const department = await resolveBranch(session.adminClient, actor, String(body.department || "").trim());
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const imagePath = String(body.image_path || "").trim();
    const status = body.status === "draft" ? "draft" : "published";
    if (!title || title.length > 160) return fail("Gallery title is required and must be at most 160 characters.");
    if (description.length > 2000) return fail("Description is too long.");
    if (!validMediaPath(imagePath, department)) return fail("Upload an image belonging to this department first.");

    const { data, error } = await session.adminClient.from("branch_hub_gallery")
      .insert({ department, title, description, image_path: imagePath, status, created_by: session.user.id })
      .select("*").single();
    if (error || !data) {
      console.error("[My Branch gallery] Insert failed:", error?.message);
      return fail("Could not save the gallery item.", 503);
    }
    return NextResponse.json({ ok: true, entry: data }, { status: 201, headers });
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : "Could not save gallery item.", 400);
  }
}, { ...writeOptions, rateLimit: { windowMs: 60000, maxRequests: 30, keyPrefix: "my-branch-gallery-post" } });

export const PATCH = withSecurity(async (request: NextRequest, { session }) => {
  const actor = await actorFor(session.adminClient, session.user.id);
  if (!actor || !MANAGE.includes(actor.role)) return fail("Only Faculty, Coordinators and Main Admin can manage the gallery.", 403);
  let body: any;
  try { body = await request.json(); } catch { return fail("Send valid JSON."); }

  const id = String(body.id || "").trim();
  if (!id) return fail("Gallery item ID is required.");
  const { data: current, error: lookupError } = await session.adminClient.from("branch_hub_gallery")
    .select("id,department,image_path").eq("id", id).maybeSingle();
  if (lookupError) return fail("Could not locate gallery item.", 500);
  if (!current) return fail("Gallery item not found.", 404);
  if (actor.role !== "Main Admin" && current.department !== actor.department)
    return fail("You can only manage your own department's gallery.", 403);

  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const imagePath = String(body.image_path || current.image_path || "").trim();
  if (!title || title.length > 160) return fail("Gallery title is required and must be at most 160 characters.");
  if (description.length > 2000) return fail("Description is too long.");
  if (!validMediaPath(imagePath, current.department)) return fail("Invalid gallery image path.");

  const { data, error } = await session.adminClient.from("branch_hub_gallery")
    .update({
      title, description, image_path: imagePath,
      status: body.status === "draft" ? "draft" : "published",
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("department", current.department).select("*").maybeSingle();

  if (error) return fail("Could not update gallery item.", 500);
  if (!data) return fail("Gallery item not found.", 404);

  if (current.image_path && current.image_path !== imagePath) {
    await session.adminClient.storage.from(BUCKET).remove([current.image_path]);
  }
  return NextResponse.json({ ok: true, entry: data }, { headers });
}, { ...writeOptions, rateLimit: { windowMs: 60000, maxRequests: 40, keyPrefix: "my-branch-gallery-patch" } });

export const DELETE = withSecurity(async (request: NextRequest, { session }) => {
  const actor = await actorFor(session.adminClient, session.user.id);
  if (!actor || !MANAGE.includes(actor.role)) return fail("Only Faculty, Coordinators and Main Admin can manage the gallery.", 403);
  const id = (request.nextUrl.searchParams.get("id") || "").trim();
  if (!id) return fail("Gallery item ID is required.");

  const { data: current, error: lookupError } = await session.adminClient.from("branch_hub_gallery")
    .select("id,department,image_path").eq("id", id).maybeSingle();
  if (lookupError) return fail("Could not locate gallery item.", 500);
  if (!current) return fail("Gallery item not found.", 404);
  if (actor.role !== "Main Admin" && current.department !== actor.department)
    return fail("You can only manage your own department's gallery.", 403);

  const { error } = await session.adminClient.from("branch_hub_gallery")
    .delete().eq("id", id).eq("department", current.department);
  if (error) return fail("Could not delete gallery item.", 500);
  if (current.image_path) {
    await session.adminClient.storage.from(BUCKET).remove([current.image_path]);
  }
  return NextResponse.json({ ok: true }, { headers });
}, { ...writeOptions, rateLimit: { windowMs: 60000, maxRequests: 30, keyPrefix: "my-branch-gallery-delete" } });
