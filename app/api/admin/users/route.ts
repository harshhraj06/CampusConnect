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


export async function GET(request: Request) {

  try {

    const {
      admin,
    } =
      await getRequestUserRole(
        request
      );


    const [
      profileResult,
      guardianResult,
    ] =
      await Promise.all([

        admin
          .from("profiles")
          .select(
            "id,full_name,email,role,department,graduation_year,usn,created_at"
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(300),

        admin
          .from(
            "student_guardian_contacts"
          )
          .select(
            "student_id,guardian_name,relationship,email,phone,sms_enabled,email_enabled"
          ),

      ]);


    if (
      profileResult.error
    ) {

      return Response.json(
        {
          error:
            profileResult
              .error.message,
        },
        {
          status: 400,
        }
      );

    }


    if (
      guardianResult.error
    ) {

      return Response.json(
        {
          error:
            guardianResult
              .error.message,
        },
        {
          status: 400,
        }
      );

    }


    return Response.json(
      {
        users:
          profileResult.data ||
          [],

        guardianContacts:
          guardianResult.data ||
          [],
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );

  } catch (error) {

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load campus accounts.";


    const status =
      message.includes(
        "Main Admin permission"
      )
        ? 403
        : 401;


    return Response.json(
      {
        error:
          message,
      },
      {
        status,
      }
    );

  }

}


export async function PATCH(request: Request) {

  try {

    const {
      admin,
    } =
      await getRequestUserRole(
        request
      );


    const body =
      (
        await request.json()
      ) as {
        student_id?: string;

        usn?: string;

        guardian?: {
          guardian_name?: string;
          relationship?: string;
          email?: string;
          phone?: string;
          sms_enabled?: boolean;
          email_enabled?: boolean;
        };
      };


    const studentId =
      String(
        body.student_id ||
        ""
      ).trim();


    if (!studentId) {

      return Response.json(
        {
          error:
            "Student account is required.",
        },
        {
          status: 400,
        }
      );

    }


    const {
      data: student,
      error: studentError,
    } =
      await admin
        .from("profiles")
        .select(
          "id,role"
        )
        .eq(
          "id",
          studentId
        )
        .single();


    if (
      studentError ||
      !student
    ) {

      return Response.json(
        {
          error:
            studentError
              ?.message ||
            "Student account was not found.",
        },
        {
          status: 404,
        }
      );

    }


    if (
      student.role !==
      "Student"
    ) {

      return Response.json(
        {
          error:
            "Only Student identity records can be managed here.",
        },
        {
          status: 400,
        }
      );

    }


    const usn =
      String(
        body.usn ||
        ""
      )
        .trim()
        .toUpperCase();


    if (
      usn.length > 80
    ) {

      return Response.json(
        {
          error:
            "USN is too long.",
        },
        {
          status: 400,
        }
      );

    }


    const guardian =
      body.guardian ||
      {};


    const guardianName =
      String(
        guardian.guardian_name ||
        ""
      ).trim();


    const relationship =
      String(
        guardian.relationship ||
        "Parent"
      ).trim() ||
      "Parent";


    const email =
      String(
        guardian.email ||
        ""
      )
        .trim()
        .toLowerCase();


    const phone =
      String(
        guardian.phone ||
        ""
      )
        .trim()
        .replace(
          /[\s()-]/g,
          ""
        );


    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {

      return Response.json(
        {
          error:
            "Enter a valid guardian email address.",
        },
        {
          status: 400,
        }
      );

    }


    if (
      phone &&
      !/^\+?[0-9]{8,15}$/.test(
        phone
      )
    ) {

      return Response.json(
        {
          error:
            "Enter a valid guardian mobile number.",
        },
        {
          status: 400,
        }
      );

    }


    const {
      error: profileError,
    } =
      await admin
        .from("profiles")
        .update({
          usn,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          studentId
        );


    if (
      profileError
    ) {

      return Response.json(
        {
          error:
            profileError.message,
        },
        {
          status: 400,
        }
      );

    }


    const {
      data: savedGuardian,
      error: guardianError,
    } =
      await admin
        .from(
          "student_guardian_contacts"
        )
        .upsert(
          {
            student_id:
              studentId,

            guardian_name:
              guardianName,

            relationship,

            email,

            phone,

            sms_enabled:
              guardian.sms_enabled !==
              false,

            email_enabled:
              guardian.email_enabled !==
              false,

            updated_at:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              "student_id",
          }
        )
        .select(
          "student_id,guardian_name,relationship,email,phone,sms_enabled,email_enabled"
        )
        .single();


    if (
      guardianError
    ) {

      return Response.json(
        {
          error:
            guardianError.message,
        },
        {
          status: 400,
        }
      );

    }


    return Response.json(
      {
        ok: true,

        student: {
          id:
            studentId,

          usn,
        },

        guardian:
          savedGuardian,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );

  } catch (error) {

    const message =
      error instanceof Error
        ? error.message
        : "Unable to update Student identity.";


    const status =
      message.includes(
        "Main Admin permission"
      )
        ? 403
        : 401;


    return Response.json(
      {
        error:
          message,
      },
      {
        status,
      }
    );

  }

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
            (role === "Student" ? graduationYear : ""),
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
          (role === "Student" ? graduationYear : ""),
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
          (role === "Student" ? graduationYear : ""),
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
