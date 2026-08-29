type RoleContextRow =
  Record<string, unknown>;

export type RoleAiSource = {
  key: string;
  label: string;
  count: number;
};

export type RoleAiContext = {
  context: string;
  sources: RoleAiSource[];
};

const SUPABASE_URL =
  process.env
    .NEXT_PUBLIC_SUPABASE_URL
    ?.trim()
    .replace(/\/$/, "") || "";

const PUBLISHABLE_KEY =
  process.env
    .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?.trim() || "";

const STAFF_ROLES = new Set([
  "Faculty",
  "Placement Cell",
  "Coordinator",
  "Volunteer",
  "Main Admin",
]);

const PRIVATE_FIELDS = new Set([
  "password",
  "password_hash",
  "access_token",
  "refresh_token",
  "email",
  "phone",
  "campus_uid",
  "usn",
  "student_id",
  "owner_id",
  "author_id",
  "created_by",
  "updated_by",
  "file_path",
  "storage_path",
]);

function sanitizedRow(
  row: RoleContextRow
): RoleContextRow {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => {
        const normalized =
          key.toLowerCase();

        return (
          !PRIVATE_FIELDS.has(normalized) &&
          !normalized.endsWith("_token") &&
          !normalized.includes("password")
        );
      })
      .slice(0, 24)
      .map(([key, value]) => {
        if (
          typeof value === "string"
        ) {
          return [
            key,
            value.slice(0, 280),
          ];
        }

        return [key, value];
      })
  );
}

async function readRows(
  table: string,
  accessToken: string,
  limit = 6
): Promise<RoleContextRow[]> {
  if (
    !SUPABASE_URL ||
    !PUBLISHABLE_KEY
  ) {
    return [];
  }

  try {
    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=${limit}`,
        {
          headers: {
            apikey:
              PUBLISHABLE_KEY,
            Authorization:
              `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

    if (!response.ok) {
      console.warn(
        `[CampusConnect AI] role dataset ${table} unavailable: ${response.status}`
      );

      return [];
    }

    const rows =
      await response.json() as
        RoleContextRow[];

    return Array.isArray(rows)
      ? rows.map(sanitizedRow)
      : [];
  } catch (error) {
    console.warn(
      `[CampusConnect AI] role dataset ${table} failed:`,
      error
    );

    return [];
  }
}

function roleDatasets(
  role: string
): Array<{
  table: string;
  label: string;
}> {
  if (role === "Faculty") {
    return [
      {
        table: "assignments",
        label:
          "Authorized coursework records",
      },
      {
        table: "attendance_sessions",
        label:
          "Authorized attendance sessions",
      },
      {
        table: "learning_resources",
        label:
          "Authorized learning resources",
      },
      {
        table: "announcements",
        label:
          "Authorized announcements",
      },
    ];
  }

  if (
    role === "Placement Cell"
  ) {
    return [
      {
        table: "placement_drives",
        label:
          "Authorized placement drives",
      },
      {
        table:
          "placement_applications",
        label:
          "Authorized application pipeline records",
      },
      {
        table:
          "placement_interviews",
        label:
          "Authorized interview records",
      },
      {
        table: "placement_offers",
        label:
          "Authorized offer records",
      },
      {
        table: "announcements",
        label:
          "Authorized placement announcements",
      },
    ];
  }

  if (
    role === "Coordinator"
  ) {
    return [
      {
        table: "campus_events",
        label:
          "Authorized campus events",
      },
      {
        table: "announcements",
        label:
          "Authorized announcements",
      },
      {
        table: "community_groups",
        label:
          "Authorized community groups",
      },
      {
        table: "campus_clubs",
        label:
          "Authorized campus clubs",
      },
      {
        table: "campus_sports",
        label:
          "Authorized campus sports",
      },
    ];
  }

  if (role === "Volunteer") {
    return [
      {
        table: "campus_events",
        label:
          "Visible campus events",
      },
      {
        table: "announcements",
        label:
          "Visible announcements",
      },
      {
        table: "community_groups",
        label:
          "Visible community groups",
      },
      {
        table: "campus_clubs",
        label:
          "Visible campus clubs",
      },
      {
        table: "campus_sports",
        label:
          "Visible campus sports",
      },
    ];
  }

  if (role === "Main Admin") {
    return [
      {
        table: "announcements",
        label:
          "Authorized platform announcements",
      },
      {
        table: "campus_events",
        label:
          "Authorized campus events",
      },
      {
        table: "community_groups",
        label:
          "Authorized community groups",
      },
      {
        table: "learning_resources",
        label:
          "Authorized learning resources",
      },
      {
        table: "placement_drives",
        label:
          "Authorized placement drives",
      },
    ];
  }

  return [];
}

export async function
buildRoleAiContext(
  accessToken: string,
  userId: string,
  role: string
): Promise<RoleAiContext> {
  if (
    !userId ||
    !STAFF_ROLES.has(role)
  ) {
    return {
      context: "",
      sources: [],
    };
  }

  const definitions =
    roleDatasets(role);

  const datasets =
    await Promise.all(
      definitions.map(
        async definition => ({
          ...definition,
          rows:
            await readRows(
              definition.table,
              accessToken
            ),
        })
      )
    );

  const available =
    datasets.filter(
      dataset =>
        dataset.rows.length > 0
    );

  const context =
    JSON.stringify(
      {
        authenticated_role: role,
        security_scope:
          "Authenticated JWT and existing Supabase RLS",
        privacy:
          "Private identity, credential and storage fields were removed before AI processing.",
        datasets:
          Object.fromEntries(
            available.map(
              dataset => [
                dataset.table,
                dataset.rows,
              ]
            )
          ),
      },
      null,
      2
    );

  return {
    context,
    sources:
      available.map(
        dataset => ({
          key:
            `role_${dataset.table}`,
          label:
            dataset.label,
          count:
            dataset.rows.length,
        })
      ),
  };
}
