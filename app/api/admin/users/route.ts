import {createClient} from "@supabase/supabase-js";

type CampusRole =
  | "Student"
  | "Faculty"
  | "Coordinator"
  | "Volunteer"
  | "Placement Cell"
  | "Main Admin";

const VALID_ROLES: CampusRole[] = [
  "Student",
  "Faculty",
  "Coordinator",
  "Volunteer",
  "Placement Cell",
  "Main Admin",
];

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "";

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase server configuration is incomplete."
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function getRequestUserRole(request: Request) {
  const authorization =
    request.headers.get("authorization") || "";

  const accessToken =
    authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

  if (!accessToken) {
    throw new Error("Authentication required.");
  }

  const admin = adminClient();

  const {
    data: {user},
    error: userError,
  } = await admin.auth.getUser(accessToken);

  if (userError || !user) {
    throw new Error("Invalid or expired session.");
  }

  const {data: profile, error: profileError} =
    await admin
      .from("profiles")
      .select("id,role,account_status")
      .eq("id", user.id)
      .single();

  if (profileError || !profile) {
    throw new Error("Campus profile not found.");
  }

  if (profile.role !== "Main Admin") {
    throw new Error("Main Admin permission required.");
  }

  if (
    profile.account_status &&
    profile.account_status !== "Active"
  ) {
    throw new Error("Administrator account is not active.");
  }

  return {
    user,
    admin,
  };
}

export async function POST(request: Request) {
  try {
    const {admin} = await getRequestUserRole(request);

    type CreateCampusUserBody = {
      full_name?: string;
      email?: string;
      password?: string;
      role?: string;
      department?: string;
      graduation_year?: string;
      employee_id?: string;
    };

    const body =
      (await request.json()) as CreateCampusUserBody;

    const fullName = String(body.full_name || "").trim();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");

    const role =
      String(body.role || "") as CampusRole;

    const department =
      String(body.department || "ECE").trim();

    const graduationYear =
      String(body.graduation_year || "").trim();

    const employeeId =
      String(body.employee_id || "").trim();

    if (fullName.length < 2) {
      return Response.json(
        {error: "Full name is required."},
        {status: 400}
      );
    }

    if (!email || !email.includes("@")) {
      return Response.json(
        {error: "A valid institutional email is required."},
        {status: 400}
      );
    }

    if (password.length < 8) {
      return Response.json(
        {
          error:
            "Temporary password must contain at least 8 characters.",
        },
        {status: 400}
      );
    }

    if (!VALID_ROLES.includes(role)) {
      return Response.json(
        {error: "Invalid CampusConnect role."},
        {status: 400}
      );
    }

    const {data: created, error: createError} =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: role !== "Student",
        user_metadata: {
          full_name: fullName,
          department,
          graduation_year:
            graduationYear || "2027",
        },
      });

    if (createError || !created.user) {
      return Response.json(
        {
          error:
            createError?.message ||
            "Unable to create account.",
        },
        {status: 400}
      );
    }

    const userId = created.user.id;

    const {error: profileError} = await admin
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        role,
        department,
        graduation_year:
          graduationYear || "2027",
        employee_id: employeeId || null,
        account_status: "Active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      // Avoid leaving an orphan auth account.
      await admin.auth.admin.deleteUser(userId);

      return Response.json(
        {error: profileError.message},
        {status: 400}
      );
    }

    return Response.json({
      success: true,
      user: {
        id: userId,
        full_name: fullName,
        email,
        role,
        department,
        graduation_year:
          graduationYear || "2027",
        account_status: "Active",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create campus account.";

    const status =
      message.includes("permission") ? 403 : 401;

    return Response.json(
      {error: message},
      {status}
    );
  }
}
