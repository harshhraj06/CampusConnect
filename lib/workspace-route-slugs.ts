export const workspaceRouteSlugs = [
  "dashboard",
  "faculty-workspace",
  "faculty-batches",
  "faculty-today",
  "faculty-teaching-schedule",
  "faculty-diary",
  "faculty-syllabus-progress",
  "faculty-workload",
  "faculty-availability",
  "faculty-coverage",
  "timetable-coordinator",
  "timetable-assignment",
  "my-campus",
  "campus-map",
  "campus-ai",
  "placements",
  "network",
  "resume",
  "academics",
  "academic-control",
  "calendar",
  "campus-life",
  "alumni",
  "activity-center",
  "faculty-directory",
  "about-campusconnect",
  "seva-kendra",
  "college-id",
  "announcements",
  "assignments",
  "attendance",
  "learning",
  "groups",
  "marketplace",
  "notes-tasks",
  "profile",
  "applications",
  "analytics",
  "admin",
] as const;

const workspaceRouteSet =
  new Set<string>(
    workspaceRouteSlugs
  );

export function isWorkspaceSlug(
  value: string
): boolean {
  return workspaceRouteSet.has(
    value
      .trim()
      .toLowerCase()
  );
}

export function isWorkspacePathname(
  pathname: string
): boolean {
  const normalized =
    pathname
      .replace(/^\/+|\/+$/g, "")
      .toLowerCase();

  if (
    !normalized ||
    normalized.includes("/")
  ) {
    return false;
  }

  return isWorkspaceSlug(
    normalized
  );
}
