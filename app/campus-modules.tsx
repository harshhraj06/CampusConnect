"use client";

import {useEffect, useState, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode} from "react";
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
import {QRCodeSVG} from "qrcode.react";
import {getSupabaseClient} from "../lib/supabase";
import CampusMessenger from "./campus-messenger";
import {CommunityPosts} from "./community-posts";
import {PlacementApplicantProfile} from "./placement-applicant-profile";

export type CampusModuleView = "Announcements" | "Assignments" | "Attendance" | "Applications" | "Learning" | "Groups" | "Profile" | "Admin" | "Analytics";
type Role = "Student" | "Faculty" | "Placement Cell" | "Coordinator" | "Volunteer" | "Main Admin";
export type ModuleProfile = {
  name: string;
  email: string;
  department: string;
  year: string;
  role: Role;
  campus_uid?: string;
  avatar_url?: string;
};

const hasCampusRole = (
  role: Role,
  allowed: readonly Role[]
) => allowed.includes(role);

const canPublishAnnouncementRole = (role: Role) =>
  hasCampusRole(role, [
    "Faculty",
    "Coordinator",
    "Placement Cell",
    "Main Admin",
  ]);

const canManageAssignmentRole = (role: Role) =>
  hasCampusRole(role, [
    "Faculty",
    "Placement Cell",
    "Main Admin",
  ]);

const canRecordAttendanceRole = (role: Role) =>
  hasCampusRole(role, [
    "Faculty",
    "Main Admin",
  ]);


const canCreateAssignmentRole = (role: Role) =>
  role === "Faculty" ||
  role === "Coordinator" ||
  role === "Placement Cell" ||
  role === "Main Admin";


const canManageEventRole = (role: Role) =>
  hasCampusRole(role, [
    "Faculty",
    "Coordinator",
    "Placement Cell",
    "Main Admin",
  ]);

const canCheckInEventRole = (role: Role) =>
  hasCampusRole(role, [
    "Faculty",
    "Coordinator",
    "Volunteer",
    "Placement Cell",
    "Main Admin",
  ]);

const canVerifyLearningRole = (role: Role) =>
  hasCampusRole(role, [
    "Faculty",
    "Coordinator",
    "Placement Cell",
    "Main Admin",
  ]);

const canManagePlacementsRole = (role: Role) =>
  hasCampusRole(role, [
    "Placement Cell",
    "Main Admin",
  ]);

const canManageUsersRole = (role: Role) =>
  role === "Main Admin";


export const campusModuleViews: CampusModuleView[] = ["Announcements", "Assignments", "Attendance", "Applications", "Learning", "Groups", "Profile", "Admin", "Analytics"];

export function isCampusModuleView(view: string): view is CampusModuleView {
  return campusModuleViews.includes(view as CampusModuleView);
}

export function campusModuleSubtitle(view: CampusModuleView, role: Role) {
  const copy: Record<CampusModuleView, string> = {
    Announcements: role === "Student" ? "Official academic, placement and campus updates in one verified feed." : "Publish and manage verified updates for the right campus audience.",
    Assignments: role === "Student" ? "Track coursework, preparation tasks, deadlines and submissions." : "Create tasks, monitor deadlines and review student completion.",
    Attendance: role === "Student" ? "Live subject attendance with shortage warnings and safe targets." : "Record attendance and review students who need intervention.",
    Applications: role === "Placement Cell" ? "Track every student application through the recruitment pipeline." : "Manage your placement applications and interview progress.",
    Learning: "Subject videos, verified learning links and previous-year question papers.",
    Groups: "Role-aware communities for classes, projects, placements and campus discussions.",
    Profile: "Keep your campus identity, skills and private documents up to date.",
    Admin: "Manage trusted roles and monitor access across CampusConnect.",
    Analytics: role === "Student" ? "A personal view of academic and career progress." : "Campus activity and outcome signals for better decisions.",
  };
  return copy[view];
}

export function CampusModule({view, profile, onProfileChange}: {view: CampusModuleView; profile: ModuleProfile; onProfileChange: (profile: ModuleProfile) => void}) {
  if (view === "Announcements") return <AnnouncementsModule profile={profile}/>;
  if (view === "Assignments") return <AssignmentsModule profile={profile}/>;
  if (view === "Attendance") return <AttendanceModule profile={profile}/>;
  if (view === "Applications") return <ApplicationsModule profile={profile}/>;
  if (view === "Learning") return <LearningModule profile={profile}/>;
  if (view === "Groups") {
    return <CommunityWorkspace profile={profile}/>;
  }
  if (view === "Profile") return <ProfileModule profile={profile} onProfileChange={onProfileChange}/>;
  if (view === "Admin") return <AdminModule profile={profile}/>;
  return <AnalyticsModule profile={profile}/>;
}


function CommunityWorkspace({profile}: {profile: ModuleProfile}) {
  const [section, setSection] = useState<"Posts" | "Messages">("Posts");

  return (
    <div className="communityWorkspace">
      <nav className="communityWorkspaceNav" aria-label="Community workspace sections">
        <div>
          <span>COMMUNITY WORKSPACE</span>
          <b>Ask publicly or continue a private conversation</b>
        </div>
        <section>
          <button
            type="button"
            className={section === "Posts" ? "active" : ""}
            onClick={() => setSection("Posts")}
          >
            Community Posts
          </button>
          <button
            type="button"
            className={section === "Messages" ? "active" : ""}
            onClick={() => setSection("Messages")}
          >
            Messages
          </button>
        </section>
      </nav>

      {section === "Posts" ? (
        <CommunityPosts profile={profile}/>
      ) : (
        <CampusMessenger profile={profile}/>
      )}
    </div>
  );
}

type Announcement = {
  id: string;
  author_id?: string;
  title: string;
  body: string;
  category: string;
  audience: string;
  department: string;
  author_name: string;
  is_pinned: boolean;
  created_at: string;
  updated_at?: string;

  announcement_type?:
    | "Normal"
    | "Festival"
    | "Featured"
    | "Emergency";

  show_floating_banner?: boolean;
  banner_url?: string | null;
  video_banner_url?: string | null;
  burst_colors?: string[] | null;
  banner_start_at?: string | null;
  banner_end_at?: string | null;
  banner_cta_label?: string;
  banner_cta_url?: string | null;
  banner_dismissible?: boolean;
};

type CampusEvent = {
  id: string;
  title: string;
  short_description: string;
  description: string;
  category: string;
  venue: string;
  organizer: string;
  event_date: string;
  end_date: string | null;
  banner_url: string | null;
  registration_url: string | null;
  audience_department: string;
  audience_year: string;
  is_featured: boolean;
  status: "Draft" | "Published" | "Cancelled";
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  registration_deadline?: string | null;
  capacity?: number | null;
  allow_campus_registration?: boolean;
};

type EventRegistration = {
  id: string;
  event_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  department: string;
  graduation_year: string;
  status: "Going" | "Cancelled";
  registered_at: string;
  updated_at: string;

  check_in_code: string;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by: string | null;
};


type CampusAttachment = {
  id: string;
  owner_id: string;
  entity_type: "learning_resource" | "announcement" | "event";
  entity_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

const CAMPUS_RESOURCE_BUCKET = "campus-resources";

const ALLOWED_RESOURCE_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "txt",
  "csv",
];

function resourceExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function validateCampusFile(file: File) {
  const extension = resourceExtension(file.name);

  if (!ALLOWED_RESOURCE_EXTENSIONS.includes(extension)) {
    return `${file.name}: unsupported file type.`;
  }

  if (file.size > 10 * 1024 * 1024) {
    return `${file.name}: file must be smaller than 10 MB.`;
  }

  return "";
}

function safeCampusFileName(fileName: string) {
  const extension = resourceExtension(fileName);

  const originalBase =
    fileName.replace(/\.[^/.]+$/, "");

  const base =
    originalBase
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "resource";

  return extension
    ? `${base}.${extension}`
    : base;
}

async function uploadCampusAttachments(
  entityType: CampusAttachment["entity_type"],
  entityId: string,
  files: File[]
): Promise<CampusAttachment[]> {
  if (!files.length) return [];

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

  const uploaded: CampusAttachment[] = [];

  for (const file of files) {
    const validationError = validateCampusFile(file);

    if (validationError) {
      throw new Error(validationError);
    }

    const folder =
      entityType === "learning_resource"
        ? "learning"
        : entityType === "announcement"
        ? "announcements"
        : "events";

    const safeName = safeCampusFileName(file.name);

    const path =
      `${auth.user.id}/${folder}/${entityId}/` +
      `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const {error: uploadError} =
      await client.storage
        .from(CAMPUS_RESOURCE_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType:
            file.type || "application/octet-stream",
        });

    if (uploadError) {
      throw uploadError;
    }

    const {data, error} =
      await client
        .from("campus_attachments")
        .insert({
          owner_id: auth.user.id,
          entity_type: entityType,
          entity_id: entityId,
          file_name: file.name,
          file_path: path,
          file_type: resourceExtension(file.name),
          mime_type:
            file.type || "application/octet-stream",
          file_size: file.size,
        })
        .select()
        .single();

    if (error) {
      await client.storage
        .from(CAMPUS_RESOURCE_BUCKET)
        .remove([path]);

      throw error;
    }

    uploaded.push(data as CampusAttachment);
  }

  return uploaded;
}

async function openCampusAttachment(
  attachment: CampusAttachment
) {
  const client = getSupabaseClient();

  if (!client) return;

  const {data, error} =
    await client.storage
      .from(CAMPUS_RESOURCE_BUCKET)
      .createSignedUrl(
        attachment.file_path,
        60 * 10
      );

  if (error) {
    throw error;
  }

  window.open(
    data.signedUrl,
    "_blank",
    "noopener,noreferrer"
  );
}

function formatAttachmentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}


const emptyAnnouncements: Announcement[] = [];


/* EVENT SCHEDULE VALIDATION: START */

type EventScheduleInput = {
  event_date: string;
  end_date?: string | null;
  registration_deadline?: string | null;
  capacity?: string | number | null;
  status?: string;
};


function validateEventSchedule(
  value: EventScheduleInput
) {
  const eventStart =
    new Date(
      value.event_date
    );

  if (
    Number.isNaN(
      eventStart.getTime()
    )
  ) {
    return "Enter a valid event start date and time.";
  }

  if (
    value.status ===
      "Published" &&
    eventStart.getTime() <=
      Date.now()
  ) {
    return "A published event must start in the future.";
  }

  if (value.end_date) {
    const eventEnd =
      new Date(
        value.end_date
      );

    if (
      Number.isNaN(
        eventEnd.getTime()
      )
    ) {
      return "Enter a valid event end date and time.";
    }

    if (
      eventEnd.getTime() <=
      eventStart.getTime()
    ) {
      return "Event end date must be after the start date.";
    }
  }

  if (
    value.registration_deadline
  ) {
    const deadline =
      new Date(
        value.registration_deadline
      );

    if (
      Number.isNaN(
        deadline.getTime()
      )
    ) {
      return "Enter a valid registration deadline.";
    }

    if (
      deadline.getTime() >
      eventStart.getTime()
    ) {
      return "Registration deadline must be before the event starts.";
    }

    if (
      value.status ===
        "Published" &&
      deadline.getTime() <=
        Date.now()
    ) {
      return "Registration deadline must be in the future for a published event.";
    }
  }

  if (
    value.capacity !==
      null &&
    value.capacity !==
      undefined &&
    String(
      value.capacity
    ).trim()
  ) {
    const capacity =
      Number(
        value.capacity
      );

    if (
      !Number.isInteger(
        capacity
      ) ||
      capacity <= 0
    ) {
      return "Event capacity must be a positive whole number.";
    }
  }

  return "";
}

/* EVENT SCHEDULE VALIDATION: END */


function AnnouncementsModule({profile}: {profile: ModuleProfile}) {
  const [items, setItems] = useState<Announcement[]>(emptyAnnouncements);
  const [events, setEvents] = useState<CampusEvent[]>([]);

  const [activeTab, setActiveTab] =
    useState<"All" | "Announcements" | "Events">("All");

  const [showForm, setShowForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);

  const [selectedEvent, setSelectedEvent] =
    useState<CampusEvent | null>(null);

  const [eventBanner, setEventBanner] =
    useState<File | null>(null);

  const [announcementFiles, setAnnouncementFiles] =
    useState<File[]>([]);

  const [festivalBannerFile, setFestivalBannerFile] =
    useState<File | null>(null);

  const [eventFiles, setEventFiles] =
    useState<File[]>([]);

  const [attachments, setAttachments] =
    useState<CampusAttachment[]>([]);

  const [uploadingAttachments, setUploadingAttachments] =
    useState(false);

  const [publishingEvent, setPublishingEvent] =
    useState(false);

  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);

  const [announcementEditForm, setAnnouncementEditForm] =
    useState({
      title: "",
      body: "",
      category: "Academic",
      audience: "Student",
      department: "All",
    });

  const [editingEvent, setEditingEvent] =
    useState<CampusEvent | null>(null);

  const [eventEditForm, setEventEditForm] = useState({
    title: "",
    short_description: "",
    description: "",
    category: "Campus",
    venue: "",
    organizer: "",
    event_date: "",
    end_date: "",
    registration_url: "",
    audience_department: "All",
    audience_year: "All",
    is_featured: false,
    status: "Published" as
      | "Draft"
      | "Published"
      | "Cancelled",
    registration_deadline: "",
    capacity: "",
    allow_campus_registration: true,
  });

  const [editEventBanner, setEditEventBanner] =
    useState<File | null>(null);

  const [savingEdit, setSavingEdit] =
    useState(false);

  const [eventEditError, setEventEditError] =
    useState("");

  const [form, setForm] = useState({
    title: "",
    body: "",
    category: "Academic",
    audience: "Student",
    department: profile.department,

    announcement_type:
      "Normal" as
        | "Normal"
        | "Festival"
        | "Featured"
        | "Emergency",

    show_floating_banner: false,

    banner_start_at: "",
    banner_end_at: "",

    banner_cta_label: "",
    banner_cta_url: "",

    banner_dismissible: true,
  });

  const [festivalEditBannerFile, setFestivalEditBannerFile] =
    useState<File | null>(null);

  const [festivalEditVideoFile, setFestivalEditVideoFile] =
    useState<File | null>(null);

  const [removeFestivalBanner, setRemoveFestivalBanner] =
    useState(false);

  const [removeFestivalVideo, setRemoveFestivalVideo] =
    useState(false);

  const [festivalEditSettings, setFestivalEditSettings] =
    useState({
      show_floating_banner: false,
      banner_start_at: "",
      banner_end_at: "",
      banner_cta_label: "",
      banner_cta_url: "",
      banner_dismissible: true,
      burst_colors: [
        "#F59E0B",
        "#EF4444",
        "#8B5CF6",
        "#22C55E",
        "#3B82F6",
      ],
    });


  const [eventForm, setEventForm] = useState({
    title: "",
    short_description: "",
    description: "",
    category: "Campus",
    venue: "",
    organizer: "",
    event_date: "",
    end_date: "",
    registration_url: "",
    audience_department: "All",
    audience_year: "All",
    is_featured: false,
    status: "Published" as "Draft" | "Published",
    registration_deadline: "",
    capacity: "",
    allow_campus_registration: true,
  });

  const [status, setStatus] = useState("");

  const eventQuotes = [
    "Your next great memory might start with one event.",
    "Show up. Meet people. Build something memorable.",
    "Campus life gets better when you participate.",
    "Opportunities often begin with simply being there.",
    "Join the room where ideas, people and possibilities meet.",
    "One workshop can teach a skill. One event can change your direction.",
  ];

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [showEventQuote, setShowEventQuote] = useState(true);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [eventWindow, setEventWindow] =
    useState<"Upcoming" | "Week" | "Month" | "Past">("Upcoming");

  const [currentUserId, setCurrentUserId] = useState("");

  const [eventRegistrations, setEventRegistrations] =
    useState<EventRegistration[]>([]);

  const [registrationBusyId, setRegistrationBusyId] =
    useState("");

  const [showAttendees, setShowAttendees] =
    useState(false);

  const [showEventPass, setShowEventPass] =
    useState(false);

  const [showCheckInPanel, setShowCheckInPanel] =
    useState(false);

  const [checkInCode, setCheckInCode] =
    useState("");

  const [checkInBusy, setCheckInBusy] =
    useState(false);

  const [checkInMessage, setCheckInMessage] =
    useState("");

  const [scannerOpen, setScannerOpen] =
    useState(false);

  const [scannerError, setScannerError] =
    useState("");

  const canPublish =
    canPublishAnnouncementRole(
      profile.role
    );

  useEffect(() => {
    if (
      profile.role === "Main Admin"
    ) {
      return;
    }

    setForm(current => {

      const currentType =
        (
          current as typeof current & {
            announcement_type?: string;
          }
        ).announcement_type;

      if (
        currentType !== "Festival" &&
        current.category !== "Festival"
      ) {
        return current;
      }

      return {
        ...current,
        announcement_type:
          currentType === "Festival"
            ? "Normal"
            : currentType,
        category:
          current.category === "Festival"
            ? "Academic"
            : current.category,
      };
    });

  }, [profile.role]);

  const canManageFestival =
    profile.role === "Main Admin";

  const canPublishFestival =
    profile.role === "Faculty" ||
    profile.role === "Main Admin";

  const uploadFestivalBanner =
    async (file: File) => {

      const client =
        getSupabaseClient();

      if (!client) {
        throw new Error(
          "CampusConnect is not connected to Supabase."
        );
      }

      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(file.type)
      ) {
        throw new Error(
          "Festival banner must be JPG, PNG or WebP."
        );
      }

      if (
        file.size >
        8 * 1024 * 1024
      ) {
        throw new Error(
          "Festival banner must be smaller than 8 MB."
        );
      }

      const {
        data: auth,
      } =
        await client.auth
          .getUser();

      if (!auth.user) {
        throw new Error(
          "Your session has expired."
        );
      }

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const safeName =
        file.name
          .replace(/\.[^/.]+$/, "")
          .toLowerCase()
          .replace(
            /[^a-z0-9]+/g,
            "-"
          )
          .replace(
            /^-|-$/g,
            ""
          )
          .slice(
            0,
            50
          ) ||
        "festival";

      const path =
        `${auth.user.id}/festivals/` +
        `${Date.now()}-${crypto.randomUUID()}-${safeName}.${extension}`;

      const {
        error: uploadError,
      } =
        await client.storage
          .from(
            "event-banners"
          )
          .upload(
            path,
            file,
            {
              cacheControl:
                "3600",
              upsert: false,
              contentType:
                file.type,
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      const {data} =
        client.storage
          .from(
            "event-banners"
          )
          .getPublicUrl(
            path
          );

      return data.publicUrl;
    };


  const uploadFestivalEditMedia =
    async (
      file: File,
      folder: string
    ) => {

      const client =
        getSupabaseClient();

      if (!client) {
        throw new Error(
          "CampusConnect is not connected to Supabase."
        );
      }

      const isVideo =
        file.type === "video/mp4" ||
        file.type === "video/webm";

      const allowed =
        isVideo
          ? [
              "video/mp4",
              "video/webm",
            ]
          : [
              "image/jpeg",
              "image/png",
              "image/webp",
            ];

      if (
        !allowed.includes(
          file.type
        )
      ) {
        throw new Error(
          isVideo
            ? "Festival video must be MP4 or WebM."
            : "Festival banner must be JPG, PNG or WebP."
        );
      }

      const maxSize =
        isVideo
          ? 50 * 1024 * 1024
          : 10 * 1024 * 1024;

      if (
        file.size >
        maxSize
      ) {
        throw new Error(
          isVideo
            ? "Festival video must be smaller than 50 MB."
            : "Festival banner must be smaller than 10 MB."
        );
      }

      const {
        data: auth,
      } =
        await client.auth
          .getUser();

      if (!auth.user) {
        throw new Error(
          "Your session has expired."
        );
      }

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        (
          isVideo
            ? "mp4"
            : "jpg"
        );

      const path =
        `${auth.user.id}/${folder}/` +
        `${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const {
        error,
      } =
        await client.storage
          .from(
            "event-banners"
          )
          .upload(
            path,
            file,
            {
              cacheControl:
                "3600",
              upsert:
                false,
              contentType:
                file.type,
            }
          );

      if (error) {
        throw error;
      }

      const {
        data,
      } =
        client.storage
          .from(
            "event-banners"
          )
          .getPublicUrl(
            path
          );

      return data.publicUrl;
    };


  const loadAttachments = async () => {
    const client = getSupabaseClient();

    if (!client) return;

    const {data, error} =
      await client
        .from("campus_attachments")
        .select("*")
        .in("entity_type", [
          "announcement",
          "event",
        ])
        .order("created_at", {
          ascending: true,
        });

    if (!error) {
      setAttachments(
        (data || []) as CampusAttachment[]
      );
    }
  };

  const loadAnnouncements = async () => {
    const client = getSupabaseClient();
    if (!client) return;

    const {data, error} = await client
      .from("announcements")
      .select("*")
      .order("is_pinned", {ascending: false})
      .order("created_at", {ascending: false})
      .limit(40);

    if (!error) {
      setItems((data || []) as Announcement[]);
    }
  };

  const loadEventRegistrations = async () => {
    const client = getSupabaseClient();
    if (!client) return;

    const {data, error} = await client
      .from("event_registrations")
      .select("*");

    if (!error) {
      setEventRegistrations(
        (data || []) as EventRegistration[]
      );
    }
  };

  const loadEvents = async () => {
    const client = getSupabaseClient();
    if (!client) return;

    const {data, error} = await client
      .from("campus_events")
      .select("*")
      .order("is_featured", {ascending: false})
      .order("event_date", {ascending: true})
      .limit(50);

    if (error) {
      setStatus(error.message);
      return;
    }

    setEvents((data || []) as CampusEvent[]);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex(current =>
        (current + 1) % eventQuotes.length
      );
    }, 7000);

    return () => {
      window.clearInterval(timer);
    };
  }, [eventQuotes.length]);

  useEffect(() => {
    void loadAnnouncements();
    void loadEvents();
    void loadEventRegistrations();
    void loadAttachments();

    const client = getSupabaseClient();

    if (client) {
      void client.auth.getUser().then(({data}) => {
        setCurrentUserId(data.user?.id || "");
      });
    }
  }, []);

  const toDateTimeLocal = (value: string | null) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const local = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );

    return local.toISOString().slice(0, 16);
  };

  const canManageAnnouncement =
    (
      item: Announcement
    ) => {

      if (
        item.announcement_type ===
        "Festival"
      ) {
        return (
          profile.role ===
          "Main Admin"
        );
      }

      return (
        profile.role ===
          "Main Admin" ||
        (
          canPublishAnnouncementRole(
            profile.role
          ) &&
          Boolean(
            currentUserId &&
            item.author_id ===
              currentUserId
          )
        )
      );
    };

  const canManageEvent = (item: CampusEvent) =>
    profile.role === "Main Admin" ||
    (
      canManageEventRole(profile.role) &&
      Boolean(currentUserId && item.created_by === currentUserId)
    );

  const openAnnouncementEditor = (item: Announcement) => {

    if (
      item.announcement_type ===
        "Festival" &&
      profile.role !==
        "Main Admin"
    ) {
      return setStatus(
        "Only Main Admin can edit festival wishes."
      );
    }

    if (!canManageAnnouncement(item)) return;

    setAnnouncementEditForm({
      title: item.title,
      body: item.body,
      category: item.category,
      audience: item.audience,
      department: item.department,
    });

    if (
      item.announcement_type ===
      "Festival"
    ) {

      setFestivalEditSettings({
        show_floating_banner:
          item.show_floating_banner ??
          false,

        banner_start_at:
          toDateTimeLocal(
            item.banner_start_at ||
            null
          ),

        banner_end_at:
          toDateTimeLocal(
            item.banner_end_at ||
            null
          ),

        banner_cta_label:
          item.banner_cta_label ||
          "",

        banner_cta_url:
          item.banner_cta_url ||
          "",

        banner_dismissible:
          item.banner_dismissible ??
          true,

        burst_colors:
          item.burst_colors?.length
            ? item.burst_colors.slice(0, 5)
            : [
                "#F59E0B",
                "#EF4444",
                "#8B5CF6",
                "#22C55E",
                "#3B82F6",
              ],
      });

      setFestivalEditBannerFile(
        null
      );

      setFestivalEditVideoFile(
        null
      );

      setRemoveFestivalBanner(
        false
      );

      setRemoveFestivalVideo(
        false
      );
    }

    setEditingAnnouncement(item);
    setStatus("");
  };

  const saveAnnouncementEdit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!editingAnnouncement) return;

    if (
      !announcementEditForm.title.trim() ||
      !announcementEditForm.body.trim()
    ) {
      return setStatus(
        "Announcement title and message are required."
      );
    }

    const client = getSupabaseClient();

    if (!client) {
      return rejectEventEdit(
        "CampusConnect is not connected to Supabase."
      );
    }

    setSavingEdit(true);
    setStatus("");

    try {

      let nextBannerUrl =
        editingAnnouncement.banner_url ||
        null;

      let nextVideoUrl =
        editingAnnouncement.video_banner_url ||
        null;


      if (
        editingAnnouncement.announcement_type ===
          "Festival" &&
        festivalEditBannerFile
      ) {

        nextBannerUrl =
          await uploadFestivalEditMedia(
            festivalEditBannerFile,
            "festival-images"
          );
      }


      if (
        editingAnnouncement.announcement_type ===
          "Festival" &&
        festivalEditVideoFile
      ) {

        nextVideoUrl =
          await uploadFestivalEditMedia(
            festivalEditVideoFile,
            "festival-videos"
          );
      }


      if (
        removeFestivalBanner
      ) {
        nextBannerUrl =
          null;
      }


      if (
        removeFestivalVideo
      ) {
        nextVideoUrl =
          null;
      }


      const updates:
        Record<string, unknown> = {

        title:
          announcementEditForm.title
            .trim(),

        body:
          announcementEditForm.body
            .trim(),

        category:
          announcementEditForm.category,

        audience:
          announcementEditForm.audience,

        department:
          announcementEditForm.department ||
          "All",

        updated_at:
          new Date()
            .toISOString(),
      };


      if (
        editingAnnouncement
          .announcement_type ===
        "Festival"
      ) {

        updates.audience =
          "All";

        updates.department =
          "All";

        updates.banner_url =
          nextBannerUrl;

        updates.video_banner_url =
          nextVideoUrl;

        updates.show_floating_banner =
          festivalEditSettings
            .show_floating_banner;

        updates.banner_dismissible =
          festivalEditSettings
            .banner_dismissible;

        updates.banner_start_at =
          festivalEditSettings
            .banner_start_at
            ? new Date(
                festivalEditSettings
                  .banner_start_at
              ).toISOString()
            : null;

        updates.banner_end_at =
          festivalEditSettings
            .banner_end_at
            ? new Date(
                festivalEditSettings
                  .banner_end_at
              ).toISOString()
            : null;

        updates.banner_cta_label =
          festivalEditSettings
            .banner_cta_label
            .trim();

        updates.banner_cta_url =
          festivalEditSettings
            .banner_cta_url
            .trim() ||
          null;

        updates.burst_colors =
          festivalEditSettings
            .burst_colors;
      }


      const {data, error} = await client
      .from("announcements")
      .update(updates)
      .eq("id", editingAnnouncement.id)
      .select()
      .single();

      if (error) {
        throw error;
      }

      const updated =
        data as Announcement;

      setItems(
        current =>
          current.map(
            item =>
              item.id ===
                updated.id
                ? updated
                : item
          )
      );

      setEditingAnnouncement(
        null
      );

      setFestivalEditBannerFile(
        null
      );

      setFestivalEditVideoFile(
        null
      );

      setRemoveFestivalBanner(
        false
      );

      setRemoveFestivalVideo(
        false
      );

      if (
        updated.announcement_type ===
        "Festival"
      ) {

        window.dispatchEvent(
          new CustomEvent(
            "campus-festival-changed",
            {
              detail: {
                action:
                  "updated",
                id:
                  updated.id,
              },
            }
          )
        );
      }

      setStatus(
        updated.announcement_type ===
          "Festival"
          ? "Festival updated successfully."
          : "Announcement updated successfully."
      );

    } catch (error) {

      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to update announcement."
      );

    } finally {

      setSavingEdit(
        false
      );
    }
  };

  const toggleAnnouncementPin = async (item: Announcement) => {

    if (
      item.announcement_type ===
        "Festival" &&
      profile.role !==
        "Main Admin"
    ) {
      return setStatus(
        "Only Main Admin can manage festival wishes."
      );
    }

    if (!canManageAnnouncement(item)) return;

    const client = getSupabaseClient();

    if (!client) {
      return setStatus("CampusConnect is not connected to Supabase.");
    }

    const nextPinned = !item.is_pinned;

    const {error} = await client
      .from("announcements")
      .update({
        is_pinned: nextPinned,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      return setStatus(error.message);
    }

    setItems(current =>
      current
        .map(row =>
          row.id === item.id
            ? {...row, is_pinned: nextPinned}
            : row
        )
        .sort((a, b) =>
          Number(b.is_pinned) - Number(a.is_pinned) ||
          b.created_at.localeCompare(a.created_at)
        )
    );

    setStatus(
      nextPinned
        ? "Announcement pinned."
        : "Announcement unpinned."
    );
  };

  const deleteAnnouncement = async (item: Announcement) => {

    if (
      item.announcement_type ===
        "Festival" &&
      profile.role !==
        "Main Admin"
    ) {
      return setStatus(
        "Only Main Admin can delete festival wishes."
      );
    }

    if (!canManageAnnouncement(item)) return;

    if (!window.confirm(`Delete "${item.title}"?`)) {
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      return setStatus("CampusConnect is not connected to Supabase.");
    }

    const {error} = await client
      .from("announcements")
      .delete()
      .eq("id", item.id);

    if (error) {
      return setStatus(error.message);
    }

    setItems(current =>
      current.filter(row => row.id !== item.id)
    );

    setStatus("Announcement deleted.");
  };

  const openEventEditor = (item: CampusEvent) => {
    if (!canManageEvent(item)) return;

    setEventEditForm({
      title: item.title,
      short_description: item.short_description,
      description: item.description,
      category: item.category,
      venue: item.venue,
      organizer: item.organizer,
      event_date: toDateTimeLocal(item.event_date),
      end_date: toDateTimeLocal(item.end_date),
      registration_url: item.registration_url || "",
      audience_department: item.audience_department,
      audience_year: item.audience_year,
      is_featured: item.is_featured,
      status: item.status,
      registration_deadline:
        toDateTimeLocal(item.registration_deadline || null),
      capacity:
        item.capacity != null ? String(item.capacity) : "",
      allow_campus_registration:
        item.allow_campus_registration !== false,
    });

    setEditEventBanner(null);
    setEditingEvent(item);
    setSelectedEvent(null);
    setEventEditError("");
    setStatus("");
  };

  const saveEventEdit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!editingEvent) return;

    setEventEditError("");

    const rejectEventEdit = (
      message: string
    ) => {
      setEventEditError(message);
      setStatus(message);
    };

    if (
      !eventEditForm.title.trim() ||
      !eventEditForm.short_description.trim() ||
      !eventEditForm.event_date
    ) {
      return rejectEventEdit(
        "Event title, short description and start date are required."
      );
    }

    const scheduleError =
      validateEventSchedule(
        eventEditForm
      );

    if (scheduleError) {
      return rejectEventEdit(
        scheduleError
      );
    }

    const client = getSupabaseClient();

    if (!client) {
      return setStatus(
        "CampusConnect is not connected to Supabase."
      );
    }

    setSavingEdit(true);
    setStatus("");

    try {
      const {data: auth} =
        await client.auth.getUser();

      if (!auth.user) {
        throw new Error(
          "Your session has expired. Sign in again."
        );
      }

      let bannerUrl = editingEvent.banner_url;

      if (editEventBanner) {
        if (editEventBanner.size > 5 * 1024 * 1024) {
          throw new Error(
            "Event banner must be smaller than 5 MB."
          );
        }

        if (
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
          ].includes(editEventBanner.type)
        ) {
          throw new Error(
            "Banner must be a JPG, PNG or WebP image."
          );
        }

        const extension =
          editEventBanner.name
            .split(".")
            .pop()
            ?.toLowerCase() || "jpg";

        const safeName =
          eventEditForm.title
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 45) || "event";

        const filePath =
          `${auth.user.id}/${Date.now()}-${safeName}.${extension}`;

        const {error: uploadError} =
          await client.storage
            .from("event-banners")
            .upload(
              filePath,
              editEventBanner,
              {
                cacheControl: "3600",
                upsert: false,
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        const {data: publicData} =
          client.storage
            .from("event-banners")
            .getPublicUrl(filePath);

        bannerUrl = publicData.publicUrl;
      }

      const updates = {
        title:
          eventEditForm.title.trim(),

        short_description:
          eventEditForm.short_description.trim(),

        description:
          eventEditForm.description.trim(),

        category:
          eventEditForm.category,

        venue:
          eventEditForm.venue.trim(),

        organizer:
          eventEditForm.organizer.trim() ||
          profile.name,

        event_date:
          new Date(
            eventEditForm.event_date
          ).toISOString(),

        end_date:
          eventEditForm.end_date
            ? new Date(
                eventEditForm.end_date
              ).toISOString()
            : null,

        banner_url:
          bannerUrl,

        registration_url:
          eventEditForm.registration_url.trim() ||
          null,

        audience_department:
          eventEditForm.audience_department,

        audience_year:
          eventEditForm.audience_year,

        is_featured:
          eventEditForm.is_featured,

        status:
          eventEditForm.status,

        registration_deadline:
          eventEditForm.registration_deadline
            ? new Date(
                eventEditForm.registration_deadline
              ).toISOString()
            : null,

        capacity:
          eventEditForm.capacity
            ? Number(eventEditForm.capacity)
            : null,

        allow_campus_registration:
          eventEditForm.allow_campus_registration,

        updated_at:
          new Date().toISOString(),
      };

      const {data, error} =
        await client
          .from("campus_events")
          .update(updates)
          .eq("id", editingEvent.id)
          .select()
          .single();

      if (error) {
        throw error;
      }

      const updated =
        data as CampusEvent;

      setEvents(current =>
        current
          .map(item =>
            item.id === updated.id
              ? updated
              : item
          )
          .sort(
            (a, b) =>
              new Date(a.event_date).getTime() -
              new Date(b.event_date).getTime()
          )
      );

      setEditingEvent(null);
      setEditEventBanner(null);

      setStatus(
        "Event updated successfully."
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update event.";

      setEventEditError(message);
      setStatus(message);
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleEventFeatured = async (item: CampusEvent) => {
    if (!canManageEvent(item)) return;

    const client = getSupabaseClient();

    if (!client) {
      return setStatus("CampusConnect is not connected to Supabase.");
    }

    const nextFeatured = !item.is_featured;

    const {error} = await client
      .from("campus_events")
      .update({
        is_featured: nextFeatured,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      return setStatus(error.message);
    }

    setEvents(current =>
      current.map(row =>
        row.id === item.id
          ? {...row, is_featured: nextFeatured}
          : row
      )
    );

    setSelectedEvent(current =>
      current?.id === item.id
        ? {...current, is_featured: nextFeatured}
        : current
    );

    setStatus(
      nextFeatured
        ? "Event featured successfully."
        : "Event removed from featured."
    );
  };

  const cancelEvent = async (item: CampusEvent) => {
    if (!canManageEvent(item)) return;

    if (!window.confirm(`Cancel "${item.title}"?`)) {
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      return setStatus("CampusConnect is not connected to Supabase.");
    }

    const {error} = await client
      .from("campus_events")
      .update({
        status: "Cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      return setStatus(error.message);
    }

    setEvents(current =>
      current.map(row =>
        row.id === item.id
          ? {...row, status: "Cancelled"}
          : row
      )
    );

    setSelectedEvent(null);
    setStatus("Event cancelled.");
  };

  const deleteEvent = async (item: CampusEvent) => {
    if (!canManageEvent(item)) return;

    if (!window.confirm(`Permanently delete "${item.title}"?`)) {
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      return setStatus("CampusConnect is not connected to Supabase.");
    }

    const {error} = await client
      .from("campus_events")
      .delete()
      .eq("id", item.id);

    if (error) {
      return setStatus(error.message);
    }

    setEvents(current =>
      current.filter(row => row.id !== item.id)
    );

    setSelectedEvent(null);
    setStatus("Event deleted.");
  };

  const publish = async (event: FormEvent) => {
    event.preventDefault();

    if (
      (
        (form as any)
          .announcement_type ===
          "Festival" ||
        form.category ===
          "Festival"
      ) &&
      profile.role !==
        "Main Admin"
    ) {
      return setStatus(
        "Only Main Admin can publish festival wishes."
      );
    }

    if (!form.title.trim() || !form.body.trim()) {
      return setStatus("Add a title and announcement message.");
    }

    if (
      form.announcement_type ===
        "Festival" &&
      !canPublishFestival
    ) {
      return setStatus(
        "Only Faculty and Main Admin can publish festival wishes."
      );
    }

    const client = getSupabaseClient();

    if (!client) {
      return setStatus(
        "CampusConnect is not connected to Supabase."
      );
    }

    const {data: userData} = await client.auth.getUser();

    if (!userData.user) {
      return setStatus("Sign in to publish an announcement.");
    }

    let festivalBannerUrl:
      string | null =
        null;

    if (
      form.announcement_type ===
        "Festival" &&
      festivalBannerFile
    ) {
      try {
        festivalBannerUrl =
          await uploadFestivalBanner(
            festivalBannerFile
          );
      } catch (error) {
        return setStatus(
          error instanceof Error
            ? error.message
            : "Unable to upload festival banner."
        );
      }
    }

    const {data, error} = await client
      .from("announcements")
      .insert({
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category,
        audience:
          form.announcement_type ===
            "Festival"
            ? "All"
            : form.audience,

        department:
          form.announcement_type ===
            "Festival"
            ? "All"
            : form.department ||
              "All",

        announcement_type:
          form.announcement_type,

        show_floating_banner:
          form.announcement_type ===
            "Festival"
            ? form.show_floating_banner
            : false,

        banner_url:
          festivalBannerUrl,

        banner_start_at:
          form.announcement_type ===
              "Festival" &&
          form.banner_start_at
            ? new Date(
                form.banner_start_at
              ).toISOString()
            : null,

        banner_end_at:
          form.announcement_type ===
              "Festival" &&
          form.banner_end_at
            ? new Date(
                form.banner_end_at
              ).toISOString()
            : null,

        banner_cta_label:
          form.announcement_type ===
            "Festival"
            ? form.banner_cta_label.trim()
            : "",

        banner_cta_url:
          form.announcement_type ===
              "Festival" &&
          form.banner_cta_url.trim()
            ? form.banner_cta_url.trim()
            : null,

        banner_dismissible:
          form.announcement_type ===
            "Festival"
            ? form.banner_dismissible
            : true,

        author_id:
          userData.user.id,

        author_name:
          profile.name,
      })
      .select()
      .single();

    if (error) {
      return setStatus(error.message);
    }

    const createdAnnouncement = data as Announcement;

    let uploadedFiles: CampusAttachment[] = [];

    try {
      if (announcementFiles.length) {
        setUploadingAttachments(true);

        uploadedFiles =
          await uploadCampusAttachments(
            "announcement",
            createdAnnouncement.id,
            announcementFiles
          );

        setAttachments(current => [
          ...current,
          ...uploadedFiles,
        ]);
      }
    } catch (uploadError) {
      setItems(current => [
        createdAnnouncement,
        ...current,
      ]);

      setUploadingAttachments(false);

      return setStatus(
        uploadError instanceof Error
          ? `Announcement published, but attachment upload failed: ${uploadError.message}`
          : "Announcement published, but attachment upload failed."
      );
    }

    setItems(current => [
      createdAnnouncement,
      ...current,
    ]);

    setForm(current => ({
      ...current,

      title: "",
      body: "",

      announcement_type:
        "Normal",

      show_floating_banner:
        false,

      banner_start_at: "",
      banner_end_at: "",

      banner_cta_label: "",
      banner_cta_url: "",

      banner_dismissible:
        true,
    }));

    setFestivalBannerFile(
      null
    );

    setAnnouncementFiles([]);
    setUploadingAttachments(false);

    setStatus(
      uploadedFiles.length
        ? `Announcement published with ${uploadedFiles.length} attachment${uploadedFiles.length === 1 ? "" : "s"}.`
        : "Announcement published successfully."
    );

    setShowForm(false);
  };

  const publishEvent = async (event: FormEvent) => {
    event.preventDefault();

    if (
      !eventForm.title.trim() ||
      !eventForm.short_description.trim() ||
      !eventForm.event_date
    ) {
      return setStatus(
        "Event title, short description and start date are required."
      );
    }


const scheduleError =
  validateEventSchedule(
    eventForm
  );

if (scheduleError) {
  return setStatus(
    scheduleError
  );
}

    const client = getSupabaseClient();

    if (!client) {
      return setStatus("CampusConnect is not connected to Supabase.");
    }

    setPublishingEvent(true);
    setStatus("");

    try {
      const {data: userData} = await client.auth.getUser();

      if (!userData.user) {
        throw new Error("Sign in again before publishing an event.");
      }

      let bannerUrl: string | null = null;

      if (eventBanner) {
        if (eventBanner.size > 5 * 1024 * 1024) {
          throw new Error("Event banner must be smaller than 5 MB.");
        }

        if (
          !["image/jpeg", "image/png", "image/webp"].includes(
            eventBanner.type
          )
        ) {
          throw new Error(
            "Banner must be a JPG, PNG or WebP image."
          );
        }

        const extension =
          eventBanner.name.split(".").pop()?.toLowerCase() || "jpg";

        const safeName =
          eventForm.title
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 45) || "event";

        const filePath =
          `${userData.user.id}/${Date.now()}-${safeName}.${extension}`;

        const {error: uploadError} = await client.storage
          .from("event-banners")
          .upload(filePath, eventBanner, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const {data: publicData} = client.storage
          .from("event-banners")
          .getPublicUrl(filePath);

        bannerUrl = publicData.publicUrl;
      }

      const payload = {
        title: eventForm.title.trim(),
        short_description:
          eventForm.short_description.trim(),
        description: eventForm.description.trim(),
        category: eventForm.category,
        venue: eventForm.venue.trim(),
        organizer:
          eventForm.organizer.trim() || profile.name,
        event_date:
          new Date(eventForm.event_date).toISOString(),
        end_date: eventForm.end_date
          ? new Date(eventForm.end_date).toISOString()
          : null,
        banner_url: bannerUrl,
        registration_url:
          eventForm.registration_url.trim() || null,
        audience_department:
          eventForm.audience_department,
        audience_year:
          eventForm.audience_year,
        is_featured:
          eventForm.is_featured,
        status:
          eventForm.status,

        registration_deadline:
          eventForm.registration_deadline
            ? new Date(
                eventForm.registration_deadline
              ).toISOString()
            : null,

        capacity:
          eventForm.capacity
            ? Number(eventForm.capacity)
            : null,

        allow_campus_registration:
          eventForm.allow_campus_registration,

        created_by:
          userData.user.id,
        created_by_name:
          profile.name,
      };

      const {data, error} = await client
        .from("campus_events")
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const createdEvent = data as CampusEvent;

      if (eventFiles.length) {
        const uploaded =
          await uploadCampusAttachments(
            "event",
            createdEvent.id,
            eventFiles
          );

        setAttachments(current => [
          ...current,
          ...uploaded,
        ]);
      }

      setEvents(current =>
        [...current, createdEvent].sort(
          (a, b) =>
            new Date(a.event_date).getTime() -
            new Date(b.event_date).getTime()
        )
      );

      setEventForm({
        title: "",
        short_description: "",
        description: "",
        category: "Campus",
        venue: "",
        organizer: "",
        event_date: "",
        end_date: "",
        registration_url: "",
        audience_department: "All",
        audience_year: "All",
        is_featured: false,
        status: "Published",
        registration_deadline: "",
        capacity: "",
        allow_campus_registration: true,
      });

      setEventBanner(null);
      setEventFiles([]);
      setShowEventForm(false);

      setStatus(
        eventForm.status === "Draft"
          ? "Event saved as draft."
          : "Event published successfully."
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to publish event."
      );
    } finally {
      setPublishingEvent(false);
    }
  };

  const eventDateLabel = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const eventTimeLabel = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const normalizedQuery = query.trim().toLowerCase();

  const announcementCategories = [
    "All",
    "Academic",
    "Placement",
    "Campus",
    "Exam",
    "Emergency",
  ];

  const eventCategories = [
    "All",
    "Campus",
    "Technical",
    "Hackathon",
    "Workshop",
    "Placement",
    "Academic",
    "Cultural",
    "Sports",
    "Club",
  ];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const monthEnd = new Date(todayStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const filteredAnnouncements = items.filter(item => {
    const matchesCategory =
      categoryFilter === "All" ||
      item.category === categoryFilter;

    const searchable =
      `${item.title} ${item.body} ${item.category} ${item.author_name} ${item.department}`
        .toLowerCase();

    const matchesQuery =
      !normalizedQuery ||
      searchable.includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });

  const filteredEvents = events.filter(item => {
    if (item.status !== "Published") return false;

    const date = new Date(item.event_date);
    const timestamp = date.getTime();

    let matchesWindow = true;

    if (eventWindow === "Upcoming") {
      matchesWindow = timestamp >= todayStart.getTime();
    }

    if (eventWindow === "Week") {
      matchesWindow =
        timestamp >= todayStart.getTime() &&
        timestamp <= weekEnd.getTime();
    }

    if (eventWindow === "Month") {
      matchesWindow =
        timestamp >= todayStart.getTime() &&
        timestamp <= monthEnd.getTime();
    }

    if (eventWindow === "Past") {
      matchesWindow = timestamp < todayStart.getTime();
    }

    const matchesCategory =
      categoryFilter === "All" ||
      item.category === categoryFilter;

    const searchable =
      `${item.title} ${item.short_description} ${item.description} ${item.category} ${item.venue} ${item.organizer}`
        .toLowerCase();

    const matchesQuery =
      !normalizedQuery ||
      searchable.includes(normalizedQuery);

    return matchesWindow && matchesCategory && matchesQuery;
  });

  const publishedEvents = events.filter(
    item =>
      item.status === "Published" &&
      new Date(item.event_date).getTime() >= todayStart.getTime()
  );

  const featuredEvent =
    filteredEvents.find(item => item.is_featured) ||
    filteredEvents[0] ||
    null;

  const upcomingEvents =
    filteredEvents
      .filter(item => item.id !== featuredEvent?.id)
      .slice(0, 9);

  const eventCountdown = (value: string) => {
    const eventDate = new Date(value);
    const now = new Date();

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const eventDay = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    );

    const diff =
      Math.round(
        (eventDay.getTime() - today.getTime()) /
        86400000
      );

    if (diff < 0) return "Event ended";
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff <= 7) return `${diff} days left`;

    return eventDateLabel(value);
  };

  const escapeIcsText = (value: string) =>
    value
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");

  const toIcsDate = (value: string) =>
    new Date(value)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");

  const addEventToCalendar = (item: CampusEvent) => {
    const start = toIcsDate(item.event_date);

    const end = item.end_date
      ? toIcsDate(item.end_date)
      : toIcsDate(
          new Date(
            new Date(item.event_date).getTime() +
              60 * 60 * 1000
          ).toISOString()
        );

    const description = [
      item.short_description,
      item.description,
      item.registration_url
        ? `Registration: ${item.registration_url}`
        : "",
    ]
      .filter(Boolean)
      .join("\\n\\n");

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CampusConnect//Campus Event//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${item.id}@campusconnect`,
      `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcsText(item.title)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `LOCATION:${escapeIcsText(item.venue || "RNSIT")}`,
      `ORGANIZER;CN=${escapeIcsText(
        item.organizer || item.created_by_name || "CampusConnect"
      )}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], {
      type: "text/calendar;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download =
      `${item.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "campus-event"}.ics`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);

    setStatus("Calendar file downloaded.");
  };

  const shareEvent = async (item: CampusEvent) => {
    const shareText =
      `${item.title}\n` +
      `${eventDateLabel(item.event_date)} · ${eventTimeLabel(
        item.event_date
      )}\n` +
      `${item.venue || "RNSIT"}\n\n` +
      `${item.short_description}`;

    const pageUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: pageUrl,
        });

        return;
      }

      await navigator.clipboard.writeText(
        `${shareText}\n${pageUrl}`
      );

      setStatus("Event details copied to clipboard.");
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      setStatus("Unable to share this event.");
    }
  };

  const eventGoingRegistrations = (eventId: string) =>
    eventRegistrations.filter(
      item =>
        item.event_id === eventId &&
        item.status === "Going"
    );

  const currentRegistration = (eventId: string) =>
    eventRegistrations.find(
      item =>
        item.event_id === eventId &&
        item.student_id === currentUserId &&
        item.status === "Going"
    );


const registrationClosedReason =
  (
    item:
      CampusEvent
  ) => {
    if (
      item.allow_campus_registration ===
        false
    ) {
      return "Campus registration disabled";
    }

    if (
      item.status !==
        "Published"
    ) {
      return "Event not published";
    }

    const eventStart =
      new Date(
        item.event_date
      ).getTime();

    if (
      Number.isNaN(
        eventStart
      )
    ) {
      return "Invalid event date";
    }

    if (
      eventStart <=
        Date.now()
    ) {
      return "Event already started";
    }

    if (
      item.registration_deadline
    ) {
      const deadline =
        new Date(
          item.registration_deadline
        ).getTime();

      if (
        Number.isNaN(
          deadline
        )
      ) {
        return "Invalid registration deadline";
      }

      if (
        deadline >
        eventStart
      ) {
        return "Invalid deadline · Edit event";
      }

      if (
        deadline <=
        Date.now()
      ) {
        return "Registration deadline passed";
      }
    }

    const going =
      eventGoingRegistrations(
        item.id
      ).length;

    if (
      item.capacity != null &&
      item.capacity > 0 &&
      going >=
        item.capacity
    ) {
      return "Event full";
    }

    return "";
  };


const registrationClosed =
  (
    item:
      CampusEvent
  ) =>
    Boolean(
      registrationClosedReason(
        item
      )
    );


  const registerForEvent = async (item: CampusEvent) => {
    if (profile.role !== "Student") return;

    if (registrationClosed(item)) {
      return setStatus(
        "Registration for this event is closed."
      );
    }

    const client = getSupabaseClient();

    if (!client) {
      return setStatus(
        "CampusConnect is not connected to Supabase."
      );
    }

    setRegistrationBusyId(item.id);
    setStatus("");

    try {
      const {data: auth} =
        await client.auth.getUser();

      if (!auth.user) {
        throw new Error(
          "Your session has expired. Sign in again."
        );
      }

      const payload = {
        event_id: item.id,
        student_id: auth.user.id,
        student_name: profile.name,
        student_email: auth.user.email || "",
        department: profile.department || "",
        graduation_year: profile.year || "",
        status: "Going",
        updated_at: new Date().toISOString(),
      };

      const {data, error} = await client
        .from("event_registrations")
        .upsert(payload, {
          onConflict: "event_id,student_id",
        })
        .select()
        .single();

      if (error) throw error;

      const saved = data as EventRegistration;

      setEventRegistrations(current => [
        ...current.filter(
          row =>
            !(
              row.event_id === item.id &&
              row.student_id === auth.user.id
            )
        ),
        saved,
      ]);

      setStatus(
        `You are registered for ${item.title}.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to register for this event."
      );
    } finally {
      setRegistrationBusyId("");
    }
  };

  const cancelEventRegistration = async (
    item: CampusEvent
  ) => {
    const registration =
      currentRegistration(item.id);

    if (!registration) return;

    const client = getSupabaseClient();

    if (!client) {
      return setStatus(
        "CampusConnect is not connected to Supabase."
      );
    }

    setRegistrationBusyId(item.id);

    const {error} = await client
      .from("event_registrations")
      .update({
        status: "Cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", registration.id);

    setRegistrationBusyId("");

    if (error) {
      return setStatus(error.message);
    }

    setEventRegistrations(current =>
      current.map(row =>
        row.id === registration.id
          ? {
              ...row,
              status: "Cancelled",
              updated_at: new Date().toISOString(),
            }
          : row
      )
    );

    setStatus(
      `Registration cancelled for ${item.title}.`
    );
  };

  useEffect(() => {
    if (!scannerOpen || !selectedEvent) return;

    let active = true;
    let scanner: {
      stop: () => Promise<void>;
      clear: () => Promise<void> | void;
    } | null = null;

    const startScanner = async () => {
      try {
        setScannerError("");

        const {Html5Qrcode} = await import("html5-qrcode");

        if (!active) return;

        const qr = new Html5Qrcode("campus-event-qr-reader");
        scanner = qr;

        const cameras = await Html5Qrcode.getCameras();

        if (!active) return;

        if (!cameras.length) {
          throw new Error("No camera was detected on this device.");
        }

        const preferred =
          cameras.find(camera =>
            /back|rear|environment/i.test(camera.label)
          ) || cameras[0];

        await qr.start(
          preferred.id,
          {
            fps: 10,
            qrbox: {
              width: 230,
              height: 230,
            },
          },
          decodedText => {
            if (!active) return;

            setCheckInCode(decodedText.trim());
            setScannerOpen(false);

            window.setTimeout(() => {
              void checkInEventAttendeeWithCode(
                selectedEvent,
                decodedText.trim()
              );
            }, 50);
          },
          () => {
            // Ignore normal scan-frame failures.
          }
        );
      } catch (error) {
        if (!active) return;

        setScannerError(
          error instanceof Error
            ? error.message
            : "Unable to start the camera scanner."
        );
      }
    };

    void startScanner();

    return () => {
      active = false;

      if (scanner) {
        void scanner
          .stop()
          .catch(() => undefined)
          .finally(() => {
            try {
              void scanner?.clear();
            } catch {}
          });
      }
    };
  }, [scannerOpen, selectedEvent]);

  const checkInEventAttendeeWithCode = async (
    item: CampusEvent,
    rawCode: string
  ) => {
    const code = rawCode.trim();

    if (!code) {
      return setCheckInMessage(
        "Enter or scan the attendee pass code."
      );
    }

    const client = getSupabaseClient();

    if (!client) {
      return setCheckInMessage(
        "CampusConnect is not connected to Supabase."
      );
    }

    setCheckInBusy(true);
    setCheckInMessage("");

    try {
      const {data, error} = await client.rpc(
        "check_in_event_attendee",
        {
          p_event_id: item.id,
          p_check_in_code: code,
        }
      );

      if (error) throw error;

      const result = data as {
        success?: boolean;
        already_checked_in?: boolean;
        student_name?: string;
        department?: string;
        graduation_year?: string;
        checked_in_at?: string;
      };

      if (!result.success) {
        throw new Error(
          "Unable to verify this event pass."
        );
      }

      setCheckInMessage(
        result.already_checked_in
          ? `${result.student_name || "Student"} is already checked in.`
          : `✓ ${result.student_name || "Student"} checked in successfully.`
      );

      setCheckInCode("");

      await loadEventRegistrations();
    } catch (error) {
      setCheckInMessage(
        error instanceof Error
          ? error.message
          : "Unable to check in attendee."
      );
    } finally {
      setCheckInBusy(false);
    }
  };

  const checkInEventAttendee = async (
    item: CampusEvent
  ) => {
    await checkInEventAttendeeWithCode(
      item,
      checkInCode
    );
  };

  const exportEventAttendees = (item: CampusEvent) => {
    const attendees =
      eventGoingRegistrations(item.id);

    if (!attendees.length) {
      return setStatus(
        "There are no registrations to export."
      );
    }

    const escapeCsv = (value: unknown) => {
      const string = String(value ?? "");

      return /[",\n]/.test(string)
        ? `"${string.replace(/"/g, '""')}"`
        : string;
    };

    const rows = [
      [
        "Student",
        "Email",
        "Department",
        "Graduation Year",
        "Registered At",
      ].join(","),

      ...attendees.map(row =>
        [
          row.student_name,
          row.student_email,
          row.department,
          row.graduation_year,
          row.registered_at,
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([rows], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download =
      `${item.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}-attendees.csv`;

    anchor.click();

    URL.revokeObjectURL(url);
  };

  const openRegistration = (url: string | null) => {
    if (!url) return;

    if (!/^https?:\/\//i.test(url)) {
      setStatus("This event does not have a valid registration link.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="moduleStack campusUpdatesPage">

      <section className="campusUpdatesHero">
        <div>
          <span>VERIFIED CAMPUS COMMUNICATION</span>
          <h2>Announcements & Events</h2>
          <p>
            Official notices, academic updates and upcoming campus
            experiences — organized in one trusted space.
          </p>
        </div>

        {canPublish && (
          <div className="campusUpdatesHeroActions">
            <button
              className="ghost"
              onClick={() => {
                setShowForm(value => !value);
                setShowEventForm(false);
              }}
            >
              {showForm ? "Close" : "+ Announcement"}
            </button>

            <button
              className="primary"
              onClick={() => {
                setShowEventForm(value => !value);
                setShowForm(false);
              }}
            >
              {showEventForm ? "Close event form" : "+ Create event"}
            </button>
          </div>
        )}
      </section>

      <div
        className="campusUpdatesTabs"
        role="tablist"
        aria-label="Campus update type"
      >
        {(["All", "Announcements", "Events"] as const).map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab}

            {tab === "Announcements" && (
              <span>{items.length}</span>
            )}

            {tab === "Events" && (
              <span>{publishedEvents.length}</span>
            )}
          </button>
        ))}
      </div>

      <section className="campusUpdatesToolbar card">
        <div className="campusUpdatesSearch">
          <span>⌕</span>

          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search announcements, events, venue or organizer..."
            aria-label="Search campus updates"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="campusCategoryFilters">
          {(activeTab === "Events"
            ? eventCategories
            : activeTab === "Announcements"
            ? announcementCategories
            : ["All", "Academic", "Placement", "Campus"]
          ).map(category => (
            <button
              type="button"
              key={category}
              className={
                categoryFilter === category ? "active" : ""
              }
              onClick={() => setCategoryFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {(activeTab === "All" || activeTab === "Events") && (
          <select
            className="eventWindowFilter"
            value={eventWindow}
            onChange={event =>
              setEventWindow(
                event.target.value as
                  | "Upcoming"
                  | "Week"
                  | "Month"
                  | "Past"
              )
            }
            aria-label="Filter events by date"
          >
            <option value="Upcoming">Upcoming</option>
            <option value="Week">Next 7 days</option>
            <option value="Month">Next 30 days</option>
            <option value="Past">Past events</option>
          </select>
        )}
      </section>

      {status && (
        <StatusLine text={status}/>
      )}

      {showForm && (
        <form
          className="moduleForm card"
          onSubmit={publish}
        >
          <FormHeading
            title="Publish an official update"
            text="Choose exactly who should receive this announcement."
          />

          <div className="formGrid">
            <Field label="Title">
              <input
                value={form.title}
                onChange={event =>
                  setForm({
                    ...form,
                    title: event.target.value,
                  })
                }
                placeholder="Clear announcement title"
              />
            </Field>

            <Field label="Category">
              <select
                value={form.category}
                onChange={event =>
                  setForm({
                    ...form,
                    category: event.target.value,
                  })
                }
              >
                <option>Academic</option>
                <option>Placement</option>
                <option>Campus</option>
                <option>Exam</option>
                <option>Emergency</option>
              </select>
            </Field>
          </div>

          <Field label="Message">
            <textarea
              value={form.body}
              onChange={event =>
                setForm({
                  ...form,
                  body: event.target.value,
                })
              }
              placeholder="Write the complete update..."
            />
          </Field>

          <div className="formGrid">
            <Field label="Audience">
              <select
                value={form.audience}
                onChange={event =>
                  setForm({
                    ...form,
                    audience:
                      event.target.value as Role | "All",
                  })
                }
              >
                <option>Student</option>
                <option>Faculty</option>
                <option>Placement Cell</option>
                <option>All</option>
              </select>
            </Field>

            <Field label="Department">
              <select
                value={form.department}
                onChange={event =>
                  setForm({
                    ...form,
                    department: event.target.value,
                  })
                }
              >
                <option>All</option>
                <option>ECE</option>
                <option>CSE</option>
                <option>ISE</option>
                <option>EEE</option>
                <option>Mechanical</option>
                <option>Civil</option>
              </select>
            </Field>
          </div>

          <Field label="Attachments">
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv"
              onChange={event =>
                setAnnouncementFiles(
                  Array.from(event.target.files || [])
                )
              }
            />

            <small>
              PDF, images, Word, PowerPoint, Excel,
              TXT and CSV · Maximum 10 MB per file
            </small>
          </Field>

          {announcementFiles.length > 0 && (
            <div className="selectedAttachmentList">
              {announcementFiles.map((file, index) => (
                <div
                  className="selectedAttachment"
                  key={`${file.name}-${index}`}
                >
                  <span>
                    <b>{file.name}</b>
                    <small>
                      {formatAttachmentSize(file.size)}
                    </small>
                  </span>

                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      setAnnouncementFiles(current =>
                        current.filter(
                          (_, fileIndex) =>
                            fileIndex !== index
                        )
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          
          {canPublishFestival && (
            <section className="festivalPublishControls">

              <header>
                <div>
                  <span>
                    DISPLAY MODE
                  </span>

                  <h3>
                    Festival &
                    celebration
                  </h3>

                  <p>
                    Publish a festival greeting and optionally feature it across the Dashboard.
                  </p>
                </div>
              </header>


              <div className="festivalControlGrid">

                <Field label="Announcement type">
                  <select
                    value={
                      form.announcement_type
                    }
                    onChange={
                      event =>
                        setForm({
                          ...form,
                          announcement_type:
                            event.target
                              .value as
                              | "Normal"
                              | "Festival"
                              | "Featured"
                              | "Emergency",
                        })
                    }
                  >
                    <option>
                      Normal
                    </option>

                    <option>
                      Festival
                    </option>

                    <option>
                      Featured
                    </option>

                    <option>
                      Emergency
                    </option>
                  </select>
                </Field>


                {form.announcement_type ===
                  "Festival" && (
                  <Field label="Festival poster / banner">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={
                        event =>
                          setFestivalBannerFile(
                            event.target
                              .files?.[0] ||
                              null
                          )
                      }
                    />
                  </Field>
                )}

              </div>


              {form.announcement_type ===
                "Festival" && (
                <>

                  <div className="festivalToggleGrid">

                    <label className="festivalToggleCard">

                      <input
                        type="checkbox"
                        checked={
                          form.show_floating_banner
                        }
                        onChange={
                          event =>
                            setForm({
                              ...form,
                              show_floating_banner:
                                event.target
                                  .checked,
                            })
                        }
                      />

                      <span>
                        <b>
                          Show on Dashboard
                        </b>

                        <small>
                          Display this festival wish prominently when users enter Dashboard.
                        </small>
                      </span>

                    </label>


                    <label className="festivalToggleCard">

                      <input
                        type="checkbox"
                        checked={
                          form.banner_dismissible
                        }
                        onChange={
                          event =>
                            setForm({
                              ...form,
                              banner_dismissible:
                                event.target
                                  .checked,
                            })
                        }
                      />

                      <span>
                        <b>
                          Allow close button
                        </b>

                        <small>
                          Users can dismiss the banner after viewing it.
                        </small>
                      </span>

                    </label>

                  </div>


                  <div className="festivalControlGrid">

                    <Field label="Show from">
                      <input
                        type="datetime-local"
                        value={
                          form.banner_start_at
                        }
                        onChange={
                          event =>
                            setForm({
                              ...form,
                              banner_start_at:
                                event.target
                                  .value,
                            })
                        }
                      />
                    </Field>


                    <Field label="Hide after">
                      <input
                        type="datetime-local"
                        value={
                          form.banner_end_at
                        }
                        onChange={
                          event =>
                            setForm({
                              ...form,
                              banner_end_at:
                                event.target
                                  .value,
                            })
                        }
                      />
                    </Field>

                  </div>


                  <div className="festivalControlGrid">

                    <Field label="Button label">
                      <input
                        value={
                          form.banner_cta_label
                        }
                        onChange={
                          event =>
                            setForm({
                              ...form,
                              banner_cta_label:
                                event.target
                                  .value,
                            })
                        }
                        placeholder="Explore celebration"
                      />
                    </Field>


                    <Field label="Button link">
                      <input
                        value={
                          form.banner_cta_url
                        }
                        onChange={
                          event =>
                            setForm({
                              ...form,
                              banner_cta_url:
                                event.target
                                  .value,
                            })
                        }
                        placeholder="https://..."
                      />
                    </Field>

                  </div>

                </>
              )}

            </section>
          )}


<FormActions
            status={
              uploadingAttachments
                ? "Uploading attachments..."
                : ""
            }
            label={
              uploadingAttachments
                ? "Uploading..."
                : "Publish announcement"
            }
          />
        </form>
      )}

      {showEventForm && canPublish && (
        <form
          className="moduleForm card campusEventForm"
          onSubmit={publishEvent}
        >
          <FormHeading
            title="Create a campus event"
            text="Publish a complete event page with banner, venue, registration and audience information."
          />

          <div className="formGrid">
            <Field label="Event title">
              <input
                value={eventForm.title}
                onChange={event =>
                  setEventForm({
                    ...eventForm,
                    title: event.target.value,
                  })
                }
                placeholder="Innovation Day 2026"
              />
            </Field>

            <Field label="Category">
              <select
                value={eventForm.category}
                onChange={event =>
                  setEventForm({
                    ...eventForm,
                    category: event.target.value,
                  })
                }
              >
                <option>Campus</option>
                <option>Technical</option>
                <option>Hackathon</option>
                <option>Workshop</option>
                <option>Placement</option>
                <option>Academic</option>
                <option>Cultural</option>
                <option>Sports</option>
                <option>Club</option>
              </select>
            </Field>
          </div>

          <Field label="Short description">
            <input
              value={eventForm.short_description}
              onChange={event =>
                setEventForm({
                  ...eventForm,
                  short_description: event.target.value,
                })
              }
              placeholder="One-line description shown on event cards"
            />
          </Field>

          <Field label="Full event details">
            <textarea
              value={eventForm.description}
              onChange={event =>
                setEventForm({
                  ...eventForm,
                  description: event.target.value,
                })
              }
              placeholder="Agenda, eligibility, instructions, prizes, requirements and other event details..."
            />
          </Field>

          <div className="formGrid">
            <Field label="Start date & time">
              <input
                type="datetime-local"
                value={eventForm.event_date}
                onChange={event =>
                  setEventForm({
                    ...eventForm,
                    event_date: event.target.value,
                  })
                }
              />
            </Field>

            <Field label="End date & time">
              <input
                type="datetime-local"
                value={eventForm.end_date}
                onChange={event =>
                  setEventForm({
                    ...eventForm,
                    end_date: event.target.value,
                  })
                }
              />
            </Field>
          </div>

          <div className="formGrid">
            <Field label="Venue">
              <input
                value={eventForm.venue}
                onChange={event =>
                  setEventForm({
                    ...eventForm,
                    venue: event.target.value,
                  })
                }
                placeholder="Seminar Hall / Innovation Lab / Auditorium"
              />
            </Field>

            <Field label="Organizer">
              <input
                value={eventForm.organizer}
                onChange={event =>
                  setEventForm({
                    ...eventForm,
                    organizer: event.target.value,
                  })
                }
                placeholder="ECE Department / Coding Club"
              />
            </Field>
          </div>

          <div className="formGrid">
            <Field label="Department">
              <select
                value={eventForm.audience_department}
                onChange={event =>
                  setEventForm({
                    ...eventForm,
                    audience_department: event.target.value,
                  })
                }
              >
                <option>All</option>
                <option>ECE</option>
                <option>CSE</option>
                <option>ISE</option>
                <option>EEE</option>
                <option>Mechanical</option>
                <option>Civil</option>
              </select>
            </Field>

            <Field label="Student year">
              <select
                value={eventForm.audience_year}
                onChange={event =>
                  setEventForm({
                    ...eventForm,
                    audience_year: event.target.value,
                  })
                }
              >
                <option>All</option>
                <option>1st Year</option>
                <option>2nd Year</option>
                <option>3rd Year</option>
                <option>4th Year</option>
                <option>2026</option>
                <option>2027</option>
                <option>2028</option>
                <option>2029</option>
              </select>
            </Field>
          </div>

          <section className="eventRegistrationSettings">
            <div className="formHeading">
              <div>
                <span>REGISTRATION</span>
                <h3>Campus registration</h3>
                <p>
                  Let students register directly through CampusConnect.
                </p>
              </div>
            </div>

            <div className="formGrid">
              <Field label="Capacity">
                <input
                  type="number"
                  min="1"
                  value={eventForm.capacity}
                  onChange={event =>
                    setEventForm({
                      ...eventForm,
                      capacity: event.target.value,
                    })
                  }
                  placeholder="100"
                />
              </Field>

              <Field label="Registration deadline">
                <input
                  type="datetime-local"
                  value={eventForm.registration_deadline}
                  onChange={event =>
                    setEventForm({
                      ...eventForm,
                      registration_deadline:
                        event.target.value,
                    })
                  }
                />
              </Field>
            </div>

            <label className="campusRegistrationToggle">
              <input
                type="checkbox"
                checked={
                  eventForm.allow_campus_registration
                }
                onChange={event =>
                  setEventForm({
                    ...eventForm,
                    allow_campus_registration:
                      event.target.checked,
                  })
                }
              />

              <span>
                <b>Allow CampusConnect registration</b>
                <small>
                  Students can register without leaving CampusConnect.
                </small>
              </span>
            </label>
          </section>

          <Field label="Registration link">
            <input
              type="url"
              value={eventForm.registration_url}
              onChange={event =>
                setEventForm({
                  ...eventForm,
                  registration_url: event.target.value,
                })
              }
              placeholder="https://..."
            />
          </Field>

          <Field label="Event banner">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={event =>
                setEventBanner(
                  event.target.files?.[0] || null
                )
              }
            />

            <small>
              JPG, PNG or WebP · Maximum 5 MB · Recommended
              landscape ratio 16:7
            </small>
          </Field>

          <Field label="Event resources & attachments">
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv"
              onChange={event =>
                setEventFiles(
                  Array.from(event.target.files || [])
                )
              }
            />

            <small>
              Add rules, schedules, brochures, PDFs,
              presentations, spreadsheets or images.
              Maximum 10 MB per file.
            </small>
          </Field>

          {eventFiles.length > 0 && (
            <div className="selectedAttachmentList">
              {eventFiles.map((file, index) => (
                <div
                  className="selectedAttachment"
                  key={`${file.name}-${index}`}
                >
                  <span>
                    <b>{file.name}</b>
                    <small>
                      {formatAttachmentSize(file.size)}
                    </small>
                  </span>

                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      setEventFiles(current =>
                        current.filter(
                          (_, fileIndex) =>
                            fileIndex !== index
                        )
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="eventPublishOptions">
            <label>
              <input
                type="checkbox"
                checked={eventForm.is_featured}
                onChange={event =>
                  setEventForm({
                    ...eventForm,
                    is_featured: event.target.checked,
                  })
                }
              />

              <span>
                <b>Feature this event</b>
                <small>
                  Display prominently at the top of Campus Updates.
                </small>
              </span>
            </label>

            <label>
              <span>
                <b>Publishing status</b>
                <small>
                  Save privately or publish immediately.
                </small>
              </span>

              <select
                value={eventForm.status}
                onChange={event =>
                  setEventForm({
                    ...eventForm,
                    status:
                      event.target.value as "Draft" | "Published",
                  })
                }
              >
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </select>
            </label>
          </div>

          <div className="formActions">
            <span>
              {eventBanner
                ? `Banner: ${eventBanner.name}`
                : "Banner is optional"}
            </span>

            <button
              className="primary"
              disabled={publishingEvent}
            >
              {publishingEvent
                ? "Publishing..."
                : eventForm.status === "Draft"
                ? "Save draft"
                : "Publish event"}
            </button>
          </div>
        </form>
      )}

      {(activeTab === "All" || activeTab === "Events") && (
        <section className="campusEventsSection premiumEventsPage">

          <section className="premiumEventsHero">
            <div className="premiumEventsHeroCopy">
              <span>EVENTS & EXPERIENCES</span>

              <h2>
                Discover. Connect.
                <br/>
                Create memories.
              </h2>

              <p>
                From workshops to cultural fests — find events that inspire you,
                build your network and make campus life more memorable.
              </p>

              <div className="premiumHeroUnderline"/>
            </div>

            <div className="premiumCampusIllustration" aria-hidden="true">
              <svg viewBox="0 0 460 220">
                <g
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M35 190h390"/>
                  <rect x="135" y="72" width="190" height="112" rx="2"/>
                  <rect x="70" y="104" width="65" height="80" rx="2"/>
                  <rect x="325" y="104" width="65" height="80" rx="2"/>
                  <rect x="198" y="132" width="64" height="52" rx="2"/>
                  <path d="M208 184v-36h44v36"/>
                  <path d="M125 72h210"/>
                  <path d="M150 58h160"/>
                  <path d="M175 48h110"/>
                  <rect x="195" y="82" width="70" height="18" rx="2"/>
                  <path d="M207 91h46"/>
                  <rect x="155" y="111" width="18" height="18"/>
                  <rect x="181" y="111" width="18" height="18"/>
                  <rect x="261" y="111" width="18" height="18"/>
                  <rect x="287" y="111" width="18" height="18"/>
                  <rect x="155" y="140" width="18" height="18"/>
                  <rect x="181" y="140" width="18" height="18"/>
                  <rect x="261" y="140" width="18" height="18"/>
                  <rect x="287" y="140" width="18" height="18"/>
                  <path d="M186 190h88"/>
                  <path d="M194 197h72"/>
                  <path d="M203 204h54"/>
                  <path d="M52 184v-30"/>
                  <circle cx="52" cy="143" r="16"/>
                  <circle cx="43" cy="153" r="11"/>
                  <circle cx="61" cy="153" r="11"/>
                  <path d="M408 184v-30"/>
                  <circle cx="408" cy="143" r="16"/>
                  <circle cx="399" cy="153" r="11"/>
                  <circle cx="417" cy="153" r="11"/>
                </g>
              </svg>
            </div>
          </section>

          <section className="premiumEventsToolbar card">
            <div className="premiumEventsSearch">
              <span>⌕</span>

              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search events, workshops, venues..."
              />
            </div>

            <div className="premiumEventsTabs">
              {(["All", "Upcoming", "Week", "Month", "Past"] as const).map(tab => (
                <button
                  type="button"
                  key={tab}
                  className={eventWindow === tab || (tab === "All" && eventWindow === "Upcoming") ? "active" : ""}
                  onClick={() => {
                    if (tab === "All") setEventWindow("Upcoming");
                    else setEventWindow(tab);
                  }}
                >
                  {tab === "Week" ? "This Week" :
                   tab === "Month" ? "This Month" :
                   tab}
                </button>
              ))}
            </div>

            <select
              value={categoryFilter}
              onChange={event => setCategoryFilter(event.target.value)}
              className="premiumCategorySelect"
            >
              {eventCategories.map(category => (
                <option key={category} value={category}>
                  {category === "All" ? "All Categories" : category}
                </option>
              ))}
            </select>
          </section>

          <div className="premiumEventsHeading">
            <div>
              <span>UPCOMING EVENTS</span>
              <h3>Explore what’s happening on campus</h3>
              <p>Curated workshops, talks, competitions and cultural experiences.</p>
            </div>

            <strong>
              {filteredEvents.length}
              <small> events</small>
            </strong>
          </div>

          {featuredEvent && (
            <article className="premiumFeaturedEvent">
              <button
                className="premiumFeaturedBanner"
                onClick={() => setSelectedEvent(featuredEvent)}
              >
                {featuredEvent.banner_url ? (
                  <img
                    src={featuredEvent.banner_url}
                    alt={`${featuredEvent.title} banner`}
                  />
                ) : (
                  <div className="eventBannerFallback premiumFallback">
                    <span>{featuredEvent.category}</span>
                    <strong>{featuredEvent.title}</strong>
                  </div>
                )}

                <span className="premiumFeaturedBadge">FEATURED</span>
              </button>

              <div className="premiumFeaturedContent">
                <div className="premiumEventCategoryRow">
                  <span>{featuredEvent.category}</span>
                  <small>{eventCountdown(featuredEvent.event_date)}</small>
                </div>

                <h2>{featuredEvent.title}</h2>

                <p>{featuredEvent.short_description}</p>

                <div className="premiumEventFacts">
                  <div>
                    <span>◷</span>
                    <p>
                      <small>DATE & TIME</small>
                      <b>
                        {eventDateLabel(featuredEvent.event_date)} ·{" "}
                        {eventTimeLabel(featuredEvent.event_date)}
                      </b>
                    </p>
                  </div>

                  <div>
                    <span>◇</span>
                    <p>
                      <small>VENUE</small>
                      <b>{featuredEvent.venue || "To be announced"}</b>
                    </p>
                  </div>

                  <div>
                    <span>◎</span>
                    <p>
                      <small>ORGANIZER</small>
                      <b>{featuredEvent.organizer || featuredEvent.created_by_name}</b>
                    </p>
                  </div>
                </div>

                <div className="premiumFeaturedActions">
                  <button
                    className="ghost"
                    onClick={() => setSelectedEvent(featuredEvent)}
                  >
                    View details
                  </button>

                  {featuredEvent.allow_campus_registration !== false && (
                    <button
                      className="primary"
                      onClick={() => setSelectedEvent(featuredEvent)}
                    >
                      Register →
                    </button>
                  )}
                </div>
              </div>
            </article>
          )}

          <div className="premiumEventsLayout">
            <section className="premiumEventsGrid">
              {upcomingEvents.map(item => {
                const going = eventGoingRegistrations(item.id).length;
                const capacity = item.capacity || 0;
                const seatsLeft =
                  capacity > 0 ? Math.max(0, capacity - going) : null;

                return (
                  <article className="premiumEventCard" key={item.id}>
                    <button
                      className="premiumEventImage"
                      onClick={() => setSelectedEvent(item)}
                    >
                      {item.banner_url ? (
                        <img
                          src={item.banner_url}
                          alt={`${item.title} banner`}
                        />
                      ) : (
                        <div className="eventBannerFallback compact premiumFallback">
                          <span>{item.category}</span>
                          <strong>{item.title}</strong>
                        </div>
                      )}

                      <span className="premiumEventDateBox">
                        <small>
                          {new Date(item.event_date)
                            .toLocaleString("en-IN", {month: "short"})
                            .toUpperCase()}
                        </small>
                        <b>{new Date(item.event_date).getDate()}</b>
                      </span>
                    </button>

                    <div className="premiumEventCardBody">
                      <span className="premiumEventCategory">{item.category}</span>

                      <h3>{item.title}</h3>

                      <div className="premiumEventMeta">
                        <span>◇ {item.venue || "Venue TBA"}</span>
                        <span>◷ {eventTimeLabel(item.event_date)}</span>
                      </div>

                      {item.allow_campus_registration !== false && (
                        <div className="premiumRegistrationMeta">
                          <span>
                            {going}
                            {capacity > 0 ? ` / ${capacity}` : ""} registered
                          </span>

                          {seatsLeft !== null && (
                            <strong>{seatsLeft} seats left</strong>
                          )}
                        </div>
                      )}

                      <button
                        className="premiumEventOpen"
                        onClick={() => setSelectedEvent(item)}
                      >
                        View event →
                      </button>
                    </div>
                  </article>
                );
              })}

              {!filteredEvents.length && (
                <EmptyState
                  title="No events found"
                  text="Try changing your filters or check again when new campus events are published."
                />
              )}
            </section>

            <aside className="premiumEventsSidebar">
              <div className="premiumHighlightsCard card">
                <span>UPCOMING HIGHLIGHTS</span>

                <h3>Don’t miss these</h3>

                {filteredEvents.slice(0, 4).map((item, index) => (
                  <button
                    key={item.id}
                    className="premiumHighlightItem"
                    onClick={() => setSelectedEvent(item)}
                  >
                    <i>{index + 1}</i>

                    <p>
                      <b>{item.title}</b>
                      <small>
                        {eventDateLabel(item.event_date)} ·{" "}
                        {eventTimeLabel(item.event_date)}
                      </small>
                    </p>
                  </button>
                ))}

                {!filteredEvents.length && (
                  <small>No highlights right now.</small>
                )}
              </div>
            </aside>
          </div>

          <section className="premiumEventStats">
            <div>
              <span>◷</span>
              <p>
                <strong>{publishedEvents.length}</strong>
                <small>Upcoming Events</small>
              </p>
            </div>

            <div>
              <span>◎</span>
              <p>
                <strong>
                  {
                    eventRegistrations.filter(item => item.status === "Going")
                      .length
                  }
                </strong>
                <small>Total Registrations</small>
              </p>
            </div>

            <div>
              <span>◇</span>
              <p>
                <strong>
                  {new Set(
                    filteredEvents.map(item => item.audience_department)
                  ).size}
                </strong>
                <small>Departments</small>
              </p>
            </div>

            <div>
              <span>✦</span>
              <p>
                <strong>Live</strong>
                <small>Campus Activity</small>
              </p>
            </div>
          </section>
        </section>
      )}

      {(activeTab === "All" ||
        activeTab === "Announcements") && (
        <section className="campusAnnouncementsSection">

          <header className="campusSectionHeading">
            <div>
              <span>OFFICIAL COMMUNICATION</span>
              <h3>Latest announcements</h3>
              <p>
                Verified academic, placement and campus notices.
              </p>
            </div>

            <strong>
              {items.length}
              <small> notices</small>
            </strong>
          </header>

          <div className="announcementFeed">
            {filteredAnnouncements.map(item => (
              <article
                className={`announcementCard card ${
                  item.is_pinned ? "pinned" : ""
                }`}
                key={item.id}
              >
                <div
                  className={`moduleIcon ${item.category.toLowerCase()}`}
                >
                  {item.category.slice(0, 1)}
                </div>

                <div>
                  <div className="itemMeta">
                    <span>{item.category}</span>

                    <span>
                      {item.audience} · {item.department}
                    </span>

                    <time>
                      {friendlyDate(item.created_at)}
                    </time>
                  </div>

                  <h3>{item.title}</h3>

                  <p>{item.body}</p>

                  <small>
                    Published by {item.author_name}
                  </small>
                </div>

                <div className="announcementCardActions">
                  {item.is_pinned && (
                    <b className="pinBadge">
                      Pinned
                    </b>
                  )}

                  {canManageAnnouncement(item) && (
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          openAnnouncementEditor(item)
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void toggleAnnouncementPin(item)
                        }
                      >
                        {item.is_pinned ? "Unpin" : "Pin"}
                      </button>

                      <button
                        type="button"
                        className="danger"
                        onClick={() =>
                          void deleteAnnouncement(item)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}

            {!filteredAnnouncements.length && (
              <EmptyState
                title="No matching announcements"
                text={
                  query || categoryFilter !== "All"
                    ? "Try changing your search or filters."
                    : "Verified campus updates will appear here."
                }
              />
            )}
          </div>
        </section>
      )}

      {editingAnnouncement && (
        <div
          className="eventModalScrim"
          onClick={() => setEditingAnnouncement(null)}
        >
          <section
            className="campusEditModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-announcement-title"
            onClick={event => event.stopPropagation()}
          >
            <button
              className="eventModalClose"
              type="button"
              onClick={() => setEditingAnnouncement(null)}
              aria-label="Close announcement editor"
            >
              ×
            </button>

            <form
              className="moduleForm campusEditForm"
              onSubmit={saveAnnouncementEdit}
            >
              <FormHeading
                title="Edit announcement"
                text="Update this verified campus communication."
              />

              <div className="formGrid">
                <Field label="Title">
                  <input
                    value={announcementEditForm.title}
                    onChange={event =>
                      setAnnouncementEditForm({
                        ...announcementEditForm,
                        title: event.target.value,
                      })
                    }
                  />
                </Field>

                <Field label="Category">
                  <select
                    value={announcementEditForm.category}
                    onChange={event =>
                      setAnnouncementEditForm({
                        ...announcementEditForm,
                        category: event.target.value,
                      })
                    }
                  >
                    <option>Academic</option>
                    <option>Placement</option>
                    <option>Campus</option>
                    <option>Exam</option>
                    <option>Emergency</option>
                  </select>
                </Field>
              </div>

              <Field label="Message">
                <textarea
                  value={announcementEditForm.body}
                  onChange={event =>
                    setAnnouncementEditForm({
                      ...announcementEditForm,
                      body: event.target.value,
                    })
                  }
                />
              </Field>

              <div className="formGrid">
                <Field label="Audience">
                  <select
                    value={announcementEditForm.audience}
                    onChange={event =>
                      setAnnouncementEditForm({
                        ...announcementEditForm,
                        audience: event.target.value,
                      })
                    }
                  >
                    <option>Student</option>
                    <option>Faculty</option>
                    <option>Placement Cell</option>
                    <option>All</option>
                  </select>
                </Field>

                <Field label="Department">
                  <select
                    value={announcementEditForm.department}
                    onChange={event =>
                      setAnnouncementEditForm({
                        ...announcementEditForm,
                        department: event.target.value,
                      })
                    }
                  >
                    <option>All</option>
                    <option>ECE</option>
                    <option>CSE</option>
                    <option>ISE</option>
                    <option>EEE</option>
                    <option>Mechanical</option>
                    <option>Civil</option>
                  </select>
                </Field>
              </div>

              
              {editingAnnouncement.announcement_type ===
                "Festival" &&
                profile.role ===
                  "Main Admin" && (

                <section className="festivalProfessionalEditor">

                  <header className="festivalEditorHeader">

                    <div>
                      <span>
                        FESTIVAL EXPERIENCE
                      </span>

                      <h3>
                        Banner & celebration
                      </h3>

                      <p>
                        Manage the visual banner, video,
                        party burst, schedule and action button.
                      </p>
                    </div>

                  </header>


                  <div className="festivalEditorMediaGrid">

                    <Field label="Image banner">

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"

                        onChange={
                          event => {

                            setFestivalEditBannerFile(
                              event.target
                                .files?.[0] ||
                              null
                            );

                            setRemoveFestivalBanner(
                              false
                            );
                          }
                        }
                      />

                      {editingAnnouncement.banner_url &&
                        !removeFestivalBanner && (

                        <div className="festivalExistingMedia">

                          <img
                            src={
                              editingAnnouncement
                                .banner_url
                            }
                            alt="Current festival banner"
                          />

                          <small>
                            Current image banner
                          </small>

                        </div>

                      )}

                    </Field>


                    <Field label="Video banner">

                      <input
                        type="file"
                        accept="video/mp4,video/webm"

                        onChange={
                          event => {

                            setFestivalEditVideoFile(
                              event.target
                                .files?.[0] ||
                              null
                            );

                            setRemoveFestivalVideo(
                              false
                            );
                          }
                        }
                      />

                      {editingAnnouncement.video_banner_url &&
                        !removeFestivalVideo && (

                        <div className="festivalExistingMedia">

                          <video
                            src={
                              editingAnnouncement
                                .video_banner_url
                            }
                            muted
                            controls
                            playsInline
                          />

                          <small>
                            Current video banner
                          </small>

                        </div>

                      )}

                    </Field>

                  </div>


                  <div className="festivalRemoveMediaGrid">

                    <label>

                      <input
                        type="checkbox"

                        checked={
                          removeFestivalBanner
                        }

                        onChange={
                          event =>
                            setRemoveFestivalBanner(
                              event.target
                                .checked
                            )
                        }
                      />

                      <span>
                        <b>
                          Remove image
                        </b>

                        <small>
                          Delete the image banner reference.
                        </small>
                      </span>

                    </label>


                    <label>

                      <input
                        type="checkbox"

                        checked={
                          removeFestivalVideo
                        }

                        onChange={
                          event =>
                            setRemoveFestivalVideo(
                              event.target
                                .checked
                            )
                        }
                      />

                      <span>
                        <b>
                          Remove video
                        </b>

                        <small>
                          Fall back to the festival image.
                        </small>
                      </span>

                    </label>

                  </div>


                  <div className="festivalToggleGrid">

                    <label className="festivalToggleCard">

                      <input
                        type="checkbox"

                        checked={
                          festivalEditSettings
                            .show_floating_banner
                        }

                        onChange={
                          event =>
                            setFestivalEditSettings(
                              current => ({
                                ...current,

                                show_floating_banner:
                                  event.target
                                    .checked,
                              })
                            )
                        }
                      />

                      <span>

                        <b>
                          Party burst
                        </b>

                        <small>
                          Play celebration animation when users
                          enter the dashboard.
                        </small>

                      </span>

                    </label>


                    <label className="festivalToggleCard">

                      <input
                        type="checkbox"

                        checked={
                          festivalEditSettings
                            .banner_dismissible
                        }

                        onChange={
                          event =>
                            setFestivalEditSettings(
                              current => ({
                                ...current,

                                banner_dismissible:
                                  event.target
                                    .checked,
                              })
                            )
                        }
                      />

                      <span>

                        <b>
                          Allow close
                        </b>

                        <small>
                          Users can dismiss this festival.
                        </small>

                      </span>

                    </label>

                  </div>


                  <section className="festivalBurstPalette">

                    <header>

                      <span>
                        PARTY BURST
                      </span>

                      <h4>
                        Celebration colors
                      </h4>

                      <p>
                        Select five colors for the festival
                        particle animation.
                      </p>

                    </header>


                    <div className="festivalColorGrid">

                      {festivalEditSettings
                        .burst_colors
                        .map(
                          (
                            color,
                            index
                          ) => (

                          <label
                            className="festivalColorPicker"
                            key={
                              index
                            }
                          >

                            <input
                              type="color"

                              value={
                                color
                              }

                              onChange={
                                event => {

                                  const colors =
                                    [
                                      ...festivalEditSettings
                                        .burst_colors
                                    ];

                                  colors[index] =
                                    event.target
                                      .value;

                                  setFestivalEditSettings(
                                    current => ({
                                      ...current,
                                      burst_colors:
                                        colors,
                                    })
                                  );
                                }
                              }
                            />

                            <span
                              style={{
                                background:
                                  color,
                              }}
                            />

                            <small>
                              {color}
                            </small>

                          </label>

                        ))}

                    </div>

                  </section>


                  <div className="festivalControlGrid">

                    <Field label="Show from">

                      <input
                        type="datetime-local"

                        value={
                          festivalEditSettings
                            .banner_start_at
                        }

                        onChange={
                          event =>
                            setFestivalEditSettings(
                              current => ({
                                ...current,
                                banner_start_at:
                                  event.target
                                    .value,
                              })
                            )
                        }
                      />

                    </Field>


                    <Field label="Hide after">

                      <input
                        type="datetime-local"

                        value={
                          festivalEditSettings
                            .banner_end_at
                        }

                        onChange={
                          event =>
                            setFestivalEditSettings(
                              current => ({
                                ...current,
                                banner_end_at:
                                  event.target
                                    .value,
                              })
                            )
                        }
                      />

                    </Field>

                  </div>


                  <div className="festivalControlGrid">

                    <Field label="Button label">

                      <input
                        value={
                          festivalEditSettings
                            .banner_cta_label
                        }

                        placeholder="Explore"

                        onChange={
                          event =>
                            setFestivalEditSettings(
                              current => ({
                                ...current,
                                banner_cta_label:
                                  event.target
                                    .value,
                              })
                            )
                        }
                      />

                    </Field>


                    <Field label="Button URL">

                      <input
                        type="url"

                        value={
                          festivalEditSettings
                            .banner_cta_url
                        }

                        placeholder="https://..."

                        onChange={
                          event =>
                            setFestivalEditSettings(
                              current => ({
                                ...current,
                                banner_cta_url:
                                  event.target
                                    .value,
                              })
                            )
                        }
                      />

                    </Field>

                  </div>

                </section>

              )}


<div className="formActions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    setEditingAnnouncement(null)
                  }
                >
                  Cancel
                </button>

                <button
                  className="primary"
                  disabled={savingEdit}
                >
                  {savingEdit
                    ? "Saving..."
                    : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {editingEvent && (
        <div
          className="eventModalScrim"
          onClick={() => setEditingEvent(null)}
        >
          <section
            className="campusEditModal campusEventEditModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-event-title"
            onClick={event => event.stopPropagation()}
          >
            <button
              className="eventModalClose"
              type="button"
              onClick={() => setEditingEvent(null)}
              aria-label="Close event editor"
            >
              ×
            </button>

            <form
              className="moduleForm campusEditForm"
              onSubmit={saveEventEdit}
              noValidate
            >
              <FormHeading
                title="Edit campus event"
                text="Update event details, audience, registration or banner."
              />

              <div className="formGrid">
                <Field label="Event title">
                  <input
                    value={eventEditForm.title}
                    onChange={event =>
                      setEventEditForm({
                        ...eventEditForm,
                        title: event.target.value,
                      })
                    }
                  />
                </Field>

                <Field label="Category">
                  <select
                    value={eventEditForm.category}
                    onChange={event =>
                      setEventEditForm({
                        ...eventEditForm,
                        category: event.target.value,
                      })
                    }
                  >
                    <option>Campus</option>
                    <option>Technical</option>
                    <option>Hackathon</option>
                    <option>Workshop</option>
                    <option>Placement</option>
                    <option>Academic</option>
                    <option>Cultural</option>
                    <option>Sports</option>
                    <option>Club</option>
                  </select>
                </Field>
              </div>

              <Field label="Short description">
                <input
                  value={eventEditForm.short_description}
                  onChange={event =>
                    setEventEditForm({
                      ...eventEditForm,
                      short_description: event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Full event details">
                <textarea
                  value={eventEditForm.description}
                  onChange={event =>
                    setEventEditForm({
                      ...eventEditForm,
                      description: event.target.value,
                    })
                  }
                />
              </Field>

              <div className="formGrid">
                <Field label="Start date & time">
                  <input
                    type="datetime-local"
                    value={eventEditForm.event_date}
                    onChange={event =>
                      setEventEditForm({
                        ...eventEditForm,
                        event_date: event.target.value,
                      })
                    }
                  />
                </Field>

                <Field label="End date & time">
                  <input
                    type="datetime-local"
                    value={eventEditForm.end_date}
                    onChange={event =>
                      setEventEditForm({
                        ...eventEditForm,
                        end_date: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>

              <div className="formGrid">
                <Field label="Venue">
                  <input
                    value={eventEditForm.venue}
                    onChange={event =>
                      setEventEditForm({
                        ...eventEditForm,
                        venue: event.target.value,
                      })
                    }
                  />
                </Field>

                <Field label="Organizer">
                  <input
                    value={eventEditForm.organizer}
                    onChange={event =>
                      setEventEditForm({
                        ...eventEditForm,
                        organizer: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>

              <div className="formGrid">
                <Field label="Department">
                  <select
                    value={eventEditForm.audience_department}
                    onChange={event =>
                      setEventEditForm({
                        ...eventEditForm,
                        audience_department: event.target.value,
                      })
                    }
                  >
                    <option>All</option>
                    <option>ECE</option>
                    <option>CSE</option>
                    <option>ISE</option>
                    <option>EEE</option>
                    <option>Mechanical</option>
                    <option>Civil</option>
                  </select>
                </Field>

                <Field label="Audience">
                  <select
                    value={eventEditForm.audience_year}
                    onChange={event =>
                      setEventEditForm({
                        ...eventEditForm,
                        audience_year: event.target.value,
                      })
                    }
                  >
                    <option>All</option>
                    <option>1st Year</option>
                    <option>2nd Year</option>
                    <option>3rd Year</option>
                    <option>4th Year</option>
                    <option>2026</option>
                    <option>2027</option>
                    <option>2028</option>
                    <option>2029</option>
                  </select>
                </Field>
              </div>

              <section className="eventRegistrationSettings">
                <div className="formHeading">
                  <div>
                    <span>REGISTRATION</span>
                    <h3>Campus registration</h3>
                    <p>
                      Manage capacity and registration deadline.
                    </p>
                  </div>
                </div>

                <div className="formGrid">
                  <Field label="Capacity">
                    <input
                      type="number"
                      min="1"
                      value={eventEditForm.capacity}
                      onChange={event =>
                        setEventEditForm({
                          ...eventEditForm,
                          capacity: event.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Registration deadline">
                    <input
                      type="datetime-local"
                      value={
                        eventEditForm.registration_deadline
                      }
                      onChange={event =>
                        setEventEditForm({
                          ...eventEditForm,
                          registration_deadline:
                            event.target.value,
                        })
                      }
                    />
                  </Field>
                </div>

                <label className="campusRegistrationToggle">
                  <input
                    type="checkbox"
                    checked={
                      eventEditForm.allow_campus_registration
                    }
                    onChange={event =>
                      setEventEditForm({
                        ...eventEditForm,
                        allow_campus_registration:
                          event.target.checked,
                      })
                    }
                  />

                  <span>
                    <b>Allow CampusConnect registration</b>
                    <small>
                      Students can register directly inside CampusConnect.
                    </small>
                  </span>
                </label>
              </section>

              <Field label="Registration link">
                <input
                  type="url"
                  value={eventEditForm.registration_url}
                  onChange={event =>
                    setEventEditForm({
                      ...eventEditForm,
                      registration_url: event.target.value,
                    })
                  }
                  placeholder="https://..."
                />
              </Field>

              <Field label="Replace banner">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={event =>
                    setEditEventBanner(
                      event.target.files?.[0] || null
                    )
                  }
                />

                <small>
                  Leave empty to keep the current event banner.
                </small>
              </Field>

              {editingEvent.banner_url && !editEventBanner && (
                <div className="eventExistingBanner">
                  <img
                    src={editingEvent.banner_url}
                    alt="Current event banner"
                  />

                  <span>Current banner</span>
                </div>
              )}

              <div className="eventPublishOptions">
                <label>
                  <input
                    type="checkbox"
                    checked={eventEditForm.is_featured}
                    onChange={event =>
                      setEventEditForm({
                        ...eventEditForm,
                        is_featured: event.target.checked,
                      })
                    }
                  />

                  <span>
                    <b>Featured event</b>
                    <small>
                      Highlight this event prominently.
                    </small>
                  </span>
                </label>

                <label>
                  <span>
                    <b>Status</b>
                    <small>
                      Control whether the event is visible.
                    </small>
                  </span>

                  <select
                    value={eventEditForm.status}
                    onChange={event =>
                      setEventEditForm({
                        ...eventEditForm,
                        status:
                          event.target.value as
                            | "Draft"
                            | "Published"
                            | "Cancelled",
                      })
                    }
                  >
                    <option value="Published">
                      Published
                    </option>

                    <option value="Draft">
                      Draft
                    </option>

                    <option value="Cancelled">
                      Cancelled
                    </option>
                  </select>
                </label>
              </div>

              {eventEditError && (
                <div
                  className="eventEditInlineError"
                  role="alert"
                  aria-live="assertive"
                >
                  <strong>Unable to update event</strong>

                  <span>
                    {eventEditError}
                  </span>
                </div>
              )}

              <div className="formActions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    setEditingEvent(null)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary"
                  disabled={savingEdit}
                >
                  {savingEdit
                    ? "Updating..."
                    : "Update event"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {(activeTab === "All" || activeTab === "Events") &&
        showEventQuote && (
          <aside
            className="floatingEventQuote"
            aria-live="polite"
          >
            <button
              type="button"
              className="floatingEventQuoteClose"
              onClick={() => setShowEventQuote(false)}
              aria-label="Dismiss event quote"
            >
              ×
            </button>

            <div className="floatingEventQuoteIcon">
              ✦
            </div>

            <div className="floatingEventQuoteBody">
              <span>CAMPUS MOMENT</span>

              <strong>
                “{eventQuotes[quoteIndex]}”
              </strong>

              <div className="floatingEventQuoteFooter">
                <small>
                  Discover something worth showing up for.
                </small>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("Events");

                    window.setTimeout(() => {
                      const section = document.querySelector(
                        ".campusEventsSection"
                      );

                      if (section) {
                        section.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }
                    }, 80);
                  }}
                >
                  Explore events →
                </button>
              </div>
            </div>
          </aside>
        )}

      {scannerOpen && selectedEvent && (
        <div
          className="eventScannerScrim"
          onClick={() => setScannerOpen(false)}
        >
          <section
            className="eventScannerModal"
            role="dialog"
            aria-modal="true"
            aria-label="Scan attendee QR pass"
            onClick={event => event.stopPropagation()}
          >
            <header>
              <div>
                <span>LIVE EVENT CHECK-IN</span>
                <h2>Scan attendee pass</h2>
                <p>
                  Point the camera at the CampusConnect QR pass.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setScannerOpen(false)}
                aria-label="Close scanner"
              >
                ×
              </button>
            </header>

            <div
              id="campus-event-qr-reader"
              className="eventScannerViewport"
            />

            {scannerError && (
              <p className="eventScannerError">
                {scannerError}
              </p>
            )}

            <footer>
              <small>
                Camera access is used only while this scanner is open.
              </small>

              <button
                type="button"
                className="ghost"
                onClick={() => setScannerOpen(false)}
              >
                Cancel
              </button>
            </footer>
          </section>
        </div>
      )}

      {selectedEvent && (
        <div
          className="eventModalScrim"
          onClick={() => setSelectedEvent(null)}
        >
          <section
            className="eventDetailsModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-detail-title"
            onClick={event => event.stopPropagation()}
          >
            <button
              className="eventModalClose"
              onClick={() => setSelectedEvent(null)}
              aria-label="Close event details"
            >
              ×
            </button>

            <div className="eventModalBanner">
              {selectedEvent.banner_url ? (
                <img
                  src={selectedEvent.banner_url}
                  alt={`${selectedEvent.title} banner`}
                />
              ) : (
                <div className="eventBannerFallback large">
                  <span>{selectedEvent.category}</span>
                  <strong>{selectedEvent.title}</strong>
                </div>
              )}
            </div>

            <div className="eventModalContent">
              <div className="eventCategoryLine">
                <span>{selectedEvent.category}</span>

                {selectedEvent.is_featured && (
                  <small>Featured</small>
                )}
              </div>

              <h2 id="event-detail-title">
                {selectedEvent.title}
              </h2>

              <p className="eventLead">
                {selectedEvent.short_description}
              </p>

              <div className="eventDetailFacts">
                <div>
                  <small>DATE</small>
                  <strong>
                    {eventDateLabel(selectedEvent.event_date)}
                  </strong>
                </div>

                <div>
                  <small>TIME</small>
                  <strong>
                    {eventTimeLabel(selectedEvent.event_date)}
                  </strong>
                </div>

                <div>
                  <small>VENUE</small>
                  <strong>
                    {selectedEvent.venue || "To be announced"}
                  </strong>
                </div>

                <div>
                  <small>ORGANIZER</small>
                  <strong>
                    {selectedEvent.organizer ||
                      selectedEvent.created_by_name}
                  </strong>
                </div>

                <div>
                  <small>DEPARTMENT</small>
                  <strong>
                    {selectedEvent.audience_department}
                  </strong>
                </div>

                <div>
                  <small>AUDIENCE</small>
                  <strong>
                    {selectedEvent.audience_year}
                  </strong>
                </div>
              </div>

              {selectedEvent.allow_campus_registration !== false && (
                <section className="eventRegistrationPanel">
                  {(() => {
                    const going =
                      eventGoingRegistrations(
                        selectedEvent.id
                      ).length;

                    const capacity =
                      selectedEvent.capacity || 0;

                    const seatsRemaining =
                      capacity > 0
                        ? Math.max(0, capacity - going)
                        : null;

                    const registered =
                      Boolean(
                        currentRegistration(
                          selectedEvent.id
                        )
                      );

                    const closed =
                      registrationClosed(
                        selectedEvent
                      );

                    const progress =
                      capacity > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (going / capacity) * 100
                            )
                          )
                        : 0;

                    return (
                      <>
                        <div className="eventRegistrationHead">
                          <div>
                            <span>EVENT REGISTRATION</span>
                            <h3>
                              {registered
                                ? "You're going"
                                : "Join this event"}
                            </h3>

                            <p>
                              {selectedEvent.registration_deadline
                                ? `Registration closes ${formatDateTime(
                                    selectedEvent.registration_deadline
                                  )}`
                                : "Registration is open through CampusConnect."}
                            </p>
                          </div>

                          <strong>
                            {capacity > 0
                              ? `${going}/${capacity}`
                              : going}
                            <small>
                              {capacity > 0
                                ? " registered"
                                : " going"}
                            </small>
                          </strong>
                        </div>

                        {capacity > 0 && (
                          <>
                            <div className="eventCapacityBar">
                              <span
                                style={{
                                  width: `${progress}%`,
                                }}
                              />
                            </div>

                            <div className="eventCapacityMeta">
                              <span>
                                {seatsRemaining} seats remaining
                              </span>

                              <span>
                                {progress}% filled
                              </span>
                            </div>
                          </>
                        )}

                        {profile.role === "Student" && (
                          <>
                            <div className="eventRegistrationActions">
                            {registered ? (
                              <>
                                <button
                                  type="button"
                                  className="eventGoingButton"
                                  disabled
                                >
                                  ✓ Going
                                </button>

                                <button
                                  type="button"
                                  className="ghost"
                                  disabled={
                                    registrationBusyId ===
                                    selectedEvent.id
                                  }
                                  onClick={() =>
                                    void cancelEventRegistration(
                                      selectedEvent
                                    )
                                  }
                                >
                                  Cancel registration
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="primary eventRegisterButton"
                                disabled={
                                  closed ||
                                  registrationBusyId ===
                                    selectedEvent.id
                                }
                                onClick={() =>
                                  void registerForEvent(
                                    selectedEvent
                                  )
                                }
                              >
                                {registrationBusyId ===
                                selectedEvent.id
                                  ? "Registering..."
                                  : closed
                                  ? registrationClosedReason(
                                      selectedEvent
                                    )
                                  : "Register for event →"}
                              </button>
                            )}
                            </div>

                            {registered && (
                              <section className="eventPassSection">
                                <div className="eventPassHeading">
                                  <div>
                                    <span>YOUR EVENT PASS</span>
                                    <h3>Ready for check-in</h3>
                                    <p>
                                      Show this QR code to event staff at the venue.
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    className="ghost"
                                    onClick={() =>
                                      setShowEventPass(value => !value)
                                    }
                                  >
                                    {showEventPass
                                      ? "Hide pass"
                                      : "Show pass"}
                                  </button>
                                </div>

                                {showEventPass && (() => {
                                  const registration =
                                    currentRegistration(selectedEvent.id);

                                  if (!registration) return null;

                                  return (
                                    <div className="eventPassCard">
                                      <div className="eventPassQr">
                                        <QRCodeSVG
                                          value={registration.check_in_code}
                                          size={180}
                                          level="M"
                                          includeMargin
                                        />
                                      </div>

                                      <div className="eventPassIdentity">
                                        <span>REGISTERED ATTENDEE</span>

                                        <h3>
                                          {registration.student_name ||
                                            profile.name}
                                        </h3>

                                        <p>
                                          {registration.department ||
                                            profile.department}
                                          {" · "}
                                          {registration.graduation_year ||
                                            profile.year}
                                        </p>

                                        <div>
                                          <small>EVENT</small>
                                          <strong>
                                            {selectedEvent.title}
                                          </strong>
                                        </div>

                                        <div>
                                          <small>STATUS</small>
                                          <strong className="eventPassStatus">
                                            {registration.checked_in
                                              ? "✓ Checked in"
                                              : "Valid pass"}
                                          </strong>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </section>
                            )}
                          </>
                        )}

                        {canManageEvent(selectedEvent) && (
                          <div className="eventOrganizerRegistration">
                            <div>
                              <b>
                                {going} registered students
                              </b>

                              <small>
                                Organizer registration management
                              </small>
                            </div>

                            <div>
                              <button
                                type="button"
                                className="ghost"
                                onClick={() =>
                                  setShowAttendees(
                                    value => !value
                                  )
                                }
                              >
                                {showAttendees
                                  ? "Hide attendees"
                                  : "View attendees"}
                              </button>

                              <button
                                type="button"
                                className="ghost"
                                onClick={() =>
                                  exportEventAttendees(
                                    selectedEvent
                                  )
                                }
                              >
                                ↓ Export CSV
                              </button>
                            </div>
                          </div>
                        )}

                        {showAttendees &&
                          canManageEvent(selectedEvent) && (
                            <div className="eventAttendeeList">
                              {eventGoingRegistrations(
                                selectedEvent.id
                              ).map(registration => (
                                <div
                                  className="eventAttendeeRow"
                                  key={registration.id}
                                >
                                  <span className="eventAttendeeAvatar">
                                    {registration.student_name
                                      .split(/\s+/)
                                      .filter(Boolean)
                                      .slice(0, 2)
                                      .map(name =>
                                        name
                                          .charAt(0)
                                          .toUpperCase()
                                      )
                                      .join("") || "S"}
                                  </span>

                                  <p>
                                    <b>
                                      {registration.student_name ||
                                        "Student"}
                                    </b>

                                    <small>
                                      {registration.department ||
                                        "Department"}{" "}
                                      ·{" "}
                                      {registration.graduation_year ||
                                        "Year"}
                                    </small>
                                  </p>

                                  <span>
                                    {friendlyDate(
                                      registration.registered_at
                                    )}
                                  </span>
                                </div>
                              ))}

                              {!eventGoingRegistrations(
                                selectedEvent.id
                              ).length && (
                                <p className="eventNoAttendees">
                                  No students have registered yet.
                                </p>
                              )}
                            </div>
                          )}
                      </>
                    );
                  })()}
                </section>
              )}

              {selectedEvent.description && (
                <div className="eventFullDescription">
                  <h3>About this event</h3>

                  <p>
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              <div className="eventModalActions">

                <div className="eventStudentActions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      addEventToCalendar(selectedEvent)
                    }
                  >
                    + Add to calendar
                  </button>

                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      void shareEvent(selectedEvent)
                    }
                  >
                    ↗ Share
                  </button>
                </div>

                {canManageEvent(selectedEvent) && (
                  <div className="eventAdminActions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() =>
                        openEventEditor(selectedEvent)
                      }
                    >
                      Edit event
                    </button>

                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        void toggleEventFeatured(selectedEvent)
                      }
                    >
                      {selectedEvent.is_featured
                        ? "Remove featured"
                        : "Feature event"}
                    </button>

                    {selectedEvent.status !== "Cancelled" && (
                      <button
                        type="button"
                        className="ghost eventCancelButton"
                        onClick={() =>
                          void cancelEvent(selectedEvent)
                        }
                      >
                        Cancel event
                      </button>
                    )}

                    <button
                      type="button"
                      className="ghost eventDeleteButton"
                      onClick={() =>
                        void deleteEvent(selectedEvent)
                      }
                    >
                      Delete
                    </button>
                  </div>
                )}

                <button
                  className="ghost"
                  onClick={() => setSelectedEvent(null)}
                >
                  Close
                </button>

                {selectedEvent.registration_url && (
                  <button
                    className="primary"
                    onClick={() =>
                      openRegistration(
                        selectedEvent.registration_url
                      )
                    }
                  >
                    Register for event →
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

type Assignment = {id: string; title: string; subject: string; description: string; due_at: string; audience_department: string; created_by_name: string; kind: string; created_at: string};

const emptyAssignments: Assignment[]  = [];

function AssignmentsModule({
  profile,
}: {
  profile: ModuleProfile;
}) {
  const [items, setItems] =
    useState<Assignment[]>([]);

  const [submittedIds, setSubmittedIds] =
    useState<string[]>([]);

  const [submissionLinks, setSubmissionLinks] =
    useState<Record<string, string>>({});

  const [showForm, setShowForm] =
    useState(false);

  const [editingAssignment, setEditingAssignment] =
    useState<Assignment | null>(null);

  const [currentUserId, setCurrentUserId] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [status, setStatus] =
    useState("");

  const defaultForm = {
    title: "",
    subject: "",
    description: "",
    due_at: "",
    audience_department:
      profile.department || "All",
    kind: "Academic",
  };

  const [form, setForm] =
    useState(defaultForm);

  const canCreate =
    canCreateAssignmentRole(
      profile.role
    );


  const loadAssignments =
    async () => {
      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      const {
        data: auth,
      } =
        await client.auth
          .getUser();

      if (auth.user) {
        setCurrentUserId(
          auth.user.id
        );
      }

      const {
        data,
        error,
      } =
        await client
          .from("assignments")
          .select("*")
          .order(
            "due_at",
            {
              ascending: true,
            }
          );

      if (error) {
        setStatus(
          `ERROR: ${error.message}`
        );
        return;
      }

      setItems(
        (data || []) as Assignment[]
      );


      if (
        profile.role === "Student" &&
        auth.user
      ) {
        const {
          data:
            submissionData,
        } =
          await client
            .from(
              "assignment_submissions"
            )
            .select(
              "assignment_id,submission_url"
            )
            .eq(
              "student_id",
              auth.user.id
            );

        const rows =
          (
            submissionData ||
            []
          ) as {
            assignment_id: string;
            submission_url: string;
          }[];

        setSubmittedIds(
          rows.map(
            row =>
              row.assignment_id
          )
        );

        setSubmissionLinks(
          Object.fromEntries(
            rows.map(
              row => [
                row.assignment_id,
                row.submission_url,
              ]
            )
          )
        );
      }
    };


  useEffect(() => {
    void loadAssignments();
  }, []);


  const resetAssignmentForm =
    () => {
      setForm({
        title: "",
        subject: "",
        description: "",
        due_at: "",
        audience_department:
          profile.department ||
          "All",
        kind: "Academic",
      });

      setEditingAssignment(
        null
      );
    };


  const openCreateAssignment =
    () => {
      resetAssignmentForm();

      setStatus("");

      setShowForm(true);
    };


  const openEditAssignment =
    (
      item: Assignment
    ) => {
      setEditingAssignment(
        item
      );

      const date =
        new Date(
          item.due_at
        );

      const localDate =
        Number.isNaN(
          date.getTime()
        )
          ? ""
          : new Date(
              date.getTime() -
              date.getTimezoneOffset() *
                60000
            )
              .toISOString()
              .slice(
                0,
                16
              );

      setForm({
        title:
          item.title || "",

        subject:
          item.subject || "",

        description:
          item.description ||
          "",

        due_at:
          localDate,

        audience_department:
          item.audience_department ||
          "All",

        kind:
          item.kind ||
          "Academic",
      });

      setStatus("");

      setShowForm(true);
    };


  const saveAssignment =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (!canCreate) {
        return;
      }

      if (
        !form.title.trim() ||
        !form.subject.trim() ||
        !form.due_at
      ) {
        return setStatus(
          "ERROR: Title, subject and deadline are required."
        );
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return setStatus(
          "ERROR: CampusConnect is not connected to Supabase."
        );
      }

      setSaving(true);
      setStatus("");

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
            "Your session has expired. Sign in again."
          );
        }

        const payload = {
          title:
            form.title.trim(),

          subject:
            form.subject.trim(),

          description:
            form.description.trim(),

          due_at:
            new Date(
              form.due_at
            ).toISOString(),

          audience_department:
            form.audience_department,

          kind:
            form.kind,
        };


        if (editingAssignment) {
          const {
            data,
            error,
          } =
            await client
              .from(
                "assignments"
              )
              .update(
                payload
              )
              .eq(
                "id",
                editingAssignment.id
              )
              .eq(
                "created_by",
                auth.user.id
              )
              .select()
              .single();

          if (error) {
            throw error;
          }

          const updated =
            data as Assignment;

          setItems(
            current =>
              current
                .map(
                  item =>
                    item.id ===
                    updated.id
                      ? updated
                      : item
                )
                .sort(
                  (a, b) =>
                    a.due_at
                      .localeCompare(
                        b.due_at
                      )
                )
          );

          setStatus(
            "Assignment updated successfully."
          );

        } else {
          const {
            data,
            error,
          } =
            await client
              .from(
                "assignments"
              )
              .insert({
                ...payload,

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

          const created =
            data as Assignment;

          setItems(
            current =>
              [
                ...current,
                created,
              ].sort(
                (a, b) =>
                  a.due_at
                    .localeCompare(
                      b.due_at
                    )
              )
          );

          setStatus(
            "Assignment created successfully."
          );
        }

        resetAssignmentForm();

        setShowForm(false);

      } catch (error) {
        setStatus(
          `ERROR: ${
            error instanceof Error
              ? error.message
              : "Unable to save assignment."
          }`
        );
      } finally {
        setSaving(false);
      }
    };


  const deleteAssignment =
    async (
      item: Assignment
    ) => {
      const confirmed =
        window.confirm(
          `Delete "${item.title}"?\n\nStudent submissions linked to this assignment may also be removed. This cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setSaving(true);
      setStatus("");

      try {
        const {
          data: auth,
        } =
          await client.auth
            .getUser();

        if (!auth.user) {
          throw new Error(
            "Your session has expired."
          );
        }

        const {
          error,
        } =
          await client
            .from(
              "assignments"
            )
            .delete()
            .eq(
              "id",
              item.id
            )
            .eq(
              "created_by",
              auth.user.id
            );

        if (error) {
          throw error;
        }

        setItems(
          current =>
            current.filter(
              assignment =>
                assignment.id !==
                item.id
            )
        );

        setStatus(
          "Assignment deleted successfully."
        );

      } catch (error) {
        setStatus(
          `ERROR: ${
            error instanceof Error
              ? error.message
              : "Unable to delete assignment."
          }`
        );
      } finally {
        setSaving(false);
      }
    };


  const submitAssignment =
    async (
      assignment:
        Assignment
    ) => {
      if (
        submittedIds.includes(
          assignment.id
        )
      ) {
        return;
      }

      const submissionUrl =
        window.prompt(
          "Paste your submission link (Google Drive, GitHub, OneDrive, etc.)"
        );

      if (
        !submissionUrl ||
        !/^https:\/\//i.test(
          submissionUrl
        )
      ) {
        return setStatus(
          "ERROR: A valid HTTPS submission link is required."
        );
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return setStatus(
          "ERROR: CampusConnect is not connected to Supabase."
        );
      }

      const {
        data: auth,
      } =
        await client.auth
          .getUser();

      if (!auth.user) {
        return setStatus(
          "ERROR: Sign in to submit work."
        );
      }

      const {
        error,
      } =
        await client
          .from(
            "assignment_submissions"
          )
          .upsert(
            {
              assignment_id:
                assignment.id,

              student_id:
                auth.user.id,

              student_name:
                profile.name,

              status:
                "Submitted",

              submission_url:
                submissionUrl,

              submitted_at:
                new Date()
                  .toISOString(),
            },
            {
              onConflict:
                "assignment_id,student_id",
            }
          );

      if (error) {
        return setStatus(
          `ERROR: ${error.message}`
        );
      }

      setSubmittedIds(
        current => [
          ...current.filter(
            id =>
              id !==
              assignment.id
          ),

          assignment.id,
        ]
      );

      setSubmissionLinks(
        current => ({
          ...current,

          [assignment.id]:
            submissionUrl,
        })
      );

      setStatus(
        `${assignment.title} submitted successfully.`
      );
    };


  const canManageAssignment =
    (
      item: Assignment
    ) =>
      canCreate &&
      Boolean(
        currentUserId
      ) &&
      (
        item as Assignment & {
          created_by?: string;
        }
      ).created_by ===
        currentUserId;


  return (
    <div className="moduleStack">

      <ModuleHero
        eyebrow="Work planner"
        title="Assignments & tasks"
        copy={
          profile.role ===
          "Student"
            ? "Track coursework, project work and submission deadlines from one place."
            : "Create, edit and manage coursework, projects and academic deadlines."
        }
        action={
          canCreate ? (
            <button
              type="button"
              className="primary"
              onClick={
                openCreateAssignment
              }
            >
              + Create assignment
            </button>
          ) : undefined
        }
      />


      {status && (
        <StatusLine
          text={status}
        />
      )}


      {showForm &&
        canCreate && (
        <form
          className="moduleForm card assignmentEditorForm"
          onSubmit={
            saveAssignment
          }
        >

          <FormHeading
            title={
              editingAssignment
                ? "Edit assignment"
                : "Create assignment"
            }
            text={
              editingAssignment
                ? "Update the assignment information and deadline."
                : "Publish coursework with a clear subject, audience and deadline."
            }
          />


          <div className="formGrid">

            <Field label="Title">
              <input
                value={
                  form.title
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        title:
                          event.target.value,
                      })
                    )
                }
                placeholder="Assignment title"
                required
              />
            </Field>


            <Field label="Subject">
              <input
                value={
                  form.subject
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        subject:
                          event.target.value,
                      })
                    )
                }
                placeholder="Subject"
                required
              />
            </Field>

          </div>


          <Field label="Instructions">

            <textarea
              value={
                form.description
              }
              onChange={
                event =>
                  setForm(
                    current => ({
                      ...current,
                      description:
                        event.target.value,
                    })
                  )
              }
              placeholder="Assignment instructions, requirements and submission details..."
            />

          </Field>


          <div className="formGrid formGridThree">

            <Field label="Deadline">

              <input
                type="datetime-local"
                value={
                  form.due_at
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        due_at:
                          event.target.value,
                      })
                    )
                }
                required
              />

            </Field>


            <Field label="Department">

              <select
                value={
                  form.audience_department
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        audience_department:
                          event.target.value,
                      })
                    )
                }
              >
                <option>All</option>
                <option>ECE</option>
                <option>CSE</option>
                <option>ISE</option>
                <option>EEE</option>
                <option>ME</option>
                <option>CE</option>
              </select>

            </Field>


            <Field label="Type">

              <select
                value={
                  form.kind
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        kind:
                          event.target.value,
                      })
                    )
                }
              >
                <option>
                  Academic
                </option>

                <option>
                  Project
                </option>

                <option>
                  Placement
                </option>
              </select>

            </Field>

          </div>


          <div className="assignmentFormActions">

            <button
              type="button"
              className="ghost"
              disabled={
                saving
              }
              onClick={() => {
                resetAssignmentForm();
                setShowForm(false);
              }}
            >
              Cancel
            </button>


            <button
              type="submit"
              className="primary"
              disabled={
                saving
              }
            >
              {saving
                ? "Saving..."
                : editingAssignment
                ? "Save changes"
                : "Publish assignment"}
            </button>

          </div>

        </form>
      )}


      <section className="assignmentGrid">

        {items.map(
          item => {
            const submitted =
              submittedIds.includes(
                item.id
              );

            const overdue =
              isOverdue(
                item.due_at
              );

            const manageable =
              canManageAssignment(
                item
              );


            return (
              <article
                className="assignmentCard card assignmentCrudCard"
                key={
                  item.id
                }
              >

                <div className="assignmentTop">

                  <span
                    className={`typeBadge ${item.kind.toLowerCase()}`}
                  >
                    {item.kind}
                  </span>


                  <div className="assignmentTopRight">

                    <time
                      className={
                        overdue
                          ? "overdue"
                          : ""
                      }
                    >
                      {overdue
                        ? "Closed"
                        : daysUntil(
                            item.due_at
                          )}
                    </time>


                    {manageable && (
                      <div className="assignmentManageActions">

                        <button
                          type="button"
                          className="assignmentEditButton"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            openEditAssignment(
                              item
                            )
                          }
                        >
                          Edit
                        </button>


                        <button
                          type="button"
                          className="assignmentDeleteButton"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            void deleteAssignment(
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


                <h3>
                  {item.title}
                </h3>


                <b>
                  {item.subject}
                </b>


                <p>
                  {item.description}
                </p>


                <div className="assignmentMetaLine">

                  <span>
                    Due{" "}
                    {formatDateTime(
                      item.due_at
                    )}
                  </span>

                  <span>
                    {item.audience_department}
                  </span>

                  {(
                    item as Assignment & {
                      created_by_name?: string;
                    }
                  ).created_by_name && (
                    <span>
                      By{" "}
                      {(
                        item as Assignment & {
                          created_by_name?: string;
                        }
                      ).created_by_name}
                    </span>
                  )}

                </div>


                <div className="assignmentFoot">

                  {profile.role ===
                  "Student" ? (
                    <>

                      <button
                        className={
                          submitted
                            ? "doneButton"
                            : "primary"
                        }
                        disabled={
                          submitted ||
                          overdue
                        }
                        onClick={() =>
                          void submitAssignment(
                            item
                          )
                        }
                      >
                        {submitted
                          ? "✓ Submitted"
                          : overdue
                          ? "Deadline passed"
                          : "Submit work"}
                      </button>


                      {submitted &&
                        submissionLinks[
                          item.id
                        ] && (
                        <a
                          className="ghost"
                          href={
                            submissionLinks[
                              item.id
                            ]
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open submission ↗
                        </a>
                      )}

                    </>
                  ) : (
                    <small>
                      Assignment management enabled
                    </small>
                  )}

                </div>

              </article>
            );
          }
        )}

      </section>


      {!items.length && (
        <EmptyState
          title="No assignments yet"
          text={
            canCreate
              ? "Create the first assignment for your students."
              : "Assignments published for you will appear here."
          }
        />
      )}

    </div>
  );
}



type AttendanceRecord = {
  id: string;
  student_id: string;
  student_name: string;
  subject: string;
  attended: number;
  total: number;
  updated_at: string;
};

type AttendanceBatch = {
  id: string;
  batch_name: string;
  section: string;
  department: string;
  academic_year: string;
  semester: string;
  total_students: number;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

type AttendanceBatchStudent = {
  id: string;
  batch_id: string;
  student_id: string;
  student_name: string;
  campus_uid: string;
  department: string;
  graduation_year: string;
  roll_number: string;
  added_at: string;
};

type AttendanceStudentLookup = {
  id: string;
  full_name: string;
  campus_uid: string;
  department: string;
  graduation_year: string;
  email: string;
};

type AttendanceStatus =
  | "Present"
  | "Absent"
  | "Late"
  | "Excused";

type AttendanceSession = {
  id: string;
  batch_id: string;
  subject: string;
  attendance_date: string;
  period_name: string;
  topic: string;
  faculty_id: string;
  faculty_name: string;
  status: "Draft" | "Completed";
  created_at: string;
  updated_at: string;
};

type AttendanceSessionEntry = {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  campus_uid: string;
  attendance_status: AttendanceStatus;
  note: string;
  marked_at: string;
};

const emptyAttendance:
  AttendanceRecord[] = [];

function AttendanceModule({
  profile,
}: {
  profile: ModuleProfile;
}) {
  const [records, setRecords] =
    useState<AttendanceRecord[]>(
      emptyAttendance
    );

  const [batches, setBatches] =
    useState<AttendanceBatch[]>([]);

  const [batchStudents, setBatchStudents] =
    useState<AttendanceBatchStudent[]>([]);

  const [selectedBatchId, setSelectedBatchId] =
    useState("");

  const [subject, setSubject] =
    useState("Digital Communication");

  const [status, setStatus] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [showCreateBatch, setShowCreateBatch] =
    useState(false);

  const [showAddStudent, setShowAddStudent] =
    useState(false);

  const [batchSearch, setBatchSearch] =
    useState("");

  const [studentSearch, setStudentSearch] =
    useState("");

  const [uidQuery, setUidQuery] =
    useState("");

  const [foundStudent, setFoundStudent] =
    useState<
      AttendanceStudentLookup | null
    >(null);

  const [lookupBusy, setLookupBusy] =
    useState(false);

  const [sessions, setSessions] =
    useState<AttendanceSession[]>([]);

  const [showAttendanceSession, setShowAttendanceSession] =
    useState(false);

  const [sessionSaving, setSessionSaving] =
    useState(false);

  const [editingSessionId, setEditingSessionId] =
    useState("");

  const [sessionMarks, setSessionMarks] =
    useState<Record<string, AttendanceStatus>>({});

  const [originalSessionMarks, setOriginalSessionMarks] =
    useState<Record<string, AttendanceStatus>>({});

  const [sessionForm, setSessionForm] =
    useState({
      subject: "Digital Communication",
      attendance_date: new Intl.DateTimeFormat(
        "en-CA"
      ).format(new Date()),
      period_name: "1",
      topic: "",
    });

  const [batchForm, setBatchForm] =
    useState({
      batch_name: "",
      section: "",
      department:
        profile.department || "ECE",
      academic_year: "",
      semester: "",
    });

  const staff =
    canRecordAttendanceRole(
      profile.role
    );

  const selectedBatch =
    batches.find(
      batch =>
        batch.id ===
        selectedBatchId
    );


  const loadAttendanceRecords =
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
        .from("attendance_records")
        .select("*")
        .order(
          "subject",
          {ascending: true}
        );

      if (error) {
        console.error(
          "Attendance records:",
          error
        );

        return;
      }

      setRecords(
        (data || []) as
          AttendanceRecord[]
      );
    };


  const loadBatches =
    async () => {
      if (!staff) {
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
        .from("attendance_batches")
        .select("*")
        .order(
          "updated_at",
          {ascending: false}
        );

      if (error) {
        console.error(
          "Attendance batches:",
          error
        );

        setStatus(
          error.message
        );

        return;
      }

      const rows =
        (data || []) as
          AttendanceBatch[];

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

          return rows[0]?.id ||
            "";
        }
      );
    };


  const loadBatchStudents =
    async (
      batchId: string
    ) => {
      if (
        !staff ||
        !batchId
      ) {
        setBatchStudents([]);
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
        .select("*")
        .eq(
          "batch_id",
          batchId
        )
        .order(
          "student_name",
          {ascending: true}
        );

      if (error) {
        console.error(
          "Attendance batch roster:",
          error
        );

        setStatus(
          error.message
        );

        return;
      }

      setBatchStudents(
        (data || []) as
          AttendanceBatchStudent[]
      );
    };


  useEffect(() => {
    let active = true;

    const load =
      async () => {
        setLoading(true);

        await loadAttendanceRecords();

        if (staff) {
          await loadBatches();
        }

        if (active) {
          setLoading(false);
        }
      };

    void load();

    return () => {
      active = false;
    };
  }, [staff]);


  useEffect(() => {
    if (!staff) {
      return;
    }

    void loadBatchStudents(
      selectedBatchId
    );
  }, [
    selectedBatchId,
    staff,
  ]);


  const loadAttendanceSessions =
    async (
      batchId: string
    ) => {
      if (
        !staff ||
        !batchId
      ) {
        setSessions([]);
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
          "attendance_sessions"
        )
        .select("*")
        .eq(
          "batch_id",
          batchId
        )
        .order(
          "attendance_date",
          {
            ascending: false,
          }
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(40);

      if (error) {
        console.error(
          "Attendance sessions:",
          error
        );

        return;
      }

      setSessions(
        (data || []) as
          AttendanceSession[]
      );
    };


  useEffect(() => {
    if (
      !staff ||
      !selectedBatchId
    ) {
      setSessions([]);
      return;
    }

    void loadAttendanceSessions(
      selectedBatchId
    );

  }, [
    selectedBatchId,
    staff,
  ]);


  const openNewAttendanceSession =
    () => {
      if (!selectedBatch) {
        return setStatus(
          "Select a batch first."
        );
      }

      if (!batchStudents.length) {
        return setStatus(
          "Add students to this batch before taking attendance."
        );
      }

      const initialMarks:
        Record<
          string,
          AttendanceStatus
        > = {};

      batchStudents.forEach(
        student => {
          initialMarks[
            student.student_id
          ] = "Present";
        }
      );

      setEditingSessionId("");

      setSessionMarks(
        initialMarks
      );

      setOriginalSessionMarks(
        initialMarks
      );

      setSessionForm({
        subject:
          subject.trim() ||
          "Digital Communication",

        attendance_date:
          new Intl.DateTimeFormat(
            "en-CA"
          ).format(
            new Date()
          ),

        period_name:
          "1",

        topic:
          "",
      });

      setStatus("");

      setShowAttendanceSession(
        true
      );
    };


  const openAttendanceSession =
    async (
      session:
        AttendanceSession
    ) => {
      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setBusy(true);
      setStatus("");

      try {
        const {
          data,
          error,
        } = await client
          .from(
            "attendance_session_entries"
          )
          .select("*")
          .eq(
            "session_id",
            session.id
          );

        if (error) {
          throw error;
        }

        const entries =
          (data || []) as
            AttendanceSessionEntry[];

        const marks:
          Record<
            string,
            AttendanceStatus
          > = {};

        batchStudents.forEach(
          student => {
            marks[
              student.student_id
            ] = "Present";
          }
        );

        entries.forEach(
          entry => {
            marks[
              entry.student_id
            ] =
              entry.attendance_status;
          }
        );

        setEditingSessionId(
          session.id
        );

        setSessionForm({
          subject:
            session.subject,

          attendance_date:
            session.attendance_date,

          period_name:
            session.period_name,

          topic:
            session.topic || "",
        });

        setSessionMarks({
          ...marks,
        });

        setOriginalSessionMarks({
          ...marks,
        });

        setShowAttendanceSession(
          true
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to open attendance session."
        );
      } finally {
        setBusy(false);
      }
    };


  const markEveryStudent =
    (
      nextStatus:
        AttendanceStatus
    ) => {
      const next:
        Record<
          string,
          AttendanceStatus
        > = {};

      batchStudents.forEach(
        student => {
          next[
            student.student_id
          ] = nextStatus;
        }
      );

      setSessionMarks(
        next
      );
    };


  const sessionStatusCount =
    (
      target:
        AttendanceStatus
    ) =>
      batchStudents.filter(
        student =>
          (
            sessionMarks[
              student.student_id
            ] ||
            "Present"
          ) === target
      ).length;


  const statusAttendedValue =
    (
      value:
        AttendanceStatus
    ) =>
      value === "Present" ||
      value === "Late"
        ? 1
        : 0;


  const statusTotalValue =
    (
      value:
        AttendanceStatus
    ) =>
      value === "Excused"
        ? 0
        : 1;


  const saveAttendanceSession =
    async () => {
      if (
        !selectedBatch ||
        !selectedBatchId
      ) {
        return setStatus(
          "Select a batch first."
        );
      }

      if (
        !sessionForm.subject.trim()
      ) {
        return setStatus(
          "Enter the subject."
        );
      }

      if (
        !sessionForm.attendance_date
      ) {
        return setStatus(
          "Select the attendance date."
        );
      }

      if (
        !sessionForm.period_name.trim()
      ) {
        return setStatus(
          "Enter a class or period."
        );
      }

      if (!batchStudents.length) {
        return setStatus(
          "This batch has no students."
        );
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return setStatus(
          "CampusConnect is not connected to Supabase."
        );
      }

      setSessionSaving(true);
      setStatus("");

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
            "Your session has expired. Sign in again."
          );
        }

        let session:
          AttendanceSession;

        if (editingSessionId) {
          const {
            data,
            error,
          } = await client
            .from(
              "attendance_sessions"
            )
            .update({
              topic:
                sessionForm.topic
                  .trim(),

              status:
                "Completed",

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              editingSessionId
            )
            .select()
            .single();

          if (error) {
            throw error;
          }

          session =
            data as
              AttendanceSession;

        } else {
          const {
            data,
            error,
          } = await client
            .from(
              "attendance_sessions"
            )
            .insert({
              batch_id:
                selectedBatchId,

              subject:
                sessionForm.subject
                  .trim(),

              attendance_date:
                sessionForm.attendance_date,

              period_name:
                sessionForm.period_name
                  .trim(),

              topic:
                sessionForm.topic
                  .trim(),

              faculty_id:
                auth.user.id,

              faculty_name:
                profile.name,

              status:
                "Completed",
            })
            .select()
            .single();

          if (error) {
            if (
              error.code ===
              "23505"
            ) {
              throw new Error(
                "Attendance already exists for this batch, subject, date and period."
              );
            }

            throw error;
          }

          session =
            data as
              AttendanceSession;
        }


        const entryRows =
          batchStudents.map(
            student => ({
              session_id:
                session.id,

              student_id:
                student.student_id,

              student_name:
                student.student_name,

              campus_uid:
                student.campus_uid,

              attendance_status:
                sessionMarks[
                  student.student_id
                ] ||
                "Present",

              marked_at:
                new Date()
                  .toISOString(),
            })
          );


        const {
          error:
            entriesError,
        } = await client
          .from(
            "attendance_session_entries"
          )
          .upsert(
            entryRows,
            {
              onConflict:
                "session_id,student_id",
            }
          );

        if (entriesError) {
          throw entriesError;
        }


        const normalizedSubject =
          session.subject.trim();


        const aggregateRows =
          batchStudents.map(
            student => {
              const existing =
                records.find(
                  record =>
                    record.student_id ===
                      student.student_id &&
                    record.subject
                      .toLowerCase() ===
                      normalizedSubject
                        .toLowerCase()
                );

              const newMark =
                sessionMarks[
                  student.student_id
                ] ||
                "Present";

              const oldMark =
                originalSessionMarks[
                  student.student_id
                ] ||
                "Present";

              const attendedDelta =
                editingSessionId
                  ? statusAttendedValue(
                      newMark
                    ) -
                    statusAttendedValue(
                      oldMark
                    )
                  : statusAttendedValue(
                      newMark
                    );

              const totalDelta =
                editingSessionId
                  ? statusTotalValue(
                      newMark
                    ) -
                    statusTotalValue(
                      oldMark
                    )
                  : statusTotalValue(
                      newMark
                    );

              return {
                student_id:
                  student.student_id,

                student_name:
                  student.student_name,

                subject:
                  normalizedSubject,

                attended:
                  Math.max(
                    0,
                    (
                      existing?.attended ||
                      0
                    ) +
                    attendedDelta
                  ),

                total:
                  Math.max(
                    0,
                    (
                      existing?.total ||
                      0
                    ) +
                    totalDelta
                  ),

                updated_at:
                  new Date()
                    .toISOString(),

                updated_by:
                  auth.user.id,
              };
            }
          );


        const {
          data:
            aggregateData,
          error:
            aggregateError,
        } = await client
          .from(
            "attendance_records"
          )
          .upsert(
            aggregateRows,
            {
              onConflict:
                "student_id,subject",
            }
          )
          .select();


        if (aggregateError) {
          throw aggregateError;
        }


        const updatedRecords =
          (
            aggregateData ||
            []
          ) as AttendanceRecord[];


        setRecords(
          current => {
            const affected =
              new Set(
                updatedRecords.map(
                  row =>
                    `${row.student_id}::${row.subject.toLowerCase()}`
                )
              );

            return [
              ...current.filter(
                row =>
                  !affected.has(
                    `${row.student_id}::${row.subject.toLowerCase()}`
                  )
              ),

              ...updatedRecords,
            ];
          }
        );


        setSessions(
          current => [
            session,

            ...current.filter(
              item =>
                item.id !==
                session.id
            ),
          ].sort(
            (a, b) => {
              const dateCompare =
                b.attendance_date
                  .localeCompare(
                    a.attendance_date
                  );

              if (dateCompare) {
                return dateCompare;
              }

              return b.created_at
                .localeCompare(
                  a.created_at
                );
            }
          )
        );


        setSubject(
          normalizedSubject
        );

        setShowAttendanceSession(
          false
        );

        setEditingSessionId("");

        setOriginalSessionMarks(
          {}
        );

        setSessionMarks(
          {}
        );

        setStatus(
          editingSessionId
            ? "Attendance updated successfully."
            : `Attendance saved for ${selectedBatch.batch_name} · Section ${selectedBatch.section}.`
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to save attendance."
        );
      } finally {
        setSessionSaving(false);
      }
    };


  const createBatch =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (!staff) {
        return;
      }

      if (
        !batchForm.batch_name.trim()
      ) {
        return setStatus(
          "Enter a batch name."
        );
      }

      if (
        !batchForm.section.trim()
      ) {
        return setStatus(
          "Enter the section."
        );
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return setStatus(
          "CampusConnect is not connected to Supabase."
        );
      }

      setBusy(true);
      setStatus("");

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
            "Your session has expired. Sign in again."
          );
        }

        const {
          data,
          error,
        } = await client
          .from(
            "attendance_batches"
          )
          .insert({
            batch_name:
              batchForm.batch_name
                .trim(),

            section:
              batchForm.section
                .trim()
                .toUpperCase(),

            department:
              batchForm.department
                .trim() ||
              profile.department ||
              "All",

            academic_year:
              batchForm.academic_year
                .trim(),

            semester:
              batchForm.semester
                .trim(),

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

        const created =
          data as AttendanceBatch;

        setBatches(
          current => [
            created,
            ...current,
          ]
        );

        setSelectedBatchId(
          created.id
        );

        setBatchStudents([]);

        setBatchForm({
          batch_name: "",
          section: "",
          department:
            profile.department ||
            "ECE",
          academic_year: "",
          semester: "",
        });

        setShowCreateBatch(
          false
        );

        setStatus(
          `${created.batch_name} · Section ${created.section} created.`
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to create batch."
        );
      } finally {
        setBusy(false);
      }
    };


  const findStudentByUid =
    async () => {
      const query =
        uidQuery
          .trim()
          .toUpperCase();

      if (!query) {
        return setStatus(
          "Enter a CampusConnect UID."
        );
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setLookupBusy(true);
      setStatus("");
      setFoundStudent(null);

      try {
        const {
          data,
          error,
        } = await client.rpc(
          "find_attendance_student_by_uid",
          {
            target_uid:
              query,
          }
        );

        if (error) {
          throw error;
        }

        const row =
          Array.isArray(data)
            ? data[0]
            : null;

        if (!row) {
          setStatus(
            "No student found with that CampusConnect UID."
          );

          return;
        }

        setFoundStudent(
          row as
            AttendanceStudentLookup
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to find student."
        );
      } finally {
        setLookupBusy(false);
      }
    };


  const addStudentToBatch =
    async () => {
      if (
        !selectedBatchId ||
        !foundStudent
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setBusy(true);
      setStatus("");

      try {
        const {
          data: auth,
        } =
          await client.auth
            .getUser();

        if (!auth.user) {
          throw new Error(
            "Sign in again."
          );
        }

        const {
          data,
          error,
        } = await client
          .from(
            "attendance_batch_students"
          )
          .insert({
            batch_id:
              selectedBatchId,

            student_id:
              foundStudent.id,

            student_name:
              foundStudent.full_name,

            campus_uid:
              foundStudent.campus_uid,

            department:
              foundStudent.department ||
              "",

            graduation_year:
              foundStudent.graduation_year ||
              "",

            added_by:
              auth.user.id,
          })
          .select()
          .single();

        if (error) {
          if (
            error.code ===
            "23505"
          ) {
            throw new Error(
              "This student is already in this batch."
            );
          }

          throw error;
        }

        setBatchStudents(
          current => [
            ...current,
            data as
              AttendanceBatchStudent,
          ].sort(
            (a, b) =>
              a.student_name
                .localeCompare(
                  b.student_name
                )
          )
        );

        setBatches(
          current =>
            current.map(
              batch =>
                batch.id ===
                selectedBatchId
                  ? {
                      ...batch,
                      total_students:
                        batch.total_students +
                        1,
                    }
                  : batch
            )
        );

        setUidQuery("");
        setFoundStudent(null);

        setStatus(
          `${foundStudent.full_name} added to ${selectedBatch?.batch_name || "batch"}.`
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to add student."
        );
      } finally {
        setBusy(false);
      }
    };


  const removeStudentFromBatch =
    async (
      student:
        AttendanceBatchStudent
    ) => {
      if (!staff) {
        return;
      }

      const confirmed =
        window.confirm(
          `Remove ${student.student_name} from this batch?`
        );

      if (!confirmed) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setBusy(true);

      try {
        const {
          error,
        } = await client
          .from(
            "attendance_batch_students"
          )
          .delete()
          .eq(
            "id",
            student.id
          );

        if (error) {
          throw error;
        }

        setBatchStudents(
          current =>
            current.filter(
              item =>
                item.id !==
                student.id
            )
        );

        setBatches(
          current =>
            current.map(
              batch =>
                batch.id ===
                selectedBatchId
                  ? {
                      ...batch,
                      total_students:
                        Math.max(
                          0,
                          batch.total_students -
                            1
                        ),
                    }
                  : batch
            )
        );

        setStatus(
          `${student.student_name} removed from batch.`
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to remove student."
        );
      } finally {
        setBusy(false);
      }
    };


  const recordStudentAttendance =
    async (
      student:
        AttendanceBatchStudent,
      present: boolean
    ) => {
      if (!subject.trim()) {
        return setStatus(
          "Enter the subject first."
        );
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      const normalizedSubject =
        subject.trim();

      const existing =
        records.find(
          item =>
            item.student_id ===
              student.student_id &&
            item.subject
              .toLowerCase() ===
              normalizedSubject
                .toLowerCase()
        );

      const attended =
        (
          existing?.attended ||
          0
        ) +
        (
          present
            ? 1
            : 0
        );

      const total =
        (
          existing?.total ||
          0
        ) + 1;

      setBusy(true);

      try {
        const {
          data: auth,
        } =
          await client.auth
            .getUser();

        if (!auth.user) {
          throw new Error(
            "Sign in to record attendance."
          );
        }

        const payload = {
          student_id:
            student.student_id,

          student_name:
            student.student_name,

          subject:
            normalizedSubject,

          attended,

          total,

          updated_at:
            new Date()
              .toISOString(),

          updated_by:
            auth.user.id,

          ...(existing
            ? {
                id:
                  existing.id,
              }
            : {}),
        };

        const {
          data,
          error,
        } = await client
          .from(
            "attendance_records"
          )
          .upsert(
            payload,
            {
              onConflict:
                "student_id,subject",
            }
          )
          .select()
          .single();

        if (error) {
          throw error;
        }

        const updated =
          data as
            AttendanceRecord;

        setRecords(
          current => [
            ...current.filter(
              item =>
                !(
                  item.student_id ===
                    student.student_id &&
                  item.subject
                    .toLowerCase() ===
                    normalizedSubject
                      .toLowerCase()
                )
            ),
            updated,
          ]
        );

        setStatus(
          `${present ? "Present" : "Absent"} recorded for ${student.student_name}.`
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to record attendance."
        );
      } finally {
        setBusy(false);
      }
    };


  const deleteBatch =
    async (
      batch:
        AttendanceBatch
    ) => {
      const confirmed =
        window.confirm(
          `Delete ${batch.batch_name} · Section ${batch.section}? The batch roster will also be removed. Attendance history will remain available.`
        );

      if (!confirmed) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setBusy(true);

      try {
        const {
          error,
        } = await client
          .from(
            "attendance_batches"
          )
          .delete()
          .eq(
            "id",
            batch.id
          );

        if (error) {
          throw error;
        }

        const remaining =
          batches.filter(
            item =>
              item.id !==
              batch.id
          );

        setBatches(
          remaining
        );

        setSelectedBatchId(
          remaining[0]?.id ||
          ""
        );

        setBatchStudents([]);

        setStatus(
          "Batch deleted."
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to delete batch."
        );
      } finally {
        setBusy(false);
      }
    };


  const normalizedBatchSearch =
    batchSearch
      .trim()
      .toLowerCase();

  const visibleBatches =
    batches.filter(
      batch => {
        if (
          !normalizedBatchSearch
        ) {
          return true;
        }

        return [
          batch.batch_name,
          batch.section,
          batch.department,
          batch.academic_year,
          batch.semester,
        ]
          .join(" ")
          .toLowerCase()
          .includes(
            normalizedBatchSearch
          );
      }
    );


  const normalizedStudentSearch =
    studentSearch
      .trim()
      .toLowerCase();

  const visibleBatchStudents =
    batchStudents.filter(
      student => {
        if (
          !normalizedStudentSearch
        ) {
          return true;
        }

        return [
          student.student_name,
          student.campus_uid,
          student.department,
          student.graduation_year,
          student.roll_number,
        ]
          .join(" ")
          .toLowerCase()
          .includes(
            normalizedStudentSearch
          );
      }
    );


  const studentRecordFor =
    (
      studentId: string
    ) =>
      records.find(
        record =>
          record.student_id ===
            studentId &&
          record.subject
            .toLowerCase() ===
            subject
              .trim()
              .toLowerCase()
      );


  const studentRecords =
    staff
      ? records
      : records;


  const attendanceChartData =
    studentRecords.map(
      item => ({
        subject:
          item.subject,

        attendance:
          item.total
            ? Math.round(
                (
                  item.attended /
                  item.total
                ) *
                100
              )
            : 0,
      })
    );


  const average =
    attendanceChartData.length
      ? Math.round(
          attendanceChartData
            .reduce(
              (
                sum,
                item
              ) =>
                sum +
                item.attendance,
              0
            ) /
          attendanceChartData.length
        )
      : 0;


  const safeSubjects =
    attendanceChartData.filter(
      item =>
        item.attendance >=
        75
    ).length;


  const shortageSubjects =
    attendanceChartData.filter(
      item =>
        item.attendance <
        75
    ).length;


  if (!staff) {
    return (
      <div className="moduleStack">

        <ModuleHero
          eyebrow="Academic health"
          title="Attendance center"
          copy="Know your exact standing and how many classes you need to stay safe."
        />


        <section className="attendanceSummaryGrid">

          <article className="card attendanceSummaryCard">

            <span>
              Average Attendance
            </span>

            <strong>
              {average}%
            </strong>

            <small>
              Across recorded subjects
            </small>

          </article>


          <article className="card attendanceSummaryCard">

            <span>
              Safe Subjects
            </span>

            <strong>
              {safeSubjects}
            </strong>

            <small>
              Attendance ≥ 75%
            </small>

          </article>


          <article className="card attendanceSummaryCard">

            <span>
              Shortage Risk
            </span>

            <strong>
              {shortageSubjects}
            </strong>

            <small>
              Subjects below 75%
            </small>

          </article>

        </section>


        <section className="attendanceSubjectGrid">

          {records.map(
            item => {
              const percent =
                item.total
                  ? Math.round(
                      (
                        item.attended /
                        item.total
                      ) *
                      100
                    )
                  : 0;

              return (
                <article
                  className="attendanceSubjectCard card"
                  key={item.id}
                >

                  <div>
                    <span>
                      {percent >= 75
                        ? "ON TRACK"
                        : "ATTENTION"}
                    </span>

                    <h3>
                      {item.subject}
                    </h3>
                  </div>

                  <strong>
                    {percent}%
                  </strong>

                  <p>
                    {item.attended} present
                    out of {item.total}
                    {" "}classes
                  </p>

                  <i>
                    <span
                      style={{
                        width:
                          `${Math.min(
                            100,
                            percent
                          )}%`,
                      }}
                    />
                  </i>

                </article>
              );
            }
          )}

        </section>


        {!records.length &&
          !loading && (
          <EmptyState
            title="No attendance records yet"
            text="Your faculty will update attendance after classes."
          />
        )}

      </div>
    );
  }


  return (
    <div className="moduleStack attendanceBatchWorkspace">

      <ModuleHero
        eyebrow="Faculty attendance workspace"
        title="Batch attendance center"
        copy="Organize students by batch and section, build verified UID rosters and record attendance without searching students individually."
        action={
          <div className="attendanceHeroActions">

            <button
              type="button"
              className="attendanceSecondaryAction"
              onClick={() => {
                setShowCreateBatch(
                  true
                );

                setStatus("");
              }}
            >
              + Create batch
            </button>

            <button
              type="button"
              className="primary"
              disabled={
                !selectedBatch ||
                !batchStudents.length
              }
              onClick={
                openNewAttendanceSession
              }
            >
              Take attendance
            </button>

          </div>
        }
      />


      <section className="attendanceBatchMetrics">

        <article className="card">
          <span>
            BATCHES
          </span>

          <strong>
            {batches.length}
          </strong>

          <small>
            Faculty-accessible batches
          </small>
        </article>


        <article className="card">
          <span>
            SELECTED BATCH
          </span>

          <strong>
            {selectedBatch
              ? selectedBatch.total_students
              : 0}
          </strong>

          <small>
            Total students
          </small>
        </article>


        <article className="card">
          <span>
            SUBJECT
          </span>

          <strong className="textMetric">
            {subject ||
              "Not selected"}
          </strong>

          <small>
            Current attendance subject
          </small>
        </article>


        <article className="card">
          <span>
            DEPARTMENT
          </span>

          <strong className="textMetric">
            {selectedBatch
              ?.department ||
              profile.department ||
              "—"}
          </strong>

          <small>
            Active academic group
          </small>
        </article>

      </section>


      {status && (
        <StatusLine
          text={status}
        />
      )}


      <section className="attendanceBatchLayout">

        <aside className="attendanceBatchSidebar card">

          <header>

            <div>
              <span>
                CLASS DIRECTORY
              </span>

              <h3>
                Batches
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowCreateBatch(
                  true
                )
              }
              title="Create batch"
            >
              +
            </button>

          </header>


          <input
            className="attendanceBatchSearch"
            value={batchSearch}
            onChange={
              event =>
                setBatchSearch(
                  event.target.value
                )
            }
            placeholder="Search batch or section..."
          />


          <div className="attendanceBatchList">

            {visibleBatches.map(
              batch => (
                <button
                  key={batch.id}
                  type="button"
                  className={
                    batch.id ===
                    selectedBatchId
                      ? "attendanceBatchItem active"
                      : "attendanceBatchItem"
                  }
                  onClick={() =>
                    setSelectedBatchId(
                      batch.id
                    )
                  }
                >

                  <div className="attendanceBatchInitial">
                    {batch.batch_name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <b>
                      {batch.batch_name}
                    </b>

                    <span>
                      {batch.department}
                      {" · "}
                      Section {batch.section}
                    </span>

                    <small>
                      {batch.total_students}
                      {" "}
                      student
                      {batch.total_students ===
                      1
                        ? ""
                        : "s"}
                    </small>
                  </div>

                </button>
              )
            )}

          </div>


          {!visibleBatches.length &&
            !loading && (
            <div className="attendanceBatchEmpty">
              <span>◇</span>
              <b>
                No batches yet
              </b>
              <small>
                Create your first batch to start.
              </small>
            </div>
          )}

        </aside>


        <main className="attendanceBatchMain">

          {selectedBatch ? (
            <>

              <section className="attendanceBatchHeader card">

                <div className="attendanceBatchHeaderTop">

                  <div>

                    <span>
                      ACTIVE BATCH
                    </span>

                    <h2>
                      {selectedBatch.batch_name}
                    </h2>

                    <p>
                      {selectedBatch.department}
                      {" · "}
                      Section {selectedBatch.section}

                      {selectedBatch.academic_year
                        ? ` · ${selectedBatch.academic_year}`
                        : ""}

                      {selectedBatch.semester
                        ? ` · Semester ${selectedBatch.semester}`
                        : ""}
                    </p>

                  </div>


                  <div className="attendanceBatchHeaderCount">

                    <strong>
                      {selectedBatch.total_students}
                    </strong>

                    <span>
                      students
                    </span>

                  </div>

                </div>


                <div className="attendanceBatchToolbar">

                  <label>
                    <span>
                      SUBJECT
                    </span>

                    <input
                      value={subject}
                      onChange={
                        event =>
                          setSubject(
                            event.target.value
                          )
                      }
                      placeholder="Enter subject"
                    />
                  </label>


                  <label className="attendanceRosterSearch">

                    <span>
                      SEARCH ROSTER
                    </span>

                    <input
                      value={studentSearch}
                      onChange={
                        event =>
                          setStudentSearch(
                            event.target.value
                          )
                      }
                      placeholder="Name or Campus UID"
                    />

                  </label>


                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      setFoundStudent(
                        null
                      );

                      setUidQuery("");

                      setShowAddStudent(
                        true
                      );

                      setStatus("");
                    }}
                  >
                    + Add student
                  </button>


                  <button
                    type="button"
                    className="attendanceBatchDeleteButton"
                    disabled={busy}
                    onClick={() =>
                      void deleteBatch(
                        selectedBatch
                      )
                    }
                  >
                    Delete batch
                  </button>

                </div>

              </section>


              <section className="attendanceRoster card">

                <header>

                  <div>
                    <span>
                      VERIFIED ROSTER
                    </span>

                    <h3>
                      Students
                    </h3>

                    <p>
                      Students are linked using their CampusConnect UID.
                    </p>
                  </div>

                  <div className="attendanceRosterCount">
                    {visibleBatchStudents.length}
                    {" / "}
                    {selectedBatch.total_students}
                  </div>

                </header>


                <div className="attendanceRosterTable">

                  <div className="attendanceRosterTableHead">

                    <span>
                      STUDENT
                    </span>

                    <span>
                      CAMPUS UID
                    </span>

                    <span>
                      ATTENDANCE
                    </span>

                    <span>
                      TODAY
                    </span>

                    <span>
                      ACTION
                    </span>

                  </div>


                  {visibleBatchStudents.map(
                    student => {
                      const record =
                        studentRecordFor(
                          student.student_id
                        );

                      const percent =
                        record?.total
                          ? Math.round(
                              (
                                record.attended /
                                record.total
                              ) *
                              100
                            )
                          : 0;

                      return (
                        <div
                          className="attendanceRosterRow"
                          key={student.id}
                        >

                          <div className="attendanceRosterStudent">

                            <i>
                              {student.student_name
                                .charAt(0)
                                .toUpperCase()}
                            </i>

                            <div>

                              <b>
                                {student.student_name}
                              </b>

                              <small>
                                {student.department ||
                                  selectedBatch.department}

                                {student.graduation_year
                                  ? ` · ${student.graduation_year}`
                                  : ""}
                              </small>

                            </div>

                          </div>


                          <code>
                            {student.campus_uid}
                          </code>


                          <div className="attendanceRosterPercentage">

                            <strong
                              className={
                                percent >= 75
                                  ? "safe"
                                  : record
                                  ? "risk"
                                  : ""
                              }
                            >
                              {record
                                ? `${percent}%`
                                : "—"}
                            </strong>

                            <small>
                              {record
                                ? `${record.attended}/${record.total}`
                                : "No classes"}
                            </small>

                          </div>


                          <div className="attendanceRosterMark">

                            <span className="attendanceSessionModeBadge">
                              Session mode
                            </span>

                          </div>


                          <button
                            type="button"
                            className="attendanceRosterRemove"
                            disabled={busy}
                            title="Remove student"
                            onClick={() =>
                              void removeStudentFromBatch(
                                student
                              )
                            }
                          >
                            Remove
                          </button>

                        </div>
                      );
                    }
                  )}

                </div>


                {!visibleBatchStudents.length && (
                  <div className="attendanceRosterEmpty">

                    <span>
                      ◇
                    </span>

                    <h3>
                      {batchStudents.length
                        ? "No matching students"
                        : "No students in this batch yet"}
                    </h3>

                    <p>
                      {batchStudents.length
                        ? "Try another name or CampusConnect UID."
                        : "Add students using their verified CampusConnect UID."}
                    </p>

                    {!batchStudents.length && (
                      <button
                        type="button"
                        className="primary"
                        onClick={() =>
                          setShowAddStudent(
                            true
                          )
                        }
                      >
                        Add first student
                      </button>
                    )}

                  </div>
                )}

              </section>

            </>
          ) : (

            <section className="attendanceNoBatch card">

              <span>
                ◇
              </span>

              <h2>
                Create your first batch
              </h2>

              <p>
                Organize students by batch and section before recording attendance.
              </p>

              <button
                type="button"
                className="primary"
                onClick={() =>
                  setShowCreateBatch(
                    true
                  )
                }
              >
                + Create batch
              </button>

            </section>

          )}

        </main>

      </section>


      {selectedBatch && (
        <section className="attendanceSessionHistory card">

          <header className="attendanceSessionHistoryHeader">

            <div>
              <span>
                CLASS HISTORY
              </span>

              <h3>
                Recent attendance
              </h3>

              <p>
                Every saved class is stored as one attendance session.
              </p>
            </div>


            <button
              type="button"
              className="primary"
              disabled={
                !batchStudents.length
              }
              onClick={
                openNewAttendanceSession
              }
            >
              + New attendance
            </button>

          </header>


          {sessions.length ? (
            <div className="attendanceSessionList">

              {sessions
                .slice(0, 12)
                .map(session => (
                <article
                  className="attendanceSessionCard"
                  key={session.id}
                >

                  <div className="attendanceSessionDate">
                    <strong>
                      {new Intl.DateTimeFormat(
                        "en-IN",
                        {
                          day:
                            "2-digit",
                        }
                      ).format(
                        new Date(
                          `${session.attendance_date}T00:00:00`
                        )
                      )}
                    </strong>

                    <span>
                      {new Intl.DateTimeFormat(
                        "en-IN",
                        {
                          month:
                            "short",
                        }
                      ).format(
                        new Date(
                          `${session.attendance_date}T00:00:00`
                        )
                      )}
                    </span>
                  </div>


                  <div className="attendanceSessionIdentity">

                    <span>
                      PERIOD {session.period_name}
                    </span>

                    <h4>
                      {session.subject}
                    </h4>

                    <p>
                      {session.topic ||
                        "No class topic added"}
                    </p>

                  </div>


                  <div className="attendanceSessionFaculty">

                    <span>
                      FACULTY
                    </span>

                    <b>
                      {session.faculty_name ||
                        "CampusConnect faculty"}
                    </b>

                  </div>


                  <span
                    className={
                      session.status ===
                      "Completed"
                        ? "attendanceSessionStatus completed"
                        : "attendanceSessionStatus"
                    }
                  >
                    {session.status}
                  </span>


                  <button
                    type="button"
                    className="attendanceSessionEdit"
                    disabled={busy}
                    onClick={() =>
                      void openAttendanceSession(
                        session
                      )
                    }
                  >
                    View / edit
                  </button>

                </article>
              ))}

            </div>
          ) : (
            <div className="attendanceSessionEmpty">

              <span>
                ◇
              </span>

              <h3>
                No attendance sessions yet
              </h3>

              <p>
                Start a class session to record the full batch together.
              </p>

              <button
                type="button"
                className="primary"
                disabled={
                  !batchStudents.length
                }
                onClick={
                  openNewAttendanceSession
                }
              >
                Take first attendance
              </button>

            </div>
          )}

        </section>
      )}


      {showAttendanceSession &&
        selectedBatch && (
        <div
          className="attendanceSessionScrim"
          onClick={() => {
            if (!sessionSaving) {
              setShowAttendanceSession(
                false
              );
            }
          }}
        >

          <section
            className="attendanceSessionModal"
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <header className="attendanceSessionModalHeader">

              <div>

                <span>
                  {editingSessionId
                    ? "EDIT CLASS ATTENDANCE"
                    : "NEW CLASS ATTENDANCE"}
                </span>

                <h2>
                  {selectedBatch.batch_name}
                  {" · "}
                  Section {selectedBatch.section}
                </h2>

                <p>
                  {selectedBatch.department}

                  {selectedBatch.semester
                    ? ` · Semester ${selectedBatch.semester}`
                    : ""}

                  {" · "}

                  {batchStudents.length}
                  {" "}
                  students
                </p>

              </div>


              <button
                type="button"
                aria-label="Close"
                disabled={sessionSaving}
                onClick={() =>
                  setShowAttendanceSession(
                    false
                  )
                }
              >
                ×
              </button>

            </header>


            <div className="attendanceSessionSetup">

              <label>
                <span>
                  SUBJECT
                </span>

                <input
                  value={
                    sessionForm.subject
                  }
                  disabled={
                    Boolean(
                      editingSessionId
                    )
                  }
                  onChange={
                    event =>
                      setSessionForm(
                        current => ({
                          ...current,
                          subject:
                            event.target.value,
                        })
                      )
                  }
                  placeholder="Subject"
                />
              </label>


              <label>
                <span>
                  DATE
                </span>

                <input
                  type="date"
                  value={
                    sessionForm.attendance_date
                  }
                  disabled={
                    Boolean(
                      editingSessionId
                    )
                  }
                  onChange={
                    event =>
                      setSessionForm(
                        current => ({
                          ...current,
                          attendance_date:
                            event.target.value,
                        })
                      )
                  }
                />
              </label>


              <label>
                <span>
                  PERIOD / CLASS
                </span>

                <input
                  value={
                    sessionForm.period_name
                  }
                  disabled={
                    Boolean(
                      editingSessionId
                    )
                  }
                  onChange={
                    event =>
                      setSessionForm(
                        current => ({
                          ...current,
                          period_name:
                            event.target.value,
                        })
                      )
                  }
                  placeholder="1"
                />
              </label>


              <label className="attendanceSessionTopic">
                <span>
                  TOPIC
                </span>

                <input
                  value={
                    sessionForm.topic
                  }
                  onChange={
                    event =>
                      setSessionForm(
                        current => ({
                          ...current,
                          topic:
                            event.target.value,
                        })
                      )
                  }
                  placeholder="Today's class topic"
                />
              </label>

            </div>


            <section className="attendanceSessionSummary">

              <article>
                <strong>
                  {batchStudents.length}
                </strong>

                <span>
                  Students
                </span>
              </article>


              <article className="present">
                <strong>
                  {sessionStatusCount(
                    "Present"
                  )}
                </strong>

                <span>
                  Present
                </span>
              </article>


              <article className="absent">
                <strong>
                  {sessionStatusCount(
                    "Absent"
                  )}
                </strong>

                <span>
                  Absent
                </span>
              </article>


              <article className="late">
                <strong>
                  {sessionStatusCount(
                    "Late"
                  )}
                </strong>

                <span>
                  Late
                </span>
              </article>


              <article className="excused">
                <strong>
                  {sessionStatusCount(
                    "Excused"
                  )}
                </strong>

                <span>
                  Excused
                </span>
              </article>

            </section>


            <div className="attendanceSessionQuickActions">

              <span>
                QUICK MARK
              </span>

              <button
                type="button"
                onClick={() =>
                  markEveryStudent(
                    "Present"
                  )
                }
              >
                ✓ Mark all present
              </button>

              <button
                type="button"
                onClick={() =>
                  markEveryStudent(
                    "Absent"
                  )
                }
              >
                Mark all absent
              </button>

            </div>


            <div className="attendanceSessionRoster">

              <div className="attendanceSessionRosterHead">

                <span>
                  STUDENT
                </span>

                <span>
                  CAMPUS UID
                </span>

                <span>
                  STATUS
                </span>

              </div>


              {batchStudents.map(
                (
                  student,
                  index
                ) => {
                  const mark =
                    sessionMarks[
                      student.student_id
                    ] ||
                    "Present";

                  return (
                    <div
                      className="attendanceSessionRosterRow"
                      key={
                        student.id
                      }
                    >

                      <div className="attendanceSessionStudent">

                        <span className="attendanceSessionNumber">
                          {index + 1}
                        </span>

                        <div className="attendanceSessionAvatar">
                          {student.student_name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>

                          <b>
                            {student.student_name}
                          </b>

                          <small>
                            {student.department ||
                              selectedBatch.department}

                            {student.graduation_year
                              ? ` · ${student.graduation_year}`
                              : ""}
                          </small>

                        </div>

                      </div>


                      <code>
                        {student.campus_uid}
                      </code>


                      <div className="attendanceSessionStatusButtons">

                        {(
                          [
                            "Present",
                            "Absent",
                            "Late",
                            "Excused",
                          ] as
                            AttendanceStatus[]
                        ).map(
                          option => (
                            <button
                              type="button"
                              key={
                                option
                              }
                              className={
                                mark ===
                                option
                                  ? `active ${option.toLowerCase()}`
                                  : ""
                              }
                              onClick={() =>
                                setSessionMarks(
                                  current => ({
                                    ...current,

                                    [student.student_id]:
                                      option,
                                  })
                                )
                              }
                            >
                              {option}
                            </button>
                          )
                        )}

                      </div>

                    </div>
                  );
                }
              )}

            </div>


            <footer className="attendanceSessionFooter">

              <div>

                <span>
                  {sessionStatusCount(
                    "Present"
                  ) +
                    sessionStatusCount(
                      "Late"
                    )}
                  {" "}
                  attending
                </span>

                <small>
                  Excused students are excluded from the attendance total.
                </small>

              </div>


              <div>

                <button
                  type="button"
                  className="ghost"
                  disabled={
                    sessionSaving
                  }
                  onClick={() =>
                    setShowAttendanceSession(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="primary"
                  disabled={
                    sessionSaving
                  }
                  onClick={() =>
                    void saveAttendanceSession()
                  }
                >
                  {sessionSaving
                    ? "Saving..."
                    : editingSessionId
                    ? "Save changes"
                    : "Save attendance"}
                </button>

              </div>

            </footer>

          </section>

        </div>
      )}


      {showCreateBatch && (
        <div
          className="attendanceModalScrim"
          onClick={() =>
            setShowCreateBatch(
              false
            )
          }
        >

          <section
            className="attendanceModal card"
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <header>

              <div>
                <span>
                  CLASS DIRECTORY
                </span>

                <h2>
                  Create batch
                </h2>

                <p>
                  Create a reusable student roster for attendance.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCreateBatch(
                    false
                  )
                }
              >
                ×
              </button>

            </header>


            <form
              onSubmit={
                createBatch
              }
            >

              <div className="formGrid">

                <Field label="Batch name">
                  <input
                    required
                    value={
                      batchForm.batch_name
                    }
                    onChange={
                      event =>
                        setBatchForm(
                          current => ({
                            ...current,
                            batch_name:
                              event.target.value,
                          })
                        )
                    }
                    placeholder="Example: ECE 2027"
                  />
                </Field>


                <Field label="Section">
                  <input
                    required
                    value={
                      batchForm.section
                    }
                    onChange={
                      event =>
                        setBatchForm(
                          current => ({
                            ...current,
                            section:
                              event.target.value,
                          })
                        )
                    }
                    placeholder="A"
                  />
                </Field>

              </div>


              <div className="formGrid">

                <Field label="Department">

                  <select
                    value={
                      batchForm.department
                    }
                    onChange={
                      event =>
                        setBatchForm(
                          current => ({
                            ...current,
                            department:
                              event.target.value,
                          })
                        )
                    }
                  >
                    <option>
                      ECE
                    </option>

                    <option>
                      CSE
                    </option>

                    <option>
                      ISE
                    </option>

                    <option>
                      EEE
                    </option>

                    <option>
                      ME
                    </option>

                    <option>
                      CIVIL
                    </option>

                    <option>
                      All
                    </option>
                  </select>

                </Field>


                <Field label="Academic year">
                  <input
                    value={
                      batchForm.academic_year
                    }
                    onChange={
                      event =>
                        setBatchForm(
                          current => ({
                            ...current,
                            academic_year:
                              event.target.value,
                          })
                        )
                    }
                    placeholder="2026-27"
                  />
                </Field>

              </div>


              <Field label="Semester">
                <select
                  value={
                    batchForm.semester
                  }
                  onChange={
                    event =>
                      setBatchForm(
                        current => ({
                          ...current,
                          semester:
                            event.target.value,
                        })
                      )
                  }
                >
                  <option value="">
                    Select semester
                  </option>

                  {[
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                  ].map(
                    semester => (
                      <option
                        value={semester}
                        key={semester}
                      >
                        Semester {semester}
                      </option>
                    )
                  )}

                </select>
              </Field>


              <div className="attendanceModalNote">

                <span>
                  TOTAL STUDENTS
                </span>

                <p>
                  Student count updates automatically when students are added or removed from this batch.
                </p>

              </div>


              <div className="attendanceModalActions">

                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    setShowCreateBatch(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary"
                  disabled={busy}
                >
                  {busy
                    ? "Creating..."
                    : "Create batch"}
                </button>

              </div>

            </form>

          </section>

        </div>
      )}


      {showAddStudent &&
        selectedBatch && (
        <div
          className="attendanceModalScrim"
          onClick={() =>
            setShowAddStudent(
              false
            )
          }
        >

          <section
            className="attendanceModal attendanceStudentModal card"
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <header>

              <div>
                <span>
                  VERIFIED STUDENT
                </span>

                <h2>
                  Add student
                </h2>

                <p>
                  {selectedBatch.batch_name}
                  {" · "}
                  Section {selectedBatch.section}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddStudent(
                    false
                  )
                }
              >
                ×
              </button>

            </header>


            <div className="attendanceUidSearch">

              <label>
                <span>
                  CAMPUSCONNECT UID
                </span>

                <div>

                  <input
                    value={uidQuery}
                    onChange={
                      event => {
                        setUidQuery(
                          event.target.value
                            .toUpperCase()
                        );

                        setFoundStudent(
                          null
                        );
                      }
                    }
                    placeholder="CC-XXXXXXXX"
                    onKeyDown={
                      event => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          event.preventDefault();

                          void findStudentByUid();
                        }
                      }
                    }
                  />

                  <button
                    type="button"
                    className="primary"
                    disabled={
                      lookupBusy ||
                      !uidQuery.trim()
                    }
                    onClick={() =>
                      void findStudentByUid()
                    }
                  >
                    {lookupBusy
                      ? "Searching..."
                      : "Find student"}
                  </button>

                </div>

              </label>

            </div>


            {foundStudent && (
              <article className="attendanceFoundStudent">

                <div className="attendanceFoundAvatar">
                  {foundStudent.full_name
                    .charAt(0)
                    .toUpperCase()}
                </div>


                <div className="attendanceFoundIdentity">

                  <span>
                    VERIFIED CAMPUS PROFILE
                  </span>

                  <h3>
                    {foundStudent.full_name}
                  </h3>

                  <p>
                    {foundStudent.campus_uid}
                  </p>

                  <div>

                    <small>
                      {foundStudent.department ||
                        "Department not set"}
                    </small>

                    <small>
                      {foundStudent.graduation_year ||
                        "Graduation year not set"}
                    </small>

                  </div>

                </div>


                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    void addStudentToBatch()
                  }
                >
                  {busy
                    ? "Adding..."
                    : "Add to batch"}
                </button>

              </article>
            )}


            {status && (
              <p className="attendanceModalStatus">
                {status}
              </p>
            )}

          </section>

        </div>
      )}

    </div>
  );
}




type Application = {id: string; student_id: string; student_name: string; company: string; role_title: string; status: string; applied_at: string; next_step: string};
const emptyApplications: Application[]  = [];

export async function savePlacementApplication(
  profile: ModuleProfile,
  placementId: string,
  company: string,
  roleTitle: string
) {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error(
      "CampusConnect is not connected to Supabase."
    );
  }

  if (!placementId) {
    throw new Error(
      "This placement drive does not have a valid ID."
    );
  }

  const {
    data: userData,
    error: authError,
  } = await client.auth.getUser();

  if (
    authError ||
    !userData.user
  ) {
    throw new Error(
      "Your session has expired. Sign in again."
    );
  }

  const {
    data,
    error,
  } = await client
    .from("placement_applications")
    .upsert(
      {
        student_id:
          userData.user.id,

        student_name:
          profile.name,

        placement_id:
          placementId,

        company,

        role_title:
          roleTitle,

        status:
          "Applied",

        next_step:
          "Awaiting review",
      },
      {
        onConflict:
          "student_id,placement_id",
      }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function ApplicationsModule({profile}: {profile: ModuleProfile}) {
  const [items, setItems] = useState<Application[]>(emptyApplications);
  const [form, setForm] = useState({company: "", role_title: ""});
  const [status, setStatus] = useState("");
  const [selectedApplicant, setSelectedApplicant] =
    useState<Application | null>(null);

  const placement = profile.role === "Placement Cell";

  useEffect(() => {
    let active = true;
    const client = getSupabaseClient();
    if (!client) return;
    client.from("placement_applications").select("*").order("applied_at", {ascending: false}).limit(100).then(({data, error}) => {
      if (active && !error) setItems((data || []) as Application[]);
    });
    return () => { active = false; };
  }, []);

  const addApplication = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.company.trim() || !form.role_title.trim()) return setStatus("Add the company and role title.");
    const client = getSupabaseClient();
    if (!client) return setStatus("CampusConnect is not connected to Supabase. Configure the production environment first.");
    const {data: userData} = await client.auth.getUser();
    if (!userData.user) return setStatus("Sign in to add an application.");
    const {data, error} = await client.from("placement_applications").upsert({student_id: userData.user.id, student_name: profile.name, company: form.company.trim(), role_title: form.role_title.trim(), status: "Applied", next_step: "Awaiting review"}, {onConflict: "student_id,company,role_title"}).select().single();
    if (error) return setStatus(error.message);
    setItems(current => [data as Application, ...current.filter(item => item.id !== data.id)]);
    setForm({company: "", role_title: ""});
    setStatus("Application added to your tracker.");
  };

  const updateStatus = async (item: Application, nextStatus: string) => {
    const client = getSupabaseClient();
    if (client) {
      const {error} = await client.from("placement_applications").update({status: nextStatus}).eq("id", item.id);
      if (error) return setStatus(error.message);
    }
    setItems(current => current.map(application => application.id === item.id ? {...application, status: nextStatus} : application));
    setStatus(`${item.student_name} moved to ${nextStatus}.`);
  };

  const stages = ["Applied", "Shortlisted", "Assessment", "Interview", "Offered", "Rejected"];
  return <div className="moduleStack"><ModuleHero eyebrow="Recruitment pipeline" title="Application tracker" copy={placement ? "Review applications and move students through every company stage." : "Keep every application, assessment and interview next step visible."}/>
    {!placement && <form className="applicationQuickAdd card" onSubmit={addApplication}><div><span>MANUAL ENTRY</span><h3>Add an external application</h3></div><input value={form.company} onChange={event => setForm({...form, company: event.target.value})} placeholder="Company"/><input value={form.role_title} onChange={event => setForm({...form, role_title: event.target.value})} placeholder="Role title"/><button className="primary">Add application</button></form>}
    {status && <StatusLine text={status}/>}

    {selectedApplicant && placement && (
      <PlacementApplicantProfile
        application={selectedApplicant}
        onClose={() =>
          setSelectedApplicant(null)
        }
      />
    )}

    <section className="applicationBoard">{stages.slice(0, 5).map(stage => <article className="applicationColumn card" key={stage}><header><span>{stage}</span><b>{items.filter(item => item.status === stage).length}</b></header>{items.filter(item => item.status === stage).map(item => <div
  className={`applicationTicket ${placement ? "placementApplicantTicket" : ""}`}
  key={item.id}
  onClick={() => {
    if (placement) {
      setSelectedApplicant(item);
    }
  }}
>
  <strong>{item.company}</strong>

  <span>{item.role_title}</span>

  {placement && (
    <small>
      {item.student_name} · View full student profile →
    </small>
  )}

  <p>{item.next_step}</p>

  {placement ? (
    <select
      value={item.status}
      onClick={event =>
        event.stopPropagation()
      }
      onChange={event => {
        event.stopPropagation();

        void updateStatus(
          item,
          event.target.value
        );
      }}
    >
      {stages.map(option => (
        <option key={option}>
          {option}
        </option>
      ))}
    </select>
  ) : (
    <time>
      Applied {friendlyDate(item.applied_at)}
    </time>
  )}
</div>)}</article>)}</section>
  </div>;
}

type LearningResourceType =
  | "Video"
  | "PYQ"
  | "PDF"
  | "Notes"
  | "Lab Manual"
  | "Important Questions"
  | "Assignment Material"
  | "External Link";

type LearningResource = {
  id: string;
  added_by?: string;
  resource_type: LearningResourceType;
  subject: string;
  title: string;
  url: string;
  description: string;
  academic_year: string;
  department: string;
  semester: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  contributor_name: string;
  contributor_role: string;
  is_verified: boolean;
  created_at: string;
};

type LearningAiDocument = {
  id: string;
  source_id: string;
  status:
    | "pending"
    | "processing"
    | "ready"
    | "failed";
  chunk_count: number;
  extraction_error: string;
};


type LearningIndexResponse = {
  ok?: boolean;
  documentId?: string;
  chunks?: number;
  error?: string;
};


const emptyResources: LearningResource[] = [];

type CampusBranch = {
  id: string;
  name: string;
  code: string;
  description: string;
  total_semesters: number;
  is_active: boolean;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

function LearningModule({profile}: {profile: ModuleProfile}) {
  const [selectedBranch, setSelectedBranch] =
    useState("");

  const [selectedSemester, setSelectedSemester] =
    useState("");

  const [selectedSubject, setSelectedSubject] =
    useState("");

  const [branches, setBranches] =
    useState<CampusBranch[]>([]);

  const [branchesLoading, setBranchesLoading] =
    useState(true);

  const [showBranchForm, setShowBranchForm] =
    useState(false);

  const [creatingBranch, setCreatingBranch] =
    useState(false);

  const [branchForm, setBranchForm] = useState({
    name: "",
    code: "",
    description: "",
    total_semesters: "8",
  });

  const canCreateBranch =
    profile.role === "Main Admin" ||
    profile.role === "Faculty";

  const canDeleteBranch =
    profile.role === "Main Admin";

  const selectedBranchData =
    branches.find(branch =>
      branch.name === selectedBranch
    );

  const semesters = Array.from(
    {
      length:
        selectedBranchData?.total_semesters || 8,
    },
    (_, index) => String(index + 1)
  );
  const [items, setItems] =
    useState<LearningResource[]>(emptyResources);

  const [tab, setTab] =
    useState<"All" | LearningResourceType>("All");

  const [showForm, setShowForm] =
    useState(false);

  const [resourceFile, setResourceFile] =
    useState<File | null>(null);

  const [uploading, setUploading] =
    useState(false);

  const [status, setStatus] =
    useState("");

  const [aiDocuments, setAiDocuments] =
    useState<Record<string, LearningAiDocument>>({});

  const [indexingResourceIds, setIndexingResourceIds] =
    useState<string[]>([]);

  const [form, setForm] = useState({
    resource_type: "Video" as LearningResourceType,
    subject: "",
    title: "",
    url: "",
    description: "",
    academic_year: "2026",
    department: profile.department || "All",
    semester: "All",
  });

  const needsFile = [
    "PDF",
    "Notes",
    "Lab Manual",
    "Important Questions",
    "Assignment Material",
  ].includes(form.resource_type);

  const needsUrl =
    form.resource_type === "Video" ||
    form.resource_type === "PYQ" ||
    form.resource_type === "External Link";

  const loadBranches = async () => {
    const client = getSupabaseClient();

    if (!client) {
      setBranchesLoading(false);
      return;
    }

    setBranchesLoading(true);

    const {data, error} = await client
      .from("campus_branches")
      .select("*")
      .eq("is_active", true)
      .order("name", {ascending: true});

    if (error) {
      setStatus(error.message);
      setBranchesLoading(false);
      return;
    }

    const loadedBranches =
      (data || []) as CampusBranch[];

    setBranches(loadedBranches);

    setBranchesLoading(false);
  };

  const createBranch = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!canCreateBranch) {
      return setStatus(
        "Only faculty and administrators can create branches."
      );
    }

    const name = branchForm.name.trim();
    const code = branchForm.code
      .trim()
      .toUpperCase();

    const totalSemesters =
      Number(branchForm.total_semesters);

    if (!name || !code) {
      return setStatus(
        "Branch name and short code are required."
      );
    }

    if (
      !Number.isInteger(totalSemesters) ||
      totalSemesters < 1 ||
      totalSemesters > 12
    ) {
      return setStatus(
        "Total semesters must be between 1 and 12."
      );
    }

    const client = getSupabaseClient();

    if (!client) {
      return setStatus(
        "CampusConnect is not connected to Supabase."
      );
    }

    setCreatingBranch(true);
    setStatus("");

    try {
      const {data: auth} =
        await client.auth.getUser();

      if (!auth.user) {
        throw new Error(
          "Sign in again before creating a branch."
        );
      }

      const {data, error} = await client
        .from("campus_branches")
        .insert({
          name,
          code,
          description:
            branchForm.description.trim(),
          total_semesters: totalSemesters,
          is_active: true,
          created_by: auth.user.id,
          created_by_name: profile.name,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const created = data as CampusBranch;

      setBranches(current =>
        [...current, created].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      setSelectedBranch(created.name);
      setSelectedSemester("1");

      setBranchForm({
        name: "",
        code: "",
        description: "",
        total_semesters: "8",
      });

      setShowBranchForm(false);

      setStatus(
        `${created.name} branch created successfully.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to create branch."
      );
    } finally {
      setCreatingBranch(false);
    }
  };

  const deleteBranch = async (
    branch: CampusBranch
  ) => {
    if (!canDeleteBranch) {
      return setStatus(
        "Only Main Admin can delete branches."
      );
    }

    const hasResources = items.some(
      item => item.department === branch.name
    );

    if (hasResources) {
      return setStatus(
        `Cannot delete ${branch.name} because learning resources are assigned to it.`
      );
    }

    if (
      !window.confirm(
        `Delete ${branch.name} branch?`
      )
    ) {
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      return setStatus(
        "CampusConnect is not connected to Supabase."
      );
    }

    const {error} = await client
      .from("campus_branches")
      .delete()
      .eq("id", branch.id);

    if (error) {
      return setStatus(error.message);
    }

    const remaining =
      branches.filter(
        item => item.id !== branch.id
      );

    setBranches(remaining);

    if (selectedBranch === branch.name) {
      setSelectedBranch(
        remaining[0]?.name || ""
      );
      setSelectedSemester("1");
    }

    setStatus(
      `${branch.name} branch deleted.`
    );
  };

  const loadResources = async () => {
    const client = getSupabaseClient();
    if (!client) return;

    const {data, error} = await client
      .from("learning_resources")
      .select("*")
      .order("is_verified", {ascending: false})
      .order("created_at", {ascending: false})
      .limit(150);

    if (!error) {
      setItems((data || []) as LearningResource[]);
    }
  };

  const loadAiDocuments = async () => {
    const client = getSupabaseClient();

    if (!client) return;

    const {data: auth} =
      await client.auth.getUser();

    if (!auth.user) return;

    const {data, error} =
      await client
        .from("ai_documents")
        .select(
          "id,source_id,status,chunk_count,extraction_error"
        )
        .eq(
          "source_type",
          "learning_resource"
        )
        .eq(
          "owner_id",
          auth.user.id
        );

    if (error) {
      console.warn(
        "Learning AI index status:",
        error.message
      );
      return;
    }

    const next:
      Record<string, LearningAiDocument> = {};

    for (const row of data || []) {
      const document =
        row as LearningAiDocument;

      next[document.source_id] =
        document;
    }

    setAiDocuments(next);
  };


  useEffect(() => {
    void loadBranches();
    void loadResources();
    void loadAiDocuments();
  }, []);

  const addResource = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.subject.trim() || !form.title.trim()) {
      return setStatus(
        "Subject and resource title are required."
      );
    }

    if (
      form.resource_type === "Video" &&
      !isYouTubeUrl(form.url)
    ) {
      return setStatus(
        "Video resources require a valid YouTube URL."
      );
    }

    if (
      needsUrl &&
      form.resource_type !== "Video" &&
      !isWebUrl(form.url)
    ) {
      return setStatus(
        "Add a valid HTTPS resource link."
      );
    }

    if (needsFile && !resourceFile) {
      return setStatus(
        "Choose a PDF or resource file."
      );
    }

    if (
      resourceFile &&
      resourceFile.size > 10 * 1024 * 1024
    ) {
      return setStatus(
        "Resource files must be smaller than 10 MB."
      );
    }

    const client = getSupabaseClient();

    if (!client) {
      return setStatus(
        "CampusConnect is not connected to Supabase."
      );
    }

    setUploading(true);
    setStatus("");

    let uploadedPath: string | null = null;

    try {
      const {data: auth} =
        await client.auth.getUser();

      if (!auth.user) {
        throw new Error(
          "Sign in to add a learning resource."
        );
      }

      let fileName: string | null = null;
      let fileSize: number | null = null;

      if (resourceFile) {
        const safeName =
          resourceFile.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "-"
          );

        uploadedPath =
          `${auth.user.id}/${Date.now()}-${safeName}`;

        const {error: uploadError} =
          await client.storage
            .from("learning-resources")
            .upload(
              uploadedPath,
              resourceFile,
              {
                upsert: false,
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        fileName = resourceFile.name;
        fileSize = resourceFile.size;
      }

      const payload = {
        resource_type: form.resource_type,
        subject: form.subject.trim(),
        title: form.title.trim(),
        url: needsUrl
          ? form.url.trim()
          : "",
        description:
          form.description.trim(),
        academic_year:
          form.academic_year.trim(),
        department:
          form.department || "All",
        semester:
          form.semester || "All",
        file_path:
          uploadedPath,
        file_name:
          fileName,
        file_size:
          fileSize,
        added_by:
          auth.user.id,
        contributor_name:
          profile.name,
        contributor_role:
          profile.role,
        is_verified:
          canVerifyLearningRole(profile.role),
      };

      const {data, error} = await client
        .from("learning_resources")
        .insert(payload)
        .select()
        .single();

      if (error) {
        if (uploadedPath) {
          await client.storage
            .from("learning-resources")
            .remove([uploadedPath]);
        }

        throw error;
      }

      setItems(current => [
        data as LearningResource,
        ...current,
      ]);

      setTab(form.resource_type);

      setForm(current => ({
        ...current,
        subject: "",
        title: "",
        url: "",
        description: "",
      }));

      setResourceFile(null);

      setStatus(
        canVerifyLearningRole(profile.role)
          ? "Verified resource published successfully."
          : "Resource uploaded and sent for verification."
      );

      setShowForm(false);

    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to add learning resource."
      );
    } finally {
      setUploading(false);
    }
  };

  const indexResource = async (
    item: LearningResource
  ) => {
    if (
      indexingResourceIds.includes(
        item.id
      )
    ) {
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      return setStatus(
        "CampusConnect is not connected to Supabase."
      );
    }

    const {data: sessionData} =
      await client.auth.getSession();

    const accessToken =
      sessionData.session
        ?.access_token;

    if (!accessToken) {
      return setStatus(
        "Your session expired. Sign in again."
      );
    }

    setIndexingResourceIds(
      current => [
        ...current,
        item.id,
      ]
    );

    setStatus(
      `Preparing “${item.title}” for Campus AI...`
    );

    try {
      const response =
        await fetch(
          "/api/ai/documents/index",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              sourceType:
                "learning_resource",
              sourceId: item.id,
            }),
          }
        );

      const result =
        await response.json() as
          LearningIndexResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ||
          "This resource could not be prepared for AI."
        );
      }

      setAiDocuments(current => ({
        ...current,
        [item.id]: {
          id:
            result.documentId || "",
          source_id: item.id,
          status: "ready",
          chunk_count:
            result.chunks || 0,
          extraction_error: "",
        },
      }));

      setStatus(
        `“${item.title}” is ready for Campus AI with ${result.chunks || 0} searchable section${result.chunks === 1 ? "" : "s"}.`
      );

    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "This resource could not be prepared for AI.";

      setAiDocuments(current => ({
        ...current,
        [item.id]: {
          id:
            current[item.id]?.id || "",
          source_id: item.id,
          status: "failed",
          chunk_count: 0,
          extraction_error: message,
        },
      }));

      setStatus(message);

    } finally {
      setIndexingResourceIds(
        current =>
          current.filter(
            id => id !== item.id
          )
      );
    }
  };


  const askResourceWithAi = (
    item: LearningResource
  ) => {
    window.sessionStorage.setItem(
      "campusconnect-ai-intent",
      JSON.stringify({
        mode: "notes_ai",
        sourceId: item.id,
        sourceTitle: item.title,
        prompt:
          `Summarize the full module in “${item.title}” using every indexed section from this resource. Cover the sections in order, explain the key concepts clearly, and state the indexed coverage accurately.`,
        createdAt: Date.now(),
      })
    );

    window.dispatchEvent(
      new CustomEvent(
        "campus-navigate",
        {
          detail: "My Campus",
        }
      )
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };


  const createResourceQuiz = (
    item: LearningResource
  ) => {
    window.sessionStorage.setItem(
      "campusconnect-ai-intent",
      JSON.stringify({
        mode: "quiz_generator",
        sourceId: item.id,
        sourceTitle: item.title,
        prompt:
          `Create a grounded quiz from “${item.title}”.`,
        createdAt: Date.now(),
      })
    );

    window.dispatchEvent(
      new CustomEvent(
        "campus-navigate",
        {
          detail: "My Campus",
        }
      )
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };


  const openResource = async (
    item: LearningResource
  ) => {
    if (item.file_path) {
      const client = getSupabaseClient();

      if (!client) return;

      const {data, error} =
        await client.storage
          .from("learning-resources")
          .createSignedUrl(
            item.file_path,
            120
          );

      if (error) {
        return setStatus(error.message);
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );

      return;
    }

    if (item.url && isWebUrl(item.url)) {
      window.open(
        item.url,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  const availableSubjects = Array.from(
    new Set(
      items
        .filter(item => {
          const branchMatch =
            item.department === selectedBranch ||
            item.department === "All";

          const semesterMatch =
            item.semester === selectedSemester ||
            item.semester === "All";

          return branchMatch && semesterMatch;
        })
        .map(item => item.subject.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const subjectResourceCount = (
    subject: string
  ) =>
    items.filter(item => {
      const branchMatch =
        item.department === selectedBranch ||
        item.department === "All";

      const semesterMatch =
        item.semester === selectedSemester ||
        item.semester === "All";

      const subjectMatch =
        item.subject === subject;

      return (
        branchMatch &&
        semesterMatch &&
        subjectMatch
      );
    }).length;

const visible = items.filter(item => {
    const branchMatch =
      item.department === selectedBranch ||
      item.department === "All";

    const semesterMatch =
      item.semester === selectedSemester ||
      item.semester === "All";

    const typeMatch =
      tab === "All" ||
      item.resource_type === tab;

    return branchMatch && semesterMatch && typeMatch;
  });

  const resourceTypes: LearningResourceType[] = [
    "Video",
    "PYQ",
    "PDF",
    "Notes",
    "Lab Manual",
    "Important Questions",
    "Assignment Material",
    "External Link",
  ];

  const resourceIcon = (
    type: LearningResourceType
  ) => {
    if (type === "Video") return "▶";
    if (type === "PYQ") return "PYQ";
    if (type === "PDF") return "PDF";
    if (type === "Notes") return "N";
    if (type === "Lab Manual") return "LAB";
    if (type === "Important Questions") return "IQ";
    if (type === "Assignment Material") return "A";
    return "↗";
  };

  return (
    <div className="moduleStack">

      <ModuleHero
        eyebrow="Learning library"
        title="Campus learning resources"
        copy="Access verified videos, PDFs, notes, PYQs, lab manuals and subject material shared across CampusConnect."
        action={
          <button
            className="primary"
            onClick={() =>
              setShowForm(value => !value)
            }
          >
            {showForm
              ? "Close form"
              : "+ Add resource"}
          </button>
        }
      />

      {showForm && (
        <form
          className="moduleForm card"
          onSubmit={addResource}
        >
          <FormHeading
            title="Add learning material"
            text={
              canVerifyLearningRole(profile.role)
                ? "Your authorized role can publish verified learning resources."
                : "Your upload will be reviewed before receiving verified status."
            }
          />

          <div className="formGrid formGridThree">

            <Field label="Resource type">
              <select
                value={form.resource_type}
                onChange={event => {
                  const next =
                    event.target.value as LearningResourceType;

                  setForm({
                    ...form,
                    resource_type: next,
                    url: "",
                  });

                  setResourceFile(null);
                }}
              >
                {resourceTypes.map(type => (
                  <option key={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Subject">
              <input
                value={form.subject}
                onChange={event =>
                  setForm({
                    ...form,
                    subject:
                      event.target.value,
                  })
                }
                placeholder="e.g. Digital Communication"
              />
            </Field>

            <Field label="Academic year">
              <input
                value={form.academic_year}
                onChange={event =>
                  setForm({
                    ...form,
                    academic_year:
                      event.target.value,
                  })
                }
                placeholder="2026–27"
              />
            </Field>

          </div>

          <div className="formGrid">

            <Field label="Department">
              <select
                value={form.department}
                onChange={event =>
                  setForm({
                    ...form,
                    department:
                      event.target.value,
                  })
                }
              >
                <option value="All">All</option>

                {branches.map(branch => (
                  <option
                    key={branch.id}
                    value={branch.name}
                  >
                    {branch.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Semester">
              <select
                value={form.semester}
                onChange={event =>
                  setForm({
                    ...form,
                    semester:
                      event.target.value,
                  })
                }
              >
                <option>All</option>
                <option>1</option>
                <option>2</option>
                <option>3</option>
                <option>4</option>
                <option>5</option>
                <option>6</option>
                <option>7</option>
                <option>8</option>
              </select>
            </Field>

          </div>

          {needsUrl && (
            <Field
              label={
                form.resource_type === "Video"
                  ? "YouTube URL"
                  : form.resource_type === "PYQ"
                  ? "PYQ / PDF / Drive URL"
                  : "Resource URL"
              }
            >
              <input
                type="url"
                value={form.url}
                onChange={event =>
                  setForm({
                    ...form,
                    url:
                      event.target.value,
                  })
                }
                placeholder="https://..."
              />
            </Field>
          )}

          {needsFile && (
            <Field label="Upload resource">
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg"
                onChange={event =>
                  setResourceFile(
                    event.target.files?.[0] ||
                    null
                  )
                }
              />
            </Field>
          )}

          <Field label="Title">
            <input
              value={form.title}
              onChange={event =>
                setForm({
                  ...form,
                  title:
                    event.target.value,
                })
              }
              placeholder="Clear resource title"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={event =>
                setForm({
                  ...form,
                  description:
                    event.target.value,
                })
              }
              placeholder="What will students find in this resource?"
            />
          </Field>

          <FormActions
            status={status}
            label={
              uploading
                ? "Uploading..."
                : "Publish resource"
            }
            disabled={uploading}
          />
        </form>
      )}

      
    {canCreateBranch && (
      <section className="branchManagement card">
        <div className="branchManagementHeader">
          <div>
            <span>BRANCH MANAGEMENT</span>
            <h3>Manage academic branches</h3>
            <p>
              Create new departments without changing
              CampusConnect source code.
            </p>
          </div>

          <button
            type="button"
            className="primary"
            onClick={() =>
              setShowBranchForm(value => !value)
            }
          >
            {showBranchForm
              ? "Close"
              : "+ Create branch"}
          </button>
        </div>

        {showBranchForm && (
          <form
            className="branchCreateForm"
            onSubmit={createBranch}
          >
            <div className="formGrid">
              <Field label="Branch name">
                <input
                  value={branchForm.name}
                  onChange={event =>
                    setBranchForm({
                      ...branchForm,
                      name: event.target.value,
                    })
                  }
                  placeholder="Artificial Intelligence & ML"
                />
              </Field>

              <Field label="Short code">
                <input
                  value={branchForm.code}
                  maxLength={10}
                  onChange={event =>
                    setBranchForm({
                      ...branchForm,
                      code:
                        event.target.value.toUpperCase(),
                    })
                  }
                  placeholder="AIML"
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                value={branchForm.description}
                onChange={event =>
                  setBranchForm({
                    ...branchForm,
                    description:
                      event.target.value,
                  })
                }
                placeholder="Describe this academic branch..."
              />
            </Field>

            <Field label="Number of semesters">
              <select
                value={branchForm.total_semesters}
                onChange={event =>
                  setBranchForm({
                    ...branchForm,
                    total_semesters:
                      event.target.value,
                  })
                }
              >
                {Array.from(
                  {length: 12},
                  (_, index) => index + 1
                ).map(number => (
                  <option
                    key={number}
                    value={number}
                  >
                    {number} semesters
                  </option>
                ))}
              </select>
            </Field>

            <div className="formActions">
              <span>
                New branches become immediately
                available in Learning Materials.
              </span>

              <button
                className="primary"
                disabled={creatingBranch}
              >
                {creatingBranch
                  ? "Creating..."
                  : "Create branch"}
              </button>
            </div>
          </form>
        )}
      </section>
    )}

    <section className="learningNavigator card">

      <div className="learningNavigatorHeader">
        <div>
          <span>LEARNING MATERIALS</span>
          <h3>Select your branch</h3>
          <p>
            Choose a department to explore semester-wise
            study resources.
          </p>
        </div>

        <strong>
          {selectedBranchData
            ? `${selectedBranchData.code} · Semester ${selectedSemester}`
            : `Select a branch`}
        </strong>
      </div>

      <div className="branchCards">

        {branchesLoading ? (
          <div className="branchLoading">
            Loading branches...
          </div>
        ) : branches.length === 0 ? (
          <div className="branchEmpty">
            <strong>No branches available</strong>
            <span>
              Faculty or Main Admin can create the
              first academic branch.
            </span>
          </div>
        ) : (
          branches.map(branch => {

            const count = items.filter(item =>
              item.department === branch.name ||
              item.department === "All"
            ).length;

            return (
              <div
                className="branchCardWrapper"
                key={branch.id}
              >
                <button
                  type="button"
                  className={
                    selectedBranch === branch.name
                      ? "selected"
                      : ""
                  }
                  onClick={() => {
                    setSelectedBranch(branch.name);
                    setSelectedSemester("1");
                    setSelectedSubject("");
                    setTab("All");

                    setForm(current => ({
                      ...current,
                      department: branch.name,
                      semester: "1",
                    }));
                  }}
                >
                  <i>{branch.code}</i>

                  <span>
                    <b>{branch.name}</b>

                    <small>
                      {count} learning resources
                    </small>

                    {branch.description && (
                      <small>
                        {branch.description}
                      </small>
                    )}
                  </span>

                  <em>→</em>
                </button>

                {canDeleteBranch && (
                  <button
                    type="button"
                    className="branchDeleteButton"
                    title={`Delete ${branch.name}`}
                    onClick={() =>
                      void deleteBranch(branch)
                    }
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })
        )}

      </div>

      {selectedBranch && (
      <div className="semesterNavigator">

        <div className="semesterNavigatorHeading">
          <span>SEMESTER</span>

          <div>
            <h4>
              {selectedBranchData?.code || selectedBranch} · Semester resources
            </h4>

            <p>
              Select your semester to view subjects,
              videos, notes, PDFs and previous papers.
            </p>
          </div>
        </div>

        <div className="semesterButtons">

          {semesters.map(semester => {

            const count = items.filter(item =>
              (
                item.department === selectedBranch ||
                item.department === "All"
              ) &&
              (
                item.semester === semester ||
                item.semester === "All"
              )
            ).length;

            return (
              <button
                type="button"
                key={semester}
                className={
                  selectedSemester === semester
                    ? "selected"
                    : ""
                }
                onClick={() => {
                  setSelectedSemester(semester);
                  setSelectedSubject("");
                  setTab("All");

                  setForm(current => ({
                    ...current,
                    department: selectedBranch,
                    semester,
                  }));
                }}
              >
                <span>Semester</span>
                <b>{semester}</b>
                <small>
                  {count} resources
                </small>
              </button>
            );
          })}

        </div>

      </div>
      )}

    </section>

      {selectedBranch && selectedSemester && (
      <section className="learningSubjectSection">

        <div className="learningBreadcrumb">
          <button
            type="button"
            onClick={() => {
              setSelectedSubject("");
              setTab("All");
            }}
          >
            Learning
          </button>

          <span>›</span>

          <b>
            {selectedBranchData?.code ||
              selectedBranch}
          </b>

          <span>›</span>

          <b>
            Semester {selectedSemester}
          </b>

          {selectedSubject && (
            <>
              <span>›</span>

              <strong>
                {selectedSubject === "__ALL__"
                  ? "All resources"
                  : selectedSubject}
              </strong>
            </>
          )}
        </div>

        {!selectedSubject && (
          <>
            <div className="learningSubjectHeader">
              <div>
                <span>SUBJECTS</span>

                <h3>
                  Semester {selectedSemester}
                </h3>

                <p>
                  Select a subject to access videos,
                  notes, PDFs, previous papers and
                  other learning material.
                </p>
              </div>

              <b>
                {availableSubjects.length}{" "}
                {availableSubjects.length === 1
                  ? "subject"
                  : "subjects"}
              </b>
            </div>

            <div className="subjectCards">

              {availableSubjects.length > 0 && (
                <button
                  type="button"
                  className="subjectCard subjectCardAll"
                  onClick={() => {
                    setSelectedSubject("__ALL__");
                    setTab("All");
                  }}
                >
                  <i>ALL</i>

                  <span>
                    <b>All semester resources</b>

                    <small>
                      Browse every learning resource
                      available for this semester.
                    </small>
                  </span>

                  <em>→</em>
                </button>
              )}

              {availableSubjects.map(subject => {
                const count =
                  subjectResourceCount(subject);

                const initials =
                  subject
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 3)
                    .map(word =>
                      word.charAt(0).toUpperCase()
                    )
                    .join("");

                const types = Array.from(
                  new Set(
                    items
                      .filter(item =>
                        (
                          item.department === selectedBranch ||
                          item.department === "All"
                        ) &&
                        (
                          item.semester === selectedSemester ||
                          item.semester === "All"
                        ) &&
                        item.subject === subject
                      )
                      .map(item => item.resource_type)
                  )
                ).slice(0, 3);

                return (
                  <button
                    type="button"
                    className="subjectCard"
                    key={subject}
                    onClick={() => {
                      setSelectedSubject(subject);
                      setTab("All");

                      setForm(current => ({
                        ...current,
                        department: selectedBranch,
                        semester:
                          selectedSemester,
                        subject,
                      }));
                    }}
                  >
                    <i>
                      {initials || "SUB"}
                    </i>

                    <span>
                      <b>{subject}</b>

                      <small>
                        {count}{" "}
                        {count === 1
                          ? "resource"
                          : "resources"}
                      </small>

                      {types.length > 0 && (
                        <small className="subjectTypes">
                          {types.join(" · ")}
                        </small>
                      )}
                    </span>

                    <em>→</em>
                  </button>
                );
              })}

            </div>

            {!availableSubjects.length && (
              <div className="subjectEmptyState">
                <i>◇</i>

                <div>
                  <b>No subjects added yet</b>

                  <p>
                    Resources uploaded for{" "}
                    {selectedBranchData?.code ||
                      selectedBranch}{" "}
                    Semester {selectedSemester} will
                    automatically create subject
                    sections here.
                  </p>
                </div>

                {canVerifyLearningRole(profile.role) && (
                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      setForm(current => ({
                        ...current,
                        department: selectedBranch,
                        semester:
                          selectedSemester,
                      }));

                      setShowForm(true);
                    }}
                  >
                    + Add first resource
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {selectedSubject && (
          <div className="selectedSubjectHeader">

            <button
              type="button"
              className="subjectBackButton"
              onClick={() => {
                setSelectedSubject("");
                setTab("All");
              }}
            >
              ← Subjects
            </button>

            <div>
              <span>NOW VIEWING</span>

              <h3>
                {selectedSubject === "__ALL__"
                  ? "All semester resources"
                  : selectedSubject}
              </h3>

              <p>
                {selectedBranchData?.name ||
                  selectedBranch}{" "}
                · Semester {selectedSemester}
              </p>
            </div>

            <button
              type="button"
              className="primary"
              onClick={() => {
                setForm(current => ({
                  ...current,
                  department: selectedBranch,
                  semester:
                    selectedSemester,
                  subject:
                    selectedSubject === "__ALL__"
                      ? ""
                      : selectedSubject,
                }));

                setShowForm(true);

                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
            >
              + Add resource
            </button>

          </div>
        )}

      </section>
      )}

{selectedSubject && (
<div className="libraryTabs">
        <button
          className={
            tab === "All"
              ? "selected"
              : ""
          }
          onClick={() => setTab("All")}
        >
          All
          <b>
            {
              items.filter(item =>
                (
                  item.department === selectedBranch ||
                  item.department === "All"
                ) &&
                (
                  item.semester === selectedSemester ||
                  item.semester === "All"
                )
              ).length
            }
          </b>
        </button>

        {resourceTypes.map(type => (
          <button
            key={type}
            className={
              tab === type
                ? "selected"
                : ""
            }
            onClick={() =>
              setTab(type)
            }
          >
            {resourceIcon(type)} {type}
            <b>
              {
                items.filter(
                  item =>
                    item.resource_type === type &&
                    (
                      item.department === selectedBranch ||
                      item.department === "All"
                    ) &&
                    (
                      item.semester === selectedSemester ||
                      item.semester === "All"
                    ) &&
                    (
                      selectedSubject === "__ALL__" ||
                      item.subject === selectedSubject
                    )
                ).length
              }
            </b>
          </button>
        ))}
      </div>
)}

      {status && !showForm && (
        <StatusLine text={status}/>
      )}

      {selectedSubject && (
      <section className="resourceLibrary">

        {visible.map(item => {
          const aiDocument =
            aiDocuments[item.id];

          const isIndexing =
            indexingResourceIds.includes(
              item.id
            );

          return (
          <article
            className="resourceCard card"
            key={item.id}
          >
            <div
              className={`resourceVisual ${item.resource_type
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              <i>
                {resourceIcon(
                  item.resource_type
                )}
              </i>

              <span>
                {item.subject}
              </span>
            </div>

            <div className="resourceBody">

              <div className="itemMeta">
                <span>
                  {item.department || "All"} ·{" "}
                  Sem {item.semester || "All"} ·{" "}
                  {item.academic_year}
                </span>

                {item.is_verified ? (
                  <b className="verifiedBadge">
                    ✓ Verified
                  </b>
                ) : (
                  <b className="reviewBadge">
                    Review pending
                  </b>
                )}
              </div>

              <h3>{item.title}</h3>

              {item.description && (
                <p>
                  {item.description}
                </p>
              )}

              <small>
                Added by {item.contributor_name} ·{" "}
                {item.contributor_role}
              </small>

              <div className="resourceActions">
                <button
                  type="button"
                  className="resourceLink"
                  onClick={() =>
                    void openResource(item)
                  }
                >
                  {item.resource_type === "Video"
                    ? "Watch on YouTube ↗"
                    : item.file_path
                    ? "Open resource ↗"
                    : "Open link ↗"}
                </button>

                <button
                  type="button"
                  className={`resourceAiButton ${
                    aiDocument?.status || "new"
                  }`}
                  disabled={isIndexing}
                  title={
                    aiDocument?.extraction_error ||
                    "Prepare this real resource for grounded Campus AI retrieval."
                  }
                  onClick={() =>
                    void indexResource(item)
                  }
                >
                  <i>AI</i>

                  <span>
                    {isIndexing
                      ? "Preparing..."
                      : aiDocument?.status === "ready"
                      ? `Refresh AI index · ${aiDocument.chunk_count}`
                      : aiDocument?.status === "processing"
                      ? "Resume AI preparation"
                      : aiDocument?.status === "failed"
                      ? "Retry AI preparation"
                      : "Prepare for AI"}
                  </span>
                </button>

                {aiDocument?.status ===
                  "ready" && (
                  <button
                    type="button"
                    className="resourceAskAiButton"
                    onClick={() =>
                      askResourceWithAi(item)
                    }
                  >
                    <i>✦</i>
                    Ask AI
                  </button>
                )}

                {aiDocument?.status ===
                  "ready" && (
                  <button
                    type="button"
                    className="resourceQuizButton"
                    onClick={() =>
                      createResourceQuiz(item)
                    }
                  >
                    <i>Q</i>
                    Create Quiz
                  </button>
                )}
              </div>

            </div>
          </article>
          );
        })}

        {!visible.length && (
          <EmptyState
            title="No resources yet"
            text="Learning material for this category will appear here."
          />
        )}

      </section>
      )}
    </div>
  );
}


type CommunityGroup = {id: string; name: string; description: string; audience: string; topic: string; owner_id: string; owner_name: string; member_count: number; created_at: string};
type GroupMessage = {id: string; group_id: string; sender_id: string; sender_name: string; body: string; created_at: string};
const emptyGroups: CommunityGroup[]  = [];
const emptyMessages: GroupMessage[]  = [];

function GroupsModule({profile}: {profile: ModuleProfile}) {
  const [groups, setGroups] = useState<CommunityGroup[]>(emptyGroups);
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<GroupMessage[]>(emptyMessages);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{name: string; description: string; audience: Role | "All"; topic: string}>({name: "", description: "", audience: profile.role, topic: "Discussion"});
  const [status, setStatus] = useState("");
  const activeGroup = groups.find(group => group.id === activeId);

  useEffect(() => {
    let active = true;
    const client = getSupabaseClient();
    if (!client) return;
    client.from("community_groups").select("*").order("created_at", {ascending: false}).then(({data, error}) => {
      if (active && !error) {
        const next = (data || []) as CommunityGroup[];
        setGroups(next);
        if (next[0]) setActiveId(next[0].id);
      }
    });
    client.from("group_members").select("group_id").then(({data, error}) => {
      if (active && !error) setJoinedIds((data || []).map(row => String(row.group_id)));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const client = getSupabaseClient();
    if (!client || !activeId || !joinedIds.includes(activeId)) return;
    client.from("group_messages").select("*").eq("group_id", activeId).order("created_at", {ascending: true}).limit(100).then(({data, error}) => {
      if (active && !error) setMessages((data || []) as GroupMessage[]);
    });
    return () => { active = false; };
  }, [activeId, joinedIds]);

  const createGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.description.trim()) return setStatus("Add a group name and purpose.");
    const client = getSupabaseClient();
    if (!client) return setStatus("CampusConnect is not connected to Supabase. Configure the production environment first.");
    {
      const {data: userData} = await client.auth.getUser();
      if (!userData.user) return setStatus("Sign in to create a community.");
      const {data, error} = await client.from("community_groups").insert({...form, owner_id: userData.user.id, owner_name: profile.name}).select().single();
      if (error) return setStatus(error.message);
      const local = {...data, member_count: 1} as CommunityGroup;
      await client.from("group_members").upsert({group_id: local.id, user_id: userData.user.id, member_name: profile.name}, {onConflict: "group_id,user_id"});
      setGroups(current => [local, ...current]);
      setJoinedIds(current => [...current, local.id]);
      setActiveId(local.id);
      setMessages([]);
    }
    setShowForm(false);
    setStatus("Community created successfully.");
  };

  const joinGroup = async (group: CommunityGroup) => {
    const client = getSupabaseClient();
    if (!client) return setStatus("CampusConnect is not connected to Supabase. Configure the production environment first.");
    {
      const {data: userData} = await client.auth.getUser();
      if (!userData.user) return setStatus("Sign in to join a community.");
      const {error} = await client.from("group_members").upsert({group_id: group.id, user_id: userData.user.id, member_name: profile.name}, {onConflict: "group_id,user_id"});
      if (error) return setStatus(error.message);
    }
    setJoinedIds(current => [...current, group.id]);
    setGroups(current => current.map(item => item.id === group.id ? {...item, member_count: item.member_count + 1} : item));
    setActiveId(group.id);
    setStatus(`Joined ${group.name}.`);
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim() || !activeGroup || !joinedIds.includes(activeGroup.id)) return;
    const client = getSupabaseClient();
    if (!client) return setStatus("CampusConnect is not connected to Supabase. Configure the production environment first.");
    {
      const {data: userData} = await client.auth.getUser();
      if (!userData.user) return setStatus("Sign in to send a message.");
      const {data, error} = await client.from("group_messages").insert({group_id: activeGroup.id, sender_id: userData.user.id, sender_name: profile.name, body: message.trim()}).select().single();
      if (error) return setStatus(error.message);
      setMessages(current => [...current, data as GroupMessage]);
    }
    setMessage("");
  };

  return <div className="moduleStack"><ModuleHero eyebrow="Campus communities" title="Discussion groups" copy="Create focused communities for students, faculty, placement teams and cross-campus collaboration." action={<button className="primary" onClick={() => setShowForm(value => !value)}>{showForm ? "Close form" : "+ Create group"}</button>}/>
    {showForm && <form className="moduleForm card" onSubmit={createGroup}><FormHeading title="Start a discussion group" text="Set a clear purpose and choose who the group is designed for."/><div className="formGrid"><Field label="Group name"><input value={form.name} onChange={event => setForm({...form, name: event.target.value})} placeholder="e.g. ECE Placement Prep"/></Field><Field label="Audience"><select value={form.audience} onChange={event => setForm({...form, audience: event.target.value as Role | "All"})}><option>Student</option><option>Faculty</option><option>Coordinator</option><option>Volunteer</option><option>Placement Cell</option><option>Main Admin</option><option>All</option></select></Field></div><Field label="Purpose"><textarea value={form.description} onChange={event => setForm({...form, description: event.target.value})} placeholder="What should members discuss here?"/></Field><Field label="Topic"><input value={form.topic} onChange={event => setForm({...form, topic: event.target.value})} placeholder="Academics, placements, project..."/></Field><FormActions status={status} label="Create community"/></form>}
    {status && !showForm && <StatusLine text={status}/>}<section className="groupsLayout"><div className="groupDirectory card"><header><div><span>DISCOVER</span><h3>Campus groups</h3></div><b>{groups.length}</b></header>{groups.map(group => {const joined = joinedIds.includes(group.id); return <button className={`groupRow ${activeId === group.id ? "selected" : ""}`} onClick={() => {setActiveId(group.id); if (!joined) setMessages([]);}} key={group.id}><i>{group.name.split(" ").slice(0, 2).map(word => word[0]).join("")}</i><span><strong>{group.name}</strong><small>{group.topic} · {group.member_count} members</small></span><em>{group.audience}</em></button>;})}</div>
      <div className="groupConversation card">{activeGroup ? <><header><div><span>{activeGroup.audience} COMMUNITY</span><h3>{activeGroup.name}</h3><p>{activeGroup.description}</p></div>{joinedIds.includes(activeGroup.id) ? <b>✓ Joined</b> : <button className="primary" onClick={() => joinGroup(activeGroup)}>Join group</button>}</header><div className="messageList">{joinedIds.includes(activeGroup.id) ? messages.filter(item => item.group_id === activeGroup.id).map(item => <div className={`groupMessage ${item.sender_name === profile.name ? "mine" : ""}`} key={item.id}><i>{initials(item.sender_name)}</i><p><span><b>{item.sender_name}</b><time>{friendlyDate(item.created_at)}</time></span>{item.body}</p></div>) : <div className="joinPrompt"><i>◎</i><b>Join to read the discussion</b><small>Group messages are visible only to members.</small></div>}</div>{joinedIds.includes(activeGroup.id) && <form className="messageComposer" onSubmit={sendMessage}><input value={message} onChange={event => setMessage(event.target.value)} placeholder={`Message ${activeGroup.name}`}/><button className="primary">Send</button></form>}</> : <EmptyState title="Select a group" text="Choose a community to open its discussion."/>}</div></section>
  </div>;
}

type ProfileDetails = {
  bio: string;
  skills: string;
  phone: string;
  usn: string;
  campus_uid?: string;
  avatar_url?: string;
  cover_url?: string;
};

type ProfileDocument = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  document_type: string;
  created_at: string;
};

function ProfileModule({
  profile,
  onProfileChange,
}: {
  profile: ModuleProfile;
  onProfileChange: (profile: ModuleProfile) => void;
}) {
  const [details, setDetails] = useState<ProfileDetails>({
    bio: "",
    skills: "",
    phone: "",
    usn: "",
    campus_uid: profile.campus_uid || "",
    avatar_url: "",
    cover_url: "",
  });

  const [documents, setDocuments] =
    useState<ProfileDocument[]>([]);

  const [file, setFile] =
    useState<File | null>(null);

  const [documentType, setDocumentType] =
    useState("Resume");

  const [status, setStatus] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [uploadingDocument, setUploadingDocument] =
    useState(false);

  const [editing, setEditing] =
    useState(false);

  const [uidCopied, setUidCopied] =
    useState(false);

  const [avatarFile, setAvatarFile] =
    useState<File | null>(null);

  const [coverFile, setCoverFile] =
    useState<File | null>(null);

  const [uploadingMedia, setUploadingMedia] =
    useState<"avatar" | "cover" | "">("");

  const [showPublicProfile, setShowPublicProfile] =
    useState(false);

  useEffect(() => {
    let active = true;

    const client = getSupabaseClient();

    if (!client) return;

    client.auth.getUser().then(({data}) => {
      if (!data.user) return;

      client
        .from("profiles")
        .select(
          "bio,skills,phone,usn,campus_uid,avatar_url,cover_url"
        )
        .eq("id", data.user.id)
        .maybeSingle()
        .then(({data: row, error}) => {
          if (
            active &&
            !error &&
            row
          ) {
            setDetails({
              bio: row.bio || "",
              skills: row.skills || "",
              phone: row.phone || "",
              usn: row.usn || "",
              campus_uid:
                row.campus_uid ||
                profile.campus_uid ||
                "",

              avatar_url:
                row.avatar_url || "",

              cover_url:
                row.cover_url || "",
            });
          }
        });

      client
        .from("profile_documents")
        .select("*")
        .eq("owner_id", data.user.id)
        .order("created_at", {
          ascending: false,
        })
        .then(({data: rows, error}) => {
          if (
            active &&
            !error
          ) {
            setDocuments(
              (rows || []) as ProfileDocument[]
            );
          }
        });
    });

    return () => {
      active = false;
    };
  }, [profile.campus_uid]);

  const saveProfile = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    const client = getSupabaseClient();

    if (!client) {
      return setStatus(
        "CampusConnect is not connected to Supabase."
      );
    }

    setSaving(true);
    setStatus("");

    try {
      const {data: userData} =
        await client.auth.getUser();

      if (!userData.user) {
        throw new Error(
          "Sign in again to save your profile."
        );
      }

      const {error} = await client
        .from("profiles")
        .update({
          bio: details.bio.trim(),
          skills: details.skills.trim(),
          phone: details.phone.trim(),
          usn: details.usn.trim(),
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          userData.user.id
        );

      if (error) {
        throw error;
      }

      onProfileChange({
        ...profile,
        campus_uid:
          details.campus_uid ||
          profile.campus_uid,
      });

      setEditing(false);

      setStatus(
        "Profile updated successfully."
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to save profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const uploadDocument = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (!file) {
      return setStatus(
        "Choose a document first."
      );
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      return setStatus(
        "Document must be smaller than 5 MB."
      );
    }

    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
    ];

    if (
      file.type &&
      !allowed.includes(file.type)
    ) {
      return setStatus(
        "Use PDF, DOC, DOCX, PNG, JPG or JPEG."
      );
    }

    const client =
      getSupabaseClient();

    if (!client) {
      return setStatus(
        "CampusConnect is not connected to Supabase."
      );
    }

    setUploadingDocument(true);
    setStatus("");

    try {
      const {data: userData} =
        await client.auth.getUser();

      if (!userData.user) {
        throw new Error(
          "Sign in to upload documents."
        );
      }

      const safeName =
        file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "-"
        );

      const path =
        `${userData.user.id}/${Date.now()}-${safeName}`;

      const {error: uploadError} =
        await client.storage
          .from("campus-documents")
          .upload(
            path,
            file,
            {
              upsert: false,
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      const {data, error} =
        await client
          .from("profile_documents")
          .insert({
            owner_id:
              userData.user.id,
            file_name:
              file.name,
            file_path:
              path,
            file_size:
              file.size,
            document_type:
              documentType,
          })
          .select()
          .single();

      if (error) {
        await client.storage
          .from("campus-documents")
          .remove([path]);

        throw error;
      }

      setDocuments(current => [
        data as ProfileDocument,
        ...current,
      ]);

      setFile(null);

      setStatus(
        `${documentType} uploaded successfully.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to upload document."
      );
    } finally {
      setUploadingDocument(false);
    }
  };

  const openDocument = async (
    document: ProfileDocument
  ) => {
    const client =
      getSupabaseClient();

    if (!client) return;

    const {data, error} =
      await client.storage
        .from("campus-documents")
        .createSignedUrl(
          document.file_path,
          120
        );

    if (error) {
      return setStatus(
        error.message
      );
    }

    window.open(
      data.signedUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const deleteDocument = async (
    document: ProfileDocument
  ) => {
    if (
      !window.confirm(
        `Delete "${document.file_name}"?`
      )
    ) {
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) return;

    setStatus("");

    const {error: rowError} =
      await client
        .from("profile_documents")
        .delete()
        .eq(
          "id",
          document.id
        );

    if (rowError) {
      return setStatus(
        rowError.message
      );
    }

    await client.storage
      .from("campus-documents")
      .remove([
        document.file_path,
      ]);

    setDocuments(current =>
      current.filter(
        item =>
          item.id !== document.id
      )
    );

    setStatus(
      "Document deleted."
    );
  };

  const copyCampusUid =
    async () => {
      const uid =
        details.campus_uid ||
        profile.campus_uid;

      if (!uid) {
        return setStatus(
          "Campus UID is not available yet."
        );
      }

      try {
        await navigator.clipboard
          .writeText(uid);

        setUidCopied(true);

        window.setTimeout(
          () =>
            setUidCopied(false),
          1800
        );
      } catch {
        setStatus(
          "Unable to copy Campus UID."
        );
      }
    };

  const profileMediaPathFromUrl = (
    url?: string
  ) => {
    if (!url) return "";

    const marker =
      "/storage/v1/object/public/profile-media/";

    const index =
      url.indexOf(marker);

    if (index === -1) {
      return "";
    }

    return decodeURIComponent(
      url.slice(
        index + marker.length
      )
    );
  };


  const removePreviousProfileMedia = async (
    url?: string
  ) => {
    const path =
      profileMediaPathFromUrl(url);

    if (!path) return;

    const client =
      getSupabaseClient();

    if (!client) return;

    const {error} =
      await client.storage
        .from("profile-media")
        .remove([path]);

    if (error) {
      console.warn(
        "Unable to remove previous profile media:",
        error
      );
    }
  };


  const uploadProfileMedia = async (
    kind: "avatar" | "cover",
    selectedFile: File | null
  ) => {
    if (!selectedFile) {
      return setStatus(
        kind === "avatar"
          ? "Choose a profile image first."
          : "Choose a cover image first."
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        selectedFile.type
      )
    ) {
      return setStatus(
        "Profile images must be JPG, PNG or WebP."
      );
    }

    const maximumSize =
      kind === "avatar"
        ? 3 * 1024 * 1024
        : 5 * 1024 * 1024;

    if (
      selectedFile.size >
      maximumSize
    ) {
      return setStatus(
        kind === "avatar"
          ? "Profile photo must be smaller than 3 MB."
          : "Cover image must be smaller than 5 MB."
      );
    }

    const client =
      getSupabaseClient();

    if (!client) {
      return setStatus(
        "CampusConnect is not connected to Supabase."
      );
    }

    setUploadingMedia(kind);
    setStatus("");

    try {
      const {data: auth} =
        await client.auth.getUser();

      if (!auth.user) {
        throw new Error(
          "Sign in again before uploading profile media."
        );
      }

      const extension =
        selectedFile.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        (
          selectedFile.type ===
          "image/png"
            ? "png"
            : selectedFile.type ===
              "image/webp"
            ? "webp"
            : "jpg"
        );

      const filePath =
        `${auth.user.id}/${kind}-${Date.now()}.${extension}`;

      const {error: uploadError} =
        await client.storage
          .from("profile-media")
          .upload(
            filePath,
            selectedFile,
            {
              cacheControl: "3600",
              upsert: false,
              contentType:
                selectedFile.type,
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      const {data: publicData} =
        client.storage
          .from("profile-media")
          .getPublicUrl(
            filePath
          );

      const publicUrl =
        publicData.publicUrl;

      const previousUrl =
        kind === "avatar"
          ? details.avatar_url
          : details.cover_url;

      const update =
        kind === "avatar"
          ? {
              avatar_url:
                publicUrl,
              updated_at:
                new Date().toISOString(),
            }
          : {
              cover_url:
                publicUrl,
              updated_at:
                new Date().toISOString(),
            };

      const {error: profileError} =
        await client
          .from("profiles")
          .update(update)
          .eq(
            "id",
            auth.user.id
          );

      if (profileError) {
        await client.storage
          .from("profile-media")
          .remove([
            filePath,
          ]);

        throw profileError;
      }

      if (kind === "avatar") {
        setDetails(current => ({
          ...current,
          avatar_url:
            publicUrl,
        }));

        setAvatarFile(null);

        onProfileChange({
          ...profile,
          avatar_url: publicUrl,
        });
      } else {
        setDetails(current => ({
          ...current,
          cover_url:
            publicUrl,
        }));

        setCoverFile(null);
      }

      if (
        previousUrl &&
        previousUrl !==
          publicUrl
      ) {
        await removePreviousProfileMedia(
          previousUrl
        );
      }

      setStatus(
        kind === "avatar"
          ? "Profile photo updated."
          : "Profile cover updated."
      );

    } catch (error: unknown) {
      console.error(
        "PROFILE MEDIA UPLOAD ERROR:",
        error
      );

      let message =
        "Unable to upload profile media.";

      if (
        error &&
        typeof error === "object"
      ) {
        const supabaseError =
          error as {
            message?: string;
            error?: string;
            statusCode?: string | number;
            status?: string | number;
          };

        message =
          supabaseError.message ||
          supabaseError.error ||
          message;

        const code =
          supabaseError.statusCode ||
          supabaseError.status;

        if (code) {
          message =
            `${message} (code: ${code})`;
        }
      } else if (
        typeof error === "string"
      ) {
        message = error;
      }

      setStatus(`ERROR: ${message}`);
    } finally {
      setUploadingMedia("");
    }
  };


  const removeProfileMedia = async (
    kind: "avatar" | "cover"
  ) => {
    const currentUrl =
      kind === "avatar"
        ? details.avatar_url
        : details.cover_url;

    if (!currentUrl) {
      return;
    }

    if (
      !window.confirm(
        kind === "avatar"
          ? "Remove your profile photo?"
          : "Remove your cover image?"
      )
    ) {
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) return;

    setUploadingMedia(kind);
    setStatus("");

    try {
      const {data: auth} =
        await client.auth.getUser();

      if (!auth.user) {
        throw new Error(
          "Sign in again."
        );
      }

      const update =
        kind === "avatar"
          ? {
              avatar_url: null,
              updated_at:
                new Date().toISOString(),
            }
          : {
              cover_url: null,
              updated_at:
                new Date().toISOString(),
            };

      const {error} =
        await client
          .from("profiles")
          .update(update)
          .eq(
            "id",
            auth.user.id
          );

      if (error) {
        throw error;
      }

      await removePreviousProfileMedia(
        currentUrl
      );

      setDetails(current => ({
        ...current,
        [kind === "avatar"
          ? "avatar_url"
          : "cover_url"]: "",
      }));

      setStatus(
        kind === "avatar"
          ? "Profile photo removed."
          : "Profile cover removed."
      );

    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to remove image."
      );
    } finally {
      setUploadingMedia("");
    }
  };


  const skills =
    details.skills
      .split(",")
      .map(skill =>
        skill.trim()
      )
      .filter(Boolean);

  const completionFields = [
    profile.name,
    profile.email,
    profile.department,
    profile.year,
    details.campus_uid ||
      profile.campus_uid,
    details.bio,
    details.skills,
    details.phone,
    details.usn,
    documents.length
      ? "document"
      : "",
  ];

  const completion =
    Math.round(
      (
        completionFields.filter(
          value =>
            String(
              value || ""
            ).trim()
        ).length /
        completionFields.length
      ) *
        100
    );

  const identityLabel =
    profile.role === "Student"
      ? "USN"
      : "Employee ID";

  return (
    <div className="professionalProfile">

      <section
        className={`professionalProfileHero ${
          details.cover_url
            ? "hasProfileCover"
            : ""
        }`}
        style={
          details.cover_url
            ? {
                backgroundImage:
                  `linear-gradient(90deg, rgba(16,28,52,.92) 0%, rgba(16,28,52,.70) 44%, rgba(16,28,52,.30) 100%), url("${details.cover_url}")`,
              }
            : undefined
        }
      >

        <div className="profileHeroIdentity">

          <div className="profileAvatarShell">

            <div className="profileAvatarLarge">

              {details.avatar_url ? (
                <img
                  src={details.avatar_url}
                  alt={`${profile.name} profile`}
                />
              ) : (
                initials(profile.name)
              )}

            </div>

            <label
              className="profileAvatarChange"
              title="Change profile photo"
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={event => {
                  const next =
                    event.target.files?.[0] ||
                    null;

                  setAvatarFile(next);

                  if (next) {
                    void uploadProfileMedia(
                      "avatar",
                      next
                    );
                  }

                  event.currentTarget.value =
                    "";
                }}
              />

              {uploadingMedia === "avatar"
                ? "…"
                : "✎"}
            </label>

          </div>

          <div className="profileHeroContent">

            <div className="profileRoleLine">
              <span className="profileVerifiedBadge">
                ✓ Verified campus account
              </span>

              <span className="profileRoleBadge">
                {profile.role}
              </span>
            </div>

            <h2>
              {profile.name}
            </h2>

            <p>
              {profile.email}
            </p>

            <div className="profileMetaLine">
              <span>
                {profile.department}
              </span>

              <i/>

              <span>
                {profile.role ===
                "Student"
                  ? `Class of ${profile.year}`
                  : profile.year &&
                    profile.year !==
                      "Not set"
                  ? profile.year
                  : "Campus Staff"}
              </span>
            </div>

          </div>

        </div>


        <div className="profileHeroRight">

          <div className="profileCompletionBlock">
            <span>
              PROFILE COMPLETION
            </span>

            <div>
              <strong>
                {completion}%
              </strong>

              <small>
                {completion >= 90
                  ? "Excellent"
                  : completion >= 70
                  ? "Almost there"
                  : "Complete your profile"}
              </small>
            </div>

            <div className="profileCompletionBar">
              <span
                style={{
                  width:
                    `${completion}%`,
                }}
              />
            </div>
          </div>

          <div className="profileHeroActions">

            <button
              type="button"
              className="profilePreviewButton"
              onClick={() =>
                setShowPublicProfile(true)
              }
            >
              View public profile
            </button>

            <label className="profileCoverButton">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={event => {
                  const next =
                    event.target.files?.[0] ||
                    null;

                  setCoverFile(next);

                  if (next) {
                    void uploadProfileMedia(
                      "cover",
                      next
                    );
                  }

                  event.currentTarget.value =
                    "";
                }}
              />

              {uploadingMedia === "cover"
                ? "Uploading..."
                : details.cover_url
                ? "Change cover"
                : "Add cover"}
            </label>

            <button
              type="button"
              className="primary professionalProfileEdit"
              onClick={() =>
                setEditing(
                  value => !value
                )
              }
            >
              {editing
                ? "Cancel editing"
                : "Edit profile"}
            </button>

          </div>

        </div>

      </section>


      {status && (
        <StatusLine text={status}/>
      )}


      <section className="profileMainGrid">

        <div className="profileMainColumn">

          <section className="professionalProfileCard">

            <header className="profileSectionHeader">
              <div>
                <span>
                  CAMPUS IDENTITY
                </span>

                <h3>
                  Personal information
                </h3>

                <p>
                  Your verified academic and campus profile.
                </p>
              </div>

              <div className="profileSecurityMark">
                ✓
              </div>
            </header>


            <div className="profileInfoGrid">

              <div className="profileInfoItem">
                <small>
                  Full name
                </small>

                <strong>
                  {profile.name}
                </strong>
              </div>

              <div className="profileInfoItem">
                <small>
                  Account role
                </small>

                <strong>
                  {profile.role}
                </strong>
              </div>

              <div className="profileInfoItem">
                <small>
                  Department
                </small>

                <strong>
                  {profile.department}
                </strong>
              </div>

              <div className="profileInfoItem">
                <small>
                  {profile.role ===
                  "Student"
                    ? "Graduation year"
                    : "Campus status"}
                </small>

                <strong>
                  {profile.role ===
                  "Student"
                    ? profile.year
                    : "Verified staff"}
                </strong>
              </div>

              <div className="profileInfoItem">
                <small>
                  {identityLabel}
                </small>

                <strong>
                  {details.usn ||
                    "Not added"}
                </strong>
              </div>

              <div className="profileInfoItem">
                <small>
                  Phone
                </small>

                <strong>
                  {details.phone ||
                    "Not added"}
                </strong>
              </div>

            </div>


            <div className="profileBioSection">
              <small>
                ABOUT
              </small>

              <p>
                {details.bio ||
                  "Add a short professional introduction about yourself, your interests and your campus goals."}
              </p>
            </div>

          </section>


          {editing && (
            <form
              className="professionalProfileCard profileEditPanel"
              onSubmit={saveProfile}
            >

              <header className="profileSectionHeader">
                <div>
                  <span>
                    EDIT PROFILE
                  </span>

                  <h3>
                    Update your information
                  </h3>

                  <p>
                    Campus role, email, department and UID are protected.
                  </p>
                </div>
              </header>


              <div className="profileEditGrid">

                <Field
                  label={identityLabel}
                >
                  <input
                    value={
                      details.usn
                    }
                    onChange={event =>
                      setDetails({
                        ...details,
                        usn:
                          event.target
                            .value,
                      })
                    }
                    placeholder={
                      profile.role ===
                      "Student"
                        ? "Enter your USN"
                        : "Enter employee ID"
                    }
                  />
                </Field>

                <Field label="Phone">
                  <input
                    type="tel"
                    value={
                      details.phone
                    }
                    onChange={event =>
                      setDetails({
                        ...details,
                        phone:
                          event.target
                            .value,
                      })
                    }
                    placeholder="+91..."
                  />
                </Field>

              </div>

              <Field label="Short bio">
                <textarea
                  value={
                    details.bio
                  }
                  onChange={event =>
                    setDetails({
                      ...details,
                      bio:
                        event.target
                          .value,
                    })
                  }
                  placeholder="Tell your campus network about yourself..."
                />
              </Field>

              <Field label="Skills & interests">
                <input
                  value={
                    details.skills
                  }
                  onChange={event =>
                    setDetails({
                      ...details,
                      skills:
                        event.target
                          .value,
                    })
                  }
                  placeholder="React, Python, Embedded Systems, AI"
                />
              </Field>

              <div className="profileEditActions">

                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    setEditing(false)
                  }
                >
                  Cancel
                </button>

                <button
                  className="primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save changes"}
                </button>

              </div>

            </form>
          )}


          <section className="professionalProfileCard">

            <header className="profileSectionHeader">
              <div>
                <span>
                  SKILLS & INTERESTS
                </span>

                <h3>
                  Professional strengths
                </h3>

                <p>
                  Skills visible across your CampusConnect profile.
                </p>
              </div>

              {skills.length > 0 && (
                <b className="profileCountBadge">
                  {skills.length}
                </b>
              )}
            </header>


            {skills.length ? (
              <div className="profileSkillCloud">
                {skills.map(
                  (skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                    >
                      {skill}
                    </span>
                  )
                )}
              </div>
            ) : (
              <div className="profileSkillsEmpty">
                <i>＋</i>

                <div>
                  <strong>
                    No skills added
                  </strong>

                  <span>
                    Add skills to improve networking and recommendations.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditing(true)
                  }
                >
                  Add skills
                </button>
              </div>
            )}

          </section>

        </div>


        <aside className="profileSideColumn">

          <section className="professionalProfileCard campusUidCard">

            <div className="uidCardIcon">
              CC
            </div>

            <span>
              CAMPUSCONNECT UID
            </span>

            <h3>
              {details.campus_uid ||
                profile.campus_uid ||
                "Generating..."}
            </h3>

            <p>
              Share this UID with verified CampusConnect users to connect through Messenger.
            </p>

            <button
              type="button"
              onClick={() =>
                void copyCampusUid()
              }
            >
              {uidCopied
                ? "✓ UID copied"
                : "Copy Campus UID"}
            </button>

          </section>


          <section className="professionalProfileCard profileMediaManager">

            <header className="profileSectionHeader compact">
              <div>
                <span>
                  PROFILE APPEARANCE
                </span>

                <h3>
                  Profile media
                </h3>

                <p>
                  Manage your profile photo and cover.
                </p>
              </div>
            </header>

            <div className="profileMediaActions">

              <label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={event => {
                    const next =
                      event.target.files?.[0] ||
                      null;

                    setAvatarFile(next);

                    if (next) {
                      void uploadProfileMedia(
                        "avatar",
                        next
                      );
                    }

                    event.currentTarget.value =
                      "";
                  }}
                />

                <span>
                  <i>◎</i>

                  <span>
                    <b>
                      {details.avatar_url
                        ? "Change profile photo"
                        : "Add profile photo"}
                    </b>

                    <small>
                      JPG, PNG or WebP · Max 3 MB
                    </small>
                  </span>
                </span>
              </label>

              <label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={event => {
                    const next =
                      event.target.files?.[0] ||
                      null;

                    setCoverFile(next);

                    if (next) {
                      void uploadProfileMedia(
                        "cover",
                        next
                      );
                    }

                    event.currentTarget.value =
                      "";
                  }}
                />

                <span>
                  <i>▣</i>

                  <span>
                    <b>
                      {details.cover_url
                        ? "Change cover image"
                        : "Add cover image"}
                    </b>

                    <small>
                      Landscape image · Max 5 MB
                    </small>
                  </span>
                </span>
              </label>

            </div>

            {(details.avatar_url ||
              details.cover_url) && (
              <div className="profileMediaRemoveActions">

                {details.avatar_url && (
                  <button
                    type="button"
                    onClick={() =>
                      void removeProfileMedia(
                        "avatar"
                      )
                    }
                  >
                    Remove photo
                  </button>
                )}

                {details.cover_url && (
                  <button
                    type="button"
                    onClick={() =>
                      void removeProfileMedia(
                        "cover"
                      )
                    }
                  >
                    Remove cover
                  </button>
                )}

              </div>
            )}

          </section>


          <section className="professionalProfileCard profileAccountCard">

            <header className="profileSectionHeader compact">
              <div>
                <span>
                  ACCOUNT
                </span>

                <h3>
                  Campus status
                </h3>
              </div>
            </header>

            <div className="accountStatusRows">

              <div>
                <i className="success"/>
                <span>
                  <b>
                    Account verified
                  </b>
                  <small>
                    Campus authentication active
                  </small>
                </span>
              </div>

              <div>
                <i className="success"/>
                <span>
                  <b>
                    {profile.role}
                  </b>
                  <small>
                    Role-based access enabled
                  </small>
                </span>
              </div>

              <div>
                <i className="success"/>
                <span>
                  <b>
                    {profile.department}
                  </b>
                  <small>
                    Academic department
                  </small>
                </span>
              </div>

            </div>

          </section>

        </aside>

      </section>


      <section className="professionalProfileCard professionalDocumentVault">

        <header className="profileSectionHeader documentVaultHeader">

          <div>
            <span>
              PRIVATE DOCUMENTS
            </span>

            <h3>
              Document vault
            </h3>

            <p>
              Securely store your resume, certificates, marks cards and project documents.
            </p>
          </div>

          <b className="documentCount">
            {documents.length}
            {" "}
            {documents.length === 1
              ? "file"
              : "files"}
          </b>

        </header>


        <form
          className="professionalUploadRow"
          onSubmit={uploadDocument}
        >

          <select
            value={documentType}
            onChange={event =>
              setDocumentType(
                event.target.value
              )
            }
          >
            <option>
              Resume
            </option>
            <option>
              Certificate
            </option>
            <option>
              Marks card
            </option>
            <option>
              Project report
            </option>
            <option>
              ID document
            </option>
            <option>
              Other
            </option>
          </select>

          <label className="professionalFilePicker">

            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(
                event:
                  ChangeEvent<HTMLInputElement>
              ) =>
                setFile(
                  event.target.files?.[0] ||
                    null
                )
              }
            />

            <span>
              <i>
                ↑
              </i>

              <span>
                <b>
                  {file
                    ? file.name
                    : "Choose document"}
                </b>

                <small>
                  PDF, DOC, DOCX, PNG or JPG · Max 5 MB
                </small>
              </span>
            </span>

          </label>

          <button
            className="primary"
            disabled={
              !file ||
              uploadingDocument
            }
          >
            {uploadingDocument
              ? "Uploading..."
              : "Upload"}
          </button>

        </form>


        <div className="professionalDocumentList">

          {documents.map(
            document => (
              <article
                key={document.id}
                className="professionalDocumentRow"
              >

                <div className="documentFileIcon">
                  {document.file_name
                    .toLowerCase()
                    .endsWith(".pdf")
                    ? "PDF"
                    : document.file_name
                        .toLowerCase()
                        .match(
                          /\.(png|jpg|jpeg)$/
                        )
                    ? "IMG"
                    : "DOC"}
                </div>

                <div className="documentFileInfo">

                  <strong>
                    {document.file_name}
                  </strong>

                  <span>
                    {document.document_type}
                    {" · "}
                    {formatBytes(
                      document.file_size
                    )}
                    {" · "}
                    {new Date(
                      document.created_at
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </span>

                </div>

                <div className="documentActions">

                  <button
                    type="button"
                    onClick={() =>
                      void openDocument(
                        document
                      )
                    }
                  >
                    Open
                  </button>

                  <button
                    type="button"
                    className="danger"
                    onClick={() =>
                      void deleteDocument(
                        document
                      )
                    }
                  >
                    Delete
                  </button>

                </div>

              </article>
            )
          )}

          {!documents.length && (
            <div className="professionalDocumentEmpty">

              <div>
                ▤
              </div>

              <h4>
                Your document vault is empty
              </h4>

              <p>
                Upload your resume, academic records, certificates or project documents.
              </p>

            </div>
          )}

        </div>

      </section>


      {showPublicProfile && (
        <div
          className="publicProfileModalScrim"
          onClick={() =>
            setShowPublicProfile(false)
          }
        >

          <section
            className="publicProfileModal"
            onClick={event =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              className="publicProfileClose"
              onClick={() =>
                setShowPublicProfile(false)
              }
            >
              ×
            </button>


            <div
              className={`publicProfileCover ${
                details.cover_url
                  ? "hasImage"
                  : ""
              }`}
              style={
                details.cover_url
                  ? {
                      backgroundImage:
                        `linear-gradient(180deg, rgba(10,22,45,.15), rgba(10,22,45,.55)), url("${details.cover_url}")`,
                    }
                  : undefined
              }
            />


            <div className="publicProfileBody">

              <div className="publicProfileTop">

                <div className="publicProfileAvatar">
                  {details.avatar_url ? (
                    <img
                      src={details.avatar_url}
                      alt={`${profile.name} profile`}
                    />
                  ) : (
                    initials(profile.name)
                  )}
                </div>


                <div className="publicProfileVerification">
                  ✓ Verified CampusConnect profile
                </div>

              </div>


              <span className="publicProfileRole">
                {profile.role}
              </span>

              <h2>
                {profile.name}
              </h2>

              <p className="publicProfileHeadline">
                {profile.department}
                {profile.role === "Student" &&
                  profile.year &&
                  profile.year !== "Not set"
                  ? ` · Class of ${profile.year}`
                  : ""}
              </p>


              <div className="publicProfileUid">
                <span>
                  CAMPUSCONNECT UID
                </span>

                <b>
                  {details.campus_uid ||
                    profile.campus_uid ||
                    "Not assigned"}
                </b>
              </div>


              <section className="publicProfileAbout">

                <span>
                  ABOUT
                </span>

                <p>
                  {details.bio ||
                    "No public introduction has been added yet."}
                </p>

              </section>


              <section className="publicProfileSkills">

                <span>
                  SKILLS & INTERESTS
                </span>

                {skills.length ? (
                  <div>
                    {skills.map(
                      (skill, index) => (
                        <b
                          key={`${skill}-${index}`}
                        >
                          {skill}
                        </b>
                      )
                    )}
                  </div>
                ) : (
                  <p>
                    No skills added yet.
                  </p>
                )}

              </section>


              <div className="publicProfilePrivacyNote">

                <i>◇</i>

                <div>
                  <b>
                    Public CampusConnect profile
                  </b>

                  <span>
                    Phone number, private documents and account data are not shown publicly.
                  </span>
                </div>

              </div>

            </div>

          </section>

        </div>
      )}

    </div>
  );
}


type AdminProfile = {id: string; full_name: string; email: string; role: Role; department: string; graduation_year: string; created_at: string};
const emptyAdminProfiles: AdminProfile[]  = [];

function AdminModule({profile}: {profile: ModuleProfile}) {
  const [users, setUsers] =
    useState<AdminProfile[]>(emptyAdminProfiles);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  const [showCreateAccount, setShowCreateAccount] =
    useState(false);

  const [creatingAccount, setCreatingAccount] =
    useState(false);

  const [createForm, setCreateForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "Student" as Role,
    department: "ECE",
    graduation_year: "2027",
    employee_id: "",
  });

  const canManage =
    canManageUsersRole(profile.role);

  const loadUsers = async () => {
    if (!canManage) return;

    const client = getSupabaseClient();

    if (!client) {
      setStatus(
        "CampusConnect is not connected to Supabase."
      );
      return;
    }

    const {data, error} = await client
      .from("profiles")
      .select(
        "id,full_name,email,role,department,graduation_year,created_at"
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(300);

    if (error) {
      setStatus(error.message);
      return;
    }

    setUsers((data || []) as AdminProfile[]);
  };

  useEffect(() => {
    if (!canManage) return;

    void loadUsers();
  }, [canManage]);

  const updateCreateField = (
    key: keyof typeof createForm,
    value: string
  ) => {
    setCreateForm(current => ({
      ...current,
      [key]: value,
    }));
  };

  const createCampusAccount = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (!createForm.full_name.trim()) {
      return setStatus("Enter the user's full name.");
    }

    if (!createForm.email.trim()) {
      return setStatus(
        "Enter an institutional email address."
      );
    }

    if (createForm.password.length < 8) {
      return setStatus(
        "Temporary password must contain at least 8 characters."
      );
    }

    const client = getSupabaseClient();

    if (!client) {
      return setStatus(
        "CampusConnect is not connected to Supabase."
      );
    }

    setCreatingAccount(true);
    setStatus("");

    try {
      const {
        data: {session},
      } = await client.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your administrator session has expired. Sign in again."
        );
      }

      const response = await fetch(
        "/api/admin/users",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            full_name:
              createForm.full_name.trim(),

            email:
              createForm.email
                .trim()
                .toLowerCase(),

            password:
              createForm.password,

            role:
              createForm.role,

            department:
              createForm.department,

            graduation_year:
              createForm.graduation_year,

            employee_id:
              createForm.employee_id.trim(),
          }),
        }
      );

      const payload = (await response
        .json()
        .catch(() => ({}))) as {
          success?: boolean;

          error?: string;

          user?: {
            id: string;
            full_name: string;
            email: string;
            role: Role;
            department: string;
            graduation_year: string;
            account_status?: string;
          };
        };

      if (!response.ok) {
        throw new Error(
          payload.error ||
          "Unable to create CampusConnect account."
        );
      }

      if (payload.user) {
        setUsers(current => [
          {
            id: payload.user!.id,
            full_name:
              payload.user!.full_name,
            email:
              payload.user!.email,
            role:
              payload.user!.role,
            department:
              payload.user!.department,
            graduation_year:
              payload.user!.graduation_year,
            created_at:
              new Date().toISOString(),
          },
          ...current,
        ]);
      } else {
        await loadUsers();
      }

      setStatus(
        `${createForm.full_name.trim()} account created successfully.`
      );

      setCreateForm({
        full_name: "",
        email: "",
        password: "",
        role: "Student",
        department: "ECE",
        graduation_year: "2027",
        employee_id: "",
      });

      setShowCreateAccount(false);

    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to create campus account."
      );
    } finally {
      setCreatingAccount(false);
    }
  };

  const changeRole = async (
    user: AdminProfile,
    role: Role
  ) => {
    if (!canManage) return;

    if (user.email === profile.email) {
      return setStatus(
        "You cannot change your own Main Admin role from this screen."
      );
    }

    const client = getSupabaseClient();

    if (!client) {
      return setStatus(
        "CampusConnect is not connected to Supabase."
      );
    }

    const {error} = await client.rpc(
      "admin_update_campus_account",
      {
        p_user_id: user.id,
        p_role: role,
        p_account_status: "Active",
        p_employee_id: null,
        p_coordinator_scope: null,
        p_volunteer_scope: null,
      }
    );

    if (error) {
      return setStatus(error.message);
    }

    setUsers(current =>
      current.map(item =>
        item.id === user.id
          ? {...item, role}
          : item
      )
    );

    setStatus(
      `${user.full_name} is now assigned to ${role}.`
    );
  };

  const visible = users.filter(user =>
    `${user.full_name} ${user.email} ${user.department} ${user.role}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  if (!canManage) {
    return (
      <div className="moduleStack">
        <RestrictedModule
          title="Main Admin permission required"
          text="Account, role and platform administration is restricted to the Main Admin workspace."
        />
      </div>
    );
  }

  return (
    <div className="moduleStack adminWorkspace">

      <ModuleHero
        eyebrow="Access governance"
        title="Campus account management"
        copy="Create institutional accounts, assign verified roles and control CampusConnect access from one secure workspace."
        action={
          <button
            type="button"
            className="primary"
            onClick={() =>
              setShowCreateAccount(value => !value)
            }
          >
            {showCreateAccount
              ? "Close"
              : "+ Create account"}
          </button>
        }
      />

      {status && (
        <StatusLine text={status}/>
      )}

      {showCreateAccount && (
        <form
          className="adminCreateAccount card"
          onSubmit={createCampusAccount}
        >
          <header className="adminCreateHeader">
            <div>
              <span>NEW CAMPUS IDENTITY</span>
              <h3>Create login account</h3>

              <p>
                The user will be able to sign in immediately
                with the institutional email and temporary
                password you provide.
              </p>
            </div>

            <div className="adminSecureBadge">
              <span>⌾</span>
              Server secured
            </div>
          </header>

          <div className="adminAccountGrid">
            <Field label="Full name">
              <input
                value={createForm.full_name}
                onChange={event =>
                  updateCreateField(
                    "full_name",
                    event.target.value
                  )
                }
                placeholder="Student or staff full name"
                required
              />
            </Field>

            <Field label="Institutional email">
              <input
                type="email"
                value={createForm.email}
                onChange={event =>
                  updateCreateField(
                    "email",
                    event.target.value
                  )
                }
                placeholder="name@campusconnect.edu"
                required
              />
            </Field>

            <Field label="Role">
              <select
                value={createForm.role}
                onChange={event =>
                  updateCreateField(
                    "role",
                    event.target.value
                  )
                }
              >
                <option>Student</option>
                <option>Faculty</option>
                <option>Coordinator</option>
                <option>Volunteer</option>
                <option>Placement Cell</option>
                <option>Main Admin</option>
              </select>
            </Field>

            <Field label="Department">
              <select
                value={createForm.department}
                onChange={event =>
                  updateCreateField(
                    "department",
                    event.target.value
                  )
                }
              >
                <option>ECE</option>
                <option>CSE</option>
                <option>ISE</option>
                <option>EEE</option>
                <option>Mechanical</option>
                <option>Civil</option>
                <option>Career Development Centre</option>
                <option>Administration</option>
              </select>
            </Field>

            <Field label="Graduation year">
              <select
                value={createForm.graduation_year}
                onChange={event =>
                  updateCreateField(
                    "graduation_year",
                    event.target.value
                  )
                }
              >
                <option>2026</option>
                <option>2027</option>
                <option>2028</option>
                <option>2029</option>
                <option>2030</option>

                {createForm.role !== "Student" && (
                  <option>N/A</option>
                )}
              </select>
            </Field>

            <Field label="USN / Employee ID">
              <input
                value={createForm.employee_id}
                onChange={event =>
                  updateCreateField(
                    "employee_id",
                    event.target.value
                  )
                }
                placeholder={
                  createForm.role === "Student"
                    ? "1RN23EC000"
                    : "EMP-001"
                }
              />
            </Field>

            <Field label="Temporary password">
              <input
                type="password"
                value={createForm.password}
                onChange={event =>
                  updateCreateField(
                    "password",
                    event.target.value
                  )
                }
                placeholder="Minimum 8 characters"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </Field>
          </div>

          <div className="adminRolePreview">
            <span>ACCOUNT ACCESS</span>

            <strong>
              {createForm.role}
            </strong>

            <p>
              {createForm.role === "Student"
                ? "Student academics, placements, events, resources and communities."
                : createForm.role === "Faculty"
                ? "Faculty academic operations, attendance, assignments and approved resources."
                : createForm.role === "Coordinator"
                ? "Campus announcements, event creation and coordination operations."
                : createForm.role === "Volunteer"
                ? "Assigned event operations and attendee QR check-in."
                : createForm.role === "Placement Cell"
                ? "Recruitment drives, applications and placement operations."
                : "Full CampusConnect account and platform administration."}
            </p>
          </div>

          <div className="adminCreateActions">
            <button
              type="button"
              className="ghost"
              onClick={() =>
                setShowCreateAccount(false)
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary"
              disabled={creatingAccount}
            >
              {creatingAccount
                ? "Creating account..."
                : "Create Campus Account →"}
            </button>
          </div>
        </form>
      )}

      <section className="adminSummary">
        <MetricTile
          label="Total accounts"
          value={String(users.length)}
          note="Registered campus identities"
        />

        <MetricTile
          label="Students"
          value={String(
            users.filter(
              user => user.role === "Student"
            ).length
          )}
          note="Student workspace access"
        />

        <MetricTile
          label="Faculty"
          value={String(
            users.filter(
              user => user.role === "Faculty"
            ).length
          )}
          note="Academic staff access"
        />

        <MetricTile
          label="Operations"
          value={String(
            users.filter(user =>
              [
                "Coordinator",
                "Volunteer",
                "Placement Cell",
              ].includes(user.role)
            ).length
          )}
          note="Campus operational accounts"
        />
      </section>

      <section className="adminUsers card">
        <header>
          <div>
            <span>CAMPUS DIRECTORY</span>
            <h3>Accounts & permissions</h3>

            <p>
              Roles shown here control which CampusConnect
              workspace each account receives.
            </p>
          </div>

          <div className="adminDirectorySearch">
            <span>⌕</span>

            <input
              value={query}
              onChange={event =>
                setQuery(event.target.value)
              }
              placeholder="Search name, email, role or department"
            />
          </div>
        </header>

        <div className="adminTable">
          <div className="adminTableHead">
            <span>User</span>
            <span>Department</span>
            <span>Year</span>
            <span>Verified role</span>
          </div>

          {visible.map(user => (
            <div
              className="adminUserRow"
              key={user.id}
            >
              <div>
                <i>
                  {initials(user.full_name)}
                </i>

                <p>
                  <b>{user.full_name}</b>
                  <small>
                    {user.email ||
                      "Email unavailable"}
                  </small>
                </p>
              </div>

              <span>
                {user.department}
              </span>

              <span>
                {user.graduation_year}
              </span>

              <select
                value={user.role}
                onChange={event =>
                  void changeRole(
                    user,
                    event.target.value as Role
                  )
                }
                disabled={
                  user.email === profile.email
                }
              >
                <option>Student</option>
                <option>Faculty</option>
                <option>Coordinator</option>
                <option>Volunteer</option>
                <option>Placement Cell</option>
                <option>Main Admin</option>
              </select>
            </div>
          ))}

          {!visible.length && (
            <EmptyState
              title="No matching accounts"
              text="Try another name, email, department or role."
            />
          )}
        </div>
      </section>
    </div>
  );
}

function AnalyticsModule({profile}: {profile: ModuleProfile}) {
  const [metrics, setMetrics] = useState({announcements: 0, assignments: 0, applications: 0, groups: 0, resources: 0, attendance: 0});

  useEffect(() => {
    let active = true;
    const client = getSupabaseClient();
    if (!client) return;
    Promise.all([
      client.from("announcements").select("*", {count: "exact", head: true}),
      client.from("assignments").select("*", {count: "exact", head: true}),
      client.from("placement_applications").select("*", {count: "exact", head: true}),
      client.from("community_groups").select("*", {count: "exact", head: true}),
      client.from("learning_resources").select("*", {count: "exact", head: true}),
      client.from("attendance_records").select("attended,total"),
    ]).then(results => {
      if (!active || results.some(result => result.error)) return;
      const attendanceRows = (results[5].data || []) as {attended: number; total: number}[];
      const attended = attendanceRows.reduce((sum, row) => sum + row.attended, 0);
      const total = attendanceRows.reduce((sum, row) => sum + row.total, 0);
      setMetrics({announcements: results[0].count || 0, assignments: results[1].count || 0, applications: results[2].count || 0, groups: results[3].count || 0, resources: results[4].count || 0, attendance: total ? Math.round(attended / total * 100) : 0});
    });
    return () => { active = false; };
  }, []);

  const bars = [{label: "Profile readiness", value: profile.role === "Student" ? 78 : 92}, {label: "Academic engagement", value: metrics.attendance}, {label: "Resource activity", value: Math.min(100, metrics.resources * 2)}, {label: "Community participation", value: Math.min(100, metrics.groups * 8)}];
  return <div className="moduleStack"><ModuleHero eyebrow="Decision intelligence" title={profile.role === "Student" ? "Your progress analytics" : "Campus performance analytics"} copy="Turn academic, placement and community activity into clear action signals."/><section className="adminSummary"><MetricTile label="Announcements" value={String(metrics.announcements)} note="Visible verified updates"/><MetricTile label="Assignments" value={String(metrics.assignments)} note="Active tasks and coursework"/><MetricTile label="Applications" value={String(metrics.applications)} note="Recruitment pipeline records"/><MetricTile label="Learning assets" value={String(metrics.resources)} note="Videos and PYQ collections"/></section><section className="analyticsGrid"><div className="analyticsBars card"><header><span>ENGAGEMENT INDEX</span><h3>Workspace health</h3></header>{bars.map(bar => <div className="analyticsBar" key={bar.label}><p><span>{bar.label}</span><b>{bar.value}%</b></p><i><span style={{width: `${bar.value}%`}}/></i></div>)}</div><div className="analyticsInsight card"><span>PRIORITY SIGNAL</span><h3>{profile.role === "Student" ? "Finish the closest deadline first" : "Attendance intervention has the highest impact"}</h3><p>{profile.role === "Student" ? "Your placement readiness is strong. Completing the open assessment and one resume improvement gives the fastest gain." : "Students below 75% need early mentoring before internal assessments and placement eligibility checks."}</p><div><b>{metrics.attendance}%</b><small>attendance signal</small></div></div><div className="analyticsMix card"><header><span>PLATFORM MIX</span><h3>Connected activity</h3></header><div><i style={{"--value": `${Math.min(100, metrics.resources * 2)}%`} as CSSProperties}/><p><b>{metrics.groups}</b><small>communities</small></p><p><b>{metrics.resources}</b><small>resources</small></p></div></div></section></div>;
}

function ModuleHero({eyebrow, title, copy, action}: {eyebrow: string; title: string; copy: string; action?: ReactNode}) {
  return <section className="moduleHero"><div><span>{eyebrow}</span><h2>{title}</h2><p>{copy}</p></div>{action}</section>;
}

function Field({label, children}: {label: string; children: ReactNode}) { return <label className="moduleField"><span>{label}</span>{children}</label>; }
function FormHeading({title, text}: {title: string; text: string}) { return <header className="formHeading"><div><span>CREATE</span><h3>{title}</h3><p>{text}</p></div></header>; }
function FormActions({status, label, disabled}: {status: string; label: string; disabled?: boolean}) { return <div className="formActions"><span>{status}</span><button className="primary" disabled={disabled}>{label}</button></div>; }
function StatusLine({text}: {text: string}) {
  const isError =
    text.startsWith("ERROR:");

  const cleanText =
    isError
      ? text.replace(/^ERROR:\s*/, "")
      : text;

  return (
    <p
      className={
        isError
          ? "moduleStatus moduleStatusError"
          : "moduleStatus moduleStatusSuccess"
      }
      role={isError ? "alert" : "status"}
    >
      {isError ? "✕" : "✓"} {cleanText}
    </p>
  );
}
function EmptyState({title, text}: {title: string; text: string}) { return <div className="moduleEmpty"><i>◇</i><b>{title}</b><small>{text}</small></div>; }
function RestrictedModule({title, text}: {title: string; text: string}) { return <section className="restrictedModule card"><i>⌾</i><span>SECURE WORKSPACE</span><h2>{title}</h2><p>{text}</p></section>; }
function MetricTile({label, value, note}: {label: string; value: string; note: string}) { return <article className="metricTile card"><span>{label}</span><b>{value}</b><small>{note}</small></article>; }

function createLocalId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function friendlyDate(value: string) { const time = new Date(value).getTime(); const hours = Math.max(0, Math.round((Date.now() - time) / 3600000)); return hours < 1 ? "Just now" : hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("en-IN", {day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"}).format(new Date(value)); }
function isOverdue(value: string) { return new Date(value).getTime() < Date.now(); }
function daysUntil(value: string) { const days = Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)); return days === 0 ? "Due today" : `${days} day${days === 1 ? "" : "s"} left`; }
function initials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase()).join(""); }
function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function isWebUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:"; } catch { return false; } }
function isYouTubeUrl(value: string) { try { const host = new URL(value).hostname.replace(/^www\./, ""); return host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be"; } catch { return false; } }