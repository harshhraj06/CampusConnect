"use client";

import UserManual from "./user-manual";

import FacultyWorkspace from "./faculty-workspace";
import FacultyTodayClasses from "./faculty-today-classes";
import FacultyTeachingSchedule from "./faculty-teaching-schedule";
import TimetableCoordinatorStudio from "./timetable-coordinator-studio";
import TimetableDigitalBuilder from "./timetable-digital-builder";
import TimetableCoordinatorAdmin from "./timetable-coordinator-admin";
import FacultyDiary from "./faculty-diary";
import FacultySyllabusProgress from "./faculty-syllabus-progress";

import {
  getOfflineTimetableFiles,
  getOfflineTimetableSchedule,
  saveOfflineTimetableFile,
  saveOfflineTimetableSchedule,
  timetableMimeType,
} from "./offline-timetable-cache";











import Image from "next/image";
import type {User} from "@supabase/supabase-js";
import {lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode} from "react";
import {getSupabaseClient} from "../lib/supabase";
import FacultyWorkloadManager from "./faculty-workload-manager";
import FacultyAvailabilityManager from "./faculty-availability-manager";
import FacultyCoverageManager from "./faculty-coverage-manager";
import FacultyCoverageControlCenter from "./faculty-coverage-control-center";
import TimetableAutomationManager from "./timetable-automation-manager";
import {
  campusModuleSubtitle,
  isCampusModuleView,
  type CampusModuleView,
  type CampusModuleRole,
} from "./campus-module-routing";

import type {
  ModuleProfile,
} from "./campus-modules";
import {CampusSearch, type SearchTarget} from "./campus-search";
import {
  UnifiedNotificationCenter,
  UnifiedNotificationWatcher,
} from "./unified-notification-center";
import type {PlacementJob} from "./placement-experience";




import {GradeCalculator, openGradeCalculator} from "./grade-calculator";


import {useCampusSevaNotifications} from "./campus-seva-notifications";










const DashboardAttendanceChart = lazy(
  async () => {
    const module =
      await import(
        "./dashboard-attendance-chart"
      );

    return {
      default:
        module.DashboardAttendanceChart,
    };
  }
);


const ImportantNoticeRail = lazy(
  () =>
    import("./important-notice-rail")
);

const MyCampusRecruiterPreview = lazy(
  async () => {
    const module =
      await import(
        "./my-campus-recruiters"
      );

    return {
      default:
        module.MyCampusRecruiterPreview,
    };
  }
);

const ResumeStudio = lazy(
  async () => {
    const module =
      await import("./resume-studio");

    return {
      default:
        module.ResumeStudio,
    };
  }
);

const StudentPlacements = lazy(
  async () => {
    const module =
      await import(
        "./placement-experience"
      );

    return {
      default:
        module.StudentPlacements,
    };
  }
);

const PlacementOperations = lazy(
  async () => {
    const module =
      await import(
        "./placement-operations"
      );

    return {
      default:
        module.PlacementOperations,
    };
  }
);

const ProfessionalRoleDashboard = lazy(
  async () => {
    const module =
      await import(
        "./professional-role-dashboard"
      );

    return {
      default:
        module.ProfessionalRoleDashboard,
    };
  }
);

const CampusSevaKendra = lazy(
  async () => {
    const module =
      await import(
        "./campus-seva-kendra"
      );

    return {
      default:
        module.CampusSevaKendra,
    };
  }
);

const CampusAboutScroll = lazy(
  async () => {
    const module =
      await import(
        "./campus-about-scroll"
      );

    return {
      default:
        module.CampusAboutScroll,
    };
  }
);

const CollegeIdScanner = lazy(
  () =>
    import("./college-id-scanner")
);

const CampusAlumni = lazy(
  async () => {
    const module =
      await import("./campus-alumni");

    return {
      default:
        module.CampusAlumni,
    };
  }
);

const CampusMapBridge = lazy(
  async () => {
    const module =
      await import(
        "./campus-map-bridge"
      );

    return {
      default:
        module.CampusMapBridge,
    };
  }
);

const StudentCalendar = lazy(
  () =>
    import("./student-calendar")
);


const CampusMagazine = lazy(
  async () => {
    const module =
      await import("./campus-magazine");

    return {
      default:
        module.CampusMagazine,
    };
  }
);

const CampusAI = lazy(
  async () => {
    const module =
      await import("./campus-ai");

    return {
      default:
        module.CampusAI,
    };
  }
);

const ActivityCenter = lazy(
  async () => {
    const module =
      await import("./activity-center");

    return {
      default:
        module.ActivityCenter,
    };
  }
);

const FacultyDirectory = lazy(
  async () => {
    const module =
      await import("./faculty-directory");

    return {
      default:
        module.FacultyDirectory,
    };
  }
);

const NetworkProfessionalFeed = lazy(
  async () => {
    const module =
      await import(
        "./network-professional-feed"
      );

    return {
      default:
        module.NetworkProfessionalFeed,
    };
  }
);

const NetworkProfileModal = lazy(
  async () => {
    const module =
      await import(
        "./network-profile-modal"
      );

    return {
      default:
        module.NetworkProfileModal,
    };
  }
);

const StudentPerformanceTracker = lazy(
  () =>
    import(
      "./student-performance-tracker"
    )
);


const LazyCampusModule = lazy(
  async () => {
    const module =
      await import("./campus-modules");

    return {
      default:
        module.CampusModule,
    };
  }
);

function CampusModule(
  props: {
    view: CampusModuleView;
    profile: ModuleProfile;

    onProfileChange: (
      profile: ModuleProfile
    ) => void;

    onOpenFacultyDiary?: () => void;
    onOpenSyllabusProgress?: () => void;
  }
) {
  return (
    <Suspense
      fallback={
        <div
          className="moduleLoading card"
          role="status"
        >
          Loading workspace...
        </div>
      }
    >
      <LazyCampusModule
        {...props}
      />
    </Suspense>
  );
}

async function savePlacementApplication(
  ...args: Parameters<
    typeof import("./campus-modules")[
      "savePlacementApplication"
    ]
  >
) {
  const module =
    await import("./campus-modules");

  return module
    .savePlacementApplication(
      ...args
    );
}


type View =
  | SearchTarget
  | "Faculty Workspace"
  | "My Batches"
  | "Today's Classes"
  | "My Teaching Schedule"
  | "Faculty Diary"
  | "Syllabus Progress"
  | "Faculty Workload"
  | "Faculty Availability"
  | "Faculty Coverage"
  | "Timetable Coordinator"
  | "Timetable Assignment"
  | "User Manual";
type Role = "Student" | "Faculty" | "Placement Cell" | "Coordinator" | "Volunteer" | "Main Admin";
type Screen = "welcome" | "auth" | "dashboard";
type AuthMode = "login" | "register" | "forgot" | "reset";
type NotificationFilter = "all" | "unread";
type NotificationKind = "placement" | "academic" | "resume" | "network" | "campus" | "seva";

const viewLabel = (view: View) =>
  view === "Campus"
    ? "Campus Life"
    : view === "Calendar"
      ? "Campus Calendar"
      : view;

const viewSlugs: Record<View, string> = {
  Dashboard: "dashboard",
  "Faculty Workspace": "faculty-workspace",
  "My Batches": "faculty-batches",
  "Today's Classes": "faculty-today",
  "My Teaching Schedule": "faculty-teaching-schedule",
  "Faculty Diary": "faculty-diary",
  "Syllabus Progress": "faculty-syllabus-progress",
  "Faculty Workload": "faculty-workload",
  "Faculty Availability": "faculty-availability",
  "Faculty Coverage": "faculty-coverage",
  "Timetable Coordinator": "timetable-coordinator",
  "Timetable Assignment": "timetable-assignment",
  "User Manual": "user-manual",
  "My Campus": "my-campus",
  "Campus Map": "campus-map",
  "Campus AI": "campus-ai",
  Placements: "placements",
  Network: "network",
  Resume: "resume",
  Academics: "academics",
  "Academic Control": "academic-control",
  Calendar: "calendar",
  Campus: "campus-life",
  Alumni: "alumni",
  "Activity Center": "activity-center",
  "Faculty Directory": "faculty-directory",
  "About CampusConnect": "about-campusconnect",
  "Seva Kendra": "seva-kendra",
  "College ID": "college-id",
  Announcements: "announcements",
  Assignments: "assignments",
  Attendance: "attendance",
  Learning: "learning",
  Groups: "groups",
  Marketplace: "marketplace",
  "Notes & Tasks": "notes-tasks",
  Profile: "profile",
  Applications: "applications",
  Analytics: "analytics",
  Admin: "admin",
};

const viewBySlug = Object.fromEntries(
  Object.entries(viewSlugs).map(([view, slug]) => [
    slug,
    view as View,
  ])
) as Record<string, View>;

const viewFromPathname = (
  pathname: string
): View | null => {
  const slug = pathname
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();

  if (slug === "campus-ai") {
    return "My Campus";
  }

  return slug
    ? viewBySlug[slug] ?? null
    : null;
};

const pathnameForView = (
  view: View
) => `/${viewSlugs[view]}`;
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
  ["Resume", "▤"],
  ["Applications", "▤"],
  ["Learning", "▶"],
  ["Groups", "◉"],
  ["Marketplace", "♢"],
  ["Notes & Tasks", "✎"],
  ["Network", "◎"],
  ["Academics", "▦"],
  ["Faculty Directory", "♙"],
  ["Activity Center", "✦"],
  ["Seva Kendra", "✉"],
  ["College ID", "▥"],
  ["About CampusConnect", "≋"],
  ["Profile", "◌"],
];
const navByRole: Record<Role, [View, string][]> = {
  Student: nav,

  Faculty: [
    ["Dashboard", "⌂"],
    ["Faculty Workspace", "▦"],




    ["Notes & Tasks", "✎"],

    ["Announcements", "▣"],
    ["Calendar", "▦"],
    ["Groups", "◉"],
    ["Network", "◎"],

    ["My Campus", "◇"],
    ["Campus Map", "⌖"],
    ["Campus", "◇"],
    ["Alumni", "✦"],

    ["Activity Center", "✦"],
    ["Seva Kendra", "✉"],
    ["Analytics", "▥"],
    ["College ID", "▥"],

    ["About CampusConnect", "≋"],
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
    ["Notes & Tasks", "✎"],
    ["Network", "◎"],
    ["Analytics", "▥"],
    ["Campus", "◇"],
    ["Faculty Directory", "♙"],
    ["Activity Center", "✦"],
    ["Seva Kendra", "✉"],
    ["About CampusConnect", "≋"],
    ["Profile", "◌"],
  ],

  Coordinator: [
    ["Timetable Coordinator", "▦"],
    ["Dashboard", "⌂"],
    ["My Campus", "◇"],
    ["Announcements", "▣"],
    ["Learning", "▶"],
    ["Groups", "◉"],
    ["Notes & Tasks", "✎"],
    ["Campus", "◇"],
    ["Activity Center", "✦"],
    ["Network", "◎"],
    ["Faculty Directory", "♙"],
    ["Seva Kendra", "✉"],
    ["College ID", "▥"],
    ["About CampusConnect", "≋"],
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
    ["Seva Kendra", "✉"],
    ["About CampusConnect", "≋"],
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
    ["Notes & Tasks", "✎"],
    ["Network", "◎"],
    ["Academics", "▦"],
    ["Academic Control", "⚙"],
    ["Analytics", "▥"],
    ["Admin", "⚙"],
    ["Timetable Assignment", "▦"],
    ["Campus", "◇"],
    ["Activity Center", "✦"],
    ["Faculty Directory", "♙"],
    ["Seva Kendra", "✉"],
    ["College ID", "▥"],
    ["About CampusConnect", "≋"],
    ["Profile", "◌"],
  ],
};


/*
 * USER MANUAL NAVIGATION
 *
 * The manual is inserted automatically for every CampusConnect role.
 * It is placed immediately before Profile when Profile exists.
 *
 * The manual itself reads directly from navByRole, so every future
 * feature added to a role navigation automatically appears as a guide.
 */

(
  Object.keys(
    navByRole
  ) as Role[]
).forEach(
  roleName => {

    const roleItems =
      navByRole[
        roleName
      ];


    if (
      roleItems.some(
        ([view]) =>
          view ===
            "User Manual"
      )
    ) {
      return;
    }


    const profileIndex =
      roleItems.findIndex(
        ([view]) =>
          view ===
            "Profile"
      );


    const manualItem:
      [View, string] =
        [
          "User Manual",
          "?",
        ];


    if (
      profileIndex >=
        0
    ) {

      roleItems.splice(
        profileIndex,
        0,
        manualItem
      );

      return;

    }


    roleItems.push(
      manualItem
    );

  }
);


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
  seva: "S",
};

function SidebarProfileReminder({
  completion,
  onOpenProfile,
}: {
  completion: number;
  onOpenProfile: () => void;
}) {
  const [
    dismissed,
    setDismissed,
  ] = useState(false);

  if (
    dismissed ||
    completion >= 100
  ) {
    return null;
  }

  return (
    <div className="sidebarProfileProgress">
      <button
        type="button"
        className="sidebarProfileDismiss"
        aria-label="Dismiss profile reminder"
        title="Dismiss"
        onClick={() =>
          setDismissed(true)
        }
      >
        ×
      </button>

      <span className="sidebarProfileIcon">
        ◆
      </span>

      <strong>
        Complete your profile
      </strong>

      <p>
        Add your skills & interests to get
        better recommendations.
      </p>

      <div className="sidebarProfileBar">
        <span
          style={{
            width:
              `${Math.min(
                100,
                completion
              )}%`,
          }}
        />
      </div>

      <small>
        {completion}% Complete
      </small>

      <button
        type="button"
        onClick={onOpenProfile}
      >
        Complete now →
      </button>
    </div>
  );
}


export default function Home() {

  /*
   * Development-only attendance email delivery tester.
   *
   * The helper itself refuses to install in production and
   * hard-codes dryRun: true.
   */
  const [screen, setScreen] = useState<Screen>("welcome");
  const [showOpeningAnimation, setShowOpeningAnimation] = useState(true);

  useEffect(() => {
    const animationFallback = window.setTimeout(() => {
      setShowOpeningAnimation(false);
    }, 5200);

    return () => {
      window.clearTimeout(animationFallback);
    };
  }, []);
  const [role, setRole] = useState<Role>("Student");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [jobs, setJobs] = useState<PlacementJob[]>([]);
  const [v, setVState] = useState<View>("Dashboard");

  // CampusConnect internal view history.
  // Every normal setV(nextView) remembers the current view.
  // goBack() consumes history without creating another entry.
  const viewRef = useRef<View>("Dashboard");
  const viewHistoryRef = useRef<View[]>([]);
  const navigatingBackRef = useRef(false);

  const setV = (next: View | ((current: View) => View)) => {
    const current = viewRef.current;
    const resolved =
      typeof next === "function"
        ? next(current)
        : next;

    if (resolved === current) {
      return;
    }

    if (!navigatingBackRef.current) {
      const history = viewHistoryRef.current;

      if (history[history.length - 1] !== current) {
        history.push(current);
      }

      if (history.length > 50) {
        history.shift();
      }
    }

    viewRef.current = resolved;

    if (
      typeof window !== "undefined" &&
      screen === "dashboard"
    ) {
      window.history.pushState(
        {campusConnectView: resolved},
        "",
        pathnameForView(resolved)
      );
    }

    setVState(resolved);
  };

  const goBack = () => {
    const history = viewHistoryRef.current;
    const previous = history.pop();

    if (!previous) {
      return;
    }

    navigatingBackRef.current = true;
    setVState(previous);
    viewRef.current = previous;

    window.history.back();

    // Reset after this navigation cycle so subsequent navigation
    // is recorded normally.
    queueMicrotask(() => {
      navigatingBackRef.current = false;
    });

    setSidebarOpen(false);
    setNotificationsOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarProfilePromptVisible, setSidebarProfilePromptVisible] = useState(true);
  const [applied, setApplied] = useState<string[]>([]);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
    const [score, setScore] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>("all");
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<CampusNotification[]>([]);
  const sevaNotifications =
    useCampusSevaNotifications({
      profileEmail:
        profile.email,
      role,
    });

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
      const requestedView =
        viewFromPathname(
          window.location.pathname
        );

      const savedView =
        window.localStorage.getItem(
          CAMPUSCONNECT_LAST_VIEW_KEY
        ) as View | null;


      const roleViews =
        navByRole[
          restoredProfile.role
        ];


      const viewIsAllowed =
        (candidate: View | null) =>
          candidate === "Dashboard" ||
          candidate === "Campus Map" ||
          candidate === "Calendar" ||
          candidate === "Alumni" ||
          (
            candidate &&
            roleViews.some(
              ([viewName]) =>
                viewName === candidate
            )
          );

      const initialView =
        viewIsAllowed(requestedView)
          ? requestedView!
          : viewIsAllowed(savedView)
            ? savedView!
            : "Dashboard";

      setV(initialView);

      window.history.replaceState(
        {campusConnectView: initialView},
        "",
        pathnameForView(initialView)
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

    if (
      window.location.pathname !==
      pathnameForView(v)
    ) {
      window.history.replaceState(
        {campusConnectView: v},
        "",
        pathnameForView(v)
      );
    }

  }, [
    v,
    screen,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      const nextView =
        viewFromPathname(
          window.location.pathname
        );

      if (!nextView) {
        return;
      }

      const history =
        viewHistoryRef.current;

      if (
        history[history.length - 1] ===
        nextView
      ) {
        history.pop();
      }

      navigatingBackRef.current = true;
      viewRef.current = nextView;
      setVState(nextView);
      setSidebarOpen(false);
      setNotificationsOpen(false);

      queueMicrotask(() => {
        navigatingBackRef.current = false;
      });
    };

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () =>
      window.removeEventListener(
        "popstate",
        handlePopState
      );
  }, []);


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
    let active = true;

    const client =
      getSupabaseClient();

    if (
      !client ||
      !profile.email
    ) {
      return;
    }

    const loadLiveNotifications =
      async () => {
        const [
          announcements,
          applications,
          campusEvents,
        ] =
          await Promise.all([
            client
              .from("announcements")
              .select(
                "id,title,body,category,created_at"
              )
              .order(
                "created_at",
                {
                  ascending: false,
                }
              )
              .limit(20),

            client
              .from(
                "placement_applications"
              )
              .select(
                "id,company,role_title,status,updated_at"
              )
              .order(
                "updated_at",
                {
                  ascending: false,
                }
              )
              .limit(10),

            client
              .from("campus_events")
              .select(
                [
                  "id",
                  "title",
                  "short_description",
                  "category",
                  "event_date",
                  "created_at",
                  "audience_department",
                  "audience_year",
                  "status",
                ].join(",")
              )
              .eq(
                "status",
                "Published"
              )
              .gte(
                "event_date",
                new Date()
                  .toISOString()
              )
              .order(
                "event_date",
                {
                  ascending: true,
                }
              )
              .limit(20),
          ]);

        if (!active) {
          return;
        }

        const notificationRows:
          Array<{
            timestamp: number;
            item:
              CampusNotification;
          }> = [];


        for (
          const row of
          announcements.data ||
          []
        ) {
          notificationRows.push({
            timestamp:
              new Date(
                String(
                  row.created_at
                )
              ).getTime(),

            item: {
              id:
                `announcement-${row.id}`,

              kind:
                row.category ===
                  "Placement"
                  ? "placement"
                  : "academic",

              label:
                row.category,

              title:
                row.title,

              message:
                row.body,

              time:
                friendlyRelative(
                  String(
                    row.created_at
                  )
                ),

              target:
                "Announcements",
            },
          });
        }


        if (
          role ===
          "Student"
        ) {
          for (
            const row of
            applications.data ||
            []
          ) {
            notificationRows.push({
              timestamp:
                new Date(
                  String(
                    row.updated_at
                  )
                ).getTime(),

              item: {
                id:
                  `application-${row.id}`,

                kind:
                  "placement",

                label:
                  "Application",

                title:
                  `${row.company} · ${row.role_title}`,

                message:
                  `Application status: ${row.status}`,

                time:
                  friendlyRelative(
                    String(
                      row.updated_at
                    )
                  ),

                target:
                  "Applications",
              },
            });
          }
        }


        for (
          const row of
          (campusEvents.data || []) as unknown as Array<{
            id: string;
            title: string;
            short_description: string | null;
            category: string | null;
            event_date: string;
            created_at: string | null;
            audience_department: string | null;
            audience_year: string | null;
          }>
        ) {
          const department =
            String(
              row.audience_department ||
              "All"
            );

          const year =
            String(
              row.audience_year ||
              "All"
            );

          const departmentMatches =
            department ===
              "All" ||
            department ===
              profile.department;

          const yearMatches =
            year ===
              "All" ||
            year ===
              profile.year;

          if (
            !departmentMatches ||
            !yearMatches
          ) {
            continue;
          }

          notificationRows.push({
            timestamp:
              new Date(
                String(
                  row.created_at ||
                  row.event_date
                )
              ).getTime(),

            item: {
              id:
                `event-${row.id}`,

              kind:
                "campus",

              label:
                row.category ||
                "Event",

              title:
                row.title,

              message:
                row.short_description ||
                `Upcoming event starts ${
                  friendlyRelative(
                    String(
                      row.event_date
                    )
                  )
                }.`,

              time:
                friendlyRelative(
                  String(
                    row.created_at ||
                    row.event_date
                  )
                ),

              target:
                "Announcements",
            },
          });
        }


        setLiveNotifications(
          notificationRows
            .sort(
              (a, b) =>
                b.timestamp -
                a.timestamp
            )
            .slice(0, 30)
            .map(
              row =>
                row.item
            )
        );
      };


    void loadLiveNotifications();


    const channel =
      client
        .channel(
          "campus-live-notifications"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "announcements",
          },
          () => {
            void loadLiveNotifications();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "placement_applications",
          },
          () => {
            void loadLiveNotifications();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "campus_events",
          },
          () => {
            void loadLiveNotifications();
          }
        )
        .subscribe();


    return () => {
      active = false;

      void client.removeChannel(
        channel
      );
    };
  }, [
    profile.email,
    profile.department,
    profile.year,
    role,
  ]);

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

  if (showOpeningAnimation) {
    return (
      <div
        className="ccOpening"
        role="dialog"
        aria-label="CampusConnect opening animation"
      >
        <div
          className="ccOpeningGrid"
          aria-hidden="true"
        />

        <div
          className="ccOpeningGlow ccOpeningGlowOne"
          aria-hidden="true"
        />

        <div
          className="ccOpeningGlow ccOpeningGlowTwo"
          aria-hidden="true"
        />

        <main className="ccOpeningStage">

<div className="ccOpeningLogoScene">
            <span
              className="ccOpeningOrbit ccOpeningOrbitOne"
              aria-hidden="true"
            />

            <span
              className="ccOpeningOrbit ccOpeningOrbitTwo"
              aria-hidden="true"
            />

            <div className="ccOpeningLogoCard">
              <img
                src="/campusconnect-logo.png"
                alt="CampusConnect logo"
                width="116"
                height="116"
                className="ccOpeningLogo"
              />
            </div>
          </div>

          <div className="ccOpeningCopy">
            <span className="ccOpeningEyebrow">
              Your campus, connected
            </span>

            <h1 aria-label="CampusConnect">
              <span className="ccOpeningLetter ccOpeningLetterDark" aria-hidden="true">C</span>
              <span className="ccOpeningLetter ccOpeningLetterDark" aria-hidden="true">a</span>
              <span className="ccOpeningLetter ccOpeningLetterDark" aria-hidden="true">m</span>
              <span className="ccOpeningLetter ccOpeningLetterDark" aria-hidden="true">p</span>
              <span className="ccOpeningLetter ccOpeningLetterDark" aria-hidden="true">u</span>
              <span className="ccOpeningLetter ccOpeningLetterDark" aria-hidden="true">s</span>
              <span className="ccOpeningLetter ccOpeningLetterBlue" aria-hidden="true">C</span>
              <span className="ccOpeningLetter ccOpeningLetterBlue" aria-hidden="true">o</span>
              <span className="ccOpeningLetter ccOpeningLetterBlue" aria-hidden="true">n</span>
              <span className="ccOpeningLetter ccOpeningLetterBlue" aria-hidden="true">n</span>
              <span className="ccOpeningLetter ccOpeningLetterBlue" aria-hidden="true">e</span>
              <span className="ccOpeningLetter ccOpeningLetterBlue" aria-hidden="true">c</span>
              <span className="ccOpeningLetter ccOpeningLetterBlue" aria-hidden="true">t</span>
            </h1>

            <p>
              One intelligent workspace for your entire
              campus journey.
            </p>
          </div>

          <div
            className="ccOpeningProgress"
            aria-hidden="true"
          >
            <span />
          </div>
        </main>

        <button
          type="button"
          className="ccOpeningSkip"
          onClick={() => setShowOpeningAnimation(false)}
          aria-label="Skip opening animation"
        >
          Skip
          <span aria-hidden="true">→</span>
        </button>
      </div>
    );
  }

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
  const roleNav: [View, string][] =
    role === "Faculty"
      ? navByRole[role]
      : [
          navByRole[role][0],
          ["Campus Map", "⌖"],
          ["Calendar", "▦"],
          ["Alumni", "✦"],
          ...navByRole[role].slice(1),
        ];
  const status = sidebarStatus[role];
  const actions = headerActions[role];
  const roleNotifications:
    CampusNotification[] = [
      ...sevaNotifications,
      ...liveNotifications,
    ].slice(
      0,
      40
    );
  const localUnreadCount =
    roleNotifications.filter(
      item =>
        !readNotificationIds.includes(
          item.id
        )
    ).length;

  const unreadCount =
    localUnreadCount +
    unifiedExternalUnreadCount;
  const sevaUnreadCount =
    roleNotifications.filter(
      item =>
        item.target ===
          "Seva Kendra" &&
        !readNotificationIds.includes(
          item.id
        )
    ).length;

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

      {!(role === "Faculty" && v === "Dashboard") && (
      <button
        type="button"
        className="campusGradeLauncher"
        onClick={openGradeCalculator}
        title="Open CampusConnect SGPA / CGPA Calculator"
      >
        <i>∑</i>
        <span>SGPA / CGPA</span>
      </button>
      )}

      {v === "Dashboard" && role !== "Faculty" && (
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
}} key={n === "Campus" ? "Campus Life" : n}><i>{i}</i>{viewLabel(n)}{n === "Placements" && <em>8</em>}{n === "Seva Kendra" && sevaUnreadCount > 0 && (
  <em>
    {sevaUnreadCount > 99
      ? "99+"
      : sevaUnreadCount}
  </em>
)}</button>)}
        </nav>
        {role === "Student" ? (
          <SidebarProfileReminder
            completion={sidebarProfileCompletion}
            onOpenProfile={() => setV("Profile")}
          />
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

        <Suspense
          fallback={
            <div
              className="moduleLoading card"
              role="status"
            >
              Loading workspace...
            </div>
          }
        >
          <div className="content">
          {v !== "Dashboard" && (
            <div className="globalBackBar">
              <button
                type="button"
                className="globalBackToDashboard"
                onClick={goBack}
                aria-label="Back"
              >
                <span className="globalBackIcon" aria-hidden="true">
                  ←
                </span>

                <span className="globalBackCopy">
                  <strong>Back</strong>
                </span>
              </button>
            </div>
          )}

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

            {v === "Dashboard" && role !== "Faculty" && (
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
          {v === "Alumni" && (
            <CampusAlumni role={role} />
          )}

          {v === "Campus Map" && (
            <section
              aria-label="RNS Campus Navigator"
              style={{
                overflow: "hidden",
                minHeight: "900px",
                border: "1px solid rgba(31, 78, 121, 0.16)",
                borderRadius: "24px",
                background: "#eaf2f7",
                boxShadow:
                  "0 22px 54px rgba(24, 54, 91, 0.14)",
              }}
            >
              <CampusMapBridge
                role={role}
              />
            </section>
          )}

          {v === "Calendar" && (
            <StudentCalendar role={role} />
          )}

          {v === "My Campus" && (
            <MyCampus
              profile={profile}
            />
          )}

          {v === "Faculty Workspace" &&
            role === "Faculty" && (
              <FacultyWorkspace
                mode="dashboard"
                profile={profile}
                onOpenMyBatches={() =>
                  setV("My Batches")
                }
                onOpenTodayClasses={() =>
                  setV("Today's Classes")
                }
                onOpenAttendance={() =>
                  setV("Attendance")
                }
                onOpenSyllabusProgress={() =>
                  setV("Syllabus Progress")
                }
                onOpenAssignments={() =>
                  setV("Assignments")
                }
                onOpenLearning={() =>
                  setV("Learning")
                }
                onOpenAcademics={() =>
                  setV("Academics")
                }
              />
            )}

          {v === "My Batches" &&
            role === "Faculty" && (
              <FacultyWorkspace
                mode="batches"
                profile={profile}
                onOpenMyBatches={() =>
                  setV("My Batches")
                }
                onOpenTodayClasses={() =>
                  setV("Today's Classes")
                }
                onOpenAttendance={() =>
                  setV("Attendance")
                }
                onOpenSyllabusProgress={() =>
                  setV("Syllabus Progress")
                }
                onOpenAssignments={() =>
                  setV("Assignments")
                }
                onOpenLearning={() =>
                  setV("Learning")
                }
                onOpenAcademics={() =>
                  setV("Academics")
                }
              />
            )}

          {v === "Today's Classes" &&
            role === "Faculty" && (
              <FacultyTodayClasses
                profile={profile}
                onOpenAttendance={() =>
                  setV("Attendance")
                }
                onOpenMyBatches={() =>
                  setV("My Batches")
                }
                onOpenSyllabusProgress={() =>
                  setV("Syllabus Progress")
                }
              />
            )}

          {v === "My Teaching Schedule" &&
            role === "Faculty" && (
              <FacultyTeachingSchedule
                profile={profile}
              />
            )}


          {v === "Faculty Diary" &&
            role === "Faculty" && (
              <FacultyDiary
                profile={profile}
                onOpenAttendance={() =>
                  setV("Attendance")
                }
                onOpenTodayClasses={() =>
                  setV("Today's Classes")
                }
              />
            )}

          {v === "Syllabus Progress" &&
            role === "Faculty" && (
              <FacultySyllabusProgress
                profile={profile}
                onOpenAttendance={() =>
                  setV("Attendance")
                }
                onOpenDiary={() =>
                  setV("Faculty Diary")
                }
              />
            )}

          {v === "Faculty Workload" &&
            role === "Faculty" && (
              <FacultyWorkloadManager
                profile={profile}
              />
            )}


          {v === "Faculty Availability" &&
            role === "Faculty" && (
              <FacultyAvailabilityManager
                profile={profile}
              />
            )}


          {v === "Faculty Coverage" &&
            role === "Faculty" && (
              <FacultyCoverageManager
                profile={profile}
              />
            )}


          {v === "Timetable Coordinator" &&
            role === "Coordinator" && (
              <>
                <TimetableDigitalBuilder
                  profile={profile}
                />

                <TimetableCoordinatorStudio
                  profile={profile}
                />
              </>
            )}




          {v === "Timetable Assignment" &&
            role === "Main Admin" && (
              <TimetableCoordinatorAdmin
                profile={profile}
              />
            )}{v === "Placements" && (role === "Placement Cell" ? <PlacementOperations profile={profile}/> : <StudentPlacements
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
          {v === "Academic Control" && (
            <AcademicControl
              role={role}
              profile={profile}
            />
          )}
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

          {v === "College ID" && (
            <CollegeIdScanner />
          )}

          {v === "Seva Kendra" && (
            <CampusSevaKendra
              profile={profile}
            />
          )}
          {v === "About CampusConnect" && (
            <CampusAboutScroll
              viewerName={profile.name}
              viewerRole={role}
            />
          )}
          {v === "User Manual" && (
            <UserManual
              role={role}
              navigation={navByRole}
              onOpen={target =>
                setV(
                  target as View
                )
              }
            />
          )}

          {v === "Profile" && <ProfilePage profile={profile} onProfileChange={next => { setProfile(next); setRole(next.role); }} onSignOut={signOut}/>}
          {isCampusModuleView(v) && (
            <CampusModule
              view={v}
              profile={profile}

              onProfileChange={nextProfile => {
                setProfile(current => ({
                  ...current,
                  ...nextProfile,
                }));

                setRole(
                  nextProfile.role
                );
              }}

              onOpenFacultyDiary={
                role === "Faculty"
                  ? () =>
                      setV(
                        "Faculty Diary"
                      )
                  : undefined
              }

              onOpenSyllabusProgress={
                role === "Faculty"
                  ? () =>
                      setV(
                        "Syllabus Progress"
                      )
                  : undefined
              }
            />
          )}
        </div>
        </Suspense>
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

          client.rpc(
            "get_my_live_attendance_summary"
          ),

          client.rpc(
            "get_my_assignments"
          ),

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
            (
              attendanceResult.data ||
              []
            ).map(
              (row: any) => ({
                id:
                  String(
                    row.id ||
                    row.subject ||
                    ""
                  ),

                subject:
                  String(
                    row.subject ||
                    "Subject"
                  ),

                attended:
                  Number(
                    row.attended_classes ||
                    0
                  ),

                total:
                  Number(
                    row.counted_classes ||
                    0
                  ),

                updated_at:
                  String(
                    row.updated_at ||
                    ""
                  ),
              })
            ) as DashboardAttendance[]
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
              meta: `${Number(item.attended_classes || 0)}/${Number(item.counted_classes || 0)} classes attended`,
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

        setRecentActivity(
          activityItems.slice(
            0,
            30
          )
        );
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

    const refreshDashboard =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void loadDashboard();
        }
      };

    const refreshTimer =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            void loadDashboard();
          }
        },
        15000
      );

    window.addEventListener(
      "focus",
      refreshDashboard
    );

    document.addEventListener(
      "visibilitychange",
      refreshDashboard
    );

    return () => {
      active = false;

      window.clearInterval(
        refreshTimer
      );

      window.removeEventListener(
        "focus",
        refreshDashboard
      );

      document.removeEventListener(
        "visibilitychange",
        refreshDashboard
      );
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
    return (item.attended / item.total) * 100 >= 85;
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
    return (item.attended / item.total) * 100 < 85;
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
            attendanceAverage >= 85
              ? `${safeSubjects} subjects are currently at or above the 85% target.`
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
            attendanceAverage < 85
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
            percentage < 85
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
                `${item.subject} attendance is below 85%`,

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


        const priorityActionLabel = (
            type:
              StudentPriorityItem["type"]
          ) => {

            if (
              type ===
              "attendance"
            ) {
              return "Review attendance";
            }

            if (
              type ===
              "assignment"
            ) {
              return "Open assignment";
            }

            if (
              type ===
              "placement"
            ) {
              return "View opportunity";
            }

            if (
              type ===
              "profile"
            ) {
              return "Complete profile";
            }

            return "Track application";
          };


          return (

          <section className="studentPriorityCenter">

            <header className="studentPriorityHeader">

              <div>

                <div className="studentPriorityEyebrow">

                  <span>
                    ACTION CENTER
                  </span>

                  <i />

                  <small>
                    Live CampusConnect signals
                  </small>

                </div>


                <h2>
                  Your next best actions
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

            <section className="studentActionBrief">
              <div className="studentActionBriefCopy">
                <div className="studentActionBriefEyebrow">
                  <span>
                    TODAY'S BRIEF
                  </span>

                  <i />

                  <small>
                    Live priority summary
                  </small>
                </div>

                <strong>
                  {priorities.length
                    ? `${priorities.length} ${
                        priorities.length === 1
                          ? "action"
                          : "actions"
                      } currently active`
                    : "You're on track today"}
                </strong>

                <p>
                  {criticalCount > 0
                    ? `${criticalCount} critical ${
                        criticalCount === 1
                          ? "item needs"
                          : "items need"
                      } immediate attention.`
                    : highCount > 0
                    ? `${highCount} high-priority ${
                        highCount === 1
                          ? "item is"
                          : "items are"
                      } waiting.`
                    : priorities.length
                    ? "No critical issues. Continue with your highest-ranked action."
                    : "No urgent academic or placement actions right now."}
                </p>
              </div>

              {sortedPriorities[0] && (
                <button
                  type="button"
                  className="studentActionBriefNext"
                  onClick={() =>
                    go(
                      sortedPriorities[0].target
                    )
                  }
                >
                  <small>
                    NEXT PRIORITY
                  </small>

                  <strong>
                    {sortedPriorities[0].title}
                  </strong>

                  <span>
                    {priorityActionLabel(
                      sortedPriorities[0].type
                    )} →
                  </span>
                </button>
              )}
            </section>


            {loading ? (

              <div className="studentPriorityLoading">

                <span />

                <div>

                  <strong>
                    Building your action queue
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
                          {priorityActionLabel(
                              item.type
                            )} →
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
                    No action needed right now
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
                      attendanceAverage >= 85
                        ? "dashboardHealthStatus safe"
                        : "dashboardHealthStatus risk"
                    }
                  >
                    {attendanceAverage >= 85
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
                            percentage >= 85
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

                <DashboardAttendanceChart
                  data={dashboardAttendanceChart}
                />

                <div className="dashboardChartLegend">
                  <span>
                    <i className="dashboardLegendBar"/>
                    Current attendance
                  </span>

                  <span>
                    <i className="dashboardLegendLine"/>
                    Required minimum — 85%
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
  const views: View[] =
    role === "Student"
      ? [
          "Placements",
          "Assignments",
          "Attendance",
        ]
      : role === "Faculty"
        ? [
            "Faculty Workspace",
            "My Batches",
            "Attendance",
          ]
        : [
            "Placements",
            "Applications",
            "Admin",
          ];
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
    campus_uid: string;
    department: string;
    graduation_year: string;
    role: Role;
    avatar_url?: string | null;
    bio: string;
    skills: string;
  };

  type ConnectionRecord = {
    id: string;
    requester_id: string;
    receiver_id: string;
    status: string;
  };

  type DirectorySearchPerson = {
    id: string;
    full_name: string;
    campus_uid: string;
    usn: string;
    department: string;
    graduation_year: string;
    role: string;
    avatar_url?: string | null;
  };

  const [people, setPeople] = useState<Person[]>([]);
  const [connections, setConnections] =
    useState<ConnectionRecord[]>([]);

  const [currentUserId, setCurrentUserId] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [networkTab, setNetworkTab] = useState<"Feed" | "Discover">("Feed");
  const [selectedNetworkProfileId, setSelectedNetworkProfileId] =
    useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] =
    useState<string | null>(null);

  const [ccId, setCcId] = useState("");
  const [ccIdResult, setCcIdResult] =
    useState<Person | null>(null);
  const [ccIdSearching, setCcIdSearching] =
    useState(false);
  const [ccIdMessage, setCcIdMessage] =
    useState("");

  const normalizeConnectionStatus = (
    value: string
  ) => value.trim().toLowerCase();

  useEffect(() => {
    let active = true;

    const client = getSupabaseClient();

    if (!client) {
      setStatus("Supabase is not configured.");
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);

      const {data: auth, error: authError} =
        await client.auth.getUser();

      if (!active) return;

      if (authError || !auth.user) {
        setStatus(
          "Sign in again to use your campus network."
        );
        setLoading(false);
        return;
      }

      const userId = auth.user.id;

      setCurrentUserId(userId);

      const [
        directoryResult,
        connectionResult,
      ] = await Promise.all([
        client.rpc(
          "list_campus_network_profiles"
        ),

        client
          .from("chat_connections")
          .select(
            "id,requester_id,receiver_id,status"
          )
          .or(
            `requester_id.eq.${userId},receiver_id.eq.${userId}`
          ),
      ]);

      if (!active) return;

      if (directoryResult.error) {
        setStatus(
          `Network directory: ${directoryResult.error.message}`
        );
        setLoading(false);
        return;
      }

      if (connectionResult.error) {
        setStatus(
          `Connections: ${connectionResult.error.message}`
        );
        setLoading(false);
        return;
      }

      setPeople(
        (directoryResult.data || []) as Person[]
      );

      setConnections(
        (connectionResult.data || []) as ConnectionRecord[]
      );

      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const relationshipFor = (
    personId: string
  ) =>
    connections.find(
      connection =>
        (
          connection.requester_id ===
            currentUserId &&
          connection.receiver_id ===
            personId
        ) ||
        (
          connection.requester_id ===
            personId &&
          connection.receiver_id ===
            currentUserId
        )
    );

  const connectedIds = new Set(
    connections
      .filter(
        connection =>
          normalizeConnectionStatus(
            connection.status
          ) === "accepted"
      )
      .map(connection =>
        connection.requester_id ===
        currentUserId
          ? connection.receiver_id
          : connection.requester_id
      )
  );

  const incoming = connections.filter(
    connection =>
      connection.receiver_id ===
        currentUserId &&
      normalizeConnectionStatus(
        connection.status
      ) === "pending"
  );

  const pendingOutgoingIds = new Set(
    connections
      .filter(
        connection =>
          connection.requester_id ===
            currentUserId &&
          normalizeConnectionStatus(
            connection.status
          ) === "pending"
      )
      .map(
        connection =>
          connection.receiver_id
      )
  );

  const openNetworkMessage = (
    personId: string
  ) => {
    if (
      typeof window === "undefined"
    ) {
      return;
    }

    window.sessionStorage.setItem(
      "campusconnect-open-direct-chat",
      personId
    );

    setSelectedNetworkProfileId(null);

    window.dispatchEvent(
      new CustomEvent(
        "campus-navigate",
        {
          detail: "Groups",
        }
      )
    );
  };

  const connect = async (
    personId: string
  ) => {
    const client =
      getSupabaseClient();

    if (!client || !currentUserId) {
      setStatus(
        "Sign in again to send connection requests."
      );
      return;
    }

    if (
      personId === currentUserId ||
      busyUserId
    ) {
      return;
    }

    setBusyUserId(personId);
    setStatus("");

    try {
      const existing =
        relationshipFor(personId);

      if (existing) {
        const existingStatus =
          normalizeConnectionStatus(
            existing.status
          );

        if (
          existingStatus ===
          "accepted"
        ) {
          setStatus(
            "You are already connected with this person."
          );
          return;
        }

        if (
          existingStatus ===
          "pending"
        ) {
          setStatus(
            existing.receiver_id ===
            currentUserId
              ? "This person has already sent you an invitation."
              : "Your connection request is already pending."
          );
          return;
        }

        if (
          existingStatus ===
          "blocked"
        ) {
          setStatus(
            "This connection is currently unavailable."
          );
          return;
        }

        if (
          existingStatus ===
          "rejected"
        ) {
          if (
            existing.requester_id ===
            currentUserId
          ) {
            const {
              data,
              error,
            } = await client
              .from(
                "chat_connections"
              )
              .update({
                status: "Pending",
                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                existing.id
              )
              .select(
                "id,requester_id,receiver_id,status"
              )
              .single();

            if (error) {
              throw error;
            }

            setConnections(
              current =>
                current.map(
                  connection =>
                    connection.id ===
                    existing.id
                      ? data as ConnectionRecord
                      : connection
                )
            );

            setStatus(
              "Connection request sent."
            );
            return;
          }

          const {
            error: deleteError,
          } = await client
            .from(
              "chat_connections"
            )
            .delete()
            .eq(
              "id",
              existing.id
            );

          if (deleteError) {
            throw deleteError;
          }

          setConnections(
            current =>
              current.filter(
                connection =>
                  connection.id !==
                  existing.id
              )
          );
        }
      }

      const {
        data,
        error,
      } = await client
        .from(
          "chat_connections"
        )
        .insert({
          requester_id:
            currentUserId,
          receiver_id:
            personId,
          status:
            "Pending",
        })
        .select(
          "id,requester_id,receiver_id,status"
        )
        .single();

      if (error) {
        if (
          error.code ===
          "23505"
        ) {
          setStatus(
            "A connection relationship already exists. Refresh the Network page."
          );
          return;
        }

        throw error;
      }

      setConnections(
        current => [
          ...current,
          data as ConnectionRecord,
        ]
      );

      setStatus(
        "Connection request sent."
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to send connection request."
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const respond = async (
    connectionId: string,
    nextStatus:
      | "Accepted"
      | "Rejected"
  ) => {
    const client =
      getSupabaseClient();

    if (!client) {
      setStatus(
        "Supabase is not configured."
      );
      return;
    }

    const connection =
      connections.find(
        item =>
          item.id ===
          connectionId
      );

    if (
      !connection ||
      connection.receiver_id !==
        currentUserId ||
      normalizeConnectionStatus(
        connection.status
      ) !== "pending"
    ) {
      setStatus(
        "This invitation is no longer available."
      );
      return;
    }

    setBusyUserId(
      connection.requester_id
    );

    try {
      const {
        data,
        error,
      } = await client
        .from(
          "chat_connections"
        )
        .update({
          status:
            nextStatus,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          connectionId
        )
        .select(
          "id,requester_id,receiver_id,status"
        )
        .single();

      if (error) {
        throw error;
      }

      setConnections(
        current =>
          current.map(
            item =>
              item.id ===
              connectionId
                ? data as ConnectionRecord
                : item
          )
      );

      setStatus(
        nextStatus ===
        "Accepted"
          ? "Connection accepted."
          : "Connection invitation ignored."
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to update connection."
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const findByCcId =
    async () => {
      const client =
        getSupabaseClient();

      if (!client) {
        setCcIdMessage(
          "Supabase is not configured."
        );
        return;
      }

      const value =
        ccId.trim();

      if (
        value.length < 2
      ) {
        setCcIdResult(null);
        setCcIdMessage(
          "Enter a valid CampusConnect CC ID."
        );
        return;
      }

      if (!currentUserId) {
        setCcIdResult(null);
        setCcIdMessage(
          "Sign in again to search the campus network."
        );
        return;
      }

      setCcIdSearching(true);
      setCcIdResult(null);
      setCcIdMessage("");

      try {
        const {
          data,
          error,
        } = await client.rpc(
          "search_campus_directory",
          {
            search_term:
              value,
          }
        );

        if (error) {
          throw error;
        }

        const rows =
          (data || []) as DirectorySearchPerson[];

        const exact =
          rows.find(
            row =>
              String(
                row.campus_uid ||
                  ""
              )
                .trim()
                .toLowerCase() ===
              value.toLowerCase()
          );

        if (!exact) {
          setCcIdMessage(
            "No CampusConnect member found with this CC ID."
          );
          return;
        }

        if (
          exact.id ===
          currentUserId
        ) {
          setCcIdMessage(
            "This is your own CC ID."
          );
          return;
        }

        const existingDirectoryPerson =
          people.find(
            person =>
              person.id ===
              exact.id
          );

        const person: Person =
          existingDirectoryPerson || {
            id:
              exact.id,
            full_name:
              exact.full_name,
            campus_uid:
              exact.campus_uid,
            department:
              exact.department,
            graduation_year:
              exact.graduation_year,
            role:
              exact.role as Role,
            avatar_url:
              exact.avatar_url,
            bio: "",
            skills: "",
          };

        setCcIdResult(
          person
        );

        setCcIdMessage(
          "Verified CampusConnect profile found."
        );
      } catch (error) {
        setCcIdMessage(
          error instanceof Error
            ? error.message
            : "Unable to search this CC ID."
        );
      } finally {
        setCcIdSearching(false);
      }
    };

  const normalizedQuery =
    query
      .trim()
      .toLowerCase();

  const visible =
    people.filter(
      person => {
        const searchText = [
          person.full_name,
          person.campus_uid,
          person.role,
          person.department,
          person.graduation_year,
          person.bio,
          person.skills,
        ]
          .join(" ")
          .toLowerCase();

        const matchesQuery =
          !normalizedQuery ||
          searchText.includes(
            normalizedQuery
          );

        const matchesRole =
          roleFilter ===
            "All" ||
          person.role ===
            roleFilter;

        return (
          matchesQuery &&
          matchesRole
        );
      }
    );

  const roles =
    Array.from(
      new Set(
        people
          .map(
            person =>
              person.role
          )
          .filter(Boolean)
      )
    ).sort();

  const profileSkills =
    profile.skills
      .split(",")
      .map(
        skill =>
          skill.trim()
      )
      .filter(Boolean)
      .slice(0, 5);

  return (
    <div className="linkedinNetworkPage">
      <section className="linkedinNetworkTopbar">
        <div>
          <span>
            CAMPUSCONNECT NETWORK
          </span>

          <h1>
            Build your professional campus network
          </h1>

          <p>
            Discover verified students, faculty and placement
            professionals across your campus.
          </p>
        </div>

        <div className="linkedinNetworkTopStats">
          <article>
            <strong>
              {connectedIds.size}
            </strong>
            <span>
              Connections
            </span>
          </article>

          <article>
            <strong>
              {incoming.length}
            </strong>
            <span>
              Invitations
            </span>
          </article>

          <article>
            <strong>
              {people.length}
            </strong>
            <span>
              People
            </span>
          </article>
        </div>
      </section>

      {status && (
        <div className="linkedinNetworkStatus">
          <StatusLine
            text={status}
          />
        </div>
      )}

      <div className="linkedinNetworkLayout">
        <aside className="linkedinNetworkLeft">
          <section className="linkedinProfileCard card">
            <div className="linkedinProfileCover">
              <span>CC</span>
            </div>

            <div className="linkedinProfileIdentity">
              <Avatar
                t={getInitials(
                  profile.name
                )}
                src={
                  profile.avatar_url
                }
                alt={`${profile.name} profile`}
              />

              <h2>
                {profile.name}
              </h2>

              <p>
                {profile.role}
                {profile.department
                  ? ` · ${profile.department}`
                  : ""}
              </p>

              {profile.year && (
                <small>
                  Class of{" "}
                  {profile.year}
                </small>
              )}
            </div>

            {profile.bio && (
              <p className="linkedinProfileBio">
                {profile.bio}
              </p>
            )}

            {!!profileSkills.length && (
              <div className="linkedinProfileSkills">
                {profileSkills.map(
                  skill => (
                    <span
                      key={skill}
                    >
                      {skill}
                    </span>
                  )
                )}
              </div>
            )}

            <div className="linkedinProfileMetrics">
              <div>
                <span>
                  Connections
                </span>
                <strong>
                  {connectedIds.size}
                </strong>
              </div>

              <div>
                <span>
                  Pending
                </span>
                <strong>
                  {
                    pendingOutgoingIds.size
                  }
                </strong>
              </div>
            </div>
          </section>

          <section className="linkedinCcConnect card">
            <header>
              <span>
                CONNECT DIRECTLY
              </span>

              <h3>
                Connect with CC ID
              </h3>

              <p>
                Enter a CampusConnect ID to find a verified
                member directly.
              </p>
            </header>

            <div className="linkedinCcSearch">
              <input
                value={ccId}
                onChange={event => {
                  setCcId(
                    event.target.value
                      .toUpperCase()
                      .replace(
                        /\s+/g,
                        ""
                      )
                  );

                  setCcIdResult(
                    null
                  );

                  setCcIdMessage(
                    ""
                  );
                }}
                onKeyDown={event => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();
                    void findByCcId();
                  }
                }}
                placeholder="CC-FBF14465"
                autoComplete="off"
                spellCheck={false}
                aria-label="CampusConnect CC ID"
              />

              <button
                type="button"
                disabled={
                  ccIdSearching ||
                  ccId.trim()
                    .length < 2
                }
                onClick={() =>
                  void findByCcId()
                }
              >
                {ccIdSearching
                  ? "Finding…"
                  : "Find"}
              </button>
            </div>

            {ccIdMessage && (
              <small className="linkedinCcMessage">
                {ccIdMessage}
              </small>
            )}

            {ccIdResult && (() => {
              const relationship =
                relationshipFor(
                  ccIdResult.id
                );

              const relationshipStatus =
                relationship
                  ? normalizeConnectionStatus(
                      relationship.status
                    )
                  : "";

              const incomingRequest =
                relationshipStatus ===
                  "pending" &&
                relationship?.receiver_id ===
                  currentUserId;

              const outgoingRequest =
                relationshipStatus ===
                  "pending" &&
                relationship?.requester_id ===
                  currentUserId;

              const connected =
                relationshipStatus ===
                "accepted";

              const busy =
                busyUserId ===
                ccIdResult.id;

              return (
                <article className="linkedinCcResult">
                  <Avatar
                    t={getInitials(
                      ccIdResult.full_name
                    )}
                    src={
                      ccIdResult.avatar_url ||
                      undefined
                    }
                    alt={`${ccIdResult.full_name} profile`}
                  />

                  <div className="linkedinCcResultInfo">
                    <div>
                      <b>
                        {
                          ccIdResult.full_name
                        }

                        <span title="Verified CampusConnect profile">
                          ✓
                        </span>
                      </b>

                      <small>
                        {
                          ccIdResult.role
                        }
                        {ccIdResult.department
                          ? ` · ${ccIdResult.department}`
                          : ""}
                      </small>

                      <strong>
                        {
                          ccIdResult.campus_uid
                        }
                      </strong>
                    </div>

                    {connected ? (
                      <button
                        type="button"
                        className="linkedinConnectedButton"
                        disabled
                      >
                        ✓ Connected
                      </button>
                    ) : incomingRequest &&
                      relationship ? (
                      <button
                        type="button"
                        className="linkedinPrimaryButton"
                        disabled={busy}
                        onClick={() =>
                          void respond(
                            relationship.id,
                            "Accepted"
                          )
                        }
                      >
                        {busy
                          ? "Accepting…"
                          : "Accept"}
                      </button>
                    ) : outgoingRequest ? (
                      <button
                        type="button"
                        className="linkedinPendingButton"
                        disabled
                      >
                        ✓ Pending
                      </button>
                    ) : relationshipStatus ===
                      "blocked" ? (
                      <button
                        type="button"
                        className="linkedinPendingButton"
                        disabled
                      >
                        Unavailable
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="linkedinPrimaryButton"
                        disabled={busy}
                        onClick={() =>
                          void connect(
                            ccIdResult.id
                          )
                        }
                      >
                        {busy
                          ? "Sending…"
                          : "+ Connect"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })()}
          </section>

          <section className="linkedinNetworkMenu card">
            <header>
              <span>
                MY NETWORK
              </span>
            </header>

            <div>
              <p>
                <span className="linkedinMenuIcon">
                  ◎
                </span>
                <b>
                  Connections
                </b>
                <strong>
                  {connectedIds.size}
                </strong>
              </p>

              <p>
                <span className="linkedinMenuIcon">
                  ↗
                </span>
                <b>
                  Sent requests
                </b>
                <strong>
                  {
                    pendingOutgoingIds.size
                  }
                </strong>
              </p>

              <p>
                <span className="linkedinMenuIcon">
                  ✦
                </span>
                <b>
                  Invitations
                </b>
                <strong>
                  {incoming.length}
                </strong>
              </p>
            </div>
          </section>
        </aside>

        <main className="linkedinNetworkMain">
          <nav className="linkedinNetworkTabs card" aria-label="Network sections">
            <button
              type="button"
              className={networkTab === "Feed" ? "active" : ""}
              onClick={() => setNetworkTab("Feed")}
            >
              <span>Home</span>
              <small>Professional feed</small>
            </button>

            <button
              type="button"
              className={networkTab === "Discover" ? "active" : ""}
              onClick={() => setNetworkTab("Discover")}
            >
              <span>My Network</span>
              <small>Discover people</small>
            </button>
          </nav>

          {networkTab === "Feed" ? (
            <section className="linkedinProfessionalFeed">
              <NetworkProfessionalFeed
                profile={{
                  name: profile.name,
                  role: profile.role,
                  department: profile.department,
                  campus_uid: profile.campus_uid,
                  avatar_url: profile.avatar_url,
                }}
              />
            </section>
          ) : (
            <>
<section className="linkedinNetworkSearch card">
            <div className="linkedinNetworkSearchHeading">
              <div>
                <span>
                  DISCOVER
                </span>

                <h2>
                  People you may know
                </h2>

                <p>
                  Search by name, CC ID, department,
                  role or skill.
                </p>
              </div>

              <strong>
                {visible.length} result
                {visible.length === 1
                  ? ""
                  : "s"}
              </strong>
            </div>

            <div className="linkedinSearchInput">
              <span>⌕</span>

              <input
                value={query}
                onChange={event =>
                  setQuery(
                    event.target.value
                  )
                }
                placeholder="Search people, skills, UID or departments"
              />

              {query && (
                <button
                  type="button"
                  onClick={() =>
                    setQuery("")
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="linkedinRoleFilters">
              <button
                type="button"
                className={
                  roleFilter ===
                  "All"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setRoleFilter(
                    "All"
                  )
                }
              >
                All
              </button>

              {roles.map(
                role => (
                  <button
                    type="button"
                    key={role}
                    className={
                      roleFilter ===
                      role
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setRoleFilter(
                        role
                      )
                    }
                  >
                    {role}
                  </button>
                )
              )}
            </div>
          </section>

          <section className="linkedinPeopleGrid">
            {loading ? (
              <section className="linkedinNetworkEmpty card">
                <div className="linkedinNetworkLoader"/>

                <h3>
                  Loading your campus network
                </h3>

                <p>
                  Reading verified CampusConnect profiles.
                </p>
              </section>
            ) : (
              visible.map(
                person => {
                  const relationship =
                    relationshipFor(
                      person.id
                    );

                  const relationshipStatus =
                    relationship
                      ? normalizeConnectionStatus(
                          relationship.status
                        )
                      : "";

                  const connected =
                    relationshipStatus ===
                    "accepted";

                  const outgoing =
                    relationshipStatus ===
                      "pending" &&
                    relationship?.requester_id ===
                      currentUserId;

                  const incomingRequest =
                    relationshipStatus ===
                      "pending" &&
                    relationship?.receiver_id ===
                      currentUserId;

                  const busy =
                    busyUserId ===
                    person.id;

                  const skills =
                    person.skills
                      .split(",")
                      .map(
                        skill =>
                          skill.trim()
                      )
                      .filter(Boolean)
                      .slice(0, 3);

                  return (
                    <article
                      className="linkedinPersonCard card linkedinPersonCardClickable"
                      key={person.id}
                      onClick={() =>
                        setSelectedNetworkProfileId(
                          person.id
                        )
                      }
                    >
                      <div className="linkedinPersonCover">
                        <span>
                          {person.department ||
                            "CampusConnect"}
                        </span>
                      </div>

                      <div className="linkedinPersonBody">
                        <button
                          type="button"
                          className="linkedinPersonAvatar networkProfileTrigger"
                          onClick={() =>
                            setSelectedNetworkProfileId(
                              person.id
                            )
                          }
                          aria-label={`View ${person.full_name} profile`}
                        >
                          <Avatar
                            t={getInitials(
                              person.full_name
                            )}
                            src={
                              person.avatar_url ||
                              undefined
                            }
                            alt={`${person.full_name} profile`}
                          />
                        </button>

                        <div className="linkedinPersonHeading">
                          <button
                            type="button"
                            className="networkProfileNameButton"
                            onClick={() =>
                              setSelectedNetworkProfileId(
                                person.id
                              )
                            }
                          >
                            <h3>
                              {person.full_name ||
                                "Campus member"}

                              <span title="Verified CampusConnect profile">
                                ✓
                              </span>
                            </h3>
                          </button>

                          <p>
                            {person.role}
                            {person.department
                              ? ` · ${person.department}`
                              : ""}
                          </p>

                          {person.graduation_year && (
                            <small>
                              Class of{" "}
                              {
                                person.graduation_year
                              }
                            </small>
                          )}

                          {person.campus_uid && (
                            <small>
                              {
                                person.campus_uid
                              }
                            </small>
                          )}
                        </div>

                        <p className="linkedinPersonBio">
                          {person.bio ||
                            "CampusConnect member building their professional campus network."}
                        </p>

                        {!!skills.length && (
                          <div className="linkedinPersonSkills">
                            {skills.map(
                              skill => (
                                <span
                                  key={skill}
                                >
                                  {skill}
                                </span>
                              )
                            )}
                          </div>
                        )}

                        <div
                          className="linkedinPersonActions"
                          onClick={event =>
                            event.stopPropagation()
                          }
                        >
                          {connected ? (
                            <button
                              type="button"
                              className="linkedinConnectedButton"
                              disabled
                            >
                              ✓ Connected
                            </button>
                          ) : incomingRequest &&
                            relationship ? (
                            <>
                              <button
                                type="button"
                                className="linkedinSecondaryButton"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  void respond(
                                    relationship.id,
                                    "Rejected"
                                  )
                                }
                              >
                                Ignore
                              </button>

                              <button
                                type="button"
                                className="linkedinPrimaryButton"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  void respond(
                                    relationship.id,
                                    "Accepted"
                                  )
                                }
                              >
                                {busy
                                  ? "Accepting…"
                                  : "Accept"}
                              </button>
                            </>
                          ) : outgoing ? (
                            <button
                              type="button"
                              className="linkedinPendingButton"
                              disabled
                            >
                              ✓ Pending
                            </button>
                          ) : relationshipStatus ===
                            "blocked" ? (
                            <button
                              type="button"
                              className="linkedinPendingButton"
                              disabled
                            >
                              Unavailable
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="linkedinPrimaryButton"
                              disabled={
                                busy
                              }
                              onClick={() =>
                                void connect(
                                  person.id
                                )
                              }
                            >
                              {busy
                                ? "Sending…"
                                : "+ Connect"}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )
            )}

            {!loading &&
              !visible.length && (
                <section className="linkedinNetworkEmpty card">
                  <span>⌕</span>
                  <h3>
                    No people found
                  </h3>
                  <p>
                    Try another search or role filter.
                  </p>
                </section>
              )}
          </section>
            </>
          )}
        </main>

        <aside className="linkedinNetworkRight">
          <section className="linkedinInvitationCard card">
            <header>
              <div>
                <span>
                  INVITATIONS
                </span>

                <h3>
                  Connection requests
                </h3>
              </div>

              <strong>
                {incoming.length}
              </strong>
            </header>

            {incoming.length ? (
              <div className="linkedinInvitations">
                {incoming
                  .slice(0, 5)
                  .map(
                    request => {
                      const person =
                        people.find(
                          item =>
                            item.id ===
                            request.requester_id
                        );

                      const busy =
                        busyUserId ===
                        request.requester_id;

                      return (
                        <article
                          key={
                            request.id
                          }
                        >
                          <Avatar
                            t={getInitials(
                              person?.full_name ||
                                "User"
                            )}
                            src={
                              person?.avatar_url ||
                              undefined
                            }
                            alt={`${
                              person?.full_name ||
                              "Campus member"
                            } profile`}
                          />

                          <div>
                            <b>
                              {person?.full_name ||
                                "Campus member"}
                            </b>

                            <small>
                              {person?.role ||
                                "Student"}
                              {person?.department
                                ? ` · ${person.department}`
                                : ""}
                            </small>

                            <div>
                              <button
                                type="button"
                                className="linkedinSecondaryButton"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  void respond(
                                    request.id,
                                    "Rejected"
                                  )
                                }
                              >
                                Ignore
                              </button>

                              <button
                                type="button"
                                className="linkedinPrimaryButton"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  void respond(
                                    request.id,
                                    "Accepted"
                                  )
                                }
                              >
                                {busy
                                  ? "Accepting…"
                                  : "Accept"}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
              </div>
            ) : (
              <div className="linkedinNoInvitations">
                <span>✓</span>
                <b>
                  You're all caught up
                </b>
                <p>
                  New connection invitations will appear here.
                </p>
              </div>
            )}
          </section>

          <section className="linkedinNetworkInfo card">
            <span>
              CAMPUSCONNECT
            </span>

            <h3>
              Professional campus networking
            </h3>

            <p>
              Build real relationships around academics,
              projects, mentorship and placements.
            </p>

            <div>
              <span>
                Verified profiles
              </span>
              <span>
                Campus-only network
              </span>
              <span>
                Messenger-compatible connections
              </span>
            </div>
          </section>
        </aside>
      </div>
    {selectedNetworkProfileId && (
      <NetworkProfileModal
        key={selectedNetworkProfileId}
        userId={selectedNetworkProfileId}
        connectionStatus={(() => {
          const relationship =
            relationshipFor(
              selectedNetworkProfileId
            );

          if (!relationship) {
            return "none";
          }

          const state =
            normalizeConnectionStatus(
              relationship.status
            );

          if (
            state === "accepted" ||
            state === "pending" ||
            state === "blocked"
          ) {
            return state;
          }

          return "none";
        })()}
        incomingRequest={(() => {
          const relationship =
            relationshipFor(
              selectedNetworkProfileId
            );

          return Boolean(
            relationship &&
            normalizeConnectionStatus(
              relationship.status
            ) === "pending" &&
            relationship.receiver_id ===
              currentUserId
          );
        })()}
        busy={
          busyUserId ===
          selectedNetworkProfileId
        }
        onConnect={() =>
          connect(
            selectedNetworkProfileId
          )
        }
        onAccept={async () => {
          const relationship =
            relationshipFor(
              selectedNetworkProfileId
            );

          if (!relationship) {
            return;
          }

          await respond(
            relationship.id,
            "Accepted"
          );
        }}
        onIgnore={async () => {
          const relationship =
            relationshipFor(
              selectedNetworkProfileId
            );

          if (!relationship) {
            return;
          }

          await respond(
            relationship.id,
            "Rejected"
          );
        }}
        onMessage={() =>
          openNetworkMessage(
            selectedNetworkProfileId
          )
        }
        onClose={() =>
          setSelectedNetworkProfileId(null)
        }
      />
    )}

    </div>
  );
}

type GuardianContact = {
  guardian_name: string;
  relationship: string;
  email: string;
  phone: string;
  sms_enabled: boolean;
  email_enabled: boolean;
};

const emptyGuardianContact: GuardianContact = {
  guardian_name: "",
  relationship: "Parent",
  email: "",
  phone: "",
  sms_enabled: true,
  email_enabled: true,
};


function FacultyDepartmentLabel({
  fallback,
}: {
  fallback: string;
}) {

  const [
    departments,
    setDepartments,
  ] = useState<string[]>([]);


  useEffect(() => {

    let active = true;

    const client =
      getSupabaseClient();

    if (!client) {
      return;
    }


    void client.auth
      .getUser()
      .then(async ({
        data: auth,
      }) => {

        if (
          !active ||
          !auth.user
        ) {
          return;
        }


        const {
          data,
          error,
        } = await client
          .from(
            "faculty_department_assignments"
          )
          .select(
            "department"
          )
          .eq(
            "faculty_id",
            auth.user.id
          )
          .order(
            "department",
            {
              ascending: true,
            }
          );


        if (
          !active ||
          error
        ) {
          return;
        }


        setDepartments(
          (
            data || []
          ).map(
            row =>
              String(
                row.department
              )
          )
        );

      });


    return () => {

      active = false;

    };

  }, []);


  return (
    <>
      {departments.length
        ? departments.join(
            " • "
          )
        : fallback ||
          "Not assigned"}
    </>
  );

}


function ProfilePage({profile, onProfileChange, onSignOut}: {profile: Profile; onProfileChange: (profile: Profile) => void; onSignOut: () => Promise<void> | void}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [guardian, setGuardian] =
    useState<GuardianContact>(
      emptyGuardianContact
    );

  const [guardianLoading, setGuardianLoading] =
    useState(
      profile.role === "Student"
    );

  const [guardianSaving, setGuardianSaving] =
    useState(false);

  const [guardianEditing, setGuardianEditing] =
    useState(false);

  const [guardianMessage, setGuardianMessage] =
    useState("");

  const [guardianError, setGuardianError] =
    useState("");

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  useEffect(() => {
    if (
      profile.role !== "Student"
    ) {
      setGuardianLoading(false);
      return;
    }

    let active = true;

    const loadGuardian =
      async () => {
        const client =
          getSupabaseClient();

        if (!client) {
          if (active) {
            setGuardianError(
              "Supabase is not connected."
            );

            setGuardianLoading(false);
          }

          return;
        }

        setGuardianLoading(true);
        setGuardianError("");

        try {
          const {
            data: auth,
            error: authError,
          } =
            await client.auth
              .getUser();

          if (
            authError ||
            !auth.user
          ) {
            throw new Error(
              "Your session has expired. Please sign in again."
            );
          }

          const {
            data,
            error: loadError,
          } =
            await client
              .from(
                "student_guardian_contacts"
              )
              .select(
                "guardian_name,relationship,email,phone,sms_enabled,email_enabled"
              )
              .eq(
                "student_id",
                auth.user.id
              )
              .maybeSingle();

          if (loadError) {
            throw loadError;
          }

          if (!active) {
            return;
          }

          if (data) {
            setGuardian({
              guardian_name:
                data.guardian_name || "",

              relationship:
                data.relationship ||
                "Parent",

              email:
                data.email || "",

              phone:
                data.phone || "",

              sms_enabled:
                data.sms_enabled !==
                false,

              email_enabled:
                data.email_enabled !==
                false,
            });
          } else {
            setGuardian({
              ...emptyGuardianContact,
            });

            setGuardianEditing(true);
          }

        } catch (loadError) {
          if (!active) {
            return;
          }

          setGuardianError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load guardian contact."
          );
        } finally {
          if (active) {
            setGuardianLoading(false);
          }
        }
      };

    void loadGuardian();

    return () => {
      active = false;
    };
  }, [profile.role]);

  const saveGuardian =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        profile.role !== "Student"
      ) {
        return;
      }

      const guardianName =
        guardian.guardian_name.trim();

      const relationship =
        guardian.relationship.trim() ||
        "Parent";

      const email =
        guardian.email
          .trim()
          .toLowerCase();

      const phone =
        guardian.phone.trim();

      if (!guardianName) {
        setGuardianError(
          "Enter the parent or guardian name."
        );
        return;
      }

      if (
        guardian.email_enabled &&
        !email
      ) {
        setGuardianError(
          "Guardian email is required while email alerts are enabled."
        );
        return;
      }

      if (
        email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        setGuardianError(
          "Enter a valid guardian email address."
        );
        return;
      }

      if (
        guardian.sms_enabled &&
        !phone
      ) {
        setGuardianError(
          "Guardian mobile number is required while SMS alerts are enabled."
        );
        return;
      }

      const normalizedPhone =
        phone.replace(
          /[\s()-]/g,
          ""
        );

      if (
        phone &&
        !/^\+?[0-9]{8,15}$/.test(
          normalizedPhone
        )
      ) {
        setGuardianError(
          "Enter a valid guardian mobile number including country code when required."
        );
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        setGuardianError(
          "Supabase is not connected."
        );
        return;
      }

      setGuardianSaving(true);
      setGuardianError("");
      setGuardianMessage("");

      try {
        const {
          data: auth,
          error: authError,
        } =
          await client.auth
            .getUser();

        if (
          authError ||
          !auth.user
        ) {
          throw new Error(
            "Your session has expired. Please sign in again."
          );
        }

        const payload = {
          student_id:
            auth.user.id,

          guardian_name:
            guardianName,

          relationship,

          email,

          phone:
            normalizedPhone,

          sms_enabled:
            guardian.sms_enabled,

          email_enabled:
            guardian.email_enabled,

          updated_at:
            new Date()
              .toISOString(),
        };

        const {
          data,
          error: saveGuardianError,
        } =
          await client
            .from(
              "student_guardian_contacts"
            )
            .upsert(
              payload,
              {
                onConflict:
                  "student_id",
              }
            )
            .select(
              "guardian_name,relationship,email,phone,sms_enabled,email_enabled"
            )
            .single();

        if (saveGuardianError) {
          throw saveGuardianError;
        }

        setGuardian({
          guardian_name:
            data.guardian_name || "",

          relationship:
            data.relationship ||
            "Parent",

          email:
            data.email || "",

          phone:
            data.phone || "",

          sms_enabled:
            data.sms_enabled !==
            false,

          email_enabled:
            data.email_enabled !==
            false,
        });

        setGuardianEditing(false);

        setGuardianMessage(
          "Guardian contact saved successfully."
        );

      } catch (saveError) {
        setGuardianError(
          saveError instanceof Error
            ? saveError.message
            : "Unable to save guardian contact."
        );
      } finally {
        setGuardianSaving(false);
      }
    };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client) return setError("Supabase is not connected.");
    setSaving(true); setError(""); setMessage("");
    try {
      const {data: auth} = await client.auth.getUser();
      if (!auth.user) throw new Error("Your session has expired. Please sign in again.");
      const {data, error: saveError} = await client.from("profiles").update({
        full_name: form.name.trim(), department: profile.role === "Main Admin" ? form.department.trim() : profile.department.trim(), graduation_year:
          profile.role === "Student"
            ? form.year.trim()
            : profile.year.trim(),
        bio: form.bio.trim(), skills: form.skills.trim(), phone: form.phone.trim(),  updated_at: new Date().toISOString(),
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


  return <div className="profilePage">
    <section className="profileHero card">
      <div className="profileIdentity"><Avatar t={getInitials(profile.name) || "U"} src={profile.avatar_url} alt={`${profile.name} profile`}/><div><span>YOUR CAMPUS IDENTITY</span><h2>{profile.name || "Campus user"}</h2><p>
          {profile.role}
          {" · "}
          {profile.role === "Faculty" ? (
            <FacultyDepartmentLabel
              fallback={profile.department}
            />
          ) : (
            <>
              {profile.department || "Department not set"}
              {" · "}
              {profile.year || "Year not set"}
            </>
          )}
        </p></div></div>
      <div className="profileHeroActions"><button className="ghost" onClick={() => {setForm(profile); setEditing(true); setMessage(""); setError("");}}>Edit profile</button><button className="primary" onClick={() => void onSignOut()}>Log out</button></div>
    </section>
    {message && <StatusLine text={message}/>} {error && <p className="authError" role="alert">{error}</p>}
    <div className="profileGrid">
      <section className="card profileCard"><header><div><span>PERSONAL INFORMATION</span><h3>Profile details</h3></div>{!editing && <button className="ghost" onClick={() => setEditing(true)}>Edit</button>}</header>
        {editing ? <form className="profileForm" onSubmit={save}>
          <Field label="Full name"><input value={form.name} onChange={e => setForm({...form,name:e.target.value})} required /></Field>
          <Field label="College email"><input value={profile.email} disabled /></Field>
          <div className="profileTwo"><Field label="Department">
            <input
              value={form.department}
              onChange={e =>
                setForm({
                  ...form,
                  department:
                    e.target.value,
                })
              }
              disabled={
                profile.role !==
                  "Main Admin"
              }
              title={
                profile.role === "Faculty"
                  ? "Faculty departments are managed by Main Admin."
                  : undefined
              }
            />
          </Field>{profile.role === "Student" && (
            <Field label="Graduation year"><input value={form.year} onChange={e => setForm({...form,year:e.target.value})}/></Field>
          )}</div>
          {profile.role === "Student" && (
            <Field label="USN">

              <input
                value={profile.usn}
                disabled
                title="USN is managed by Main Admin."
                placeholder="USN not assigned"
              />

              <small className="profileManagedFieldNote">
                Managed by Main Admin
              </small>

            </Field>
          )}
          <Field label="Phone"><input value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} inputMode="tel" /></Field>
          <Field label="Bio"><textarea value={form.bio} onChange={e => setForm({...form,bio:e.target.value})} maxLength={500} placeholder="A short professional introduction" /></Field>
          <Field label="Skills"><input value={form.skills} onChange={e => setForm({...form,skills:e.target.value})} placeholder="Java, Python, Embedded Systems" /></Field>
          <div className="formActions"><button type="button" className="ghost" onClick={() => {setForm(profile);setEditing(false)}}>Cancel</button><button className="primary" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button></div>
        </form> : <div className="profileDetails"><div><small>Email</small><b>{profile.email}</b></div><div><small>Phone</small><b>{profile.phone || "Not added"}</b></div>{profile.role === "Student" && (
          <div>
            <small>USN</small>
            <b>
              {profile.usn ||
                "Not assigned"}
            </b>
          </div>
        )}<div>
          <small>
            {profile.role === "Faculty"
              ? "Departments"
              : "Department"}
          </small>

          <b>
            {profile.role === "Faculty" ? (
              <FacultyDepartmentLabel
                fallback={profile.department}
              />
            ) : (
              profile.department ||
              "Not added"
            )}
          </b>
        </div>{profile.role === "Student" && (
          <div>
            <small>
              Graduation year
            </small>

            <b>
              {profile.year ||
                "Not added"}
            </b>
          </div>
        )}<div><small>Role</small><b>{profile.role}</b></div><div className="profileBio"><small>Bio</small><p>{profile.bio || "Add a short professional bio from Edit profile."}</p></div><div className="profileBio"><small>Skills</small><p>{profile.skills || "Add your skills to improve your profile and resume."}</p></div></div>}
      </section>
      {profile.role === "Student" && (
        <section className="card profileCard guardianContactCard">
          <header>
            <div>
              <span>
                ATTENDANCE NOTIFICATIONS
              </span>

              <h3>
                Parent / Guardian Contact
              </h3>
            </div>

            {!guardianLoading && (
              <span className="guardianAdminManagedBadge">
                Admin managed
              </span>
            )}
          </header>

          <p className="guardianIntro">
            This private contact is used for
            attendance alerts. Only Main Admin
            can change Parent / Guardian details.
          </p>

          {guardianMessage && (
            <StatusLine
              text={guardianMessage}
            />
          )}

          {guardianError && (
            <p
              className="authError"
              role="alert"
            >
              {guardianError}
            </p>
          )}

          {guardianLoading ? (
            <div
              className="guardianLoading"
              aria-live="polite"
            >
              Loading guardian contact...
            </div>
          ) : guardianEditing ? (
            <form
              className="profileForm guardianForm"
              onSubmit={saveGuardian}
            >
              <Field label="Guardian name">
                <input
                  value={
                    guardian.guardian_name
                  }
                  onChange={event =>
                    setGuardian(
                      current => ({
                        ...current,
                        guardian_name:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Parent or guardian name"
                  autoComplete="name"
                  required
                />
              </Field>

              <Field label="Relationship">
                <select
                  value={
                    guardian.relationship
                  }
                  onChange={event =>
                    setGuardian(
                      current => ({
                        ...current,
                        relationship:
                          event.target.value,
                      })
                    )
                  }
                >
                  <option value="Parent">
                    Parent
                  </option>

                  <option value="Father">
                    Father
                  </option>

                  <option value="Mother">
                    Mother
                  </option>

                  <option value="Guardian">
                    Guardian
                  </option>
                </select>
              </Field>

              <Field label="Guardian email">
                <input
                  type="email"
                  value={guardian.email}
                  onChange={event =>
                    setGuardian(
                      current => ({
                        ...current,
                        email:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="parent@example.com"
                  autoComplete="email"
                />
              </Field>

              <Field label="Guardian mobile">
                <input
                  type="tel"
                  inputMode="tel"
                  value={guardian.phone}
                  onChange={event =>
                    setGuardian(
                      current => ({
                        ...current,
                        phone:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="+91 9876543210"
                  autoComplete="tel"
                />
              </Field>

              <div className="guardianAlertPreferences">
                <div>
                  <strong>
                    Attendance alert preferences
                  </strong>

                  <small>
                    Choose how your guardian can
                    receive absence notifications.
                  </small>
                </div>

                <label>
                  <input
                    type="checkbox"
                    checked={
                      guardian.email_enabled
                    }
                    onChange={event =>
                      setGuardian(
                        current => ({
                          ...current,
                          email_enabled:
                            event.target.checked,
                        })
                      )
                    }
                  />

                  <span>
                    <b>
                      Email alerts
                    </b>

                    <small>
                      Email guardian when an
                      absence notification is
                      generated.
                    </small>
                  </span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={
                      guardian.sms_enabled
                    }
                    onChange={event =>
                      setGuardian(
                        current => ({
                          ...current,
                          sms_enabled:
                            event.target.checked,
                        })
                      )
                    }
                  />

                  <span>
                    <b>
                      SMS alerts
                    </b>

                    <small>
                      SMS guardian when an
                      absence notification is
                      generated.
                    </small>
                  </span>
                </label>
              </div>

              <div className="formActions">
                <button
                  type="button"
                  className="ghost"
                  disabled={guardianSaving}
                  onClick={() => {
                    setGuardianEditing(false);
                    setGuardianError("");
                    setGuardianMessage("");
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary"
                  disabled={guardianSaving}
                >
                  {guardianSaving
                    ? "Saving..."
                    : "Save guardian contact"}
                </button>
              </div>
            </form>
          ) : (
            <div className="profileDetails guardianDetails">
              <div>
                <small>
                  Guardian
                </small>

                <b>
                  {guardian.guardian_name ||
                    "Not added"}
                </b>
              </div>

              <div>
                <small>
                  Relationship
                </small>

                <b>
                  {guardian.relationship ||
                    "Not added"}
                </b>
              </div>

              <div>
                <small>
                  Email
                </small>

                <b>
                  {guardian.email ||
                    "Not added"}
                </b>
              </div>

              <div>
                <small>
                  Mobile
                </small>

                <b>
                  {guardian.phone ||
                    "Not added"}
                </b>
              </div>

              <div>
                <small>
                  Email alerts
                </small>

                <b>
                  {guardian.email_enabled
                    ? "Enabled"
                    : "Disabled"}
                </b>
              </div>

              <div>
                <small>
                  SMS alerts
                </small>

                <b>
                  {guardian.sms_enabled
                    ? "Enabled"
                    : "Disabled"}
                </b>
              </div>
            </div>
          )}
        </section>
      )}

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
        )}
        <p>
          CampusConnect authentication is handled by Supabase. Sensitive college
          credentials must only be processed by an approved server-side integration.
        </p>
      </section>
    </div>
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

  const [savingResume, setSavingResume] =
    useState(false);

  const [resumeSaveError, setResumeSaveError] =
    useState("");

  const [showJobMatcher, setShowJobMatcher] =
    useState(false);

  const [jobDescription, setJobDescription] =
    useState("");

  const [targetRole, setTargetRole] =
    useState("");

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

  /*
   * Persist the ORIGINAL Resume builder.
   *
   * resume_builder_data stores every field used by this
   * existing UI without changing its layout, ATS logic,
   * fonts, sections or preview.
   */
  useEffect(() => {
    let active = true;

    const loadSavedResume = async () => {
      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      try {
        const {
          data: auth,
          error: authError,
        } =
          await client.auth.getUser();

        if (
          authError ||
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
            .from("student_resumes")
            .select("resume_builder_data")
            .eq(
              "user_id",
              auth.user.id
            )
            .maybeSingle();

        if (error) {
          console.error(
            "[Resume] Load failed:",
            error
          );
          return;
        }

        if (
          active &&
          data?.resume_builder_data &&
          typeof data.resume_builder_data ===
            "object" &&
          !Array.isArray(
            data.resume_builder_data
          )
        ) {
          setResumeData(current => ({
            ...current,
            ...(
              data.resume_builder_data as
                Partial<typeof current>
            ),
          }));

          setSaved(true);
        }
      } catch (error) {
        console.error(
          "[Resume] Unexpected load error:",
          error
        );
      }
    };

    void loadSavedResume();

    return () => {
      active = false;
    };
  }, []);


  const saveOriginalResume =
    async () => {
      const client =
        getSupabaseClient();

      if (!client) {
        setResumeSaveError(
          "CampusConnect is not connected to Supabase."
        );
        return;
      }

      setSavingResume(true);
      setResumeSaveError("");

      try {
        const {
          data: auth,
          error: authError,
        } =
          await client.auth.getUser();

        if (
          authError ||
          !auth.user
        ) {
          setResumeSaveError(
            "Your session has expired. Please sign in again."
          );
          return;
        }

        /*
         * Store ALL original Resume fields in JSON.
         *
         * Also synchronize the compatible fields with the
         * existing professional student_resumes columns so
         * Placement/AI features can continue reading them.
         */
        const payload = {
          user_id:
            auth.user.id,

          resume_builder_data:
            resumeData,

          phone:
            resumeData.phone,

          location:
            resumeData.city,

          college:
            resumeData.college,

          degree:
            resumeData.degree,

          graduation_year:
            resumeData.collegeEnd,

          cgpa:
            resumeData.cgpa,

          skills:
            [
              resumeData.languages,
              resumeData.tools,
              resumeData.frameworks,
              resumeData.databases,
            ]
              .filter(Boolean)
              .join(", "),

          linkedin_url:
            resumeData.linkedin,

          github_url:
            resumeData.github,

          portfolio_url:
            resumeData.portfolio,

          leetcode_url:
            resumeData.leetcode,

          updated_at:
            new Date()
              .toISOString(),
        };

        const {
          data: savedRow,
          error: saveError,
        } =
          await client
            .from("student_resumes")
            .upsert(
              payload,
              {
                onConflict:
                  "user_id",
              }
            )
            .select(
              "user_id,resume_builder_data,updated_at"
            )
            .single();

        if (
          saveError ||
          !savedRow
        ) {
          console.error(
            "[Resume] Save failed:",
            saveError
          );

          setResumeSaveError(
            saveError?.message ||
            "Resume could not be saved."
          );

          return;
        }

        /*
         * Verify the exact builder data can immediately
         * be read back from Supabase.
         */
        const {
          data: verified,
          error: verifyError,
        } =
          await client
            .from("student_resumes")
            .select(
              "resume_builder_data"
            )
            .eq(
              "user_id",
              auth.user.id
            )
            .single();

        if (
          verifyError ||
          !verified
        ) {
          console.error(
            "[Resume] Verification failed:",
            verifyError
          );

          setResumeSaveError(
            "Resume was saved but could not be verified."
          );

          return;
        }

        const persistedData =
          verified.resume_builder_data as
            Partial<typeof resumeData> | null;

        if (
          !persistedData ||
          typeof persistedData !== "object"
        ) {
          console.error(
            "[Resume] Saved resume data is missing."
          );

          setResumeSaveError(
            "Resume was saved but could not be verified."
          );

          return;
        }

        const resumeKeys =
          Object.keys(
            resumeData
          ) as Array<
            keyof typeof resumeData
          >;

        const mismatchedFields =
          resumeKeys.filter(
            key =>
              String(
                persistedData[key] ?? ""
              ) !==
              String(
                resumeData[key] ?? ""
              )
          );

        if (
          mismatchedFields.length > 0
        ) {
          console.error(
            "[Resume] Saved data verification mismatch:",
            mismatchedFields
          );

          setResumeSaveError(
            "Resume was not saved completely. Please try again."
          );

          return;
        }

        setSaved(true);

        /*
         * Saving must never artificially change ATS quality.
         * ATS is calculated only from the actual resume content.
         */

      } catch (error) {
        console.error(
          "[Resume] Unexpected save error:",
          error
        );

        setResumeSaveError(
          "Unable to save your resume right now."
        );

      } finally {
        setSavingResume(false);
      }
    };


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
        "width=1000,height=1200"
      );

    if (!printWindow) {
      window.alert(
        "Please allow pop-ups to export your resume."
      );
      return;
    }

    /*
     * Read the CSS rules that are ACTUALLY active in
     * CampusConnect instead of copying stylesheet <link>
     * elements into about:blank.
     *
     * This keeps the exported resume visually identical
     * to the on-screen resume preview.
     */
    const applicationCss =
      Array.from(
        document.styleSheets
      )
        .map(styleSheet => {
          try {
            return Array.from(
              styleSheet.cssRules
            )
              .map(
                rule =>
                  rule.cssText
              )
              .join("\n");
          } catch {
            /*
             * Ignore inaccessible third-party stylesheets.
             * CampusConnect's own stylesheet is same-origin
             * and can be serialized normally.
             */
            return "";
          }
        })
        .filter(Boolean)
        .join("\n");

    /*
     * Clone only the resume document.
     * No dashboard, sidebar, floating actions or editor UI
     * are copied into the export window.
     */
    const resumeHtml =
      resume.outerHTML;

    printWindow.document.open();

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
>

<title>Resume</title>

<style>
${applicationCss}

/* ======================================================
   CAMPUSCONNECT — CLEAN A4 RESUME EXPORT
   ====================================================== */

* {
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  margin: 0 !important;
  padding: 0 !important;

  background: #ffffff !important;

  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

body {
  display: block !important;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  color: #111827 !important;
}

#resume-export-root {
  display: block !important;

  width: 210mm !important;
  min-height: 297mm !important;

  margin: 0 auto !important;
  padding: 0 !important;

  background: #ffffff !important;
}

/*
 * Override any dashboard / responsive styles that could
 * affect the cloned resume.
 */
#resume-export-root
#placementResumePaper,
#resume-export-root
.placementResumePaper {
  display: block !important;

  position: static !important;

  width: 210mm !important;
  max-width: 210mm !important;

  min-height: 297mm !important;

  margin: 0 !important;

  padding:
    11mm 13mm !important;

  border: 0 !important;
  border-radius: 0 !important;

  background: #ffffff !important;

  color: #111827 !important;

  box-shadow: none !important;

  transform: none !important;

  overflow: visible !important;
}

#resume-export-root
#placementResumePaper *,
#resume-export-root
.placementResumePaper * {
  visibility: visible !important;

  box-sizing: border-box;
}

/*
 * Header
 */
#resume-export-root
.placementResumeHeader {
  display: block !important;

  margin: 0 !important;

  padding:
    0 0 5mm !important;

  border-bottom:
    1.5px solid #1f2937 !important;
}

#resume-export-root
.placementResumeHeader h1 {
  margin:
    0 0 2.5mm !important;

  padding: 0 !important;

  color: #111827 !important;

  font-size:
    22pt !important;

  font-weight:
    750 !important;

  line-height:
    1.05 !important;

  letter-spacing:
    -.02em !important;
}

#resume-export-root
.placementResumeContacts {
  display: flex !important;

  flex-wrap: wrap !important;

  align-items: center !important;

  gap:
    1.5mm 4mm !important;

  margin: 0 !important;

  color: #374151 !important;

  font-size:
    8.5pt !important;

  line-height:
    1.35 !important;
}

#resume-export-root
.placementResumeContacts span,
#resume-export-root
.placementResumeContacts a {
  display: inline !important;

  margin: 0 !important;

  color: #374151 !important;

  font-size:
    8.5pt !important;

  text-decoration:
    none !important;
}

#resume-export-root
.placementResumeContacts a {
  color:
    #1f4f99 !important;
}

/*
 * Resume sections
 */
#resume-export-root
.rsection,
#resume-export-root
.resumePrintSection {
  margin:
    5mm 0 0 !important;

  padding: 0 !important;
}

#resume-export-root
.rsection > h4,
#resume-export-root
.resumePrintSection > h4 {
  margin:
    0 0 2.5mm !important;

  padding:
    0 0 1.4mm !important;

  border-bottom:
    .6px solid #cfd5dd !important;

  color: #1f2937 !important;

  font-size:
    9pt !important;

  font-weight:
    800 !important;

  line-height:
    1.2 !important;

  letter-spacing:
    .08em !important;

  text-transform:
    uppercase !important;
}

/*
 * General resume typography
 */
#resume-export-root p {
  margin:
    1.2mm 0 !important;

  color:
    #303741 !important;

  font-size:
    8.5pt !important;

  line-height:
    1.42 !important;
}

#resume-export-root b,
#resume-export-root strong {
  color:
    #161b22 !important;
}

#resume-export-root small {
  font-size:
    8pt !important;

  line-height:
    1.35 !important;
}

/*
 * Education / Experience rows
 */
#resume-export-root
.resumePreviewRow {
  display: flex !important;

  flex-direction: row !important;

  justify-content:
    space-between !important;

  align-items:
    flex-start !important;

  gap:
    8mm !important;

  margin: 0 !important;
}

#resume-export-root
.resumePreviewRow > div {
  min-width: 0 !important;
}

#resume-export-root
.resumePreviewRow > div:last-child {
  flex: 0 0 auto !important;

  text-align:
    right !important;
}

#resume-export-root
.resumePreviewRow b {
  font-size:
    9pt !important;
}

#resume-export-root
.resumePreviewRow strong {
  display: block !important;

  font-size:
    8.5pt !important;
}

#resume-export-root
.resumePreviewRow small {
  display: block !important;

  margin-top:
    .8mm !important;

  color:
    #59616c !important;

  font-size:
    7.8pt !important;
}

/*
 * Projects
 */
#resume-export-root
.resumeProjectPreview,
#resume-export-root
.resumeProjectBlock {
  margin:
    0 0 3mm !important;

  break-inside:
    avoid !important;

  page-break-inside:
    avoid !important;
}

#resume-export-root
.resumeProjectPreview > div {
  display: flex !important;

  justify-content:
    space-between !important;

  align-items:
    baseline !important;

  gap:
    5mm !important;
}

#resume-export-root
.resumeProjectPreview b {
  font-size:
    9pt !important;
}

#resume-export-root
.resumeProjectPreview small {
  color:
    #53657d !important;

  font-size:
    7.8pt !important;
}

/*
 * Bullets
 */
#resume-export-root ul {
  margin:
    1.5mm 0 2.5mm 5mm !important;

  padding:
    0 !important;
}

#resume-export-root li {
  margin:
    .9mm 0 !important;

  padding-left:
    1mm !important;

  color:
    #303741 !important;

  font-size:
    8.4pt !important;

  line-height:
    1.4 !important;
}

/*
 * Skills
 */
#resume-export-root
.professionalSkillList {
  display: flex !important;

  flex-wrap: wrap !important;

  gap:
    1mm 4mm !important;
}

#resume-export-root
.professionalSkillList span {
  color:
    #303741 !important;

  font-size:
    8.2pt !important;

  font-weight:
    600 !important;
}

#resume-export-root
.resumePreserveLines {
  white-space:
    pre-line !important;
}

/*
 * Links
 */
#resume-export-root a {
  color:
    inherit !important;

  text-decoration:
    none !important;
}

/*
 * Keep logical blocks together where possible.
 */
#resume-export-root
.resumeEducationRow,
#resume-export-root
.resumeExperienceHead,
#resume-export-root
.resumeProjectBlock,
#resume-export-root
.resumeProjectPreview {
  break-inside:
    avoid !important;

  page-break-inside:
    avoid !important;
}


/* ======================================================
   PRINT
   ====================================================== */

@page {
  size: A4;
  margin: 0;
}

@media print {

  html,
  body {
    width:
      210mm !important;

    margin:
      0 !important;

    padding:
      0 !important;

    background:
      #ffffff !important;
  }

  body * {
    visibility:
      visible !important;
  }

  #resume-export-root {
    width:
      210mm !important;

    margin:
      0 !important;
  }

  #resume-export-root
  #placementResumePaper,
  #resume-export-root
  .placementResumePaper {
    width:
      210mm !important;

    min-height:
      297mm !important;

    margin:
      0 !important;

    padding:
      11mm 13mm !important;

    border:
      0 !important;

    box-shadow:
      none !important;

    transform:
      none !important;
  }

  #resume-export-root
  .resumeProjectPreview,
  #resume-export-root
  .resumeProjectBlock,
  #resume-export-root
  .resumeEducationRow,
  #resume-export-root
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
${resumeHtml}
</main>

</body>
</html>
    `);

    printWindow.document.close();

    /*
     * Set the title safely after writing the document.
     */
    printWindow.document.title =
      `${resumeData.name.trim() || "Student"} Resume`;

    const startPrint = () => {
      window.setTimeout(
        () => {
          printWindow.focus();
          printWindow.print();
        },
        350
      );
    };

    /*
     * Wait for fonts before opening the print dialog so
     * typography does not jump while generating the PDF.
     */
    if (
      printWindow.document.fonts
    ) {
      void printWindow.document.fonts.ready
        .then(startPrint)
        .catch(startPrint);
    } else {
      startPrint();
    }
  };


  /*
   * CampusConnect ATS Readiness Engine
   * ----------------------------------
   * This is a deterministic, content-based ATS readiness
   * analyzer. It does NOT pretend to be a company's private
   * ATS algorithm.
   *
   * Score is based only on the resume currently entered by
   * the authenticated student.
   */

  const normalizeResumeText = (
    value: string
  ) =>
    value
      .replace(/\s+/g, " ")
      .trim();

  const countCsvItems = (
    value: string
  ) =>
    value
      .split(/[,;\n]/)
      .map(item => item.trim())
      .filter(Boolean)
      .length;

  const containsNumber =
    (value: string) =>
      /\b\d+(?:\.\d+)?%?\b/.test(
        value
      );

  const containsActionVerb =
    (value: string) =>
      /\b(built|developed|designed|implemented|created|engineered|deployed|optimized|integrated|automated|improved|reduced|increased|managed|led|analyzed|delivered|architected|launched|collaborated)\b/i.test(
        value
      );

  const validEmail =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      resumeData.email.trim()
    );

  const validPhone =
    resumeData.phone
      .replace(/\D/g, "")
      .length >= 10;

  const professionalLinkCount =
    [
      resumeData.linkedin,
      resumeData.github,
      resumeData.portfolio,
      resumeData.leetcode,
      resumeData.codechef,
    ].filter(
      value =>
        value.trim().length > 0
    ).length;

  const technicalSkillCount =
    [
      resumeData.languages,
      resumeData.tools,
      resumeData.frameworks,
      resumeData.databases,
    ].reduce(
      (total, value) =>
        total +
        countCsvItems(value),
      0
    );

  const projects = [
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
  ];

  const completedProjects =
    projects.filter(
      project =>
        project.title.trim() &&
        project.tech.trim() &&
        project.description
          .trim()
          .length >= 40
    );

  const strongProjectDescriptions =
    projects.filter(
      project => {
        const description =
          normalizeResumeText(
            project.description
          );

        return (
          description.length >= 70 &&
          containsActionVerb(
            description
          )
        );
      }
    );

  const quantifiedProjects =
    projects.filter(
      project =>
        containsNumber(
          project.description
        )
    );

  const experienceText =
    normalizeResumeText(
      resumeData.experienceDescription
    );

  const achievementText =
    normalizeResumeText(
      resumeData.achievements
    );

  type AtsCheck = {
    id: string;
    label: string;
    points: number;
    passed: boolean;
    suggestion: string;
  };

  const atsChecks: AtsCheck[] = [
    {
      id: "identity",
      label:
        "Complete professional identity",
      points: 6,
      passed:
        resumeData.name
          .trim()
          .length >= 3 &&
        validEmail &&
        validPhone &&
        resumeData.city
          .trim()
          .length >= 2,
      suggestion:
        "Complete your name, professional email, phone number and location.",
    },

    {
      id: "links",
      label:
        "Professional links",
      points: 6,
      passed:
        Boolean(
          resumeData.github
            .trim()
        ) &&
        professionalLinkCount >= 2,
      suggestion:
        "Add GitHub plus LinkedIn, portfolio or a coding profile.",
    },

    {
      id: "education",
      label:
        "Complete education",
      points: 9,
      passed:
        Boolean(
          resumeData.college
            .trim() &&
          resumeData.degree
            .trim() &&
          resumeData.collegeStart
            .trim() &&
          resumeData.collegeEnd
            .trim()
        ),
      suggestion:
        "Add college, degree and complete education dates.",
    },

    {
      id: "academic-score",
      label:
        "Academic score",
      points: 4,
      passed:
        Boolean(
          resumeData.cgpa
            .trim()
        ),
      suggestion:
        "Add your CGPA if it strengthens your application.",
    },

    {
      id: "projects",
      label:
        "Strong project portfolio",
      points: 14,
      passed:
        completedProjects.length >= 2,
      suggestion:
        "Add at least two complete technical projects with title, stack and meaningful descriptions.",
    },

    {
      id: "project-writing",
      label:
        "Action-oriented project writing",
      points: 8,
      passed:
        strongProjectDescriptions.length >= 2,
      suggestion:
        "Start project bullets with action verbs such as Built, Developed, Designed, Implemented or Deployed.",
    },

    {
      id: "project-impact",
      label:
        "Measurable project impact",
      points: 8,
      passed:
        quantifiedProjects.length >= 1,
      suggestion:
        "Add measurable impact to at least one project: users, modules, APIs, accuracy, latency, time saved or another defensible number.",
    },

    {
      id: "skills",
      label:
        "Technical skills depth",
      points: 12,
      passed:
        technicalSkillCount >= 10 &&
        Boolean(
          resumeData.languages
            .trim()
        ),
      suggestion:
        "Add relevant languages, frameworks, tools and databases. Aim for 10+ genuine technical skills.",
    },

    {
      id: "coursework",
      label:
        "Relevant coursework",
      points: 5,
      passed:
        countCsvItems(
          resumeData.coursework
        ) >= 4,
      suggestion:
        "Add four or more role-relevant subjects such as DSA, OOP, DBMS and Computer Networks.",
    },

    {
      id: "experience",
      label:
        "Experience / technical work",
      points: 8,
      passed:
        Boolean(
          resumeData.experienceTitle
            .trim()
        ) &&
        experienceText.length >= 60 &&
        containsActionVerb(
          experienceText
        ),
      suggestion:
        "Describe your experience or serious project work using action-oriented, specific responsibilities.",
    },

    {
      id: "experience-impact",
      label:
        "Experience impact",
      points: 5,
      passed:
        experienceText.length >= 60 &&
        containsNumber(
          experienceText
        ),
      suggestion:
        "Where truthful, quantify the scale or outcome of your experience.",
    },

    {
      id: "achievements",
      label:
        "Meaningful achievements",
      points: 6,
      passed:
        achievementText.length >= 50,
      suggestion:
        "Add concise achievements that demonstrate engineering, leadership or measurable outcomes.",
    },

    {
      id: "certifications",
      label:
        "Relevant certification",
      points: 3,
      passed:
        resumeData.certifications
          .trim()
          .length >= 5,
      suggestion:
        "Add only certifications you actually completed. This section is optional.",
    },

    {
      id: "engagement",
      label:
        "Leadership / engagement",
      points: 3,
      passed:
        resumeData.engagement
          .trim()
          .length >= 30,
      suggestion:
        "Add relevant leadership, technical community or social engagement if applicable.",
    },

    {
      id: "ats-structure",
      label:
        "ATS-safe structure",
      points: 3,
      passed:
        Boolean(
          resumeData.name
            .trim() &&
          resumeData.college
            .trim() &&
          resumeData.languages
            .trim() &&
          completedProjects.length >= 1
        ),
      suggestion:
        "Keep standard headings such as Education, Projects, Technical Skills and Experience.",
    },
  ];

  const ats =
    Math.min(
      100,
      atsChecks.reduce(
        (
          total,
          check
        ) =>
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
      check =>
        check.passed
    ).length;

  const atsTotal =
    atsChecks.length;

  const atsMissing =
    atsChecks
      .filter(
        check =>
          !check.passed
      )
      .sort(
        (a, b) =>
          b.points -
          a.points
      );

  const atsStatus =
    ats >= 90
      ? "Excellent"
      : ats >= 80
      ? "Strong"
      : ats >= 70
      ? "Application ready"
      : ats >= 60
      ? "Good foundation"
      : ats >= 45
      ? "Needs improvement"
      : "Incomplete";

  const atsRecommendation =
    atsMissing.length === 0
      ? "Your resume has strong ATS readiness. Tailor keywords and project impact to each job description before applying."
      : atsMissing
          .slice(0, 2)
          .map(
            check =>
              check.suggestion
          )
          .join(" ");

  /*
   * ---------------------------------------------------------
   * JOB DESCRIPTION MATCH ANALYZER
   * ---------------------------------------------------------
   *
   * A deterministic local keyword/skill comparison.
   * It does not claim to reproduce a company's private ATS.
   */

  const resumeSearchText =
    normalizeResumeText(
      Object.values(
        resumeData
      )
        .filter(
          value =>
            typeof value === "string"
        )
        .join(" ")
    )
      .toLowerCase();

  const normalizedJobDescription =
    normalizeResumeText(
      jobDescription
    )
      .toLowerCase();

  const jobSkillDictionary = [
    "javascript",
    "typescript",
    "java",
    "python",
    "c++",
    "c",
    "sql",
    "html",
    "css",
    "react",
    "next.js",
    "nextjs",
    "vite",
    "node.js",
    "nodejs",
    "express",
    "flask",
    "fastapi",
    "django",
    "spring boot",
    "tailwind",
    "bootstrap",
    "postgresql",
    "postgres",
    "mysql",
    "mongodb",
    "sqlite",
    "redis",
    "supabase",
    "firebase",
    "aws",
    "azure",
    "gcp",
    "cloudflare",
    "docker",
    "kubernetes",
    "git",
    "github",
    "linux",
    "rest api",
    "restful api",
    "graphql",
    "microservices",
    "system design",
    "data structures",
    "algorithms",
    "dsa",
    "oop",
    "object oriented programming",
    "dbms",
    "computer networks",
    "operating systems",
    "machine learning",
    "deep learning",
    "artificial intelligence",
    "pandas",
    "numpy",
    "scikit-learn",
    "tensorflow",
    "pytorch",
    "matlab",
    "verilog",
    "vhdl",
    "fpga",
    "embedded systems",
    "esp32",
    "stm32",
    "arduino",
    "iot",
    "uart",
    "spi",
    "i2c",
    "vlsi",
    "digital electronics",
    "signal processing",
    "communication systems",
    "agile",
    "scrum",
    "testing",
    "unit testing",
    "ci/cd",
    "problem solving",
    "communication",
    "leadership",
    "teamwork",
  ];

  const normalizeMatchKeyword = (
    value: string
  ) =>
    value
      .toLowerCase()
      .replace(
        /[^a-z0-9+#.\-/ ]/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  const containsKeyword = (
    source: string,
    keyword: string
  ) => {
    const cleanSource =
      normalizeMatchKeyword(
        source
      );

    const cleanKeyword =
      normalizeMatchKeyword(
        keyword
      );

    return Boolean(
      cleanKeyword &&
      cleanSource.includes(
        cleanKeyword
      )
    );
  };

  const jdSkillKeywords =
    jobDescription.trim()
      ? jobSkillDictionary
          .filter(
            keyword =>
              containsKeyword(
                normalizedJobDescription,
                keyword
              )
          )
          .filter(
            (
              keyword,
              index,
              values
            ) =>
              values.indexOf(
                keyword
              ) === index
          )
      : [];

  const stopWords =
    new Set([
      "the",
      "and",
      "for",
      "with",
      "that",
      "this",
      "from",
      "your",
      "you",
      "our",
      "are",
      "will",
      "have",
      "has",
      "who",
      "into",
      "about",
      "work",
      "working",
      "role",
      "team",
      "candidate",
      "candidates",
      "responsibilities",
      "responsibility",
      "requirements",
      "required",
      "preferred",
      "qualification",
      "qualifications",
      "experience",
      "years",
      "year",
      "skills",
      "skill",
      "knowledge",
      "strong",
      "good",
      "ability",
      "using",
      "including",
      "such",
      "other",
      "more",
      "than",
      "their",
      "they",
      "them",
      "would",
      "should",
      "must",
      "can",
      "job",
      "company",
      "position",
      "looking",
      "join",
      "based",
      "across",
      "through",
      "within",
      "etc",
    ]);

  const jdWordCounts =
    normalizedJobDescription
      .split(
        /[^a-z0-9+#.-]+/
      )
      .filter(
        word =>
          word.length >= 4 &&
          !stopWords.has(
            word
          ) &&
          !/^\d+$/.test(
            word
          )
      )
      .reduce(
        (
          map,
          word
        ) => {
          map.set(
            word,
            (
              map.get(
                word
              ) || 0
            ) + 1
          );

          return map;
        },
        new Map<string, number>()
      );

  const jdGeneralKeywords =
    Array.from(
      jdWordCounts.entries()
    )
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .map(
        ([word]) =>
          word
      )
      .filter(
        word =>
          !jdSkillKeywords.some(
            skill =>
              normalizeMatchKeyword(
                skill
              ).includes(
                word
              )
          )
      )
      .slice(
        0,
        12
      );

  const matchedJobSkills =
    jdSkillKeywords.filter(
      keyword =>
        containsKeyword(
          resumeSearchText,
          keyword
        )
    );

  const missingJobSkills =
    jdSkillKeywords.filter(
      keyword =>
        !containsKeyword(
          resumeSearchText,
          keyword
        )
    );

  const matchedGeneralKeywords =
    jdGeneralKeywords.filter(
      keyword =>
        containsKeyword(
          resumeSearchText,
          keyword
        )
    );

  const missingGeneralKeywords =
    jdGeneralKeywords.filter(
      keyword =>
        !containsKeyword(
          resumeSearchText,
          keyword
        )
    );

  const skillWeight =
    jdSkillKeywords.length * 2;

  const generalWeight =
    jdGeneralKeywords.length;

  const totalJobMatchWeight =
    skillWeight +
    generalWeight;

  const earnedJobMatchWeight =
    (
      matchedJobSkills.length *
      2
    ) +
    matchedGeneralKeywords.length;

  const jobMatchScore =
    jobDescription.trim() &&
    totalJobMatchWeight > 0
      ? Math.min(
          100,
          Math.round(
            (
              earnedJobMatchWeight /
              totalJobMatchWeight
            ) *
            100
          )
        )
      : 0;

  const jobMatchStatus =
    !jobDescription.trim()
      ? "Paste a job description"
      : jobMatchScore >= 85
      ? "Excellent match"
      : jobMatchScore >= 70
      ? "Strong match"
      : jobMatchScore >= 55
      ? "Moderate match"
      : jobMatchScore >= 35
      ? "Low match"
      : "Major skill gap";

  const jobMatchAdvice =
    !jobDescription.trim()
      ? "Paste a real job description to compare it with your current resume."
      : missingJobSkills.length > 0
      ? `Your highest-value gaps include ${missingJobSkills
          .slice(0, 4)
          .join(", ")}. Add them only if you genuinely have those skills or experience.`
      : missingGeneralKeywords.length > 0
      ? "Core technical skills match well. Improve role-specific wording where it truthfully reflects your experience."
      : "Your current resume covers the major keywords detected in this job description.";

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

              <div className="resumeAtsBreakdown">

                <div className="resumeAtsBreakdownHeader">
                  <span>
                    TOP IMPROVEMENTS
                  </span>

                  <small>
                    Recoverable points
                  </small>
                </div>

                {atsMissing.length > 0 ? (
                  <div className="resumeAtsImprovementList">

                    {atsMissing
                      .slice(0, 3)
                      .map(check => (
                        <div
                          className="resumeAtsImprovement"
                          key={check.id}
                        >
                          <strong>
                            +{check.points}
                          </strong>

                          <div>
                            <b>
                              {check.label}
                            </b>

                            <small>
                              {check.suggestion}
                            </small>
                          </div>
                        </div>
                      ))}

                  </div>
                ) : (
                  <div className="resumeAtsCompleteState">
                    <b>
                      All ATS readiness checks passed
                    </b>

                    <small>
                      Tailor keywords and impact statements to the specific job description before applying.
                    </small>
                  </div>
                )}

                <div className="resumeAtsPassedSummary">

                  <span>
                    PASSED CHECKS
                  </span>

                  <b>
                    {atsPassed}/{atsTotal}
                  </b>

                </div>

                <div className="resumeAtsPassedList">

                  {atsChecks
                    .filter(check => check.passed)
                    .slice(0, 5)
                    .map(check => (
                      <span key={check.id}>
                        <i>
                          ✓
                        </i>

                        {check.label}
                      </span>
                    ))}

                </div>

              </div>

            </div>
          </div>

          <button
            type="button"
            className="ghost"
            disabled={savingResume}
            onClick={() =>
              void saveOriginalResume()
            }
          >
            {savingResume
              ? "Saving..."
              : saved
              ? "Saved ✓"
              : "Save resume"}
          </button>

          {resumeSaveError && (
            <small
              role="alert"
              style={{
                color: "#b42318",
                maxWidth: 220,
              }}
            >
              {resumeSaveError}
            </small>
          )}

          <button
            type="button"
            className="ghost resumeJobMatchButton"
            onClick={() =>
              setShowJobMatcher(
                current =>
                  !current
              )
            }
          >
            {showJobMatcher
              ? "Close JD Match"
              : "Match Job Description"}
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


      {showJobMatcher && (
        <section className="resumeJobMatcher">

          <div className="resumeJobMatcherHeader">

            <div>
              <span>
                JOB DESCRIPTION MATCH
              </span>

              <h2>
                Tailor this resume for a specific role
              </h2>

              <p>
                Paste a real job description. CampusConnect compares its skills and recurring keywords with your current resume locally in your browser.
              </p>
            </div>

            <button
              type="button"
              className="ghost"
              onClick={() =>
                setShowJobMatcher(
                  false
                )
              }
            >
              Close
            </button>

          </div>


          <div className="resumeJobMatcherGrid">

            <div className="resumeJobInputCard">

              <label>
                Target role
                <input
                  type="text"
                  placeholder="e.g. Software Development Engineer"
                  value={targetRole}
                  onChange={event =>
                    setTargetRole(
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Job description
                <textarea
                  placeholder="Paste the complete job description here..."
                  value={jobDescription}
                  onChange={event =>
                    setJobDescription(
                      event.target.value
                    )
                  }
                />
              </label>

              <div className="resumeJobPrivacy">
                <b>
                  Local analysis
                </b>

                <span>
                  This comparison runs in your browser. The pasted job description is not saved to your resume record.
                </span>
              </div>

            </div>


            <div className="resumeJobResultCard">

              <div className="resumeJobScoreHeader">

                <div
                  className="resumeJobScoreRing"
                  style={{
                    "--job-progress":
                      `${jobMatchScore * 3.6}deg`,
                  } as CSSProperties}
                >
                  <div>
                    <strong>
                      {jobMatchScore}
                    </strong>

                    <small>
                      /100
                    </small>
                  </div>
                </div>

                <div>
                  <span>
                    JD MATCH SCORE
                  </span>

                  <h3>
                    {jobMatchStatus}
                  </h3>

                  {targetRole.trim() && (
                    <small>
                      {targetRole}
                    </small>
                  )}
                </div>

              </div>


              <p className="resumeJobAdvice">
                {jobMatchAdvice}
              </p>


              <div className="resumeJobKeywordStats">

                <article>
                  <strong>
                    {matchedJobSkills.length}
                  </strong>

                  <span>
                    skills matched
                  </span>
                </article>

                <article>
                  <strong>
                    {missingJobSkills.length}
                  </strong>

                  <span>
                    skill gaps
                  </span>
                </article>

                <article>
                  <strong>
                    {
                      matchedGeneralKeywords.length
                    }
                  </strong>

                  <span>
                    supporting keywords
                  </span>
                </article>

              </div>


              <div className="resumeJobKeywordSection">

                <div>
                  <span>
                    MATCHED SKILLS
                  </span>

                  <small>
                    Found in both JD and resume
                  </small>
                </div>

                <div className="resumeJobChips">

                  {matchedJobSkills.length > 0 ? (
                    matchedJobSkills.map(
                      skill => (
                        <span
                          className="matched"
                          key={skill}
                        >
                          ✓ {skill}
                        </span>
                      )
                    )
                  ) : (
                    <p>
                      No matched technical skills detected yet.
                    </p>
                  )}

                </div>

              </div>


              <div className="resumeJobKeywordSection">

                <div>
                  <span>
                    MISSING / REVIEW
                  </span>

                  <small>
                    Never add a skill you cannot defend in an interview
                  </small>
                </div>

                <div className="resumeJobChips">

                  {missingJobSkills.length > 0 ? (
                    missingJobSkills.map(
                      skill => (
                        <span
                          className="missing"
                          key={skill}
                        >
                          + {skill}
                        </span>
                      )
                    )
                  ) : jobDescription.trim() ? (
                    jdSkillKeywords.length === 0 ? (
                      <p>
                        No technical requirements were detected in this job description. Paste the complete responsibilities and requirements section for a meaningful comparison.
                      </p>
                    ) : (
                      <span className="matched">
                        ✓ No major technical skill gaps detected
                      </span>
                    )
                  ) : (
                    <p>
                      Paste a job description first.
                    </p>
                  )}

                </div>

              </div>


              {missingGeneralKeywords.length > 0 && (
                <div className="resumeJobKeywordSection">

                  <div>
                    <span>
                      ROLE-SPECIFIC WORDING
                    </span>

                    <small>
                      Important recurring terms not currently found in your resume
                    </small>
                  </div>

                  <div className="resumeJobChips">

                    {missingGeneralKeywords
                      .slice(0, 8)
                      .map(
                        keyword => (
                          <span
                            className="neutral"
                            key={keyword}
                          >
                            {keyword}
                          </span>
                        )
                      )}

                  </div>

                </div>
              )}

            </div>

          </div>

          <div className="resumeJobDisclaimer">
            JD Match is a CampusConnect keyword and skill-alignment heuristic. Employer ATS platforms may rank or parse resumes differently.
          </div>

        </section>
      )}


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


function AcademicControl({
  role,
  profile,
}: {
  role: Role;
  profile: Profile;
}) {
  type AcademicControlSection =
    | "home"
    | "faculty"
    | "timetable"
    | "coverage";

  const [
    activeSection,
    setActiveSection,
  ] =
    useState<AcademicControlSection>(
      "home"
    );


  if (role !== "Main Admin") {
    return (
      <div className="academicControlAccess">
        <strong>
          Academic Control
        </strong>

        <p>
          This workspace is currently available
          to Main Admin only.
        </p>
      </div>
    );
  }


  const goHome = () => {
    setActiveSection("home");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };


  /*
   * MODULE 01
   * Faculty allocation gets its own workspace.
   */
  if (activeSection === "faculty") {
    return (
      <div className="academicControlWorkspace">

        <section className="academicControlModulePage">

          <header className="academicControlModulePageHeader">

            <button
              type="button"
              className="academicControlBackButton"
              onClick={goHome}
            >
              <span>←</span>
              Academic Control
            </button>

            <div className="academicControlModuleHeading">

              <div>
                <span>
                  ECE · FACULTY OPERATIONS
                </span>

                <h1>
                  Faculty Workload
                </h1>

                <p>
                  Manage teaching allocations,
                  batches, subjects, labs and
                  weekly academic workload from
                  one dedicated workspace.
                </p>
              </div>

              <div className="academicControlModuleBadge">
                <small>
                  MODULE
                </small>

                <strong>
                  01
                </strong>
              </div>

            </div>

          </header>


          <div className="academicControlModuleBody">
            <FacultyWorkloadManager
              profile={profile}
            />
          </div>

        </section>

      </div>
    );
  }


  /*
   * MODULE 02
   * Timetable automation gets its own workspace.
   */
  if (activeSection === "timetable") {
    return (
      <div className="academicControlWorkspace">

        <section className="academicControlModulePage">

          <header className="academicControlModulePageHeader">

            <button
              type="button"
              className="academicControlBackButton"
              onClick={goHome}
            >
              <span>←</span>
              Academic Control
            </button>

            <div className="academicControlModuleHeading">

              <div>
                <span>
                  ECE · SCHEDULING ENGINE
                </span>

                <h1>
                  Timetable Automation
                </h1>

                <p>
                  Configure scheduling profiles,
                  batches, working days, teaching
                  periods, classrooms and labs
                  before timetable generation.
                </p>
              </div>

              <div className="academicControlModuleBadge">
                <small>
                  MODULE
                </small>

                <strong>
                  02
                </strong>
              </div>

            </div>

          </header>


          <div className="academicControlModuleBody">
            <TimetableAutomationManager
              profile={profile}
              onOpenFacultyWorkload={() => {
                setActiveSection(
                  "faculty"
                );

                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
            />
          </div>

        </section>

      </div>
    );
  }


  /*
   * MODULE 03
   * Faculty coverage supervision and exception handling.
   */
  if (activeSection === "coverage") {
    return (
      <div className="academicControlWorkspace">

        <section className="academicControlModulePage">

          <header className="academicControlModulePageHeader">

            <button
              type="button"
              className="academicControlBackButton"
              onClick={goHome}
            >
              <span>←</span>
              Academic Control
            </button>

            <div className="academicControlModuleHeading">

              <div>
                <span>
                  ECE · COVERAGE ENGINE
                </span>

                <h1>
                  Faculty Coverage
                </h1>

                <p>
                  Monitor substitute requests,
                  candidate matching and
                  date-specific class coverage
                  without changing the permanent
                  timetable.
                </p>
              </div>

              <div className="academicControlModuleBadge">
                <small>
                  MODULE
                </small>

                <strong>
                  03
                </strong>
              </div>

            </div>

          </header>

          <div className="academicControlModuleBody">
            <FacultyCoverageControlCenter
              profile={profile}
            />
          </div>

        </section>

      </div>
    );
  }


  /*
   * DEFAULT LANDING PAGE
   *
   * No operational component is rendered here.
   * A module loads only after Main Admin selects it.
   */
  return (
    <div className="academicControlWorkspace">

      <section className="academicControlHero">

        <div className="academicControlHeroCopy">

          <span>
            ECE · ACADEMIC OPERATIONS
          </span>

          <h1>
            Academic Control
          </h1>

          <p>
            Central operations workspace for
            faculty allocation, scheduling,
            timetable automation and future
            classroom coverage workflows.
          </p>

          <div className="academicControlHeroActions">

            <button
              type="button"
              className="primary"
              onClick={() =>
                setActiveSection(
                  "faculty"
                )
              }
            >
              Faculty allocation
            </button>

            <button
              type="button"
              className="secondary"
              onClick={() =>
                setActiveSection(
                  "timetable"
                )
              }
            >
              Timetable engine
            </button>

          </div>

        </div>


        <div className="academicControlHeroPanel">

          <span>
            OPERATIONS CENTER
          </span>

          <strong>
            ECE
          </strong>

          <p>
            Current implementation scope
          </p>

          <div>

            <span>
              Faculty
              <b>
                Workload
              </b>
            </span>

            <span>
              Schedule
              <b>
                Automation
              </b>
            </span>

            <span>
              Access
              <b>
                Main Admin
              </b>
            </span>

            <span>
              Scope
              <b>
                ECE
              </b>
            </span>

          </div>

        </div>

      </section>


      <section className="academicControlModuleNav">

        <header>
          <div>
            <span>
              ACADEMIC OPERATIONS
            </span>

            <h2>
              Choose an operation
            </h2>

            <p>
              Open only the workspace you need.
              Configuration modules no longer
              appear together on this page.
            </p>
          </div>
        </header>


        <div className="academicControlModuleGrid">


          <button
            type="button"
            onClick={() =>
              setActiveSection(
                "faculty"
              )
            }
          >
            <i>
              01
            </i>

            <div>
              <span>
                FACULTY OPERATIONS
              </span>

              <h3>
                Faculty Workload
              </h3>

              <p>
                Assign faculty to ECE subjects,
                sections and labs, then configure
                weekly teaching requirements.
              </p>
            </div>

            <strong>
              →
            </strong>
          </button>


          <button
            type="button"
            onClick={() =>
              setActiveSection(
                "timetable"
              )
            }
          >
            <i>
              02
            </i>

            <div>
              <span>
                SCHEDULING ENGINE
              </span>

              <h3>
                Timetable Automation
              </h3>

              <p>
                Configure scheduling profiles,
                periods, working days, classrooms
                and laboratories.
              </p>
            </div>

            <strong>
              →
            </strong>
          </button>


          <button
            type="button"
            onClick={() =>
              setActiveSection(
                "coverage"
              )
            }
          >

            <i>
              03
            </i>

            <div>
              <span>
                COVERAGE ENGINE
              </span>

              <h3>
                Faculty Coverage
              </h3>

              <p>
                Monitor ECE substitute requests,
                candidate matching, uncovered
                classes and active substitutions.
              </p>
            </div>

            <strong>
              →
            </strong>

          </button>


          <div className="academicControlFutureCard">

            <i>
              04
            </i>

            <div>
              <span>
                ECE INTELLIGENCE
              </span>

              <h3>
                HOD Analytics
              </h3>

              <p>
                Department workload, scheduling
                coverage and academic exceptions
                will appear here.
              </p>
            </div>

            <em>
              Planned
            </em>

          </div>

        </div>

      </section>


      <section className="academicControlFlow">

        <div>
          <span>
            01
          </span>

          <div>
            <small>
              CONFIGURE
            </small>

            <strong>
              Faculty allocation
            </strong>

            <p>
              Define who teaches each
              ECE subject and lab.
            </p>
          </div>
        </div>


        <b>
          →
        </b>


        <div>
          <span>
            02
          </span>

          <div>
            <small>
              PREPARE
            </small>

            <strong>
              Scheduling rules
            </strong>

            <p>
              Configure periods,
              working days and rooms.
            </p>
          </div>
        </div>


        <b>
          →
        </b>


        <div>
          <span>
            03
          </span>

          <div>
            <small>
              GENERATE
            </small>

            <strong>
              Timetable
            </strong>

            <p>
              Build and validate the
              academic schedule.
            </p>
          </div>
        </div>

      </section>

    </div>
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
    | "Resources"
    | "Fees";

  const [attendance, setAttendance] = useState<AcademicRow[]>([]);
  const [marks, setMarks] = useState<AcademicRow[]>([]);
  const [results, setResults] = useState<AcademicRow[]>([]);
  const [fees, setFees] = useState<AcademicRow[]>([]);
  const [subjects, setSubjects] = useState<AcademicRow[]>([]);
  const [timetable, setTimetable] = useState<AcademicRow[]>([]);
  const [
    timetableSubstitutions,
    setTimetableSubstitutions,
  ] = useState<AcademicRow[]>([]);
  const [timetableBreaks, setTimetableBreaks] = useState<AcademicRow[]>([]);

  const [
    timetableGridSlots,
    setTimetableGridSlots,
  ] = useState<AcademicRow[]>([]);


  const [
    timetableOffline,
    setTimetableOffline,
  ] = useState(false);

  const [
    timetableLastSynced,
    setTimetableLastSynced,
  ] = useState("");

  const [academicEvents, setAcademicEvents] = useState<AcademicRow[]>([]);
  const [learningResources, setLearningResources] = useState<AcademicRow[]>([]);
  const [assignments, setAssignments] = useState<AcademicRow[]>([]);
  const [connection, setConnection] = useState<AcademicRow | null>(null);

  const [loading, setLoading] = useState(true);

  const [tab, setTab] =
    useState<AcademicTab>("Overview");

  const [semester, setSemester] = useState("All");
  const [query, setQuery] = useState("");

  /*
   * Live academic clock.
   *
   * Today's Classes must update while the page remains open.
   * Without state, new Date() only changes when React happens
   * to render for another reason.
   */
  const [
    academicNow,
    setAcademicNow,
  ] = useState(
    () => new Date()
  );


  useEffect(() => {

    const updateAcademicClock = () => {
      setAcademicNow(
        new Date()
      );
    };


    updateAcademicClock();


    const timer =
      window.setInterval(
        updateAcademicClock,
        30_000
      );


    const handleVisibility = () => {

      if (
        document.visibilityState ===
        "visible"
      ) {
        updateAcademicClock();
      }

    };


    window.addEventListener(
      "focus",
      updateAcademicClock
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );


    return () => {

      window.clearInterval(
        timer
      );

      window.removeEventListener(
        "focus",
        updateAcademicClock
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

    };

  }, []);

  const normalizeAcademicSubject = (
    value: unknown
  ) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();


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
    if (role !== "Student") {
      setTimetableBreaks([]);
      return;
    }

    let active = true;

    const loadTimetableBreaks =
      async () => {
        const client =
          getSupabaseClient();

        if (!client) {
          return;
        }

        try {
          /*
           * getSession() reads the persisted Supabase
           * session locally. Do this before any request
           * that requires network access so the student's
           * cached timetable remains available offline.
           */
          const {
            data: sessionData,
          } =
            await client.auth
              .getSession();

          const localUserId =
            sessionData.session
              ?.user.id || "";

          if (
            typeof navigator !==
              "undefined" &&
            !navigator.onLine
          ) {
            if (!localUserId) {
              return;
            }

            const cached =
              await getOfflineTimetableSchedule(
                localUserId
              );

            if (
              cached &&
              active
            ) {
              setTimetableBreaks(
                cached.breaks
              );

              setTimetableOffline(
                true
              );

              setTimetableLastSynced(
                cached.syncedAt
              );
            }

            return;
          }

          /*
           * Online: validate the current user with
           * Supabase before fetching live timetable data.
           */
          const {
            data: auth,
            error: authError,
          } =
            await client.auth
              .getUser();

          if (
            authError ||
            !auth.user ||
            !active
          ) {
            return;
          }

          const userId =
            auth.user.id;

          const {
            data,
            error,
          } = await client.rpc(
            "get_my_timetable_breaks"
          );

          if (!active) {
            return;
          }

          if (error) {
            console.warn(
              "Student timetable breaks:",
              error.message
            );

            return;
          }

          const breakRows =
            Array.isArray(data)
              ? data
              : [];

          setTimetableBreaks(
            breakRows
          );

          /*
           * Preserve any timetable entries
           * already cached by the main
           * Academics loader.
           */
          try {
            const existing =
              await getOfflineTimetableSchedule(
                userId
              );

            await saveOfflineTimetableSchedule(
              {
                userId,

                entries:
                  existing?.entries ||
                  [],

                breaks:
                  breakRows,

                syncedAt:
                  new Date()
                    .toISOString(),
              }
            );
          } catch (
            cacheError
          ) {
            console.warn(
              "Timetable breaks offline cache:",
              cacheError
            );
          }
        } catch (error) {
          console.warn(
            "Student timetable breaks:",
            error
          );
        }
      };

    void loadTimetableBreaks();

    return () => {
      active = false;
    };
  }, [role]);


  /*
   * Digital Timetable V2
   *
   * Load the real scheduling-profile slots independently
   * from occupied timetable rows.
   *
   * This means Period 4 still appears even if nobody has
   * been scheduled into Period 4 yet.
   */
  useEffect(() => {

    if (
      role !==
      "Student"
    ) {

      setTimetableGridSlots(
        []
      );

      return;
    }


    let active =
      true;


    const loadTimetableGridSlots =
      async () => {

        const client =
          getSupabaseClient();


        if (!client) {
          return;
        }


        try {

          const {
            data:
              slotData,

            error:
              slotError,
          } =
            await client.rpc(
              "get_my_timetable_grid_slots"
            );


          if (
            !active
          ) {
            return;
          }


          if (
            slotError
          ) {

            console.warn(
              "Student timetable grid slots:",
              slotError.message
            );

            setTimetableGridSlots(
              []
            );

            return;
          }


          setTimetableGridSlots(
            Array.isArray(
              slotData
            )
              ? slotData
              : []
          );

        } catch (
          slotError
        ) {

          if (
            active
          ) {

            console.warn(
              "Student timetable grid slots:",
              slotError
            );

            setTimetableGridSlots(
              []
            );
          }
        }
      };


    void loadTimetableGridSlots();


    return () => {
      active =
        false;
    };

  }, [role]);

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
        /*
         * Resolve the locally persisted session before
         * performing any network-dependent auth call.
         */
        const {
          data: sessionData,
        } =
          await client.auth
            .getSession();

        const localUserId =
          sessionData.session
            ?.user.id || "";

        /*
         * OFFLINE PATH
         *
         * Never call Supabase here. Hydrate the timetable
         * directly from this student's IndexedDB snapshot.
         */
        if (
          typeof navigator !==
            "undefined" &&
          !navigator.onLine
        ) {
          if (localUserId) {
            const cached =
              await getOfflineTimetableSchedule(
                localUserId
              );

            if (
              cached &&
              active
            ) {
              setTimetable(
                cached.entries
              );

              /*
               * Date-specific substitutions are intentionally
               * not persisted in the recurring timetable cache.
               */
              setTimetableSubstitutions(
                []
              );

              setTimetableBreaks(
                cached.breaks
              );

              setTimetableOffline(
                true
              );

              setTimetableLastSynced(
                cached.syncedAt
              );
            }
          }

          return;
        }

        /*
         * ONLINE PATH
         *
         * Validate the authenticated user before reading
         * live academic information from Supabase.
         */
        const {
          data: auth,
          error: authError,
        } =
          await client.auth
            .getUser();

        if (
          authError ||
          !auth.user ||
          !active
        ) {
          return;
        }

        const id =
          auth.user.id;

        /*
         * STUDENT TIMETABLE SUBSTITUTION OVERLAY
         *
         * Use the student's browser-local calendar date.
         * This intentionally avoids UTC date conversion so
         * a late-evening/early-morning timezone boundary does
         * not request the wrong academic day.
         */
        const localNow =
          new Date();

        const localDate =
          [
            localNow.getFullYear(),
            String(
              localNow.getMonth() + 1
            ).padStart(2, "0"),
            String(
              localNow.getDate()
            ).padStart(2, "0"),
          ].join("-");

        const [
          attendanceResult,
          campusAttendanceResult,
          marksResult,
          resultsResult,
          feesResult,
          connectionResult,
          subjectsResult,
          timetableResult,
          timetableSubstitutionsResult,
          eventsResult,
          learningResourcesResult,
          assignmentsResult,
        ] = await Promise.all([
          client
            .from("college_attendance")
            .select("*")
            .eq("student_id", id)
            .order("subject_name"),

          client.rpc(
            "get_my_live_attendance_summary"
          ),

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

          client.rpc(
            "get_my_timetable"
          ),

          /*
           * Date-specific overlay only.
           *
           * The RPC verifies the authenticated student's
           * batch membership server-side and exposes only:
           * - timetable entry id
           * - class date
           * - substitute faculty name
           *
           * Permanent timetable data remains unchanged.
           */
          client.rpc(
            "get_my_timetable_substitutions",
            {
              target_date:
                localDate,
            }
          ),

          client
            .from("college_academic_events")
            .select("*")
            .eq("student_id", id)
            .order("starts_at", {
              ascending: true,
            }),

          client
            .from("learning_resources")
            .select("*")
            .order("is_verified", {
              ascending: false,
            })
            .order("created_at", {
              ascending: false,
            })
            .limit(80),

          client.rpc(
            "get_my_assignments"
          ),
        ]);

        if (!active) return;

        /*
         * CANONICAL STUDENT ATTENDANCE
         *
         * get_my_live_attendance_summary is the source of truth
         * for live Faculty-recorded attendance.
         *
         * college_attendance remains a legacy/import fallback only
         * when no live attendance summary exists.
         */
        const liveAttendance =
          !campusAttendanceResult.error
            ? (
                campusAttendanceResult.data ||
                []
              )
            : [];


        const importedAttendance =
          !attendanceResult.error
            ? (
                attendanceResult.data ||
                []
              )
            : [];


        if (
          liveAttendance.length
        ) {

          setAttendance(
            liveAttendance.map(
              (item: AcademicRow) => {

                const attended =
                  Number(
                    item.attended_classes ??
                    item.attended ??
                    0
                  );


                const total =
                  Number(
                    item.counted_classes ??
                    item.total ??
                    0
                  );


                return {
                  ...item,

                  subject_name:
                    String(
                      item.subject_name ||
                      item.subject ||
                      ""
                    ),

                  subject_code:
                    String(
                      item.subject_code ||
                      ""
                    ),

                  attended:
                    Number.isFinite(
                      attended
                    )
                      ? attended
                      : 0,

                  total:
                    Number.isFinite(
                      total
                    )
                      ? total
                      : 0,

                  attendance_percentage:
                    total > 0
                      ? (
                          attended /
                          total
                        ) *
                          100
                      : 0,

                  __attendance_source:
                    "live",
                };

              }
            )
          );

        } else if (
          importedAttendance.length
        ) {

          /*
           * Keep imported college attendance only as fallback.
           */
          setAttendance(
            importedAttendance.map(
              item => {

                const attended =
                  Number(
                    item.attended ||
                    0
                  );

                const total =
                  Number(
                    item.total ||
                    0
                  );


                return {
                  ...item,

                  attended:
                    Number.isFinite(
                      attended
                    )
                      ? attended
                      : 0,

                  total:
                    Number.isFinite(
                      total
                    )
                      ? total
                      : 0,

                  __attendance_source:
                    "imported",
                };

              }
            )
          );

        } else {

          setAttendance([]);

        }


        if (!marksResult.error)
          setMarks(marksResult.data || []);

        if (!resultsResult.error)
          setResults(resultsResult.data || []);

        if (!feesResult.error)
          setFees(feesResult.data || []);

        if (!connectionResult.error)
          setConnection(connectionResult.data || null);

        if (!assignmentsResult.error)
          setAssignments(
            assignmentsResult.data || []
          );
        else
          console.warn(
            "Academics assignments:",
            assignmentsResult.error.message
          );

        if (!subjectsResult.error) {
          const officialSubjects =
            subjectsResult.data || [];

          let batchSubjects:
            AcademicRow[] = [];

          /*
           * Student Academics uses the authenticated
           * get_my_batch_subjects RPC as the source of
           * truth for configured batch subjects.
           *
           * The RPC already verifies the current student
           * through attendance_batch_students and returns
           * faculty/profile enriched subject metadata.
           */
          const [
            batchSubjectsResult,
            studentBatchesResult,
          ] = await Promise.all([
            client.rpc(
              "get_my_batch_subjects"
            ),
            client.rpc(
              "get_my_attendance_batches"
            ),
          ]);

          if (
            batchSubjectsResult.error
          ) {
            console.warn(
              "Academics batch subjects:",
              batchSubjectsResult.error.message
            );
          } else {
            const studentBatches =
              Array.isArray(
                studentBatchesResult.data
              )
                ? (
                    studentBatchesResult.data as AcademicRow[]
                  )
                : [];

            const batchMetadata =
              new Map<
                string,
                AcademicRow
              >();

            for (
              const batch of studentBatches
            ) {
              const batchId =
                String(
                  batch.id ||
                    batch.batch_id ||
                    ""
                ).trim();

              if (batchId) {
                batchMetadata.set(
                  batchId,
                  batch
                );
              }
            }

            batchSubjects =
              (
                Array.isArray(
                  batchSubjectsResult.data
                )
                  ? batchSubjectsResult.data
                  : []
              ).map(item => {
                const row =
                  item as AcademicRow;

                const batchId =
                  String(
                    row.batch_id ||
                      ""
                  ).trim();

                const batch =
                  batchMetadata.get(
                    batchId
                  );

                return {
                  ...row,

                  semester:
                    batch?.semester ??
                    row.semester ??
                    null,

                  academic_year:
                    batch?.academic_year ||
                    row.academic_year ||
                    "",
                };
              });
          }

          if (
            studentBatchesResult.error
          ) {
            console.warn(
              "Academics student batches:",
              studentBatchesResult.error.message
            );
          }


          /*
           * Priority:
           *
           * 1. Configured batch subject data
           * 2. Official college_subjects
           * 3. Attendance-derived subject names
           *
           * Attendance rows are also used to ensure a
           * live subject is not hidden just because batch
           * configuration is incomplete.
           */
          const configuredSource =
            batchSubjects.length
              ? batchSubjects
              : officialSubjects;


          const fallbackAttendance =
            !attendanceResult.error &&
            (attendanceResult.data || [])
              .length
              ? attendanceResult.data || []
              : !campusAttendanceResult.error
              ? (
                  campusAttendanceResult.data ||
                  []
                ).map((item: AcademicRow) => ({
                  ...item,
                  subject_name:
                    item.subject || "",
                  subject_code: "",
                }))
              : [];


          const subjectMap =
            new Map<
              string,
              AcademicRow
            >();


          for (
            const row of configuredSource
          ) {
            const subjectName =
              String(
                row.subject_name || ""
              ).trim();

            if (!subjectName) {
              continue;
            }

            const key =
              normalizeAcademicSubject(
                subjectName
              );

            subjectMap.set(
              key,
              {
                ...row,
                subject_name:
                  subjectName,
              }
            );
          }


          for (
            const row of fallbackAttendance
          ) {
            const subjectName =
              String(
                row.subject_name ||
                  row.subject ||
                  ""
              ).trim();

            if (!subjectName) {
              continue;
            }

            const key =
              normalizeAcademicSubject(
                subjectName
              );

            /*
             * Keep configured metadata where it exists.
             * Attendance only fills missing subjects.
             */
            if (
              !subjectMap.has(key)
            ) {
              subjectMap.set(
                key,
                {
                  id:
                    row.id ||
                    `fallback-${key}`,
                  subject_name:
                    subjectName,
                  subject_code:
                    row.subject_code ||
                    "",
                  semester:
                    row.semester ||
                    null,
                  academic_year:
                    row.academic_year ||
                    "",
                  credits: null,
                  faculty_name: "",
                  subject_type:
                    "Course",
                  __fallback:
                    true,
                }
              );
            }
          }


          setSubjects(
            Array.from(
              subjectMap.values()
            )
          );
        }

        if (
          !timetableSubstitutionsResult.error
        ) {
          setTimetableSubstitutions(
            Array.isArray(
              timetableSubstitutionsResult.data
            )
              ? timetableSubstitutionsResult.data
              : []
          );
        } else {
          /*
           * The permanent timetable remains usable even if
           * the temporary substitution overlay cannot load.
           */
          setTimetableSubstitutions(
            []
          );

          console.warn(
            "Student timetable substitutions:",
            timetableSubstitutionsResult.error.message
          );
        }

        if (!timetableResult.error) {
          const timetableRows =
            Array.isArray(
              timetableResult.data
            )
              ? timetableResult.data
              : [];

          setTimetable(
            timetableRows
          );

          setTimetableOffline(
            false
          );

          const syncedAt =
            new Date()
              .toISOString();

          setTimetableLastSynced(
            syncedAt
          );

          try {
            const existing =
              await getOfflineTimetableSchedule(
                id
              );

            await saveOfflineTimetableSchedule(
              {
                userId: id,

                entries:
                  timetableRows,

                breaks:
                  existing?.breaks ||
                  timetableBreaks,

                syncedAt,
              }
            );
          } catch (
            cacheError
          ) {
            console.warn(
              "Structured timetable offline cache:",
              cacheError
            );
          }
        }

        if (!eventsResult.error)
          setAcademicEvents(eventsResult.data || []);

        if (!learningResourcesResult.error)
          setLearningResources(
            learningResourcesResult.data || []
          );

      } catch (error) {
        console.error(
          "Academics load error:",
          error
        );

        /*
         * Supabase requests can reject as a
         * group while offline because this
         * loader uses Promise.all.
         *
         * Recover only the authenticated
         * student's previously saved
         * timetable snapshot.
         */
        try {
          const {
            data: auth,
          } =
            await client.auth
              .getSession();

          const userId =
            auth.session
              ?.user.id || "";

          if (userId) {
            const cached =
              await getOfflineTimetableSchedule(
                userId
              );

            if (
              cached &&
              active
            ) {
              setTimetable(
                cached.entries
              );

              /*
               * Date-specific substitutions are intentionally
               * not persisted in the recurring timetable cache.
               */
              setTimetableSubstitutions(
                []
              );

              setTimetableBreaks(
                cached.breaks
              );

              setTimetableOffline(
                true
              );

              setTimetableLastSynced(
                cached.syncedAt
              );
            }
          }
        } catch (
          cacheError
        ) {
          console.warn(
            "Academics offline timetable fallback:",
            cacheError
          );
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


        {(role === "Faculty" ||
          role === "Main Admin") && (
          <AcademicMarksManager
            role={role}
            profile={profile}
          />
        )}

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


  const visibleLearningResources =
    learningResources.filter(
      item => {
        const semesterOk =
          semester === "All" ||
          !item.semester ||
          String(item.semester) ===
            "All" ||
          String(item.semester) ===
            semester;

        if (!semesterOk) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [
          item.title,
          item.subject,
          item.description,
          item.department,
          item.resource_type,
          item.contributor_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      }
    );


  /*
   * Canonical overall attendance:
   *
   * total attended classes
   * ---------------------- × 100
   * total counted classes
   *
   * Do NOT average individual subject percentages because
   * subjects may contain different numbers of classes.
   */
  const academicAttendanceTotals =
    visibleAttendance.reduce(
      (
        totals,
        item
      ) => {

        const attended =
          Number(
            item.attended ||
            0
          );

        const total =
          Number(
            item.total ||
            0
          );


        if (
          !Number.isFinite(
            attended
          ) ||
          !Number.isFinite(
            total
          ) ||
          total <= 0
        ) {
          return totals;
        }


        totals.attended +=
          Math.max(
            0,
            attended
          );

        totals.total +=
          total;


        return totals;

      },
      {
        attended: 0,
        total: 0,
      }
    );


  const attendanceAverage =
    academicAttendanceTotals.total >
      0
      ? Math.round(
          (
            academicAttendanceTotals.attended /
            academicAttendanceTotals.total
          ) *
            100
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


  const now =
    academicNow;

  /*
   * Campus timetable clock
   *
   * Timetable times belong to the campus timezone rather than
   * whichever timezone happens to be configured on the device.
   */
  const campusClockParts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          "Asia/Kolkata",

        weekday:
          "long",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hourCycle:
          "h23",
      }
    ).formatToParts(
      now
    );


  const campusClockPart = (
    type: Intl.DateTimeFormatPartTypes
  ) =>
    campusClockParts.find(
      part =>
        part.type ===
        type
    )?.value ||
    "";


  const currentDay =
    campusClockPart(
      "weekday"
    );


  /*
   * Convert a database timetable value to minutes after midnight.
   *
   * Deliberately uses split(":") instead of a regex so values
   * such as 09:20:00 cannot fail because of escaping.
   */
  const timetableMinutes = (
    value: unknown
  ) => {

    const raw =
      String(
        value ??
        ""
      )
        .trim();


    if (!raw) {
      return null;
    }


    const parts =
      raw.split(":");


    if (
      parts.length <
        2
    ) {
      return null;
    }


    const hours =
      Number(
        parts[0]
      );

    const minutes =
      Number(
        parts[1]
      );


    if (
      !Number.isInteger(
        hours
      ) ||
      !Number.isInteger(
        minutes
      ) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }


    return (
      hours *
        60 +
      minutes
    );

  };


  const currentHour =
    Number(
      campusClockPart(
        "hour"
      )
    );


  const currentMinute =
    Number(
      campusClockPart(
        "minute"
      )
    );


  const currentMinutes =
    Number.isFinite(
      currentHour
    ) &&
    Number.isFinite(
      currentMinute
    )
      ? currentHour *
          60 +
        currentMinute
      : 0;



  /*
   * Temporary Faculty substitutions are keyed by the
   * permanent timetable entry returned by get_my_timetable().
   *
   * This overlay affects Today's Classes only.
   */
  const substitutionByTimetableEntry =
    new Map<string, AcademicRow>(
      timetableSubstitutions
        .filter(
          (
            substitution:
              AcademicRow
          ) =>
            Boolean(
              substitution
                .timetable_entry_id
            )
        )
        .map(
          (
            substitution:
              AcademicRow
          ): [
            string,
            AcademicRow,
          ] => [
            String(
              substitution
                .timetable_entry_id
            ),
            substitution,
          ]
        )
    );


  const todayClasses =
    visibleTimetable
      .filter(
        item =>
          String(
            item.day_of_week || ""
          ).toLowerCase() ===
          currentDay.toLowerCase()
      )
      .sort(
        (a, b) => {
          const periodDifference =
            Number(
              a.period_order || 0
            ) -
            Number(
              b.period_order || 0
            );

          if (periodDifference) {
            return periodDifference;
          }

          return (
            timetableMinutes(
              a.start_time
            ) ?? 0
          ) - (
            timetableMinutes(
              b.start_time
            ) ?? 0
          );
        }
      );


  const classStatus = (
    item: AcademicRow
  ) => {
    const start =
      timetableMinutes(
        item.start_time
      );

    const end =
      timetableMinutes(
        item.end_time
      );

    if (
      start === null ||
      end === null
    ) {
      return "upcoming";
    }

    if (
      currentMinutes >= start &&
      currentMinutes < end
    ) {
      return "live";
    }

    if (currentMinutes >= end) {
      return "completed";
    }

    const upcoming =
      todayClasses.filter(
        row => {
          const rowStart =
            timetableMinutes(
              row.start_time
            );

          return (
            rowStart !== null &&
            rowStart >
              currentMinutes
          );
        }
      );

    if (
      upcoming.length &&
      upcoming[0].id === item.id
    ) {
      return "next";
    }

    return "upcoming";
  };


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
          row.subject_code &&
          String(
            row.subject_code
          ).toLowerCase() ===
            String(
              item.subject_code
            ).toLowerCase()
        ) ||
        normalizeAcademicSubject(
          row.subject_name ||
            row.subject
        ) ===
          normalizeAcademicSubject(
            item.subject_name
          )
    );


  const marksForSubject = (
    item: AcademicRow
  ) =>
    marks.filter(
      row =>
        (
          item.subject_code &&
          row.subject_code &&
          String(
            row.subject_code
          ).toLowerCase() ===
            String(
              item.subject_code
            ).toLowerCase()
        ) ||
        normalizeAcademicSubject(
          row.subject_name
        ) ===
          normalizeAcademicSubject(
            item.subject_name
          )
    );


  const assignmentsForSubject = (
    item: AcademicRow
  ) =>
    assignments.filter(
      row =>
        normalizeAcademicSubject(
          row.subject
        ) ===
        normalizeAcademicSubject(
          item.subject_name
        )
    );


  const openLearningResource = async (
    item: AcademicRow
  ) => {
    const externalUrl =
      item.url ||
      item.file_url ||
      item.resource_url ||
      "";

    if (externalUrl) {
      window.open(
        externalUrl,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }

    if (!item.file_path) {
      window.alert(
        "This resource does not have an available file or link."
      );
      return;
    }

    const popup =
      window.open(
        "about:blank",
        "_blank"
      );

    if (popup) {
      popup.opener = null;
      popup.document.title =
        "Opening resource…";
      popup.document.body.innerHTML =
        "<p style=\"font-family:system-ui;padding:24px\">Opening resource…</p>";
    }

    try {
      const client =
        getSupabaseClient();

      if (!client) {
        throw new Error(
          "CampusConnect is not connected to Supabase."
        );
      }

      const {data, error} =
        await client.storage
          .from("learning-resources")
          .createSignedUrl(
            item.file_path,
            60 * 10
          );

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error(
          "Unable to generate resource link."
        );
      }

      if (popup) {
        popup.location.href =
          data.signedUrl;
      } else {
        window.location.href =
          data.signedUrl;
      }

    } catch (error) {
      if (popup) {
        popup.close();
      }

      console.error(
        "Learning resource open error:",
        error
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to open this resource."
      );
    }
  };


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
              "Resources",
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
              <em>Check risk and 85% targets</em>
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
                    below 85%
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
                          item => {
                            const status =
                              classStatus(
                                item
                              );

                            const substitution =
                              substitutionByTimetableEntry.get(
                                String(
                                  item.id ||
                                    ""
                                )
                              );

                            const substituteFacultyName =
                              String(
                                substitution
                                  ?.substitute_faculty_name ||
                                  ""
                              ).trim();

                            const hasSubstitute =
                              Boolean(
                                substituteFacultyName
                              );

                            const displayFacultyName =
                              hasSubstitute
                                ? substituteFacultyName
                                : String(
                                    item.faculty_name ||
                                      "Faculty"
                                  );

                            return (
                              <article
                                key={item.id}
                                className={
                                  `academicTodayClass ${status}`
                                }
                              >

                                <time>
                                  <strong>
                                    {String(
                                      item.start_time ||
                                        ""
                                    ).slice(
                                      0,
                                      5
                                    )}
                                  </strong>

                                  <small>
                                    {String(
                                      item.end_time ||
                                        ""
                                    ).slice(
                                      0,
                                      5
                                    )}
                                  </small>
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
                                      .join(
                                        " · "
                                      )}
                                  </small>

                                  <span
                                    className={
                                      hasSubstitute
                                        ? "academicTodayFaculty academicTodayFacultySubstitute"
                                        : "academicTodayFaculty"
                                    }
                                  >
                                    {displayFacultyName}

                                    {hasSubstitute && (
                                      <em className="academicSubstituteBadge">
                                        SUBSTITUTE TODAY
                                      </em>
                                    )}
                                  </span>
                                </div>

                                <span
                                  className={
                                    `academicClassStatus ${status}`
                                  }
                                >
                                  {status ===
                                  "live"
                                    ? "LIVE NOW"
                                    : status ===
                                        "next"
                                      ? "NEXT"
                                      : status ===
                                          "completed"
                                        ? "COMPLETED"
                                        : "UPCOMING"}
                                </span>

                              </article>
                            );
                          }
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
                                    percent < 85
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

                    const subjectAssignments =
                      assignmentsForSubject(
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
                            "Faculty information unavailable"}
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
                                percent < 85
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
                              ASSIGNMENTS
                            </small>

                            <strong>
                              {subjectAssignments.length}
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

            <section className="academicProSection academicStudentTimetable">

              <header className="academicProSectionHeading">

                <div>
                  <span>
                    WEEKLY SCHEDULE
                  </span>

                  <h2>
                    Class timetable
                  </h2>

                  <p>
                    Your complete weekly lectures,
                    labs, rooms, faculty and breaks.
                  </p>

                  {timetableOffline && (
                    <div
                      className="academicOfflineStatus"
                      role="status"
                    >
                      <strong>
                        Offline schedule
                      </strong>

                      {timetableLastSynced && (
                        <span>
                          Last synced{" "}
                          {new Date(
                            timetableLastSynced
                          ).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <strong>
                  {visibleTimetable.length}
                  {" "}
                  classes
                </strong>

              </header>


              <AcademicTimetableGrid
                entries={
                  visibleTimetable
                }
                breaks={
                  timetableBreaks
                }

                slots={
                  timetableGridSlots
                }
              />

            </section>

          )}


          {tab === "Resources" && (

            <section className="academicProSection">

              <header className="academicProSectionHeading">

                <div>
                  <span>
                    LEARNING LIBRARY
                  </span>

                  <h2>
                    Notes, PYQs & learning resources
                  </h2>

                  <p>
                    Discover verified academic resources,
                    subject material and useful learning
                    content available in CampusConnect.
                  </p>
                </div>

                <strong>
                  {visibleLearningResources.length}
                  {" "}
                  resources
                </strong>

              </header>


              <div className="academicResourceGrid">

                {visibleLearningResources.map(
                  item => {

                    const hasResource =
                      Boolean(
                        item.url ||
                        item.file_url ||
                        item.resource_url ||
                        item.file_path
                      );

                    const verified =
                      Boolean(
                        item.is_verified
                      );

                    return (
                      <article
                        key={item.id}
                        className="academicResourceCard"
                      >

                        <header>

                          <div
                            className="academicResourceType"
                          >
                            <i>
                              {String(
                                item.resource_type ||
                                  ""
                              ).toLowerCase() ===
                              "video"
                                ? "▶"
                                : String(
                                    item.resource_type ||
                                      ""
                                  ).toLowerCase() ===
                                  "pdf"
                                ? "PDF"
                                : "R"}
                            </i>

                            <span>
                              {item.resource_type ||
                                "Resource"}
                            </span>
                          </div>

                          {verified && (
                            <strong className="academicResourceVerified">
                              ✓ Verified
                            </strong>
                          )}

                        </header>


                        <div>

                          <small>
                            {item.subject ||
                              "General"}
                          </small>

                          <h3>
                            {item.title ||
                              "Learning resource"}
                          </h3>

                          {item.description && (
                            <p>
                              {item.description}
                            </p>
                          )}

                        </div>


                        <footer>

                          <div>
                            <span>
                              {item.department ||
                                "All departments"}
                            </span>

                            <i>·</i>

                            <span>
                              {item.semester &&
                              String(
                                item.semester
                              ) !==
                                "All"
                                ? `Semester ${item.semester}`
                                : "All semesters"}
                            </span>
                          </div>


                          {item.contributor_name && (
                            <small>
                              Added by{" "}
                              {item.contributor_name}
                            </small>
                          )}


                          <button
                            type="button"
                            className="academicResourceOpen"
                            disabled={!hasResource}
                            onClick={() =>
                              void openLearningResource(
                                item
                              )
                            }
                          >
                            {hasResource
                              ? String(
                                  item.resource_type ||
                                    ""
                                ).toLowerCase() ===
                                "video"
                                ? "Watch video"
                                : String(
                                    item.resource_type ||
                                      ""
                                  ).toLowerCase() ===
                                  "pdf"
                                ? "View PDF"
                                : "Open resource"
                              : "Resource unavailable"}

                            {hasResource && (
                              <span>↗</span>
                            )}
                          </button>

                        </footer>

                      </article>
                    );
                  }
                )}

              </div>


              {!visibleLearningResources.length && (
                <EmptyAcademic
                  text="No learning resources are available for the current filters."
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




function AcademicTimetableManager({
  role,
  profile: _profile,
}: {
  role: Role;
  profile: Profile;
}) {
  type BatchRow = Record<string, any>;
  type TimetableDocument = Record<string, any>;

  const TIMETABLE_BUCKET =
    "campus-timetables";

  const [batches, setBatches] =
    useState<BatchRow[]>([]);

  const [
    selectedBatchId,
    setSelectedBatchId,
  ] = useState("");

  const [
    document,
    setDocument,
  ] =
    useState<TimetableDocument | null>(
      null
    );

  const [
    signedUrl,
    setSignedUrl,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const canManage =
    role === "Faculty" ||
    role === "Main Admin";

  const batchLabel = (
    batch: BatchRow
  ) => {
    const pieces = [
      batch.department,
      batch.academic_year,
      batch.semester
        ? `Semester ${batch.semester}`
        : "",
      batch.section
        ? `Section ${batch.section}`
        : "",
    ].filter(
      value =>
        typeof value === "string" &&
        value.trim()
    );

    if (pieces.length) {
      return pieces.join(" · ");
    }

    if (
      typeof batch.batch_name === "string" &&
      batch.batch_name.trim()
    ) {
      return batch.batch_name;
    }

    return "Academic Batch";
  };

  const makeSignedUrl =
    async (
      storagePath: string
    ) => {
      const client =
        getSupabaseClient();

      if (!client) {
        return "";
      }

      const {
        data,
        error,
      } = await client.storage
        .from(TIMETABLE_BUCKET)
        .createSignedUrl(
          storagePath,
          60 * 60
        );

      if (error) {
        console.warn(
          "Timetable file signed URL:",
          error.message
        );

        return "";
      }

      return data?.signedUrl || "";
    };

  const loadDocument =
    async (
      batchId: string
    ) => {
      if (!batchId) {
        setDocument(null);
        setSignedUrl("");
        return;
      }

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
          "batch_timetable_documents"
        )
        .select("*")
        .eq(
          "batch_id",
          batchId
        )
        .maybeSingle();

      if (error) {
        setDocument(null);
        setSignedUrl("");
        setErrorMessage(
          error.message
        );
        return;
      }

      setDocument(data || null);

      if (data?.storage_path) {
        setSignedUrl(
          await makeSignedUrl(
            data.storage_path
          )
        );
      } else {
        setSignedUrl("");
      }
    };

  useEffect(() => {
    let active = true;

    const loadBatches =
      async () => {
        const client =
          getSupabaseClient();

        if (!client) {
          if (active) {
            setLoading(false);
          }
          return;
        }

        setLoading(true);
        setErrorMessage("");

        try {
          const {
            data: auth,
            error: authError,
          } =
            await client.auth.getUser();

          if (
            authError ||
            !auth.user
          ) {
            throw new Error(
              authError?.message ||
              "Authentication required."
            );
          }

          let rows:
            BatchRow[] = [];

          if (
            role === "Main Admin"
          ) {
            const {
              data,
              error,
            } = await client
              .from(
                "attendance_batches"
              )
              .select("*")
              .order(
                "created_at",
                {
                  ascending: false,
                }
              );

            if (error) {
              throw error;
            }

            rows = data || [];
          } else if (
            role === "Faculty"
          ) {
            const {
              data:
                subjectRows,
              error:
                subjectError,
            } = await client
              .from(
                "attendance_batch_subjects"
              )
              .select(
                "batch_id"
              )
              .eq(
                "faculty_id",
                auth.user.id
              );

            if (subjectError) {
              throw subjectError;
            }

            const ids =
              Array.from(
                new Set(
                  (
                    subjectRows ||
                    []
                  )
                    .map(
                      row =>
                        row.batch_id
                    )
                    .filter(Boolean)
                )
              );

            if (ids.length) {
              const {
                data,
                error,
              } = await client
                .from(
                  "attendance_batches"
                )
                .select("*")
                .in(
                  "id",
                  ids
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                );

              if (error) {
                throw error;
              }

              rows = data || [];
            }
          }

          if (!active) {
            return;
          }

          setBatches(rows);

          setSelectedBatchId(
            current => {
              if (
                current &&
                rows.some(
                  row =>
                    row.id ===
                    current
                )
              ) {
                return current;
              }

              return rows[0]?.id || "";
            }
          );
        } catch (error) {
          if (!active) {
            return;
          }

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load batches."
          );
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

    void loadBatches();

    return () => {
      active = false;
    };
  }, [role]);

  useEffect(() => {
    setStatusMessage("");
    setErrorMessage("");

    void loadDocument(
      selectedBatchId
    );
  }, [selectedBatchId]);

  type TimetableScanMatch = {
    status:
      | "exact"
      | "possible"
      | "unmatched";

    batchSubjectId:
      string | null;

    subjectCode: string;
    subjectName: string;
    facultyName: string;
    reason: string;
  };

  type TimetableScanEntry = {
    day_of_week: string;
    start_period: number;
    end_period: number;
    start_time: string;
    end_time: string;
    raw_text: string;
    detected_code: string;
    detected_name: string;
    detected_faculty: string;
    detected_room: string;
    detected_class_type: string;
    confidence: string;
    match: TimetableScanMatch;
  };

  type TimetableScanBreak = {
    label: string;
    start_time: string;
    end_time: string;
  };

  type TimetableScanResult = {
    success: boolean;

    mode?:
      | "vision"
      | "pdf-text";

    readOnly?: boolean;
    batchId?: string;
    fileName?: string;
    mimeType?: string;
    extractedText?: string;

    entries?:
      TimetableScanEntry[];

    breaks?:
      TimetableScanBreak[];

    warnings?: string[];

    message?: string;
    error?: string;
  };

  const [
    timetableScan,
    setTimetableScan,
  ] =
    useState<TimetableScanResult | null>(
      null
    );

  const [
    scanningTimetable,
    setScanningTimetable,
  ] = useState(false);

  const [
    timetableScanError,
    setTimetableScanError,
  ] = useState("");

  const scanOfficialTimetable =
    async (
      scanDay: string
    ) => {
      if (
        !selectedBatchId ||
        !document
      ) {
        setTimetableScanError(
          "Upload an official timetable before scanning."
        );
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        setTimetableScanError(
          "Supabase is unavailable."
        );
        return;
      }

      setScanningTimetable(true);
      setTimetableScanError("");

      try {
        const {
          data: sessionData,
          error: sessionError,
        } =
          await client.auth
            .getSession();

        const session =
          sessionData.session;

        if (
          sessionError ||
          !session?.access_token
        ) {
          throw new Error(
            sessionError?.message ||
            "Authentication required."
          );
        }

        const body =
          new FormData();

        body.set(
          "batchId",
          selectedBatchId
        );

        body.set(
          "scanDay",
          scanDay
        );

        const response =
          await fetch(
            "/api/academics/timetable/scan",
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${session.access_token}`,
              },

              body,
            }
          );

        const result =
          await response.json() as
            TimetableScanResult;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
            "Unable to scan timetable."
          );
        }

        setTimetableScan(
          result
        );
      } catch (error) {
        setTimetableScanError(
          error instanceof Error
            ? error.message
            : "Unable to scan timetable."
        );
      } finally {
        setScanningTimetable(false);
      }
    };

  const uploadPdf =
    async (
      file: File | null
    ) => {
      if (
        !file ||
        !selectedBatchId
      ) {
        return;
      }

      setStatusMessage("");
      setErrorMessage("");

      const fileName =
        file.name.toLowerCase();

      const extension =
        fileName
          .split(".")
          .pop() || "";

      const allowedExtensions = [
        "pdf",
        "jpg",
        "jpeg",
        "png",
        "webp",
      ];

      const allowedMimeTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      const isAllowedFile =
        allowedExtensions.includes(
          extension
        ) &&
        (
          !file.type ||
          allowedMimeTypes.includes(
            file.type
          )
        );

      if (!isAllowedFile) {
        setErrorMessage(
          "Upload PDF, JPG, JPEG, PNG or WEBP only."
        );
        return;
      }

      if (
        file.size >
        20 * 1024 * 1024
      ) {
        setErrorMessage(
          "Timetable file cannot exceed 20 MB."
        );
        return;
      }

      const contentType =
        file.type ||
        (
          extension === "pdf"
            ? "application/pdf"
            : extension === "png"
              ? "image/png"
              : extension === "webp"
                ? "image/webp"
                : "image/jpeg"
        );

      const client =
        getSupabaseClient();

      if (!client) {
        setErrorMessage(
          "Supabase is unavailable."
        );
        return;
      }

      setUploading(true);

      let newStoragePath = "";

      try {
        const {
          data: auth,
          error: authError,
        } =
          await client.auth.getUser();

        if (
          authError ||
          !auth.user
        ) {
          throw new Error(
            authError?.message ||
            "Authentication required."
          );
        }

        const safeFileName =
          file.name
            .replace(
              /[^a-zA-Z0-9._-]+/g,
              "-"
            )
            .replace(
              /-+/g,
              "-"
            );

        newStoragePath =
          `${selectedBatchId}/` +
          `${Date.now()}-${safeFileName}`;

        const {
          error: uploadError,
        } = await client.storage
          .from(
            TIMETABLE_BUCKET
          )
          .upload(
            newStoragePath,
            file,
            {
              contentType,
              cacheControl:
                "3600",
              upsert: false,
            }
          );

        if (uploadError) {
          throw uploadError;
        }

        const previousPath =
          document?.storage_path ||
          "";

        const {
          data: saved,
          error: saveError,
        } = await client
          .from(
            "batch_timetable_documents"
          )
          .upsert(
            {
              batch_id:
                selectedBatchId,
              storage_path:
                newStoragePath,
              file_name:
                file.name,
              file_size:
                file.size,
              uploaded_by:
                auth.user.id,
            },
            {
              onConflict:
                "batch_id",
            }
          )
          .select("*")
          .single();

        if (saveError) {
          await client.storage
            .from(
              TIMETABLE_BUCKET
            )
            .remove([
              newStoragePath,
            ]);

          throw saveError;
        }

        if (
          previousPath &&
          previousPath !==
            newStoragePath
        ) {
          const {
            error:
              cleanupError,
          } =
            await client.storage
              .from(
                TIMETABLE_BUCKET
              )
              .remove([
                previousPath,
              ]);

          if (cleanupError) {
            console.warn(
              "Old timetable file cleanup:",
              cleanupError.message
            );
          }
        }

        setDocument(saved);

        setSignedUrl(
          await makeSignedUrl(
            newStoragePath
          )
        );

        setStatusMessage(
          "Official timetable published successfully."
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to upload timetable."
        );
      } finally {
        setUploading(false);
      }
    };

  const removePdf =
    async () => {
      if (!document) {
        return;
      }

      const confirmed =
        window.confirm(
          "Remove this official timetable file?"
        );

      if (!confirmed) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setUploading(true);
      setStatusMessage("");
      setErrorMessage("");

      try {
        const storagePath =
          document.storage_path;

        const {
          error,
        } = await client
          .from(
            "batch_timetable_documents"
          )
          .delete()
          .eq(
            "id",
            document.id
          );

        if (error) {
          throw error;
        }

        if (storagePath) {
          const {
            error:
              storageError,
          } =
            await client.storage
              .from(
                TIMETABLE_BUCKET
              )
              .remove([
                storagePath,
              ]);

          if (storageError) {
            console.warn(
              "Timetable storage cleanup:",
              storageError.message
            );
          }
        }

        setDocument(null);
        setSignedUrl("");

        setStatusMessage(
          "Timetable removed."
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to remove timetable."
        );
      } finally {
        setUploading(false);
      }
    };

  if (!canManage) {
    return null;
  }

  return (
    <section
      id="academic-timetable-manager"
      className="timetablePdfPanel"
    >
      <div className="timetablePdfHeading">
        <div>
          <span>
            OFFICIAL TIMETABLE
          </span>

          <h3>
            Publish Official Timetable
          </h3>

          <p>
            Select a batch and upload its official
            timetable as PDF or image. Students in
            that batch will see it automatically.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="timetablePdfEmpty">
          Loading batches...
        </div>
      ) : (
        <>
          <div className="timetablePdfControls">
            <label>
              <span>
                Select batch
              </span>

              <select
                value={
                  selectedBatchId
                }
                onChange={
                  event =>
                    {
                      setSelectedBatchId(
                        event.target
                          .value
                      );

                      setTimetableScan(
                        null
                      );

                      setTimetableScanError(
                        ""
                      );
                    }
                }
              >
                {!batches.length ? (
                  <option value="">
                    No assigned batch
                  </option>
                ) : null}

                {batches.map(
                  batch => (
                    <option
                      key={batch.id}
                      value={batch.id}
                    >
                      {batchLabel(
                        batch
                      )}
                    </option>
                  )
                )}
              </select>
            </label>

            <label
              className={
                "timetablePdfUpload " +
                (
                  uploading ||
                  !selectedBatchId
                    ? "disabled"
                    : ""
                )
              }
            >
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                disabled={
                  uploading ||
                  !selectedBatchId
                }
                onChange={
                  event => {
                    const file =
                      event.target
                        .files?.[0] ||
                      null;

                    void uploadPdf(
                      file
                    );

                    event.currentTarget
                      .value = "";
                  }
                }
              />

              {uploading
                ? "Uploading..."
                : document
                  ? "Replace Timetable"
                  : "Upload Timetable"}
            </label>
          </div>

          {statusMessage ? (
            <div className="timetablePdfSuccess">
              {statusMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="timetablePdfError">
              {errorMessage}
            </div>
          ) : null}

          {!selectedBatchId ? (
            <div className="timetablePdfEmpty">
              No batch is currently assigned.
            </div>
          ) : document ? (
            <>
            <div className="timetablePdfDocument">
              <div className="timetablePdfMeta">
                <div className="timetablePdfBadge">
                  {String(
                    document.file_name ||
                      ""
                  )
                    .split(".")
                    .pop()
                    ?.toUpperCase() ||
                    "FILE"}
                </div>

                <div>
                  <strong>
                    {document.file_name ||
                      "Official Timetable"}
                  </strong>

                  <small>
                    Updated{" "}
                    {document.updated_at
                      ? new Date(
                          document.updated_at
                        ).toLocaleString()
                      : "recently"}
                  </small>
                </div>
              </div>

              <div className="timetablePdfActions">
                {signedUrl ? (
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open File
                  </a>
                ) : null}

                <button
                  type="button"
                  className="timetableScanButton"
                  onClick={
                    () =>
                      void scanOfficialTimetable(
                        "Monday"
                      )
                  }
                  disabled={
                    uploading ||
                    scanningTimetable
                  }
                >
                  {scanningTimetable
                    ? "Scanning Monday..."
                    : "Test Monday Scan"}
                </button>

                <button
                  type="button"
                  onClick={
                    () =>
                      void removePdf()
                  }
                  disabled={
                    uploading ||
                    scanningTimetable
                  }
                >
                  Remove
                </button>
              </div>

              {signedUrl ? (
                /\.(jpe?g|png|webp)$/i.test(
                  String(
                    document.file_name ||
                      ""
                  )
                ) ? (
                  <img
                    className="timetableImageViewer"
                    src={signedUrl}
                    alt={
                      document.file_name ||
                      "Official timetable"
                    }
                  />
                ) : (
                  <iframe
                    className="timetablePdfViewer"
                    src={signedUrl}
                    title={
                      document.file_name ||
                      "Official timetable"
                    }
                  />
                )
              ) : null}
            </div>

            {timetableScanError ? (
              <div className="timetableScanError">
                {timetableScanError}
              </div>
            ) : null}

            {timetableScan ? (
              <section className="timetableScanReview">
                <div className="timetableScanReviewHeader">
                  <div>
                    <span>
                      AI EXTRACTION · REVIEW ONLY
                    </span>

                    <h4>
                      Review Detected Schedule
                    </h4>

                    <p>
                      Nothing below has been published to
                      the structured timetable. Check the
                      detected cells and subject matches
                      before any future publish step.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      () => {
                        setTimetableScan(
                          null
                        );

                        setTimetableScanError(
                          ""
                        );
                      }
                    }
                  >
                    Discard Scan
                  </button>
                </div>

                {timetableScan.mode ===
                "pdf-text" ? (
                  <div className="timetableScanPdfText">
                    <strong>
                      PDF text extracted
                    </strong>

                    <p>
                      This PDF has embedded text.
                      Structured PDF parsing has not
                      been enabled yet, so no schedule
                      rows were generated.
                    </p>

                    {timetableScan.extractedText ? (
                      <pre>
                        {
                          timetableScan
                            .extractedText
                        }
                      </pre>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="timetableScanStats">
                      <div>
                        <strong>
                          {
                            timetableScan
                              .entries
                              ?.length ||
                            0
                          }
                        </strong>
                        <span>
                          Detected cells
                        </span>
                      </div>

                      <div>
                        <strong>
                          {
                            timetableScan
                              .entries
                              ?.filter(
                                item =>
                                  item
                                    .match
                                    .status ===
                                  "exact"
                              )
                              .length ||
                            0
                          }
                        </strong>
                        <span>
                          Exact matches
                        </span>
                      </div>

                      <div>
                        <strong>
                          {
                            timetableScan
                              .entries
                              ?.filter(
                                item =>
                                  item
                                    .match
                                    .status ===
                                  "possible"
                              )
                              .length ||
                            0
                          }
                        </strong>
                        <span>
                          Possible
                        </span>
                      </div>

                      <div>
                        <strong>
                          {
                            timetableScan
                              .entries
                              ?.filter(
                                item =>
                                  item
                                    .match
                                    .status ===
                                  "unmatched"
                              )
                              .length ||
                            0
                          }
                        </strong>
                        <span>
                          Unmatched
                        </span>
                      </div>
                    </div>

                    {(
                      timetableScan
                        .warnings ||
                      []
                    ).length ? (
                      <div className="timetableScanWarnings">
                        <strong>
                          Review warnings
                        </strong>

                        <ul>
                          {(
                            timetableScan
                              .warnings ||
                            []
                          ).map(
                            (
                              warning,
                              index
                            ) => (
                              <li
                                key={
                                  `${index}-${warning}`
                                }
                              >
                                {warning}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    ) : null}

                    {(
                      timetableScan
                        .breaks ||
                      []
                    ).length ? (
                      <div className="timetableScanBreaks">
                        {(
                          timetableScan
                            .breaks ||
                          []
                        ).map(
                          (
                            item,
                            index
                          ) => (
                            <div
                              key={
                                `${item.label}-${index}`
                              }
                            >
                              <strong>
                                {item.label}
                              </strong>

                              <span>
                                {
                                  item.start_time ||
                                  "?"
                                }
                                {" – "}
                                {
                                  item.end_time ||
                                  "?"
                                }
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    ) : null}

                    <div className="timetableScanDays">
                      {[
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                      ].map(day => {
                        const dayEntries =
                          (
                            timetableScan
                              .entries ||
                            []
                          )
                            .filter(
                              item =>
                                item.day_of_week ===
                                day
                            )
                            .sort(
                              (
                                a,
                                b
                              ) =>
                                a.start_period -
                                b.start_period
                            );

                        if (
                          !dayEntries
                            .length
                        ) {
                          return null;
                        }

                        return (
                          <section
                            key={day}
                            className="timetableScanDay"
                          >
                            <h5>
                              {day}
                            </h5>

                            <div className="timetableScanEntries">
                              {dayEntries.map(
                                (
                                  item,
                                  index
                                ) => {
                                  const span =
                                    item.end_period >
                                    item.start_period
                                      ? `Periods ${item.start_period}–${item.end_period}`
                                      : `Period ${item.start_period}`;

                                  return (
                                    <article
                                      key={
                                        `${day}-${item.start_period}-${index}`
                                      }
                                      className={
                                        "timetableScanEntry " +
                                        `is-${item.match.status}`
                                      }
                                    >
                                      <div className="timetableScanEntryTop">
                                        <div>
                                          <strong>
                                            {
                                              item.start_time ||
                                              "?"
                                            }
                                            {" – "}
                                            {
                                              item.end_time ||
                                              "?"
                                            }
                                          </strong>

                                          <span>
                                            {span}
                                          </span>
                                        </div>

                                        <span
                                          className={
                                            "timetableScanMatch " +
                                            `is-${item.match.status}`
                                          }
                                        >
                                          {item.match.status ===
                                          "exact"
                                            ? "Exact match"
                                            : item.match.status ===
                                                "possible"
                                              ? "Needs confirmation"
                                              : "Unmatched"}
                                        </span>
                                      </div>

                                      <div className="timetableScanRaw">
                                        <small>
                                          RAW DOCUMENT CELL
                                        </small>

                                        <strong>
                                          {
                                            item.raw_text ||
                                            "No text detected"
                                          }
                                        </strong>
                                      </div>

                                      <div className="timetableScanDetails">
                                        {item.detected_code ? (
                                          <span>
                                            <b>
                                              Code
                                            </b>
                                            {
                                              item.detected_code
                                            }
                                          </span>
                                        ) : null}

                                        {item.detected_name ? (
                                          <span>
                                            <b>
                                              Detected
                                            </b>
                                            {
                                              item.detected_name
                                            }
                                          </span>
                                        ) : null}

                                        {item.detected_faculty ? (
                                          <span>
                                            <b>
                                              Faculty
                                            </b>
                                            {
                                              item.detected_faculty
                                            }
                                          </span>
                                        ) : null}

                                        {item.detected_room ? (
                                          <span>
                                            <b>
                                              Room
                                            </b>
                                            {
                                              item.detected_room
                                            }
                                          </span>
                                        ) : null}

                                        <span>
                                          <b>
                                            Confidence
                                          </b>
                                          {
                                            item.confidence ||
                                            "unknown"
                                          }
                                        </span>
                                      </div>

                                      <div className="timetableScanMapping">
                                        {item.match.status ===
                                        "unmatched" ? (
                                          <>
                                            <strong>
                                              No safe CampusConnect subject match
                                            </strong>

                                            <p>
                                              {
                                                item
                                                  .match
                                                  .reason
                                              }
                                            </p>
                                          </>
                                        ) : (
                                          <>
                                            <strong>
                                              {
                                                item
                                                  .match
                                                  .subjectCode
                                              }
                                              {" · "}
                                              {
                                                item
                                                  .match
                                                  .subjectName
                                              }
                                            </strong>

                                            <p>
                                              {
                                                item
                                                  .match
                                                  .facultyName
                                              }
                                              {
                                                item
                                                  .match
                                                  .facultyName
                                                  ? " · "
                                                  : ""
                                              }
                                              {
                                                item
                                                  .match
                                                  .reason
                                              }
                                            </p>
                                          </>
                                        )}
                                      </div>
                                    </article>
                                  );
                                }
                              )}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>
            ) : null}
            </>
          ) : (
            <div className="timetablePdfEmpty">
              <h4>
                No timetable uploaded
              </h4>

              <p>
                Upload the official timetable for this batch.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}




function AcademicTimetableGrid({
  entries: _entries = [],
  breaks: _breaks = [],
  slots: _slots = [],
  editable: _editable = false,
  currentUserId: _currentUserId,
  onEdit: _onEdit,
  onDelete: _onDelete,
}: {
  entries?: Record<string, any>[];
  breaks?: Record<string, any>[];
  slots?: Record<string, any>[];
  editable?: boolean;
  currentUserId?: string;
  onEdit?: (
    item: Record<string, any>
  ) => void;
  onDelete?: (
    item: Record<string, any>
  ) => void;
}) {
  /*
   * Student timetable is now rendered from the
   * authenticated student's structured Published
   * timetable returned by get_my_timetable().
   *
   * Legacy uploaded timetable images/PDFs are no
   * longer the primary student timetable.
   */

  void _editable;
  void _currentUserId;
  void _onEdit;
  void _onDelete;


  type DigitalSlot = {
    key: string;
    kind:
      | "teaching"
      | "break";

    periodOrder:
      number;

    displayOrder:
      number;

    label:
      string;

    startTime:
      string;

    endTime:
      string;
  };


  const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];


  const entries =
    Array.isArray(
      _entries
    )
      ? _entries
      : [];


  const breaks =
    Array.isArray(
      _breaks
    )
      ? _breaks
      : [];


  const cleanTime = (
    value: unknown
  ) => {

    const raw =
      String(
        value || ""
      )
        .trim();


    if (!raw) {
      return "";
    }


    const match =
      raw.match(
        /^(\d{1,2}):(\d{2})/
      );


    if (!match) {
      return raw;
    }


    return (
      String(
        Number(
          match[1]
        )
      )
      +
      ":"
      +
      match[2]
    );
  };


  const timeMinutes = (
    value: unknown
  ) => {

    const raw =
      String(
        value || ""
      );


    const match =
      raw.match(
        /^(\d{1,2}):(\d{2})/
      );


    if (!match) {
      return 99999;
    }


    return (
      Number(
        match[1]
      ) * 60
      +
      Number(
        match[2]
      )
    );
  };


  const formatClock = (
    value: unknown
  ) => {

    const raw =
      String(
        value || ""
      );


    const match =
      raw.match(
        /^(\d{1,2}):(\d{2})/
      );


    if (!match) {
      return raw || "—";
    }


    const hour =
      Number(
        match[1]
      );

    const minute =
      match[2];

    const suffix =
      hour >= 12
        ? "PM"
        : "AM";

    const twelveHour =
      hour % 12 ||
      12;


    return (
      twelveHour
      +
      ":"
      +
      minute
      +
      " "
      +
      suffix
    );
  };


  /*
   * Preferred source: real timetable profile slots.
   *
   * Fallback source: legacy structured timetable rows +
   * batch break rows, used only when configured slots are
   * temporarily unavailable/offline.
   */
  const configuredSlots =
    Array.isArray(
      _slots
    )
      ? _slots
      : [];


  const profileSlots:
    DigitalSlot[] =
      configuredSlots
        .map<DigitalSlot>(
          (
            item,
            index
          ) => {

            const teaching =
              item.is_teaching_slot !==
                false;


            const periodOrder =
              Number(
                item.period_order
              );


            return {

              key:
                `configured-${
                  String(
                    item.id ||
                    index
                  )
                }`,

              kind:
                teaching
                  ? "teaching"
                  : "break",

              periodOrder:
                Number.isFinite(
                  periodOrder
                )
                  ? periodOrder
                  : index + 1,

              displayOrder:
                Number.isFinite(
                  periodOrder
                )
                  ? periodOrder
                  : index + 1,

              label:
                String(
                  item.label ||
                  (
                    teaching
                      ? `Period ${
                          Number.isFinite(
                            periodOrder
                          )
                            ? periodOrder
                            : index + 1
                        }`
                      : "Break"
                  )
                ),

              startTime:
                String(
                  item.start_time ||
                  ""
                ),

              endTime:
                String(
                  item.end_time ||
                  ""
                ),
            };
          }
        )
        .sort(
          (
            a,
            b
          ) =>
            a.displayOrder -
            b.displayOrder
        );


  const teachingSlotMap =
    new Map<
      string,
      DigitalSlot
    >();


  entries.forEach(
    item => {

      const periodOrder =
        Number(
          item.period_order
        );


      if (
        !Number.isFinite(
          periodOrder
        ) ||
        periodOrder <= 0
      ) {
        return;
      }


      const startTime =
        String(
          item.start_time ||
          ""
        );

      const endTime =
        String(
          item.end_time ||
          ""
        );


      const key =
        [
          periodOrder,
          cleanTime(
            startTime
          ),
          cleanTime(
            endTime
          ),
        ].join("|");


      if (
        teachingSlotMap.has(
          key
        )
      ) {
        return;
      }


      teachingSlotMap.set(
        key,
        {
          key:
            `period-${key}`,

          kind:
            "teaching",

          periodOrder,

          displayOrder:
            periodOrder,

          label:
            `Period ${periodOrder}`,

          startTime,

          endTime,
        }
      );
    }
  );


  const teachingSlots =
    Array.from(
      teachingSlotMap.values()
    );


  const breakSlots:
    DigitalSlot[] =
      breaks.map(
        (
          item,
          index
        ) => ({

          key:
            `break-${
              String(
                item.id ||
                index
              )
            }`,

          kind:
            "break",

          periodOrder:
            Number(
              item.period_order ||
              0
            ),

          displayOrder:
            Number(
              item.display_order ||
              item.period_order ||
              1000 +
              index
            ),

          label:
            String(
              item.label ||
              "Break"
            ),

          startTime:
            String(
              item.start_time ||
              ""
            ),

          endTime:
            String(
              item.end_time ||
              ""
            ),

        })
      );


  const legacySlots =
    [
      ...teachingSlots,
      ...breakSlots,
    ].sort(
      (
        a,
        b
      ) => {

        const timeDifference =
          timeMinutes(
            a.startTime
          )
          -
          timeMinutes(
            b.startTime
          );


        if (
          timeDifference !==
          0
        ) {
          return timeDifference;
        }


        return (
          a.displayOrder
          -
          b.displayOrder
        );
      }
    );


  const slots =
    profileSlots.length
      ? profileSlots
      : legacySlots;


  const entryDay = (
    item: Record<
      string,
      any
    >
  ) =>
    String(
      item.day_of_week ||
      ""
    )
      .trim()
      .toLowerCase();


  const classesForSlot = (
    day: string,
    slot:
      DigitalSlot
  ) => {

    if (
      slot.kind !==
      "teaching"
    ) {
      return [];
    }


    return entries.filter(
      item => {

        if (
          entryDay(
            item
          ) !==
          day.toLowerCase()
        ) {
          return false;
        }


        const itemPeriod =
          Number(
            item.period_order
          );


        if (
          itemPeriod ===
          slot.periodOrder
        ) {
          return true;
        }


        return (
          cleanTime(
            item.start_time
          ) ===
            cleanTime(
              slot.startTime
            )
          &&
          cleanTime(
            item.end_time
          ) ===
            cleanTime(
              slot.endTime
            )
        );
      }
    );
  };


  const isSameSession = (
    current:
      Record<string, any>,

    next:
      Record<string, any>
  ) => {

    return (
      String(
        current.subject_code ||
        current.subject_name ||
        ""
      )
        .trim()
        .toLowerCase()
      ===
      String(
        next.subject_code ||
        next.subject_name ||
        ""
      )
        .trim()
        .toLowerCase()
      &&
      String(
        current.faculty_name ||
        ""
      )
        .trim()
        .toLowerCase()
      ===
      String(
        next.faculty_name ||
        ""
      )
        .trim()
        .toLowerCase()
      &&
      Number(
        next.period_order
      )
      ===
      Number(
        current.period_order
      ) + 1
    );
  };


  const sessionPosition = (
    day: string,
    slot:
      DigitalSlot,
    item:
      Record<string, any>
  ) => {

    const period =
      Number(
        item.period_order
      );


    const dayEntries =
      entries
        .filter(
          candidate =>
            entryDay(
              candidate
            ) ===
            day.toLowerCase()
        )
        .sort(
          (
            a,
            b
          ) =>
            Number(
              a.period_order
            )
            -
            Number(
              b.period_order
            )
        );


    const previous =
      dayEntries.find(
        candidate =>
          Number(
            candidate.period_order
          ) ===
            period - 1
          &&
          isSameSession(
            candidate,
            item
          )
      );


    const next =
      dayEntries.find(
        candidate =>
          Number(
            candidate.period_order
          ) ===
            period + 1
          &&
          isSameSession(
            item,
            candidate
          )
      );


    if (
      previous &&
      next
    ) {
      return "middle";
    }


    if (previous) {
      return "end";
    }


    if (next) {
      return "start";
    }


    void slot;

    return "single";
  };


  if (
    !entries.length
  ) {

    return (
      <section className="studentDigitalTimetable">

        <div className="studentDigitalTimetableEmpty">

          <div>
            ▦
          </div>

          <h3>
            Digital timetable not published yet
          </h3>

          <p>
            Your batch timetable will appear here
            automatically after the Timetable
            Coordinator publishes it.
          </p>

        </div>

      </section>
    );
  }


  return (
    <section className="studentDigitalTimetable">

      <header className="studentDigitalTimetableIntro">

        <div>

          <span>
            MY BATCH · LIVE SCHEDULE
          </span>

          <h3>
            Digital Timetable
          </h3>

          <p>
            Your published weekly schedule with
            subjects, faculty, rooms, labs and breaks.
          </p>

        </div>


        <div className="studentDigitalTimetableStatus">

          <i />

          <span>
            Published
          </span>

        </div>

      </header>


      <div className="studentDigitalTimetableLegend">

        <span>
          <i className="lecture" />
          Lecture
        </span>

        <span>
          <i className="lab" />
          Lab / Practical
        </span>

        <span>
          <i className="break" />
          Break
        </span>

      </div>


      <div className="studentDigitalTimetableScroller">

        <div
          className="studentDigitalTimetableTable"
          style={{
            gridTemplateColumns:
              `128px repeat(${slots.length}, minmax(158px, 1fr))`,
          }}
        >

          <div className="studentDigitalTimetableCorner">

            <strong>
              DAY
            </strong>

            <small>
              WEEK
            </small>

          </div>


          {slots.map(
            slot => (

              <div
                key={
                  `header-${slot.key}`
                }
                className={
                  slot.kind ===
                  "break"
                    ? "studentDigitalTimetableSlotHeader is-break"
                    : "studentDigitalTimetableSlotHeader"
                }
              >

                <strong>
                  {slot.label}
                </strong>

                <small>
                  {formatClock(
                    slot.startTime
                  )}
                  {" – "}
                  {formatClock(
                    slot.endTime
                  )}
                </small>

              </div>
            )
          )}


          {DAYS.map(
            day => (

              <div
                key={
                  `row-${day}`
                }
                className="studentDigitalTimetableRowContents"
                style={{
                  display:
                    "contents",
                }}
              >

                <div className="studentDigitalTimetableDay">

                  <strong>
                    {day}
                  </strong>

                  <small>
                    {entries.filter(
                      item =>
                        entryDay(
                          item
                        ) ===
                        day.toLowerCase()
                    ).length}
                    {" "}
                    periods
                  </small>

                </div>


                {slots.map(
                  slot => {

                    if (
                      slot.kind ===
                      "break"
                    ) {

                      return (
                        <div
                          key={
                            `${day}-${slot.key}`
                          }
                          className="studentDigitalTimetableBreak"
                        >

                          <span>
                            {slot.label}
                          </span>

                          <small>
                            {formatClock(
                              slot.startTime
                            )}
                          </small>

                        </div>
                      );
                    }


                    const cellEntries =
                      classesForSlot(
                        day,
                        slot
                      );


                    if (
                      !cellEntries.length
                    ) {

                      return (
                        <div
                          key={
                            `${day}-${slot.key}`
                          }
                          className="studentDigitalTimetableCell is-empty"
                        >

                          <span>
                            Free
                          </span>

                        </div>
                      );
                    }


                    return (
                      <div
                        key={
                          `${day}-${slot.key}`
                        }
                        className="studentDigitalTimetableCell"
                      >

                        {cellEntries.map(
                          (
                            item,
                            itemIndex
                          ) => {

                            const classType =
                              String(
                                item.class_type ||
                                "Lecture"
                              );


                            const isLab =
                              /lab|practical/i.test(
                                classType
                              );


                            const position =
                              sessionPosition(
                                day,
                                slot,
                                item
                              );


                            return (
                              <article
                                key={
                                  String(
                                    item.id ||
                                    `${day}-${slot.key}-${itemIndex}`
                                  )
                                }
                                className={
                                  [
                                    "studentDigitalTimetableClass",
                                    isLab
                                      ? "is-lab"
                                      : "",
                                    position !==
                                    "single"
                                      ? `is-session-${position}`
                                      : "",
                                  ]
                                    .filter(
                                      Boolean
                                    )
                                    .join(
                                      " "
                                    )
                                }
                              >

                                <div className="studentDigitalTimetableClassTop">

                                  <span>
                                    {String(
                                      item.subject_code ||
                                      classType
                                    )}
                                  </span>

                                  <i>
                                    {classType}
                                  </i>

                                </div>


                                <h4>
                                  {String(
                                    item.subject_name ||
                                    item.subject_code ||
                                    "Scheduled class"
                                  )}
                                </h4>


                                <div className="studentDigitalTimetableClassMeta">

                                  <span>
                                    <b>
                                      Faculty
                                    </b>

                                    {String(
                                      item.faculty_name ||
                                      "Assigned faculty"
                                    )}
                                  </span>


                                  <span>
                                    <b>
                                      Room
                                    </b>

                                    {String(
                                      item.room ||
                                      "TBA"
                                    )}
                                  </span>

                                </div>


                                {position !==
                                  "single" && (
                                  <div className="studentDigitalTimetableSessionBadge">

                                    {position ===
                                    "start"
                                      ? "Multi-period session starts"
                                      : position ===
                                          "middle"
                                        ? "Session continues"
                                        : "Session ends"}

                                  </div>
                                )}

                              </article>
                            );
                          }
                        )}

                      </div>
                    );
                  }
                )}

              </div>
            )
          )}

        </div>

      </div>


      <footer className="studentDigitalTimetableFooter">

        <div>

          <strong>
            Live from CampusConnect
          </strong>

          <span>
            Only your authenticated batch timetable
            is shown here.
          </span>

        </div>


        <span>
          {entries.length}
          {" "}
          published periods
        </span>

      </footer>

    </section>
  );
}




function AcademicMarksManager({
  role,
  profile,
}: {
  role: Role;
  profile: Profile;
}) {
  type MarksBatch = {
    id: string;
    batch_name: string;
    section: string;
    department: string;
    academic_year: string;
    semester: string;
    total_students?: number;
  };

  type MarksSubject = {
    id: string;
    batch_id: string;
    subject_name: string;
    subject_code: string;
    credits?: number | null;
    subject_type?: string;
    faculty_id: string | null;
    faculty_name: string;
  };

  type MarksStudent = {
    id: string;
    batch_id: string;
    student_id: string;
    student_name: string;
    campus_uid: string;
    department: string;
    graduation_year: string;
    roll_number: string;
  };

  type MarksRecord = {
    id: string;
    student_id: string;
    batch_id: string | null;
    batch_subject_id: string | null;
    faculty_id: string | null;
    faculty_name: string;
    subject_code: string;
    subject_name: string;
    semester: number | null;
    assessment: string;
    assessment_type: string;
    assessment_number: number | null;
    marks: number | null;
    max_marks: number | null;
    remarks: string;
    published_at: string | null;
    created_at: string;
    updated_at: string;
  };

  const assessmentTypes = [
    "Internal",
    "Assignment",
    "Lab",
    "CIE",
    "Quiz",
    "Project",
    "Other",
  ];

  const canManageMarks =
    role === "Faculty" ||
    role === "Main Admin";

  const [batches, setBatches] =
    useState<MarksBatch[]>([]);

  const [subjects, setSubjects] =
    useState<MarksSubject[]>([]);

  const [students, setStudents] =
    useState<MarksStudent[]>([]);

  const [records, setRecords] =
    useState<MarksRecord[]>([]);

  const [
    selectedBatchId,
    setSelectedBatchId,
  ] = useState("");

  const [
    selectedSubjectId,
    setSelectedSubjectId,
  ] = useState("");

  const [
    selectedStudentId,
    setSelectedStudentId,
  ] = useState("");

  const [assessmentType, setAssessmentType] =
    useState("Internal");

  const [
    assessmentNumber,
    setAssessmentNumber,
  ] = useState("1");

  const [obtainedMarks, setObtainedMarks] =
    useState("");

  const [maximumMarks, setMaximumMarks] =
    useState("");

  const [remarks, setRemarks] =
    useState("");

  const [editingId, setEditingId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [search, setSearch] =
    useState("");

  const selectedBatch =
    batches.find(
      item =>
        item.id === selectedBatchId
    ) || null;

  const selectedSubject =
    subjects.find(
      item =>
        item.id === selectedSubjectId
    ) || null;

  const selectedStudent =
    students.find(
      item =>
        item.student_id ===
        selectedStudentId
    ) || null;


  const resetAssessmentForm = () => {
    setEditingId("");
    setAssessmentType("Internal");
    setAssessmentNumber("1");
    setObtainedMarks("");
    setMaximumMarks("");
    setRemarks("");
  };


  const loadBatches = async () => {
    const client =
      getSupabaseClient();

    if (!client) {
      setStatus(
        "Unable to connect to CampusConnect."
      );
      return;
    }

    const {
      data: auth,
      error: authError,
    } = await client.auth.getUser();

    if (
      authError ||
      !auth.user
    ) {
      setStatus(
        "Your session is unavailable."
      );
      return;
    }

    let allowedBatchIds:
      string[] | null = null;

    if (role === "Faculty") {
      const {
        data: assignedSubjects,
        error: assignedError,
      } = await client
        .from(
          "attendance_batch_subjects"
        )
        .select("batch_id")
        .eq(
          "faculty_id",
          auth.user.id
        );

      if (assignedError) {
        console.error(
          "Marks assigned batches:",
          assignedError
        );

        setStatus(
          `Unable to load assigned batches: ${assignedError.message}`
        );
        return;
      }

      allowedBatchIds =
        Array.from(
          new Set(
            (
              assignedSubjects ||
              []
            )
              .map(item =>
                String(
                  item.batch_id ||
                  ""
                ).trim()
              )
              .filter(Boolean)
          )
        );

      if (
        allowedBatchIds.length === 0
      ) {
        setBatches([]);
        setSelectedBatchId("");
        setStatus(
          "No academic subjects are assigned to you yet."
        );
        return;
      }
    }

    let query =
      client
        .from(
          "attendance_batches"
        )
        .select(
          "id,batch_name,section,department,academic_year,semester,total_students"
        )
        .order(
          "updated_at",
          {
            ascending: false,
          }
        );

    if (
      allowedBatchIds
    ) {
      query =
        query.in(
          "id",
          allowedBatchIds
        );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(
        "Marks batches:",
        error
      );

      setStatus(
        `Unable to load batches: ${error.message}`
      );
      return;
    }

    const rows =
      (data ||
        []) as MarksBatch[];

    setBatches(rows);

    setSelectedBatchId(
      current =>
        current &&
        rows.some(
          item =>
            item.id === current
        )
          ? current
          : rows[0]?.id || ""
    );
  };


  const loadSubjects = async (
    batchId: string
  ) => {
    if (!batchId) {
      setSubjects([]);
      setSelectedSubjectId("");
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) {
      return;
    }

    const {
      data: auth,
    } = await client.auth.getUser();

    let query =
      client
        .from(
          "attendance_batch_subjects"
        )
        .select(
          "id,batch_id,subject_name,subject_code,credits,subject_type,faculty_id,faculty_name"
        )
        .eq(
          "batch_id",
          batchId
        );

    if (
      role === "Faculty" &&
      auth.user?.id
    ) {
      query =
        query.eq(
          "faculty_id",
          auth.user.id
        );
    }

    const {
      data,
      error,
    } = await query.order(
      "subject_name",
      {
        ascending: true,
      }
    );

    if (error) {
      console.error(
        "Marks subjects:",
        error
      );

      setSubjects([]);
      setStatus(
        `Unable to load subjects: ${error.message}`
      );
      return;
    }

    const rows =
      (data ||
        []) as MarksSubject[];

    setSubjects(rows);

    setSelectedSubjectId(
      current =>
        current &&
        rows.some(
          item =>
            item.id === current
        )
          ? current
          : rows[0]?.id || ""
    );
  };


  const loadStudents = async (
    batchId: string
  ) => {
    if (!batchId) {
      setStudents([]);
      setSelectedStudentId("");
      return;
    }

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
        "attendance_batch_students"
      )
      .select(
        "id,batch_id,student_id,student_name,campus_uid,department,graduation_year,roll_number"
      )
      .eq(
        "batch_id",
        batchId
      )
      .order(
        "student_name",
        {
          ascending: true,
        }
      );

    if (error) {
      console.error(
        "Marks batch students:",
        error
      );

      setStudents([]);
      setStatus(
        `Unable to load students: ${error.message}`
      );
      return;
    }

    const rows =
      (data ||
        []) as MarksStudent[];

    setStudents(rows);

    setSelectedStudentId(
      current =>
        current &&
        rows.some(
          item =>
            item.student_id ===
            current
        )
          ? current
          : rows[0]?.student_id ||
            ""
    );
  };


  const loadMarks = async () => {
    if (
      !selectedBatchId ||
      !selectedSubjectId ||
      !selectedStudentId
    ) {
      setRecords([]);
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) {
      return;
    }

    const {
      data,
      error,
    } = await client
      .from("college_marks")
      .select("*")
      .eq(
        "batch_id",
        selectedBatchId
      )
      .eq(
        "batch_subject_id",
        selectedSubjectId
      )
      .eq(
        "student_id",
        selectedStudentId
      )
      .order(
        "assessment_type",
        {
          ascending: true,
        }
      )
      .order(
        "assessment_number",
        {
          ascending: true,
        }
      );

    if (error) {
      console.error(
        "Marks records:",
        error
      );

      setRecords([]);
      setStatus(
        `Unable to load marks: ${error.message}`
      );
      return;
    }

    setRecords(
      (data ||
        []) as MarksRecord[]
    );
  };


  useEffect(() => {
    if (!canManageMarks) {
      setLoading(false);
      return;
    }

    let active = true;

    const run = async () => {
      setLoading(true);
      setStatus("");

      await loadBatches();

      if (active) {
        setLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [role]);


  useEffect(() => {
    resetAssessmentForm();
    setStatus("");

    if (!selectedBatchId) {
      setSubjects([]);
      setStudents([]);
      setRecords([]);
      return;
    }

    void Promise.all([
      loadSubjects(
        selectedBatchId
      ),
      loadStudents(
        selectedBatchId
      ),
    ]);
  }, [selectedBatchId]);


  useEffect(() => {
    resetAssessmentForm();
    setStatus("");
    void loadMarks();
  }, [
    selectedSubjectId,
    selectedStudentId,
  ]);


  const saveMarks = async () => {
    if (
      !selectedBatch ||
      !selectedSubject ||
      !selectedStudent
    ) {
      setStatus(
        "Select a batch, subject and student first."
      );
      return;
    }

    const number =
      Number(
        assessmentNumber
      );

    const marksValue =
      Number(
        obtainedMarks
      );

    const maxValue =
      Number(
        maximumMarks
      );

    if (
      !Number.isInteger(number) ||
      number < 1
    ) {
      setStatus(
        "Assessment number must be 1 or greater."
      );
      return;
    }

    if (
      obtainedMarks.trim() === "" ||
      !Number.isFinite(
        marksValue
      ) ||
      marksValue < 0
    ) {
      setStatus(
        "Enter valid obtained marks."
      );
      return;
    }

    if (
      maximumMarks.trim() === "" ||
      !Number.isFinite(
        maxValue
      ) ||
      maxValue <= 0
    ) {
      setStatus(
        "Maximum marks must be greater than zero."
      );
      return;
    }

    if (
      marksValue > maxValue
    ) {
      setStatus(
        "Obtained marks cannot exceed maximum marks."
      );
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) {
      setStatus(
        "Unable to connect to CampusConnect."
      );
      return;
    }

    const {
      data: auth,
      error: authError,
    } = await client.auth.getUser();

    if (
      authError ||
      !auth.user
    ) {
      setStatus(
        "Your session is unavailable."
      );
      return;
    }

    const semesterNumber =
      Number(
        selectedBatch.semester
      );

    const assessmentLabel =
      `${assessmentType} ${number}`;

    const payload = {
      student_id:
        selectedStudent.student_id,

      batch_id:
        selectedBatch.id,

      batch_subject_id:
        selectedSubject.id,

      faculty_id:
        role === "Faculty"
          ? auth.user.id
          : selectedSubject.faculty_id ||
            null,

      faculty_name:
        role === "Faculty"
          ? String(
              profile.name ||
                selectedSubject.faculty_name ||
                ""
            )
          : selectedSubject.faculty_name ||
            "",

      subject_code:
        selectedSubject.subject_code ||
        "",

      subject_name:
        selectedSubject.subject_name,

      semester:
        Number.isFinite(
          semesterNumber
        )
          ? semesterNumber
          : null,

      assessment:
        assessmentLabel,

      assessment_type:
        assessmentType,

      assessment_number:
        number,

      marks:
        marksValue,

      max_marks:
        maxValue,

      remarks:
        remarks.trim(),

      published_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
    };

    setSaving(true);
    setStatus("");

    try {
      if (editingId) {
        const {
          error,
        } = await client
          .from(
            "college_marks"
          )
          .update(payload)
          .eq(
            "id",
            editingId
          );

        if (error) {
          throw error;
        }

        setStatus(
          `${assessmentLabel} updated successfully.`
        );
      } else {
        const {
          error,
        } = await client
          .from(
            "college_marks"
          )
          .insert({
            ...payload,
            created_at:
              new Date().toISOString(),
          });

        if (error) {
          if (
            error.code ===
              "23505" ||
            error.message
              .toLowerCase()
              .includes(
                "duplicate"
              )
          ) {
            throw new Error(
              `${assessmentLabel} already exists for this student and subject. Edit the existing record instead.`
            );
          }

          throw error;
        }

        setStatus(
          `${assessmentLabel} published successfully.`
        );
      }

      resetAssessmentForm();
      await loadMarks();

    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error ===
              "object" &&
            error !== null &&
            "message" in error
          ? String(
              (
                error as {
                  message?: unknown;
                }
              ).message ||
                "Unknown error"
            )
          : "Unknown error";

      console.error(
        "Save academic marks:",
        error
      );

      setStatus(
        `Unable to save marks: ${message}`
      );
    } finally {
      setSaving(false);
    }
  };


  const editMarks = (
    item: MarksRecord
  ) => {
    setEditingId(
      item.id
    );

    setAssessmentType(
      item.assessment_type ||
        "Internal"
    );

    setAssessmentNumber(
      String(
        item.assessment_number ||
          1
      )
    );

    setObtainedMarks(
      item.marks === null ||
        item.marks === undefined
        ? ""
        : String(item.marks)
    );

    setMaximumMarks(
      item.max_marks === null ||
        item.max_marks === undefined
        ? ""
        : String(
            item.max_marks
          )
    );

    setRemarks(
      item.remarks || ""
    );

    setStatus("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };


  const deleteMarks = async (
    item: MarksRecord
  ) => {
    const confirmed =
      window.confirm(
        `Delete ${item.assessment} for ${selectedStudent?.student_name || "this student"}?\n\nThis action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) {
      return;
    }

    setDeletingId(
      item.id
    );

    setStatus("");

    try {
      const {
        error,
      } = await client
        .from(
          "college_marks"
        )
        .delete()
        .eq(
          "id",
          item.id
        );

      if (error) {
        throw error;
      }

      if (
        editingId === item.id
      ) {
        resetAssessmentForm();
      }

      setStatus(
        `${item.assessment} deleted.`
      );

      await loadMarks();

    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error ===
              "object" &&
            error !== null &&
            "message" in error
          ? String(
              (
                error as {
                  message?: unknown;
                }
              ).message ||
                "Unknown error"
            )
          : "Unknown error";

      console.error(
        "Delete academic marks:",
        error
      );

      setStatus(
        `Unable to delete marks: ${message}`
      );
    } finally {
      setDeletingId("");
    }
  };


  const totalObtained =
    records.reduce(
      (sum, item) =>
        sum +
        Number(
          item.marks || 0
        ),
      0
    );

  const totalMaximum =
    records.reduce(
      (sum, item) =>
        sum +
        Number(
          item.max_marks || 0
        ),
      0
    );

  const overallPercentage =
    totalMaximum > 0
      ? (
          (
            totalObtained /
            totalMaximum
          ) * 100
        ).toFixed(1)
      : "0.0";

  const filteredStudents =
    students.filter(
      student => {
        const needle =
          search
            .trim()
            .toLowerCase();

        if (!needle) {
          return true;
        }

        return [
          student.student_name,
          student.campus_uid,
          student.roll_number,
        ].some(value =>
          String(
            value || ""
          )
            .toLowerCase()
            .includes(
              needle
            )
        );
      }
    );


  /*
   * Keep the selected student synchronized with the
   * currently visible search results.
   *
   * Without this, the native <select> can visually show
   * the first filtered option while selectedStudentId
   * still points to the previously selected student.
   */
  useEffect(() => {
    if (!search.trim()) {
      return;
    }

    if (!filteredStudents.length) {
      setSelectedStudentId("");
      return;
    }

    const selectedStillVisible =
      filteredStudents.some(
        student =>
          student.student_id ===
          selectedStudentId
      );

    if (!selectedStillVisible) {
      setSelectedStudentId(
        filteredStudents[0].student_id
      );
    }
  }, [
    search,
    students,
    selectedStudentId,
  ]);


  if (!canManageMarks) {
    return null;
  }


  return (
    <section
      className="academicProSection academicMarksManager"
    >
      <header
        className="academicProSectionHeading"
      >
        <div>
          <span>
            ASSESSMENT MANAGEMENT
          </span>

          <h2>
            Marks management
          </h2>

          <p>
            Publish and manage assessment
            marks using verified batch,
            subject and student records.
          </p>
        </div>

        <strong>
          {role === "Faculty"
            ? "Assigned subjects only"
            : "Admin access"}
        </strong>
      </header>


      {loading ? (
        <div className="academicEmpty">
          <span>◇</span>
          <p>
            Loading academic workspace...
          </p>
        </div>
      ) : (
        <>
          <div
            className="academicMarksManagerFilters"
          >
            <label>
              <span>BATCH</span>

              <select
                value={
                  selectedBatchId
                }
                onChange={event =>
                  setSelectedBatchId(
                    event.target
                      .value
                  )
                }
              >
                {!batches.length && (
                  <option value="">
                    No batches available
                  </option>
                )}

                {batches.map(
                  batch => (
                    <option
                      key={
                        batch.id
                      }
                      value={
                        batch.id
                      }
                    >
                      {[
                        batch.batch_name,
                        batch.section,
                        batch.department,
                        batch.semester
                          ? `Sem ${batch.semester}`
                          : "",
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          " · "
                        )}
                    </option>
                  )
                )}
              </select>
            </label>


            <label>
              <span>SUBJECT</span>

              <select
                value={
                  selectedSubjectId
                }
                disabled={
                  !subjects.length
                }
                onChange={event =>
                  setSelectedSubjectId(
                    event.target
                      .value
                  )
                }
              >
                {!subjects.length && (
                  <option value="">
                    No assigned subjects
                  </option>
                )}

                {subjects.map(
                  subject => (
                    <option
                      key={
                        subject.id
                      }
                      value={
                        subject.id
                      }
                    >
                      {subject.subject_name}
                      {subject.subject_code
                        ? ` · ${subject.subject_code}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </label>


            <label>
              <span>FIND STUDENT</span>

              <input
                value={search}
                placeholder="Name, UID or roll number"
                onChange={event =>
                  setSearch(
                    event.target
                      .value
                  )
                }
              />
            </label>


            <label>
              <span>STUDENT</span>

              <select
                value={
                  selectedStudentId
                }
                disabled={
                  !filteredStudents.length
                }
                onChange={event =>
                  setSelectedStudentId(
                    event.target
                      .value
                  )
                }
              >
                {!filteredStudents.length && (
                  <option value="">
                    No students available
                  </option>
                )}

                {filteredStudents.map(
                  student => (
                    <option
                      key={
                        student.student_id
                      }
                      value={
                        student.student_id
                      }
                    >
                      {student.student_name}
                      {student.campus_uid
                        ? ` · ${student.campus_uid}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>


          <div
            className="academicMarksManagerContext"
          >
            <div>
              <small>
                SELECTED STUDENT
              </small>

              <strong>
                {selectedStudent
                  ?.student_name ||
                  "No student selected"}
              </strong>

              <span>
                {selectedStudent
                  ?.campus_uid ||
                  "—"}
              </span>
            </div>

            <div>
              <small>
                SUBJECT
              </small>

              <strong>
                {selectedSubject
                  ?.subject_name ||
                  "—"}
              </strong>

              <span>
                {selectedSubject
                  ?.subject_code ||
                  "—"}
              </span>
            </div>

            <div>
              <small>
                FACULTY
              </small>

              <strong>
                {selectedSubject
                  ?.faculty_name ||
                  profile.name ||
                  "—"}
              </strong>

              <span>
                {selectedBatch
                  ? [
                      selectedBatch
                        .batch_name,
                      selectedBatch
                        .section,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        " · "
                      )
                  : "—"}
              </span>
            </div>
          </div>


          <div
            className="academicMarksEntryPanel"
          >
            <header>
              <div>
                <span>
                  {editingId
                    ? "EDIT ASSESSMENT"
                    : "NEW ASSESSMENT"}
                </span>

                <h3>
                  {editingId
                    ? "Update published marks"
                    : "Publish assessment marks"}
                </h3>
              </div>

              {editingId && (
                <button
                  type="button"
                  className="ghost"
                  onClick={
                    resetAssessmentForm
                  }
                >
                  Cancel edit
                </button>
              )}
            </header>


            <div
              className="academicMarksEntryGrid"
            >
              <label>
                <span>
                  ASSESSMENT TYPE
                </span>

                <select
                  value={
                    assessmentType
                  }
                  onChange={event =>
                    setAssessmentType(
                      event.target
                        .value
                    )
                  }
                >
                  {assessmentTypes.map(
                    item => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </label>


              <label>
                <span>
                  NUMBER
                </span>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={
                    assessmentNumber
                  }
                  onChange={event =>
                    setAssessmentNumber(
                      event.target
                        .value
                    )
                  }
                />
              </label>


              <label>
                <span>
                  MARKS OBTAINED
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={
                    obtainedMarks
                  }
                  placeholder="18"
                  onChange={event =>
                    setObtainedMarks(
                      event.target
                        .value
                    )
                  }
                />
              </label>


              <label>
                <span>
                  MAXIMUM MARKS
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={
                    maximumMarks
                  }
                  placeholder="20"
                  onChange={event =>
                    setMaximumMarks(
                      event.target
                        .value
                    )
                  }
                />
              </label>
            </div>


            <label
              className="academicMarksRemarks"
            >
              <span>
                REMARKS
              </span>

              <textarea
                rows={3}
                value={remarks}
                placeholder="Optional faculty remarks"
                onChange={event =>
                  setRemarks(
                    event.target
                      .value
                  )
                }
              />
            </label>


            <footer
              className="academicMarksEntryFooter"
            >
              <div>
                {obtainedMarks &&
                maximumMarks &&
                Number(
                  maximumMarks
                ) > 0 ? (
                  <>
                    <small>
                      PERFORMANCE
                    </small>

                    <strong>
                      {Math.min(
                        100,
                        Math.max(
                          0,
                          (
                            Number(
                              obtainedMarks
                            ) /
                            Number(
                              maximumMarks
                            )
                          ) *
                            100
                        )
                      ).toFixed(
                        1
                      )}
                      %
                    </strong>
                  </>
                ) : (
                  <small>
                    Enter marks to preview
                    performance.
                  </small>
                )}
              </div>

              <button
                type="button"
                className="primary"
                disabled={
                  saving ||
                  !selectedBatch ||
                  !selectedSubject ||
                  !selectedStudent
                }
                onClick={() =>
                  void saveMarks()
                }
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update marks"
                  : "Publish marks"}
              </button>
            </footer>
          </div>


          {status && (
            <div
              className="academicMarksStatus"
              role="status"
            >
              {status}
            </div>
          )}


          <div
            className="academicMarksSummary"
          >
            <article>
              <small>
                ASSESSMENTS
              </small>

              <strong>
                {records.length}
              </strong>
            </article>

            <article>
              <small>
                OBTAINED
              </small>

              <strong>
                {totalObtained.toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits:
                      2,
                  }
                )}
              </strong>
            </article>

            <article>
              <small>
                MAXIMUM
              </small>

              <strong>
                {totalMaximum.toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits:
                      2,
                  }
                )}
              </strong>
            </article>

            <article>
              <small>
                OVERALL
              </small>

              <strong>
                {overallPercentage}%
              </strong>
            </article>
          </div>


          <div
            className="academicMarksProTable academicMarksManagementTable"
          >
            <header>
              <span>
                ASSESSMENT
              </span>

              <span>
                SCORE
              </span>

              <span>
                PERFORMANCE
              </span>

              <span>
                ACTIONS
              </span>
            </header>

            {records.map(
              item => {
                const percent =
                  item.max_marks
                    ? (
                        Number(
                          item.marks ||
                            0
                        ) /
                        Number(
                          item.max_marks
                        )
                      ) * 100
                    : 0;

                return (
                  <article
                    key={
                      item.id
                    }
                  >
                    <div>
                      <strong>
                        {item.assessment}
                      </strong>

                      <small>
                        {item.remarks ||
                          "Published assessment"}
                      </small>
                    </div>

                    <strong>
                      {item.marks ??
                        "—"}
                      {item.max_marks
                        ? ` / ${item.max_marks}`
                        : ""}
                    </strong>

                    <div
                      className="academicMarksProgress"
                    >
                      <i>
                        <span
                          style={{
                            width:
                              `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  percent
                                )
                              )}%`,
                          }}
                        />
                      </i>

                      <small>
                        {percent.toFixed(
                          1
                        )}
                        %
                      </small>
                    </div>

                    <div
                      className="academicMarksRowActions"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          editMarks(
                            item
                          )
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={
                          deletingId ===
                          item.id
                        }
                        onClick={() =>
                          void deleteMarks(
                            item
                          )
                        }
                      >
                        {deletingId ===
                        item.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>


          {!records.length && (
            <EmptyAcademic
              text={
                selectedStudent &&
                selectedSubject
                  ? "No marks have been published for this student and subject yet."
                  : "Select a batch, subject and student to manage marks."
              }
            />
          )}
        </>
      )}
    </section>
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
  if (v === "College ID") return "Verify a Student USN, Faculty Employee ID, Campus UID or official college ID barcode.";
  if (v === "Seva Kendra") return "Submit and track official campus requests through a secure role-based service desk.";
  if (v === "About CampusConnect") return "Open the ancient Patra to discover the story, mission and developer behind CampusConnect.";
  if (isCampusModuleView(v)) return campusModuleSubtitle(v, role as CampusModuleRole);
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
