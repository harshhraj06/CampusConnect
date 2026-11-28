import { NextResponse } from "next/server";
import { withSecurity } from "@/lib/api-auth";

export const POST = withSecurity(
  async (_request, { session, body }) => {
    const { adminClient, user } = session;
    const dateOfBirth = body && typeof body === "object" && "dateOfBirth" in body
      ? body.dateOfBirth
      : undefined;
    if (typeof dateOfBirth !== "string" && dateOfBirth !== null) {
      return NextResponse.json({ error: "Provide a date of birth or null to clear it." }, { status: 400 });
    }
    const rawDob = dateOfBirth?.trim() ?? "";

    // Validate format if provided
    if (rawDob && !/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
      return NextResponse.json(
        { error: "Invalid date of birth format. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const { error: upsertError } = await adminClient
      .from("student_private_profile_data")
      .upsert(
        {
          student_id: user.id,
          date_of_birth: rawDob || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id" }
      );

    if (upsertError) {
      console.error("API /api/account/dob upsert error:", upsertError);
      return NextResponse.json(
        { error: "Unable to update date of birth in database." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      studentId: user.id,
      dateOfBirth: rawDob || null,
    });
  },
  {
    requireAuth: true,
    requireBody: true,
    maxBodySize: 1024,
  }
);
