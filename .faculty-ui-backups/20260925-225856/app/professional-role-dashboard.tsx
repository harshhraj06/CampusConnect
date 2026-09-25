"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import {getSupabaseClient} from "../lib/supabase";

import {RoleActionCenter} from "./role-action-center";
import {StaffOperationsBoard} from "./staff-operations-board";

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

    const facultyDepartment =
      profile.department?.trim() ||
      "Academic Faculty";


    const facultyMetrics = [
      {
        label: "Assignments",
        value: counts.primary,
        note: "Coursework records",
      },
      {
        label: "Attendance",
        value: counts.secondary,
        note: "Attendance records",
      },
      {
        label: "Resources",
        value: counts.tertiary,
        note: "Published learning assets",
      },
      {
        label: "Announcements",
        value: counts.fourth,
        note: "Campus communication",
      },
    ];


    return (
      <div
        className="proRoleDashboard proRoleDashboard-faculty facultyMinimalDashboard facultyExecutiveDashboard"
      >

        <section className="facultyMinimalCommand facultyExecutiveHero">

          <div className="facultyMinimalCommandMain">

            <div className="facultyMinimalCommandEyebrow">
              <i aria-hidden="true" />

              <span>
                FACULTY OVERVIEW
              </span>

              <b>
                LIVE
              </b>
            </div>


            <h2>
              Professional teaching dashboard
            </h2>


            <p>
              {facultyDepartment}
              {" · "}
              Live classes, coursework, student support and faculty
              operations in one focused command view.
            </p>

          </div>


          <div className="facultyMinimalCommandActions facultyExecutiveActions">

            <button
              type="button"
              className="facultyMinimalPrimary"
              onClick={() =>
                go(
                  "Faculty Workspace"
                )
              }
            >
              <span>
                Open Workspace
              </span>

              <b>
                →
              </b>
            </button>


            <button
              type="button"
              onClick={() =>
                go(
                  "My Campus"
                )
              }
              title="Open Campus AI"
            >
              <i aria-hidden="true">
                ✦
              </i>

              Campus AI
            </button>


            {onOpenCalculator && (
              <button
                type="button"
                onClick={
                  onOpenCalculator
                }
                title="Open SGPA / CGPA calculator"
              >
                <i aria-hidden="true">
                  ∑
                </i>

                SGPA / CGPA
              </button>
            )}

          </div>

        </section>


        <section
          className="facultyMinimalMetrics"
          aria-label="Faculty live overview"
        >

          {facultyMetrics.map(
            metric => (

              <article
                key={
                  metric.label
                }
              >

                <span>
                  {
                    metric.label
                  }
                </span>


                <strong>
                  {
                    loading
                      ? "—"
                      : metric.value
                  }
                </strong>


                <small>
                  {
                    metric.note
                  }
                </small>

              </article>

            )
          )}

        </section>


        <section className="facultyMinimalIntelligence">

          <RoleActionCenter
            role={role}
            go={go}
          />

        </section>


        <section className="facultyMinimalOperations">

          <StaffOperationsBoard
            role={role}
            go={go}
          />

        </section>

      </div>
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
      `}</style>

      <section className="proDashboardHero proDashboardPhotoHero">
        <img
          className="proDashboardHeroPhoto"
          src="/rnsit-campus-gate.png"
          alt=""
          aria-hidden="true"
        />

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
