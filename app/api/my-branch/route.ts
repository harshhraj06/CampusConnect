import { NextResponse, type NextRequest } from "next/server";
import { withSecurity } from "@/lib/api-auth";

const MANAGE_ROLES = ["Faculty", "Coordinator", "Main Admin"];
const VIEW_ROLES = ["Student", "Faculty", "Placement Cell", "Coordinator", "Volunteer", "Main Admin"];
const ROLES = MANAGE_ROLES;
const headers = { "Cache-Control": "no-store, max-age=0" };

type Actor = { id: string; role: string; department: string };
type Body = Record<string, unknown>;

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers });
}
async function actorFor(client: any, id: string): Promise<Actor | null> {
  const { data, error } = await client.from("profiles")
    .select("role,account_status,department").eq("id", id).maybeSingle();
  if (error || !data || !VIEW_ROLES.includes(data.role) ||
      (data.account_status || "Active") !== "Active") return null;
  return { id, role: String(data.role), department: String(data.department || "").trim() };
}
async function branchList(client: any) {
  const { data, error } = await client.from("profiles")
    .select("department").not("department", "is", null).order("department").limit(5000);
  if (error) throw new Error("Could not load department list.");
  return [...new Set((data || []).map((row: {department?: string}) =>
    String(row.department || "").trim()).filter(Boolean))].sort();
}
async function branchFor(client: any, actor: Actor, requested: string) {
  if (actor.role !== "Main Admin") {
    if (!actor.department) throw Object.assign(new Error("Your profile has no department assigned. Ask Main Admin to update it."), { status: 403 });
    if (requested && requested !== actor.department) throw Object.assign(new Error("You can only access your assigned department."), { status: 403 });
    return { branch: actor.department, branches: [actor.department] };
  }
  const branches = await branchList(client);
  const branch = requested || (branches.includes(actor.department) ? actor.department : branches[0]);
  if (!branch || !branches.includes(branch)) throw Object.assign(new Error("Choose a valid department from the available list."), { status: 400 });
  return { branch, branches };
}
function field(body: Body, name: string, max: number, required = false) {
  const value = String(body[name] ?? "").trim();
  if (required && !value) throw new Error(`${name.replaceAll("_", " ")} is required.`);
  if (value.length > max) throw new Error(`${name.replaceAll("_", " ")} is too long.`);
  return value;
}
function dateField(value: unknown, label: string): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} is invalid.`);
  return parsed.toISOString();
}
function safeUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.length > 500) throw new Error("Registration URL is too long.");
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Enter a valid registration URL."); }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Registration URL must use HTTPS or HTTP.");
  return url.toString();
}

const MEDIA_BUCKET = "my-branch-media";
const MEDIA_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
]);
const MAX_MEDIA_BYTES = 15 * 1024 * 1024;

function departmentFolder(department: string) {
  return department.normalize("NFKD").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "department";
}

function validateMediaPath(value: unknown, department: string, category: string) {
  const path = String(value ?? "").trim();
  if (!path) return "";
  const prefix = `${departmentFolder(department)}/${category}/`;
  if (path.length > 500 || !path.startsWith(prefix) ||
      path.includes("..") || path.startsWith("/") || path.includes("\\") ||
      path.slice(prefix.length).includes("/")) {
    throw new Error("Media must be uploaded to the correct department first.");
  }
  return path;
}

function validateAttachments(value: unknown, department: string) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error("Attachments must be a list.");
  if (value.length > 10) throw new Error("You can attach up to 10 files per update.");

  return value.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Invalid attachment metadata.");
    const file = item as Record<string, unknown>;
    const path = validateMediaPath(file.path, department, "attachment");
    const filename = String(file.filename ?? "").trim().slice(0, 200);
    const mimeType = String(file.mimeType ?? "").toLowerCase().trim();
    const size = Number(file.size);

    if (!path || !filename) throw new Error("An attachment is missing its file or filename.");
    if (!MEDIA_MIME_TYPES.has(mimeType)) throw new Error("Unsupported attachment file type.");
    if (!Number.isFinite(size) || size < 1 || size > MAX_MEDIA_BYTES) {
      throw new Error("Each attachment must be no larger than 15 MiB.");
    }
    return { path, filename, mimeType, size };
  });
}

function validate(body: Body, department: string) {
  const type = String(body.entry_type || "");
  if (!["achievement", "topper", "event"].includes(type)) throw new Error("Choose a valid update type.");
  const start = dateField(body.event_start, "Date");
  const end = dateField(body.event_end, "End date");
  if (type === "event" && !start) throw new Error("Branch events require a start date.");
  if (start && end && new Date(end).getTime() < new Date(start).getTime()) throw new Error("End date cannot precede start date.");
  return {
    department, entry_type: type,
    title: field(body,"title",160,true),
    summary: field(body,"summary",500), details: field(body,"details",5000),
    person_name: field(body,"person_name",120), award: field(body,"award",200),
    semester: field(body,"semester",40), academic_year: field(body,"academic_year",40),
    event_start: start, event_end: end,
    venue: field(body,"venue",180), registration_url: safeUrl(body.registration_url),
    student_photo_path: validateMediaPath(body.student_photo_path, department, "student-photo"),
    attachments: validateAttachments(body.attachments, department),
    status: body.status === "draft" ? "draft" : "published",
    updated_at: new Date().toISOString(),
  };
}
const options = {
  requireAuth: true, allowedRoles: ROLES, requireBody: false, maxBodySize: 16 * 1024,
};
const viewOptions = { ...options, allowedRoles: VIEW_ROLES };

export const GET = withSecurity(async (request: NextRequest, { session }) => {
  const actor = await actorFor(session.adminClient, session.user.id);
  if (!actor) return fail("An active campus account is required.", 403);
  try {
    const resolved = await branchFor(session.adminClient, actor, (request.nextUrl.searchParams.get("branch") || "").trim());
    let entriesQuery = session.adminClient.from("branch_hub_entries")
      .select("*").eq("department", resolved.branch)
      .order("created_at", { ascending: false }).limit(250);
    if (!MANAGE_ROLES.includes(actor.role)) {
      entriesQuery = entriesQuery.eq("status", "published");
    }
    const { data, error } = await entriesQuery;
    if (error) {
      console.error("[My Branch] Read failed:", error.message);
      return fail("Could not load branch updates. Apply the My Branch migration and try again.", 503);
    }
    const rows = data || [];
    const mediaPaths = rows.flatMap((entry: any) => [
      entry.student_photo_path,
      ...(Array.isArray(entry.attachments) ? entry.attachments.map((file: any) => file?.path) : []),
    ]).filter((path: unknown): path is string => typeof path === "string" && path.length > 0);
    const uniquePaths = [...new Set<string>(mediaPaths)];
    const signedByPath = new Map<string, string>();

    if (uniquePaths.length) {
      const { data: signedFiles, error: signedError } = await session.adminClient
        .storage.from(MEDIA_BUCKET).createSignedUrls(uniquePaths, 3600);
      if (signedError) {
        console.error("[My Branch] Media signing failed:", signedError.message);
      } else {
        for (const item of signedFiles || []) {
          if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
        }
      }
    }

    const entries = rows.map((entry: any) => ({
      ...entry,
      student_photo_url: signedByPath.get(entry.student_photo_path || "") || "",
      attachments: (Array.isArray(entry.attachments) ? entry.attachments : []).map((file: any) => ({
        ...file, signedUrl: signedByPath.get(String(file.path || "")) || "",
      })),
    }));
    return NextResponse.json({ ...resolved, entries }, { headers });
  } catch (error) {
    const e = error as Error & {status?: number};
    return fail(e.message || "Could not load branch.", e.status || 500);
  }
}, { ...viewOptions, rateLimit: { windowMs: 60000, maxRequests: 60, keyPrefix: "my-branch-get" } });

export const POST = withSecurity(async (request: NextRequest, { session }) => {
  const actor = await actorFor(session.adminClient, session.user.id);
  if (!actor || !MANAGE_ROLES.includes(actor.role)) return fail("Only Faculty, Coordinators and Main Admin can manage branch updates.", 403);
  let body: Body;
  try { body = await request.json() as Body; } catch { return fail("Send valid JSON.", 400); }
  try {
    const resolved = await branchFor(session.adminClient, actor, actor.role === "Main Admin" ? String(body.department || "").trim() : "");
    const selectedBranch = String(resolved.branch || "").trim();
    if (!selectedBranch) {
      return fail("A valid department must be selected.", 400);
    }
    const payload = validate(body, selectedBranch);
    const { data, error } = await session.adminClient.from("branch_hub_entries")
      .insert({ ...payload, created_by: session.user.id }).select("*").single();
    if (error || !data) {
      console.error("[My Branch] Insert failed:", error?.message);
      return fail("Could not save the branch update. Check that the migration is applied.", 503);
    }
    return NextResponse.json({ ok: true, entry: data }, { status: 201, headers });
  } catch (error) {
    const e = error as Error & {status?: number};
    return fail(e.message || "Invalid update.", e.status || 400);
  }
}, { ...options, rateLimit: { windowMs: 60000, maxRequests: 30, keyPrefix: "my-branch-post" } });

export const PATCH = withSecurity(async (request: NextRequest, { session }) => {
  const actor = await actorFor(session.adminClient, session.user.id);
  if (!actor || !MANAGE_ROLES.includes(actor.role)) return fail("Only Faculty, Coordinators and Main Admin can manage branch updates.", 403);
  let body: Body;
  try { body = await request.json() as Body; } catch { return fail("Send valid JSON.", 400); }
  const id = String(body.id || "").trim();
  if (!id) return fail("Entry ID is required.", 400);
  const { data: current, error: lookupError } = await session.adminClient.from("branch_hub_entries")
    .select("id,department,student_photo_path,attachments").eq("id", id).maybeSingle();
  if (lookupError) return fail("Could not locate branch update.", 500);
  if (!current) return fail("Branch update not found.", 404);
  if (actor.role !== "Main Admin" && current.department !== actor.department)
    return fail("You can only edit your assigned department.", 403);
  try {
    const payload = validate(body, current.department);
    const { data, error } = await session.adminClient.from("branch_hub_entries")
      .update(payload).eq("id", id).eq("department", current.department).select("*").maybeSingle();
    if (error) return fail("Could not update branch entry.", 500);
    if (!data) return fail("Branch update not found.", 404);

    const retainedPaths = new Set<string>([
      String(payload.student_photo_path || ""),
      ...payload.attachments.map((file: { path: string }) => file.path),
    ].filter(Boolean));
    const obsoletePaths = [
      String(current.student_photo_path || ""),
      ...(Array.isArray(current.attachments)
        ? current.attachments.map((file: { path?: string }) => String(file?.path || ""))
        : []),
    ].filter((path: string) => path && !retainedPaths.has(path));

    if (obsoletePaths.length) {
      const { error: cleanupError } = await session.adminClient.storage
        .from(MEDIA_BUCKET).remove([...new Set(obsoletePaths)]);
      if (cleanupError) console.error("[My Branch] Media cleanup failed:", cleanupError.message);
    }
    return NextResponse.json({ ok: true, entry: data }, { headers });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid update.", 400);
  }
}, { ...options, rateLimit: { windowMs: 60000, maxRequests: 40, keyPrefix: "my-branch-patch" } });

export const DELETE = withSecurity(async (request: NextRequest, { session }) => {
  const actor = await actorFor(session.adminClient, session.user.id);
  if (!actor || !MANAGE_ROLES.includes(actor.role)) return fail("Only Faculty, Coordinators and Main Admin can manage branch updates.", 403);
  const id = (request.nextUrl.searchParams.get("id") || "").trim();
  if (!id) return fail("Entry ID is required.", 400);
  const { data: current, error: lookupError } = await session.adminClient.from("branch_hub_entries")
    .select("id,department").eq("id", id).maybeSingle();
  if (lookupError) return fail("Could not locate branch update.", 500);
  if (!current) return fail("Branch update not found.", 404);
  if (actor.role !== "Main Admin" && current.department !== actor.department)
    return fail("You can only delete your assigned department's updates.", 403);
  const { error } = await session.adminClient.from("branch_hub_entries")
    .delete().eq("id", id).eq("department", current.department);
  if (error) return fail("Could not delete branch update.", 500);
  return NextResponse.json({ ok: true }, { headers });
}, { ...options, rateLimit: { windowMs: 60000, maxRequests: 30, keyPrefix: "my-branch-delete" } });
