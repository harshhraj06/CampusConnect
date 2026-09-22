"use client";

export type CampusModuleView =
  | "Announcements"
  | "Assignments"
  | "Attendance"
  | "Applications"
  | "Learning"
  | "Groups"
  | "Marketplace"
  | "Notes & Tasks"
  | "Profile"
  | "Admin"
  | "Analytics";

export type CampusModuleRole =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";

export const campusModuleViews:
  CampusModuleView[] = [
    "Announcements",
    "Assignments",
    "Attendance",
    "Applications",
    "Learning",
    "Groups",
    "Marketplace",
    "Notes & Tasks",
    "Profile",
    "Admin",
    "Analytics",
  ];

export function isCampusModuleView(
  view: string
): view is CampusModuleView {
  return campusModuleViews.includes(
    view as CampusModuleView
  );
}

export function campusModuleSubtitle(
  view: CampusModuleView,
  role: CampusModuleRole
) {
  const copy:
    Record<CampusModuleView, string> = {
      Announcements:
        role === "Student"
          ? "Official academic, placement and campus updates in one verified feed."
          : "Publish and manage verified updates for the right campus audience.",

      Assignments:
        role === "Student"
          ? "Track coursework, preparation tasks, deadlines and submissions."
          : "Create tasks, monitor deadlines and review student completion.",

      Attendance:
        role === "Student"
          ? "Live subject attendance with shortage warnings and safe targets."
          : "Record attendance and review students who need intervention.",

      Applications:
        role === "Placement Cell"
          ? "Track every student application through the recruitment pipeline."
          : "Manage your placement applications and interview progress.",

      Learning:
        "Subject videos, verified learning links and previous-year question papers.",

      Groups:
        "Role-aware communities for classes, projects, placements and campus discussions.",

      Marketplace:
        "Buy and sell verified second-hand items safely within your campus community.",

      "Notes & Tasks":
        "Keep private notes, reminders and important work organized in one personal workspace.",

      Profile:
        "Keep your campus identity, skills and private documents up to date.",

      Admin:
        "Manage trusted roles and monitor access across CampusConnect.",

      Analytics:
        role === "Student"
          ? "A personal view of academic and career progress."
          : "Campus activity and outcome signals for better decisions.",
    };

  return copy[view];
}
