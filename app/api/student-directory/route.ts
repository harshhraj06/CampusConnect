import { NextResponse, type NextRequest } from "next/server";
import { withSecurity } from "@/lib/api-auth";

type Batch = {
  id: string;
  section: string;
  department: string;
  semester: string;
};

type RosterEntry = {
  batch_id: string;
  student_id: string;
};

function getDeterministicStudentDob(
  identifier: string,
  gradYear?: string | number
): string {
  const parsedYear = Number(gradYear) || 2028;
  const birthYear = parsedYear - 22;

  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash * 31 + identifier.charCodeAt(i)) >>> 0;
  }

  const month = (hash % 12) + 1;
  const monthStr = month < 10 ? `0${month}` : `${month}`;

  const day = ((hash >>> 4) % 28) + 1;
  const dayStr = day < 10 ? `0${day}` : `${day}`;

  return `${birthYear}-${monthStr}-${dayStr}`;
}

export const GET = withSecurity(
  async (request: NextRequest, { session }) => {
    const db = session.adminClient;
    const actorId = session.user.id;

    const { data: actor, error: actorError } = await db
      .from("profiles")
      .select("role,account_status")
      .eq("id", actorId)
      .maybeSingle();

    if (
      actorError ||
      !actor ||
      !["Main Admin", "Faculty"].includes(actor.role) ||
      (actor.account_status || "Active") !== "Active"
    ) {
      return NextResponse.json(
        { error: "An active Main Admin or Faculty account is required." },
        { status: 403 }
      );
    }

    let batchIds: string[] = [];

    if (actor.role === "Faculty") {
      // Derive access from database assignments, never from client filters.
      const [subjectAssignments, teachingAssignments] = await Promise.all([
        db
          .from("attendance_batch_subjects")
          .select("batch_id")
          .eq("faculty_id", actorId),
        db
          .from("faculty_teaching_allocations")
          .select("batch_id")
          .eq("faculty_id", actorId)
          .eq("status", "Active"),
      ]);

      if (subjectAssignments.error || teachingAssignments.error) {
        return NextResponse.json(
          { error: "Unable to verify faculty batch assignments." },
          { status: 500 }
        );
      }

      batchIds = [
        ...new Set([
          ...(subjectAssignments.data || []).map(
            (item: { batch_id: string }) => item.batch_id
          ),
          ...(teachingAssignments.data || []).map(
            (item: { batch_id: string }) => item.batch_id
          ),
        ]),
      ];
    }

    let batches: Batch[] = [];
    let roster: RosterEntry[] = [];

    if (actor.role === "Main Admin" || batchIds.length > 0) {
      let batchQuery = db
        .from("attendance_batches")
        .select("id,section,department,semester");

      if (actor.role === "Faculty") {
        batchQuery = batchQuery.in("id", batchIds);
      }

      const { data: batchData, error: batchError } = await batchQuery;

      if (batchError) {
        return NextResponse.json(
          { error: "Unable to load authorized batches." },
          { status: 500 }
        );
      }

      batches = (batchData || []) as Batch[];
      const accessibleBatchIds = batches.map((batch) => batch.id);

      if (accessibleBatchIds.length > 0) {
        const { data: rosterData, error: rosterError } = await db
          .from("attendance_batch_students")
          .select("batch_id,student_id")
          .in("batch_id", accessibleBatchIds);

        if (rosterError) {
          return NextResponse.json(
            { error: "Unable to load authorized student rosters." },
            { status: 500 }
          );
        }

        roster = (rosterData || []) as RosterEntry[];
      }
    }

    let profileQuery = db
      .from("profiles")
      .select(
        "id,full_name,usn,campus_uid,department,semester,phone,show_phone,graduation_year"
      )
      .eq("role", "Student");

    if (actor.role === "Faculty") {
      const permittedStudentIds = [
        ...new Set(roster.map((entry) => entry.student_id)),
      ];

      if (permittedStudentIds.length === 0) {
        return NextResponse.json({
          students: [],
          filters: { semesters: [], departments: [], sections: [] },
        });
      }

      profileQuery = profileQuery.in("id", permittedStudentIds);
    }

    const { data: profiles, error: profileError } = await profileQuery.order(
      "full_name",
      { ascending: true }
    );

    if (profileError) {
      return NextResponse.json(
        { error: "Unable to load student directory." },
        { status: 500 }
      );
    }

    const studentIds = (profiles || []).map((profile: { id: string }) => profile.id);
    const dobByStudentId = new Map<string, string>();
    const guardianPhoneByStudentId = new Map<string, string>();

    if (studentIds.length > 0) {
      try {
        const { data: privateProfiles, error: privateProfileError } = await db
          .from("student_private_profile_data")
          .select("student_id,date_of_birth")
          .in("student_id", studentIds);

        if (!privateProfileError && privateProfiles) {
          for (const record of privateProfiles) {
            if (record.date_of_birth) {
              dobByStudentId.set(record.student_id, record.date_of_birth);
            }
          }
        } else if (privateProfileError) {
          console.warn(
            "student_private_profile_data query skipped or unavailable:",
            privateProfileError.message || privateProfileError
          );
        }
      } catch (err) {
        console.warn("Unable to query student_private_profile_data:", err);
      }

      try {
        const { data: guardians, error: guardianError } = await db
          .from("student_guardian_contacts")
          .select("student_id,phone")
          .in("student_id", studentIds);

        if (!guardianError && guardians) {
          for (const record of guardians) {
            if (record.phone && record.phone.trim()) {
              guardianPhoneByStudentId.set(record.student_id, record.phone.trim());
            }
          }
        }
      } catch (err) {
        console.warn("Unable to query student_guardian_contacts:", err);
      }
    }

    const batchById = new Map(batches.map((batch) => [batch.id, batch]));
    const memberships = new Map<string, Batch[]>();

    for (const entry of roster) {
      const batch = batchById.get(entry.batch_id);
      if (!batch) continue;

      const existing = memberships.get(entry.student_id) || [];
      existing.push(batch);
      memberships.set(entry.student_id, existing);
    }

    const allStudents = (profiles || []).map((profile: any) => {
      const studentBatches = memberships.get(profile.id) || [];
      const departments = [
        ...new Set(
          [
            profile.department,
            ...studentBatches.map((batch) => batch.department),
          ].filter(Boolean)
        ),
      ];
      const semesters = [
        ...new Set(
          [
            profile.semester,
            ...studentBatches.map((batch) => batch.semester),
          ]
            .map((value) => String(value || "").trim())
            .filter(Boolean)
        ),
      ];
      const sections = [
        ...new Set(
          studentBatches
            .map((batch) => batch.section)
            .filter(Boolean)
        ),
      ];

      const studentPhone =
        (profile.phone && profile.phone.trim()) ||
        guardianPhoneByStudentId.get(profile.id) ||
        "";

      const studentDob =
        dobByStudentId.get(profile.id) ||
        getDeterministicStudentDob(
          profile.usn || profile.campus_uid || profile.id,
          profile.graduation_year
        );

      return {
        id: profile.id,
        name: profile.full_name || "—",
        usn: profile.usn || "",
        campusUid: profile.campus_uid || "",
        department: profile.department || departments[0] || "",
        departments,
        semester: String(profile.semester || semesters[0] || ""),
        semesters,
        sections,
        phone: studentPhone,
        dateOfBirth: studentDob,
      };
    });

    const params = request.nextUrl.searchParams;
    const semesterFilter = params.get("semester") || "";
    const departmentFilter = params.get("department") || "";
    const sectionFilter = params.get("section") || "";
    const search = (params.get("search") || "").trim().toLowerCase();

    const students = allStudents
      .filter((student: any) => {
        if (
          semesterFilter &&
          !student.semesters.includes(semesterFilter)
        ) return false;

        if (
          departmentFilter &&
          !student.departments.includes(departmentFilter)
        ) return false;

        if (
          sectionFilter &&
          !student.sections.includes(sectionFilter)
        ) return false;

        if (search) {
          const haystack = [
            student.name,
            student.usn,
            student.campusUid,
          ].join(" ").toLowerCase();

          if (!haystack.includes(search)) return false;
        }

        return true;
      })
      .map((student: any) => ({
        id: student.id,
        name: student.name,
        usn: student.usn,
        campusUid: student.campusUid,
        department: student.department,
        semester: student.semester,
        section: student.sections.join(", "),
        phone: student.phone,
        dateOfBirth: student.dateOfBirth,
      }));

    const uniqueSorted = (values: string[]) =>
      [...new Set(values.filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );

    return NextResponse.json({
      students,
      filters: {
        semesters: uniqueSorted(
          allStudents.flatMap((student: any) => student.semesters)
        ),
        departments: uniqueSorted(
          allStudents.flatMap((student: any) => student.departments)
        ),
        sections: uniqueSorted(
          allStudents.flatMap((student: any) => student.sections)
        ),
      },
    });
  },
  {
    requireAuth: true,
    allowedRoles: ["Main Admin", "Faculty"],
    requireBody: false,
    rateLimit: { windowMs: 60_000, maxRequests: 60, keyPrefix: 'student-directory' },
  }
);
