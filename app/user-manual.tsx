"use client";

import {
  useMemo,
  useState,
} from "react";


type ManualRole =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";


type ManualNavigation =
  Partial<
    Record<
      ManualRole,
      readonly (
        readonly [
          string,
          string,
        ]
      )[]
    >
  >;


type GuideSeed = {
  category: string;
  summary: string;
  steps: string[];
  tip?: string;
};


type UserManualProps = {
  role: ManualRole;
  navigation: ManualNavigation;
  onOpen: (
    view: string
  ) => void;
};


const ROLES: ManualRole[] = [
  "Student",
  "Faculty",
  "Placement Cell",
  "Coordinator",
  "Volunteer",
  "Main Admin",
];


const ROLE_COPY: Record<
  ManualRole,
  {
    eyebrow: string;
    title: string;
    description: string;
  }
> = {

  Student: {
    eyebrow:
      "STUDENT GUIDE",

    title:
      "Your CampusConnect handbook",

    description:
      "Academics, campus life, opportunities and everyday student tools.",
  },


  Faculty: {
    eyebrow:
      "FACULTY GUIDE",

    title:
      "Faculty operating handbook",

    description:
      "Teaching, attendance, academic records and Faculty workspace tools.",
  },


  "Placement Cell": {
    eyebrow:
      "PLACEMENT CELL GUIDE",

    title:
      "Placement operations handbook",

    description:
      "Recruitment drives, applications and placement operations.",
  },


  Coordinator: {
    eyebrow:
      "COORDINATOR GUIDE",

    title:
      "Coordinator operations handbook",

    description:
      "Scheduling, announcements, campus activities and coordination tools.",
  },


  Volunteer: {
    eyebrow:
      "VOLUNTEER GUIDE",

    title:
      "Volunteer operations handbook",

    description:
      "Assigned events, attendee operations and campus coordination.",
  },


  "Main Admin": {
    eyebrow:
      "ADMINISTRATION GUIDE",

    title:
      "CampusConnect administrator handbook",

    description:
      "Accounts, access, academic controls and platform administration.",
  },

};


const GUIDE_LIBRARY: Record<
  string,
  GuideSeed
> = {

  Dashboard: {
    category:
      "Getting Started",

    summary:
      "Your role-aware overview of CampusConnect activity and quick actions.",

    steps: [
      "Open Dashboard from the sidebar.",
      "Review the cards and information prepared for your role.",
      "Check important updates, alerts and upcoming activity.",
      "Use a quick action to jump directly to the feature you need.",
    ],

    tip:
      "Dashboard content changes according to your CampusConnect role.",
  },


  "My Campus": {
    category:
      "Campus",

    summary:
      "Your personalized entry point to campus tools and services.",

    steps: [
      "Open My Campus.",
      "Review the available campus services.",
      "Choose the service or workspace you need.",
      "Use the provided action to open that service.",
    ],
  },


  "Campus Map": {
    category:
      "Campus",

    summary:
      "Navigate campus locations, blocks and important destinations.",

    steps: [
      "Open Campus Map.",
      "Choose the building or destination you want to reach.",
      "Select the destination to display its route.",
      "Follow the displayed path and movement indicator.",
      "Choose another location whenever you need a new route.",
    ],

    tip:
      "Use the map for blocks, facilities and campus navigation.",
  },


  "Campus AI": {
    category:
      "AI & Productivity",

    summary:
      "Ask Campus AI questions about CampusConnect or general topics.",

    steps: [
      "Open Campus AI.",
      "Enter your question in the chat box.",
      "Send the message.",
      "Review the response and any campus context shown.",
      "Continue the conversation with a follow-up question.",
    ],
  },


  Announcements: {
    category:
      "Communication",

    summary:
      "Read important campus notices and authorized announcements.",

    steps: [
      "Open Announcements.",
      "Browse the latest notices.",
      "Open an announcement to read its full details.",
      "Check dates, audience and attachments when available.",
    ],
  },


  Assignments: {
    category:
      "Academics",

    summary:
      "Work with academic assignments available to your role.",

    steps: [
      "Open Assignments.",
      "Select the relevant course or assignment.",
      "Review its instructions and deadline.",
      "Complete the available action for your role.",
      "Return to the assignment list to confirm its latest status.",
    ],
  },


  Attendance: {
    category:
      "Academics",

    summary:
      "Work with attendance records and sessions according to your role.",

    steps: [
      "Open Attendance.",
      "Select the relevant class, batch or attendance record.",
      "Review the available attendance information.",
      "Complete the attendance action available to your role.",
      "Confirm that the latest attendance state is shown.",
    ],
  },


  Placements: {
    category:
      "Career",

    summary:
      "Access recruitment and placement opportunities.",

    steps: [
      "Open Placements.",
      "Review available drives or opportunities.",
      "Open an item to see eligibility and details.",
      "Complete the action available to your role.",
      "Return to Placements to track the latest state.",
    ],
  },


  Applications: {
    category:
      "Career",

    summary:
      "Track or manage applications connected to placement opportunities.",

    steps: [
      "Open Applications.",
      "Select the application or candidate record.",
      "Review its current status and details.",
      "Perform the available action for your role.",
      "Confirm that the application status has updated.",
    ],
  },


  Learning: {
    category:
      "Learning",

    summary:
      "Find and manage department-scoped learning resources.",

    steps: [
      "Open Learning.",
      "Choose an available department or branch.",
      "Select the semester or resource area you need.",
      "Open the learning material.",
      "If your role can publish, use Add Resource and complete the resource form.",
    ],

    tip:
      "Students see their department resources. Faculty can publish only to departments assigned by Main Admin.",
  },


  Groups: {
    category:
      "Community",

    summary:
      "Participate in CampusConnect groups and communities.",

    steps: [
      "Open Groups.",
      "Browse available groups or your existing memberships.",
      "Open a group to view its activity.",
      "Use the available join, post or interaction controls.",
    ],
  },


  "Notes & Tasks": {
    category:
      "Productivity",

    summary:
      "Keep personal notes, reminders and tasks organized.",

    steps: [
      "Open Notes & Tasks.",
      "Create or open a note or task.",
      "Add the information you need.",
      "Save the item.",
      "Use the list to review or update it later.",
    ],
  },


  Network: {
    category:
      "Community",

    summary:
      "Discover and interact with your CampusConnect network.",

    steps: [
      "Open Network.",
      "Browse people or network activity.",
      "Open a profile or network item.",
      "Use the available CampusConnect interaction controls.",
    ],
  },


  Resume: {
    category:
      "Career",

    summary:
      "Build and improve your resume using CampusConnect tools.",

    steps: [
      "Open Resume.",
      "Review your current resume information.",
      "Add or update your academic and professional details.",
      "Use available improvement or scoring tools.",
      "Save or export when the resume is ready.",
    ],
  },


  Academics: {
    category:
      "Academics",

    summary:
      "Access academic information such as subjects, marks, results and timetable.",

    steps: [
      "Open Academics.",
      "Choose the academic tab you need.",
      "Review the available records.",
      "Open a specific record for more detail.",
      "Use the permitted academic action for your role.",
    ],
  },


  Calendar: {
    category:
      "Planning",

    summary:
      "See campus events, academic dates and important schedule information.",

    steps: [
      "Open Calendar.",
      "Move to the date or month you want.",
      "Select an event or calendar entry.",
      "Review its date, time and details.",
      "Use available reminders or actions when shown.",
    ],
  },


  Campus: {
    category:
      "Campus",

    summary:
      "Explore Campus Life, activities and institutional highlights.",

    steps: [
      "Open Campus.",
      "Browse the available Campus Life sections.",
      "Choose an event, achievement, community or campus item.",
      "Open it to view its full information.",
    ],
  },


  Alumni: {
    category:
      "Campus",

    summary:
      "Explore alumni profiles and achievements.",

    steps: [
      "Open Alumni.",
      "Browse available alumni profiles.",
      "Select an alumnus to read more.",
      "Review their graduation and professional information when available.",
    ],
  },


  "Activity Center": {
    category:
      "Campus Operations",

    summary:
      "Access campus activities and operational event workflows.",

    steps: [
      "Open Activity Center.",
      "Select the activity or event you need.",
      "Review its current information.",
      "Use the action available to your CampusConnect role.",
      "Confirm the updated activity state.",
    ],
  },


  "Faculty Directory": {
    category:
      "Campus",

    summary:
      "Find Faculty information through the campus directory.",

    steps: [
      "Open Faculty Directory.",
      "Search or browse Faculty members.",
      "Select a Faculty profile.",
      "Review the available professional and department information.",
    ],
  },


  "Seva Kendra": {
    category:
      "Campus Services",

    summary:
      "Submit and track supported campus service requests.",

    steps: [
      "Open Seva Kendra.",
      "Choose the request or service type you need.",
      "Complete the required request details.",
      "Submit the request.",
      "Return later to review its latest status or issued pass.",
    ],
  },


  "College ID": {
    category:
      "Campus Services",

    summary:
      "Access supported CampusConnect college identity features.",

    steps: [
      "Open College ID.",
      "Review your available college identity information.",
      "Use the available ID, scanner or verification action.",
      "Follow the on-screen result or verification status.",
    ],
  },


  Marketplace: {
    category:
      "Campus",

    summary:
      "Browse supported campus marketplace listings.",

    steps: [
      "Open Marketplace.",
      "Browse or search available listings.",
      "Open an item for details.",
      "Use the available interaction for that listing.",
    ],
  },


  Profile: {
    category:
      "Account",

    summary:
      "Review and maintain your CampusConnect profile.",

    steps: [
      "Open Profile.",
      "Review your personal and academic information.",
      "Choose Edit Profile when changes are permitted.",
      "Update the fields available to your role.",
      "Save and confirm the updated profile.",
    ],

    tip:
      "Protected role and Faculty department assignments are controlled by Main Admin.",
  },


  "About CampusConnect": {
    category:
      "Getting Started",

    summary:
      "Learn what CampusConnect provides and how the platform is organized.",

    steps: [
      "Open About CampusConnect.",
      "Review the platform overview.",
      "Explore the available product information.",
      "Return to the sidebar to continue using CampusConnect.",
    ],
  },


  "Faculty Workspace": {
    category:
      "Faculty",

    summary:
      "Your central teaching workspace for classes, batches and academic actions.",

    steps: [
      "Open Faculty Workspace.",
      "Review your Faculty overview and assigned teaching information.",
      "Choose Today’s Classes, My Batches, Attendance, Syllabus Progress or another Faculty action.",
      "Open the required workspace.",
      "Complete the academic task and return to Faculty Workspace when finished.",
    ],
  },


  "Today's Classes": {
    category:
      "Faculty",

    summary:
      "See today’s classes from the published timetable.",

    steps: [
      "Open Today’s Classes.",
      "Review the classes scheduled for today.",
      "Select the class you need.",
      "Use the available Attendance, Batch or Syllabus action.",
      "Return to Today’s Classes for your next session.",
    ],
  },


  "My Teaching Schedule": {
    category:
      "Faculty",

    summary:
      "Review your teaching timetable and scheduled academic sessions.",

    steps: [
      "Open My Teaching Schedule.",
      "Review your timetable.",
      "Locate the day and period you need.",
      "Open the relevant schedule item for its class details.",
    ],
  },


  "My Batches": {
    category:
      "Faculty",

    summary:
      "View batches and subjects assigned to you.",

    steps: [
      "Open My Batches.",
      "Choose one of your assigned batches.",
      "Review its subjects and teaching information.",
      "Open the batch or subject action you need.",
      "Continue to attendance, academics or another authorized workflow.",
    ],
  },


  "Faculty Diary": {
    category:
      "Faculty",

    summary:
      "Maintain your teaching and academic activity record.",

    steps: [
      "Open Faculty Diary.",
      "Choose the date or academic record you need.",
      "Enter the teaching or activity information.",
      "Save the diary record.",
      "Review previous records when required.",
    ],
  },


  "Syllabus Progress": {
    category:
      "Faculty",

    summary:
      "Track completion of syllabus units and topics.",

    steps: [
      "Open Syllabus Progress.",
      "Select your assigned subject or batch.",
      "Review units and topics.",
      "Update the completion state for the work covered.",
      "Save and confirm the latest progress.",
    ],
  },


  "Faculty Workload": {
    category:
      "Faculty Operations",

    summary:
      "Review Faculty teaching allocation and workload information.",

    steps: [
      "Open Faculty Workload.",
      "Review the Faculty or allocation shown.",
      "Check subjects, batches and workload values.",
      "Use the available management action if your role permits it.",
    ],
  },


  "Faculty Availability": {
    category:
      "Faculty Operations",

    summary:
      "Review and manage Faculty availability information.",

    steps: [
      "Open Faculty Availability.",
      "Choose the Faculty member or availability period.",
      "Review the available schedule information.",
      "Update availability when your role permits it.",
      "Save the latest state.",
    ],
  },


  "Faculty Coverage": {
    category:
      "Faculty Operations",

    summary:
      "Coordinate Faculty coverage and teaching continuity.",

    steps: [
      "Open Faculty Coverage.",
      "Review the class or coverage requirement.",
      "Check eligible Faculty information.",
      "Choose the available coverage action.",
      "Confirm the resulting assignment.",
    ],
  },


  "Timetable Coordinator": {
    category:
      "Scheduling",

    summary:
      "Build, review and coordinate academic timetable operations.",

    steps: [
      "Open Timetable Coordinator.",
      "Choose the scheduling or timetable workspace you need.",
      "Review batches, periods and timetable information.",
      "Make the permitted scheduling change.",
      "Validate the result before publishing or applying it.",
    ],
  },


  "Timetable Assignment": {
    category:
      "Administration",

    summary:
      "Assign and manage timetable coordination authority.",

    steps: [
      "Open Timetable Assignment.",
      "Find the coordinator or assignment target.",
      "Choose the appropriate timetable responsibility.",
      "Apply the assignment.",
      "Review the updated coordination state.",
    ],
  },


  "Academic Control": {
    category:
      "Administration",

    summary:
      "Main Admin workspace for centralized academic operations.",

    steps: [
      "Open Academic Control.",
      "Choose Faculty allocation or Timetable Automation.",
      "Review the academic configuration.",
      "Make the required administrative change.",
      "Validate the result before leaving the workspace.",
    ],
  },


  Analytics: {
    category:
      "Administration",

    summary:
      "Review CampusConnect operational and academic analytics.",

    steps: [
      "Open Analytics.",
      "Choose the metric or section you want to inspect.",
      "Review the displayed totals and trends.",
      "Use filters when available to narrow the information.",
    ],
  },


  Admin: {
    category:
      "Administration",

    summary:
      "Manage CampusConnect accounts, permissions and Faculty department access.",

    steps: [
      "Open Admin.",
      "Review account summary information.",
      "Use Faculty Departments to assign one or more departments to Faculty.",
      "Open Accounts & permissions when you need the campus account directory.",
      "Create or update CampusConnect accounts using the authorized controls.",
    ],

    tip:
      "Faculty department assignments are controlled by Main Admin and are used by Learning Resources and Faculty profile context.",
  },


  Library: {
    category:
      "Learning",

    summary:
      "Access library information and supported learning material.",

    steps: [
      "Open Library.",
      "Search or browse the available library information.",
      "Select the resource you need.",
      "Review or open the available material.",
    ],
  },


  Fees: {
    category:
      "Campus Services",

    summary:
      "Review supported CampusConnect fee information.",

    steps: [
      "Open Fees.",
      "Review the available fee records.",
      "Open a record for its details.",
      "Follow the supported status or payment information shown.",
    ],
  },


  Notifications: {
    category:
      "Communication",

    summary:
      "Review CampusConnect notifications and important updates.",

    steps: [
      "Open Notifications.",
      "Review unread or recent notifications.",
      "Open a notification for details.",
      "Follow its related action when available.",
    ],
  },

};


function fallbackGuide(
  view: string
): GuideSeed {

  return {
    category:
      "CampusConnect",

    summary:
      `${view} is available in your CampusConnect workspace.`,

    steps: [
      `Open ${view} from the sidebar.`,
      `Review the information and controls available in ${view}.`,
      "Choose the item or action you need.",
      "Follow the on-screen workflow.",
      "Confirm the result before leaving the feature.",
    ],

    tip:
      "This feature was automatically discovered from CampusConnect navigation. Add dedicated manual metadata when more detailed instructions are needed.",
  };

}


function roleAwareGuide(
  view: string,
  role: ManualRole
): GuideSeed {

  if (
    view ===
    "Attendance"
  ) {

    if (
      role ===
      "Faculty"
    ) {

      return {
        category:
          "Faculty",

        summary:
          "Take and manage attendance for classes you are authorized to teach.",

        steps: [
          "Open Attendance.",
          "Choose your assigned batch and subject.",
          "Open or start the attendance session.",
          "Mark the students using the available attendance controls.",
          "Review the attendance before submission.",
          "Submit the session and confirm that it was saved.",
        ],

        tip:
          "Batch access is controlled by actual teaching assignments, not only by department.",
      };

    }


    if (
      role ===
      "Student"
    ) {

      return {
        category:
          "Academics",

        summary:
          "Review your attendance information and academic attendance history.",

        steps: [
          "Open Attendance.",
          "Review your attendance summary.",
          "Choose a subject when subject-level information is available.",
          "Review the recorded sessions and attendance status.",
        ],
      };

    }

  }


  if (
    view ===
    "Placements" &&
    role ===
      "Placement Cell"
  ) {

    return {
      category:
        "Placement Operations",

      summary:
        "Create and manage recruitment opportunities for CampusConnect students.",

      steps: [
        "Open Placements.",
        "Choose the recruitment or drive management action.",
        "Enter the company, role, eligibility and deadline information.",
        "Review the drive before publishing.",
        "Publish or update the drive.",
        "Use Applications to review participating candidates.",
      ],
    };

  }


  if (
    view ===
      "Learning" &&
    role ===
      "Faculty"
  ) {

    return {
      ...GUIDE_LIBRARY.Learning,

      steps: [
        "Open Learning.",
        "Choose one of the departments assigned to you by Main Admin.",
        "Choose the relevant semester.",
        "Browse existing department resources.",
        "Select Add Resource when you need to publish material.",
        "Complete the resource information and upload the supported file.",
        "Submit the resource and confirm it appears in the correct department.",
      ],
    };

  }


  return (
    GUIDE_LIBRARY[
      view
    ] ||
    fallbackGuide(
      view
    )
  );

}


function initials(
  role: string
) {

  return role
    .split(
      /\s+/
    )
    .map(
      item =>
        item[0]
    )
    .join("")
    .slice(
      0,
      2
    )
    .toUpperCase();

}


export default function UserManual({
  role,
  navigation,
  onOpen,
}: UserManualProps) {

  const [
    previewRole,
    setPreviewRole,
  ] =
    useState<ManualRole>(
      role
    );


  const [
    query,
    setQuery,
  ] =
    useState("");


  const [
    selectedView,
    setSelectedView,
  ] =
    useState("");


  const effectiveRole =
    role ===
      "Main Admin"
      ? previewRole
      : role;


  const features =
    useMemo(
      () => {

        const items =
          navigation[
            effectiveRole
          ] ||
          [];


        const seen =
          new Set<string>();


        return items
          .filter(
            ([view]) =>
              view !==
                "User Manual"
          )
          .filter(
            ([view]) => {

              if (
                seen.has(
                  view
                )
              ) {
                return false;
              }


              seen.add(
                view
              );

              return true;

            }
          )
          .map(
            ([
              view,
              icon,
            ]) => {

              const guide =
                roleAwareGuide(
                  view,
                  effectiveRole
                );


              return {
                view,
                icon,
                guide,
                documented:
                  Boolean(
                    GUIDE_LIBRARY[
                      view
                    ]
                  ) ||
                  (
                    view ===
                      "Attendance"
                  ) ||
                  (
                    view ===
                      "Placements"
                  ),
              };

            }
          );

      },
      [
        navigation,
        effectiveRole,
      ]
    );


  const visibleFeatures =
    useMemo(
      () => {

        const needle =
          query
            .trim()
            .toLowerCase();


        if (!needle) {
          return features;
        }


        return features.filter(
          feature =>
            [
              feature.view,
              feature.guide.category,
              feature.guide.summary,
              ...feature.guide.steps,
            ]
              .join(" ")
              .toLowerCase()
              .includes(
                needle
              )
        );

      },
      [
        query,
        features,
      ]
    );


  const activeFeature =
    visibleFeatures.find(
      item =>
        item.view ===
          selectedView
    ) ||
    visibleFeatures[0] ||
    features.find(
      item =>
        item.view ===
          selectedView
    ) ||
    features[0] ||
    null;


  const currentRoleCopy =
    ROLE_COPY[
      effectiveRole
    ];


  const documentedCount =
    features.filter(
      item =>
        item.documented
    ).length;


  const canOpen =
    effectiveRole ===
      role;


  return (

    <div className="ccManual">

      {/* =====================================================
          HERO
         ===================================================== */}

      <section className="ccManualHero">

        <div className="ccManualHeroGlow one" />
        <div className="ccManualHeroGlow two" />


        <div className="ccManualHeroMain">

          <div className="ccManualRoleIcon">

            {initials(
              effectiveRole
            )}

          </div>


          <div>

            <span className="ccManualEyebrow">

              {currentRoleCopy.eyebrow}

            </span>


            <h1>
              {currentRoleCopy.title}
            </h1>


            <p>
              {currentRoleCopy.description}
            </p>

          </div>

        </div>


        <div className="ccManualHeroMeta">

          <div>

            <strong>
              {features.length}
            </strong>

            <span>
              features
            </span>

          </div>


          <div>

            <strong>
              {documentedCount}
            </strong>

            <span>
              detailed guides
            </span>

          </div>

        </div>

      </section>


      {/* =====================================================
          AUTO SYNC
         ===================================================== */}

      <section className="ccManualSync">

        <div className="ccManualSyncIcon">
          ↻
        </div>


        <div>

          <strong>
            Automatically synced with CampusConnect
          </strong>

          <span>
            New features added to this role&apos;s navigation automatically appear in this manual.
          </span>

        </div>


        <span className="ccManualLiveBadge">
          LIVE GUIDE
        </span>

      </section>


      {/* =====================================================
          TOOLBAR
         ===================================================== */}

      <section className="ccManualToolbar">

        <label className="ccManualSearch">

          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="8"
            />

            <path
              d="m21 21-4.35-4.35"
            />

          </svg>


          <input
            value={query}
            onChange={
              event =>
                setQuery(
                  event.target.value
                )
            }
            placeholder="Search a feature or ask how to use it..."
          />

        </label>


        {role ===
          "Main Admin" && (

          <label className="ccManualRolePreview">

            <span>
              Preview manual
            </span>


            <select
              value={
                previewRole
              }
              onChange={
                event => {

                  setPreviewRole(
                    event.target
                      .value as
                        ManualRole
                  );

                  setSelectedView(
                    ""
                  );

                  setQuery(
                    ""
                  );

                }
              }
            >

              {ROLES.map(
                roleOption => (

                  <option
                    key={
                      roleOption
                    }
                    value={
                      roleOption
                    }
                  >
                    {roleOption}
                  </option>

                )
              )}

            </select>

          </label>

        )}

      </section>


      {/* =====================================================
          MANUAL WORKSPACE
         ===================================================== */}

      <section className="ccManualWorkspace">

        {/* FEATURE NAV */}

        <aside className="ccManualFeatureNav">

          <div className="ccManualFeatureNavHead">

            <span>
              FEATURES
            </span>

            <b>
              {visibleFeatures.length}
            </b>

          </div>


          <div className="ccManualFeatureList">

            {visibleFeatures.map(
              feature => (

                <button
                  type="button"
                  key={
                    feature.view
                  }
                  className={
                    activeFeature?.view ===
                      feature.view
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setSelectedView(
                      feature.view
                    )
                  }
                >

                  <i>
                    {feature.icon}
                  </i>


                  <span>

                    <strong>
                      {feature.view}
                    </strong>

                    <small>
                      {feature.guide.category}
                    </small>

                  </span>


                  {!feature.documented && (

                    <em
                      title="Auto-discovered feature"
                    >
                      AUTO
                    </em>

                  )}


                  <b>
                    ›
                  </b>

                </button>

              )
            )}


            {!visibleFeatures.length && (

              <div className="ccManualNoResults">

                <i>
                  ◇
                </i>

                <strong>
                  No guide found
                </strong>

                <span>
                  Try another feature or keyword.
                </span>

              </div>

            )}

          </div>

        </aside>


        {/* GUIDE */}

        <main className="ccManualGuide">

          {activeFeature ? (

            <>

              <header className="ccManualGuideHeader">

                <div>

                  <span>
                    {activeFeature.guide.category}
                  </span>

                  <h2>
                    {activeFeature.view}
                  </h2>

                  <p>
                    {activeFeature.guide.summary}
                  </p>

                </div>


                {canOpen ? (

                  <button
                    type="button"
                    className="ccManualOpenFeature"
                    onClick={() =>
                      onOpen(
                        activeFeature.view
                      )
                    }
                  >
                    Open feature
                    <span>
                      →
                    </span>
                  </button>

                ) : (

                  <span className="ccManualPreviewOnly">
                    Role preview
                  </span>

                )}

              </header>


              {/* STEPS */}

              <section className="ccManualSteps">

                <div className="ccManualSectionHeading">

                  <span>
                    STEP-BY-STEP
                  </span>

                  <h3>
                    How to use {activeFeature.view}
                  </h3>

                </div>


                <div className="ccManualStepList">

                  {activeFeature.guide.steps.map(
                    (
                      step,
                      index
                    ) => (

                      <article
                        key={
                          `${activeFeature.view}-${index}`
                        }
                        className="ccManualStep"
                      >

                        <div className="ccManualStepNumber">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </div>


                        <div>

                          <small>
                            STEP {index + 1}
                          </small>

                          <p>
                            {step}
                          </p>

                        </div>

                      </article>

                    )
                  )}

                </div>

              </section>


              {/* VISUAL FLOW */}

              <section className="ccManualDiagram">

                <div className="ccManualSectionHeading">

                  <span>
                    VISUAL GUIDE
                  </span>

                  <h3>
                    Workflow diagram
                  </h3>

                </div>


                <div className="ccManualFlow">

                  {activeFeature.guide.steps
                    .slice(
                      0,
                      6
                    )
                    .map(
                      (
                        step,
                        index,
                        list
                      ) => (

                        <div
                          className="ccManualFlowUnit"
                          key={
                            `flow-${activeFeature.view}-${index}`
                          }
                        >

                          <div className="ccManualFlowNode">

                            <span>
                              {index + 1}
                            </span>

                            <strong>
                              {step}
                            </strong>

                          </div>


                          {index <
                            list.length -
                              1 && (

                            <div
                              className="ccManualFlowArrow"
                              aria-hidden="true"
                            >
                              ↓
                            </div>

                          )}

                        </div>

                      )
                    )}

                </div>

              </section>


              {activeFeature.guide.tip && (

                <aside className="ccManualTip">

                  <div>
                    i
                  </div>

                  <p>
                    <strong>
                      Good to know
                    </strong>

                    <span>
                      {activeFeature.guide.tip}
                    </span>
                  </p>

                </aside>

              )}


              {!activeFeature.documented && (

                <aside className="ccManualAutoGuide">

                  <span>
                    AUTO-DETECTED
                  </span>

                  <p>
                    This feature was discovered automatically from the role navigation. It will never be missing from the manual, even before a custom guide is written.
                  </p>

                </aside>

              )}

            </>

          ) : (

            <div className="ccManualEmpty">

              <i>
                ?
              </i>

              <h3>
                No features available
              </h3>

              <p>
                There are currently no navigation features available for this role.
              </p>

            </div>

          )}

        </main>

      </section>

    </div>

  );

}
