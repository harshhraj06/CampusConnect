import { NextResponse } from "next/server";
import { withSecurity } from "@/lib/api-auth";

export const POST = withSecurity(
  async (request, { session }) => {
    const { adminClient, user } = session;
    const body = (await request.json().catch(() => ({}))) as { dateOfBirth?: string };
    const rawDob = typeof body.dateOfBirth === "string" ? body.dateOfBirth.trim() : "";

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
  }
);
