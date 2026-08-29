"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSupabaseClient,
} from "../lib/supabase";

import "./campus-global-data-search.css";

type SearchRole =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";

type DataSearchTarget =
  | "Announcements"
  | "Assignments"
  | "Attendance"
  | "Applications"
  | "Learning"
  | "Groups"
  | "Placements"
  | "Campus"
  | "Activity Center"
  | "My Campus"
  | "Campus AI";

type SearchDefinition = {
  table: string;
  label: string;
  target: DataSearchTarget;
  icon: string;
  roles: SearchRole[];
};

type SearchRow =
  Record<string, unknown>;

type DatabaseSearchResult = {
  id: string;
  table: string;
  label: string;
  target: DataSearchTarget;
  icon: string;
  title: string;
  description: string;
  metadata: string;
  score: number;
};

const allRoles: SearchRole[] = [
  "Student",
  "Faculty",
  "Placement Cell",
  "Coordinator",
  "Volunteer",
  "Main Admin",
];

const professionalRoles:
  SearchRole[] = [
    "Faculty",
    "Placement Cell",
    "Coordinator",
    "Volunteer",
    "Main Admin",
  ];

const searchDefinitions:
  SearchDefinition[] = [
    {
      table: "announcements",
      label: "Announcement",
      target: "Announcements",
      icon: "N",
      roles: allRoles,
    },
    {
      table: "campus_notice_rail",
      label: "Important notice",
      target: "Announcements",
      icon: "!",
      roles: allRoles,
    },
    {
      table: "campus_events",
      label: "Campus event",
      target: "Campus",
      icon: "E",
      roles: allRoles,
    },
    {
      table: "learning_resources",
      label: "Learning resource",
      target: "Learning",
      icon: "L",
      roles: allRoles,
    },
    {
      table: "community_groups",
      label: "Community",
      target: "Groups",
      icon: "G",
      roles: allRoles,
    },
    {
      table: "campus_clubs",
      label: "Campus club",
      target: "Activity Center",
      icon: "C",
      roles: allRoles,
    },
    {
      table: "campus_sports",
      label: "Campus sport",
      target: "Activity Center",
      icon: "S",
      roles: allRoles,
    },
    {
      table: "assignments",
      label: "Assignment",
      target: "Assignments",
      icon: "A",
      roles: [
        "Student",
        "Faculty",
        "Main Admin",
      ],
    },
    {
      table: "attendance_sessions",
      label: "Attendance session",
      target: "Attendance",
      icon: "%",
      roles: [
        "Faculty",
        "Coordinator",
        "Main Admin",
      ],
    },
    {
      table: "placement_drives",
      label: "Placement drive",
      target: "Placements",
      icon: "P",
      roles: [
        "Student",
        "Placement Cell",
        "Main Admin",
      ],
    },
    {
      table: "placement_applications",
      label: "Placement application",
      target: "Applications",
      icon: "J",
      roles: [
        "Student",
        "Placement Cell",
        "Main Admin",
      ],
    },
    {
      table: "placement_interviews",
      label: "Placement interview",
      target: "Applications",
      icon: "I",
      roles: [
        "Placement Cell",
        "Main Admin",
      ],
    },
    {
      table: "placement_offers",
      label: "Placement offer",
      target: "Applications",
      icon: "O",
      roles: [
        "Placement Cell",
        "Main Admin",
      ],
    },
  ];

const searchableKeys = [
  "title",
  "subject",
  "subject_name",
  "subject_code",
  "name",
  "company",
  "role_title",
  "description",
  "short_description",
  "body",
  "message",
  "category",
  "notice_type",
  "resource_type",
  "status",
  "venue",
  "period_name",
  "topic",
  "department",
  "semester",
  "link_label",
];

function textValue(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : typeof value === "number"
    ? String(value)
    : "";
}

function firstValue(
  row: SearchRow,
  keys: string[]
): string {
  for (const key of keys) {
    const value =
      textValue(row[key]);

    if (value) {
      return value;
    }
  }

  return "";
}

function searchableText(
  row: SearchRow
): string {
  return searchableKeys
    .map(key =>
      textValue(row[key])
    )
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function resultTitle(
  row: SearchRow,
  definition: SearchDefinition
): string {
  const company =
    textValue(row.company);

  const position =
    textValue(row.role_title);

  if (company && position) {
    return `${company} · ${position}`;
  }

  return (
    firstValue(row, [
      "title",
      "subject",
      "subject_name",
      "name",
      "company",
      "period_name",
      "notice_type",
      "category",
    ]) ||
    definition.label
  );
}

function resultDescription(
  row: SearchRow
): string {
  return (
    firstValue(row, [
      "short_description",
      "description",
      "message",
      "body",
      "topic",
      "status",
      "category",
      "resource_type",
      "venue",
    ]) ||
    "Open the authorized CampusConnect record."
  ).slice(0, 180);
}

function resultMetadata(
  row: SearchRow,
  definition: SearchDefinition
): string {
  return [
    definition.label,
    textValue(row.status),
    textValue(row.department),
    textValue(row.semester),
    textValue(row.category),
  ]
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ");
}

function calculateScore(
  title: string,
  text: string,
  query: string
): number {
  const normalizedTitle =
    title.toLowerCase();

  if (normalizedTitle === query) {
    return 100;
  }

  if (
    normalizedTitle.startsWith(query)
  ) {
    return 80;
  }

  if (
    normalizedTitle.includes(query)
  ) {
    return 60;
  }

  if (text.includes(query)) {
    return 35;
  }

  return 0;
}

function rolePrompt(
  role: SearchRole,
  query: string
): string {
  const roleInstruction =
    role === "Student"
      ? "Use my authenticated academic, attendance, placement, learning and campus records."
      : role === "Faculty"
      ? "Use only coursework, attendance sessions, learning resources, announcements and teaching records authorized for my Faculty account."
      : role === "Placement Cell"
      ? "Use only placement drives, application pipeline, interview, offer and placement communication records authorized for my Placement Cell account."
      : role === "Coordinator"
      ? "Use only campus events, announcements, communities, clubs, sports and coordination records authorized for my Coordinator account."
      : role === "Volunteer"
      ? "Use only events, announcements, communities and activity records authorized for my Volunteer account."
      : "Use only operational records authorized for my Main Admin account and avoid exposing private personal information.";

  return [
    `Act as CampusConnect Global AI Search for my authenticated ${role} workspace.`,
    roleInstruction,
    `Search question: ${query}`,
    "Give a concise grounded answer, identify supporting CampusConnect source groups, clearly state missing information, and give no more than three relevant actions.",
  ].join(" ");
}

export default function
CampusGlobalDataSearch({
  role,
  query,
  onNavigate,
}: {
  role: SearchRole;
  query: string;
  onNavigate:
    (target: DataSearchTarget) =>
      void;
}) {
  const [results, setResults] =
    useState<
      DatabaseSearchResult[]
    >([]);

  const [loading, setLoading] =
    useState(false);

  const [searched, setSearched] =
    useState(false);

  const normalizedQuery =
    query.trim().toLowerCase();

  const definitions =
    useMemo(
      () =>
        searchDefinitions.filter(
          definition =>
            definition.roles.includes(
              role
            )
        ),
      [role]
    );

  useEffect(() => {
    if (
      normalizedQuery.length < 2
    ) {
      setResults([]);
      setLoading(false);
      setSearched(false);
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) {
      setResults([]);
      setLoading(false);
      setSearched(true);
      return;
    }

    let active = true;

    const timer =
      window.setTimeout(
        async () => {
          setLoading(true);

          const responses =
            await Promise.all(
              definitions.map(
                async definition => {
                  const {
                    data,
                    error,
                  } =
                    await client
                      .from(
                        definition.table
                      )
                      .select("*")
                      .limit(50);

                  if (error) {
                    console.warn(
                      `[Campus Global Search] ${definition.table}:`,
                      error.message
                    );

                    return {
                      definition,
                      rows:
                        [] as SearchRow[],
                    };
                  }

                  return {
                    definition,
                    rows:
                      (data || []) as
                        SearchRow[],
                  };
                }
              )
            );

          if (!active) {
            return;
          }

          const matches =
            responses.flatMap(
              ({
                definition,
                rows,
              }) =>
                rows.flatMap(
                  (row, index) => {
                    const text =
                      searchableText(row);

                    const title =
                      resultTitle(
                        row,
                        definition
                      );

                    const score =
                      calculateScore(
                        title,
                        text,
                        normalizedQuery
                      );

                    if (score === 0) {
                      return [];
                    }

                    return [{
                      id:
                        textValue(row.id) ||
                        `${definition.table}-${index}`,
                      table:
                        definition.table,
                      label:
                        definition.label,
                      target:
                        definition.target,
                      icon:
                        definition.icon,
                      title,
                      description:
                        resultDescription(
                          row
                        ),
                      metadata:
                        resultMetadata(
                          row,
                          definition
                        ),
                      score,
                    }];
                  }
                )
            )
              .sort(
                (a, b) =>
                  b.score - a.score
              )
              .slice(0, 20);

          setResults(matches);
          setLoading(false);
          setSearched(true);
        },
        320
      );

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    normalizedQuery,
    definitions,
  ]);

  if (
    normalizedQuery.length < 2
  ) {
    return null;
  }

  const askCampusAi = () => {
    window.sessionStorage.setItem(
      "campusconnect-ai-intent",
      JSON.stringify({
        mode: "general",
        prompt:
          rolePrompt(
            role,
            query.trim()
          ),
        createdAt: Date.now(),
      })
    );

    onNavigate("Campus AI");
  };

  return (
    <section className="campusGlobalSearch">
      <button
        type="button"
        className="campusGlobalAiAction"
        onClick={askCampusAi}
      >
        <span
          className="campusGlobalAiMark"
          aria-hidden="true"
        >
          ✦
        </span>

        <span className="campusGlobalAiCopy">
          <small>
            ROLE-AWARE AI SEARCH
          </small>

          <strong>
            Ask Campus AI about
            “{query.trim().slice(0, 80)}”
          </strong>

          <p>
            Uses only authenticated
            records available to your
            {` ${role} `}workspace.
          </p>
        </span>

        <span className="campusGlobalAiOpen">
          Ask AI
          <i aria-hidden="true">→</i>
        </span>
      </button>

      <header className="campusGlobalResultHeader">
        <span>
          <i aria-hidden="true" />
          AUTHORIZED RECORDS
        </span>

        <small>
          {loading
            ? "Searching Supabase…"
            : `${results.length} matched`}
        </small>
      </header>

      {loading ? (
        <div className="campusGlobalLoading">
          <i />
          <i />
          <i />
          Searching your authorized
          CampusConnect workspace…
        </div>
      ) : results.length ? (
        <div className="campusGlobalResults">
          {results.map(result => (
            <button
              type="button"
              key={`${result.table}-${result.id}`}
              onClick={() =>
                onNavigate(
                  result.target
                )
              }
            >
              <span className="campusGlobalResultIcon">
                {result.icon}
              </span>

              <span className="campusGlobalResultCopy">
                <b>{result.title}</b>

                <small>
                  {result.description}
                </small>
              </span>

              <span className="campusGlobalResultMeta">
                {result.metadata}
              </span>

              <strong
                aria-hidden="true"
              >
                →
              </strong>
            </button>
          ))}
        </div>
      ) : searched ? (
        <div className="campusGlobalEmpty">
          <span>⌕</span>

          <p>
            <b>
              No authorized database
              record matched
            </b>

            <small>
              Campus AI can still
              interpret the question and
              clearly identify unavailable
              information.
            </small>
          </p>

          <button
            type="button"
            onClick={askCampusAi}
          >
            Ask Campus AI
          </button>
        </div>
      ) : null}

      <footer className="campusGlobalSecurity">
        <span>
          <i aria-hidden="true" />
          Authenticated JWT
        </span>

        <span>
          Supabase RLS secured
        </span>

        <span>
          No cross-role access
        </span>
      </footer>
    </section>
  );
}
