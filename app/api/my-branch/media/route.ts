import { NextResponse, type NextRequest } from "next/server";
import { Buffer } from "node:buffer";
import { withSecurity } from "@/lib/api-auth";

export const runtime = "nodejs";

const MANAGE_ROLES = ["Faculty", "Coordinator", "Main Admin"];
const HEADERS = { "Cache-Control": "no-store, max-age=0" };
const BUCKET = "my-branch-media";
const MAX_BYTES = 15 * 1024 * 1024;

type Actor = { id: string; role: string; department: string };

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
  "text/csv": "csv",
};

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: HEADERS });
}

function departmentFolder(department: string) {
  return department.normalize("NFKD").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "department";
}

async function actorFor(client: any, id: string): Promise<Actor | null> {
  const { data, error } = await client.from("profiles")
    .select("role,account_status,department").eq("id", id).maybeSingle();

  if (error || !data || !MANAGE_ROLES.includes(data.role) ||
      (data.account_status || "Active") !== "Active") return null;

  return {
    id,
    role: String(data.role),
    department: String(data.department || "").trim(),
  };
}

async function resolveDepartment(client: any, actor: Actor, requested: string) {
  if (actor.role !== "Main Admin") {
    if (!actor.department) throw new Error("Your profile has no department assigned.");
    if (requested && requested !== actor.department) {
      throw new Error("You can only manage media for your assigned department.");
    }
    return actor.department;
  }

  if (!requested) throw new Error("Choose a department.");
  const { data, error } = await client.from("profiles")
    .select("department").not("department", "is", null).limit(5000);

  if (error) throw new Error("Could not validate the selected department.");

  const departments = [...new Set((data || []).map((row: {department?: string}) =>
    String(row.department || "").trim()).filter(Boolean))];

  if (!departments.includes(requested)) throw new Error("Choose a valid department.");
  return requested;
}

function signedResult(result: any) {
  return result?.data?.signedUrl || "";
}

const uploadOptions = {
  requireAuth: true,
  allowedRoles: MANAGE_ROLES,
  requireBody: false,
  maxBodySize: 16 * 1024 * 1024,
};

export const POST = withSecurity(async (request: NextRequest, { session }) => {
  const actor = await actorFor(session.adminClient, session.user.id);
  if (!actor) return fail("Only active Faculty, Coordinators and Main Admin can upload branch media.", 403);

  try {
    const form = await request.formData();
    const file = form.get("file");
    const category = String(form.get("category") || "");
    const requestedDepartment = String(form.get("department") || "").trim();

    if (!(file instanceof File)) return fail("Choose a file to upload.", 400);
    if (!["student-photo", "attachment", "gallery", "banner"].includes(category)) {
      return fail("Choose a valid upload category.", 400);
    }
    if (!file.size || file.size > MAX_BYTES) {
      return fail("File must be between 1 byte and 15 MiB.", 413);
    }

    const extension = MIME_EXTENSIONS[file.type];
    if (!extension) return fail("This file type is not supported.", 415);

    const imageOnly = category !== "attachment";
    if (imageOnly && !file.type.startsWith("image/")) {
      return fail("This upload requires an image file.", 415);
    }

    const department = await resolveDepartment(
      session.adminClient, actor, requestedDepartment
    );
    const objectPath =
      `${departmentFolder(department)}/${category}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await session.adminClient.storage
      .from(BUCKET)
      .upload(objectPath, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[My Branch media] Upload failed:", uploadError.message);
      return fail("Upload failed. Check that the My Branch media bucket exists.", 503);
    }

    const { data: signed, error: signError } = await session.adminClient.storage
      .from(BUCKET)
      .createSignedUrl(objectPath, 3600);

    if (signError) {
      console.error("[My Branch media] Signed URL failed:", signError.message);
      await session.adminClient.storage.from(BUCKET).remove([objectPath]);
      return fail("Could not create a secure preview URL.", 503);
    }

    return NextResponse.json({
      ok: true,
      path: objectPath,
      signedUrl: signedResult({ data: signed }),
      filename: file.name.slice(0, 200),
      mimeType: file.type,
      size: file.size,
      department,
    }, { status: 201, headers: HEADERS });
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : "Upload failed.", 400);
  }
}, {
  ...uploadOptions,
  rateLimit: { windowMs: 60000, maxRequests: 30, keyPrefix: "my-branch-media-upload" },
});

export const DELETE = withSecurity(async (request: NextRequest, { session }) => {
  const actor = await actorFor(session.adminClient, session.user.id);
  if (!actor) return fail("Only active Faculty, Coordinators and Main Admin can remove branch media.", 403);

  let body: { path?: unknown; department?: unknown; } = {};
  try { body = await request.json(); } catch { return fail("Send valid JSON.", 400); }

  const path = String(body.path || "");
  if (!path || path.includes("..") || path.startsWith("/") || !path.includes("/")) {
    return fail("Invalid media path.", 400);
  }

  try {
    const department = await resolveDepartment(
      session.adminClient, actor, String(body.department || "").trim()
    );

    if (!path.startsWith(`${departmentFolder(department)}/`)) {
      return fail("You cannot remove media from another department.", 403);
    }

    const { error } = await session.adminClient.storage.from(BUCKET).remove([path]);
    if (error) {
      console.error("[My Branch media] Delete failed:", error.message);
      return fail("Could not delete media.", 500);
    }

    return NextResponse.json({ ok: true }, { headers: HEADERS });
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : "Could not delete media.", 400);
  }
}, {
  ...uploadOptions,
  rateLimit: { windowMs: 60000, maxRequests: 30, keyPrefix: "my-branch-media-delete" },
});
