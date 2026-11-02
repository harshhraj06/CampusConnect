"use client";
import "./placement-command-dashboard.css";

import { AdminBeamsBackground } from "./admin-beams-background";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import {getSupabaseClient} from "../lib/supabase";

import {RoleActionCenter} from "./role-action-center";
import {StaffOperationsBoard} from "./staff-operations-board";
import {FacultyDashboardPremium} from "./faculty-dashboard-premium";
import StudentNoticeBoard from "./student-notice-board";

export type DashboardRole =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";

type DashboardProfile = {
  name: string;
  email: string;
  department: string;
  year: string;
  role: DashboardRole;
};

type Props = {
  role: DashboardRole;
  profile: DashboardProfile;
  go: (view: any) => void;
  onOpenCalculator?: () => void;
};

type Metric = {
  label: string;
  value: string;
  note: string;
  target?: string;
};

type Priority = {
  icon: string;
  title: string;
  description: string;
  badge: string;
  target?: string;
};

type QuickAction = {
  icon: string;
  title: string;
  description: string;
  target?: string;
  calculator?: boolean;
};

type Signal = {
  label: string;
  value: number;
};

function signalClass(value: number) {
  if (value >= 90) return "excellent";
  if (value >= 80) return "strong";
  if (value >= 70) return "building";
  if (value >= 60) return "attention";
  return "focus";
}

function signalText(value: number) {
  if (value >= 90) {
    return {
      title: "Excellent",
      subtitle: "Exceptional readiness",
    };
  }

  if (value >= 80) {
    return {
      title: "Strong",
      subtitle: "Placement ready",
    };
  }

  if (value >= 70) {
    return {
      title: "Building",
      subtitle: "Progressing well",
    };
  }

  if (value >= 60) {
    return {
      title: "Needs attention",
      subtitle: "Some areas need improvement",
    };
  }

  return {
    title: "Needs focus",
    subtitle: "Priority improvements required",
  };
}

export function ProfessionalRoleDashboard({
  role,
  profile,
  go,
  onOpenCalculator,
}: Props) {
  const [counts, setCounts] = useState({
    primary: 0,
    secondary: 0,
    tertiary: 0,
    fourth: 0,
  });

  const [loading, setLoading] = useState(true);

  const [adminEditing, setAdminEditing] =
    useState(false);

  const [adminCopy, setAdminCopy] = useState({
    eyebrow: "",
    title: "",
    description: "",
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      const client = getSupabaseClient();

      if (!client) {
        setLoading(false);
        return;
      }

      try {
        if (role === "Student") {
          const auth =
            await client.auth.getUser();

          if (!auth.data.user) return;

          const userId =
            auth.data.user.id;

          const [
            applications,
            resources,
            assignments,
            groups,
          ] = await Promise.all([
            client
              .from("placement_applications")
              .select("*", {
                count: "exact",
                head: true,
              })
              .eq("student_id", userId),

            client
              .from("learning_resources")
              .select("*", {
                count: "exact",
                head: true,
              }),

            client
              .from("assignments")
              .select("*", {
                count: "exact",
                head: true,
              }),

            client
              .from("community_groups")
              .select("*", {
                count: "exact",
                head: true,
              }),
          ]);

          if (!active) return;

          setCounts({
            primary:
              applications.count || 0,
            secondary:
              resources.count || 0,
            tertiary:
              assignments.count || 0,
            fourth:
              groups.count || 0,
          });
        }

        else if (
          role === "Placement Cell"
        ) {
          const results =
            await Promise.all([
              client
                .from("placement_drives")
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              client
                .from(
                  "placement_applications"
                )
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              client
                .from("profiles")
                .select("*", {
                  count: "exact",
                  head: true,
                })
                .eq("role", "Student"),

              client
                .from(
                  "placement_recruiter_contacts"
                )
                .select("*", {
                  count: "exact",
                  head: true,
                }),
            ]);

          if (!active) return;

          setCounts({
            primary:
              results[0].count || 0,
            secondary:
              results[1].count || 0,
            tertiary:
              results[2].count || 0,
            fourth:
              results[3].count || 0,
          });
        }

        else if (role === "Faculty") {
          const results =
            await Promise.all([
              client
                .from("assignments")
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              client
                .from(
                  "attendance_records"
                )
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              client
                .from(
                  "learning_resources"
                )
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              client
                .from("announcements")
                .select("*", {
                  count: "exact",
                  head: true,
                }),
            ]);

          if (!active) return;

          setCounts({
            primary:
              results[0].count || 0,
            secondary:
              results[1].count || 0,
            tertiary:
              results[2].count || 0,
            fourth:
              results[3].count || 0,
          });
        }

        else if (
          role === "Coordinator"
        ) {
          const results =
            await Promise.all([
              client
                .from("campus_events")
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              client
                .from(
                  "community_groups"
                )
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              client
                .from("announcements")
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              client
                .from("profiles")
                .select("*", {
                  count: "exact",
                  head: true,
                }),
            ]);

          if (!active) return;

          setCounts({
            primary:
              results[0].count || 0,
            secondary:
              results[1].count || 0,
            tertiary:
              results[2].count || 0,
            fourth:
              results[3].count || 0,
          });
        }

        else if (
          role === "Volunteer"
        ) {
          const results =
            await Promise.all([
              client
                .from("campus_events")
                .select("*", {
                  count: "exact",
                  head: true,
                })
                .eq(
                  "status",
                  "Published"
                ),

              client
                .from(
                  "community_groups"
                )
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              client
                .from("announcements")
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              client
                .from(
                  "learning_resources"
                )
                .select("*", {
                  count: "exact",
                  head: true,
                }),
            ]);

          if (!active) return;

          setCounts({
            primary:
              results[0].count || 0,
            secondary:
              results[1].count || 0,
            tertiary:
              results[2].count || 0,
            fourth:
              results[3].count || 0,
          });
        }

        else {
          const results =
            await Promise.all([
              client
                .from("profiles")
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              client
                .from("announcements")
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              client
                .from(
                  "community_groups"
                )
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              client
                .from(
                  "learning_resources"
                )
                .select("*", {
                  count: "exact",
                  head: true,
                }),
            ]);

          if (!active) return;

          setCounts({
            primary:
              results[0].count || 0,
            secondary:
              results[1].count || 0,
            tertiary:
              results[2].count || 0,
            fourth:
              results[3].count || 0,
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [role]);

  const config = useMemo(() => {
    if (role === "Student") {
      return {
        eyebrow:
          "STUDENT SUCCESS HUB",
        title:
          "Your campus command center.",
        description:
          "Academics, placements, career readiness and campus activity brought together in one focused workspace.",

        metrics: [
          {
            label: "APPLICATIONS",
            value: String(
              counts.primary
            ),
            note:
              "Placement applications",
            target: "Applications",
          },
          {
            label: "LEARNING",
            value: String(
              counts.secondary
            ),
            note:
              "Learning resources",
            target: "Learning",
          },
          {
            label: "ASSIGNMENTS",
            value: String(
              counts.tertiary
            ),
            note:
              "Academic tasks",
            target: "Assignments",
          },
          {
            label: "COMMUNITIES",
            value: String(
              counts.fourth
            ),
            note:
              "Campus groups",
            target: "Groups",
          },
        ] satisfies Metric[],

        priorities: [
          {
            icon: "P",
            title:
              "Placement opportunities",
            description:
              "Review recommended hiring opportunities and application progress.",
            badge: "Career",
            target: "Placements",
          },
          {
            icon: "A",
            title:
              "Academic progress",
            description:
              "Check attendance, assignments and current coursework.",
            badge: "Academics",
            target: "Academics",
          },
          {
            icon: "R",
            title:
              "Resume readiness",
            description:
              "Improve your ATS resume before upcoming placement drives.",
            badge: "Resume",
            target: "Resume",
          },
        ],

        quick: [
          {
            icon: "∑",
            title: "SGPA & CGPA",
            description:
              "Academic calculator",
            calculator: true,
          },
          {
            icon: "P",
            title: "Placements",
            description:
              "Recommended opportunities",
            target: "Placements",
          },
          {
            icon: "R",
            title: "Resume",
            description:
              "Placement-ready profile",
            target: "Resume",
          },
          {
            icon: "L",
            title: "Learning",
            description:
              "Videos, notes and PYQs",
            target: "Learning",
          },
        ],
      };
    }

    if (
      role === "Placement Cell"
    ) {
      return {
        eyebrow:
          "PLACEMENT OPERATIONS",
        title:
          "Placement command center.",
        description:
          "Manage recruitment drives, applications, recruiter relationships and student readiness from one professional workspace.",

        metrics: [
          {
            label: "ACTIVE DRIVES",
            value: String(
              counts.primary
            ),
            note:
              "Live recruitment opportunities",
            target: "Placements",
          },
          {
            label: "APPLICATIONS",
            value: String(
              counts.secondary
            ),
            note:
              "Student applications",
            target: "Applications",
          },
          {
            label: "STUDENTS",
            value: String(
              counts.tertiary
            ),
            note:
              "Verified student profiles",
            target: "Network",
          },
          {
            label: "RECRUITERS",
            value: String(
              counts.fourth
            ),
            note:
              "Company contacts",
            target: "Placements",
          },
        ],

        priorities: [
          {
            icon: "D",
            title:
              "Manage active drives",
            description:
              "Create and update verified company recruitment drives.",
            badge: "Drives",
            target: "Placements",
          },
          {
            icon: "A",
            title:
              "Review applicants",
            description:
              "Move students through assessments, interviews and offers.",
            badge:
              "Applications",
            target:
              "Applications",
          },
          {
            icon: "C",
            title:
              "Recruiter relationships",
            description:
              "Track company contacts, follow-ups and hiring communication.",
            badge: "CRM",
            target: "Placements",
          },
        ],

        quick: [
          {
            icon: "+",
            title: "New drive",
            description:
              "Publish recruitment",
            target: "Placements",
          },
          {
            icon: "A",
            title: "Applications",
            description:
              "Review pipeline",
            target: "Applications",
          },
          {
            icon: "N",
            title: "Network",
            description:
              "Student directory",
            target: "Network",
          },
          {
            icon: "∑",
            title: "SGPA & CGPA",
            description:
              "Academic calculator",
            calculator: true,
          },
        ],
      };
    }

    if (role === "Faculty") {
      return {
        eyebrow:
          "FACULTY ACADEMIC DESK",
        title:
          "Teaching and mentoring workspace.",
        description:
          "Manage coursework, attendance, academic resources and student progress without unnecessary dashboard clutter.",

        metrics: [
          {
            label: "ASSIGNMENTS",
            value: String(
              counts.primary
            ),
            note: "Coursework records",
            target: "Assignments",
          },
          {
            label: "ATTENDANCE",
            value: String(
              counts.secondary
            ),
            note:
              "Attendance records",
            target: "Attendance",
          },
          {
            label: "RESOURCES",
            value: String(
              counts.tertiary
            ),
            note:
              "Published learning assets",
            target: "Learning",
          },
          {
            label: "ANNOUNCEMENTS",
            value: String(
              counts.fourth
            ),
            note:
              "Campus communication",
            target: "Announcements",
          },
        ],

        priorities: [
          {
            icon: "A",
            title:
              "Attendance review",
            description:
              "Identify students who need academic intervention.",
            badge: "Academic",
            target: "Attendance",
          },
          {
            icon: "T",
            title:
              "Assignment workflow",
            description:
              "Create coursework and monitor submissions.",
            badge: "Coursework",
            target: "Assignments",
          },
          {
            icon: "L",
            title:
              "Learning resources",
            description:
              "Publish notes, PYQs and verified academic material.",
            badge: "Learning",
            target: "Learning",
          },
        ],

        quick: [
          {
            icon: "+",
            title: "Assignment",
            description:
              "Create coursework",
            target: "Assignments",
          },
          {
            icon: "A",
            title: "Attendance",
            description:
              "Record class attendance",
            target: "Attendance",
          },
          {
            icon: "L",
            title: "Learning",
            description:
              "Publish resources",
            target: "Learning",
          },
          {
            icon: "∑",
            title: "SGPA & CGPA",
            description:
              "Academic calculator",
            calculator: true,
          },
        ],
      };
    }

    if (
      role === "Coordinator"
    ) {
      return {
        eyebrow:
          "COORDINATION DESK",
        title:
          "Keep campus operations aligned.",
        description:
          "Coordinate activities, communication and campus teams from one structured workspace.",

        metrics: [
          {
            label: "EVENTS",
            value: String(
              counts.primary
            ),
            note:
              "Campus activities",
            target: "Campus",
          },
          {
            label: "GROUPS",
            value: String(
              counts.secondary
            ),
            note:
              "Community groups",
            target: "Groups",
          },
          {
            label:
              "ANNOUNCEMENTS",
            value: String(
              counts.tertiary
            ),
            note:
              "Campus notices",
            target:
              "Announcements",
          },
          {
            label: "USERS",
            value: String(
              counts.fourth
            ),
            note:
              "Campus profiles",
            target: "Network",
          },
        ],

        priorities: [
          {
            icon: "E",
            title:
              "Upcoming events",
            description:
              "Review schedules, responsibilities and communication.",
            badge: "Events",
            target: "Campus",
          },
          {
            icon: "G",
            title:
              "Community coordination",
            description:
              "Manage campus groups and student teams.",
            badge: "Groups",
            target: "Groups",
          },
          {
            icon: "N",
            title:
              "Campus communication",
            description:
              "Keep verified updates visible to the right audience.",
            badge: "Notices",
            target:
              "Announcements",
          },
        ],

        quick: [
          {
            icon: "E",
            title: "Campus",
            description:
              "Manage activities",
            target: "Campus",
          },
          {
            icon: "G",
            title: "Groups",
            description:
              "Community workspace",
            target: "Groups",
          },
          {
            icon: "N",
            title: "Announcements",
            description:
              "Official communication",
            target: "Announcements",
          },
          {
            icon: "∑",
            title: "SGPA & CGPA",
            description:
              "Academic calculator",
            calculator: true,
          },
        ],
      };
    }

    if (
      role === "Volunteer"
    ) {
      return {
        eyebrow:
          "VOLUNTEER OPERATIONS",
        title:
          "Your contribution workspace.",
        description:
          "Stay focused on campus duties, events, communities and verified contribution activity.",

        metrics: [
          {
            label: "EVENTS",
            value: String(
              counts.primary
            ),
            note:
              "Published activities",
            target: "Campus",
          },
          {
            label: "GROUPS",
            value: String(
              counts.secondary
            ),
            note:
              "Available communities",
            target: "Groups",
          },
          {
            label:
              "ANNOUNCEMENTS",
            value: String(
              counts.tertiary
            ),
            note:
              "Campus updates",
            target:
              "Announcements",
          },
          {
            label: "RESOURCES",
            value: String(
              counts.fourth
            ),
            note:
              "Learning resources",
            target: "Learning",
          },
        ],

        priorities: [
          {
            icon: "E",
            title:
              "Campus activities",
            description:
              "View active events and participation requirements.",
            badge: "Events",
            target: "Campus",
          },
          {
            icon: "G",
            title:
              "Community activity",
            description:
              "Stay connected with assigned campus groups.",
            badge: "Groups",
            target: "Groups",
          },
          {
            icon: "N",
            title:
              "Latest announcements",
            description:
              "Keep track of verified campus updates.",
            badge: "Campus",
            target:
              "Announcements",
          },
        ],

        quick: [
          {
            icon: "E",
            title: "Campus",
            description:
              "Events and activities",
            target: "Campus",
          },
          {
            icon: "G",
            title: "Groups",
            description:
              "Community discussions",
            target: "Groups",
          },
          {
            icon: "L",
            title: "Learning",
            description:
              "Academic resources",
            target: "Learning",
          },
          {
            icon: "∑",
            title: "SGPA & CGPA",
            description:
              "Academic calculator",
            calculator: true,
          },
        ],
      };
    }

    return {
      eyebrow:
        "INSTITUTION CONTROL CENTER",
      title:
        adminCopy.title ||
        "Campus governance and system control.",
      description:
        adminCopy.description ||
        "Manage users, institutional communication, platform access and campus operations from one administrative workspace.",

      metrics: [
        {
          label: "USERS",
          value: String(
            counts.primary
          ),
          note:
            "Verified campus profiles",
          target: "Admin",
        },
        {
          label: "ANNOUNCEMENTS",
          value: String(
            counts.secondary
          ),
          note:
            "Published communication",
          target:
            "Announcements",
        },
        {
          label: "GROUPS",
          value: String(
            counts.tertiary
          ),
          note:
            "Campus communities",
          target: "Groups",
        },
        {
          label: "RESOURCES",
          value: String(
            counts.fourth
          ),
          note:
            "Learning assets",
          target: "Learning",
        },
      ],

      priorities: [
        {
          icon: "U",
          title:
            "User governance",
          description:
            "Manage verified roles and administrative access.",
          badge: "Admin",
          target: "Admin",
        },
        {
          icon: "C",
          title:
            "Campus communication",
          description:
            "Review official announcements and publishing activity.",
          badge: "Content",
          target:
            "Announcements",
        },
        {
          icon: "A",
          title:
            "Institution analytics",
          description:
            "Review activity and outcome signals across CampusConnect.",
          badge: "Analytics",
          target: "Analytics",
        },
      ],

      quick: [
        {
          icon: "U",
          title: "Admin",
          description:
            "Roles and users",
          target: "Admin",
        },
        {
          icon: "A",
          title: "Analytics",
          description:
            "Institution insights",
          target: "Analytics",
        },
        {
          icon: "N",
          title: "Announcements",
          description:
            "Campus publishing",
          target: "Announcements",
        },
        {
          icon: "∑",
          title: "SGPA & CGPA",
          description:
            "Academic calculator",
          calculator: true,
        },
      ],
    };
  }, [
    role,
    counts,
    adminCopy,
  ]);

  useEffect(() => {
    if (
      role === "Main Admin" &&
      !adminCopy.title
    ) {
      setAdminCopy({
        eyebrow:
          "INSTITUTION CONTROL CENTER",
        title:
          "Campus governance and system control.",
        description:
          "Manage users, institutional communication, platform access and campus operations from one administrative workspace.",
      });
    }
  }, [
    role,
    adminCopy.title,
  ]);

  const signals: Signal[] =
    role === "Placement Cell"
      ? [
          {
            label:
              "Student readiness",
            value: 82,
          },
          {
            label:
              "Resume verification",
            value: 74,
          },
          {
            label:
              "Application completion",
            value: 68,
          },
          {
            label:
              "Interview preparation",
            value: 61,
          },
        ]
      : role === "Student"
      ? [
          {
            label:
              "Academic health",
            value: 82,
          },
          {
            label:
              "Career readiness",
            value: 86,
          },
          {
            label:
              "Resume completeness",
            value: 84,
          },
          {
            label:
              "Skill development",
            value: 76,
          },
        ]
      : [
          {
            label:
              "Workspace activity",
            value: 82,
          },
          {
            label:
              "Completion",
            value: 74,
          },
          {
            label:
              "Engagement",
            value: 79,
          },
          {
            label:
              "Operational health",
            value: 88,
          },
        ];

  const overallSignal =
    Math.round(
      signals.reduce(
        (sum, item) =>
          sum + item.value,
        0
      ) / signals.length
    );

  const currentSignal =
    signalText(overallSignal);

  const firstName =
    profile.name
      ?.trim()
      .split(/\s+/)[0] ||
    role;

  const [
    liveGreeting,
    setLiveGreeting,
  ] = useState("Welcome back");

  useEffect(() => {
    const updateGreeting = () => {
      const hour =
        new Date().getHours();

      setLiveGreeting(
        hour < 12
          ? "Good morning"
          : hour < 17
          ? "Good afternoon"
          : "Good evening"
      );
    };

    updateGreeting();

    const interval =
      window.setInterval(
        updateGreeting,
        30_000
      );

    window.addEventListener(
      "focus",
      updateGreeting
    );

    document.addEventListener(
      "visibilitychange",
      updateGreeting
    );

    return () => {
      window.clearInterval(interval);

      window.removeEventListener(
        "focus",
        updateGreeting
      );

      document.removeEventListener(
        "visibilitychange",
        updateGreeting
      );
    };
  }, []);

  if (role === "Faculty") {
    return (
      <>
        <FacultyDashboardPremium
          department={profile.department?.trim() || ""}
          counts={counts}
          loading={loading}
          go={go}
          onOpenCalculator={onOpenCalculator}
        />
        <StudentNoticeBoard role={role} profile={profile} />
      </>
    );
  }

  return (
    <div
      className={`proRoleDashboard proRoleDashboard-${role
        .toLowerCase()
        .replace(/\s+/g, "-")}`}
    >
      <style>{`
        .proRoleDashboard .proDashboardPhotoHero {
          position: relative !important;
          isolation: isolate !important;
          overflow: hidden !important;
          min-height: 365px !important;
          padding: 38px 42px !important;
          border: 1px solid rgba(55,72,82,.13) !important;
          border-radius: 26px !important;
          background: #f7f3eb !important;
          box-shadow: 0 20px 50px rgba(36,48,56,.10) !important;
        }

        .proRoleDashboard .proDashboardHeroPhoto {
          position: absolute !important;
          inset: 0 !important;
          z-index: 0 !important;
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          object-position: center 44% !important;
          opacity: 1 !important;
          filter: saturate(.9) contrast(.97) brightness(1.02) !important;
          pointer-events: none !important;
        }

        .proRoleDashboard .proDashboardHeroPhotoOverlay {
          position: absolute !important;
          inset: 0 !important;
          z-index: 1 !important;
          display: block !important;
          pointer-events: none !important;
          background:
            linear-gradient(
              90deg,
              rgba(250,247,240,.98) 0%,
              rgba(250,247,240,.95) 22%,
              rgba(250,247,240,.82) 40%,
              rgba(250,247,240,.50) 57%,
              rgba(250,247,240,.15) 74%,
              rgba(250,247,240,0) 100%
            ) !important;
        }

        .proRoleDashboard .proDashboardPhotoHero::before,
        .proRoleDashboard .proDashboardPhotoHero::after,
        .proRoleDashboard .proDashboardPhotoHero .proDashboardOrb {
          display: none !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardHeroContent {
          position: relative !important;
          z-index: 3 !important;
          max-width: 660px !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardHeroContent > span {
          color: var(--prd-accent) !important;
          text-shadow: none !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardHeroContent > span::before {
          background: var(--prd-accent) !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardHeroContent h1 {
          max-width: 650px !important;
          margin: 8px 0 0 !important;
          color: #263b46 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: clamp(38px,4.25vw,54px) !important;
          font-weight: 500 !important;
          line-height: 1.04 !important;
          letter-spacing: -.04em !important;
          text-shadow: none !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardHeroContent > p {
          max-width: 590px !important;
          margin-top: 15px !important;
          color: #5d6f79 !important;
          font-size: 10px !important;
          line-height: 1.72 !important;
          text-shadow: none !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardHeroAside {
          position: relative !important;
          z-index: 4 !important;
          align-self: center !important;
          padding: 19px !important;
          border: 1px solid rgba(255,255,255,.95) !important;
          border-radius: 20px !important;
          background: rgba(255,255,255,.92) !important;
          box-shadow: 0 22px 48px rgba(29,44,53,.16) !important;
          backdrop-filter: blur(18px) saturate(120%) !important;
          -webkit-backdrop-filter: blur(18px) saturate(120%) !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardHeroAside > header {
          border-bottom-color: rgba(55,72,81,.10) !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardHeroAside header small {
          color: #8a9499 !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardHeroAside header strong {
          color: #2c404b !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardRoleMark {
          background: var(--prd-accent-soft) !important;
          color: var(--prd-accent) !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardHeroMetrics button {
          border: 1px solid rgba(55,72,81,.10) !important;
          background: rgba(250,250,249,.95) !important;
          color: #263b46 !important;
          box-shadow: 0 7px 18px rgba(41,53,60,.04) !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardHeroMetrics small {
          color: #899399 !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardHeroMetrics strong {
          color: #263b46 !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardAiAction {
          border: 0 !important;
          background: var(--prd-accent) !important;
          color: #fff !important;
          box-shadow: 0 12px 28px rgba(var(--prd-accent-rgb),.20) !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardAiAction strong,
        .proRoleDashboard .proDashboardPhotoHero .proDashboardAiAction > b,
        .proRoleDashboard .proDashboardPhotoHero .proDashboardAiAction > i {
          color: #fff !important;
        }

        .proRoleDashboard .proDashboardPhotoHero .proDashboardAiAction small {
          color: rgba(255,255,255,.72) !important;
        }

        .proRoleDashboard-faculty {
          --prd-accent: #356b91 !important;
          --prd-accent-soft: #e9f3fa !important;
          --prd-accent-rgb: 53,107,145 !important;
        }

        .proRoleDashboard-placement-cell {
          --prd-accent: #765966 !important;
          --prd-accent-soft: #f5edef !important;
          --prd-accent-rgb: 118,89,102 !important;
        }

        .proRoleDashboard-coordinator {
          --prd-accent: #657e6a !important;
          --prd-accent-soft: #edf4ee !important;
          --prd-accent-rgb: 101,126,106 !important;
        }

        .proRoleDashboard-volunteer {
          --prd-accent: #9a7055 !important;
          --prd-accent-soft: #f8eee8 !important;
          --prd-accent-rgb: 154,112,85 !important;
        }

        .proRoleDashboard-main-admin {
          --prd-accent: #344f63 !important;
          --prd-accent-soft: #eaf1f5 !important;
          --prd-accent-rgb: 52,79,99 !important;
        }

        @media (max-width: 1050px) {
          .proRoleDashboard .proDashboardPhotoHero {
            grid-template-columns: 1fr !important;
          }

          .proRoleDashboard .proDashboardHeroPhotoOverlay {
            background:
              linear-gradient(
                180deg,
                rgba(250,247,240,.97),
                rgba(250,247,240,.88) 52%,
                rgba(250,247,240,.50)
              ) !important;
          }
        }

/* MAIN PLACEMENT HERO — GRAPHITE, IVORY, MUTED BRASS */
.proRoleDashboard-placement-cell {
  --prd-accent: #a98a5b !important;
  --prd-accent-soft: #eee6d8 !important;
  --prd-accent-rgb: 169, 138, 91 !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero {
  position: relative !important;
  isolation: isolate !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, .85fr) !important;
  align-items: center !important;
  gap: clamp(28px, 4vw, 58px) !important;
  min-height: 405px !important;
  padding: clamp(30px, 4vw, 55px) !important;
  overflow: hidden !important;
  border: 1px solid rgba(210, 197, 175, .42) !important;
  border-radius: 20px !important;
  background: #292f30 !important;
  box-shadow: 0 16px 38px rgba(30, 35, 35, .13) !important;
  animation: placementEnterpriseIn .55s ease-out both;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroPhoto {
  object-fit: cover !important;
  object-position: center 50% !important;
  filter: saturate(.58) contrast(1.04) brightness(.74) !important;
  transform: scale(1.015);
  animation: placementCampusImageDrift 32s ease-in-out infinite alternate;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroPhotoOverlay {
  position: absolute !important;
  inset: 0 !important;
  background: linear-gradient(
    90deg,
    rgba(36, 41, 41, .68) 0%,
    rgba(36, 41, 41, .81) 43%,
    rgba(36, 41, 41, .94) 73%,
    rgba(36, 41, 41, .98) 100%
  ) !important;
  pointer-events: none !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero::after {
  content: "";
  position: absolute;
  z-index: 2;
  top: -145px;
  right: 13%;
  width: clamp(240px, 29vw, 370px);
  aspect-ratio: 1;
  border: 1px solid rgba(218, 197, 159, .23);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    transparent 0 38%,
    rgba(218, 197, 159, .10) 38.4% 38.8%,
    transparent 39.2% 57%,
    rgba(218, 197, 159, .14) 57.4% 57.8%,
    transparent 58.2%
  );
  box-shadow:
    0 0 0 25px rgba(218, 197, 159, .025),
    0 0 0 52px rgba(218, 197, 159, .018);
  pointer-events: none;
  animation: placementOrbitalMotion 40s linear infinite;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroContent {
  position: relative !important;
  z-index: 3 !important;
  min-width: 0 !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroContent :is(h1, h2, h3, .proDashboardHeroTitle, .proAdminHeroTitle) {
  max-width: 720px;
  margin-block: 10px 16px !important;
  color: #f7f5ef !important;
  font-family: Inter, "Helvetica Neue", Arial, sans-serif !important;
  font-size: clamp(36px, 4.2vw, 58px) !important;
  font-weight: 650 !important;
  line-height: 1.06 !important;
  letter-spacing: -.045em !important;
  text-wrap: balance;
  text-shadow: none !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroContent :is(p, .proDashboardHeroDescription) {
  max-width: 570px;
  color: rgba(247, 245, 239, .79) !important;
  font-size: 14px !important;
  line-height: 1.8 !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroContent :is(small, .proDashboardHeroEyebrow) {
  color: #d9c39e !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  letter-spacing: .15em !important;
}

/* Remove the floating-card appearance; retain the same content and actions. */
.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroAside {
  position: relative !important;
  z-index: 4 !important;
  align-self: center !important;
  width: 100% !important;
  min-width: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: #f7f5ef !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  animation: placementHeroContentIn .6s .08s ease-out both;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroAside > header {
  padding-bottom: 15px !important;
  border-bottom: 1px solid rgba(247, 245, 239, .20) !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroAside header small {
  color: #cfc5b4 !important;
  font-size: 9px !important;
  font-weight: 750 !important;
  letter-spacing: .13em !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroAside header strong {
  color: #f7f5ef !important;
  font-size: 17px !important;
  font-weight: 650 !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardRoleMark {
  border: 1px solid rgba(218, 197, 159, .38) !important;
  border-radius: 8px !important;
  background: rgba(218, 197, 159, .09) !important;
  color: #ddc79f !important;
}

/* Existing live metrics: one clean row with separators, not separate cards. */
.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 0 !important;
  margin: 18px 0 20px !important;
  border-block: 1px solid rgba(247, 245, 239, .22) !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics button {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  justify-content: center !important;
  min-width: 0 !important;
  min-height: 79px !important;
  padding: 14px 12px !important;
  border: 0 !important;
  border-right: 1px solid rgba(247, 245, 239, .17) !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: #f7f5ef !important;
  text-align: left !important;
  transition: background-color .2s ease !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics button:first-child {
  padding-left: 0 !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics button:last-child {
  border-right: 0 !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics button:hover {
  transform: none !important;
  background: rgba(255, 255, 255, .045) !important;
  box-shadow: none !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics button:focus-visible {
  outline: 2px solid #d9c39e !important;
  outline-offset: -3px !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics small {
  color: #c8c9c3 !important;
  font-size: 9px !important;
  font-weight: 750 !important;
  letter-spacing: .07em !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics strong {
  margin-top: 7px !important;
  color: #fbf8f0 !important;
  font-size: clamp(21px, 2.15vw, 30px) !important;
  font-weight: 650 !important;
  letter-spacing: -.025em !important;
  font-variant-numeric: tabular-nums;
}

/* A single calm primary action, using the same restrained accent. */
.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardAiAction {
  border: 1px solid #d3bc93 !important;
  border-radius: 9px !important;
  background: #d8c19a !important;
  color: #2c3231 !important;
  box-shadow: none !important;
  transition: background-color .2s ease, transform .2s ease !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardAiAction:hover {
  transform: translateY(-1px) !important;
  background: #e3d0ad !important;
  box-shadow: none !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardAiAction :is(strong, b, i) {
  color: #2c3231 !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardAiAction small {
  color: #55554e !important;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardOrb {
  border-color: rgba(218, 197, 159, .18) !important;
  background: rgba(218, 197, 159, .025) !important;
  box-shadow: none !important;
  animation: placementAmbientFloat 10s ease-in-out infinite;
}

.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardOrbTwo {
  animation-delay: -5s;
}

@keyframes placementEnterpriseIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes placementHeroContentIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes placementOrbitalMotion {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes placementCampusImageDrift {
  from { transform: scale(1.015); }
  to { transform: scale(1.045); }
}

@keyframes placementAmbientFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@media (max-width: 1050px) {
  .proRoleDashboard-placement-cell .proDashboardPhotoHero {
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 25px !important;
  }

  .proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroAside {
    max-width: 620px !important;
  }
}

@media (max-width: 640px) {
  .proRoleDashboard-placement-cell .proDashboardPhotoHero {
    min-height: 0 !important;
    padding: 24px 19px !important;
    border-radius: 16px !important;
  }

  .proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroPhotoOverlay {
    background: linear-gradient(180deg, rgba(36, 41, 41, .62), rgba(36, 41, 41, .95)) !important;
  }

  .proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroContent :is(h1, h2, h3, .proDashboardHeroTitle, .proAdminHeroTitle) {
    font-size: clamp(34px, 9vw, 45px) !important;
  }

  .proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics button {
    min-height: 73px !important;
    padding: 12px 8px !important;
  }

  .proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics small {
    font-size: 8px !important;
    letter-spacing: .025em !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .proRoleDashboard-placement-cell .proDashboardPhotoHero,
  .proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroPhoto,
  .proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroAside,
  .proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardOrb {
    animation: none !important;
    transition: none !important;
  }
}

/* PLACEMENT HERO — VISIBILITY AND CONTRAST CORRECTION */
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero {
  background-color: #303635 !important;
  border-color: #c7c6bb !important;
  box-shadow: 0 16px 36px rgba(26, 31, 30, .12) !important;
}

/* Make the actual campus photograph visible again. */
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroPhoto {
  opacity: 1 !important;
  filter: saturate(.78) contrast(1.025) brightness(.99) !important;
  object-fit: cover !important;
  object-position: center 48% !important;
  animation: placementPhotoClarityDrift 30s ease-in-out infinite alternate !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroPhotoOverlay {
  background: linear-gradient(
    90deg,
    rgba(34, 39, 37, .40) 0%,
    rgba(34, 39, 37, .49) 38%,
    rgba(34, 39, 37, .66) 68%,
    rgba(34, 39, 37, .78) 100%
  ) !important;
  opacity: 1 !important;
}

/* Explicitly override the blue eyebrow, heading, and paragraph styles. */
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroContent > span {
  color: #ddc69c !important;
  text-shadow: none !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroContent > span::before {
  background: #b59a6d !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroContent h1,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroContent h1 *,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroContent .proAdminHeroTitle {
  color: #fffdf7 !important;
  font-family: Inter, "Helvetica Neue", Arial, sans-serif !important;
  font-weight: 650 !important;
  letter-spacing: -.04em !important;
  line-height: 1.06 !important;
  text-shadow: 0 2px 18px rgba(0, 0, 0, .18) !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroContent > p {
  color: rgba(255, 253, 247, .88) !important;
  max-width: 600px !important;
  font-size: 14px !important;
  line-height: 1.8 !important;
}

/* Remove the blue top line and green live status from the panel. */
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroAside::before,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroAside::after {
  content: none !important;
  display: none !important;
  background: none !important;
  box-shadow: none !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardLiveDot {
  background: #b59a6d !important;
  border-color: rgba(181, 154, 109, .35) !important;
  box-shadow: 0 0 0 4px rgba(181, 154, 109, .12) !important;
  animation: none !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroAside > header {
  border-bottom-color: rgba(52, 55, 50, .16) !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroAside header small {
  color: #77786f !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroAside header strong {
  color: #303532 !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardRoleMark {
  color: #765c35 !important;
  background: #f0e8da !important;
  border-color: #ded0b6 !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroMetrics small {
  color: #d9d7ce !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroMetrics strong {
  color: #fffdf7 !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardAiAction {
  color: #282e2c !important;
  background: #d7c29d !important;
  border-color: #d7c29d !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardAiAction * {
  color: #282e2c !important;
}

@keyframes placementPhotoClarityDrift {
  from { transform: scale(1.01); }
  to { transform: scale(1.04); }
}

@media (prefers-reduced-motion: reduce) {
  html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero .proDashboardHeroPhoto {
    animation: none !important;
  }
}

/* PLACEMENT HERO — FINAL READABILITY AND PANEL FIX */

/* Make the existing campus photograph visible without losing text contrast. */
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroPhoto {
  opacity: 1 !important;
  filter: saturate(.82) contrast(1.02) brightness(1.04) !important;
  object-fit: cover !important;
  object-position: center 48% !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroPhotoOverlay {
  background: linear-gradient(
    90deg,
    rgba(28, 35, 33, .55) 0%,
    rgba(28, 35, 33, .43) 42%,
    rgba(28, 35, 33, .20) 72%,
    rgba(28, 35, 33, .12) 100%
  ) !important;
  opacity: 1 !important;
}

/* Explicitly set the text and its nested elements, including text fill. */
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroContent > span,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroContent > span * {
  color: #ead5ad !important;
  -webkit-text-fill-color: #ead5ad !important;
  text-shadow: none !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroContent > span::before {
  background: #bda477 !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroContent h1,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroContent h1 *,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroContent .proAdminHeroTitle,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroContent .proAdminHeroTitle * {
  color: #fffdf7 !important;
  -webkit-text-fill-color: #fffdf7 !important;
  font-family: Inter, "Helvetica Neue", Arial, sans-serif !important;
  font-weight: 650 !important;
  letter-spacing: -.04em !important;
  line-height: 1.06 !important;
  text-shadow: 0 2px 16px rgba(0, 0, 0, .16) !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroContent > p,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroContent > p * {
  color: rgba(255, 253, 247, .94) !important;
  -webkit-text-fill-color: rgba(255, 253, 247, .94) !important;
  max-width: 590px !important;
  line-height: 1.8 !important;
}

/* Reintroduce one clear, understated workspace panel—not floating mini-cards. */
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroAside {
  position: relative !important;
  z-index: 4 !important;
  padding: clamp(19px, 2.2vw, 27px) !important;
  border: 1px solid #ded8cd !important;
  border-top: 3px solid #b29b72 !important;
  border-radius: 15px !important;
  background: linear-gradient(145deg, #fffdf8 0%, #f3eee5 100%) !important;
  box-shadow: 0 16px 36px rgba(17, 23, 22, .15) !important;
  color: #343a37 !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}

/* Remove the old blue decorative strip and other panel pseudo decorations. */
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroAside::before,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroAside::after {
  content: none !important;
  display: none !important;
  background: none !important;
  box-shadow: none !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroAside > header {
  border-bottom: 1px solid #e1d9cc !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroAside header small,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroAside header small * {
  color: #777970 !important;
  -webkit-text-fill-color: #777970 !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroAside header strong,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroAside header strong * {
  color: #303633 !important;
  -webkit-text-fill-color: #303633 !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardRoleMark {
  border: 1px solid #dfd3bd !important;
  border-radius: 9px !important;
  background: #eee7d9 !important;
  color: #343a37 !important;
  -webkit-text-fill-color: #343a37 !important;
}

/* Keep one continuous metrics row with readable labels and values. */
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 0 !important;
  border-block: 1px solid #e1d9cc !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics button {
  min-width: 0 !important;
  min-height: 80px !important;
  padding: 13px 10px !important;
  border: 0 !important;
  border-right: 1px solid #e1d9cc !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: #343a37 !important;
  box-shadow: none !important;
  text-align: left !important;
  transition: background-color .2s ease !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics button:first-child {
  padding-left: 0 !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics button:last-child {
  border-right: 0 !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHeroMetrics button:hover {
  transform: none !important;
  background: rgba(169, 150, 115, .08) !important;
  box-shadow: none !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics small,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics small * {
  color: #74766f !important;
  -webkit-text-fill-color: #74766f !important;
  font-size: 9px !important;
  font-weight: 750 !important;
  letter-spacing: .055em !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics strong,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics strong * {
  color: #303633 !important;
  -webkit-text-fill-color: #303633 !important;
  font-size: clamp(22px, 2.1vw, 29px) !important;
  font-weight: 700 !important;
  font-variant-numeric: tabular-nums !important;
}

/* Campus AI: graphite with warm-white text and a restrained brass outline. */
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardAiAction {
  border: 1px solid #b7a077 !important;
  border-radius: 10px !important;
  background: #343b38 !important;
  color: #fffdf7 !important;
  box-shadow: 0 7px 17px rgba(30, 37, 34, .14) !important;
  transition: background-color .2s ease, transform .2s ease !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardAiAction,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardAiAction * {
  color: #fffdf7 !important;
  -webkit-text-fill-color: #fffdf7 !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardAiAction small {
  color: #e2ded3 !important;
  -webkit-text-fill-color: #e2ded3 !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardAiAction > i,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardAiAction > b {
  border-color: rgba(215, 194, 153, .42) !important;
  background: rgba(255, 255, 255, .07) !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardAiAction:hover {
  transform: translateY(-1px) !important;
  background: #414945 !important;
  box-shadow: 0 10px 22px rgba(30, 37, 34, .18) !important;
}

/* Replace the green status accent with a muted brass tone. */
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardLiveDot {
  background: #a78c5e !important;
  border-color: rgba(167, 140, 94, .32) !important;
  box-shadow: 0 0 0 4px rgba(167, 140, 94, .12) !important;
  animation: none !important;
}

@media (max-width: 640px) {
  html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroAside {
    padding: 17px !important;
  }

  html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics button {
    padding: 11px 7px !important;
  }

  html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroMetrics small {
    font-size: 8px !important;
    letter-spacing: .015em !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardPhotoHero .proDashboardHeroPhoto {
    animation: none !important;
  }
}
            /* PLACEMENT AI BUTTON — CLEAR FOREST GREEN */
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero button.proDashboardAiAction {
  background: linear-gradient(110deg, #24583f 0%, #2f704e 100%) !important;
  background-image: linear-gradient(110deg, #24583f 0%, #2f704e 100%) !important;
  border: 1px solid #7da88d !important;
  border-radius: 11px !important;
  color: #fffdf8 !important;
  -webkit-text-fill-color: #fffdf8 !important;
  box-shadow: 0 7px 18px rgba(36, 88, 63, .22) !important;
  animation: none !important;
  transition: background .2s ease, border-color .2s ease,
              transform .2s ease, box-shadow .2s ease !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero button.proDashboardAiAction,
html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero button.proDashboardAiAction * {
  color: #fffdf8 !important;
  -webkit-text-fill-color: #fffdf8 !important;
  opacity: 1 !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero button.proDashboardAiAction small {
  color: #e6f0e8 !important;
  -webkit-text-fill-color: #e6f0e8 !important;
}

html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero button.proDashboardAiAction:hover {
  background: linear-gradient(110deg, #2d6949 0%, #3b8058 100%) !important;
  background-image: linear-gradient(110deg, #2d6949 0%, #3b8058 100%) !important;
  border-color: #a4c5af !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 10px 22px rgba(36, 88, 63, .27) !important;
}

@media (prefers-reduced-motion: reduce) {
  html body .proRoleDashboard.proRoleDashboard-placement-cell .proDashboardHero.proDashboardPhotoHero button.proDashboardAiAction {
    transition: none !important;
  }
}
      `}</style>

      <section className="proDashboardHero proDashboardPhotoHero">
        {role === "Main Admin" ? <AdminBeamsBackground /> : (
<img
          className="proDashboardHeroPhoto"
          src="/rnsit-campus-gate.png"
          alt=""
          aria-hidden="true"
        />
)}

        <div
          className="proDashboardHeroPhotoOverlay"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            background:
              "linear-gradient(90deg, rgba(250,247,240,.98) 0%, rgba(250,247,240,.94) 24%, rgba(250,247,240,.80) 41%, rgba(250,247,240,.42) 59%, rgba(250,247,240,.10) 76%, rgba(250,247,240,0) 100%)",
          }}
        />
        <div className="proDashboardOrb proDashboardOrbOne" />
        <div className="proDashboardOrb proDashboardOrbTwo" />

        <div
          className="proDashboardHeroContent"
          style={{
            position: "relative",
            zIndex: 3,
            maxWidth: 680,
          }}
        >
          {role ===
            "Main Admin" &&
            adminEditing ? (
            <input
              className="proAdminHeroInput proAdminHeroEyebrow"
              value={
                adminCopy.eyebrow
              }
              onChange={event =>
                setAdminCopy(
                  current => ({
                    ...current,
                    eyebrow:
                      event.target
                        .value,
                  })
                )
              }
            />
          ) : (
            <span>
              {role ===
              "Main Admin"
                ? adminCopy.eyebrow
                : config.eyebrow}
            </span>
          )}

          {role ===
            "Main Admin" &&
            adminEditing ? (
            <input
              className="proAdminHeroInput proAdminHeroTitle"
              value={
                adminCopy.title
              }
              onChange={event =>
                setAdminCopy(
                  current => ({
                    ...current,
                    title:
                      event.target
                        .value,
                  })
                )
              }
            />
          ) : (
            <h1
              style={{
                color: "#263b46",
                textShadow: "none",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontWeight: 500,
              }}
            >
              {config.title}
            </h1>
          )}

          {role ===
            "Main Admin" &&
            adminEditing ? (
            <textarea
              className="proAdminHeroInput proAdminHeroDescription"
              value={
                adminCopy.description
              }
              onChange={event =>
                setAdminCopy(
                  current => ({
                    ...current,
                    description:
                      event.target
                        .value,
                  })
                )
              }
            />
          ) : (
            <p
              style={{
                color: "#5f7079",
                textShadow: "none",
                maxWidth: 600,
              }}
            >
              {config.description}
            </p>
          )}
        </div>

        <aside
          className="proDashboardHeroAside"
          style={{
            position: "relative",
            zIndex: 4,
            alignSelf: "center",
            background: "rgba(255,255,255,.93)",
            border: "1px solid rgba(255,255,255,.95)",
            borderRadius: 20,
            boxShadow: "0 22px 50px rgba(31,45,54,.16)",
            backdropFilter: "blur(18px) saturate(120%)",
            WebkitBackdropFilter: "blur(18px) saturate(120%)",
          }}
        >
          <header>
            <span className="proDashboardRoleMark">
              {role === "Main Admin"
                ? "A"
                : role
                    .split(/\s+/)
                    .map(word =>
                      word.charAt(0)
                    )
                    .join("")
                    .slice(0, 2)}
            </span>

            <span>
              <small>LIVE ROLE OVERVIEW</small>
              <strong>{role} workspace</strong>
            </span>

            <i
              className="proDashboardLiveDot"
              aria-label="Campus systems live"
            />
          </header>

          <div className="proDashboardHeroMetrics">
            {config.metrics
              .slice(0, 3)
              .map(metric => (
                <button
                  type="button"
                  key={metric.label}
                  onClick={() => {
                    if (metric.target) {
                      go(metric.target);
                    }
                  }}
                  disabled={!metric.target}
                >
                  <small>{metric.label}</small>

                  <strong>
                    {loading
                      ? "—"
                      : metric.value}
                  </strong>
                </button>
              ))}
          </div>

          <button
            type="button"
            className="proDashboardAiAction"
            onClick={() =>
              go("My Campus")
            }
          >
            <i aria-hidden="true">✦</i>

            <span>
              <strong>Open Campus AI</strong>
              <small>
                Authenticated role intelligence
              </small>
            </span>

            <b aria-hidden="true">→</b>
          </button>
        </aside>
      </section>

      <nav className="proDashboardRail">
        <button
          type="button"
          onClick={() =>
            document
              .getElementById(
                "pro-dashboard-overview"
              )
              ?.scrollIntoView({
                behavior: "smooth",
              })
          }
        >
          <i>⌂</i>
          Overview
        </button>

        <button
          type="button"
          onClick={() =>
            document
              .getElementById(
                "pro-dashboard-priorities"
              )
              ?.scrollIntoView({
                behavior: "smooth",
              })
          }
        >
          <i>◈</i>
          Priorities
        </button>

        <button
          type="button"
          onClick={() =>
            document
              .getElementById(
                "pro-dashboard-readiness"
              )
              ?.scrollIntoView({
                behavior: "smooth",
              })
          }
        >
          <i>◎</i>
          Readiness
        </button>

        <button
          type="button"
          onClick={() =>
            document
              .getElementById(
                "pro-dashboard-actions"
              )
              ?.scrollIntoView({
                behavior: "smooth",
              })
          }
        >
          <i>✦</i>
          Quick actions
        </button>

        <span>
          <i />
          Live workspace
        </span>
      </nav>

      <section
        className="proDashboardBody"
        id="pro-dashboard-overview"
      >
        {(role === "Coordinator" || role === "Main Admin") && (
          <StudentNoticeBoard role={role} profile={profile} />
        )}
        {role !== "Student" && (
        <RoleActionCenter
          role={role}
          go={go}
        />
      )}

      {role !== "Student" && (
        <StaffOperationsBoard
          role={role}
          go={go}
        />
      )}



        <section className="proDashboardMetrics">
          {config.metrics.map(
            (metric, index) => (
              <button
                type="button"
                key={
                  metric.label
                }
                className="proDashboardMetric"
                style={{
                  "--pro-delay":
                    `${index * 70}ms`,
                } as CSSProperties}
                onClick={() => {
                  if (
                    metric.target
                  ) {
                    go(
                      metric.target
                    );
                  }
                }}
              >
                <small>
                  {metric.label}
                </small>

                <strong>
                  {loading
                    ? "—"
                    : metric.value}
                </strong>

                <span>
                  {metric.note}
                </span>

                <i>↗</i>
              </button>
            )
          )}
        </section>

        <section className="proDashboardGrid">
          <div className="proDashboardMainColumn">

            <article
              className="proDashboardPanel proDashboardGlass"
              id="pro-dashboard-priorities"
            >
              <header>
                <div>
                  <span>
                    TODAY&apos;S
                    PRIORITIES
                  </span>

                  <h3>
                    Your focused
                    workspace
                  </h3>
                </div>

                <b>
                  Live
                </b>
              </header>

              <div className="proDashboardPriorityList">
                {config.priorities.map(
                  priority => (
                    <button
                      type="button"
                      key={
                        priority.title
                      }
                      onClick={() => {
                        if (
                          priority.target
                        ) {
                          go(
                            priority.target
                          );
                        }
                      }}
                    >
                      <i>
                        {
                          priority.icon
                        }
                      </i>

                      <p>
                        <strong>
                          {
                            priority.title
                          }
                        </strong>

                        <small>
                          {
                            priority.description
                          }
                        </small>
                      </p>

                      <span>
                        {
                          priority.badge
                        }
                      </span>

                      <em>
                        →
                      </em>
                    </button>
                  )
                )}
              </div>
            </article>

            <article
              className="proDashboardPanel"
              id="pro-dashboard-readiness"
            >
              <header>
                <div>
                  <span>
                    PERFORMANCE
                    INTELLIGENCE
                  </span>

                  <h3>
                    Real-time
                    readiness
                  </h3>
                </div>
              </header>

              <div
                className={`proDashboardSignal proSignal-${signalClass(
                  overallSignal
                )}`}
              >
                <div
                  className="proDashboardSignalRing"
                  style={{
                    "--pro-signal":
                      `${Math.min(
                        100,
                        Math.max(
                          0,
                          overallSignal
                        )
                      ) * 3.6}deg`,
                  } as CSSProperties}
                >
                  <div>
                    <strong>
                      {
                        overallSignal
                      }
                    </strong>

                    <small>
                      /100
                    </small>
                  </div>
                </div>

                <div>
                  <span>
                    OVERALL SIGNAL
                  </span>

                  <b>
                    {
                      currentSignal.title
                    }
                  </b>

                  <small>
                    {
                      currentSignal.subtitle
                    }
                  </small>
                </div>
              </div>

              <div className="proDashboardSignalRows">
                {signals.map(
                  signal => (
                    <div
                      key={
                        signal.label
                      }
                    >
                      <p>
                        <span>
                          {
                            signal.label
                          }
                        </span>

                        <b>
                          {
                            signal.value
                          }
                          %
                        </b>
                      </p>

                      <i>
                        <span
                          style={{
                            width:
                              `${signal.value}%`,
                          }}
                        />
                      </i>
                    </div>
                  )
                )}
              </div>
            </article>
          </div>

          <aside
            className="proDashboardSideColumn"
            id="pro-dashboard-actions"
          >
            <article className="proDashboardPanel proDashboardGlass">
              <header>
                <div>
                  <span>
                    QUICK ACTIONS
                  </span>

                  <h3>
                    Work faster
                  </h3>
                </div>
              </header>

              <div className="proDashboardQuickGrid">
                {config.quick.map(
                  action => (
                    <button
                      type="button"
                      key={
                        action.title
                      }
                      onClick={() => {
                        if (
                          action
                            .calculator
                        ) {
                          onOpenCalculator?.();
                          return;
                        }

                        if (
                          action.target
                        ) {
                          go(
                            action.target
                          );
                        }
                      }}
                    >
                      <i>
                        {
                          action.icon
                        }
                      </i>

                      <b>
                        {
                          action.title
                        }
                      </b>

                      <small>
                        {
                          action.description
                        }
                      </small>

                      <span>
                        →
                      </span>
                    </button>
                  )
                )}
              </div>
            </article>

            <article className="proDashboardInsightCard">
              <span>
                CAMPUSCONNECT
                INTELLIGENCE
              </span>

              <h3>
                {role ===
                "Student"
                  ? "Your strongest next move is visible."
                  : role ===
                    "Placement Cell"
                  ? "Recruitment operations stay connected."
                  : role ===
                    "Main Admin"
                  ? "Governance without dashboard noise."
                  : "Your highest-priority work stays visible."}
              </h3>

              <p>
                This panel adapts to
                each role instead of
                showing the same
                generic dashboard to
                everyone.
              </p>

              <div className="proDashboardInsightPulse">
                <i />
                Dynamic CampusConnect
                signal
              </div>
            </article>
          </aside>
        </section>
      </section>
    </div>
  );
}
