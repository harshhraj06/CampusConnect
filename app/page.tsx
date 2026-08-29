"use client";

import {CampusMagazine} from "./campus-magazine";


import {CampusAI} from "./campus-ai";
import ImportantNoticeRail from "./important-notice-rail";
import {MyCampusRecruiterPreview} from "./my-campus-recruiters";

import {ResumeStudio} from "./resume-studio";

import Image from "next/image";
import type {User} from "@supabase/supabase-js";
import {useEffect, useState, type CSSProperties, type FormEvent, type ReactNode} from "react";
import {getSupabaseClient} from "../lib/supabase";
import {CampusModule, campusModuleSubtitle, isCampusModuleView, savePlacementApplication} from "./campus-modules";
import {CampusSearch, type SearchTarget} from "./campus-search";
import {
  UnifiedNotificationCenter,
  UnifiedNotificationWatcher,
} from "./unified-notification-center";
import {StudentPlacements, type PlacementJob} from "./placement-experience";
import {ActivityCenter} from "./activity-center";
import {FacultyDirectory} from "./faculty-directory";
import {PlacementOperations} from "./placement-operations";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {GradeCalculator, openGradeCalculator} from "./grade-calculator";
import {ProfessionalRoleDashboard} from "./professional-role-dashboard";

import StudentPerformanceTracker from "./student-performance-tracker";

type View = SearchTarget;
type Role = "Student" | "Faculty" | "Placement Cell" | "Coordinator" | "Volunteer" | "Main Admin";
type Screen = "welcome" | "auth" | "dashboard";
type AuthMode = "login" | "register" | "forgot" | "reset";
type NotificationFilter = "all" | "unread";
type NotificationKind = "placement" | "academic" | "resume" | "network" | "campus";

const viewLabel = (view: View) =>
  view === "Campus"
    ? "Campus Life"
    : view;
type Profile = {
  name: string;
  email: string;
  department: string;
  year: string;
  role: Role;
  bio: string;
  skills: string;
  phone: string;
  usn: string;
  cgpa?: number | string | null;
  campus_uid?: string;
  avatar_url?: string;
};
type CampusNotification = {
  id: string;
  kind: NotificationKind;
  label: string;
  title: string;
  message: string;
  time: string;
  target: View;
  avatar_url?: string;
};

const nav: [View, string][] = [
  ["Dashboard", "⌂"],
  ["My Campus", "◇"],
  ["Announcements", "▣"],
  ["Assignments", "✓"],
  ["Attendance", "◷"],
  ["Campus", "◇"],

  ["Placements", "◈"],
  ["Applications", "▤"],
  ["Learning", "▶"],
  ["Groups", "◉"],
  ["Network", "◎"],
  ["Resume", "▤"],
  ["Academics", "▦"],
  ["Faculty Directory", "♙"],
  ["Activity Center", "✦"],
  ["Profile", "◌"],
];

const navByRole: Record<Role, [View, string][]> = {
  Student: nav,

  Faculty: [
    ["Dashboard", "⌂"],
    ["My Campus", "◇"],
    ["Announcements", "▣"],
    ["Assignments", "✓"],
    ["Attendance", "◷"],
    ["Learning", "▶"],
    ["Groups", "◉"],
    ["Academics", "▦"],
    ["Network", "◎"],
    ["Analytics", "▥"],
    ["Campus", "◇"],
    ["Faculty Directory", "♙"],
    ["Activity Center", "✦"],
    ["Profile", "◌"],
  ],

  "Placement Cell": [
    ["Dashboard", "⌂"],
    ["My Campus", "◇"],
    ["Placements", "◈"],
    ["Applications", "▤"],
    ["Announcements", "▣"],
    ["Learning", "▶"],
    ["Groups", "◉"],
    ["Network", "◎"],
    ["Analytics", "▥"],
    ["Campus", "◇"],
    ["Faculty Directory", "♙"],
    ["Activity Center", "✦"],
    ["Profile", "◌"],
  ],

  Coordinator: [
    ["Dashboard", "⌂"],
    ["My Campus", "◇"],
    ["Announcements", "▣"],
    ["Learning", "▶"],
    ["Groups", "◉"],
    ["Campus", "◇"],
    ["Activity Center", "✦"],
    ["Network", "◎"],
    ["Faculty Directory", "♙"],
    ["Profile", "◌"],
  ],

  Volunteer: [
    ["Dashboard", "⌂"],
    ["My Campus", "◇"],
    ["Announcements", "▣"],
    ["Learning", "▶"],
    ["Campus", "◇"],
    ["Groups", "◉"],
    ["Faculty Directory", "♙"],
    ["Activity Center", "✦"],
    ["Profile", "◌"],
  ],

  "Main Admin": [
    ["Dashboard", "⌂"],
    ["My Campus", "◇"],
    ["Announcements", "▣"],
    ["Assignments", "✓"],
    ["Attendance", "◷"],
    ["Placements", "◈"],
    ["Applications", "▤"],
    ["Learning", "▶"],
    ["Groups", "◉"],
    ["Network", "◎"],
    ["Academics", "▦"],
    ["Analytics", "▥"],
    ["Admin", "⚙"],
    ["Campus", "◇"],
    ["Activity Center", "✦"],
    ["Faculty Directory", "♙"],
    ["Profile", "◌"],
  ],
};

const sidebarStatus: Record<Role, {value: string; title: string; note: string}> = {
  Student: {
    value: "LIVE",
    title: "Profile workspace",
    note: "Data synced from Supabase",
  },
  Faculty: {
    value: "LIVE",
    title: "Faculty workspace",
    note: "Data synced from Supabase",
  },
  "Placement Cell": {
    value: "LIVE",
    title: "Operations workspace",
    note: "Data synced from Supabase",
  },
  Coordinator: {
    value: "LIVE",
    title: "Coordinator workspace",
    note: "Campus activities and event operations",
  },
  Volunteer: {
    value: "LIVE",
    title: "Volunteer workspace",
    note: "Assigned event operations",
  },
  "Main Admin": {
    value: "ADMIN",
    title: "Platform administration",
    note: "Accounts, access and system controls",
  },
};

const headerActions: Record<Role, {secondary: string; secondaryView: View; primary: string; primaryView: View}> = {
  Student: {
    secondary: "Preview resume",
    secondaryView: "Resume",
    primary: "Create post",
    primaryView: "Network",
  },
  Faculty: {
    secondary: "View classes",
    secondaryView: "Attendance",
    primary: "Open resources",
    primaryView: "Learning",
  },
  "Placement Cell": {
    secondary: "Campus groups",
    secondaryView: "Groups",
    primary: "Review drives",
    primaryView: "Placements",
  },
  Coordinator: {
    secondary: "Announcements",
    secondaryView: "Announcements",
    primary: "Campus events",
    primaryView: "Campus",
  },
  Volunteer: {
    secondary: "Announcements",
    secondaryView: "Announcements",
    primary: "Event operations",
    primaryView: "Campus",
  },
  "Main Admin": {
    secondary: "Campus",
    secondaryView: "Campus",
    primary: "Administration",
    primaryView: "Admin",
  },
};

const jobs: PlacementJob[] = [];
const proofPoints = [
  ["Live", "placement operations"],
  ["Private", "student documents"],
  ["Verified", "campus directory"],
  ["Secure", "role-based access"],
];

const reasons = [
  ["Placement-ready profile", "Track drives, match scores, deadlines and preparation gaps before the placement cell rush starts."],
  ["Verified campus network", "Connect with seniors, alumni, classmates and placement mentors in one professional student space."],
  ["ATS resume builder", "Improve your resume with live scoring, project impact suggestions and export-ready structure."],
  ["Academics in control", "See timetable, attendance, notices, assignments and resources without jumping across groups."],
];

const modules = [
  ["Placements", "Eligibility, matches, applications"],
  ["Learning", "YouTube videos and previous papers"],
  ["Groups", "Role-based discussion communities"],
  ["Network", "Posts, seniors, alumni, mentors"],
  ["Resume", "ATS score, sections, suggestions"],
  ["Academics", "Attendance, timetable, resources"],
  ["Campus", "Events, notices, club activity"],
];

const roleCards: {role: Role; title: string; text: string; icon: string}[] = [
  {
    role: "Student",
    title: "Student workspace",
    text: "Placements, academics, resources, events and campus network.",
    icon: "S",
  },
  {
    role: "Faculty",
    title: "Faculty console",
    text: "Classes, attendance, assignments and academic resources.",
    icon: "F",
  },
  {
    role: "Placement Cell",
    title: "Placement command center",
    text: "Recruitment drives, applications and placement operations.",
    icon: "P",
  },
  {
    role: "Coordinator",
    title: "Coordinator workspace",
    text: "Events, announcements, communities and campus activities.",
    icon: "C",
  },
  {
    role: "Volunteer",
    title: "Volunteer workspace",
    text: "Assigned events, attendees and check-in operations.",
    icon: "V",
  },
  {
    role: "Main Admin",
    title: "Administration",
    text: "Users, roles, permissions and CampusConnect administration.",
    icon: "A",
  },
];

const roleInsights: Record<Role, {title: string; text: string; actions: string[]}> = {
  Student: {
    title: "Your student workspace is ready",
    text: "Use the live modules to manage placements, academics, resources and your campus profile.",
    actions: ["Placements", "Assignments", "Profile"],
  },
  Faculty: {
    title: "Your faculty workspace is ready",
    text: "Publish academic content, maintain attendance and support students from one secure console.",
    actions: ["Assignments", "Attendance", "Learning"],
  },
  "Placement Cell": {
    title: "Your placement workspace is ready",
    text: "Create recruitment drives, review applications and manage trusted campus access.",
    actions: ["Placements", "Applications", "Admin"],
  },
  Coordinator: {
    title: "Your coordinator workspace is ready",
    text: "Manage campus activities, announcements, communities and event operations.",
    actions: ["Campus", "Announcements", "Groups"],
  },
  Volunteer: {
    title: "Your volunteer workspace is ready",
    text: "Support assigned campus events, attendee check-ins and coordinator updates.",
    actions: ["Campus", "Announcements", "Groups"],
  },
  "Main Admin": {
    title: "CampusConnect administration is ready",
    text: "Manage platform access, users, roles and campus-wide operational controls.",
    actions: ["Admin", "Campus", "Analytics"],
  },
};

const emptyProfile: Profile = {name: "", email: "", department: "", year: "", role: "Student", bio: "", skills: "", phone: "", usn: ""};


const CAMPUSCONNECT_LAST_VIEW_KEY =
  "campusconnect:last-view";

const notificationsByRole: Record<Role, CampusNotification[]> = {
  Student: [],
  Faculty: [],
  "Placement Cell": [],
  Coordinator: [],
  Volunteer: [],
  "Main Admin": [],
};

const notificationIcons: Record<NotificationKind, string> = {
  placement: "P",
  academic: "A",
  resume: "R",
  network: "N",
  campus: "C",
};

export default function Home() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [role, setRole] = useState<Role>("Student");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [jobs, setJobs] = useState<PlacementJob[]>([]);
  const [v, setV] = useState<View>("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [applied, setApplied] = useState<string[]>([]);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
    const [score, setScore] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>("all");
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<CampusNotification[]>([]);
  const [unifiedExternalUnreadCount, setUnifiedExternalUnreadCount] = useState(0);
  const [checkingSession, setCheckingSession] = useState(() => Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ));

  useEffect(() => {
    let active = true;

    const loadAppliedPlacements =
      async () => {
        const client =
          getSupabaseClient();

        if (
          !client ||
          role !== "Student"
        ) {
          return;
        }

        const {
          data: auth,
        } =
          await client.auth
            .getUser();

        if (
          !auth.user ||
          !active
        ) {
          return;
        }

        const {
          data,
          error,
        } =
          await client
            .from(
              "placement_applications"
            )
            .select(
              "placement_id"
            )
            .eq(
              "student_id",
              auth.user.id
            )
            .not(
              "placement_id",
              "is",
              null
            );

        if (
          error ||
          !active
        ) {
          if (error) {
            console.error(
              "[Placement] Applied drives:",
              error
            );
          }

          return;
        }

        setApplied(
          (data || [])
            .map(row =>
              String(
                row.placement_id ||
                ""
              )
            )
            .filter(Boolean)
        );
      };

    void loadAppliedPlacements();

    return () => {
      active = false;
    };
  }, [
    profile.email,
    role,
  ]);


  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getSession().then(async ({data}) => {
      if (!active || !data.session) return;
      const restoredProfile = await profileFromUser(data.session.user);
      if (!active) return;
      setProfile(restoredProfile);
      setRole(restoredProfile.role);
      setReadNotificationIds(
        getStoredNotificationReads(
          restoredProfile
        )
      );


      /*
       * Restore the page that was open before refresh.
       * If that page is no longer available for this role,
       * safely return to Dashboard.
       */
      const savedView =
        window.localStorage.getItem(
          CAMPUSCONNECT_LAST_VIEW_KEY
        ) as View | null;


      const roleViews =
        navByRole[
          restoredProfile.role
        ];


      const savedViewIsAllowed =
        savedView === "Dashboard" ||
        (
          savedView &&
          roleViews.some(
            ([viewName]) =>
              viewName === savedView
          )
        );


      setV(
        savedViewIsAllowed &&
        savedView
          ? savedView
          : "Dashboard"
      );


      setScreen("dashboard");
    }).catch(() => {
      // The sign-in screen remains available when a stored session cannot be restored.
    }).finally(() => {
      if (active) setCheckingSession(false);
    });

    const {data: {subscription}} = supabase.auth.onAuthStateChange(event => {
      if (active && event === "PASSWORD_RECOVERY") {
        setAuthMode("reset");
        setScreen("auth");
      }
      if (active && event === "SIGNED_OUT") {

        window.localStorage.removeItem(
          CAMPUSCONNECT_LAST_VIEW_KEY
        );

        setProfile(
          emptyProfile
        );

        setRole(
          "Student"
        );

        setV(
          "Dashboard"
        );

        setScreen(
          "welcome"
        );
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * =========================================================
   * REMEMBER CURRENT WORKSPACE PAGE
   * =========================================================
   *
   * Refreshing CampusConnect should keep the user on the
   * current module instead of returning to Dashboard.
   */

  useEffect(() => {

    if (
      screen !== "dashboard"
    ) {
      return;
    }


    window.localStorage.setItem(
      CAMPUSCONNECT_LAST_VIEW_KEY,
      v
    );

  }, [
    v,
    screen,
  ]);


  useEffect(() => {
    let active = true;
    const client = getSupabaseClient();
    if (!client) return;
    client
      .from("placement_drives")
      .select("*")
      .order("deadline", {ascending: true})
      .then(async ({data, error}) => {

        if (!active) {
          return;
        }

        if (error) {
          console.error(
            "[Placement] Failed to load placement_drives:",
            {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            }
          );

          setJobs([]);
          return;
        }

        console.log(
          "[Placement] placement_drives loaded:",
          data?.length || 0,
          data
        );

        const next =
          ((data || []) as Array<Record<string, unknown>>)
            .map(toPlacementJob);

        console.log(
          "[Placement] converted jobs:",
          next.length,
          next
        );

        const counted =
          await Promise.all(
            next.map(async job => {
              const result =
                await client
                  .from("placement_applications")
                  .select(
                    "id",
                    {
                      count: "exact",
                      head: true,
                    }
                  )
                  .eq(
                    "company",
                    job.c
                  );

              if (result.error) {
                console.error(
                  "[Placement] application count failed:",
                  job.c,
                  result.error
                );
              }

              return {
                ...job,
                applications:
                  result.count || 0,
              };
            })
          );

        console.log(
          "[Placement] final jobs:",
          counted.length,
          counted
        );

        setJobs(counted);

        if (profile.email) {
          client.auth
            .getUser()
            .then(
              async ({data: auth}) => {

                if (!auth.user) {
                  return;
                }

                const {
                  data: saved,
                  error: savedError,
                } =
                  await client
                    .from(
                      "saved_placements"
                    )
                    .select(
                      "placement_id,placement_drives(company)"
                    )
                    .eq(
                      "student_id",
                      auth.user.id
                    );

                if (savedError) {
                  console.error(
                    "[Placement] saved placements failed:",
                    savedError
                  );

                  return;
                }

                setSavedJobs(
                  (saved || [])
                    .map(
                      (row: any) =>
                        String(
                          row
                            .placement_drives
                            ?.company || ""
                        )
                    )
                    .filter(Boolean)
                );
              }
            );
        }
      });
    return () => { active = false; };
  }, [screen]);

  useEffect(() => {
    let active = true; const client = getSupabaseClient(); if (!client || !profile.email) return;
    Promise.all([client.from("announcements").select("id,title,body,category,created_at").order("created_at", {ascending: false}).limit(20), client.from("placement_applications").select("id,company,role_title,status,updated_at").order("updated_at", {ascending: false}).limit(10)]).then(([announcements, applications]) => {
      if (!active) return;
      const items: CampusNotification[] = [];
      for (const row of announcements.data || []) items.push({id:`announcement-${row.id}`,kind: row.category === "Placement" ? "placement" : "academic",label: row.category,title: row.title,message: row.body,time: friendlyRelative(String(row.created_at)),target:"Announcements"});
      if (role === "Student") for (const row of applications.data || []) items.push({id:`application-${row.id}`,kind:"placement",label:"Application",title:`${row.company} · ${row.role_title}`,message:`Application status: ${row.status}`,time:friendlyRelative(String(row.updated_at)),target:"Applications"});
      setLiveNotifications(items.slice(0, 30));
    }); return () => { active = false; };
  }, [profile.email, role]);

  useEffect(() => {
    const navigate = (event: Event) => { const target = (event as CustomEvent<string>).detail; if (target) setV(target as View); };
    window.addEventListener("campus-navigate", navigate);
    return () => window.removeEventListener("campus-navigate", navigate);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    setProfile(emptyProfile);
    setRole("Student");
    setReadNotificationIds([]);
    setNotificationsOpen(false);
    setNotificationFilter("all");
    setApplied([]);
    setSavedJobs([]);
    setV("Dashboard");
    setScreen("welcome");
  };

  if (checkingSession) return <LoadingScreen/>;

  if (screen === "welcome") {
    return <WelcomeDashboard onEnter={nextRole => { setRole(nextRole); setAuthMode("login"); setScreen("auth"); }} />;
  }

  if (screen === "auth") {
    return <AuthScreen initialRole={role} initialMode={authMode} onBack={() => setScreen("welcome")} onAuthenticated={nextProfile => {
      setProfile(nextProfile);
      setRole(nextProfile.role);
      setReadNotificationIds(getStoredNotificationReads(nextProfile));
      setV("Dashboard");
      setScreen("dashboard");
    }}/>;
  }

  const initials = getInitials(profile.name);
  const firstName = profile.name.split(" ")[0];
  const roleNav = navByRole[role];
  const status = sidebarStatus[role];
  const actions = headerActions[role];
  const roleNotifications = liveNotifications;
  const unreadCount =
    roleNotifications.filter(
      item =>
        !readNotificationIds.includes(
          item.id
        )
    ).length +
    unifiedExternalUnreadCount;
  const profileFields = [
    profile.name,
    profile.department,
    profile.year,
    profile.bio,
    profile.skills,
    profile.phone,
    profile.usn,
  ];

  const sidebarProfileCompletion = Math.round(
    (profileFields.filter(value => String(value || "").trim()).length /
      profileFields.length) *
      100
  );


  const saveNotificationReads = (ids: string[]) => {
    const nextIds = Array.from(new Set(ids));
    setReadNotificationIds(nextIds);
    storeNotificationReads(profile, nextIds);
  };

  const markNotificationRead = (id: string) => {
    if (!readNotificationIds.includes(id)) saveNotificationReads([...readNotificationIds, id]);
  };

  const openNotification = (item: CampusNotification) => {
    markNotificationRead(item.id);
    setV(item.target);
    setNotificationsOpen(false);
  };

  return (
    <>

      

      <GradeCalculator />

      <button
        type="button"
        className="campusGradeLauncher"
        onClick={openGradeCalculator}
        title="Open CampusConnect SGPA / CGPA Calculator"
      >
        <i>∑</i>
        <span>SGPA / CGPA</span>
      </button>

      {v === "Dashboard" && (
        <button
          type="button"
          className="campusAiLauncher"
          onClick={() => {
            setV("My Campus");
            setSidebarOpen(false);
            setNotificationsOpen(false);
          }}
          title="Open Campus AI"
          aria-label="Open Campus AI"
        >
          <i>✦</i>
          <span>Campus AI</span>
        </button>
      )}

      <main className={`shell ${sidebarOpen ? "" : "sidebarCollapsed"}`}>
      <aside>
        <button
          className="brand brandLogo"
          onClick={() => setV("Dashboard")}
          aria-label="Open CampusConnect dashboard"
        >
          <img
            src="/campusconnect-logo.png"
            alt="CampusConnect Pro"
            className="campusConnectLogo"
          />
        </button>
        <div className="college"><i>R</i><p><strong>RNS Institute of Technology</strong><small>{role} workspace</small></p></div>
        <nav>
          <label>WORKSPACE</label>
          {roleNav.map(([n, i]) => <button className={v === n ? "active" : ""} onClick={() => {
  setV(n);
  setSidebarOpen(false);
  setNotificationsOpen(false);
}} key={n === "Campus" ? "Campus Life" : n}><i>{i}</i>{viewLabel(n)}{n === "Placements" && <em>8</em>}</button>)}
        </nav>
        {role === "Student" ? (
          <div className="sidebarProfileProgress">
            <span className="sidebarProfileIcon">◆</span>

            <strong>Complete your profile</strong>

            <p>
              Add your skills & interests to get better recommendations.
            </p>

            <div className="sidebarProfileBar">
              <span
                style={{
                  width: `${Math.min(100, sidebarProfileCompletion)}%`,
                }}
              />
            </div>

            <small>{sidebarProfileCompletion}% Complete</small>

            <button onClick={() => setV("Profile")}>
              Complete now →
            </button>
          </div>
        ) : (
          <div className="strength">
            <b>{status.value}</b>
            <p>
              {status.title}
              <small>{status.note}</small>
            </p>
          </div>
        )}
        <div className="me"><button className="avatarButton" onClick={() => setV("Profile")} aria-label="Open profile" title="Open profile"><Avatar t={initials} src={profile.avatar_url} alt={`${profile.name} profile`}/></button><p><strong>{profile.name}</strong><small>{profile.department} · {profile.year}</small></p><button className="signOut" onClick={signOut} aria-label="Sign out" title="Sign out">↪</button></div>
      </aside>
      <section className="workspace">
        <header className="workspaceHeader">
          <div className="workspaceBrand">

            <button
              type="button"
              className="topSidebarToggle"
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();

                setNotificationsOpen(false);

                setSidebarOpen(
                  current => !current
                );
              }}
              aria-label={
                sidebarOpen
                  ? "Close sidebar"
                  : "Open sidebar"
              }
              aria-expanded={sidebarOpen}
              title={
                sidebarOpen
                  ? "Close sidebar"
                  : "Open sidebar"
              }
            >
              <span></span>
              <span></span>
              <span></span>
            </button>


            <button
              type="button"
              className="workspaceBrandHome"
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();

                setV("Dashboard");
                setSidebarOpen(false);
                setNotificationsOpen(false);
              }}
              aria-label="Open CampusConnect dashboard"
              title="Dashboard"
            >
              <img
                src="/campusconnect-logo.png"
                alt="CampusConnect Pro"
                className="workspaceBrandLogo"
              />
            </button>

          </div>

          <CampusSearch
            role={role}
            onNavigate={target => {
              if (target === "Campus AI") {
                setV("My Campus");
                setNotificationsOpen(false);

                window.setTimeout(() => {
                  document
                    .getElementById("campusconnect-ai-workspace")
                    ?.scrollIntoView({
                      behavior: window.matchMedia(
                        "(prefers-reduced-motion: reduce)"
                      ).matches
                        ? "auto"
                        : "smooth",
                      block: "start",
                    });
                }, 0);

                return;
              }

              setV(target);
              setNotificationsOpen(false);
            }}
          />
          <div className="headerUser">
            <div className="notificationDock">
              <UnifiedNotificationWatcher
                onCount={
                  setUnifiedExternalUnreadCount
                }
              />
              <button className={`notificationBell ${notificationsOpen ? "active" : ""}`} onClick={() => setNotificationsOpen(value => !value)} aria-label={`Notifications, ${unreadCount} unread`} aria-expanded={notificationsOpen}>
                <span aria-hidden="true">♢</span>{unreadCount > 0 && <b>{unreadCount}</b>}
              </button>
              {notificationsOpen && <>
                <button className="notificationScrim" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}/>
                <UnifiedNotificationCenter
                  role={role}
                  items={roleNotifications}
                  readIds={readNotificationIds}
                  filter={notificationFilter}
                  onFilter={setNotificationFilter}
                  onClose={() => setNotificationsOpen(false)}
                  onOpen={openNotification}
                  onReadAll={() => saveNotificationReads([...readNotificationIds, ...roleNotifications.map(item => item.id)])}
                />
              </>}
            </div>
            <button
              type="button"
              className="headerProfileIdentity"
              onClick={() => setV("Profile")}
              aria-label="Open profile"
              title="Open profile"
            >
              <span className="headerProfileAvatar">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                  />
                ) : (
                  initials
                )}
              </span>

              <span className="headerProfileText">
                <span className="headerProfileNameRow">
                  <strong>
                    {profile.name || "Campus user"}
                  </strong>

                  <i
                    className="headerProfileStatus"
                    aria-hidden="true"
                  />
                </span>

                <small>
                  {profile.role}
                  {profile.department
                    ? ` · ${profile.department}`
                    : ""}
                </small>
              </span>
            </button>
          </div>
        </header>

        <ImportantNoticeRail
          profile={{
            name: profile.name,
            role: profile.role,
          }}
        />

        <div className="content">
          <div className={`heading professionalHeading ${v === "Dashboard" ? "dashboardTopBar" : ""}`}>
            <div className="headingMain">
              <div className="campusPageHeading">
                {v === "Dashboard" ? (
                  <div className="dashboardProfessionalHeading">
                    <div className="campusIdentityLine dashboardIdentityLine">
                      <span>RNSIT CAMPUS</span>
                      <i aria-hidden="true"></i>
                      <small>CampusConnect</small>
                    </div>

                    <LiveDashboardGreeting
                      firstName={firstName}
                    />

                    <div className="dashboardMetaRow">
                      <span>
                        {new Intl.DateTimeFormat("en-IN", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        }).format(new Date())}
                      </span>

                      <i aria-hidden="true"></i>

                      <span>{role} workspace</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1>{viewLabel(v)}</h1>
                    <p>
                      {subtitle(v, role)}
                      <span className="roleContext">
                        Viewing as {role}
                      </span>
                    </p>
                  </>
                )}
              </div>
            </div>

            {v === "Dashboard" && (
              <div className="headingActions">
                <button
                  className="dashboardHeaderSecondary"
                  onClick={() => setV(actions.secondaryView)}
                >
                  {actions.secondary}
                </button>

                <button
                  className="dashboardHeaderPrimary"
                  onClick={() => setV(actions.primaryView)}
                >
                  + {actions.primary}
                </button>
              </div>
            )}
          </div>
          {v === "Dashboard" && (
            <>
              <AllRoleFestivalBanner
                role={role}
                onManageFestival={() => {
                  setV("Announcements");
                  setNotificationsOpen(false);
                }}
              />

              

              {role === "Student" ? (
                <Dashboard
                  go={setV}
                  score={score}
                  role={role}
                  jobs={jobs}
                  profile={profile}
                />
              ) : (
                <ProfessionalRoleDashboard
                  role={role}
                  profile={profile}
                  go={setV}
                  onOpenCalculator={() => {
                    window.dispatchEvent(
                      new CustomEvent(
                        "campus-open-grade-calculator"
                      )
                    );
                  }}
                />
              )}
            </>
          )}
          {v === "My Campus" && (
            <MyCampus
              profile={profile}
            />
          )}
          {v === "Placements" && (role === "Placement Cell" ? <PlacementOperations profile={profile}/> : <StudentPlacements
          profile={profile}
            jobs={jobs}
            applied={applied}
            saved={savedJobs}
            onOpenApplications={() => setV("Applications")}
            toggleSaved={company => {
              const job = jobs.find(item => item.c === company); const client = getSupabaseClient();
              if (!job?.id || !client) return;
              void client.auth.getUser().then(async ({data: auth}) => {
                if (!auth.user) return;
                if (savedJobs.includes(company)) {
                  await client.from("saved_placements").delete().eq("student_id", auth.user.id).eq("placement_id", job.id);
                  setSavedJobs(current => current.filter(item => item !== company));
                } else {
                  const {error} = await client.from("saved_placements").insert({student_id: auth.user.id, placement_id: job.id});
                  if (!error) setSavedJobs(current => [...current, company]);
                }
              });
            }}
            apply={company => {
              const job =
                jobs.find(
                  item =>
                    item.c === company
                );

              if (
                !job?.id
              ) {
                console.error(
                  "[Placement] Cannot apply: placement drive ID missing.",
                  company
                );

                return;
              }

              void savePlacementApplication(
                profile,
                job.id,
                job.c,
                job.r ||
                  "Campus opportunity"
              )
                .then(() => {
                  setApplied(
                    current =>
                      current.includes(
                        job.id!
                      )
                        ? current
                        : [
                            ...current,
                            job.id!,
                          ]
                  );
                })
                .catch(error => {
                  console.error(
                    "[Placement] Application failed:",
                    error
                  );
                });
            }}
          />)} 
          {v === "Network" && <Network profile={profile}/>} 
          {v === "Resume" && <Resume profile={profile} score={score} improve={() => setScore(current => Math.min(100, current + 6))}/>} 
          {v === "Academics" && <Academics role={role} profile={profile}/>} 
          {v === "Campus" && (
            <Campus
              profile={profile}
            />
          )}

{v === "Activity Center" && (
            <ActivityCenter
              profile={profile}
            />
          )}
          {v === "Faculty Directory" && (
            <FacultyDirectory
              profile={profile}
            />
          )}

          {v === "Campus" && (
            <CampusMagazine profile={profile} />
          )}

          {v === "Profile" && <ProfilePage profile={profile} onProfileChange={next => { setProfile(next); setRole(next.role); }} onSignOut={signOut}/>}
          {isCampusModuleView(v) && <CampusModule view={v} profile={profile} onProfileChange={nextProfile => {
  setProfile(current => ({
    ...current,
    ...nextProfile,
  }));
  setRole(nextProfile.role);
}}/>}
        </div>
        <footer>{roleNav.slice(0, 5).map(([n, i]) => <button className={v === n ? "active" : ""} onClick={() => {
  setV(n);
  setSidebarOpen(false);
  setNotificationsOpen(false);
}} key={n}><i>{i}</i><small>{viewLabel(n)}</small></button>)}</footer>
      </section>
    </main>
    </>
  );
}


type RoleDashboardCounts = {
  primary: number;
  secondary: number;
  tertiary: number;
  fourth: number;
};

type RoleDashboardMetric = {
  label: string;
  value: string;
  note: string;
};

type RoleDashboardTask = {
  icon: string;
  title: string;
  note: string;
  badge: string;
  target?: View;
};

type RoleDashboardQuickAction = {
  icon: string;
  title: string;
  note: string;
  target?: View;
  panel?: string;
};


function WelcomeDashboard({onEnter}: {onEnter: (role: Role) => void}) {
  const [selectedRole, setSelectedRole] = useState<Role>("Student");

  return (
    <main className="welcome">
      <nav className="welcomeNav">
        <button className="welcomeBrand" onClick={() => onEnter(selectedRole)}><b>C</b><span>CampusConnect</span></button>
        <div>
          <a href="#about">About</a>
          <a href="#why">Why use it</a>
          <a href="#inside">Inside</a>
          <button onClick={() => onEnter(selectedRole)}>Enter dashboard</button>
        </div>
      </nav>

      <section className="welcomeHero">
        <div className="heroCopy">
          <span className="eyebrow">Campus success platform</span>
          <h1>One professional dashboard for college life, placements and growth.</h1>
          <p>
            CampusConnect brings placements, resume building, attendance, events, notices and verified student networking into one clean workspace for students and colleges.
          </p>
          <div className="heroActions">
            <button className="enterBtn" onClick={() => onEnter(selectedRole)}>Enter as {selectedRole}</button>
            <a href="#why">See why it matters</a>
          </div>
          <div className="roleChooser" aria-label="Choose CampusConnect role">
            {roleCards.map(card => <button className={selectedRole === card.role ? "selected" : ""} onClick={() => setSelectedRole(card.role)} key={card.role}>
              <i>{card.icon}</i>
              <span><b>{card.title}</b><small>{card.text}</small></span>
            </button>)}
          </div>
          <div className="proofStrip">
            {proofPoints.map(([value, label]) => <p key={label}><b>{value}</b><small>{label}</small></p>)}
          </div>
        </div>

        <div className="heroMedia" aria-label="CampusConnect students collaboration preview">
          <Image src="/campusconnect-hero.png" alt="Students collaborating on a college campus with a laptop" fill priority unoptimized sizes="(max-width: 1040px) 100vw, 50vw"/>
          <div className="floatingMetric metricOne"><b>94%</b><span>profile match</span></div>
          <div className="floatingMetric metricTwo"><b>ATS 78</b><span>resume score</span></div>
          <div className="miniPanel">
            <span>Today</span>
            <strong>Placement workshop</strong>
            <small>3:15 PM · Seminar Hall</small>
          </div>
        </div>
      </section>

      <section className="aboutBand" id="about">
        <div>
          <span className="eyebrow">About CampusConnect</span>
          <h2>Built for students who want more than scattered WhatsApp updates.</h2>
        </div>
        <p>
          The idea is simple: every student should know what to do next. CampusConnect gives one verified place for opportunities, resources, campus updates, student achievements and career progress.
        </p>
      </section>

      <section className="whyGrid" id="why">
        <div className="sectionTitle">
          <span className="eyebrow">Why use CampusConnect</span>
          <h2>It turns campus information into action.</h2>
        </div>
        {reasons.map(([title, text], index) => <article style={{"--delay": `${index * 90}ms`} as CSSProperties} key={title}>
          <i>{index + 1}</i>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>)}
      </section>

      <section className="insideShowcase" id="inside">
        <div className="insideCopy">
          <span className="eyebrow">What is inside</span>
          <h2>A complete student operating system.</h2>
          <p>Open the dashboard to move through placement drives, networking, resume scoring, academics, events and official notices.</p>
          <button className="enterBtn" onClick={() => onEnter(selectedRole)}>Go inside the website</button>
        </div>
        <div className="dashboardPreview">
          <div className="previewTop"><span/><span/><span/></div>
          <div className="previewLayout">
            <aside>{modules.map(([title]) => <b key={title}>{title}</b>)}</aside>
            <section>
              <div className="previewHero"/>
              <div className="previewCards">
                {modules.slice(0, 4).map(([title, text]) => <article key={title}><b>{title}</b><small>{text}</small></article>)}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthScreen({initialRole, initialMode, onBack, onAuthenticated}: {
  initialRole: Role;
  initialMode: AuthMode;
  onBack: () => void;
  onAuthenticated: (profile: Profile) => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<Role>(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({name: "", email: "", password: "", department: "ECE", year: "2027"});

  const update = (field: keyof typeof form, value: string) => {
    setForm(current => ({...current, [field]: value}));
    setError("");
    setSuccess("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = form.email.trim();
    setError("");
    setSuccess("");

    if (mode === "register" && form.name.trim().length < 2) {
      setError("Enter your full name to create an account.");
      return;
    }
    if (mode !== "reset" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid college email address.");
      return;
    }
    if (mode !== "forgot" && form.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("CampusConnect is not connected to Supabase. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before signing in.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "reset") {
        const {error: updateError} = await supabase.auth.updateUser({password: form.password});
        if (updateError) throw updateError;
        setSuccess("Password updated successfully. You can now sign in with your new password.");
        setMode("login");
        return;
      }
      if (mode === "forgot") {
        const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
        const {error: resetError} = await supabase.auth.resetPasswordForEmail(email, redirectTo ? {redirectTo} : undefined);
        if (resetError) throw resetError;
        setSuccess("If this email belongs to a CampusConnect account, a password reset link has been sent.");
        return;
      }
      if (mode === "register") {
        const {data, error: authError} = await supabase.auth.signUp({
          email,
          password: form.password,
          options: {
          emailRedirectTo: `${window.location.origin}/auth/verified`,
            data: {
              full_name: form.name.trim(),
              department: form.department,
              graduation_year: form.year,
            },
          },
        });

        if (authError) throw authError;
        if (data.session) await supabase.auth.signOut();
        setForm(current => ({...current, password: ""}));
        setMode("login");
        setSuccess(data.user && !data.session ? "Registration successful. Check your email if confirmation is required, then sign in." : "Registration successful. Please sign in with your new account.");
        return;
      }

      const {data, error: authError} =
        await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        });

      if (authError) throw authError;

      // Never trust the role selected in the browser.
      // The verified Supabase profile is the source of truth.
      const verifiedProfile =
        await profileFromUser(data.user);

      onAuthenticated(verifiedProfile);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="authPage">
      <section className="authVisual">
        <Image src="/campusconnect-hero.png" alt="Students working together on campus" fill priority unoptimized sizes="(max-width: 720px) 100vw, 48vw"/>
        <button className="authBack" onClick={onBack}>← Back to CampusConnect</button>
        <div className="authVisualCopy">
          <span>Verified campus workspace</span>
          <h1>Your college journey, connected.</h1>
          <p>Access placements, academics, resources and your campus network from one focused workspace.</p>
          <div><b>Secure</b> accounts <b>Live</b> campus data <b>Private</b> documents</div>
        </div>
      </section>

      <section className="authPanel">
        <div className="authBox">
          <button className="authBrand" onClick={onBack}><b>C</b><span>CampusConnect</span></button>
          <div className="authHeading">
            <span>{mode === "login" ? "Welcome back" : "Join your campus"}</span>
            <h2>{mode === "login" ? "Sign in to continue" : "Create your account"}</h2>
            <p>{mode === "login" ? "Your verified account role decides which dashboard opens." : "Student accounts can register with a verified college email."}</p>
          </div>

          <div className="authTabs" role="tablist" aria-label="Authentication mode">
            <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); setSuccess(""); }}>Sign in</button>
            <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setRole("Student"); setError(""); setSuccess(""); }}>Register</button>
            <button className={mode === "forgot" ? "active" : ""} onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}>Forgot password</button>
          </div>

          {mode !== "forgot" && mode !== "reset" && <div className="authRoles" aria-label="Select account role">
            {(mode === "register"
              ? roleCards.filter(card => card.role === "Student")
              : roleCards
            ).map(card => <button type="button" className={role === card.role ? "selected" : ""} onClick={() => { setRole(card.role); setError(""); setSuccess(""); }} key={card.role}>
              <i>{card.icon}</i><span>{card.role}</span>
            </button>)}
          </div>}

          <form onSubmit={submit} noValidate>
            {mode === "register" && <p className="staffNotice">Staff, coordinators, volunteers and administrator accounts are created by the Main Admin.</p>}
            {mode === "forgot" && <p className="staffNotice">Enter your registered email. We will send a secure password reset link if the account exists.</p>}
            {mode === "reset" && <p className="staffNotice">Choose a new password for your CampusConnect account.</p>}
            {mode === "register" && <label>Full name<input value={form.name} onChange={event => update("name", event.target.value)} placeholder="Enter your full name" autoComplete="name"/></label>}
            {mode !== "reset" && <label>College email<input type="email" value={form.email} onChange={event => update("email", event.target.value)} placeholder="you@college.edu" autoComplete="email"/></label>}
            {mode === "register" && <div className="authFieldRow">
              <label>Department<select value={form.department} onChange={event => update("department", event.target.value)}><option>ECE</option><option>CSE</option><option>ISE</option><option>EEE</option><option>Mechanical</option><option>Civil</option><option>Career Development Centre</option></select></label>
              {role === "Student" && <label>Graduation year<select value={form.year} onChange={event => update("year", event.target.value)}><option>2026</option><option>2027</option><option>2028</option><option>2029</option></select></label>}
            </div>}
            {mode !== "forgot" && <label>Password<div className="passwordField"><input type={showPassword ? "text" : "password"} value={form.password} onChange={event => update("password", event.target.value)} placeholder="Minimum 6 characters" autoComplete={mode === "login" ? "current-password" : "new-password"}/><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? "Hide" : "Show"}</button></div></label>}
            {mode !== "forgot" && null}
            {error && <p className="authError" role="alert">{error}</p>}
            {success && <p className="authSuccess" role="status">{success}</p>}
            <button className="authSubmit" type="submit" disabled={submitting}>{submitting ? "Please wait..." : mode === "login" ? "Sign in securely" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Update password" : "Create Student account"} <span>→</span></button>
          </form>

          <div className="authDivider"><span>Secure access</span></div>
          <small className="setupNote">Accounts, roles and campus data are stored securely in Supabase. Staff roles must be approved by the Placement Cell.</small>
        </div>
      </section>
    </main>
  );
}

function AllRoleFestivalBanner({
  role,
  onManageFestival,
}: {
  role: Role;
  onManageFestival: () => void;
}) {
  type FestivalRow = {
    id: string;
    title: string;
    body: string;
    author_name: string;
    banner_url?: string | null;
    banner_cta_label?: string;
    banner_cta_url?: string | null;
    banner_dismissible?: boolean;
    show_floating_banner?: boolean;
  };

  const [items, setItems] =
    useState<FestivalRow[]>([]);

  const [index, setIndex] =
    useState(0);

  const [hidden, setHidden] =
    useState<string[]>([]);

  const [celebration, setCelebration] =
    useState<FestivalRow | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const client =
        getSupabaseClient();

      if (!client) {
        console.error(
          "[ALL ROLE FESTIVAL] Supabase unavailable"
        );

        return;
      }

      const {
        data,
        error,
      } = await client.rpc(
        "get_active_festival_wishes"
      );

      if (!active) {
        return;
      }

      if (error) {
        console.error(
          "[ALL ROLE FESTIVAL] RPC error:",
          error
        );

        return;
      }

      const rows =
        (data || []) as FestivalRow[];

      console.log(
        "[ALL ROLE FESTIVAL] refreshed:",
        rows
      );

      setItems(rows);

      setHidden(
        current =>
          current.filter(
            id =>
              rows.some(
                item =>
                  item.id === id
              )
          )
      );

      setIndex(
        current =>
          rows.length
            ? Math.min(
                current,
                rows.length - 1
              )
            : 0
      );

      /*
       * Do not replay confetti every time data refreshes.
       * Celebration only runs on the initial page load.
       */
    };


    const initialLoad =
      async () => {

        const client =
          getSupabaseClient();

        if (!client) {
          return;
        }

        const {
          data,
          error,
        } = await client.rpc(
          "get_active_festival_wishes"
        );

        if (
          !active ||
          error
        ) {
          if (error) {
            console.error(
              "[ALL ROLE FESTIVAL] initial load error:",
              error
            );
          }

          return;
        }

        const rows =
          (data || []) as FestivalRow[];

        setItems(rows);
        setIndex(0);

        const floating =
          rows.find(
            item =>
              item.show_floating_banner ===
              true
          );

        if (floating) {
          setCelebration(
            floating
          );

          window.setTimeout(
            () => {
              if (active) {
                setCelebration(
                  null
                );
              }
            },
            5000
          );
        }
      };


    const handleFestivalChanged =
      (
        event: Event
      ) => {

        const customEvent =
          event as CustomEvent<{
            action?: string;
            id?: string;
          }>;

        if (
          customEvent.detail
            ?.action ===
            "deleted" &&
          customEvent.detail.id
        ) {

          const deletedId =
            customEvent.detail.id;

          setItems(
            current =>
              current.filter(
                item =>
                  item.id !==
                  deletedId
              )
          );

          setCelebration(
            current =>
              current?.id ===
                deletedId
                ? null
                : current
          );

          setIndex(0);
        }

        void load();
      };


    void initialLoad();

    window.addEventListener(
      "campus-festival-changed",
      handleFestivalChanged
    );


    /*
     * Also refresh when the user returns to the browser tab.
     * This fixes festivals deleted from another account/tab.
     */
    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void load();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );


    return () => {
      active = false;

      window.removeEventListener(
        "campus-festival-changed",
        handleFestivalChanged
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };

  }, []);

  const visible =
    items.filter(
      item =>
        !hidden.includes(item.id)
    );

  if (!visible.length) {
    return null;
  }

  const current =
    visible[
      index % visible.length
    ];

  return (
    <>
      {celebration && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99998,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          {Array.from({
            length: 35,
          }).map((_, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${(i * 29) % 100}%`,
                top: "-20px",
                fontSize: `${12 + (i % 4) * 4}px`,
                animation:
                  `festivalFall ${2.5 + (i % 5) * .3}s linear ${(i % 8) * .08}s forwards`,
              }}
            >
              {i % 3 === 0
                ? "✦"
                : i % 3 === 1
                ? "●"
                : "◆"}
            </span>
          ))}
        </div>
      )}

      {celebration && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(560px, calc(100vw - 30px))",
            zIndex: 99999,
            borderRadius: "20px",
            background: "rgba(17,18,22,.96)",
            color: "#fff",
            padding: "20px 54px 20px 22px",
            boxShadow:
              "0 24px 80px rgba(0,0,0,.32)",
          }}
        >
          <small
            style={{
              letterSpacing: ".14em",
              opacity: .6,
              fontSize: "9px",
            }}
          >
            ✦ CAMPUS CELEBRATION
          </small>

          <strong
            style={{
              display: "block",
              marginTop: "7px",
              fontSize: "21px",
            }}
          >
            {celebration.title}
          </strong>

          <p
            style={{
              margin:
                "7px 0 0",
              opacity: .72,
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          >
            {celebration.body}
          </p>

          <button
            type="button"
            onClick={() =>
              setCelebration(null)
            }
            style={{
              position: "absolute",
              right: "16px",
              top: "16px",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              border:
                "1px solid rgba(255,255,255,.18)",
              background:
                "rgba(255,255,255,.08)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      )}

      <section
        data-all-role-festival="true"
        style={{
          display: "grid",
          gridTemplateColumns:
            current.banner_url
              ? "minmax(220px, 34%) minmax(0, 1fr)"
              : "1fr",
          width: "100%",
          marginBottom: "24px",
          overflow: "hidden",
          borderRadius: "26px",
          background:
            "linear-gradient(135deg,#121318,#20242d)",
          color: "#fff",
          boxShadow:
            "0 20px 60px rgba(14,18,28,.15)",
          position: "relative",
          zIndex: 10,
        }}
      >
        {current.banner_url && (
          <button
            type="button"
            onClick={() =>
              window.open(
                current.banner_url || "",
                "_blank",
                "noopener,noreferrer"
              )
            }
            style={{
              border: 0,
              padding: 0,
              background: "#111",
              cursor: "pointer",
              minHeight: "230px",
              overflow: "hidden",
            }}
          >
            <img
              src={current.banner_url}
              alt={current.title}
              style={{
                width: "100%",
                height: "100%",
                minHeight: "230px",
                objectFit: "cover",
                display: "block",
              }}
            />
          </button>
        )}

        <div
          style={{
            padding:
              "clamp(24px,4vw,42px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: ".18em",
              opacity: .58,
            }}
          >
            ✦ CAMPUS CELEBRATION
          </span>

          <h2
            style={{
              margin: "10px 0 9px",
              fontSize:
                "clamp(26px,3vw,40px)",
              letterSpacing: "-.04em",
            }}
          >
            {current.title}
          </h2>

          <p
            style={{
              margin: 0,
              maxWidth: "720px",
              opacity: .7,
              fontSize: "12px",
              lineHeight: 1.7,
            }}
          >
            {current.body}
          </p>

          <div
            style={{
              marginTop: "22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <small
              style={{
                opacity: .55,
              }}
            >
              Best wishes from CampusConnect Team
            </small>

            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              {current.banner_cta_url && (
                <a
                  href={
                    current.banner_cta_url
                  }
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#fff",
                    textDecoration: "none",
                    padding: "9px 13px",
                    borderRadius: "999px",
                    background:
                      "rgba(255,255,255,.1)",
                    fontSize: "10px",
                  }}
                >
                  {current.banner_cta_label ||
                    "Explore"}{" "}
                  ↗
                </a>
              )}

              {visible.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setIndex(
                        currentIndex =>
                          (
                            currentIndex -
                            1 +
                            visible.length
                          ) %
                          visible.length
                      )
                    }
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      border:
                        "1px solid rgba(255,255,255,.15)",
                      background:
                        "rgba(255,255,255,.07)",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setIndex(
                        currentIndex =>
                          (
                            currentIndex +
                            1
                          ) %
                          visible.length
                      )
                    }
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      border:
                        "1px solid rgba(255,255,255,.15)",
                      background:
                        "rgba(255,255,255,.07)",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    ›
                  </button>
                </>
              )}

              {role === "Main Admin" && (
                <button
                  type="button"
                  className="festivalDashboardManageButton"
                  onClick={event => {
                    event.stopPropagation();
                    onManageFestival();
                  }}
                  aria-label={`Edit ${current.title}`}
                  title="Edit festival"
                >
                  <span>✎</span>
                  Edit festival
                </button>
              )}


              {current.banner_dismissible !==
                false && (
                <button
                  type="button"
                  onClick={() => {
                    setHidden(
                      old => [
                        ...old,
                        current.id,
                      ]
                    );

                    setIndex(0);
                  }}
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    border:
                      "1px solid rgba(255,255,255,.15)",
                    background:
                      "rgba(255,255,255,.07)",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}


function Dashboard({
  go,
  score,
  role,
  jobs,
  profile,
}: {
  go: (v: View) => void;
  score: number;
  role: Role;
  jobs: PlacementJob[];
  profile: Profile;
}) {
  type DashboardAttendance = {
    id: string;
    subject: string;
    attended: number;
    total: number;
    updated_at?: string;
  };

  type DashboardAssignment = {
    id: string;
    title: string;
    subject: string;
    due_at: string;
    kind: string;
    created_at?: string;
  };

  type DashboardAnnouncement = {
    id: string;
    title: string;
    category: string;
    created_at: string;
    author_name: string;
  };

  type DashboardActivity = {
    id: string;
    type: "attendance" | "assignment" | "announcement" | "application" | "placement";
    title: string;
    meta: string;
    created_at: string;
    target: View;
  };

  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("Student");
  const [attendance, setAttendance] = useState<DashboardAttendance[]>([]);
  const [assignments, setAssignments] = useState<DashboardAssignment[]>([]);
  const [announcements, setAnnouncements] = useState<DashboardAnnouncement[]>([]);

  type DashboardFestival = {
    id: string;
    title: string;
    body: string;
    author_name: string;
    category: string;
    announcement_type?: string;
    show_floating_banner?: boolean;
    banner_url?: string | null;
    banner_start_at?: string | null;
    banner_end_at?: string | null;
    banner_cta_label?: string;
    banner_cta_url?: string | null;
    banner_dismissible?: boolean;
    created_at: string;
  };

  const [
    activeFestivals,
    setActiveFestivals,
  ] =
    useState<
      DashboardFestival[]
    >([]);

  const [
    festivalIndex,
    setFestivalIndex,
  ] =
    useState(0);

  const [
    festivalCelebration,
    setFestivalCelebration,
  ] =
    useState<
      DashboardFestival |
      null
    >(null);

  const [
    dismissedFestivals,
    setDismissedFestivals,
  ] =
    useState<string[]>([]);


  const [applicationCount, setApplicationCount] = useState(0);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([]);
  const [dashboardError, setDashboardError] = useState("");

  const [dashboardHeroSignalIndex, setDashboardHeroSignalIndex] = useState(0);
  const [dashboardHeroGreeting, setDashboardHeroGreeting] = useState("Welcome back");

  useEffect(() => {
    const hour = new Date().getHours();
    setDashboardHeroGreeting(
      hour < 12
        ? "Good morning"
        : hour < 17
        ? "Good afternoon"
        : "Good evening"
    );

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setDashboardHeroSignalIndex(current => (current + 1) % 3);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadFestivalBanners =
      async () => {

        const client =
          getSupabaseClient();

        if (!client) {
          console.error(
            "[Festival] Supabase client unavailable."
          );

          return;
        }

        try {

          const {
            data,
            error,
          } =
            await client.rpc(
              "get_active_festival_wishes"
            );

          if (!mounted) {
            return;
          }

          if (error) {
            console.error(
              "[Festival] RPC failed:",
              error
            );

            setActiveFestivals([]);

            return;
          }

          const rows =
            (data || []) as
              DashboardFestival[];

          console.log(
            "[Festival] loaded for role:",
            role,
            rows
          );

          /*
           * IMPORTANT:
           * Do not restore old global dismissal data.
           * Each fresh login/dashboard load starts visible.
           */
          setDismissedFestivals([]);

          setFestivalIndex(0);

          setActiveFestivals(
            rows
          );


          /*
           * Celebration popup/confetti is optional.
           *
           * Festival banner itself remains visible whether
           * floating celebration is enabled or disabled.
           */
          const celebration =
            rows.find(
              item =>
                item.show_floating_banner ===
                true
            );

          if (celebration) {

            setFestivalCelebration(
              celebration
            );

            window.setTimeout(
              () => {

                if (mounted) {
                  setFestivalCelebration(
                    current =>
                      current?.id ===
                      celebration.id
                        ? null
                        : current
                  );
                }

              },
              5200
            );

          } else {

            setFestivalCelebration(
              null
            );

          }

        } catch (error) {

          console.error(
            "[Festival] unexpected error:",
            error
          );

          if (mounted) {
            setActiveFestivals([]);
          }

        }

      };


    void loadFestivalBanners();


    return () => {
      mounted = false;
    };

  }, [role]);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      const client = getSupabaseClient();

      if (!client) {
        if (active) {
          setDashboardError("Supabase is not configured.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setDashboardError("");

      try {
        const {
          data: {user},
        } = await client.auth.getUser();

        if (!user) {
          throw new Error("Your session has expired. Please sign in again.");
        }

        const [
          profileResult,
          attendanceResult,
          assignmentResult,
          announcementResult,
          applicationResult,
          recentApplicationsResult,
          recentPlacementsResult,
        ] = await Promise.all([
          client
            .from("profiles")
            .select(
              "full_name,department,graduation_year,bio,skills,phone,usn"
            )
            .eq("id", user.id)
            .maybeSingle(),

          client
            .from("attendance_records")
            .select("id,subject,attended,total,updated_at")
            .eq("student_id", user.id)
            .order("subject"),

          client
            .from("assignments")
            .select("id,title,subject,due_at,kind,created_at")
            .gte("due_at", new Date().toISOString())
            .order("due_at", {ascending: true})
            .limit(5),

          client
            .from("announcements")
            .select("id,title,category,created_at,author_name")
            .order("created_at", {ascending: false})
            .limit(5),

          client
            .from("placement_applications")
            .select("id", {count: "exact", head: true})
            .eq("student_id", user.id),

          client
            .from("placement_applications")
            .select("id,company,role_title,status,applied_at,updated_at")
            .eq("student_id", user.id)
            .order("updated_at", {ascending: false})
            .limit(5),

          client
            .from("placement_drives")
            .select("id,company,role_title,created_at,deadline")
            .order("created_at", {ascending: false})
            .limit(5),
        ]);

        if (!active) return;

        if (profileResult.error) {
          console.error(profileResult.error);
        } else if (profileResult.data) {
          const profileData = profileResult.data;

          setStudentName(
            profileData.full_name?.trim() ||
              user.email?.split("@")[0] ||
              "Student"
          );

          const fields = [
            profileData.full_name,
            profileData.department,
            profileData.graduation_year,
            profileData.bio,
            profileData.skills,
            profileData.phone,
            profileData.usn,
          ];

          const completed = fields.filter(
            value => String(value || "").trim().length > 0
          ).length;

          setProfileCompletion(
            Math.round((completed / fields.length) * 100)
          );
        }

        if (attendanceResult.error) {
          console.error(attendanceResult.error);
        } else {
          setAttendance(
            (attendanceResult.data || []) as DashboardAttendance[]
          );
        }

        if (assignmentResult.error) {
          console.error(assignmentResult.error);
        } else {
          setAssignments(
            (assignmentResult.data || []) as DashboardAssignment[]
          );
        }

        if (announcementResult.error) {
          console.error(announcementResult.error);
        } else {
          setAnnouncements(
            (announcementResult.data || []) as DashboardAnnouncement[]
          );
        }

        if (applicationResult.error) {
          console.error(applicationResult.error);
        } else {
          setApplicationCount(applicationResult.count || 0);
        }

        const activityItems: DashboardActivity[] = [];

        if (!attendanceResult.error) {
          for (const item of attendanceResult.data || []) {
            activityItems.push({
              id: `attendance-${item.id}`,
              type: "attendance",
              title: `${item.subject} attendance updated`,
              meta: `${item.attended}/${item.total} classes attended`,
              created_at: item.updated_at || new Date().toISOString(),
              target: "Attendance",
            });
          }
        }

        if (!assignmentResult.error) {
          for (const item of assignmentResult.data || []) {
            activityItems.push({
              id: `assignment-${item.id}`,
              type: "assignment",
              title: item.title,
              meta: `${item.subject} · assignment deadline`,
              created_at: item.created_at || item.due_at,
              target: "Assignments",
            });
          }
        }

        if (!announcementResult.error) {
          for (const item of announcementResult.data || []) {
            activityItems.push({
              id: `announcement-${item.id}`,
              type: "announcement",
              title: item.title,
              meta: `${item.category} announcement`,
              created_at: item.created_at,
              target: "Announcements",
            });
          }
        }

        if (!recentApplicationsResult.error) {
          for (const item of recentApplicationsResult.data || []) {
            activityItems.push({
              id: `application-${item.id}`,
              type: "application",
              title: `${item.company} · ${item.role_title}`,
              meta: `Application status: ${item.status}`,
              created_at: item.updated_at || item.applied_at,
              target: "Applications",
            });
          }
        }

        if (!recentPlacementsResult.error) {
          for (const item of recentPlacementsResult.data || []) {
            activityItems.push({
              id: `placement-${item.id}`,
              type: "placement",
              title: `${item.company} · ${item.role_title}`,
              meta: "New placement opportunity",
              created_at: item.created_at,
              target: "Placements",
            });
          }
        }

        activityItems.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );

        setRecentActivity(activityItems.slice(0, 8));
      } catch (error) {
        if (active) {
          setDashboardError(
            error instanceof Error
              ? error.message
              : "Unable to load dashboard."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, []);


  const universalFestivalBanners =
    activeFestivals.filter(
      item =>
        !dismissedFestivals.includes(
          item.id
        )
    );

  const universalFestival =
    universalFestivalBanners.length
      ? universalFestivalBanners[
          festivalIndex %
          universalFestivalBanners.length
        ]
      : null;


  const dismissUniversalFestival =
    (
      festival:
        DashboardFestival
    ) => {

      setDismissedFestivals(
        current =>
          current.includes(
            festival.id
          )
            ? current
            : [
                ...current,
                festival.id,
              ]
      );

      setFestivalIndex(0);
    };


  /*
   * Festival wishes are institutional content.
   * Once Faculty/Main Admin publishes a Festival with
   * Show on Dashboard enabled, EVERY signed-in role sees it.
   */
  if (role !== "Student") {
    const actions =
      role === "Faculty"
        ? [
            ["Assignments", "Create and review coursework"],
            ["Attendance", "Record student attendance"],
            ["Learning", "Publish verified learning resources"],
          ]
        : [
            ["Placements", "Create and manage recruitment drives"],
            ["Applications", "Review candidate applications"],
            ["Admin", "Manage trusted campus roles"],
          ];

    return (
      <div className="moduleStack roleDashboardWithFestival">

        {festivalCelebration && (

          <div
            className="festivalCelebrationBurst"
            aria-hidden="true"
          >

            {Array.from({
              length: 48,
            }).map((_, index) => (

              <i
                key={index}
                style={{
                  "--festival-x":
                    `${Math.random() * 100}vw`,

                  "--festival-delay":
                    `${Math.random() * .7}s`,

                  "--festival-duration":
                    `${2.3 + Math.random() * 2.1}s`,

                  "--festival-rotate":
                    `${Math.random() * 760}deg`,
                } as CSSProperties}
              />

            ))}

          </div>

        )}


        {festivalCelebration && (

          <section className="festivalWelcomeToast">

            <span>
              ✦ CAMPUS CELEBRATION
            </span>

            <strong>
              {festivalCelebration.title}
            </strong>

            <p>
              {festivalCelebration.body}
            </p>

            <button
              type="button"
              aria-label="Close festival greeting"
              onClick={() =>
                setFestivalCelebration(
                  null
                )
              }
            >
              ×
            </button>

          </section>

        )}


        {universalFestival && (

          <section className="dashboardFestivalBanner universalFestivalBanner">

            {universalFestival.banner_url && (

              <button
                type="button"
                className="dashboardFestivalArtwork"
                onClick={() =>
                  window.open(
                    universalFestival.banner_url || "",
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                aria-label={`Open ${universalFestival.title} festival banner`}
              >

                <img
                  src={
                    universalFestival.banner_url
                  }
                  alt={
                    universalFestival.title
                  }
                />

              </button>

            )}


            <div className="dashboardFestivalBody">

              <span>
                ✦ CAMPUS CELEBRATION
              </span>

              <h2>
                {universalFestival.title}
              </h2>

              <p>
                {universalFestival.body}
              </p>


              <div className="dashboardFestivalFooter">

                <small>
                  Best wishes from CampusConnect Team
                </small>


                <div>

                  {universalFestival.banner_cta_url && (

                    <a
                      href={
                        universalFestival.banner_cta_url
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {
                        universalFestival.banner_cta_label ||
                        "Explore"
                      }
                      {" "}
                      ↗
                    </a>

                  )}


                  {universalFestivalBanners.length > 1 && (

                    <>

                      <button
                        type="button"
                        aria-label="Previous festival"
                        onClick={() =>
                          setFestivalIndex(
                            current =>
                              (
                                current -
                                1 +
                                universalFestivalBanners.length
                              ) %
                              universalFestivalBanners.length
                          )
                        }
                      >
                        ‹
                      </button>


                      <button
                        type="button"
                        aria-label="Next festival"
                        onClick={() =>
                          setFestivalIndex(
                            current =>
                              (
                                current +
                                1
                              ) %
                              universalFestivalBanners.length
                          )
                        }
                      >
                        ›
                      </button>

                    </>

                  )}


                  {universalFestival.banner_dismissible !== false && (

                    <button
                      type="button"
                      className="dashboardFestivalClose"
                      aria-label="Dismiss festival banner"
                      onClick={() =>
                        dismissUniversalFestival(
                          universalFestival
                        )
                      }
                    >
                      ×
                    </button>

                  )}

                </div>

              </div>

            </div>

          </section>

        )}
        <section className="moduleHero">
          <div>
            <span>{role.toUpperCase()} WORKSPACE</span>
            <h2>Campus operations dashboard</h2>
            <p>
              Manage live CampusConnect records from your verified
              role-based workspace.
            </p>
          </div>

          <button
            className="primary"
            onClick={() => go(actions[0][0] as View)}
          >
            Open workspace →
          </button>
        </section>

        <section className="dashboardQuickGrid">
          {actions.map(([view, text]) => (
            <button
              className="dashboardQuickAction card"
              key={view}
              onClick={() => go(view as View)}
            >
              <span>{view}</span>
              <strong>{text}</strong>
              <small>Open module →</small>
            </button>
          ))}
        </section>
      </div>
    );
  }

  const totalAttended = attendance.reduce(
    (sum, item) => sum + Number(item.attended || 0),
    0
  );

  const totalClasses = attendance.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0
  );

  const attendanceAverage =
    totalClasses > 0
      ? Math.round((totalAttended / totalClasses) * 100)
      : 0;

  const safeSubjects = attendance.filter(item => {
    if (!item.total) return false;
    return (item.attended / item.total) * 100 >= 75;
  }).length;

  const dashboardAttendanceChart = attendance.map(item => ({
    subject: item.subject,
    attendance: item.total
      ? Math.round((item.attended / item.total) * 100)
      : 0,
    attended: item.attended,
    total: item.total,
  }));

  const shortageSubjects = attendance.filter(item => {
    if (!item.total) return false;
    return (item.attended / item.total) * 100 < 75;
  }).length;

  const firstName = studentName.split(" ")[0] || "Student";

  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const formatDueDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "No deadline";

    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
    }).format(date);
  };

  const formatActivityTime = (value: string) => {
    const time = new Date(value).getTime();

    if (Number.isNaN(time)) return "";

    const diff = Date.now() - time;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);

    if (days < 7) return `${days}d ago`;

    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
    }).format(new Date(value));
  };

  const daysUntil = (value: string) => {
    const due = new Date(value).getTime();
    const now = Date.now();

    if (Number.isNaN(due)) return "";

    const days = Math.ceil(
      (due - now) / (1000 * 60 * 60 * 24)
    );

    if (days <= 0) return "Due today";
    if (days === 1) return "Due tomorrow";

    return `${days} days left`;
  };

  const visibleFestivalBanners =
    universalFestivalBanners;

  const currentFestival =
    universalFestival;

  const dismissFestival =
    dismissUniversalFestival;

  const dashboardHeroSignals = [
    attendance.length
      ? {
          label: "Attendance signal",
          value: `${attendanceAverage}% overall`,
          note:
            attendanceAverage >= 75
              ? `${safeSubjects} subjects are currently at or above the 75% target.`
              : `${shortageSubjects} subjects currently need attendance attention.`,
        }
      : {
          label: "Attendance signal",
          value: "Awaiting records",
          note: "Attendance insights will appear after faculty records your classes.",
        },
    assignments.length
      ? {
          label: "Academic priority",
          value: `${assignments.length} upcoming ${assignments.length === 1 ? "task" : "tasks"}`,
          note: "Open Assignments to review the nearest authenticated deadlines.",
        }
      : {
          label: "Academic priority",
          value: "No upcoming tasks",
          note: "There are no assignment deadlines currently available to your account.",
        },
    jobs.length
      ? {
          label: "Placement pulse",
          value: `${jobs.length} live ${jobs.length === 1 ? "drive" : "drives"}`,
          note: `${applicationCount} placement ${applicationCount === 1 ? "application is" : "applications are"} currently recorded.`,
        }
      : {
          label: "Placement pulse",
          value: "No live drives",
          note: "New verified recruitment opportunities will appear when published.",
        },
  ];

  const activeDashboardHeroSignal =
    dashboardHeroSignals[dashboardHeroSignalIndex % dashboardHeroSignals.length];


  return (
    <div className="studentDashboard">

      {festivalCelebration && (

        <div
          className="festivalCelebrationBurst"
          aria-hidden="true"
        >

          {Array.from({
            length: 42,
          }).map((_, index) => (

            <i
              key={index}
              style={{
                "--festival-x":
                  `${Math.random() * 100}vw`,

                "--festival-delay":
                  `${Math.random() * .8}s`,

                "--festival-duration":
                  `${2.3 + Math.random() * 2}s`,

                "--festival-rotate":
                  `${Math.random() * 720}deg`,
              } as CSSProperties}
            />

          ))}

        </div>

      )}


      {festivalCelebration && (

        <div className="festivalWelcomeToast">

          <span>
            ✦ CAMPUS CELEBRATION
          </span>

          <strong>
            {festivalCelebration.title}
          </strong>

          <p>
            {festivalCelebration.body}
          </p>

          <button
            type="button"
            aria-label="Close festival greeting"
            onClick={() =>
              setFestivalCelebration(
                null
              )
            }
          >
            ×
          </button>

        </div>

      )}


      {currentFestival && (

        <section className="dashboardFestivalBanner">

          {currentFestival.banner_url && (

            <div className="dashboardFestivalArtwork">

              <img
                src={
                  currentFestival.banner_url
                }
                alt={
                  currentFestival.title
                }
              />

            </div>

          )}


          <div className="dashboardFestivalBody">

            <span>
              ✦ CAMPUS CELEBRATION
            </span>

            <h2>
              {currentFestival.title}
            </h2>

            <p>
              {currentFestival.body}
            </p>


            <div className="dashboardFestivalFooter">

              <small>
                With warm wishes from{" "}
                {
                  currentFestival.author_name ||
                  "CampusConnect"
                }
              </small>


              <div>

                {currentFestival.banner_cta_url && (

                  <a
                    href={
                      currentFestival.banner_cta_url
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    {
                      currentFestival.banner_cta_label ||
                      "Explore"
                    }
                    {" "}
                    ↗
                  </a>

                )}


                {visibleFestivalBanners.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setFestivalIndex(
                          current =>
                            (
                              current -
                              1 +
                              visibleFestivalBanners.length
                            ) %
                            visibleFestivalBanners.length
                        )
                      }
                      aria-label="Previous festival"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setFestivalIndex(
                          current =>
                            (
                              current +
                              1
                            ) %
                            visibleFestivalBanners.length
                        )
                      }
                      aria-label="Next festival"
                    >
                      ›
                    </button>
                  </>
                )}


                {currentFestival.banner_dismissible !== false && (

                  <button
                    type="button"
                    className="dashboardFestivalClose"
                    onClick={() =>
                      dismissFestival(
                        currentFestival
                      )
                    }
                    aria-label="Dismiss festival banner"
                  >
                    ×
                  </button>

                )}

              </div>

            </div>

          </div>

        </section>

      )}


      <section className="studentDashboardHero referenceCampusHero advancedDashboardHero">
        <div className="dashboardHeroAmbient dashboardHeroAmbientOne" aria-hidden="true"/>
        <div className="dashboardHeroAmbient dashboardHeroAmbientTwo" aria-hidden="true"/>

        <div className="referenceCampusHeroMain advancedDashboardHeroMain">
          <div className="referenceCampusEyebrow advancedDashboardEyebrow">
            <span><i/> LIVE STUDENT WORKSPACE</span>
            <small>{dateLabel}</small>
          </div>

          <h2>
            <span>{dashboardHeroGreeting},</span>
            {studentName}.
          </h2>

          <p>
            Your academics, placement progress and campus priorities—organized from live CampusConnect records.
          </p>

          <div className="referenceCampusMeta advancedDashboardMeta">
            <span>{profile.department || "Department not set"}</span>
            <i/>
            <span>{profile.year || "Year not set"}</span>
            <i/>
            <span>{role}</span>
            <em><i/> Synced workspace</em>
          </div>

          <article className="dashboardHeroFocus" aria-live="polite">
            <header>
              <span>0{dashboardHeroSignalIndex + 1}</span>
              <small>{activeDashboardHeroSignal.label}</small>
            </header>
            <div key={`${dashboardHeroSignalIndex}-${activeDashboardHeroSignal.value}`}>
              <strong>{activeDashboardHeroSignal.value}</strong>
              <p>{activeDashboardHeroSignal.note}</p>
            </div>
            <nav aria-label="Choose dashboard signal">
              {dashboardHeroSignals.map((signal, index) => (
                <button
                  type="button"
                  className={dashboardHeroSignalIndex === index ? "active" : ""}
                  onClick={() => setDashboardHeroSignalIndex(index)}
                  aria-label={`Show ${signal.label}`}
                  key={signal.label}
                />
              ))}
            </nav>
          </article>

          <div className="referenceCampusActions advancedDashboardActions">
            <button className="referencePrimaryButton" onClick={() => go("Academics")}>
              Open academics <span>→</span>
            </button>
            <button className="referenceSecondaryButton" onClick={() => go("Placements")}>
              Explore placements
            </button>
          </div>
        </div>

        <div className="dashboardHeroOrbital" aria-hidden="true">
          <i className="dashboardOrbit dashboardOrbitOne"/>
          <i className="dashboardOrbit dashboardOrbitTwo"/>
          <div className="dashboardHeroCore"><span>CC</span><small>LIVE</small></div>
          <article className="dashboardHeroMetric metricAttendance">
            <small>ATTENDANCE</small>
            <strong>{attendance.length ? `${attendanceAverage}%` : "—"}</strong>
          </article>
          <article className="dashboardHeroMetric metricTasks">
            <small>TASKS</small>
            <strong>{assignments.length}</strong>
          </article>
          <article className="dashboardHeroMetric metricDrives">
            <small>DRIVES</small>
            <strong>{jobs.length}</strong>
          </article>
        </div>

        <aside className="referenceProfileReadiness advancedProfileReadiness">
          <div
            className="dashboardReadinessRing"
            style={{"--dashboard-readiness": `${Math.min(100, profileCompletion)}%`} as CSSProperties}
          >
            <span><strong>{profileCompletion}%</strong><small>READY</small></span>
          </div>
          <div className="advancedReadinessCopy">
            <small>PROFILE READINESS</small>
            <h3>{profileCompletion >= 80 ? "Placement ready" : "Build your campus identity"}</h3>
            <p>
              {profileCompletion >= 80
                ? "Your profile has the essential information needed for campus opportunities."
                : "Complete the remaining profile fields to improve verified campus visibility."}
            </p>
          </div>
          <div className="advancedReadinessFacts">
            <span><b>{score || 0}</b><small>Resume score</small></span>
            <span><b>{applicationCount}</b><small>Applications</small></span>
          </div>
          <button onClick={() => go("Profile")}>Review profile <span>→</span></button>
        </aside>
      </section>

      {dashboardError && (
        <div className="dashboardNotice">
          {dashboardError}
        </div>
      )}

      <section className="studentDashboardStats">

        <button
          className="dashboardStatCard"
          onClick={() => go("Attendance")}
        >
          <div>
            <span className="dashboardStatIcon">A</span>
            <small>ATTENDANCE</small>
          </div>

          <strong>
            {loading ? "—" : `${attendanceAverage}%`}
          </strong>

          <p>
            {attendance.length
              ? `${safeSubjects} safe · ${shortageSubjects} shortage`
              : "No attendance recorded yet"}
          </p>
        </button>

        <button
          className="dashboardStatCard"
          onClick={() => go("Assignments")}
        >
          <div>
            <span className="dashboardStatIcon">T</span>
            <small>UPCOMING TASKS</small>
          </div>

          <strong>
            {loading ? "—" : assignments.length}
          </strong>

          <p>
            {assignments.length
              ? "Assignments with upcoming deadlines"
              : "No upcoming assignments"}
          </p>
        </button>

        <button
          className="dashboardStatCard"
          onClick={() => go("Placements")}
        >
          <div>
            <span className="dashboardStatIcon">P</span>
            <small>PLACEMENTS</small>
          </div>

          <strong>
            {loading ? "—" : jobs.length}
          </strong>

          <p>
            {jobs.length
              ? "Live recruitment opportunities"
              : "No live drives right now"}
          </p>
        </button>

        <button
          className="dashboardStatCard"
          onClick={() => go("Applications")}
        >
          <div>
            <span className="dashboardStatIcon">J</span>
            <small>APPLICATIONS</small>
          </div>

          <strong>
            {loading ? "—" : applicationCount}
          </strong>

          <p>
            {applicationCount
              ? "Placement applications submitted"
              : "No applications submitted yet"}
          </p>
        </button>

      </section>


      {(() => {
        const academicHealth =
          attendance.length
            ? Math.max(
                0,
                Math.min(
                  100,
                  attendanceAverage
                )
              )
            : 0;

        const resumeReadiness =
          Math.max(
            0,
            Math.min(
              100,
              score || 0
            )
          );

        const profileReadiness =
          Math.max(
            0,
            Math.min(
              100,
              profileCompletion
            )
          );

        const placementSignal =
          jobs.length
            ? Math.min(
                100,
                58 +
                  Math.min(
                    jobs.length * 4,
                    24
                  ) +
                  Math.min(
                    applicationCount * 3,
                    18
                  )
              )
            : applicationCount
              ? Math.min(
                  100,
                  48 +
                    applicationCount * 5
                )
              : 42;

        const careerReadiness =
          Math.round(
            (
              resumeReadiness +
              profileReadiness +
              placementSignal
            ) / 3
          );

        const pendingActions =
          assignments.length +
          shortageSubjects +
          (profileCompletion < 80
            ? 1
            : 0) +
          (score < 70
            ? 1
            : 0);

        let intelligenceEyebrow =
          "PRIORITY SIGNAL";

        let intelligenceTitle =
          "Your campus activity is on track.";

        let intelligenceCopy =
          "CampusConnect is monitoring your academics, profile and placement activity. Keep your information updated to receive more useful recommendations.";

        let intelligenceAction =
          "View profile";

        let intelligenceTarget:
          View = "Profile";

        let intelligenceTone =
          "stable";

        if (
          shortageSubjects > 0 ||
          (
            attendance.length > 0 &&
            attendanceAverage < 75
          )
        ) {
          intelligenceEyebrow =
            "ACADEMIC PRIORITY";

          intelligenceTitle =
            shortageSubjects > 1
              ? `${shortageSubjects} subjects need attendance recovery.`
              : "Your attendance needs attention.";

          intelligenceCopy =
            "Protect your academic eligibility first. Review low-attendance subjects and calculate the classes required to move safely above the minimum threshold.";

          intelligenceAction =
            "Review attendance";

          intelligenceTarget =
            "Attendance";

          intelligenceTone =
            "warning";

        } else if (
          assignments.length > 0
        ) {
          intelligenceEyebrow =
            "NEXT BEST ACTION";

          intelligenceTitle =
            assignments.length === 1
              ? "Complete your upcoming assignment."
              : `${assignments.length} upcoming tasks need attention.`;

          intelligenceCopy =
            "Your academic health is stable. Clearing the nearest coursework deadline is currently the highest-impact action before shifting focus to placement preparation.";

          intelligenceAction =
            "Open assignments";

          intelligenceTarget =
            "Assignments";

          intelligenceTone =
            "focus";

        } else if (
          profileCompletion < 80
        ) {
          intelligenceEyebrow =
            "PROFILE PRIORITY";

          intelligenceTitle =
            "Improve your placement visibility.";

          intelligenceCopy =
            "Your academics are currently stable, but your CampusConnect profile is incomplete. Completing your verified profile improves placement and network readiness.";

          intelligenceAction =
            "Complete profile";

          intelligenceTarget =
            "Profile";

          intelligenceTone =
            "focus";

        } else if (
          score < 70
        ) {
          intelligenceEyebrow =
            "CAREER PRIORITY";

          intelligenceTitle =
            "Your resume has room to improve.";

          intelligenceCopy =
            "Your profile foundation is strong. Improving resume structure, project impact and skill coverage is the clearest next step for placement readiness.";

          intelligenceAction =
            "Improve resume";

          intelligenceTarget =
            "Resume";

          intelligenceTone =
            "focus";

        } else if (
          jobs.length > 0 &&
          applicationCount === 0
        ) {
          intelligenceEyebrow =
            "PLACEMENT OPPORTUNITY";

          intelligenceTitle =
            `${jobs.length} live placement ${
              jobs.length === 1
                ? "drive is"
                : "drives are"
            } available.`;

          intelligenceCopy =
            "Your current profile and academic signals are healthy. Review live opportunities before deadlines close and apply only where the role fits your goals.";

          intelligenceAction =
            "Explore placements";

          intelligenceTarget =
            "Placements";

          intelligenceTone =
            "opportunity";

        } else if (
          applicationCount > 0
        ) {
          intelligenceEyebrow =
            "APPLICATION TRACKING";

          intelligenceTitle =
            applicationCount === 1
              ? "Track your active placement application."
              : `Track your ${applicationCount} placement applications.`;

          intelligenceCopy =
            "You have entered the recruitment pipeline. Keep application status, preparation and upcoming placement activity visible from one workspace.";

          intelligenceAction =
            "Track applications";

          intelligenceTarget =
            "Applications";

          intelligenceTone =
            "opportunity";
        }

        const overallSignal =
          Math.round(
            (
              academicHealth +
              careerReadiness +
              Math.min(
                100,
                profileReadiness
              )
            ) / 3
          );

        return (
          <section
            className={
              `studentIntelligenceCard ${intelligenceTone}`
            }
          >

            <div className="studentIntelligenceGlow"/>


            <div className="studentIntelligenceMain">

              <div className="studentIntelligenceIdentity">

                <span className="studentIntelligenceMark">
                  CC
                </span>

                <div>
                  <small>
                    CAMPUSCONNECT INTELLIGENCE
                  </small>

                  <strong>
                    Live student decision engine
                  </strong>
                </div>

              </div>


              <div className="studentIntelligencePriority">

                <span>
                  {intelligenceEyebrow}
                </span>

                <h3>
                  {loading
                    ? "Reading your campus signals..."
                    : intelligenceTitle}
                </h3>

                <p>
                  {loading
                    ? "CampusConnect is combining your academics, deadlines, profile and placement activity."
                    : intelligenceCopy}
                </p>

              </div>


              <div className="studentIntelligenceActionRow">

                <button
                  type="button"
                  onClick={() =>
                    go(
                      intelligenceTarget
                    )
                  }
                >
                  {intelligenceAction}
                  <span>→</span>
                </button>

                <small>
                  Updated from your live CampusConnect data
                </small>

              </div>

            </div>


            <aside className="studentIntelligenceSignals">

              <div className="studentIntelligenceScore">

                <div
                  className="studentIntelligenceRing"
                  style={{
                    "--student-intelligence":
                      `${Math.max(
                        0,
                        Math.min(
                          100,
                          overallSignal
                        )
                      ) * 3.6}deg`,
                  } as CSSProperties}
                >
                  <div>
                    <strong>
                      {loading
                        ? "—"
                        : overallSignal}
                    </strong>

                    <small>
                      /100
                    </small>
                  </div>
                </div>

                <div
                  className={`studentOverallSignal ${
                    overallSignal >= 90
                      ? "signalExcellent"
                      : overallSignal >= 80
                        ? "signalStrong"
                        : overallSignal >= 70
                          ? "signalBuilding"
                          : overallSignal >= 60
                            ? "signalAttention"
                            : "signalFocus"
                  }`}
                >
                  <span>
                    OVERALL SIGNAL
                  </span>

                  <b>
                    {overallSignal >= 90
                      ? "Excellent"
                      : overallSignal >= 80
                        ? "Strong"
                        : overallSignal >= 70
                          ? "Building"
                          : overallSignal >= 60
                            ? "Needs attention"
                            : "Needs focus"}
                  </b>

                  <small>
                    {overallSignal >= 90
                      ? "Exceptional readiness"
                      : overallSignal >= 80
                        ? "Placement ready"
                        : overallSignal >= 70
                          ? "Progressing well"
                          : overallSignal >= 60
                            ? "Some areas need improvement"
                            : "Priority improvements required"}
                  </small>
                </div>

              </div>


              <div className="studentIntelligenceMetrics">

                <button
                  type="button"
                  onClick={() =>
                    go(
                      "Attendance"
                    )
                  }
                >
                  <span>
                    Academic health
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : attendance.length
                        ? `${academicHealth}%`
                        : "—"}
                  </strong>

                  <i>
                    <span
                      style={{
                        width:
                          `${academicHealth}%`,
                      }}
                    />
                  </i>
                </button>


                <button
                  type="button"
                  onClick={() =>
                    go(
                      "Resume"
                    )
                  }
                >
                  <span>
                    Career readiness
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : `${careerReadiness}%`}
                  </strong>

                  <i>
                    <span
                      style={{
                        width:
                          `${careerReadiness}%`,
                      }}
                    />
                  </i>
                </button>


                <button
                  type="button"
                  onClick={() =>
                    go(
                      "Assignments"
                    )
                  }
                >
                  <span>
                    Actions pending
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : pendingActions}
                  </strong>

                  <small>
                    Tasks requiring attention
                  </small>
                </button>

              </div>

            </aside>

          </section>
        );
      })()}


      {(() => {

        type StudentPriorityItem = {
          id: string;
          type:
            | "attendance"
            | "assignment"
            | "placement"
            | "profile"
            | "application";
          level:
            | "critical"
            | "high"
            | "medium";
          weight: number;
          title: string;
          meta: string;
          timeLabel: string;
          target: View;
        };


        const priorities:
          StudentPriorityItem[] = [];


        /*
         * -------------------------------------------------------
         * ATTENDANCE PRIORITIES
         * -------------------------------------------------------
         */

        attendance.forEach(item => {

          const percentage =
            item.total
              ? Math.round(
                  (
                    item.attended /
                    item.total
                  ) * 100
                )
              : 0;

          if (
            item.total > 0 &&
            percentage < 75
          ) {

            priorities.push({
              id:
                `priority-attendance-${item.id}`,

              type:
                "attendance",

              level:
                percentage < 65
                  ? "critical"
                  : "high",

              weight:
                percentage < 65
                  ? 100
                  : 90,

              title:
                `${item.subject} attendance is below 75%`,

              meta:
                `${item.attended}/${item.total} classes attended · Current attendance ${percentage}%`,

              timeLabel:
                percentage < 65
                  ? "Critical"
                  : "Needs attention",

              target:
                "Attendance",
            });

          }

        });


        /*
         * -------------------------------------------------------
         * ASSIGNMENT PRIORITIES
         * -------------------------------------------------------
         */

        assignments.forEach(item => {

          const due =
            new Date(
              item.due_at
            ).getTime();

          if (
            Number.isNaN(
              due
            )
          ) {
            return;
          }

          const remaining =
            due -
            Date.now();

          const hours =
            remaining /
            (
              1000 *
              60 *
              60
            );

          if (
            remaining < 0
          ) {
            return;
          }

          if (
            hours >
            24 * 7
          ) {
            return;
          }


          let level:
            StudentPriorityItem["level"] =
              "medium";

          let weight =
            55;

          if (
            hours <= 24
          ) {
            level =
              "critical";

            weight =
              98;
          }

          else if (
            hours <= 72
          ) {
            level =
              "high";

            weight =
              84;
          }


          priorities.push({
            id:
              `priority-assignment-${item.id}`,

            type:
              "assignment",

            level,

            weight,

            title:
              item.title,

            meta:
              `${item.subject} · ${item.kind || "Assignment"}`,

            timeLabel:
              daysUntil(
                item.due_at
              ),

            target:
              "Assignments",
          });

        });


        /*
         * -------------------------------------------------------
         * PLACEMENT DEADLINES
         * -------------------------------------------------------
         */

        jobs.forEach(
          (
            job,
            index
          ) => {

            const deadline =
              String(
                job.d || ""
              );

            const deadlineTime =
              new Date(
                deadline
              ).getTime();

            if (
              Number.isNaN(
                deadlineTime
              )
            ) {
              return;
            }

            const remaining =
              deadlineTime -
              Date.now();

            if (
              remaining < 0
            ) {
              return;
            }

            const hours =
              remaining /
              (
                1000 *
                60 *
                60
              );

            if (
              hours >
              24 * 7
            ) {
              return;
            }


            let level:
              StudentPriorityItem["level"] =
                "medium";

            let weight =
              58;

            if (
              hours <= 24
            ) {
              level =
                "critical";

              weight =
                96;
            }

            else if (
              hours <= 72
            ) {
              level =
                "high";

              weight =
                82;
            }


            priorities.push({
              id:
                `priority-placement-${index}-${job.c}`,

              type:
                "placement",

              level,

              weight,

              title:
                `${job.c} · ${job.r}`,

              meta:
                "Placement application deadline",

              timeLabel:
                daysUntil(
                  deadline
                ),

              target:
                "Placements",
            });

          }
        );


        /*
         * -------------------------------------------------------
         * PROFILE READINESS
         * -------------------------------------------------------
         */

        if (
          profileCompletion <
          80
        ) {

          priorities.push({
            id:
              "priority-profile",

            type:
              "profile",

            level:
              profileCompletion <
              55
                ? "high"
                : "medium",

            weight:
              profileCompletion <
              55
                ? 78
                : 48,

            title:
              "Complete your student profile",

            meta:
              `${profileCompletion}% complete · Improve placement and network visibility`,

            timeLabel:
              "Recommended",

            target:
              "Profile",
          });

        }


        /*
         * -------------------------------------------------------
         * APPLICATION TRACKING
         * -------------------------------------------------------
         */

        if (
          applicationCount >
          0
        ) {

          priorities.push({
            id:
              "priority-applications",

            type:
              "application",

            level:
              "medium",

            weight:
              42,

            title:
              `Track ${applicationCount} placement ${
                applicationCount === 1
                  ? "application"
                  : "applications"
              }`,

            meta:
              "Review application status and recruiter updates",

            timeLabel:
              "Monitor",

            target:
              "Applications",
          });

        }


        const sortedPriorities =
          priorities
            .sort(
              (
                a,
                b
              ) =>
                b.weight -
                a.weight
            )
            .slice(
              0,
              6
            );


        const criticalCount =
          priorities.filter(
            item =>
              item.level ===
              "critical"
          ).length;


        const highCount =
          priorities.filter(
            item =>
              item.level ===
              "high"
          ).length;


        const priorityIcon = (
          type:
            StudentPriorityItem["type"]
        ) => {

          if (
            type ===
            "attendance"
          ) {
            return "A";
          }

          if (
            type ===
            "assignment"
          ) {
            return "T";
          }

          if (
            type ===
            "placement"
          ) {
            return "P";
          }

          if (
            type ===
            "profile"
          ) {
            return "R";
          }

          return "J";
        };


        return (

          <section className="studentPriorityCenter">

            <header className="studentPriorityHeader">

              <div>

                <div className="studentPriorityEyebrow">

                  <span>
                    PRIORITY CENTER
                  </span>

                  <i />

                  <small>
                    Live CampusConnect signals
                  </small>

                </div>


                <h2>
                  What needs your attention
                </h2>

                <p>
                  Deadlines, attendance risks and placement actions
                  are automatically ranked using your live campus data.
                </p>

              </div>


              <div className="studentPrioritySummary">

                <div
                  className={
                    criticalCount
                      ? "critical"
                      : ""
                  }
                >

                  <strong>
                    {criticalCount}
                  </strong>

                  <span>
                    Critical
                  </span>

                </div>


                <div>

                  <strong>
                    {highCount}
                  </strong>

                  <span>
                    High priority
                  </span>

                </div>


                <div>

                  <strong>
                    {priorities.length}
                  </strong>

                  <span>
                    Active signals
                  </span>

                </div>

              </div>

            </header>


            {loading ? (

              <div className="studentPriorityLoading">

                <span />

                <div>

                  <strong>
                    Analyzing your campus activity
                  </strong>

                  <p>
                    Checking attendance, assignments,
                    placements and profile readiness.
                  </p>

                </div>

              </div>

            ) : sortedPriorities.length ? (

              <div className="studentPriorityList">

                {sortedPriorities.map(
                  (
                    item,
                    index
                  ) => (

                    <button
                      type="button"
                      className={
                        `studentPriorityItem ${item.level}`
                      }
                      key={
                        item.id
                      }
                      onClick={() =>
                        go(
                          item.target
                        )
                      }
                    >

                      <span className="studentPriorityNumber">
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </span>


                      <span
                        className="studentPriorityIcon"
                      >
                        {priorityIcon(
                          item.type
                        )}
                      </span>


                      <span className="studentPriorityContent">

                        <small>
                          {item.type.toUpperCase()}
                        </small>

                        <strong>
                          {item.title}
                        </strong>

                        <span>
                          {item.meta}
                        </span>

                      </span>


                      <span className="studentPriorityMeta">

                        <b
                          className={
                            item.level
                          }
                        >
                          {item.timeLabel}
                        </b>

                        <small>
                          Take action →
                        </small>

                      </span>

                    </button>

                  )
                )}

              </div>

            ) : (

              <div className="studentPriorityClear">

                <span>
                  ✓
                </span>

                <div>

                  <strong>
                    You're caught up
                  </strong>

                  <p>
                    No urgent academic or placement actions
                    need attention right now.
                  </p>

                </div>

              </div>

            )}


            <footer className="studentPriorityFooter">

              <span>
                <i />
                Automatically recalculated from live CampusConnect data
              </span>

              <small>
                Rule-based priority engine · no artificial deadlines
              </small>

            </footer>

          </section>

        );

      })()}


      <section className="studentDashboardMainGrid">

        <div className="studentDashboardPrimaryColumn">

          <section className="dashboardPanel card">
            <header className="dashboardPanelHeader">
              <div>
                <span>ACADEMIC HEALTH</span>
                <h3>Attendance overview</h3>
              </div>

              <button onClick={() => go("Attendance")}>
                View details →
              </button>
            </header>

            {attendance.length > 0 ? (
              <>
                <div className="dashboardAttendanceHeadline">
                  <div>
                    <strong>{attendanceAverage}%</strong>
                    <small>Overall attendance</small>
                  </div>

                  <div
                    className={
                      attendanceAverage >= 75
                        ? "dashboardHealthStatus safe"
                        : "dashboardHealthStatus risk"
                    }
                  >
                    {attendanceAverage >= 75
                      ? "On track"
                      : "Needs attention"}
                  </div>
                </div>

                <div className="dashboardSubjectList">
                  {attendance.slice(0, 5).map(item => {
                    const percentage = item.total
                      ? Math.round(
                          (item.attended / item.total) * 100
                        )
                      : 0;

                    return (
                      <div
                        className="dashboardSubjectRow"
                        key={item.id}
                      >
                        <div>
                          <b>{item.subject}</b>
                          <small>
                            {item.attended}/{item.total} classes
                          </small>
                        </div>

                        <div className="dashboardMiniProgress">
                          <span
                            style={{
                              width: `${Math.min(
                                100,
                                percentage
                              )}%`,
                            }}
                          />
                        </div>

                        <strong
                          className={
                            percentage >= 75
                              ? "dashboardGood"
                              : "dashboardRisk"
                          }
                        >
                          {percentage}%
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="dashboardEmptyState">
                <span>A</span>
                <b>No attendance records yet</b>
                <p>
                  Your subject-wise attendance will appear here
                  once faculty starts recording classes.
                </p>
                <button onClick={() => go("Attendance")}>
                  Open attendance
                </button>
              </div>
            )}
          </section>

          <section className="dashboardPanel card dashboardAnalyticsPanel">
            <header className="dashboardPanelHeader">
              <div>
                <span>ATTENDANCE ANALYTICS</span>
                <h3>Subject performance</h3>
              </div>

              <button onClick={() => go("Attendance")}>
                Full analytics →
              </button>
            </header>

            {dashboardAttendanceChart.length > 0 ? (
              <>
                <div className="dashboardChartSummary">
                  <div>
                    <small>Overall attendance</small>
                    <strong>{attendanceAverage}%</strong>
                  </div>

                  <div>
                    <small>Safe subjects</small>
                    <strong>{safeSubjects}</strong>
                  </div>

                  <div>
                    <small>Shortage</small>
                    <strong>{shortageSubjects}</strong>
                  </div>
                </div>

                <div className="dashboardAttendanceChart">
                  <ResponsiveContainer width="100%" height={290}>
                    <BarChart
                      data={dashboardAttendanceChart}
                      margin={{
                        top: 20,
                        right: 15,
                        bottom: 45,
                        left: -12,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#edf0f5"
                      />

                      <XAxis
                        dataKey="subject"
                        interval={0}
                        angle={-14}
                        textAnchor="end"
                        height={65}
                        tick={{
                          fontSize: 9,
                          fill: "#7c8798",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={value => `${value}%`}
                        tick={{
                          fontSize: 9,
                          fill: "#8b95a5",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip
                        cursor={{
                          fill: "rgba(49,89,217,.035)",
                        }}
                        formatter={(value) => [
                          `${value}%`,
                          "Attendance",
                        ]}
                      />

                      <ReferenceLine
                        y={75}
                        stroke="#d9a441"
                        strokeDasharray="5 5"
                        label={{
                          value: "75% minimum",
                          position: "insideTopRight",
                          fill: "#9a731e",
                          fontSize: 9,
                        }}
                      />

                      <Bar
                        dataKey="attendance"
                        name="Attendance"
                        radius={[7, 7, 2, 2]}
                        fill="#3159d9"
                        maxBarSize={44}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="dashboardChartLegend">
                  <span>
                    <i className="dashboardLegendBar"/>
                    Current attendance
                  </span>

                  <span>
                    <i className="dashboardLegendLine"/>
                    Required minimum — 75%
                  </span>
                </div>
              </>
            ) : (
              <div className="dashboardChartEmpty">
                <div>▥</div>

                <strong>
                  Attendance analytics will appear here
                </strong>

                <p>
                  Once faculty records attendance, CampusConnect
                  will automatically calculate and visualize your
                  subject-wise academic health.
                </p>

                <button onClick={() => go("Attendance")}>
                  Open attendance →
                </button>
              </div>
            )}
          </section>

          <section className="dashboardPanel card">
            <header className="dashboardPanelHeader">
              <div>
                <span>DEADLINES</span>
                <h3>Upcoming assignments</h3>
              </div>

              <button onClick={() => go("Assignments")}>
                View all →
              </button>
            </header>

            {assignments.length ? (
              <div className="dashboardAssignmentList">
                {assignments.slice(0, 4).map(item => (
                  <button
                    key={item.id}
                    className="dashboardAssignmentRow"
                    onClick={() => go("Assignments")}
                  >
                    <span className="dashboardAssignmentIcon">
                      {item.kind === "Project" ? "P" : "A"}
                    </span>

                    <div>
                      <b>{item.title}</b>
                      <small>
                        {item.subject} · {item.kind}
                      </small>
                    </div>

                    <div>
                      <strong>
                        {formatDueDate(item.due_at)}
                      </strong>
                      <small>{daysUntil(item.due_at)}</small>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="dashboardEmptyState compact">
                <span>✓</span>
                <b>No upcoming assignments</b>
                <p>
                  New coursework and deadlines will appear here.
                </p>
              </div>
            )}
          </section>

        </div>

        <aside className="studentDashboardSideColumn">

          <section className="dashboardPanel card">
            <header className="dashboardPanelHeader">
              <div>
                <span>PLACEMENT READINESS</span>
                <h3>Career snapshot</h3>
              </div>
            </header>

            <div className="dashboardCareerScore">
              <div>
                <span>Resume score</span>
                <strong>{score || 0}</strong>
                <small>/100</small>
              </div>

              <div>
                <span>Live drives</span>
                <strong>{jobs.length}</strong>
              </div>

              <div>
                <span>Applications</span>
                <strong>{applicationCount}</strong>
              </div>
            </div>

            <div className="dashboardCareerActions">
              <button
                className="primary"
                onClick={() => go("Resume")}
              >
                Improve resume
              </button>

              <button
                onClick={() => go("Placements")}
              >
                Browse placements
              </button>
            </div>
          </section>

          <section className="dashboardPanel card">
            <header className="dashboardPanelHeader">
              <div>
                <span>CAMPUS UPDATES</span>
                <h3>Recent announcements</h3>
              </div>

              <button onClick={() => go("Announcements")}>
                View all →
              </button>
            </header>

            {announcements.length ? (
              <div className="dashboardAnnouncementList">
                {announcements.slice(0, 4).map(item => (
                  <button
                    className="dashboardAnnouncement"
                    key={item.id}
                    onClick={() => go("Announcements")}
                  >
                    <span>{item.category.slice(0, 1)}</span>

                    <div>
                      <b>{item.title}</b>
                      <small>
                        {item.author_name || "CampusConnect"} ·{" "}
                        {new Intl.DateTimeFormat("en-IN", {
                          day: "numeric",
                          month: "short",
                        }).format(new Date(item.created_at))}
                      </small>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="dashboardEmptyState compact">
                <span>N</span>
                <b>No announcements yet</b>
                <p>
                  Verified campus notices will appear here.
                </p>
              </div>
            )}
          </section>

          <section className="dashboardPanel card">
            <header className="dashboardPanelHeader">
              <div>
                <span>RECENT ACTIVITY</span>
                <h3>Your CampusConnect timeline</h3>
              </div>
            </header>

            {recentActivity.length ? (
              <div className="dashboardActivityList">
                {recentActivity.map(item => (
                  <button
                    className="dashboardActivityItem"
                    key={item.id}
                    onClick={() => go(item.target)}
                  >
                    <span className={`dashboardActivityIcon ${item.type}`}>
                      {item.type === "attendance"
                        ? "A"
                        : item.type === "assignment"
                        ? "T"
                        : item.type === "announcement"
                        ? "N"
                        : item.type === "application"
                        ? "J"
                        : "P"}
                    </span>

                    <div>
                      <b>{item.title}</b>
                      <small>{item.meta}</small>
                    </div>

                    <time>
                      {formatActivityTime(item.created_at)}
                    </time>
                  </button>
                ))}
              </div>
            ) : (
              <div className="dashboardEmptyState compact">
                <span>↻</span>
                <b>No recent activity yet</b>
                <p>
                  Attendance updates, assignments, applications and
                  campus activity will appear here automatically.
                </p>
              </div>
            )}
          </section>

          <section className="dashboardPanel card">
            <header className="dashboardPanelHeader">
              <div>
                <span>QUICK ACCESS</span>
                <h3>Student tools</h3>
              </div>
            </header>

            <div className="dashboardQuickActions">
              <button onClick={() => go("Attendance")}>
                <span>A</span>
                Attendance
              </button>

              <button onClick={() => go("Assignments")}>
                <span>T</span>
                Assignments
              </button>

              <button onClick={() => go("Learning")}>
                <span>L</span>
                Learning
              </button>

              <button onClick={() => go("Network")}>
                <span>N</span>
                Network
              </button>

              <button onClick={() => go("Academics")}>
                <span>C</span>
                Academics
              </button>

              <button onClick={() => go("Profile")}>
                <span>P</span>
                Profile
              </button>
            </div>
          </section>

        </aside>
      </section>
    </div>
  );
}


function MyCampus({
  profile,
}: {
  profile: Profile;
}) {
  const firstName =
    profile.name.trim().split(/\s+/)[0] ||
    "Student";

  return (
    <div className="myCampusAIOnly">
      <section className="myCampusAIOnlyHero">
        <div
          className="myCampusAIOnlyMark"
          aria-hidden="true"
        >
          ✦
        </div>

        <div className="myCampusAIOnlyCopy">
          <span>
            AUTHENTICATED AI WORKSPACE
          </span>

          <h2>CampusConnect AI</h2>

          <p>
            Welcome, {firstName}. Ask questions
            about the CampusConnect records
            available to your account. Answers
            remain grounded in real data and
            clearly identify information that is
            unavailable.
          </p>

          <div
            className="myCampusAIOnlyIdentity"
          >
            <span>{profile.role}</span>

            <span>
              {profile.department ||
                "Department not set"}
            </span>

            <span>
              {profile.year ||
                "Year not set"}
            </span>
          </div>
        </div>

        <div className="myCampusAIOnlyStatus">
          <i aria-hidden="true" />

          <span>
            <b>Secure context active</b>

            <small>
              Authenticated data · Supabase RLS
            </small>
          </span>
        </div>
      </section>

      <section
        id="campusconnect-ai-workspace"
        className="campusConnectAIWorkspace myCampusAIOnlyPanel"
      >
        <CampusAI profile={profile} />
      </section>
    </div>
  );
}

function NotificationCenter({role, items, readIds, filter, onFilter, onClose, onOpen, onReadAll}: {
  role: Role;
  items: CampusNotification[];
  readIds: string[];
  filter: NotificationFilter;
  onFilter: (filter: NotificationFilter) => void;
  onClose: () => void;
  onOpen: (item: CampusNotification) => void;
  onReadAll: () => void;
}) {
  const unreadItems = items.filter(item => !readIds.includes(item.id));
  const visibleItems = filter === "unread" ? unreadItems : items;

  return <section className="notificationPanel" role="dialog" aria-label={`${role} notifications`}>
    <header className="notificationHead">
      <div><span>Campus updates</span><h2>Notifications</h2></div>
      <button onClick={onClose} aria-label="Close notification center">×</button>
    </header>
    <div className="notificationControls">
      <div role="tablist" aria-label="Notification filters">
        <button className={filter === "all" ? "selected" : ""} onClick={() => onFilter("all")}>All <b>{items.length}</b></button>
        <button className={filter === "unread" ? "selected" : ""} onClick={() => onFilter("unread")}>Unread <b>{unreadItems.length}</b></button>
      </div>
      <button onClick={onReadAll} disabled={unreadItems.length === 0}>Mark all read</button>
    </div>
    <div className="notificationList">
      {visibleItems.map(item => {
        const isRead = readIds.includes(item.id);
        return <button className={`notificationItem ${isRead ? "read" : "unread"}`} onClick={() => onOpen(item)} key={item.id}>
          <i className={item.kind}>{notificationIcons[item.kind]}</i>
          <span>
            <span className="notificationMeta"><em>{item.label}</em><time>{item.time}</time></span>
            <strong>{item.title}</strong>
            <small>{item.message}</small>
          </span>
          {!isRead && <u aria-label="Unread"/>}
        </button>;
      })}
      {visibleItems.length === 0 && <div className="notificationEmpty"><i>✓</i><b>You are all caught up</b><small>New campus updates will appear here.</small></div>}
    </div>
    <footer>Read status is saved on this device.</footer>
  </section>;
}

function RoleDashboardPanels({role, go}: {role: Role; go: (v: View) => void}) {
  const views: View[] = role === "Student" ? ["Placements", "Assignments", "Attendance"] : role === "Faculty" ? ["Assignments", "Attendance", "Learning"] : ["Placements", "Applications", "Admin"];
  return <div className="grid">{views.map(view => <Panel key={view} title={view}><MetricRow title={`Open ${view}`} meta="Use the live module to create, review or update records." value="Open"/><button className="ghost" onClick={() => go(view)}>Go to {view} →</button></Panel>)}</div>;
}

function PlacementManagement() {
  const [drives, setDrives] = useState<PlacementJob[]>([]);
  const [selected, setSelected] = useState<PlacementJob | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({company: "", role_title: "", compensation: "", deadline: "", location: "", work_mode: "Hybrid", employment_type: "Full-time", minimum_cgpa: "7.0", branches: "ECE,CSE", skills: "", about: "", rounds: ""});

  const load = async () => {
    const client = getSupabaseClient();
    if (!client) return setStatus("Supabase is not configured. Add the production environment variables first.");
    const {data, error} = await client.from("placement_drives").select("*").order("deadline", {ascending: true});
    if (error) return setStatus(error.message);
    const next = ((data || []) as Array<Record<string, unknown>>).map(toPlacementJob);
    setDrives(next); setSelected(next[0] || null);
  };
  useEffect(() => { void load(); }, []);

  const createDrive = async (event: FormEvent) => {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client) return setStatus("Supabase is not configured.");
    if (!form.company.trim() || !form.role_title.trim() || !form.deadline) return setStatus("Company, role and deadline are required.");
    const {data: userData} = await client.auth.getUser();
    if (!userData.user) return setStatus("Sign in again before creating a drive.");
    const payload = {
      company: form.company.trim(), role_title: form.role_title.trim(), compensation: form.compensation.trim(), deadline: new Date(form.deadline).toISOString(),
      match_score: 0, logo_label: form.company.trim().slice(0, 2).toUpperCase(), location: form.location.trim(), work_mode: form.work_mode,
      employment_type: form.employment_type, minimum_cgpa: Number(form.minimum_cgpa || 0), branches: form.branches.split(",").map(x => x.trim()).filter(Boolean),
      skills: form.skills.split(",").map(x => x.trim()).filter(Boolean), about: form.about.trim(), rounds: form.rounds.split(",").map(x => x.trim()).filter(Boolean), created_by: userData.user.id,
    };
    const {error} = await client.from("placement_drives").insert(payload);
    if (error) return setStatus(error.message);
    setForm({company: "", role_title: "", compensation: "", deadline: "", location: "", work_mode: "Hybrid", employment_type: "Full-time", minimum_cgpa: "7.0", branches: "ECE,CSE", skills: "", about: "", rounds: ""});
    setShowForm(false); setStatus("Placement drive created successfully."); await load();
  };

  const exportApplications = async () => {
    if (!selected) return;
    const client = getSupabaseClient(); if (!client) return setStatus("Supabase is not configured.");
    const {data, error} = await client.from("placement_applications").select("student_name,company,role_title,status,applied_at,next_step").eq("company", selected.c);
    if (error) return setStatus(error.message);
    const rows = ["Student,Company,Role,Status,Applied At,Next Step", ...(data || []).map(row => [row.student_name,row.company,row.role_title,row.status,row.applied_at,row.next_step].map(csvEscape).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([rows], {type: "text/csv;charset=utf-8"})); const a = document.createElement("a"); a.href = url; a.download = `${selected.c.replace(/[^a-z0-9]+/gi,"-")}-applications.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return <div className="moduleStack">
    <section className="moduleHero"><div><span>PLACEMENT OPERATIONS</span><h2>Recruitment drives</h2><p>Create and manage real company drives backed by your campus database. No seeded or sample opportunities are shown.</p></div><button className="primary" onClick={() => setShowForm(v => !v)}>{showForm ? "Close" : "+ New drive"}</button></section>
    {status && <StatusLine text={status}/>} 
    {showForm && <form className="moduleForm card" onSubmit={createDrive}><FormHeading title="Create a live placement drive" text="Only verified Placement Cell accounts can publish recruitment opportunities."/><div className="formGrid"><Field label="Company"><input value={form.company} onChange={e => setForm({...form,company:e.target.value})}/></Field><Field label="Role"><input value={form.role_title} onChange={e => setForm({...form,role_title:e.target.value})}/></Field><Field label="Compensation"><input value={form.compensation} onChange={e => setForm({...form,compensation:e.target.value})}/></Field><Field label="Deadline"><input type="datetime-local" value={form.deadline} onChange={e => setForm({...form,deadline:e.target.value})}/></Field><Field label="Location"><input value={form.location} onChange={e => setForm({...form,location:e.target.value})}/></Field><Field label="Minimum CGPA"><input type="number" step="0.1" min="0" max="10" value={form.minimum_cgpa} onChange={e => setForm({...form,minimum_cgpa:e.target.value})}/></Field></div><Field label="Eligible branches"><input value={form.branches} onChange={e => setForm({...form,branches:e.target.value})} placeholder="ECE, CSE, ISE"/></Field><Field label="Skills"><input value={form.skills} onChange={e => setForm({...form,skills:e.target.value})} placeholder="Java, DSA, SQL"/></Field><Field label="About role"><textarea value={form.about} onChange={e => setForm({...form,about:e.target.value})}/></Field><Field label="Selection rounds"><input value={form.rounds} onChange={e => setForm({...form,rounds:e.target.value})} placeholder="Online assessment, Technical interview, HR"/></Field><FormActions status="" label="Publish live drive"/></form>}
    {drives.length ? <div className="split roleManagement"><section className="card driveManager"><div className="managementToolbar"><div><span>LIVE DRIVES</span><h2>Company recruitment</h2></div><b>{drives.length} active</b></div><div className="driveList">{drives.map(drive => <button className={`driveRow ${selected?.c === drive.c ? "selected" : ""}`} onClick={() => setSelected(drive)} key={`${drive.c}-${drive.r}`}><Logo t={drive.l}/><p><b>{drive.c}</b><small>{drive.r} · Deadline {drive.d}</small></p><span><b>{drive.applications}</b><small>applications</small></span><i>→</i></button>)}</div></section>{selected && <section className="card driveDetail"><div className="driveDetailHead"><Logo t={selected.l}/><div><span>LIVE</span><h2>{selected.c}</h2><p>{selected.r}</p></div></div><div className="driveNumbers"><p><b>{selected.applications}</b><small>Applications</small></p><p><b>{selected.m}%</b><small>Match score</small></p><p><b>{selected.cgpa}+</b><small>Minimum CGPA</small></p></div><div className="eligibility"><h3>Eligibility criteria</h3><MetricRow title="Departments" meta={selected.branches.join(", ") || "Not specified"} value={`${selected.branches.length} branches`}/><MetricRow title="Skills" meta={selected.skills.join(", ") || "Not specified"} value="Verified"/></div><div className="driveActions"><button className="ghost" onClick={exportApplications}>↓ Export applications</button><button className="primary" onClick={() => setStatus("Use Announcements to publish a verified student-facing deadline notice.")}>Create notice</button></div></section>}</div> : <EmptyState title="No live placement drives" text="Create the first company drive from the button above."/>}
  </div>;
}

function friendlyDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function csvEscape(value: unknown) { const text = String(value ?? ""); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }

function Network({profile}: {profile: Profile}) {
  type Person = {
    id: string;
    full_name: string;
    email?: string;
    role: Role;
    department: string;
    graduation_year: string;
    bio: string;
    skills: string;
    avatar_url?: string | null;
  };

  type IncomingRequest = {
    id: string;
    requester_id: string;
    status: string;
  };

  const [people, setPeople] = useState<Person[]>([]);
  const [sent, setSent] = useState<string[]>([]);
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    const client = getSupabaseClient();
    if (!client) return;

    (async () => {
      const {data: auth, error: authError} =
        await client.auth.getUser();

      if (!active) return;

      if (authError || !auth.user) {
        setStatus("Sign in again to use your campus network.");
        return;
      }

      const userId = auth.user.id;

      const [
        directoryResult,
        sentResult,
        incomingResult,
      ] = await Promise.all([
        client
          .from("campus_directory")
          .select(
            "id,full_name,role,department,graduation_year,bio,skills,avatar_url"
          )
          .neq("id", userId)
          .order("full_name"),

        client
          .from("connection_requests")
          .select("addressee_id")
          .eq("requester_id", userId),

        client
          .from("connection_requests")
          .select("id,requester_id,status")
          .eq("addressee_id", userId)
          .eq("status", "pending")
          .order("created_at", {ascending: false}),
      ]);

      if (!active) return;

      if (directoryResult.error) {
        setStatus(directoryResult.error.message);
        return;
      }

      if (sentResult.error) {
        setStatus(sentResult.error.message);
        return;
      }

      if (incomingResult.error) {
        setStatus(incomingResult.error.message);
        return;
      }

      setPeople((directoryResult.data || []) as Person[]);

      setSent(
        (sentResult.data || []).map(row =>
          String(row.addressee_id)
        )
      );

      setIncoming(
        (incomingResult.data || []) as IncomingRequest[]
      );
    })();

    return () => {
      active = false;
    };
  }, []);

  const connect = async (id: string) => {
    const client = getSupabaseClient();

    if (!client) {
      setStatus("Supabase is not configured.");
      return;
    }

    const {data: userData} = await client.auth.getUser();

    if (!userData.user) {
      setStatus("Sign in again.");
      return;
    }

    const {error} = await client
      .from("connection_requests")
      .insert({
        requester_id: userData.user.id,
        addressee_id: id,
      });

    if (error) {
      setStatus(
        error.code === "23505"
          ? "Connection request already sent."
          : error.message
      );
      return;
    }

    setSent(current =>
      current.includes(id) ? current : [...current, id]
    );

    setStatus("Connection request sent.");
  };

  const respond = async (
    id: string,
    nextStatus: "accepted" | "rejected"
  ) => {
    const client = getSupabaseClient();

    if (!client) {
      setStatus("Supabase is not configured.");
      return;
    }

    const {error} = await client
      .from("connection_requests")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setStatus(error.message);
      return;
    }

    setIncoming(current =>
      current.filter(item => item.id !== id)
    );

    setStatus(
      nextStatus === "accepted"
        ? "Connection accepted."
        : "Connection request declined."
    );
  };

  const normalizedQuery = query.trim().toLowerCase();

  const visible = people.filter(person =>
    `${person.full_name} ${person.department} ${person.skills} ${person.role}`
      .toLowerCase()
      .includes(normalizedQuery)
  );

  return (
    <div className="network">
      <section>
        <div className="compose card">
          <Avatar
            t={getInitials(profile.name)}
            src={profile.avatar_url}
            alt={`${profile.name} profile`}
          />

          <div>
            <b>Campus professional network</b>
            <small>
              Connect with verified students, faculty and
              placement mentors.
            </small>
          </div>
        </div>

        {status && <StatusLine text={status}/>}

        <section className="card networkDirectory">
          <header>
            <div>
              <span>DISCOVER PEOPLE</span>
              <h2>Campus directory</h2>
            </div>

            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search name, department or skill"
            />
          </header>

          {visible.map(person => (
            <article className="person" key={person.id}>
              <Avatar
                t={getInitials(person.full_name)}
                src={person.avatar_url || undefined}
                alt={`${person.full_name} profile`}
              />

              <p>
                <b>{person.full_name}</b>

                <small>
                  {person.role} · {person.department} ·{" "}
                  {person.graduation_year}
                </small>

                <small>
                  {person.skills ||
                    person.bio ||
                    "CampusConnect member"}
                </small>
              </p>

              <button
                disabled={sent.includes(person.id)}
                onClick={() => void connect(person.id)}
              >
                {sent.includes(person.id)
                  ? "✓ Requested"
                  : "Connect"}
              </button>
            </article>
          ))}

          {!visible.length && (
            <EmptyState
              title="No people found"
              text="Try another search or ask students and staff to create their CampusConnect account."
            />
          )}
        </section>
      </section>

      <section>
        <Panel title="Connection requests">
          <div className="networkPrivacy">
            {incoming.length ? (
              incoming.map(request => {
                const person = people.find(
                  item => item.id === request.requester_id
                );

                return (
                  <div className="person" key={request.id}>
                    <Avatar
                      t={getInitials(
                        person?.full_name || "User"
                      )}
                      src={person?.avatar_url || undefined}
                      alt={`${
                        person?.full_name || "Campus member"
                      } profile`}
                    />

                    <p>
                      <b>
                        {person?.full_name ||
                          "Campus member"}
                      </b>

                      <small>
                        {person?.department || ""} ·{" "}
                        {person?.role || "Student"}
                      </small>
                    </p>

                    <span>
                      <button
                        className="ghost"
                        onClick={() =>
                          void respond(
                            request.id,
                            "rejected"
                          )
                        }
                      >
                        Decline
                      </button>

                      <button
                        className="primary"
                        onClick={() =>
                          void respond(
                            request.id,
                            "accepted"
                          )
                        }
                      >
                        Accept
                      </button>
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="networkPrivacy">
                <b>No pending requests</b>
                <p>
                  New connection requests will appear here.
                </p>
              </div>
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}


function ProfilePage({profile, onProfileChange, onSignOut}: {profile: Profile; onProfileChange: (profile: Profile) => void; onSignOut: () => Promise<void> | void}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rnsitOpen, setRnsitOpen] = useState(false);
  const [usn, setUsn] = useState(profile.usn);
  const [dob, setDob] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => { setForm(profile); setUsn(profile.usn); }, [profile]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client) return setError("Supabase is not connected.");
    setSaving(true); setError(""); setMessage("");
    try {
      const {data: auth} = await client.auth.getUser();
      if (!auth.user) throw new Error("Your session has expired. Please sign in again.");
      const {data, error: saveError} = await client.from("profiles").update({
        full_name: form.name.trim(), department: form.department.trim(), graduation_year: form.year.trim(),
        bio: form.bio.trim(), skills: form.skills.trim(), phone: form.phone.trim(), usn: form.usn.trim().toUpperCase(), updated_at: new Date().toISOString(),
      }).eq("id", auth.user.id).select("full_name, role, department, graduation_year, bio, skills, phone, usn, campus_uid, avatar_url").single();
      if (saveError) throw saveError;
      const next = {...profile, name: data.full_name, department: data.department, year: data.graduation_year, bio: data.bio || "", skills: data.skills || "", phone: data.phone || "", usn: data.usn || ""};
      onProfileChange(next); setEditing(false); setMessage("Profile updated successfully.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update your profile."); }
    finally { setSaving(false); }
  };

  const deleteMyCampusAccount =
    async () => {
      const confirmed =
        window.confirm(
          "Permanently delete your CampusConnect account? Your profile, conversations memberships, applications and other account-linked data may be removed. This cannot be undone."
        );

      if (!confirmed) {
        return;
      }

      const confirmation =
        window.prompt(
          'Type DELETE to permanently delete your account.'
        );

      if (
        confirmation !==
        "DELETE"
      ) {
        setError(
          "Account deletion cancelled."
        );

        return;
      }


      setError("");
      setMessage("");
      setSaving(true);


      try {
        const client =
          getSupabaseClient();

        if (!client) {
          throw new Error(
            "Supabase is not connected."
          );
        }


        const {
          data: sessionData,
        } =
          await client.auth
            .getSession();


        const token =
          sessionData.session
            ?.access_token;


        if (!token) {
          throw new Error(
            "Your session has expired. Sign in again."
          );
        }


        const response =
          await fetch(
            "/api/account/delete",
            {
              method:
                "POST",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );


        const result =
          (
            await response
              .json()
              .catch(
                () => ({})
              )
          ) as {
            success?: boolean;
            error?: string;
          };


        if (!response.ok) {
          throw new Error(
            result.error ||
            "Unable to delete account."
          );
        }


        await client.auth
          .signOut();


        await onSignOut();

      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to delete account."
        );
      } finally {
        setSaving(false);
      }
    };


  const connectRnsit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(""); setMessage("");
    if (!usn.trim() || !dob) return setError("Enter your RNSIT USN and date of birth.");
    setConnecting(true);
    try {
      const client = getSupabaseClient();
      if (!client) throw new Error("Supabase is not connected.");
      const {data: sessionData} = await client.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Your session has expired. Sign in again.");
      const response = await fetch("/api/rnsit/sync", {method: "POST", headers: {"Content-Type": "application/json", Authorization: `Bearer ${token}`}, body: JSON.stringify({usn: usn.trim().toUpperCase(), dob})});
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        attendanceCount?: number;
        marksCount?: number;
        resultCount?: number;
        feeCount?: number;
      };
      if (!response.ok) throw new Error(payload.error || "RNSIT sync failed.");
      const {data: auth} = await client.auth.getUser();
      if (auth.user) await client.from("profiles").update({usn: usn.trim().toUpperCase(), updated_at: new Date().toISOString()}).eq("id", auth.user.id);
      onProfileChange({...profile, usn: usn.trim().toUpperCase()});
      setMessage(`RNSIT connected. Synced ${payload.attendanceCount || 0} attendance, ${payload.marksCount || 0} marks, ${payload.resultCount || 0} results and ${payload.feeCount || 0} fee records.`);
      setDob("");
      setRnsitOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to connect RNSIT."); }
    finally { setConnecting(false); }
  };

  return <div className="profilePage">
    <section className="profileHero card">
      <div className="profileIdentity"><Avatar t={getInitials(profile.name) || "U"} src={profile.avatar_url} alt={`${profile.name} profile`}/><div><span>YOUR CAMPUS IDENTITY</span><h2>{profile.name || "Campus user"}</h2><p>{profile.role} · {profile.department || "Department not set"} · {profile.year || "Year not set"}</p></div></div>
      <div className="profileHeroActions"><button className="ghost" onClick={() => {setForm(profile); setEditing(true); setMessage(""); setError("");}}>Edit profile</button><button className="primary" onClick={() => void onSignOut()}>Log out</button></div>
    </section>
    {message && <StatusLine text={message}/>} {error && <p className="authError" role="alert">{error}</p>}
    <div className="profileGrid">
      <section className="card profileCard"><header><div><span>PERSONAL INFORMATION</span><h3>Profile details</h3></div>{!editing && <button className="ghost" onClick={() => setEditing(true)}>Edit</button>}</header>
        {editing ? <form className="profileForm" onSubmit={save}>
          <Field label="Full name"><input value={form.name} onChange={e => setForm({...form,name:e.target.value})} required /></Field>
          <Field label="College email"><input value={profile.email} disabled /></Field>
          <div className="profileTwo"><Field label="Department"><input value={form.department} onChange={e => setForm({...form,department:e.target.value})}/></Field><Field label="Graduation year"><input value={form.year} onChange={e => setForm({...form,year:e.target.value})}/></Field></div>
          <Field label="USN"><input value={form.usn} onChange={e => setForm({...form,usn:e.target.value.toUpperCase()})} placeholder="1RN..." /></Field>
          <Field label="Phone"><input value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} inputMode="tel" /></Field>
          <Field label="Bio"><textarea value={form.bio} onChange={e => setForm({...form,bio:e.target.value})} maxLength={500} placeholder="A short professional introduction" /></Field>
          <Field label="Skills"><input value={form.skills} onChange={e => setForm({...form,skills:e.target.value})} placeholder="Java, Python, Embedded Systems" /></Field>
          <div className="formActions"><button type="button" className="ghost" onClick={() => {setForm(profile);setEditing(false)}}>Cancel</button><button className="primary" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button></div>
        </form> : <div className="profileDetails"><div><small>Email</small><b>{profile.email}</b></div><div><small>Phone</small><b>{profile.phone || "Not added"}</b></div><div><small>USN</small><b>{profile.usn || "Not connected"}</b></div><div><small>Department</small><b>{profile.department || "Not added"}</b></div><div><small>Graduation year</small><b>{profile.year || "Not added"}</b></div><div><small>Role</small><b>{profile.role}</b></div><div className="profileBio"><small>Bio</small><p>{profile.bio || "Add a short professional bio from Edit profile."}</p></div><div className="profileBio"><small>Skills</small><p>{profile.skills || "Add your skills to improve your profile and resume."}</p></div></div>}
      </section>
      <section className="card profileCard collegeConnectCard"><header><div><span>ACADEMIC INTEGRATION</span><h3>Connect RNSIT Contineo</h3></div><i className="integrationBadge">R</i></header>
        <div className="integrationStatus"><span className="statusDot"/><div><b>Not connected</b><small>Attendance, marks, results and fees are not synced.</small></div></div>
        <p className="integrationText">Connect your official RNSIT student portal to bring permitted academic records into CampusConnect. CampusConnect will never store your date of birth in the browser or pretend a sync succeeded.</p>
        <ul className="integrationList"><li>Attendance by subject</li><li>CIE / internal marks</li><li>Semester results and grades</li><li>Fee status and payment records</li><li>Registered courses and notes</li><li>One-click secure re-sync</li></ul>
        <button className="primary full" onClick={() => {setRnsitOpen(true);setError("")}}>Connect RNSIT account</button>
        <a className="portalLink" href="https://rnsit-students.contineo.in/parents/index.php" target="_blank" rel="noreferrer">Open official RNSIT portal ↗</a>
      </section>
      <section className="card profileCard securityCard"><header><div><span>ACCOUNT & SECURITY</span><h3>Security controls</h3></div></header><button className="securityAction" onClick={() => {const client=getSupabaseClient(); if(client) void client.auth.resetPasswordForEmail(profile.email, {redirectTo: window.location.origin}); setMessage("Password reset email requested. Check your inbox.")}}>Change password <span>→</span></button><button
          className="securityAction"
          onClick={() =>
            void onSignOut()
          }
        >
          Log out of this device
          <span>→</span>
        </button>

        {profile.role !== "Main Admin" && (
          <button
            type="button"
            className="securityAction deleteAccountAction"
            disabled={saving}
            onClick={() =>
              void deleteMyCampusAccount()
            }
          >
            <span>
              <b>
                Permanently delete account
              </b>
              <small>
                Delete your CampusConnect account and associated account data
              </small>
            </span>

            <strong>
              Delete
            </strong>
          </button>
        )}<p>CampusConnect authentication is handled by Supabase. Sensitive college credentials must only be processed by an approved server-side integration.</p></section>
    </div>
    {rnsitOpen && <div className="modalScrim"><section className="integrationModal card" role="dialog" aria-modal="true" aria-labelledby="rnsit-title"><button className="modalClose" onClick={() => setRnsitOpen(false)} aria-label="Close">×</button><span>RNSIT CONTINEO</span><h2 id="rnsit-title">Connect your academic account</h2><p>Enter the credentials used by the official RNSIT student/parent portal. Credentials are sent only to the server-side connector and are never written to Supabase.</p><form onSubmit={connectRnsit}><Field label="USN"><input value={usn} onChange={e => setUsn(e.target.value.toUpperCase())} autoComplete="username" required/></Field><Field label="Date of birth"><input type="date" value={dob} onChange={e => setDob(e.target.value)} autoComplete="bday" required/></Field><p className="securityNote">CampusConnect uses a server-side connector so your date of birth is never stored in the browser or database. If RNSIT changes its portal/API, the connector can be updated without changing this dashboard.</p>{error && <p className="authError" role="alert">{error}</p>}<div className="formActions"><button type="button" className="ghost" onClick={() => setRnsitOpen(false)}>Cancel</button><button className="primary" disabled={connecting}>{connecting ? "Verifying..." : "Verify & connect"}</button></div></form></section></div>}
  </div>;
}


function Resume({
  profile,
  score,
  improve,
}: {
  profile: Profile;
  score: number;
  improve: () => void;
}) {
  type ResumeSection =
    | "Personal"
    | "Education"
    | "Projects"
    | "Skills"
    | "Achievements"
    | "Certifications"
    | "Experience"
    | "Engagement";

  const [activeSection, setActiveSection] =
    useState<ResumeSection>("Personal");

  const [saved, setSaved] =
    useState(false);

  const [resumeData, setResumeData] =
    useState({
      name: profile.name || "",
      phone: profile.phone || "",
      email: profile.email || "",
      city: "Bengaluru, Karnataka",

      linkedin: "",
      github: "",
      portfolio: "",
      leetcode: "",
      codechef: "",

      college:
        "RNS Institute of Technology",

      degree:
        profile.department
          ? `Bachelor of Engineering in ${profile.department}`
          : "Bachelor of Engineering",

      cgpa: "",
      collegeStart: "",
      collegeEnd:
        profile.year || "",

      schoolName: "",
      schoolCourse: "",
      schoolScore: "",
      schoolStart: "",
      schoolEnd: "",
      schoolCity: "",

      project1Title: "",
      project1Tech: "",
      project1Link: "",
      project1Description: "",

      project2Title: "",
      project2Tech: "",
      project2Link: "",
      project2Description: "",

      project3Title: "",
      project3Tech: "",
      project3Link: "",
      project3Description: "",

      languages: "",
      tools: "",
      frameworks: "",
      databases: "",
      coursework: "",

      achievements: "",
      certifications: "",

      experienceTitle: "",
      experienceCompany: "",
      experienceDuration: "",
      experienceLocation: "",
      experienceDescription: "",

      engagement: "",
    });

  const updateField = (
    key: keyof typeof resumeData,
    value: string
  ) => {
    setResumeData(current => ({
      ...current,
      [key]: value,
    }));

    setSaved(false);
  };

  const safeUrl = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) return "";

    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://")
    ) {
      return trimmed;
    }

    return `https://${trimmed}`;
  };

  const splitLines = (value: string) =>
    value
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);

  const exportResume = () => {
    const resume =
      document.getElementById(
        "placementResumePaper"
      );

    if (!resume) {
      window.alert(
        "Resume preview is not ready yet."
      );
      return;
    }

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=900,height=1200"
      );

    if (!printWindow) {
      window.alert(
        "Please allow pop-ups to export your resume."
      );
      return;
    }

    const styles = Array.from(
      document.querySelectorAll(
        'style, link[rel="stylesheet"]'
      )
    )
      .map(node =>
        node.outerHTML
      )
      .join("\\n");

    printWindow.document.open();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />

          <title>
            ${resumeData.name || "Resume"} Resume
          </title>

          ${styles}

          <style>
            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }

            body {
              display: block !important;
            }

            #resume-export-root {
              width: 210mm !important;
              min-height: 297mm !important;
              margin: 0 auto !important;
              background: #fff !important;
            }

            #resume-export-root
            .placementResumePaper {
              display: block !important;
              position: static !important;

              width: 210mm !important;
              min-height: 297mm !important;

              max-width: none !important;

              margin: 0 !important;

              padding:
                10mm 12mm !important;

              border: 0 !important;
              border-radius: 0 !important;

              box-shadow: none !important;

              transform: none !important;

              overflow: visible !important;

              background: #fff !important;
              color: #000 !important;
            }

            #resume-export-root
            .placementResumePaper * {
              visibility: visible !important;
            }

            @page {
              size: A4;
              margin: 0;
            }

            @media print {
              html,
              body {
                width: 210mm !important;
                min-height: 297mm !important;

                margin: 0 !important;
                padding: 0 !important;

                background: #fff !important;
              }

              #resume-export-root {
                width: 210mm !important;

                margin: 0 !important;
                padding: 0 !important;
              }

              #resume-export-root
              .placementResumePaper {
                width: 210mm !important;
                min-height: 297mm !important;

                margin: 0 !important;

                padding:
                  10mm 12mm !important;

                border: 0 !important;

                box-shadow:
                  none !important;

                break-after:
                  auto !important;

                page-break-after:
                  auto !important;
              }

              .resumePrintSection,
              .resumeProjectBlock,
              .resumeEducationRow,
              .resumeExperienceHead {
                break-inside:
                  avoid !important;

                page-break-inside:
                  avoid !important;
              }
            }
          </style>
        </head>

        <body>
          <main id="resume-export-root">
            ${resume.outerHTML}
          </main>
        </body>
      </html>
    `);

    printWindow.document.close();

    const startPrint = () => {
      window.setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 400);
    };

    if (
      printWindow.document.readyState ===
      "complete"
    ) {
      startPrint();
    } else {
      printWindow.onload =
        startPrint;
    }
  };

  /*
   * Real-time placement ATS readiness.
   *
   * This is intentionally more useful than a simple
   * "number of filled fields" percentage.
   *
   * The score reacts instantly as the student edits
   * contact details, education, projects, skills,
   * achievements, certifications and professional links.
   */
  const atsChecks = [
    {
      points: 8,
      passed:
        resumeData.name.trim().length >= 3,
    },

    {
      points: 6,
      passed:
        resumeData.phone.trim().length >= 8,
    },

    {
      points: 6,
      passed:
        /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(
          resumeData.email.trim()
        ),
    },

    {
      points: 4,
      passed:
        resumeData.city.trim().length >= 2,
    },

    {
      points: 4,
      passed:
        Boolean(
          resumeData.linkedin.trim() ||
          resumeData.github.trim() ||
          resumeData.portfolio.trim()
        ),
    },

    {
      points: 10,
      passed:
        Boolean(
          resumeData.college.trim() &&
          resumeData.degree.trim() &&
          resumeData.collegeEnd.trim()
        ),
    },

    {
      points: 5,
      passed:
        resumeData.cgpa.trim().length > 0,
    },

    {
      points: 12,
      passed:
        Boolean(
          resumeData.project1Title.trim() &&
          resumeData.project1Tech.trim() &&
          resumeData.project1Description.trim().length >= 30
        ),
    },

    {
      points: 6,
      passed:
        Boolean(
          resumeData.project2Title.trim() &&
          resumeData.project2Description.trim().length >= 20
        ),
    },

    {
      points: 10,
      passed:
        Boolean(
          resumeData.languages.trim() ||
          resumeData.frameworks.trim() ||
          resumeData.tools.trim() ||
          resumeData.databases.trim()
        ),
    },

    {
      points: 5,
      passed:
        resumeData.coursework.trim().length > 0,
    },

    {
      points: 7,
      passed:
        resumeData.achievements.trim().length >= 10,
    },

    {
      points: 7,
      passed:
        resumeData.certifications.trim().length >= 5,
    },

    {
      points: 5,
      passed:
        Boolean(
          resumeData.experienceTitle.trim() ||
          resumeData.engagement.trim()
        ),
    },

    {
      points: 5,
      passed:
        Boolean(
          resumeData.github.trim() ||
          resumeData.project1Link.trim() ||
          resumeData.project2Link.trim() ||
          resumeData.project3Link.trim()
        ),
    },
  ];

  const ats = Math.min(
    100,
    atsChecks.reduce(
      (total, check) =>
        total +
        (
          check.passed
            ? check.points
            : 0
        ),
      0
    )
  );

  const atsPassed =
    atsChecks.filter(
      check => check.passed
    ).length;

  const atsTotal =
    atsChecks.length;

  const atsStatus =
    ats >= 90
      ? "Excellent"
      : ats >= 75
      ? "Placement ready"
      : ats >= 60
      ? "Good foundation"
      : ats >= 40
      ? "Needs improvement"
      : "Getting started";

  const atsRecommendation =
    ats >= 90
      ? "Strong ATS structure. Review wording and measurable impact before applying."
      : ats >= 75
      ? "Good resume. Add stronger project outcomes and measurable achievements."
      : ats >= 60
      ? "Add technical depth, project impact and professional links."
      : ats >= 40
      ? "Complete projects, skills, achievements and certifications."
      : "Start by completing contact details, education, skills and your strongest project.";

  const sections: {
    id: ResumeSection;
    label: string;
  }[] = [
    {id: "Personal", label: "Personal & links"},
    {id: "Education", label: "Education"},
    {id: "Projects", label: "Projects"},
    {id: "Skills", label: "Technical skills"},
    {id: "Achievements", label: "Achievements"},
    {id: "Certifications", label: "Certifications"},
    {id: "Experience", label: "Experience"},
    {id: "Engagement", label: "Social engagement"},
  ];

  return (
    <div className="resumeWorkspace">

      <section className="resumeStudioHeader">

        <div>
          <span>
            RESUME STUDIO
          </span>

          <h1>
            Placement-ready resume builder
          </h1>

          <p>
            Build a clean ATS-friendly one-page resume with editable education,
            projects, links, achievements, certifications and technical skills.
          </p>
        </div>


        <div className="resumeStudioHeaderActions">

          <div
            className="resumeAtsBadge"
            style={{
              "--ats-progress":
                `${ats * 3.6}deg`,
            } as CSSProperties}
          >
            <div className="resumeAtsRing">

              <div>
                <strong>
                  {ats}
                </strong>

                <small>
                  /100
                </small>
              </div>

            </div>


            <div className="resumeAtsContent">

              <span>
                LIVE ATS SCORE
              </span>

              <b>
                {atsStatus}
              </b>

              <small>
                {atsPassed}/{atsTotal} checks passed
              </small>

              <div className="resumeAtsProgress">
                <i
                  style={{
                    width:
                      `${ats}%`,
                  }}
                />
              </div>

              <p>
                {atsRecommendation}
              </p>

            </div>
          </div>

          <button
            type="button"
            className="ghost"
            onClick={() => {
              setSaved(true);
              improve();
            }}
          >
            {saved
              ? "Saved ✓"
              : "Save resume"}
          </button>

          <button
            type="button"
            className="primary"
            onClick={exportResume}
          >
            Export PDF
          </button>

        </div>

      </section>


      <div className="resumeStudioLayout">

        <aside className="resumeEditorSidebar card">

          <div className="resumeSidebarHeading">
            <span>
              BUILD
            </span>

            <h3>
              Resume sections
            </h3>
          </div>

          <div className="resumeSectionNav">

            {sections.map(section => (

              <button
                type="button"
                key={section.id}
                className={
                  activeSection ===
                  section.id
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveSection(
                    section.id
                  )
                }
              >
                {section.label}
              </button>

            ))}

          </div>

        </aside>


        <section className="resumeEditor card">

          <div className="resumeEditorHeading">
            <span>
              EDITOR
            </span>

            <h2>
              {activeSection}
            </h2>
          </div>


          {activeSection ===
            "Personal" && (
            <div className="resumeFieldGrid">

              <label>
                Full name
                <input
                  value={resumeData.name}
                  onChange={event =>
                    updateField(
                      "name",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Phone
                <input
                  value={resumeData.phone}
                  onChange={event =>
                    updateField(
                      "phone",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={resumeData.email}
                  onChange={event =>
                    updateField(
                      "email",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                City / Location
                <input
                  value={resumeData.city}
                  onChange={event =>
                    updateField(
                      "city",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                LinkedIn
                <input
                  placeholder="linkedin.com/in/username"
                  value={resumeData.linkedin}
                  onChange={event =>
                    updateField(
                      "linkedin",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                GitHub
                <input
                  placeholder="github.com/username"
                  value={resumeData.github}
                  onChange={event =>
                    updateField(
                      "github",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Portfolio
                <input
                  placeholder="yourportfolio.com"
                  value={resumeData.portfolio}
                  onChange={event =>
                    updateField(
                      "portfolio",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                LeetCode
                <input
                  placeholder="leetcode.com/u/username"
                  value={resumeData.leetcode}
                  onChange={event =>
                    updateField(
                      "leetcode",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                CodeChef
                <input
                  placeholder="codechef.com/users/username"
                  value={resumeData.codechef}
                  onChange={event =>
                    updateField(
                      "codechef",
                      event.target.value
                    )
                  }
                />
              </label>

            </div>
          )}


          {activeSection ===
            "Education" && (
            <div className="resumeFieldGrid">

              <label>
                College
                <input
                  value={resumeData.college}
                  onChange={event =>
                    updateField(
                      "college",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Degree / Branch
                <input
                  value={resumeData.degree}
                  onChange={event =>
                    updateField(
                      "degree",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                CGPA
                <input
                  placeholder="8.02 / 10.00"
                  value={resumeData.cgpa}
                  onChange={event =>
                    updateField(
                      "cgpa",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                College start
                <input
                  placeholder="Dec 2021"
                  value={resumeData.collegeStart}
                  onChange={event =>
                    updateField(
                      "collegeStart",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                College end
                <input
                  placeholder="Present / 2027"
                  value={resumeData.collegeEnd}
                  onChange={event =>
                    updateField(
                      "collegeEnd",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                School
                <input
                  value={resumeData.schoolName}
                  onChange={event =>
                    updateField(
                      "schoolName",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                School course
                <input
                  placeholder="Senior Secondary"
                  value={resumeData.schoolCourse}
                  onChange={event =>
                    updateField(
                      "schoolCourse",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                School score
                <input
                  placeholder="85%"
                  value={resumeData.schoolScore}
                  onChange={event =>
                    updateField(
                      "schoolScore",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                School start
                <input
                  value={resumeData.schoolStart}
                  onChange={event =>
                    updateField(
                      "schoolStart",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                School end
                <input
                  value={resumeData.schoolEnd}
                  onChange={event =>
                    updateField(
                      "schoolEnd",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                School city
                <input
                  value={resumeData.schoolCity}
                  onChange={event =>
                    updateField(
                      "schoolCity",
                      event.target.value
                    )
                  }
                />
              </label>

            </div>
          )}


          {activeSection ===
            "Projects" && (
            <div className="resumeProjectEditor">

              {[1, 2, 3].map(number => {

                const titleKey =
                  `project${number}Title` as
                  keyof typeof resumeData;

                const techKey =
                  `project${number}Tech` as
                  keyof typeof resumeData;

                const linkKey =
                  `project${number}Link` as
                  keyof typeof resumeData;

                const descKey =
                  `project${number}Description` as
                  keyof typeof resumeData;

                return (
                  <section
                    key={number}
                    className="resumeProjectEditorCard"
                  >
                    <h3>
                      Project {number}
                    </h3>

                    <div className="resumeFieldGrid">

                      <label>
                        Project title
                        <input
                          value={
                            resumeData[
                              titleKey
                            ]
                          }
                          onChange={event =>
                            updateField(
                              titleKey,
                              event.target.value
                            )
                          }
                        />
                      </label>

                      <label>
                        Tech stack
                        <input
                          placeholder="React.js, Node.js, MongoDB"
                          value={
                            resumeData[
                              techKey
                            ]
                          }
                          onChange={event =>
                            updateField(
                              techKey,
                              event.target.value
                            )
                          }
                        />
                      </label>

                      <label>
                        Project link
                        <input
                          placeholder="github.com/... or live URL"
                          value={
                            resumeData[
                              linkKey
                            ]
                          }
                          onChange={event =>
                            updateField(
                              linkKey,
                              event.target.value
                            )
                          }
                        />
                      </label>

                      <label className="resumeFullField">
                        Impact bullets
                        <textarea
                          placeholder={"Built...\nImproved...\nImplemented..."}
                          value={
                            resumeData[
                              descKey
                            ]
                          }
                          onChange={event =>
                            updateField(
                              descKey,
                              event.target.value
                            )
                          }
                        />
                      </label>

                    </div>

                  </section>
                );
              })}

            </div>
          )}


          {activeSection ===
            "Skills" && (
            <div className="resumeFieldGrid">

              <label>
                Languages
                <input
                  placeholder="C++, JavaScript, C"
                  value={resumeData.languages}
                  onChange={event =>
                    updateField(
                      "languages",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Tools
                <input
                  placeholder="Git, GitHub, AWS"
                  value={resumeData.tools}
                  onChange={event =>
                    updateField(
                      "tools",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Frameworks
                <input
                  placeholder="React.js, Express.js, Node.js"
                  value={resumeData.frameworks}
                  onChange={event =>
                    updateField(
                      "frameworks",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Databases
                <input
                  placeholder="MongoDB, MySQL"
                  value={resumeData.databases}
                  onChange={event =>
                    updateField(
                      "databases",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="resumeFullField">
                Coursework
                <textarea
                  placeholder="Data Structures, Algorithms, OOP, Operating Systems..."
                  value={resumeData.coursework}
                  onChange={event =>
                    updateField(
                      "coursework",
                      event.target.value
                    )
                  }
                />
              </label>

            </div>
          )}


          {activeSection ===
            "Achievements" && (
            <label className="resumeSingleField">
              Achievements
              <textarea
                placeholder={"CodeChef - 5 Star...\nHackathon - Winner...\nCompetition - 1st Prize..."}
                value={resumeData.achievements}
                onChange={event =>
                  updateField(
                    "achievements",
                    event.target.value
                  )
                }
              />
            </label>
          )}


          {activeSection ===
            "Certifications" && (
            <label className="resumeSingleField">
              Certifications
              <textarea
                placeholder={"AWS Cloud Foundation\nGoogle Cloud Fundamentals"}
                value={resumeData.certifications}
                onChange={event =>
                  updateField(
                    "certifications",
                    event.target.value
                  )
                }
              />
            </label>
          )}


          {activeSection ===
            "Experience" && (
            <div className="resumeFieldGrid">

              <label>
                Role
                <input
                  value={resumeData.experienceTitle}
                  onChange={event =>
                    updateField(
                      "experienceTitle",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Company
                <input
                  value={resumeData.experienceCompany}
                  onChange={event =>
                    updateField(
                      "experienceCompany",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Duration
                <input
                  value={resumeData.experienceDuration}
                  onChange={event =>
                    updateField(
                      "experienceDuration",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Location
                <input
                  value={resumeData.experienceLocation}
                  onChange={event =>
                    updateField(
                      "experienceLocation",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="resumeFullField">
                Experience bullets
                <textarea
                  value={resumeData.experienceDescription}
                  onChange={event =>
                    updateField(
                      "experienceDescription",
                      event.target.value
                    )
                  }
                />
              </label>

            </div>
          )}


          {activeSection ===
            "Engagement" && (
            <label className="resumeSingleField">
              Social engagements / positions
              <textarea
                placeholder={"Club Member at...\nSports Engagements: Cricket, Football..."}
                value={resumeData.engagement}
                onChange={event =>
                  updateField(
                    "engagement",
                    event.target.value
                  )
                }
              />
            </label>
          )}

        </section>


        <section className="resumePreviewWrap">

          <div className="resumePreviewHeader">

            <div>
              <span>
                LIVE DOCUMENT
              </span>

              <strong>
                A4 · ATS-friendly
              </strong>
            </div>

            <button
              type="button"
              className="ghost"
              onClick={exportResume}
            >
              Export PDF
            </button>

          </div>


          <article
            className="placementResumePaper"
            id="placementResumePaper"
          >

            <header className="placementResumeHeader">

              <h1>
                {resumeData.name ||
                  "YOUR NAME"}
              </h1>

              <div className="placementResumeContacts">

                {resumeData.phone && (
                  <span>
                    ☎ {resumeData.phone}
                  </span>
                )}

                {resumeData.email && (
                  <a
                    href={`mailto:${resumeData.email}`}
                  >
                    ✉ {resumeData.email}
                  </a>
                )}

                {resumeData.linkedin && (
                  <a
                    href={safeUrl(
                      resumeData.linkedin
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    LinkedIn
                  </a>
                )}

                {resumeData.github && (
                  <a
                    href={safeUrl(
                      resumeData.github
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </a>
                )}

                {resumeData.portfolio && (
                  <a
                    href={safeUrl(
                      resumeData.portfolio
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Portfolio
                  </a>
                )}

                {resumeData.leetcode && (
                  <a
                    href={safeUrl(
                      resumeData.leetcode
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    LeetCode
                  </a>
                )}

                {resumeData.codechef && (
                  <a
                    href={safeUrl(
                      resumeData.codechef
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    CodeChef
                  </a>
                )}

              </div>

            </header>


            <ResumePrintSection
              title="Education"
            >

              <div className="resumeEducationRow">

                <div>
                  <strong>
                    {resumeData.college}
                  </strong>

                  <em>
                    {resumeData.degree}
                    {resumeData.cgpa
                      ? ` (CGPA: ${resumeData.cgpa})`
                      : ""}
                  </em>
                </div>

                <div>
                  <strong>
                    {
                      [
                        resumeData.collegeStart,
                        resumeData.collegeEnd,
                      ]
                        .filter(Boolean)
                        .join(" - ")
                    }
                  </strong>

                  <em>
                    {resumeData.city}
                  </em>
                </div>

              </div>


              {resumeData.schoolName && (

                <div className="resumeEducationRow">

                  <div>
                    <strong>
                      {resumeData.schoolName}
                    </strong>

                    <em>
                      {resumeData.schoolCourse}
                      {resumeData.schoolScore
                        ? ` (${resumeData.schoolScore})`
                        : ""}
                    </em>
                  </div>

                  <div>
                    <strong>
                      {
                        [
                          resumeData.schoolStart,
                          resumeData.schoolEnd,
                        ]
                          .filter(Boolean)
                          .join(" - ")
                      }
                    </strong>

                    <em>
                      {resumeData.schoolCity}
                    </em>
                  </div>

                </div>

              )}

            </ResumePrintSection>


            {[
              {
                title:
                  resumeData.project1Title,
                tech:
                  resumeData.project1Tech,
                link:
                  resumeData.project1Link,
                description:
                  resumeData.project1Description,
              },
              {
                title:
                  resumeData.project2Title,
                tech:
                  resumeData.project2Tech,
                link:
                  resumeData.project2Link,
                description:
                  resumeData.project2Description,
              },
              {
                title:
                  resumeData.project3Title,
                tech:
                  resumeData.project3Tech,
                link:
                  resumeData.project3Link,
                description:
                  resumeData.project3Description,
              },
            ].some(project =>
              project.title.trim()
            ) && (

              <ResumePrintSection
                title="Projects"
              >

                {[
                  {
                    title:
                      resumeData.project1Title,
                    tech:
                      resumeData.project1Tech,
                    link:
                      resumeData.project1Link,
                    description:
                      resumeData.project1Description,
                  },
                  {
                    title:
                      resumeData.project2Title,
                    tech:
                      resumeData.project2Tech,
                    link:
                      resumeData.project2Link,
                    description:
                      resumeData.project2Description,
                  },
                  {
                    title:
                      resumeData.project3Title,
                    tech:
                      resumeData.project3Tech,
                    link:
                      resumeData.project3Link,
                    description:
                      resumeData.project3Description,
                  },
                ]
                  .filter(project =>
                    project.title.trim()
                  )
                  .map(
                    (
                      project,
                      projectIndex
                    ) => (

                      <div
                        className="resumeProjectBlock"
                        key={projectIndex}
                      >

                        <div className="resumeProjectTitle">

                          <strong>
                            {project.title}
                          </strong>

                          {project.tech && (
                            <em>
                              {" / "}
                              {project.tech}
                            </em>
                          )}

                          {project.link && (
                            <a
                              href={safeUrl(
                                project.link
                              )}
                              target="_blank"
                              rel="noreferrer"
                            >
                              ↗
                            </a>
                          )}

                        </div>

                        {splitLines(
                          project.description
                        ).length > 0 && (

                          <ul>

                            {splitLines(
                              project.description
                            ).map(
                              (
                                line,
                                lineIndex
                              ) => (
                                <li
                                  key={
                                    lineIndex
                                  }
                                >
                                  {line}
                                </li>
                              )
                            )}

                          </ul>

                        )}

                      </div>

                    )
                  )}

              </ResumePrintSection>

            )}


            {(resumeData.languages ||
              resumeData.tools ||
              resumeData.frameworks ||
              resumeData.databases ||
              resumeData.coursework) && (

              <ResumePrintSection
                title="Technical Skills"
              >

                <div className="resumeSkillsTable">

                  {resumeData.languages && (
                    <p>
                      <strong>
                        Languages
                      </strong>
                      <span>
                        {resumeData.languages}
                      </span>
                    </p>
                  )}

                  {resumeData.tools && (
                    <p>
                      <strong>
                        Tools
                      </strong>
                      <span>
                        {resumeData.tools}
                      </span>
                    </p>
                  )}

                  {resumeData.frameworks && (
                    <p>
                      <strong>
                        Frameworks
                      </strong>
                      <span>
                        {resumeData.frameworks}
                      </span>
                    </p>
                  )}

                  {resumeData.databases && (
                    <p>
                      <strong>
                        Databases
                      </strong>
                      <span>
                        {resumeData.databases}
                      </span>
                    </p>
                  )}

                  {resumeData.coursework && (
                    <p>
                      <strong>
                        Coursework
                      </strong>
                      <span>
                        {resumeData.coursework}
                      </span>
                    </p>
                  )}

                </div>

              </ResumePrintSection>

            )}


            {resumeData.experienceTitle && (

              <ResumePrintSection
                title="Experience"
              >

                <div className="resumeExperienceHead">

                  <div>
                    <strong>
                      {resumeData.experienceTitle}
                    </strong>

                    <em>
                      {resumeData.experienceCompany}
                    </em>
                  </div>

                  <div>
                    <strong>
                      {resumeData.experienceDuration}
                    </strong>

                    <em>
                      {resumeData.experienceLocation}
                    </em>
                  </div>

                </div>

                {splitLines(
                  resumeData.experienceDescription
                ).length > 0 && (

                  <ul>

                    {splitLines(
                      resumeData.experienceDescription
                    ).map(
                      (
                        line,
                        index
                      ) => (
                        <li key={index}>
                          {line}
                        </li>
                      )
                    )}

                  </ul>

                )}

              </ResumePrintSection>

            )}


            {resumeData.achievements && (

              <ResumePrintSection
                title="Achievements"
              >
                <ul>
                  {splitLines(
                    resumeData.achievements
                  ).map(
                    (
                      line,
                      index
                    ) => (
                      <li key={index}>
                        {line}
                      </li>
                    )
                  )}
                </ul>
              </ResumePrintSection>

            )}


            {resumeData.certifications && (

              <ResumePrintSection
                title="Certifications"
              >
                <ul className="resumePlainList">
                  {splitLines(
                    resumeData.certifications
                  ).map(
                    (
                      line,
                      index
                    ) => (
                      <li key={index}>
                        {line}
                      </li>
                    )
                  )}
                </ul>
              </ResumePrintSection>

            )}


            {resumeData.engagement && (

              <ResumePrintSection
                title="Social Engagements"
              >
                <ul className="resumePlainList">
                  {splitLines(
                    resumeData.engagement
                  ).map(
                    (
                      line,
                      index
                    ) => (
                      <li key={index}>
                        {line}
                      </li>
                    )
                  )}
                </ul>
              </ResumePrintSection>

            )}

          </article>

        </section>

      </div>

    </div>
  );
}


function ResumePrintSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="resumePrintSection">

      <h2>
        {title}
      </h2>

      <div>
        {children}
      </div>

    </section>
  );
}

function Academics({role, profile}: {role: Role; profile: Profile}) {
  type AcademicRow = Record<string, any>;

  type AcademicTab =
    | "Overview"
    | "Subjects"
    | "Marks"
    | "Results"
    | "Timetable"
    | "Fees";

  const [attendance, setAttendance] = useState<AcademicRow[]>([]);
  const [marks, setMarks] = useState<AcademicRow[]>([]);
  const [results, setResults] = useState<AcademicRow[]>([]);
  const [fees, setFees] = useState<AcademicRow[]>([]);
  const [subjects, setSubjects] = useState<AcademicRow[]>([]);
  const [timetable, setTimetable] = useState<AcademicRow[]>([]);
  const [academicEvents, setAcademicEvents] = useState<AcademicRow[]>([]);
  const [connection, setConnection] = useState<AcademicRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AcademicTab>("Overview");
  const [semester, setSemester] = useState("All");
  const [query, setQuery] = useState("");

  const go = (target: View) => {
    window.dispatchEvent(
      new CustomEvent("campus-navigate", {
        detail: target,
      })
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const openAcademicAi = (
    mode:
      | "academic_advisor"
      | "attendance_advisor"
      | "performance_coach"
      | "daily_briefing",
    prompt: string
  ) => {
    window.sessionStorage.setItem(
      "campusconnect-ai-intent",
      JSON.stringify({
        mode,
        prompt,
        createdAt: Date.now(),
      })
    );

    go("My Campus");
  };


  useEffect(() => {
    let active = true;

    const load = async () => {
      const client = getSupabaseClient();

      if (!client) {
        setLoading(false);
        return;
      }

      if (role !== "Student") {
        setLoading(false);
        return;
      }

      try {
        const {data: auth} =
          await client.auth.getUser();

        if (!auth.user || !active) {
          return;
        }

        const id = auth.user.id;

        const [
          attendanceResult,
          marksResult,
          resultsResult,
          feesResult,
          connectionResult,
          subjectsResult,
          timetableResult,
          eventsResult,
        ] = await Promise.all([
          client
            .from("college_attendance")
            .select("*")
            .eq("student_id", id)
            .order("subject_name"),

          client
            .from("college_marks")
            .select("*")
            .eq("student_id", id)
            .order("subject_name"),

          client
            .from("college_results")
            .select("*")
            .eq("student_id", id)
            .order("semester", {
              ascending: false,
            }),

          client
            .from("college_fees")
            .select("*")
            .eq("student_id", id)
            .order("due_date", {
              ascending: false,
            }),

          client
            .from("college_connections")
            .select("*")
            .eq("student_id", id)
            .maybeSingle(),

          client
            .from("college_subjects")
            .select("*")
            .eq("student_id", id)
            .order("subject_name"),

          client
            .from("college_timetable")
            .select("*")
            .eq("student_id", id)
            .order("period_order"),

          client
            .from("college_academic_events")
            .select("*")
            .eq("student_id", id)
            .order("starts_at", {
              ascending: true,
            }),
        ]);

        if (!active) return;

        if (!attendanceResult.error)
          setAttendance(attendanceResult.data || []);

        if (!marksResult.error)
          setMarks(marksResult.data || []);

        if (!resultsResult.error)
          setResults(resultsResult.data || []);

        if (!feesResult.error)
          setFees(feesResult.data || []);

        if (!connectionResult.error)
          setConnection(connectionResult.data || null);

        if (!subjectsResult.error)
          setSubjects(subjectsResult.data || []);

        if (!timetableResult.error)
          setTimetable(timetableResult.data || []);

        if (!eventsResult.error)
          setAcademicEvents(eventsResult.data || []);

      } catch (error) {
        console.error(
          "Academics load error:",
          error
        );
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

  if (role !== "Student") {
    return (
      <div className="moduleStack academicStaffWorkspace">

        <section className="academicStaffHero">

          <div>
            <span>ACADEMIC OPERATIONS</span>

            <h2>
              Teaching and academic management
            </h2>

            <p>
              Manage attendance, assignments,
              academic resources and student
              performance using dedicated
              CampusConnect workspaces.
            </p>
          </div>

          <div className="academicStaffHeroActions">

            <button
              className="primary"
              onClick={() => go("Attendance")}
            >
              Attendance center
            </button>

            <button
              className="ghost"
              onClick={() => go("Assignments")}
            >
              Assignments
            </button>

          </div>

        </section>


        <section className="academicStaffActionGrid">

          <button
            type="button"
            className="card"
            onClick={() => go("Attendance")}
          >
            <i>A</i>

            <div>
              <span>CLASSROOM</span>
              <h3>Attendance</h3>
              <p>
                Manage batches, students,
                sessions and attendance history.
              </p>
            </div>

            <strong>→</strong>
          </button>


          <button
            type="button"
            className="card"
            onClick={() => go("Assignments")}
          >
            <i>C</i>

            <div>
              <span>COURSEWORK</span>
              <h3>Assignments</h3>
              <p>
                Create, edit and monitor
                student coursework.
              </p>
            </div>

            <strong>→</strong>
          </button>


          <button
            type="button"
            className="card"
            onClick={() => go("Learning")}
          >
            <i>R</i>

            <div>
              <span>RESOURCE SHELF</span>
              <h3>Learning library</h3>
              <p>
                Publish notes, PYQs and
                verified academic resources.
              </p>
            </div>

            <strong>→</strong>
          </button>

        </section>

      </div>
    );
  }


  const semesterValues =
    Array.from(
      new Set(
        [
          ...subjects,
          ...attendance,
          ...marks,
          ...results,
          ...timetable,
        ]
          .map(item => item.semester)
          .filter(
            value =>
              value !== null &&
              value !== undefined &&
              value !== ""
          )
          .map(String)
      )
    ).sort(
      (a, b) =>
        Number(b) - Number(a)
    );


  const semesterMatch = (
    row: AcademicRow
  ) =>
    semester === "All" ||
    !row.semester ||
    String(row.semester) === semester;


  const normalizedQuery =
    query.trim().toLowerCase();


  const searchMatch = (
    row: AcademicRow
  ) => {
    if (!normalizedQuery) {
      return true;
    }

    return [
      row.subject_name,
      row.subject_code,
      row.faculty_name,
      row.assessment,
      row.event_type,
      row.fee_type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  };


  const visibleAttendance =
    attendance.filter(
      item =>
        semesterMatch(item) &&
        searchMatch(item)
    );


  const visibleSubjects =
    subjects.filter(
      item =>
        semesterMatch(item) &&
        searchMatch(item)
    );


  const visibleMarks =
    marks.filter(
      item =>
        semesterMatch(item) &&
        searchMatch(item)
    );


  const visibleResults =
    results.filter(
      item =>
        semesterMatch(item)
    );


  const visibleFees =
    fees.filter(
      item =>
        semesterMatch(item)
    );


  const visibleTimetable =
    timetable.filter(
      item =>
        semesterMatch(item) &&
        searchMatch(item)
    );


  const attendanceAverage =
    visibleAttendance.length
      ? Math.round(
          visibleAttendance.reduce(
            (total, item) => {
              if (!item.total) {
                return total;
              }

              return total +
                item.attended /
                  item.total *
                  100;
            },
            0
          ) /
            visibleAttendance.length
        )
      : 0;


  const attendanceShortage =
    visibleAttendance.filter(
      item =>
        item.total &&
        item.attended /
          item.total *
          100 <
          75
    );


  const latestResult =
    results[0];


  const pendingFees =
    fees.filter(
      item =>
        String(
          item.status || ""
        ).toLowerCase() !==
        "paid"
    );


  const currentDay =
    new Intl.DateTimeFormat(
      "en-US",
      {
        weekday: "long",
      }
    ).format(new Date());


  const todayClasses =
    visibleTimetable.filter(
      item =>
        String(
          item.day_of_week || ""
        ).toLowerCase() ===
        currentDay.toLowerCase()
    );


  const upcomingEvents =
    academicEvents.filter(
      item =>
        item.starts_at &&
        new Date(
          item.starts_at
        ).getTime() >=
          Date.now()
    );


  const attendanceForSubject = (
    item: AcademicRow
  ) =>
    attendance.find(
      row =>
        (
          item.subject_code &&
          row.subject_code ===
            item.subject_code
        ) ||
        row.subject_name ===
          item.subject_name
    );


  const marksForSubject = (
    item: AcademicRow
  ) =>
    marks.filter(
      row =>
        (
          item.subject_code &&
          row.subject_code ===
            item.subject_code
        ) ||
        row.subject_name ===
          item.subject_name
    );


  return (
    <div className="academicCenterPro">

      
      <StudentPerformanceTracker />

<section className="academicProHero">

        <div className="academicProHeroGlow"/>

        <div className="academicProHeroContent">

          <span>RNSIT ACADEMIC CENTER</span>

          <h1>
            Your academic journey.
            One intelligent workspace.
          </h1>

          <p>
            Attendance, subjects, internal
            assessments, semester results,
            timetable and fee records
            organized into one connected
            CampusConnect experience.
          </p>


          <div className="academicProIdentity">

            <span>
              {profile.department ||
                "Department"}
            </span>

            <i/>

            <span>
              {profile.usn ||
                "USN not linked"}
            </span>

            <i/>

            <span>
              {profile.year ||
                "Student"}
            </span>

          </div>

        </div>


        <aside className="academicProConnection">

          <div
            className={
              connection?.status ===
              "connected"
                ? "academicConnectionStatus connected"
                : "academicConnectionStatus"
            }
          >

            <span>
              <i/>
              {connection?.status ===
              "connected"
                ? "LIVE ACADEMIC SYNC"
                : "ACADEMIC SYNC"}
            </span>

            <strong>
              {connection?.status ===
              "connected"
                ? "RNSIT connected"
                : "Connect RNSIT"}
            </strong>

            <small>
              {connection?.last_synced_at
                ? `Last synced ${friendlyRelative(
                    connection.last_synced_at
                  )}`
                : "Connect your academic account to import official records."}
            </small>

          </div>

          <button
            type="button"
            onClick={() =>
              go("Profile")
            }
          >
            {connection?.status ===
            "connected"
              ? "Manage connection"
              : "Connect account"}

            <span>→</span>
          </button>

        </aside>

      </section>


      <section className="academicProToolbar">

        <div className="academicProTabs">

          {(
            [
              "Overview",
              "Subjects",
              "Marks",
              "Results",
              "Timetable",
              "Fees",
            ] as AcademicTab[]
          ).map(item => (
            <button
              type="button"
              key={item}
              className={
                tab === item
                  ? "active"
                  : ""
              }
              onClick={() => {
                setTab(item);

                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
            >
              {item}
            </button>
          ))}

        </div>


        <div className="academicProFilters">

          <select
            value={semester}
            onChange={event =>
              setSemester(
                event.target.value
              )
            }
          >
            <option value="All">
              All semesters
            </option>

            {semesterValues.map(
              item => (
                <option
                  key={item}
                  value={item}
                >
                  Semester {item}
                </option>
              )
            )}
          </select>


          <label>
            <span>⌕</span>

            <input
              value={query}
              onChange={event =>
                setQuery(
                  event.target.value
                )
              }
              placeholder="Search academics..."
            />
          </label>

        </div>

      </section>


      <section
        className="academicAiActionBar"
        aria-label="Academic AI actions"
      >
        <header>
          <div>
            <span>CONTEXTUAL INTELLIGENCE</span>
            <h2>Use AI with your academic records</h2>
            <p>
              Open the right Campus AI workspace with a focused
              question prepared from your current academic context.
            </p>
          </div>

          <small>
            Authenticated data only
          </small>
        </header>

        <div className="academicAiActionGrid">
          <button
            type="button"
            onClick={() =>
              openAcademicAi(
                "academic_advisor",
                semester === "All"
                  ? "Review my complete available academic picture and tell me the three most important priorities I should act on next."
                  : `Review my available academic records for semester ${semester} and tell me the three most important priorities I should act on next.`
              )
            }
          >
            <i>A</i>
            <span>
              <small>GUIDANCE</small>
              <b>Academic Advisor</b>
              <em>Review priorities and next steps</em>
            </span>
            <strong>→</strong>
          </button>

          <button
            type="button"
            onClick={() =>
              openAcademicAi(
                "attendance_advisor",
                semester === "All"
                  ? "Review my available attendance by subject, identify records below 75 percent, and use only CampusConnect's deterministic calculations for recovery targets and safe margins."
                  : `Review my available attendance for semester ${semester}, identify records below 75 percent, and use only CampusConnect's deterministic calculations for recovery targets and safe margins.`
              )
            }
          >
            <i>%</i>
            <span>
              <small>ATTENDANCE</small>
              <b>Attendance Advisor</b>
              <em>Check risk and 75% targets</em>
            </span>
            <strong>→</strong>
          </button>

          <button
            type="button"
            onClick={() =>
              openAcademicAi(
                "performance_coach",
                semester === "All"
                  ? "Review my available marks and results, identify only evidence-supported focus areas, and give me a practical improvement plan."
                  : `Review my available marks and results for semester ${semester}, identify only evidence-supported focus areas, and give me a practical improvement plan.`
              )
            }
          >
            <i>P</i>
            <span>
              <small>PERFORMANCE</small>
              <b>Performance Coach</b>
              <em>Understand evidence and improve</em>
            </span>
            <strong>→</strong>
          </button>

          <button
            type="button"
            onClick={() =>
              openAcademicAi(
                "daily_briefing",
                "Generate my Daily AI Briefing using only available dated academic records. Show what matters today, urgent academic work, relevant signals and no more than three next actions."
              )
            }
          >
            <i>D</i>
            <span>
              <small>TODAY</small>
              <b>Daily AI Briefing</b>
              <em>Prepare today's focused briefing</em>
            </span>
            <strong>→</strong>
          </button>
        </div>
      </section>


      {loading ? (

        <section className="academicProLoading">
          <i/>
          <span>
            Loading academic records...
          </span>
        </section>

      ) : (
        <>

          {tab === "Overview" && (
            <>

              <section className="academicProMetrics">

                <article>
                  <span>ATTENDANCE</span>

                  <strong>
                    {visibleAttendance.length
                      ? `${attendanceAverage}%`
                      : "—"}
                  </strong>

                  <p>
                    {visibleAttendance.length}
                    {" "}
                    subject
                    {visibleAttendance.length === 1
                      ? ""
                      : "s"}
                    {" "}
                    tracked
                  </p>

                  <div>
                    <i
                      style={{
                        width:
                          `${Math.min(
                            attendanceAverage,
                            100
                          )}%`,
                      }}
                    />
                  </div>
                </article>


                <article>
                  <span>LATEST SGPA</span>

                  <strong>
                    {latestResult?.sgpa ??
                      "—"}
                  </strong>

                  <p>
                    {latestResult?.semester
                      ? `Semester ${latestResult.semester}`
                      : "No published result"}
                  </p>
                </article>


                <article>
                  <span>CURRENT CGPA</span>

                  <strong>
                    {latestResult?.cgpa ??
                      "—"}
                  </strong>

                  <p>
                    Cumulative academic
                    performance
                  </p>
                </article>


                <article
                  className={
                    attendanceShortage.length
                      ? "attention"
                      : ""
                  }
                >
                  <span>ATTENTION</span>

                  <strong>
                    {attendanceShortage.length}
                  </strong>

                  <p>
                    subject
                    {attendanceShortage.length === 1
                      ? ""
                      : "s"}
                    {" "}
                    below 75%
                  </p>
                </article>

              </section>


              <section className="academicProOverview">

                <main>

                  <section className="academicProPanel">

                    <header>
                      <div>
                        <span>TODAY</span>
                        <h2>
                          Today&apos;s classes
                        </h2>
                      </div>

                      <button
                        onClick={() =>
                          setTab(
                            "Timetable"
                          )
                        }
                      >
                        Full timetable →
                      </button>
                    </header>


                    {todayClasses.length ? (
                      <div className="academicTodaySchedule">

                        {todayClasses.map(
                          item => (
                            <article
                              key={item.id}
                            >

                              <time>
                                {String(
                                  item.start_time ||
                                    ""
                                ).slice(0,5)}
                              </time>

                              <div>
                                <strong>
                                  {item.subject_name}
                                </strong>

                                <small>
                                  {[
                                    item.subject_code,
                                    item.class_type,
                                    item.room,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </small>
                              </div>

                              <span>
                                {item.faculty_name ||
                                  "Faculty"}
                              </span>

                            </article>
                          )
                        )}

                      </div>
                    ) : (
                      <EmptyAcademic
                        text="No classes synced for today."
                      />
                    )}

                  </section>


                  <section className="academicProPanel">

                    <header>
                      <div>
                        <span>
                          ATTENDANCE HEALTH
                        </span>

                        <h2>
                          Subject performance
                        </h2>
                      </div>

                      <button
                        onClick={() =>
                          setTab(
                            "Subjects"
                          )
                        }
                      >
                        All subjects →
                      </button>
                    </header>


                    {visibleAttendance.length ? (
                      <div className="academicAttendanceRows">

                        {visibleAttendance
                          .slice(0,8)
                          .map(item => {
                            const percent =
                              item.total
                                ? Math.round(
                                    item.attended /
                                      item.total *
                                      100
                                  )
                                : 0;

                            return (
                              <article
                                key={item.id}
                              >

                                <div>
                                  <strong>
                                    {item.subject_name}
                                  </strong>

                                  <small>
                                    {item.subject_code ||
                                      `${item.attended}/${item.total} classes`}
                                  </small>
                                </div>


                                <div className="academicAttendanceTrack">
                                  <i>
                                    <span
                                      style={{
                                        width:
                                          `${Math.min(
                                            percent,
                                            100
                                          )}%`,
                                      }}
                                    />
                                  </i>
                                </div>


                                <b
                                  className={
                                    percent < 75
                                      ? "risk"
                                      : "safe"
                                  }
                                >
                                  {percent}%
                                </b>

                              </article>
                            );
                          })}

                      </div>
                    ) : (
                      <EmptyAcademic
                        text="No attendance records synced yet."
                      />
                    )}

                  </section>

                </main>


                <aside>

                  <section className="academicProPanel">

                    <header>
                      <div>
                        <span>
                          ACADEMIC CALENDAR
                        </span>

                        <h2>
                          Coming up
                        </h2>
                      </div>
                    </header>


                    {upcomingEvents.length ? (
                      <div className="academicUpcoming">

                        {upcomingEvents
                          .slice(0,5)
                          .map(item => (
                            <article
                              key={item.id}
                            >

                              <time>
                                <strong>
                                  {new Date(
                                    item.starts_at
                                  ).getDate()}
                                </strong>

                                <small>
                                  {new Intl.DateTimeFormat(
                                    "en-IN",
                                    {
                                      month: "short",
                                    }
                                  )
                                    .format(
                                      new Date(
                                        item.starts_at
                                      )
                                    )
                                    .toUpperCase()}
                                </small>
                              </time>

                              <div>
                                <span>
                                  {item.event_type ||
                                    "Academic"}
                                </span>

                                <strong>
                                  {item.title}
                                </strong>

                                <small>
                                  {[
                                    item.subject_name,
                                    item.venue,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </small>
                              </div>

                            </article>
                          ))}

                      </div>
                    ) : (
                      <EmptyAcademic
                        text="No upcoming academic events."
                      />
                    )}

                  </section>


                  <section className="academicProPanel academicProFeeStatus">

                    <header>
                      <div>
                        <span>FEES</span>
                        <h2>
                          Fee status
                        </h2>
                      </div>
                    </header>

                    <strong>
                      {pendingFees.length}
                    </strong>

                    <p>
                      {pendingFees.length
                        ? "record(s) may require your attention."
                        : "No pending fee records."}
                    </p>

                    <button
                      onClick={() =>
                        setTab("Fees")
                      }
                    >
                      View payments →
                    </button>

                  </section>

                </aside>

              </section>

            </>
          )}


          {tab === "Subjects" && (

            <section className="academicProSection">

              <header className="academicProSectionHeading">

                <div>
                  <span>
                    CURRICULUM
                  </span>

                  <h2>
                    My subjects
                  </h2>

                  <p>
                    Course information,
                    credits, faculty,
                    attendance and assessments.
                  </p>
                </div>

                <strong>
                  {visibleSubjects.length}
                  {" "}
                  subjects
                </strong>

              </header>


              <div className="academicSubjectCards">

                {visibleSubjects.map(
                  subjectItem => {
                    const attendanceItem =
                      attendanceForSubject(
                        subjectItem
                      );

                    const percent =
                      attendanceItem?.total
                        ? Math.round(
                            attendanceItem.attended /
                              attendanceItem.total *
                              100
                          )
                        : null;

                    const subjectMarks =
                      marksForSubject(
                        subjectItem
                      );

                    return (
                      <article
                        key={
                          subjectItem.id
                        }
                      >

                        <header>
                          <span>
                            {subjectItem.subject_type ||
                              "Subject"}
                          </span>

                          <code>
                            {subjectItem.subject_code ||
                              "—"}
                          </code>
                        </header>

                        <h3>
                          {subjectItem.subject_name}
                        </h3>

                        <p>
                          {subjectItem.faculty_name ||
                            "Faculty not synced"}
                        </p>


                        <div className="academicSubjectStats">

                          <div>
                            <small>CREDITS</small>
                            <strong>
                              {subjectItem.credits ??
                                "—"}
                            </strong>
                          </div>

                          <div>
                            <small>
                              ATTENDANCE
                            </small>

                            <strong
                              className={
                                percent !== null &&
                                percent < 75
                                  ? "riskText"
                                  : ""
                              }
                            >
                              {percent !== null
                                ? `${percent}%`
                                : "—"}
                            </strong>
                          </div>

                          <div>
                            <small>
                              ASSESSMENTS
                            </small>

                            <strong>
                              {subjectMarks.length}
                            </strong>
                          </div>

                        </div>

                      </article>
                    );
                  }
                )}

              </div>


              {!visibleSubjects.length && (
                <EmptyAcademic
                  text="No subjects synced for this semester."
                />
              )}

            </section>

          )}


          {tab === "Marks" && (

            <section className="academicProSection">

              <header className="academicProSectionHeading">

                <div>
                  <span>
                    INTERNAL ASSESSMENT
                  </span>

                  <h2>
                    CIE & internal marks
                  </h2>

                  <p>
                    Published assessment
                    performance by subject.
                  </p>
                </div>

                <strong>
                  {visibleMarks.length}
                  {" "}
                  records
                </strong>

              </header>


              <div className="academicMarksProTable">

                <header>
                  <span>SUBJECT</span>
                  <span>ASSESSMENT</span>
                  <span>SCORE</span>
                  <span>PERFORMANCE</span>
                </header>


                {visibleMarks.map(
                  item => {
                    const percent =
                      item.max_marks
                        ? Math.round(
                            Number(
                              item.marks || 0
                            ) /
                              Number(
                                item.max_marks
                              ) *
                              100
                          )
                        : null;

                    return (
                      <article
                        key={item.id}
                      >

                        <div>
                          <strong>
                            {item.subject_name}
                          </strong>

                          <small>
                            {item.subject_code ||
                              "—"}
                          </small>
                        </div>

                        <span>
                          {item.assessment}
                        </span>

                        <strong>
                          {item.marks ?? "—"}

                          {item.max_marks
                            ? ` / ${item.max_marks}`
                            : ""}
                        </strong>


                        <div className="academicMarksProgress">

                          {percent !== null ? (
                            <>
                              <i>
                                <span
                                  style={{
                                    width:
                                      `${Math.min(
                                        percent,
                                        100
                                      )}%`,
                                  }}
                                />
                              </i>

                              <small>
                                {percent}%
                              </small>
                            </>
                          ) : (
                            <small>—</small>
                          )}

                        </div>

                      </article>
                    );
                  }
                )}

              </div>


              {!visibleMarks.length && (
                <EmptyAcademic
                  text="No internal marks synced yet."
                />
              )}

            </section>

          )}


          {tab === "Results" && (

            <section className="academicProSection">

              <header className="academicProSectionHeading">

                <div>
                  <span>
                    PERFORMANCE HISTORY
                  </span>

                  <h2>
                    Semester results
                  </h2>

                  <p>
                    SGPA, CGPA, credits
                    and published semester
                    performance.
                  </p>
                </div>

              </header>


              <div className="academicResultCards">

                {visibleResults.map(
                  result => (
                    <article
                      key={result.id}
                    >

                      <header>

                        <div>
                          <small>
                            SEMESTER
                          </small>

                          <strong>
                            {result.semester}
                          </strong>
                        </div>

                        <span>
                          {result.result_status ||
                            "Published"}
                        </span>

                      </header>


                      <div className="academicResultStats">

                        <div>
                          <small>SGPA</small>
                          <strong>
                            {result.sgpa ??
                              "—"}
                          </strong>
                        </div>

                        <div>
                          <small>CGPA</small>
                          <strong>
                            {result.cgpa ??
                              "—"}
                          </strong>
                        </div>

                        <div>
                          <small>
                            CREDITS
                          </small>

                          <strong>
                            {result.credits_earned ??
                              "—"}
                          </strong>
                        </div>

                      </div>


                      <footer>

                        <span>
                          {result.academic_year ||
                            "Academic year"}
                        </span>

                        {result.grade && (
                          <strong>
                            {result.grade}
                          </strong>
                        )}

                      </footer>

                    </article>
                  )
                )}

              </div>


              {!visibleResults.length && (
                <EmptyAcademic
                  text="No semester results synced yet."
                />
              )}

            </section>

          )}


          {tab === "Timetable" && (

            <section className="academicProSection">

              <header className="academicProSectionHeading">

                <div>
                  <span>
                    WEEKLY SCHEDULE
                  </span>

                  <h2>
                    Class timetable
                  </h2>

                  <p>
                    Your lectures, labs,
                    rooms and faculty
                    schedule.
                  </p>
                </div>

              </header>


              <div className="academicWeek">

                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ].map(day => {
                  const dayItems =
                    visibleTimetable.filter(
                      item =>
                        String(
                          item.day_of_week ||
                            ""
                        ).toLowerCase() ===
                        day.toLowerCase()
                    );

                  if (!dayItems.length) {
                    return null;
                  }

                  return (
                    <section
                      key={day}
                      className="academicDay"
                    >

                      <header>
                        <strong>
                          {day}
                        </strong>

                        <small>
                          {dayItems.length}
                          {" "}
                          class
                          {dayItems.length === 1
                            ? ""
                            : "es"}
                        </small>
                      </header>


                      <div>

                        {dayItems.map(
                          item => (
                            <article
                              key={item.id}
                            >

                              <time>
                                <strong>
                                  {String(
                                    item.start_time ||
                                      ""
                                  ).slice(0,5)}
                                </strong>

                                <small>
                                  {String(
                                    item.end_time ||
                                      ""
                                  ).slice(0,5)}
                                </small>
                              </time>

                              <div>
                                <span>
                                  {item.class_type ||
                                    "Class"}
                                </span>

                                <h3>
                                  {item.subject_name}
                                </h3>

                                <p>
                                  {[
                                    item.subject_code,
                                    item.faculty_name,
                                    item.room,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              </div>

                            </article>
                          )
                        )}

                      </div>

                    </section>
                  );
                })}

              </div>


              {!visibleTimetable.length && (
                <EmptyAcademic
                  text="No timetable synced for this semester."
                />
              )}

            </section>

          )}


          {tab === "Fees" && (

            <section className="academicProSection">

              <header className="academicProSectionHeading">

                <div>
                  <span>
                    FINANCIAL RECORDS
                  </span>

                  <h2>
                    Fees & payments
                  </h2>

                  <p>
                    Official college fee
                    status and payment
                    information.
                  </p>
                </div>

                <strong>
                  {pendingFees.length}
                  {" "}
                  pending
                </strong>

              </header>


              <div className="academicFeeRows">

                {visibleFees.map(
                  item => {
                    const paid =
                      String(
                        item.status || ""
                      ).toLowerCase() ===
                      "paid";

                    return (
                      <article
                        key={item.id}
                      >

                        <i>₹</i>

                        <div>
                          <span>
                            {item.academic_year ||
                              "Academic fee"}
                          </span>

                          <h3>
                            {item.fee_type ||
                              "College fee"}
                          </h3>

                          <p>
                            {item.due_date
                              ? `Due ${friendlyDate(
                                  item.due_date
                                )}`
                              : "No due date"}
                          </p>
                        </div>


                        <div className="academicFeeValue">

                          <strong>
                            {item.amount
                              ? `₹${Number(
                                  item.amount
                                ).toLocaleString(
                                  "en-IN"
                                )}`
                              : "—"}
                          </strong>

                          <span
                            className={
                              paid
                                ? "paid"
                                : "pending"
                            }
                          >
                            {item.status ||
                              "Pending"}
                          </span>

                        </div>


                        {item.receipt_url && (
                          <a
                            href={
                              item.receipt_url
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            Receipt ↗
                          </a>
                        )}

                      </article>
                    );
                  }
                )}

              </div>


              {!visibleFees.length && (
                <EmptyAcademic
                  text="No fee records synced yet."
                />
              )}

            </section>

          )}

        </>
      )}

    </div>
  );
}

function EmptyAcademic({text}:{text:string}) { return <div className="academicEmpty"><span>◇</span><p>{text}</p></div>; }

function FacultyAcademics() { return <div className="moduleStack"><ModuleNotice title="Faculty academic tools" text="Use Attendance, Assignments and Learning for live records and publishing."/></div>; }
function ModuleNotice({title,text}: {title:string;text:string}) { return <section className="moduleHero"><div><span>LIVE MODULE</span><h2>{title}</h2><p>{text}</p></div></section>; }


type CampusAchievement = {
  id: string;
  title: string;
  description: string;
  achievement_type: string;
  person_name: string;
  department: string;
  award_name: string;
  organization: string;
  achievement_date: string | null;
  image_url: string | null;
  external_url: string | null;
  is_featured: boolean;
  created_at?: string;
};

type CampusResearch = {
  id: string;
  title: string;
  description: string;
  research_type: string;
  department: string;
  lead_name: string;
  collaborators: string;
  organization: string;
  year: string;
  image_url: string | null;
  external_url: string | null;
  status: string;
  is_featured: boolean;
  created_at?: string;
};

type CampusRecruiter = {
  id: string;
  company_name: string;
  logo_url: string | null;
  website_url: string | null;
  industry: string;
  hiring_roles: string;
  highest_package: string;
  average_package: string;
  students_selected: number;
  placement_year: string;
  is_featured: boolean;
  display_order: number;
  created_by?: string | null;
  created_by_name?: string;
  created_at?: string;
};

type CampusRecruiterStudent = {
  id: string;
  recruiter_id: string;
  student_name: string;
  student_photo_url: string | null;
  package_lpa: string;
  job_role: string;
  department: string;
  display_order: number;
  created_at?: string;
};

type RecruiterStudentDraft = {
  id: string;
  student_name: string;
  package_lpa: string;
  job_role: string;
  department: string;
  photo_file: File | null;
};


function Campus({
  profile,
}: {
  profile: Profile;
}) {
  type HubEvent = {
    id: string;
    title: string;
    short_description: string;
    description: string;
    category: string;
    venue: string;
    organizer: string;
    event_date: string;
    banner_url: string | null;
    registration_url: string | null;
    is_featured: boolean;
    status: string;
  };

  type HubAnnouncement = {
    id: string;
    title: string;
    body: string;
    category: string;
    author_name: string;
    is_pinned: boolean;
    created_at: string;
    announcement_type?: string;
    show_floating_banner?: boolean;
    banner_url?: string | null;
    banner_start_at?: string | null;
    banner_end_at?: string | null;
    banner_cta_label?: string;
    banner_cta_url?: string | null;
    banner_dismissible?: boolean;
  };

  type HubGroup = {
    id: string;
    name: string;
    description: string;
    audience: string;
    topic: string;
    member_count: number;
  };

  const [events, setEvents] = useState<HubEvent[]>([]);
  const [announcements, setAnnouncements] =
    useState<HubAnnouncement[]>([]);
  const [groups, setGroups] = useState<HubGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] =
    useState<
      "Overview" |
      "Achievements" |
      "Research" |
      "Events" |
      "Communities" |
      "Festivals"
    >("Overview");
  const [search, setSearch] = useState("");

  const [achievements, setAchievements] =
    useState<CampusAchievement[]>([]);

  const [research, setResearch] =
    useState<CampusResearch[]>([]);

  const [recruiters, setRecruiters] =
    useState<CampusRecruiter[]>([]);

  const [recruiterIndex, setRecruiterIndex] =
    useState(0);

  const [recruiterStudents, setRecruiterStudents] =
    useState<CampusRecruiterStudent[]>([]);

  const [expandedRecruiterIds, setExpandedRecruiterIds] =
    useState<string[]>([]);

  const [recruiterLogoFile, setRecruiterLogoFile] =
    useState<File | null>(null);

  const [recruiterStudentDrafts, setRecruiterStudentDrafts] =
    useState<RecruiterStudentDraft[]>([]);

  const [showRecruiterForm, setShowRecruiterForm] =
    useState(false);

  const [recruiterSaving, setRecruiterSaving] =
    useState(false);

  const [recruiterForm, setRecruiterForm] =
    useState({
      company_name: "",
      logo_url: "",
      website_url: "",
      industry: "",
      hiring_roles: "",
      highest_package: "",
      average_package: "",
      students_selected: "0",
      placement_year:
        String(new Date().getFullYear()),
      is_featured: false,
    });

  const [campusError, setCampusError] = useState("");

  const [showAddContent, setShowAddContent] =
    useState(false);

  const [showAchievementForm, setShowAchievementForm] =
    useState(false);

  const [showResearchForm, setShowResearchForm] =
    useState(false);

  const [campusSaving, setCampusSaving] =
    useState(false);

  const [achievementImageFile, setAchievementImageFile] =
    useState<File | null>(null);

  const [editingAchievement, setEditingAchievement] =
    useState<CampusAchievement | null>(null);

  const [achievementPreviewUrl, setAchievementPreviewUrl] =
    useState<string | null>(null);

  const [researchImageFile, setResearchImageFile] =
    useState<File | null>(null);

  const [achievementForm, setAchievementForm] =
    useState({
      title: "",
      description: "",
      achievement_type: "Student",
      person_name: "",
      department: profile.department || "All",
      award_name: "",
      organization: "",
      achievement_date: "",
      image_url: "",
      external_url: "",
      is_featured: false,
    });

  const [researchForm, setResearchForm] =
    useState({
      title: "",
      description: "",
      research_type: "Project",
      department: profile.department || "All",
      lead_name: "",
      collaborators: "",
      organization: "",
      year: "",
      image_url: "",
      external_url: "",
      status: "Active",
      is_featured: false,
    });

  const canAddCampusContent =
    profile.role === "Faculty" ||
    profile.role === "Coordinator" ||
    profile.role === "Main Admin";


  /*
   * ========================================================
   * AUTO COMPANY LOOKUP
   * Company name -> official website + company logo
   * ========================================================
   */
  useEffect(() => {
    const companyName =
      recruiterForm.company_name.trim();

    if (companyName.length < 2) {
      return;
    }

    const controller =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          try {
            const response =
              await fetch(
                `/api/company-lookup?q=${encodeURIComponent(
                  companyName
                )}`,
                {
                  signal:
                    controller.signal,
                }
              );

            if (!response.ok) {
              return;
            }

            type CompanyLookupResult = {
              found: boolean;
              name?: string;
              website?: string;
              logo_url?: string;
            };

            const result =
              await response.json() as CompanyLookupResult;

            if (
              !result ||
              result.found !== true
            ) {
              return;
            }

            /*
             * Do not overwrite anything the admin
             * manually entered after lookup began.
             */
            setRecruiterForm(
              current => {
                if (
                  current.company_name
                    .trim()
                    .toLowerCase() !==
                  companyName.toLowerCase()
                ) {
                  return current;
                }

                return {
                  ...current,

                  company_name:
                    result.name ||
                    current.company_name,

                  website_url:
                    result.website ||
                    current.website_url,

                  logo_url:
                    result.logo_url ||
                    current.logo_url,
                };
              }
            );

          } catch (error) {
            if (
              error instanceof DOMException &&
              error.name ===
                "AbortError"
            ) {
              return;
            }

            console.error(
              "[Recruiter company lookup]",
              error
            );
          }
        },
        650
      );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };

  }, [recruiterForm.company_name]);

  // AUTO COMPANY LOOKUP END


  const canManageRecruiters =
    profile.role === "Faculty" ||
    profile.role === "Coordinator" ||
    profile.role === "Placement Cell" ||
    profile.role === "Main Admin";


  useEffect(() => {
    let active = true;

    const loadCampus = async () => {
      const client = getSupabaseClient();

      if (!client) {
        setCampusError("Supabase is not connected.");
        setLoading(false);
        return;
      }

      const [eventResult, announcementResult, groupResult] =
        await Promise.all([
          client
            .from("campus_events")
            .select(
              "id,title,short_description,description,category,venue,organizer,event_date,banner_url,registration_url,is_featured,status"
            )
            .eq("status", "Published")
            .order("event_date", {ascending: true})
            .limit(20),

          client
            .from("announcements")
            .select(
              "id,title,body,category,author_name,is_pinned,created_at,announcement_type,show_floating_banner,banner_url,banner_start_at,banner_end_at,banner_cta_label,banner_cta_url,banner_dismissible"
            )
            .order("created_at", {ascending: false})
            .limit(12),

          client
            .from("community_groups")
            .select(
              "id,name,description,audience,topic,member_count"
            )
            .order("member_count", {ascending: false})
            .limit(16),
        ]);

      if (!active) return;

      if (eventResult.error) {
        console.error(eventResult.error);
      } else {
        setEvents((eventResult.data || []) as HubEvent[]);
      }

      if (announcementResult.error) {
        console.error(announcementResult.error);
      } else {
        setAnnouncements(
          (announcementResult.data || []) as HubAnnouncement[]
        );
      }

      if (groupResult.error) {
        console.error(groupResult.error);
      } else {
        setGroups((groupResult.data || []) as HubGroup[]);
      }

      setLoading(false);
    };

    void loadCampus();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadRecruiters =
      async () => {
        const client =
          getSupabaseClient();

        if (!client) {
          return;
        }

        const {
          data,
          error,
        } = await client
          .from(
            "campus_recruiters"
          )
          .select("*")
          .order(
            "is_featured",
            {
              ascending: false,
            }
          )
          .order(
            "display_order",
            {
              ascending: true,
            }
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (
          !active
        ) {
          return;
        }

        if (error) {
          console.error(
            "Campus recruiters load error:",
            error
          );

          return;
        }

        setRecruiters(
          (data || []) as
            CampusRecruiter[]
        );

        const {
          data: studentData,
          error: studentError,
        } = await client
          .from(
            "campus_recruiter_students"
          )
          .select("*")
          .order(
            "display_order",
            {
              ascending: true,
            }
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

        if (
          active &&
          !studentError
        ) {
          setRecruiterStudents(
            (studentData || []) as
              CampusRecruiterStudent[]
          );
        }

        if (studentError) {
          console.error(
            "Recruiter students load error:",
            studentError
          );
        }
      };

    void loadRecruiters();

    return () => {
      active = false;
    };
  }, []);


  useEffect(() => {
    if (
      recruiters.length <= 1
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setRecruiterIndex(
            current =>
              (
                current + 1
              ) %
              recruiters.length
          );
        },
        4200
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    recruiters.length,
  ]);


  const moveRecruiters =
    (
      direction:
        "next" | "previous"
    ) => {
      if (
        !recruiters.length
      ) {
        return;
      }

      setRecruiterIndex(
        current => {
          if (
            direction ===
            "next"
          ) {
            return (
              current + 1
            ) %
              recruiters.length;
          }

          return (
            current -
            1 +
            recruiters.length
          ) %
            recruiters.length;
        }
      );
    };


  const toggleRecruiterStudents =
    (
      recruiterId: string
    ) => {
      setExpandedRecruiterIds(
        current =>
          current.includes(
            recruiterId
          )
            ? current.filter(
                id =>
                  id !==
                  recruiterId
              )
            : [
                ...current,
                recruiterId,
              ]
      );
    };


  const addRecruiterStudentDraft =
    () => {
      setRecruiterStudentDrafts(
        current => [
          ...current,
          {
            id:
              crypto.randomUUID(),
            student_name: "",
            package_lpa: "",
            job_role: "",
            department:
              profile.department ||
              "",
            photo_file: null,
          },
        ]
      );
    };


  const updateRecruiterStudentDraft =
    (
      id: string,
      values:
        Partial<
          RecruiterStudentDraft
        >
    ) => {
      setRecruiterStudentDrafts(
        current =>
          current.map(
            student =>
              student.id === id
                ? {
                    ...student,
                    ...values,
                  }
                : student
          )
      );
    };


  const removeRecruiterStudentDraft =
    (
      id: string
    ) => {
      setRecruiterStudentDrafts(
        current =>
          current.filter(
            student =>
              student.id !== id
          )
      );
    };


  const createRecruiter =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        !canManageRecruiters
      ) {
        return;
      }

      if (
        !recruiterForm.company_name
          .trim()
      ) {
        return setCampusError(
          "Company name is required."
        );
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setRecruiterSaving(
        true
      );

      setCampusError("");

      try {
        const {
          data: auth,
          error:
            authError,
        } =
          await client.auth
            .getUser();

        if (
          authError ||
          !auth.user
        ) {
          throw new Error(
            "Your session has expired."
          );
        }

        let recruiterLogoUrl =
          recruiterForm.logo_url
            .trim() ||
          null;

        if (
          recruiterLogoFile
        ) {
          recruiterLogoUrl =
            await uploadCampusContentFile(
              recruiterLogoFile,
              "recruiters"
            );
        }

        const validStudentDrafts =
          recruiterStudentDrafts.filter(
            student =>
              student.student_name
                .trim()
          );

        const {
          data,
          error,
        } =
          await client
            .from(
              "campus_recruiters"
            )
            .insert({
              company_name:
                recruiterForm
                  .company_name
                  .trim(),

              logo_url:
                recruiterLogoUrl,

              website_url:
                recruiterForm
                  .website_url
                  .trim() ||
                null,

              industry:
                recruiterForm
                  .industry
                  .trim(),

              hiring_roles:
                recruiterForm
                  .hiring_roles
                  .trim(),

              highest_package:
                recruiterForm
                  .highest_package
                  .trim(),

              average_package:
                recruiterForm
                  .average_package
                  .trim(),

              students_selected:
                Math.max(
                  validStudentDrafts.length,
                  Math.max(
                    0,
                    Number(
                      recruiterForm
                        .students_selected
                    ) || 0
                  )
                ),

              placement_year:
                recruiterForm
                  .placement_year
                  .trim(),

              is_featured:
                recruiterForm
                  .is_featured,

              created_by:
                auth.user.id,

              created_by_name:
                profile.name,
            })
            .select()
            .single();

        if (error) {
          throw error;
        }

        const createdRecruiter =
          data as
            CampusRecruiter;

        const createdStudents:
          CampusRecruiterStudent[] =
            [];

        for (
          let index = 0;
          index <
          validStudentDrafts.length;
          index++
        ) {
          const student =
            validStudentDrafts[
              index
            ];

          let photoUrl:
            string | null =
              null;

          if (
            student.photo_file
          ) {
            photoUrl =
              await uploadCampusContentFile(
                student.photo_file,
                "recruiters"
              );
          }

          const {
            data:
              createdStudent,
            error:
              studentCreateError,
          } =
            await client
              .from(
                "campus_recruiter_students"
              )
              .insert({
                recruiter_id:
                  createdRecruiter.id,

                student_name:
                  student.student_name
                    .trim(),

                student_photo_url:
                  photoUrl,

                package_lpa:
                  student.package_lpa
                    .trim(),

                job_role:
                  student.job_role
                    .trim(),

                department:
                  student.department
                    .trim(),

                display_order:
                  index,

                created_by:
                  auth.user.id,
              })
              .select()
              .single();

          if (
            studentCreateError
          ) {
            throw studentCreateError;
          }

          createdStudents.push(
            createdStudent as
              CampusRecruiterStudent
          );
        }

        setRecruiters(
          current => [
            createdRecruiter,
            ...current.filter(
              recruiter =>
                recruiter.id !==
                createdRecruiter.id
            ),
          ]
        );

        if (
          createdStudents.length
        ) {
          setRecruiterStudents(
            current => [
              ...current,
              ...createdStudents,
            ]
          );
        }

        setRecruiterIndex(
          0
        );

        setRecruiterForm({
          company_name: "",
          logo_url: "",
          website_url: "",
          industry: "",
          hiring_roles: "",
          highest_package: "",
          average_package: "",
          students_selected: "0",
          placement_year:
            String(
              new Date()
                .getFullYear()
            ),
          is_featured: false,
        });

        setRecruiterLogoFile(
          null
        );

        setRecruiterStudentDrafts(
          []
        );

        setShowRecruiterForm(
          false
        );

      } catch (error) {
        setCampusError(
          error instanceof Error
            ? error.message
            : "Unable to add company."
        );
      } finally {
        setRecruiterSaving(
          false
        );
      }
    };


  const deleteRecruiter =
    async (
      recruiter:
        CampusRecruiter
    ) => {
      if (
        !canManageRecruiters
      ) {
        return;
      }

      if (
        !window.confirm(
          `Remove ${recruiter.company_name} from Top Recruiters?`
        )
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      const {
        error,
      } = await client
        .from(
          "campus_recruiters"
        )
        .delete()
        .eq(
          "id",
          recruiter.id
        );

      if (error) {
        return setCampusError(
          error.message
        );
      }

      setRecruiters(
        current =>
          current.filter(
            item =>
              item.id !==
              recruiter.id
          )
      );

      setRecruiterStudents(
        current =>
          current.filter(
            student =>
              student.recruiter_id !==
              recruiter.id
          )
      );

      setExpandedRecruiterIds(
        current =>
          current.filter(
            id =>
              id !==
              recruiter.id
          )
      );

      setRecruiterIndex(
        0
      );
    };


  const go = (target: View) => {
    window.dispatchEvent(
      new CustomEvent("campus-navigate", {
        detail: target,
      })
    );
  };

  const normalized = search.trim().toLowerCase();

  const visibleEvents = events.filter(event => {
    if (!normalized) return true;

    return `${event.title} ${event.category} ${event.venue} ${event.organizer}`
      .toLowerCase()
      .includes(normalized);
  });

  const visibleGroups = groups.filter(group => {
    if (!normalized) return true;

    return `${group.name} ${group.topic} ${group.description}`
      .toLowerCase()
      .includes(normalized);
  });

  const featured =
    events.find(event => event.is_featured) || events[0];

  const latestAnnouncements = [
    ...announcements.filter(item => item.is_pinned),
    ...announcements.filter(item => !item.is_pinned),
  ].slice(0, 5);


  const festivalAnnouncements =
    announcements
      .filter(
        item =>
          item.announcement_type ===
          "Festival"
      )
      .filter(item => {
        const now = Date.now();

        const start =
          item.banner_start_at
            ? new Date(
                item.banner_start_at
              ).getTime()
            : null;

        const end =
          item.banner_end_at
            ? new Date(
                item.banner_end_at
              ).getTime()
            : null;

        if (
          start &&
          start > now
        ) {
          return false;
        }

        if (
          end &&
          end <= now
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );


  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date TBA";
    }

    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };


  const uploadCampusContentFile = async (
    file: File,
    folder:
      | "achievements"
      | "research"
      | "recruiters"
  ) => {
    const client = getSupabaseClient();

    if (!client) {
      throw new Error(
        "CampusConnect is not connected to Supabase."
      );
    }

    const {data: auth, error: authError} =
      await client.auth.getUser();

    if (authError || !auth.user) {
      throw new Error(
        "Your session has expired. Sign in again."
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      throw new Error(
        "File must be smaller than 8 MB."
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "Only JPG, PNG, WEBP and GIF images are supported."
      );
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const safeName =
      file.name
        .replace(/\.[^/.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50) || "campus-image";

    const filePath =
      `${auth.user.id}/${folder}/` +
      `${Date.now()}-${crypto.randomUUID()}-${safeName}.${extension}`;

    const {error: uploadError} =
      await client.storage
        .from("campus-content")
        .upload(
          filePath,
          file,
          {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          }
        );

    if (uploadError) {
      throw uploadError;
    }

    const {data} =
      client.storage
        .from("campus-content")
        .getPublicUrl(filePath);

    return data.publicUrl;
  };


  const createAchievement = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!canAddCampusContent) {
      return;
    }

    if (!achievementForm.title.trim()) {
      setCampusError(
        "Achievement title is required."
      );
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      setCampusError(
        "CampusConnect is not connected to Supabase."
      );
      return;
    }

    setCampusSaving(true);
    setCampusError("");

    try {
      const {data: auth, error: authError} =
        await client.auth.getUser();

      if (authError || !auth.user) {
        throw new Error(
          "Your session has expired. Sign in again."
        );
      }

      let achievementImageUrl =
        achievementForm.image_url.trim() || null;

      if (achievementImageFile) {
        achievementImageUrl =
          await uploadCampusContentFile(
            achievementImageFile,
            "achievements"
          );
      }

      const {data, error} =
        await client
          .from("campus_achievements")
          .insert({
            title:
              achievementForm.title.trim(),

            description:
              achievementForm.description.trim(),

            achievement_type:
              achievementForm.achievement_type,

            person_name:
              achievementForm.person_name.trim(),

            department:
              achievementForm.department.trim() ||
              "All",

            award_name:
              achievementForm.award_name.trim(),

            organization:
              achievementForm.organization.trim(),

            achievement_date:
              achievementForm.achievement_date ||
              null,

            image_url:
              achievementImageUrl,

            external_url:
              achievementForm.external_url.trim() ||
              null,

            is_featured:
              achievementForm.is_featured,

            created_by:
              auth.user.id,

            created_by_name:
              profile.name,
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      setAchievements(current => [
        data as CampusAchievement,
        ...current,
      ]);

      setAchievementForm({
        title: "",
        description: "",
        achievement_type: "Student",
        person_name: "",
        department:
          profile.department || "All",
        award_name: "",
        organization: "",
        achievement_date: "",
        image_url: "",
        external_url: "",
        is_featured: false,
      });

      setAchievementImageFile(null);
      setShowAchievementForm(false);
      setTab("Achievements");

    } catch (error) {
      setCampusError(
        error instanceof Error
          ? error.message
          : "Unable to create achievement."
      );
    } finally {
      setCampusSaving(false);
    }
  };


  const openAchievementEditor = (
    item: CampusAchievement
  ) => {
    if (!canAddCampusContent) {
      return;
    }

    setCampusError("");
    setAchievementImageFile(null);

    setAchievementForm({
      title: item.title || "",
      description: item.description || "",
      achievement_type:
        item.achievement_type || "Student",
      person_name:
        item.person_name || "",
      department:
        item.department || "All",
      award_name:
        item.award_name || "",
      organization:
        item.organization || "",
      achievement_date:
        item.achievement_date
          ? String(
              item.achievement_date
            ).slice(0, 10)
          : "",
      image_url:
        item.image_url || "",
      external_url:
        item.external_url || "",
      is_featured:
        Boolean(item.is_featured),
    });

    setEditingAchievement(item);
    setShowAchievementForm(true);
  };


  const saveAchievementEdit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !canAddCampusContent ||
      !editingAchievement
    ) {
      return;
    }

    if (!achievementForm.title.trim()) {
      return setCampusError(
        "Achievement title is required."
      );
    }

    const client =
      getSupabaseClient();

    if (!client) {
      return setCampusError(
        "CampusConnect is not connected to Supabase."
      );
    }

    setCampusSaving(true);
    setCampusError("");

    try {
      let imageUrl =
        achievementForm.image_url.trim() ||
        null;

      if (achievementImageFile) {
        imageUrl =
          await uploadCampusContentFile(
            achievementImageFile,
            "achievements"
          );
      }

      const {data, error} =
        await client
          .from("campus_achievements")
          .update({
            title:
              achievementForm.title.trim(),

            description:
              achievementForm.description.trim(),

            achievement_type:
              achievementForm.achievement_type,

            person_name:
              achievementForm.person_name.trim(),

            department:
              achievementForm.department.trim() ||
              "All",

            award_name:
              achievementForm.award_name.trim(),

            organization:
              achievementForm.organization.trim(),

            achievement_date:
              achievementForm.achievement_date ||
              null,

            image_url:
              imageUrl,

            external_url:
              achievementForm.external_url.trim() ||
              null,

            is_featured:
              achievementForm.is_featured,
          })
          .eq(
            "id",
            editingAchievement.id
          )
          .select()
          .single();

      if (error) {
        throw error;
      }

      setAchievements(current =>
        current.map(item =>
          item.id ===
          editingAchievement.id
            ? data as CampusAchievement
            : item
        )
      );

      setEditingAchievement(null);
      setAchievementImageFile(null);
      setShowAchievementForm(false);

    } catch (error) {
      setCampusError(
        error instanceof Error
          ? error.message
          : "Unable to update achievement."
      );
    } finally {
      setCampusSaving(false);
    }
  };


  const deleteAchievement = async (
    item: CampusAchievement
  ) => {
    if (!canAddCampusContent) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${item.title}" permanently?`
      );

    if (!confirmed) {
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) {
      return setCampusError(
        "CampusConnect is not connected to Supabase."
      );
    }

    setCampusSaving(true);
    setCampusError("");

    try {
      const {error} =
        await client
          .from("campus_achievements")
          .delete()
          .eq(
            "id",
            item.id
          );

      if (error) {
        throw error;
      }

      setAchievements(current =>
        current.filter(
          achievement =>
            achievement.id !==
            item.id
        )
      );

    } catch (error) {
      setCampusError(
        error instanceof Error
          ? error.message
          : "Unable to delete achievement."
      );
    } finally {
      setCampusSaving(false);
    }
  };


  const createResearch = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!canAddCampusContent) {
      return;
    }

    if (!researchForm.title.trim()) {
      setCampusError(
        "Research title is required."
      );
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      setCampusError(
        "CampusConnect is not connected to Supabase."
      );
      return;
    }

    setCampusSaving(true);
    setCampusError("");

    try {
      const {data: auth, error: authError} =
        await client.auth.getUser();

      if (authError || !auth.user) {
        throw new Error(
          "Your session has expired. Sign in again."
        );
      }

      let researchImageUrl =
        researchForm.image_url.trim() || null;

      if (researchImageFile) {
        researchImageUrl =
          await uploadCampusContentFile(
            researchImageFile,
            "research"
          );
      }

      const {data, error} =
        await client
          .from("campus_research")
          .insert({
            title:
              researchForm.title.trim(),

            description:
              researchForm.description.trim(),

            research_type:
              researchForm.research_type,

            department:
              researchForm.department.trim() ||
              "All",

            lead_name:
              researchForm.lead_name.trim(),

            collaborators:
              researchForm.collaborators.trim(),

            organization:
              researchForm.organization.trim(),

            year:
              researchForm.year.trim(),

            image_url:
              researchImageUrl,

            external_url:
              researchForm.external_url.trim() ||
              null,

            status:
              researchForm.status,

            is_featured:
              researchForm.is_featured,

            created_by:
              auth.user.id,

            created_by_name:
              profile.name,
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      setResearch(current => [
        data as CampusResearch,
        ...current,
      ]);

      setResearchForm({
        title: "",
        description: "",
        research_type: "Project",
        department:
          profile.department || "All",
        lead_name: "",
        collaborators: "",
        organization: "",
        year: "",
        image_url: "",
        external_url: "",
        status: "Active",
        is_featured: false,
      });

      setResearchImageFile(null);
      setShowResearchForm(false);
      setTab("Research");

    } catch (error) {
      setCampusError(
        error instanceof Error
          ? error.message
          : "Unable to create research."
      );
    } finally {
      setCampusSaving(false);
    }
  };


  useEffect(() => {
    let active = true;

    const client =
      getSupabaseClient();

    if (!client) {
      return;
    }

    const loadInstitutionalContent =
      async () => {

        const [
          achievementResult,
          researchResult,
        ] = await Promise.all([
          client
            .from("campus_achievements")
            .select("*")
            .order(
              "created_at",
              {ascending: false}
            )
            .limit(50),

          client
            .from("campus_research")
            .select("*")
            .order(
              "created_at",
              {ascending: false}
            )
            .limit(50),
        ]);

        if (!active) {
          return;
        }

        if (achievementResult.error) {
          console.error(
            "Campus achievements load error:",
            achievementResult.error
          );
        } else {
          setAchievements(
            (achievementResult.data || []) as CampusAchievement[]
          );
        }

        if (researchResult.error) {
          console.error(
            "Campus research load error:",
            researchResult.error
          );
        } else {
          setResearch(
            (researchResult.data || []) as CampusResearch[]
          );
        }
      };

    void loadInstitutionalContent();

    return () => {
      active = false;
    };
  }, []);


  return (
    <div className="campusHub">

      


      <section className="campusRecruiterShowcase">

        <div className="campusRecruiterGlow campusRecruiterGlowOne"></div>
        <div className="campusRecruiterGlow campusRecruiterGlowTwo"></div>

        <header className="campusRecruiterHeader">

          <div>
            <span>
              PLACEMENT NETWORK
            </span>

            <h2>
              Top recruiters
            </h2>

            <p>
              Companies that hire, mentor and build careers from our campus.
            </p>
          </div>


          <div className="campusRecruiterControls">

            {canManageRecruiters && (
              <button
                type="button"
                className="campusRecruiterAdd"
                onClick={() =>
                  setShowRecruiterForm(
                    true
                  )
                }
              >
                + Add company
              </button>
            )}


            <button
              type="button"
              aria-label="Previous recruiters"
              onClick={() =>
                moveRecruiters(
                  "previous"
                )
              }
            >
              ←
            </button>

            <button
              type="button"
              aria-label="Next recruiters"
              onClick={() =>
                moveRecruiters(
                  "next"
                )
              }
            >
              →
            </button>

          </div>

        </header>


        {recruiters.length ? (
          <div className="campusRecruiterViewport">

            <div
              className="campusRecruiterTrack"
            >

              {recruiters.map(
                (
                  recruiter,
                  index
                ) => (
                <article
                  className={
                    recruiter.website_url
                      ? "campusRecruiterCard clickable"
                      : "campusRecruiterCard"
                  }
                  key={`${recruiter.id}-${index}`}
                  role={
                    recruiter.website_url
                      ? "link"
                      : undefined
                  }
                  tabIndex={
                    recruiter.website_url
                      ? 0
                      : undefined
                  }
                  title={
                    recruiter.website_url
                      ? `Open ${recruiter.company_name}`
                      : recruiter.company_name
                  }
                  onClick={() => {
                    if (
                      !recruiter.website_url
                    ) {
                      return;
                    }

                    window.open(
                      recruiter.website_url,
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }}
                  onKeyDown={event => {
                    if (
                      !recruiter.website_url
                    ) {
                      return;
                    }

                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();

                      window.open(
                        recruiter.website_url,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }
                  }}
                >

                  <div className="campusRecruiterLogo">

                    {recruiter.logo_url ? (
                      <img
                        src={
                          recruiter.logo_url
                        }
                        alt={`${recruiter.company_name} logo`}
                      />
                    ) : (
                      <strong>
                        {recruiter.company_name
                          .split(" ")
                          .slice(0, 2)
                          .map(
                            word =>
                              word[0]
                          )
                          .join("")
                          .toUpperCase()}
                      </strong>
                    )}

                  </div>


                  <div className="campusRecruiterInfo">

                    <span>
                      {recruiter.industry ||
                        "Campus recruiter"}
                    </span>

                    <h3>
                      {recruiter.company_name}
                    </h3>

                    {recruiter.hiring_roles && (
                      <p>
                        {recruiter.hiring_roles}
                      </p>
                    )}


                    <div className="campusRecruiterStats">

                      {recruiter.highest_package && (
                        <div>
                          <b>
                            {recruiter.highest_package}
                          </b>

                          <small>
                            Highest package
                          </small>
                        </div>
                      )}


                      <div>
                        <b>
                          {recruiter.students_selected}
                        </b>

                        <small>
                          Students selected
                        </small>
                      </div>

                    </div>


                    {(() => {
                      const companyStudents =
                        recruiterStudents.filter(
                          student =>
                            student.recruiter_id ===
                            recruiter.id
                        );

                      const expanded =
                        expandedRecruiterIds.includes(
                          recruiter.id
                        );

                      if (
                        !companyStudents.length
                      ) {
                        return null;
                      }

                      return (
                        <div
                          className="campusRecruiterPlacedStudents"
                          onClick={
                            event =>
                              event.stopPropagation()
                          }
                        >

                          <button
                            type="button"
                            className={
                              expanded
                                ? "campusRecruiterStudentToggle active"
                                : "campusRecruiterStudentToggle"
                            }
                            onClick={
                              event => {
                                event.stopPropagation();

                                toggleRecruiterStudents(
                                  recruiter.id
                                );
                              }
                            }
                          >

                            <span>
                              {expanded
                                ? "Hide placed students"
                                : "Show placed students"}
                            </span>

                            <b>
                              {companyStudents.length}
                            </b>

                            <i>
                              {expanded
                                ? "↑"
                                : "↓"}
                            </i>

                          </button>


                          {expanded && (
                            <div className="campusRecruiterStudentList">

                              {companyStudents.map(
                                student => (
                                <article
                                  className="campusRecruiterStudent"
                                  key={
                                    student.id
                                  }
                                >

                                  <div className="campusRecruiterStudentAvatar">

                                    {student.student_photo_url ? (
                                      <img
                                        src={
                                          student.student_photo_url
                                        }
                                        alt={
                                          student.student_name
                                        }
                                      />
                                    ) : (
                                      <span>
                                        {student.student_name
                                          .charAt(0)
                                          .toUpperCase()}
                                      </span>
                                    )}

                                  </div>


                                  <div className="campusRecruiterStudentIdentity">

                                    <strong>
                                      {student.student_name}
                                    </strong>

                                    <small>
                                      {[
                                        student.job_role,
                                        student.department,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </small>

                                  </div>


                                  {student.package_lpa && (
                                    <div className="campusRecruiterStudentPackage">

                                      <b>
                                        {student.package_lpa}
                                      </b>

                                      <small>
                                        Package
                                      </small>

                                    </div>
                                  )}

                                </article>
                              ))}

                            </div>
                          )}

                        </div>
                      );
                    })()}


                    <div className="campusRecruiterFooter">

                      {recruiter.website_url ? (
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation();

                            window.open(
                              recruiter.website_url!,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }}
                        >
                          Visit company ↗
                        </button>
                      ) : (
                        <span>
                          {recruiter.placement_year ||
                            "Campus hiring"}
                        </span>
                      )}


                      {canManageRecruiters && (
                        <button
                          type="button"
                          className="campusRecruiterDelete"
                          onClick={event => {
                            event.stopPropagation();

                            void deleteRecruiter(
                              recruiter
                            );
                          }}
                        >
                          Delete
                        </button>
                      )}

                    </div>

                  </div>

                </article>
              ))}

            </div>

          </div>
        ) : (
          <div className="campusRecruiterEmpty">

            <div>
              <span>CC</span>
            </div>

            <h3>
              Build your recruiter wall
            </h3>

            <p>
              Add companies that recruit from your campus and highlight real placement outcomes.
            </p>

            {canManageRecruiters && (
              <button
                type="button"
                onClick={() =>
                  setShowRecruiterForm(
                    true
                  )
                }
              >
                Add first recruiter
              </button>
            )}

          </div>
        )}


        {recruiters.length > 1 && (
          <div className="campusRecruiterDots">

            {recruiters
              .slice(
                0,
                Math.min(
                  recruiters.length,
                  8
                )
              )
              .map(
                (
                  recruiter,
                  index
                ) => (
                <button
                  type="button"
                  key={recruiter.id}
                  className={
                    recruiterIndex %
                      recruiters.length ===
                    index
                      ? "active"
                      : ""
                  }
                  aria-label={`Show ${recruiter.company_name}`}
                  onClick={() =>
                    setRecruiterIndex(
                      index
                    )
                  }
                />
              ))}

          </div>
        )}

      </section>


      {showRecruiterForm &&
        canManageRecruiters && (
        <div
          className="campusRecruiterModalScrim"
          onClick={() =>
            setShowRecruiterForm(
              false
            )
          }
        >

          <form
            className="campusRecruiterModal"
            onSubmit={
              createRecruiter
            }
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <header>

              <div>
                <span>
                  PLACEMENT NETWORK
                </span>

                <h2>
                  Add recruiter
                </h2>

                <p>
                  Add a company that recruits from your college.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowRecruiterForm(
                    false
                  )
                }
              >
                ×
              </button>

            </header>


            <div className="campusRecruiterFormGrid">

              <label>
                <span>
                  COMPANY NAME
                </span>

                <input
                  required
                  value={
                    recruiterForm.company_name
                  }
                  onChange={
                    event =>
                      setRecruiterForm(
                        current => ({
                          ...current,
                          company_name:
                            event.target.value,
                        })
                      )
                  }
                  placeholder="Microsoft"
                />
              </label>


              <label>
                <span>
                  INDUSTRY
                </span>

                <input
                  value={
                    recruiterForm.industry
                  }
                  onChange={
                    event =>
                      setRecruiterForm(
                        current => ({
                          ...current,
                          industry:
                            event.target.value,
                        })
                      )
                  }
                  placeholder="Technology"
                />
              </label>


              <label>
                <span>
                  COMPANY LOGO
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={event =>
                    setRecruiterLogoFile(
                      event.target.files?.[0] ||
                        null
                    )
                  }
                />

                {recruiterLogoFile && (
                  <small className="campusRecruiterSelectedFile">
                    Selected: {recruiterLogoFile.name}
                  </small>
                )}
              </label>


              <label>
                <span>
                  WEBSITE
                </span>

                <input
                  value={
                    recruiterForm.website_url
                  }
                  onChange={
                    event =>
                      setRecruiterForm(
                        current => ({
                          ...current,
                          website_url:
                            event.target.value,
                        })
                      )
                  }
                  placeholder="https://company.com"
                />
              </label>


              <label>
                <span>
                  HIGHEST PACKAGE
                </span>

                <input
                  value={
                    recruiterForm.highest_package
                  }
                  onChange={
                    event =>
                      setRecruiterForm(
                        current => ({
                          ...current,
                          highest_package:
                            event.target.value,
                        })
                      )
                  }
                  placeholder="₹24 LPA"
                />
              </label>


              <label>
                <span>
                  AVERAGE PACKAGE
                </span>

                <input
                  value={
                    recruiterForm.average_package
                  }
                  onChange={
                    event =>
                      setRecruiterForm(
                        current => ({
                          ...current,
                          average_package:
                            event.target.value,
                        })
                      )
                  }
                  placeholder="₹10 LPA"
                />
              </label>


              <label>
                <span>
                  STUDENTS SELECTED
                </span>

                <input
                  type="number"
                  min="0"
                  value={
                    recruiterForm.students_selected
                  }
                  onChange={
                    event =>
                      setRecruiterForm(
                        current => ({
                          ...current,
                          students_selected:
                            event.target.value,
                        })
                      )
                  }
                />
              </label>


              <label>
                <span>
                  PLACEMENT YEAR
                </span>

                <input
                  value={
                    recruiterForm.placement_year
                  }
                  onChange={
                    event =>
                      setRecruiterForm(
                        current => ({
                          ...current,
                          placement_year:
                            event.target.value,
                        })
                      )
                  }
                  placeholder="2026"
                />
              </label>

            </div>


            <label className="campusRecruiterRoles">
              <span>
                HIRING ROLES
              </span>

              <input
                value={
                  recruiterForm.hiring_roles
                }
                onChange={
                  event =>
                    setRecruiterForm(
                      current => ({
                        ...current,
                        hiring_roles:
                          event.target.value,
                      })
                    )
                }
                placeholder="Software Engineer, Embedded Engineer, Data Analyst..."
              />
            </label>


            <section className="campusRecruiterStudentEditor">

              <header>

                <div>
                  <span>
                    PLACED STUDENTS
                  </span>

                  <h3>
                    Student placement details
                  </h3>

                  <p>
                    Add real placed students. Their details stay hidden on the public card until Show placed students is clicked.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    addRecruiterStudentDraft
                  }
                >
                  + Add student
                </button>

              </header>


              {recruiterStudentDrafts.map(
                (
                  student,
                  index
                ) => (
                <div
                  className="campusRecruiterStudentDraft"
                  key={
                    student.id
                  }
                >

                  <div className="campusRecruiterStudentDraftHead">

                    <strong>
                      Student {index + 1}
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        removeRecruiterStudentDraft(
                          student.id
                        )
                      }
                    >
                      Remove
                    </button>

                  </div>


                  <div className="campusRecruiterFormGrid">

                    <label>
                      <span>
                        STUDENT NAME
                      </span>

                      <input
                        value={
                          student.student_name
                        }
                        onChange={
                          event =>
                            updateRecruiterStudentDraft(
                              student.id,
                              {
                                student_name:
                                  event.target.value,
                              }
                            )
                        }
                        placeholder="Student name"
                      />
                    </label>


                    <label>
                      <span>
                        PACKAGE / LPA
                      </span>

                      <input
                        value={
                          student.package_lpa
                        }
                        onChange={
                          event =>
                            updateRecruiterStudentDraft(
                              student.id,
                              {
                                package_lpa:
                                  event.target.value,
                              }
                            )
                        }
                        placeholder="₹18 LPA"
                      />
                    </label>


                    <label>
                      <span>
                        JOB ROLE
                      </span>

                      <input
                        value={
                          student.job_role
                        }
                        onChange={
                          event =>
                            updateRecruiterStudentDraft(
                              student.id,
                              {
                                job_role:
                                  event.target.value,
                              }
                            )
                        }
                        placeholder="Software Engineer"
                      />
                    </label>


                    <label>
                      <span>
                        DEPARTMENT
                      </span>

                      <input
                        value={
                          student.department
                        }
                        onChange={
                          event =>
                            updateRecruiterStudentDraft(
                              student.id,
                              {
                                department:
                                  event.target.value,
                              }
                            )
                        }
                        placeholder="ECE"
                      />
                    </label>


                    <label className="campusRecruiterStudentPhotoInput">
                      <span>
                        STUDENT PHOTO
                      </span>

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={
                          event =>
                            updateRecruiterStudentDraft(
                              student.id,
                              {
                                photo_file:
                                  event.target.files?.[0] ||
                                  null,
                              }
                            )
                        }
                      />

                      {student.photo_file && (
                        <small>
                          {student.photo_file.name}
                        </small>
                      )}
                    </label>

                  </div>

                </div>
              ))}


              {!recruiterStudentDrafts.length && (
                <button
                  type="button"
                  className="campusRecruiterAddFirstStudent"
                  onClick={
                    addRecruiterStudentDraft
                  }
                >
                  + Add placed student
                </button>
              )}

            </section>


            <label className="campusRecruiterFeatured">

              <input
                type="checkbox"
                checked={
                  recruiterForm.is_featured
                }
                onChange={
                  event =>
                    setRecruiterForm(
                      current => ({
                        ...current,
                        is_featured:
                          event.target.checked,
                      })
                    )
                }
              />

              <span>
                Feature this company
              </span>

            </label>


            <footer>

              <button
                type="button"
                className="ghost"
                onClick={() =>
                  setShowRecruiterForm(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary"
                disabled={
                  recruiterSaving
                }
              >
                {recruiterSaving
                  ? "Adding..."
                  : "Add company"}
              </button>

            </footer>

          </form>

        </div>
      )}


      <section className="campusHubHero">
        <div>
          <span className="campusHubEyebrow">
            RNSIT CAMPUS · LIVE HUB
          </span>

          <h1>
            Discover everything happening around your campus.
          </h1>

          <p>
            Official notices, events, student communities and
            campus activity in one connected place.
          </p>

          <div className="campusHubIdentity">
            <span>{profile.role}</span>
            <span>{profile.department || "Department"}</span>
            <span>{profile.year || "Academic year"}</span>
          </div>

          <div className="campusHubActions">
            <button
              className="primary"
              type="button"
              onClick={() => go("Announcements")}
            >
              Explore updates
            </button>

            <button
              className="ghost"
              type="button"
              onClick={() => go("Groups")}
            >
              Open communities
            </button>
          </div>
        </div>

        <div className="campusHubStats">
          <article>
            <small>UPCOMING EVENTS</small>
            <strong>{loading ? "—" : events.length}</strong>
          </article>

          <article>
            <small>ANNOUNCEMENTS</small>
            <strong>{loading ? "—" : announcements.length}</strong>
          </article>

          <article>
            <small>COMMUNITIES</small>
            <strong>{loading ? "—" : groups.length}</strong>
          </article>
        </div>
      </section>

      {campusError && (
        <p className="authError" role="alert">
          {campusError}
        </p>
      )}

      <section className="campusHubToolbar">

        <div className="campusHubTabs">
          {([
            "Overview",
            "Achievements",
            "Research",
            "Events",
            "Communities",
              "Festivals",
          ] as const).map(item => (
            <button
              type="button"
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="campusHubToolbarActions">

          <input
            value={search}
            onChange={event =>
              setSearch(event.target.value)
            }
            placeholder="Search campus..."
          />

          {canAddCampusContent && (
            <button
              type="button"
              className="campusAddContentButton"
              onClick={() =>
                setShowAddContent(true)
              }
            >
              + Add Content
            </button>
          )}

        </div>

      </section>

      {tab === "Overview" && (
        <>
          {featured && (
            <section className="campusFeaturedEvent card">
              <div className="campusFeaturedVisual">
                {featured.banner_url ? (
                  <img
                    src={featured.banner_url}
                    alt={featured.title}
                  />
                ) : (
                  <div className="campusFeaturedFallback">
                    <small>{featured.category}</small>
                    <strong>
                      {featured.title.charAt(0).toUpperCase()}
                    </strong>
                  </div>
                )}
              </div>

              <div className="campusFeaturedContent">
                <span>FEATURED EVENT</span>

                <h2>{featured.title}</h2>

                <p>
                  {featured.short_description ||
                    featured.description ||
                    "Official CampusConnect event."}
                </p>

                <div className="campusFeaturedMeta">
                  <span>{formatDate(featured.event_date)}</span>
                  <span>{featured.venue || "Venue TBA"}</span>
                  <span>
                    {featured.organizer || "Campus team"}
                  </span>
                </div>

                <div className="campusFeaturedActions">
                  {featured.registration_url && (
                    <a
                      href={featured.registration_url}
                      target="_blank"
                      rel="noreferrer"
                      className="primary"
                    >
                      Register
                    </a>
                  )}

                  <button
                    type="button"
                    className="ghost"
                    onClick={() => go("Announcements")}
                  >
                    View details
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="campusOverviewGrid">
            <div className="card campusUpdates">
              <header>
                <div>
                  <span>CAMPUS BULLETIN</span>
                  <h2>Latest verified updates</h2>
                </div>

                <button
                  type="button"
                  onClick={() => go("Announcements")}
                >
                  View all →
                </button>
              </header>

              {latestAnnouncements.length ? (
                latestAnnouncements.map(item => (
                  <button
                    className="campusUpdateRow"
                    type="button"
                    key={item.id}
                    onClick={() => go("Announcements")}
                  >
                    <i>
                      {item.category?.charAt(0).toUpperCase() ||
                        "C"}
                    </i>

                    <span>
                      <b>{item.title}</b>
                      <small>
                        {item.category} · {item.author_name}
                      </small>
                    </span>

                    {item.is_pinned && <em>PINNED</em>}
                  </button>
                ))
              ) : (
                <p className="campusEmpty">
                  No announcements yet.
                </p>
              )}
            </div>

            <aside className="card campusQuickLinks">
              <span>QUICK ACCESS</span>
              <h2>Campus essentials</h2>

              <button
                type="button"
                onClick={() => go("Announcements")}
              >
                <span>Notices & events</span>
                <b>→</b>
              </button>

              <button
                type="button"
                onClick={() => go("Groups")}
              >
                <span>Communities</span>
                <b>→</b>
              </button>

              <button
                type="button"
                onClick={() => go("Learning")}
              >
                <span>Learning resources</span>
                <b>→</b>
              </button>

              <button
                type="button"
                onClick={() => go("Profile")}
              >
                <span>Campus identity</span>
                <b>→</b>
              </button>
            </aside>
          </section>

          <section className="card campusCommunitySection">
            <header>
              <div>
                <span>FIND YOUR PEOPLE</span>
                <h2>Active campus communities</h2>
              </div>

              <button
                type="button"
                onClick={() => go("Groups")}
              >
                Browse all →
              </button>
            </header>

            <div className="campusCommunityGrid">
              {groups.slice(0, 4).map(group => (
                <article
                  className="campusCommunityCard"
                  key={group.id}
                >
                  <i>
                    {group.name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map(word => word.charAt(0))
                      .join("")
                      .toUpperCase()}
                  </i>

                  <span>{group.topic || "Community"}</span>

                  <h3>{group.name}</h3>

                  <p>
                    {group.description ||
                      "CampusConnect community"}
                  </p>

                  <footer>
                    <small>
                      {group.member_count || 0} members
                    </small>

                    <button
                      type="button"
                      onClick={() => go("Groups")}
                    >
                      Open →
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      
          {tab === "Festivals" && (

            <section className="campusFestivalSection">

              <header className="campusFestivalHeading">

                <div>
                  <span>
                    CAMPUS CELEBRATIONS
                  </span>

                  <h2>
                    Festivals &
                    special occasions
                  </h2>

                  <p>
                    Official festival wishes,
                    cultural celebrations and
                    special campus greetings.
                  </p>
                </div>

                <strong>
                  {
                    festivalAnnouncements
                      .length
                  }
                  {" "}
                  active
                </strong>

              </header>


              {festivalAnnouncements.length ? (

                <div className="campusFestivalGrid">

                  {festivalAnnouncements.map(
                    item => (

                      <article
                        className={
                          item.banner_url
                            ? "campusFestivalCard hasBanner"
                            : "campusFestivalCard"
                        }
                        key={item.id}
                      >

                        {item.banner_url && (

                          <button
                            type="button"
                            className="campusFestivalImage"
                            onClick={() =>
                              window.open(
                                item.banner_url ||
                                  "",
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >

                            <img
                              src={
                                item.banner_url
                              }
                              alt={
                                item.title
                              }
                            />

                          </button>

                        )}


                        <div className="campusFestivalContent">

                          <div className="campusFestivalMeta">

                            <span>
                              FESTIVAL
                            </span>

                            <time>
                              {new Intl
                                .DateTimeFormat(
                                  "en-IN",
                                  {
                                    day:
                                      "numeric",
                                    month:
                                      "short",
                                    year:
                                      "numeric",
                                  }
                                )
                                .format(
                                  new Date(
                                    item.created_at
                                  )
                                )}
                            </time>

                          </div>


                          <h3>
                            {item.title}
                          </h3>


                          <p>
                            {item.body}
                          </p>


                          <footer>

                            <div>
                              <small>
                                Published by
                              </small>

                              <strong>
                                {
                                  item.author_name
                                }
                              </strong>
                            </div>


                            {item.banner_cta_url && (

                              <a
                                href={
                                  item.banner_cta_url
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                {
                                  item.banner_cta_label ||
                                  "Open"
                                }
                                {" "}
                                ↗
                              </a>

                            )}

                          </footer>

                        </div>

                      </article>

                    )
                  )}

                </div>

              ) : (

                <div className="campusFestivalEmpty">

                  <div>
                    ✦
                  </div>

                  <h3>
                    No festival wishes
                    published yet
                  </h3>

                  <p>
                    Festival greetings
                    published by authorized
                    campus staff will appear
                    here.
                  </p>

                  {canAddCampusContent && (

                    <button
                      type="button"
                      onClick={() =>
                        go(
                          "Announcements"
                        )
                      }
                    >
                      Create festival wish →
                    </button>

                  )}

                </div>

              )}

            </section>

          )}


{tab === "Events" && (
        <section className="card campusEventDirectory">
          <header>
            <div>
              <span>CAMPUS CALENDAR</span>
              <h2>Upcoming events</h2>
            </div>

            <b>{visibleEvents.length}</b>
          </header>

          <div className="campusEventList">
            {visibleEvents.map(event => (
              <article
                className="campusEventRow"
                key={event.id}
              >
                <div className="campusEventDate">
                  <strong>
                    {new Date(
                      event.event_date
                    ).toLocaleDateString("en-IN", {
                      day: "2-digit",
                    })}
                  </strong>

                  <span>
                    {new Date(
                      event.event_date
                    ).toLocaleDateString("en-IN", {
                      month: "short",
                    })}
                  </span>
                </div>

                <section>
                  <small>{event.category}</small>
                  <h3>{event.title}</h3>

                  <p>
                    {event.short_description ||
                      event.description}
                  </p>

                  <span>
                    {event.venue || "Venue TBA"} ·{" "}
                    {formatDate(event.event_date)}
                  </span>
                </section>

                <button
                  type="button"
                  onClick={() => go("Announcements")}
                >
                  View
                </button>
              </article>
            ))}

            {!visibleEvents.length && !loading && (
              <p className="campusEmpty">
                No matching events found.
              </p>
            )}
          </div>
        </section>
      )}

      {tab === "Communities" && (
        <section className="card campusCommunitySection">
          <header>
            <div>
              <span>CAMPUS COMMUNITIES</span>
              <h2>Discover your network</h2>
            </div>

            <button
              type="button"
              onClick={() => go("Groups")}
            >
              Open Messenger →
            </button>
          </header>

          <div className="campusCommunityGrid directory">
            {visibleGroups.map(group => (
              <article
                className="campusCommunityCard"
                key={group.id}
              >
                <i>
                  {group.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(word => word.charAt(0))
                    .join("")
                    .toUpperCase()}
                </i>

                <span>
                  {group.audience} · {group.topic}
                </span>

                <h3>{group.name}</h3>

                <p>
                  {group.description ||
                    "Campus community"}
                </p>

                <footer>
                  <small>
                    {group.member_count || 0} members
                  </small>

                  <button
                    type="button"
                    onClick={() => go("Groups")}
                  >
                    Open →
                  </button>
                </footer>
              </article>
            ))}
          </div>
        </section>
      )}

  

      {/* ===================================================
          PUBLISHED ACHIEVEMENTS
      =================================================== */}

      {tab === "Achievements" && (
        <section className="campusPublishedAchievements">

          <header className="campusContentSectionHeader">
            <div>
              <span>
                CAMPUS RECOGNITION
              </span>

              <h2>
                Achievements
              </h2>

              <p>
                Verified student, faculty and institutional
                achievements published by the campus.
              </p>
            </div>

            {canAddCampusContent && (
              <button
                type="button"
                className="campusSectionAddButton"
                onClick={() => {
                  setCampusError("");
                  setShowAchievementForm(true);
                }}
              >
                + Add achievement
              </button>
            )}
          </header>


          {achievements.length > 0 ? (
            <div className="campusAchievementGrid">

              {achievements
                .filter(item => {
                  if (!normalized) {
                    return true;
                  }

                  return [
                    item.title,
                    item.description,
                    item.achievement_type,
                    item.person_name,
                    item.department,
                    item.award_name,
                    item.organization,
                  ]
                    .join(" ")
                    .toLowerCase()
                    .includes(normalized);
                })
                .map(item => (

                  <article
                    key={item.id}
                    className={
                      item.is_featured
                        ? "campusAchievementCard featured"
                        : "campusAchievementCard"
                    }
                  >

                    <div className="campusAchievementMedia">

                      {item.image_url ? (
                        <button
                          type="button"
                          className="campusAchievementImageButton"
                          onClick={() =>
                            setAchievementPreviewUrl(
                              item.image_url
                            )
                          }
                          aria-label={`Open ${item.title} image`}
                        >
                          <img
                            src={item.image_url}
                            alt={item.title}
                            loading="lazy"
                          />
                        </button>
                      ) : (
                        <div className="campusAchievementPlaceholder">
                          <span>
                            {item.achievement_type
                              ?.charAt(0)
                              .toUpperCase() || "A"}
                          </span>
                        </div>
                      )}

                      {item.is_featured && (
                        <small className="campusFeaturedBadge">
                          FEATURED
                        </small>
                      )}

                    </div>


                    <div className="campusAchievementBody">

                      <div className="campusAchievementMeta">
                        <span>
                          {item.achievement_type ||
                            "Achievement"}
                        </span>

                        {item.achievement_date && (
                          <small>
                            {new Intl.DateTimeFormat(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            ).format(
                              new Date(
                                item.achievement_date
                              )
                            )}
                          </small>
                        )}
                      </div>


                      <h3>
                        {item.title}
                      </h3>


                      {item.description && (
                        <p>
                          {item.description}
                        </p>
                      )}


                      <div className="campusAchievementDetails">

                        {item.person_name && (
                          <div>
                            <small>
                              PERSON / TEAM
                            </small>

                            <b>
                              {item.person_name}
                            </b>
                          </div>
                        )}

                        {item.award_name && (
                          <div>
                            <small>
                              RECOGNITION
                            </small>

                            <b>
                              {item.award_name}
                            </b>
                          </div>
                        )}

                        {item.department && (
                          <div>
                            <small>
                              DEPARTMENT
                            </small>

                            <b>
                              {item.department}
                            </b>
                          </div>
                        )}

                        {item.organization && (
                          <div>
                            <small>
                              ORGANIZATION
                            </small>

                            <b>
                              {item.organization}
                            </b>
                          </div>
                        )}

                      </div>


                      <div className="campusAchievementFooter">

                        {item.external_url && (
                          <a
                            href={item.external_url}
                            target="_blank"
                            rel="noreferrer"
                            className="campusContentExternalLink"
                          >
                            View details →
                          </a>
                        )}

                        {canAddCampusContent && (
                          <div className="campusAchievementActions">

                            <button
                              type="button"
                              onClick={() =>
                                openAchievementEditor(
                                  item
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="danger"
                              disabled={campusSaving}
                              onClick={() =>
                                void deleteAchievement(
                                  item
                                )
                              }
                            >
                              Delete
                            </button>

                          </div>
                        )}

                      </div>

                    </div>

                  </article>

                ))}

            </div>
          ) : (
            <div className="campusContentEmpty">

              <span>◇</span>

              <h3>
                No achievements published yet
              </h3>

              <p>
                Verified campus achievements will appear here
                after faculty or administrators publish them.
              </p>

              {canAddCampusContent && (
                <button
                  type="button"
                  onClick={() =>
                    setShowAchievementForm(true)
                  }
                >
                  Publish first achievement
                </button>
              )}

            </div>
          )}

        </section>
      )}


      {/* ===================================================
          PUBLISHED RESEARCH
      =================================================== */}

      {tab === "Research" && (
        <section className="campusPublishedResearch">

          <header className="campusContentSectionHeader">

            <div>
              <span>
                RESEARCH & INNOVATION
              </span>

              <h2>
                Research showcase
              </h2>

              <p>
                Patents, publications, projects, laboratories
                and startup initiatives from across campus.
              </p>
            </div>

            {canAddCampusContent && (
              <button
                type="button"
                className="campusSectionAddButton"
                onClick={() => {
                  setCampusError("");
                  setShowResearchForm(true);
                }}
              >
                + Add research
              </button>
            )}

          </header>


          {research.length > 0 ? (
            <div className="campusResearchGrid">

              {research
                .filter(item => {
                  if (!normalized) {
                    return true;
                  }

                  return [
                    item.title,
                    item.description,
                    item.research_type,
                    item.department,
                    item.lead_name,
                    item.collaborators,
                    item.organization,
                    item.status,
                  ]
                    .join(" ")
                    .toLowerCase()
                    .includes(normalized);
                })
                .map(item => (

                  <article
                    key={item.id}
                    className={
                      item.is_featured
                        ? "campusResearchPublishedCard featured"
                        : "campusResearchPublishedCard"
                    }
                  >

                    <div className="campusResearchPublishedMedia">

                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          loading="lazy"
                        />
                      ) : (
                        <div className="campusResearchPlaceholder">
                          <span>R</span>
                        </div>
                      )}

                      {item.is_featured && (
                        <small className="campusFeaturedBadge">
                          FEATURED
                        </small>
                      )}

                    </div>


                    <div className="campusResearchPublishedBody">

                      <div className="campusAchievementMeta">

                        <span>
                          {item.research_type ||
                            "Research"}
                        </span>

                        <small>
                          {item.status ||
                            "Active"}
                        </small>

                      </div>


                      <h3>
                        {item.title}
                      </h3>


                      {item.description && (
                        <p>
                          {item.description}
                        </p>
                      )}


                      <div className="campusResearchDetails">

                        {item.lead_name && (
                          <div>
                            <small>
                              LEAD
                            </small>

                            <b>
                              {item.lead_name}
                            </b>
                          </div>
                        )}

                        {item.department && (
                          <div>
                            <small>
                              DEPARTMENT
                            </small>

                            <b>
                              {item.department}
                            </b>
                          </div>
                        )}

                        {item.organization && (
                          <div>
                            <small>
                              ORGANIZATION
                            </small>

                            <b>
                              {item.organization}
                            </b>
                          </div>
                        )}

                        {item.year && (
                          <div>
                            <small>
                              YEAR
                            </small>

                            <b>
                              {item.year}
                            </b>
                          </div>
                        )}

                      </div>


                      {item.external_url && (
                        <a
                          href={item.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="campusContentExternalLink"
                        >
                          Explore research →
                        </a>
                      )}

                    </div>

                  </article>

                ))}

            </div>
          ) : (
            <div className="campusContentEmpty">

              <span>◇</span>

              <h3>
                No research published yet
              </h3>

              <p>
                Verified projects, publications, patents and
                innovations will appear here.
              </p>

              {canAddCampusContent && (
                <button
                  type="button"
                  onClick={() =>
                    setShowResearchForm(true)
                  }
                >
                  Publish first research
                </button>
              )}

            </div>
          )}

        </section>
      )}


      {achievementPreviewUrl && (
        <div
          className="campusImageLightbox"
          onClick={() =>
            setAchievementPreviewUrl(null)
          }
        >
          <button
            type="button"
            className="campusImageLightboxClose"
            onClick={() =>
              setAchievementPreviewUrl(null)
            }
            aria-label="Close image"
          >
            ×
          </button>

          <img
            src={achievementPreviewUrl}
            alt="Achievement preview"
            onClick={event =>
              event.stopPropagation()
            }
          />
        </div>
      )}


      {showAddContent && canAddCampusContent && (
        <div
          className="campusContentModalScrim"
          onClick={() =>
            setShowAddContent(false)
          }
        >
          <section
            className="campusContentModal"
            onClick={event =>
              event.stopPropagation()
            }
          >
            <header>
              <div>
                <span>
                  CAMPUS PUBLISHING
                </span>

                <h2>
                  Add campus content
                </h2>

                <p>
                  Publish verified institutional content
                  to CampusConnect.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={() =>
                  setShowAddContent(false)
                }
              >
                ×
              </button>
            </header>

            <div className="campusContentOptions">

              <button
                type="button"
                onClick={() => {
                  setShowAddContent(false);
                  setTab("Achievements");
                  setShowAchievementForm(true);
                }}
              >
                <i>A</i>

                <span>
                  <b>Add achievement</b>
                  <small>
                    Student, faculty, sports,
                    competition or institute recognition
                  </small>
                </span>

                <strong>→</strong>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddContent(false);

                  window.dispatchEvent(
                    new CustomEvent(
                      "campus-navigate",
                      {
                        detail:
                          "Announcements",
                      }
                    )
                  );
                }}
              >
                <i>N</i>

                <span>
                  <b>Publish update</b>
                  <small>
                    Official academic and campus notices
                  </small>
                </span>

                <strong>→</strong>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddContent(false);

                  window.dispatchEvent(
                    new CustomEvent(
                      "campus-navigate",
                      {
                        detail:
                          "Announcements",
                      }
                    )
                  );
                }}
              >
                <i>E</i>

                <span>
                  <b>Create event</b>
                  <small>
                    Workshops, seminars, festivals
                    and campus events
                  </small>
                </span>

                <strong>→</strong>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddContent(false);
                  setTab("Research");
                  setShowResearchForm(true);
                }}
              >
                <i>R</i>

                <span>
                  <b>Add research</b>
                  <small>
                    Patents, publications, projects,
                    startups and laboratories
                  </small>
                </span>

                <strong>→</strong>
              </button>

            </div>

            <footer>
              Publishing access is restricted to
              verified faculty and administrators.
            </footer>

          </section>
        </div>
      )}


      {showAchievementForm &&
        canAddCampusContent && (
        <div
          className="campusContentModalScrim"
          onClick={() =>
            setShowAchievementForm(false)
          }
        >
          <section
            className="campusCreateFormModal"
            onClick={event =>
              event.stopPropagation()
            }
          >
            <header>
              <div>
                <span>
                  CAMPUS ACHIEVEMENT
                </span>

                <h2>
                  {editingAchievement
                    ? "Edit achievement"
                    : "Add achievement"}
                </h2>

                <p>
                  Publish a verified student,
                  faculty or institutional achievement.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAchievementForm(false);
                  setEditingAchievement(null);
                  setAchievementImageFile(null);
                  setCampusError("");
                }}
              >
                ×
              </button>
            </header>

            <form
              className="campusCreateForm"
              onSubmit={
                editingAchievement
                  ? saveAchievementEdit
                  : createAchievement
              }
            >
              <label>
                <span>Title</span>
                <input
                  required
                  value={
                    achievementForm.title
                  }
                  onChange={event =>
                    setAchievementForm(
                      current => ({
                        ...current,
                        title:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="National hackathon winner"
                />
              </label>

              <label className="full">
                <span>Description</span>
                <textarea
                  value={
                    achievementForm.description
                  }
                  onChange={event =>
                    setAchievementForm(
                      current => ({
                        ...current,
                        description:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Describe the achievement..."
                />
              </label>

              <label>
                <span>Type</span>
                <select
                  value={
                    achievementForm.achievement_type
                  }
                  onChange={event =>
                    setAchievementForm(
                      current => ({
                        ...current,
                        achievement_type:
                          event.target.value,
                      })
                    )
                  }
                >
                  {[
                    "Student",
                    "Faculty",
                    "Research",
                    "Placement",
                    "Sports",
                    "Cultural",
                    "Hackathon",
                    "Competition",
                    "Patent",
                    "Publication",
                    "Startup",
                    "Institute",
                  ].map(value => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Person / Team</span>
                <input
                  value={
                    achievementForm.person_name
                  }
                  onChange={event =>
                    setAchievementForm(
                      current => ({
                        ...current,
                        person_name:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Student or team name"
                />
              </label>

              <label>
                <span>Department</span>
                <input
                  value={
                    achievementForm.department
                  }
                  onChange={event =>
                    setAchievementForm(
                      current => ({
                        ...current,
                        department:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>

              <label>
                <span>Award</span>
                <input
                  value={
                    achievementForm.award_name
                  }
                  onChange={event =>
                    setAchievementForm(
                      current => ({
                        ...current,
                        award_name:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="1st Prize"
                />
              </label>

              <label>
                <span>Organization</span>
                <input
                  value={
                    achievementForm.organization
                  }
                  onChange={event =>
                    setAchievementForm(
                      current => ({
                        ...current,
                        organization:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="IEEE / Institution / Company"
                />
              </label>

              <label>
                <span>Date</span>
                <input
                  type="date"
                  value={
                    achievementForm.achievement_date
                  }
                  onChange={event =>
                    setAchievementForm(
                      current => ({
                        ...current,
                        achievement_date:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>

              <label className="full campusFileField">
                <span>Achievement image</span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={event =>
                    setAchievementImageFile(
                      event.target.files?.[0] || null
                    )
                  }
                />

                {achievementImageFile && (
                  <small>
                    Selected: {achievementImageFile.name}
                  </small>
                )}
              </label>

              <label className="full">
                <span>Image URL (optional)</span>
                <input
                  type="url"
                  value={
                    achievementForm.image_url
                  }
                  onChange={event =>
                    setAchievementForm(
                      current => ({
                        ...current,
                        image_url:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Use only if the image already exists online"
                />
              </label>

              <label className="full">
                <span>Reference URL</span>
                <input
                  type="url"
                  value={
                    achievementForm.external_url
                  }
                  onChange={event =>
                    setAchievementForm(
                      current => ({
                        ...current,
                        external_url:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="https://..."
                />
              </label>

              <label className="campusFeaturedToggle full">
                <input
                  type="checkbox"
                  checked={
                    achievementForm.is_featured
                  }
                  onChange={event =>
                    setAchievementForm(
                      current => ({
                        ...current,
                        is_featured:
                          event.target.checked,
                      })
                    )
                  }
                />

                <span>
                  Feature this achievement
                </span>
              </label>

              {campusError && (
                <p className="authError full">
                  {campusError}
                </p>
              )}

              <footer className="full">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setShowAchievementForm(false);
                    setEditingAchievement(null);
                    setAchievementImageFile(null);
                    setCampusError("");
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary"
                  disabled={campusSaving}
                >
                  {campusSaving
                    ? editingAchievement
                      ? "Saving..."
                      : "Publishing..."
                    : editingAchievement
                    ? "Save changes"
                    : "Publish achievement"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}


      {showResearchForm &&
        canAddCampusContent && (
        <div
          className="campusContentModalScrim"
          onClick={() =>
            setShowResearchForm(false)
          }
        >
          <section
            className="campusCreateFormModal"
            onClick={event =>
              event.stopPropagation()
            }
          >
            <header>
              <div>
                <span>
                  RESEARCH & INNOVATION
                </span>

                <h2>
                  Add research
                </h2>

                <p>
                  Publish verified research,
                  projects, patents and startups.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowResearchForm(false)
                }
              >
                ×
              </button>
            </header>

            <form
              className="campusCreateForm"
              onSubmit={createResearch}
            >
              <label>
                <span>Title</span>
                <input
                  required
                  value={
                    researchForm.title
                  }
                  onChange={event =>
                    setResearchForm(
                      current => ({
                        ...current,
                        title:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Smart Energy Research Platform"
                />
              </label>

              <label>
                <span>Type</span>
                <select
                  value={
                    researchForm.research_type
                  }
                  onChange={event =>
                    setResearchForm(
                      current => ({
                        ...current,
                        research_type:
                          event.target.value,
                      })
                    )
                  }
                >
                  {[
                    "Project",
                    "Patent",
                    "Publication",
                    "Research Lab",
                    "Startup",
                    "Funded Research",
                    "Student Innovation",
                    "Faculty Research",
                  ].map(value => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="full">
                <span>Description</span>
                <textarea
                  value={
                    researchForm.description
                  }
                  onChange={event =>
                    setResearchForm(
                      current => ({
                        ...current,
                        description:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Describe this research..."
                />
              </label>

              <label>
                <span>Department</span>
                <input
                  value={
                    researchForm.department
                  }
                  onChange={event =>
                    setResearchForm(
                      current => ({
                        ...current,
                        department:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>

              <label>
                <span>Lead</span>
                <input
                  value={
                    researchForm.lead_name
                  }
                  onChange={event =>
                    setResearchForm(
                      current => ({
                        ...current,
                        lead_name:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Faculty / student lead"
                />
              </label>

              <label>
                <span>Collaborators</span>
                <input
                  value={
                    researchForm.collaborators
                  }
                  onChange={event =>
                    setResearchForm(
                      current => ({
                        ...current,
                        collaborators:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Team members"
                />
              </label>

              <label>
                <span>Organization</span>
                <input
                  value={
                    researchForm.organization
                  }
                  onChange={event =>
                    setResearchForm(
                      current => ({
                        ...current,
                        organization:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="IEEE / DST / Company"
                />
              </label>

              <label>
                <span>Year</span>
                <input
                  value={
                    researchForm.year
                  }
                  onChange={event =>
                    setResearchForm(
                      current => ({
                        ...current,
                        year:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="2026"
                />
              </label>

              <label>
                <span>Status</span>
                <select
                  value={
                    researchForm.status
                  }
                  onChange={event =>
                    setResearchForm(
                      current => ({
                        ...current,
                        status:
                          event.target.value,
                      })
                    )
                  }
                >
                  {[
                    "Active",
                    "Completed",
                    "Published",
                    "Granted",
                    "Incubated",
                  ].map(value => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="full campusFileField">
                <span>Research image</span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={event =>
                    setResearchImageFile(
                      event.target.files?.[0] || null
                    )
                  }
                />

                {researchImageFile && (
                  <small>
                    Selected: {researchImageFile.name}
                  </small>
                )}
              </label>

              <label className="full">
                <span>Image URL (optional)</span>
                <input
                  type="url"
                  value={
                    researchForm.image_url
                  }
                  onChange={event =>
                    setResearchForm(
                      current => ({
                        ...current,
                        image_url:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Use only if the image already exists online"
                />
              </label>

              <label className="full">
                <span>Research URL</span>
                <input
                  type="url"
                  value={
                    researchForm.external_url
                  }
                  onChange={event =>
                    setResearchForm(
                      current => ({
                        ...current,
                        external_url:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="https://..."
                />
              </label>

              <label className="campusFeaturedToggle full">
                <input
                  type="checkbox"
                  checked={
                    researchForm.is_featured
                  }
                  onChange={event =>
                    setResearchForm(
                      current => ({
                        ...current,
                        is_featured:
                          event.target.checked,
                      })
                    )
                  }
                />

                <span>
                  Feature this research
                </span>
              </label>

              {campusError && (
                <p className="authError full">
                  {campusError}
                </p>
              )}

              <footer className="full">
                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    setShowResearchForm(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary"
                  disabled={campusSaving}
                >
                  {campusSaving
                    ? "Publishing..."
                    : "Publish research"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

  </div>
  );
}

function Field({label, children}: {label: string; children: ReactNode}) { return <label className="moduleField"><span>{label}</span>{children}</label>; }
function FormHeading({title, text}: {title: string; text: string}) { return <header className="formHeading"><div><span>CREATE</span><h3>{title}</h3><p>{text}</p></div></header>; }
function FormActions({status, label}: {status: string; label: string}) { return <div className="formActions"><span>{status}</span><button className="primary" type="submit">{label}</button></div>; }
function StatusLine({text}: {text: string}) { return <p className="moduleStatus" role="status">✓ {text}</p>; }
function EmptyState({title, text}: {title: string; text: string}) { return <div className="moduleEmpty"><i>◇</i><b>{title}</b><small>{text}</small></div>; }

function Stat({icon, name, val, n, note}: {icon: string; name: string; val: string; n?: number; note: string}) {
  return <article className="stat"><i>{icon}</i><small>{name}</small><b>{val}</b>{n !== undefined && <div><span style={{width: `${n}%`}}/></div>}<p>{note}</p></article>;
}

function MetricRow({title, meta, value, tone}: {title: string; meta: string; value: string; tone?: "good" | "alert"}) {
  return <div className="metricRow"><p><b>{title}</b><small>{meta}</small></p><span className={tone || ""}>{value}</span></div>;
}

function PipelineRow({label, value, width}: {label: string; value: string; width: number}) {
  return <div className="pipelineRow"><p><span>{label}</span><b>{value}</b></p><i><span style={{width: `${width}%`}}/></i></div>;
}

function Panel({title, action, click, children}: {title: string; action?: string; click?: () => void; children: ReactNode}) {
  return <section className="card panel"><header><h2>{title}</h2>{action && <button onClick={click}>{action} →</button>}</header>{children}</section>;
}

function Avatar({
  t,
  src,
  alt = "Profile photo",
}: {
  t: string;
  src?: string | null;
  alt?: string;
}) {
  const [imageFailed, setImageFailed] =
    useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const showImage =
    Boolean(src) && !imageFailed;

  return (
    <span
      className={
        showImage
          ? "avatar avatarHasImage"
          : "avatar"
      }
    >
      {showImage ? (
        <img
          src={src || ""}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() =>
            setImageFailed(true)
          }
        />
      ) : (
        t
      )}
    </span>
  );
}
function Logo({t}: {t: string}) { return <span className="logo">{t}</span>; }

function toPlacementJob(row: Record<string, unknown>): PlacementJob {
  const deadline = String(row.deadline || "");
  return {
    id: String(row.id || ""), c: String(row.company || ""), r: String(row.role_title || ""), p: String(row.compensation || ""),
    d: deadline ? new Intl.DateTimeFormat("en-IN", {day: "2-digit", month: "short"}).format(new Date(deadline)) : "",
    m: Number(row.match_score || 0), l: String(row.logo_label || ""), location: String(row.location || ""),
    workMode: String(row.work_mode || "Hybrid"), type: String(row.employment_type || "Full-time"), cgpa: String(row.minimum_cgpa || "0"),
    branches: Array.isArray(row.branches) ? row.branches.map(String) : [], skills: Array.isArray(row.skills) ? row.skills.map(String) : [],
    about: String(row.about || ""), rounds: Array.isArray(row.rounds) ? row.rounds.map(String) : [], applications: 0,
    posted: row.created_at ? `Posted ${friendlyRelative(String(row.created_at))}` : "Recently posted",
  };
}

function friendlyRelative(value: string) {
  const hours = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 3600000));
  return hours < 1 ? "just now" : hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join("");
}

function nameFromEmail(email: string) {
  const name = email.split("@")[0].split(/[._-]/).filter(Boolean).map(part => part[0].toUpperCase() + part.slice(1)).join(" ");
  return name || "Campus User";
}

function notificationStorageKey(profile: Profile) {
  return `campusconnect:notification-reads:${profile.email || profile.role}`;
}

function getStoredNotificationReads(profile: Profile) {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(notificationStorageKey(profile)) || "[]");
    return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function storeNotificationReads(profile: Profile, ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(notificationStorageKey(profile), JSON.stringify(ids));
}

function isRole(value: unknown): value is Role {
  return (
    value === "Student" ||
    value === "Faculty" ||
    value === "Placement Cell" ||
    value === "Coordinator" ||
    value === "Volunteer" ||
    value === "Main Admin"
  );
}

async function profileFromUser(user: User): Promise<Profile> {
  const metadata = user.user_metadata as Record<string, unknown>;
  const fallback: Profile = {
    name: typeof metadata.full_name === "string" && metadata.full_name.trim() ? metadata.full_name.trim() : nameFromEmail(user.email || ""),
    email: user.email || "",
    department: typeof metadata.department === "string" && metadata.department ? metadata.department : "Not set",
    year: typeof metadata.graduation_year === "string" && metadata.graduation_year ? metadata.graduation_year : "Not set",
    role: "Student",
    bio: typeof metadata.bio === "string" ? metadata.bio : "",
    skills: typeof metadata.skills === "string" ? metadata.skills : "",
    phone: typeof metadata.phone === "string" ? metadata.phone : "",
    usn: typeof metadata.usn === "string" ? metadata.usn : "",
    campus_uid:
      typeof metadata.campus_uid === "string"
        ? metadata.campus_uid
        : "",

    avatar_url:
      typeof metadata.avatar_url === "string"
        ? metadata.avatar_url
        : "",
  };
  const supabase = getSupabaseClient();
  if (!supabase) return fallback;

  const {data, error} = await supabase
    .from("profiles")
    .select("full_name, role, department, graduation_year, bio, skills, phone, usn, campus_uid, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return fallback;
  return {
    name: data.full_name || fallback.name,
    email: fallback.email,
    department: data.department || fallback.department,
    year: data.graduation_year || fallback.year,
    role: isRole(data.role) ? data.role : "Student",
    bio: data.bio || "",
    skills: data.skills || "",
    phone: data.phone || "",
    usn: data.usn || "",
    campus_uid:
      (data as {campus_uid?: string | null}).campus_uid || "",

    avatar_url:
      (data as {avatar_url?: string | null}).avatar_url || "",
  };
}

function LoadingScreen() {
  return <main className="sessionLoading" aria-label="Restoring session">
    <div className="authBrand"><b>C</b><span>CampusConnect</span></div>
    <i/><p>Restoring your campus workspace...</p>
  </main>;
}


function Timeline({t, title, meta, live}: {t: string; title: string; meta: string; live?: boolean}) {
  return <div className="timeline"><time>{t}</time><i className={live ? "live" : ""}/><p><b>{title}</b><small>{meta}</small></p>{live && <mark>Now</mark>}</div>;
}

function Post({who, time, children}: {who: string; time: string; children: ReactNode}) {
  return <div className="post"><Avatar t={who.split(" ").map(x => x[0]).join("")}/><p><b>{who} <small>· {time}</small></b><span>{children}</span></p></div>;
}

function Deadline({d, m, title, tag}: {d: string; m: string; title: string; tag: string}) {
  return <div className="deadline"><time><b>{d}</b><small>{m}</small></time><p><b>{title}</b><small>{tag}</small></p><button>•••</button></div>;
}

function RSection({title, children}: {title: string; children: ReactNode}) {
  return <section className="rsection"><h3>{title}</h3>{children}</section>;
}

function Event({d, title}: {d: string; title: string}) {
  return <div className="event"><label>{d}</label><p><b>{title}</b><small>5:00 PM · Main Auditorium</small></p><button>＋</button></div>;
}

function subtitle(v: View, role: Role) {
  if (isCampusModuleView(v)) return campusModuleSubtitle(v, role);
  const copy: Record<Role, Partial<Record<View, string>>> = {
    Faculty: {Dashboard: "Classes, mentoring priorities and academic activity in one view.", Placements: "Verified opportunities and preparation activity.", Network: "Collaborate with students, faculty and campus communities.", Resume: "Student resume guidance and review tools.", Academics: "Manage classes, attendance, resources and mentoring actions.", Campus: "Events, official notices and faculty participation."},
    "Placement Cell": {Dashboard: "Recruitment performance, deadlines and student readiness at a glance.", Placements: "Manage active drives, eligibility data and student communication.", Network: "Publish verified opportunities and placement announcements.", Resume: "Review student readiness and resume quality.", Academics: "View verified academic eligibility records.", Campus: "Coordinate placement events, workshops and official notices."},
    Student: {Dashboard: "Here’s what’s happening across your campus today.", Placements: "Verified opportunities, applications and preparation in one place.", Network: "A professional community built around real campus relationships.", Resume: "Build an ATS-ready resume with guided suggestions and live scoring.", Academics: "Attendance, schedule and learning resources in one view.", Campus: "Events, clubs, notices and life beyond the classroom."},
    Coordinator: {},
    Volunteer: {},
    "Main Admin": {},

  };
  return copy[role][v] || "Your connected campus workspace.";
}


// =========================================================
// LIVE DASHBOARD GREETING
// Uses the authenticated users browser-local time.
// =========================================================

function dashboardGreetingForDate(
  date: Date
): string {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}


function LiveDashboardGreeting({
  firstName,
}: {
  firstName: string;
}) {
  const [
    greeting,
    setGreeting,
  ] = useState("Welcome back");

  useEffect(() => {
    const updateGreeting = () => {
      setGreeting(
        dashboardGreetingForDate(
          new Date()
        )
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

  return (
    <h1 className="dashboardGreeting">
      <span>{greeting},</span>
      {" "}
      <strong>{firstName}</strong>

      <span
        className="greetingWave"
        aria-hidden="true"
      >
        👋
      </span>
    </h1>
  );
}
