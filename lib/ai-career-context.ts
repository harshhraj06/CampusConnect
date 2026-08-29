import {
  calculatePlacementMatch,
} from "../app/placement-match";


type JsonRow =
  Record<string, unknown>;

type CareerSource = {
  key: string;
  label: string;
  count: number;
};

type CareerContextResult = {
  data: Record<string, unknown>;
  sources: CareerSource[];
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


function compactValue(
  value: unknown
): unknown {
  if (
    typeof value === "string"
  ) {
    return value.slice(0, 1200);
  }

  if (
    Array.isArray(value)
  ) {
    return value
      .slice(0, 30)
      .map(compactValue);
  }

  return value;
}


function compactRow(
  row: JsonRow
): JsonRow {
  return Object.fromEntries(
    Object.entries(row)
      .filter(
        ([key]) =>
          ![
            "id",
            "user_id",
            "student_id",
            "created_by",
            "placement_id",
          ].includes(key)
      )
      .map(([key, value]) => [
        key,
        compactValue(value),
      ])
  );
}


async function readRows(
  path: string,
  accessToken: string
): Promise<JsonRow[]> {
  if (
    !SUPABASE_URL ||
    !PUBLISHABLE_KEY
  ) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${path}`,
    {
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization:
          `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const detail = await response.text();

    throw new Error(
      `Career context query failed (${response.status}): ${detail.slice(0, 300)}`
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data as JsonRow[]
    : [];
}


async function safeRows(
  label: string,
  path: string,
  accessToken: string
): Promise<JsonRow[]> {
  try {
    return await readRows(
      path,
      accessToken
    );
  } catch (error) {
    console.warn(
      `[CampusConnect AI] ${label} unavailable:`,
      error instanceof Error
        ? error.message
        : error
    );

    return [];
  }
}


function source(
  sources: CareerSource[],
  key: string,
  label: string,
  rows: JsonRow[]
) {
  if (!rows.length) {
    return;
  }

  sources.push({
    key,
    label,
    count: rows.length,
  });
}


function stringArray(
  value: unknown
): string[] {
  return Array.isArray(value)
    ? value
        .map(item => String(item).trim())
        .filter(Boolean)
        .slice(0, 50)
    : [];
}


export async function buildCareerAiContext(
  accessToken: string,
  userId: string
): Promise<CareerContextResult> {
  const user = encodeURIComponent(userId);
  const now = encodeURIComponent(
    new Date().toISOString()
  );

  const [
    profileRows,
    resumeRows,
    projectRows,
    experienceRows,
    achievementRows,
    certificationRows,
    customLinkRows,
    applicationRows,
    savedRows,
    driveRows,
  ] = await Promise.all([
    safeRows(
      "career profile",
      `profiles?select=department,graduation_year,skills,cgpa&id=eq.${user}&limit=1`,
      accessToken
    ),

    safeRows(
      "student resume",
      `student_resumes?select=headline,summary,phone,location,college,degree,graduation_year,cgpa,skills,linkedin_url,github_url,portfolio_url,leetcode_url,updated_at&user_id=eq.${user}&limit=1`,
      accessToken
    ),

    safeRows(
      "resume projects",
      `resume_projects?select=title,technologies,description,github_url,live_url,display_order,updated_at&user_id=eq.${user}&order=display_order.asc&limit=30`,
      accessToken
    ),

    safeRows(
      "resume experience",
      `resume_experience?select=title,company,duration,description,company_url,display_order,updated_at&user_id=eq.${user}&order=display_order.asc&limit=30`,
      accessToken
    ),

    safeRows(
      "resume achievements",
      `resume_achievements?select=title,issuer,achievement_date,description,proof_url,display_order,updated_at&user_id=eq.${user}&order=display_order.asc&limit=30`,
      accessToken
    ),

    safeRows(
      "resume certifications",
      `resume_certifications?select=name,issuer,issue_date,credential_id,credential_url,display_order,updated_at&user_id=eq.${user}&order=display_order.asc&limit=30`,
      accessToken
    ),

    safeRows(
      "resume links",
      `resume_custom_links?select=label,url,display_order,updated_at&user_id=eq.${user}&order=display_order.asc&limit=30`,
      accessToken
    ),

    safeRows(
      "placement applications",
      `placement_applications?select=company,role_title,status,next_step,applied_at,updated_at&student_id=eq.${user}&order=updated_at.desc&limit=60`,
      accessToken
    ),

    safeRows(
      "saved placements",
      `saved_placements?select=placement_id,created_at&student_id=eq.${user}&limit=100`,
      accessToken
    ),

    safeRows(
      "current placement drives",
      `placement_drives?select=id,company,role_title,compensation,deadline,location,work_mode,employment_type,minimum_cgpa,branches,skills,about,rounds,created_at,updated_at&deadline=gte.${now}&order=deadline.asc&limit=60`,
      accessToken
    ),
  ]);

  const profile = profileRows[0] || {};
  const resume = resumeRows[0] || {};

  const rawCgpa =
    resume.cgpa ??
    profile.cgpa;

  const placementProfile = {
    department:
      String(profile.department || ""),
    skills:
      String(
        resume.skills ||
        profile.skills ||
        ""
      ),
    cgpa:
      typeof rawCgpa === "string" ||
      typeof rawCgpa === "number"
        ? rawCgpa
        : null,
    year:
      String(
        resume.graduation_year ||
        profile.graduation_year ||
        ""
      ),
  };

  const savedIds = new Set(
    savedRows
      .map(row =>
        String(row.placement_id || "")
      )
      .filter(Boolean)
  );

  const driveMatches = driveRows.map(row => {
    const match = calculatePlacementMatch(
      placementProfile,
      {
        branches:
          stringArray(row.branches),
        skills:
          stringArray(row.skills),
        cgpa:
          row.minimum_cgpa as
            string | number | undefined,
      }
    );

    return {
      ...compactRow(row),
      is_saved:
        savedIds.has(
          String(row.id || "")
        ),
      ai_calculated: {
        match_score: match.score,
        eligible: match.eligible,
        branch_eligible:
          match.branchEligible,
        cgpa_eligible:
          match.cgpaEligible,
        matched_skills:
          match.matchedSkills,
        missing_skills:
          match.missingSkills,
        skill_score:
          match.skillScore,
        reasons:
          match.reasons,
      },
    };
  });

  const resumeSignals = {
    resume_exists:
      resumeRows.length > 0,
    has_headline:
      Boolean(String(resume.headline || "").trim()),
    has_summary:
      Boolean(String(resume.summary || "").trim()),
    has_skills:
      Boolean(String(
        resume.skills ||
        profile.skills ||
        ""
      ).trim()),
    has_phone:
      Boolean(String(resume.phone || "").trim()),
    has_linkedin:
      Boolean(String(resume.linkedin_url || "").trim()),
    has_github:
      Boolean(String(resume.github_url || "").trim()),
    has_portfolio:
      Boolean(String(resume.portfolio_url || "").trim()),
    has_leetcode:
      Boolean(String(resume.leetcode_url || "").trim()),
    project_count:
      projectRows.length,
    experience_count:
      experienceRows.length,
    achievement_count:
      achievementRows.length,
    certification_count:
      certificationRows.length,
    custom_link_count:
      customLinkRows.length,
  };

  const sources: CareerSource[] = [];

  source(
    sources,
    "career_profile",
    "Your career profile",
    profileRows
  );
  source(
    sources,
    "student_resume",
    "Your Resume Studio profile",
    resumeRows
  );
  source(
    sources,
    "resume_projects",
    "Your resume projects",
    projectRows
  );
  source(
    sources,
    "resume_experience",
    "Your resume experience",
    experienceRows
  );
  source(
    sources,
    "resume_achievements",
    "Your resume achievements",
    achievementRows
  );
  source(
    sources,
    "resume_certifications",
    "Your resume certifications",
    certificationRows
  );
  source(
    sources,
    "resume_links",
    "Your professional links",
    customLinkRows
  );
  source(
    sources,
    "placement_applications",
    "Your placement applications",
    applicationRows
  );
  source(
    sources,
    "saved_placements",
    "Your saved placement drives",
    savedRows
  );
  source(
    sources,
    "placement_drives",
    "Current visible placement drives",
    driveRows
  );

  return {
    data: {
      profile:
        profileRows.map(compactRow),
      resume:
        resumeRows.map(compactRow),
      resume_signals:
        resumeSignals,
      projects:
        projectRows.map(compactRow),
      experience:
        experienceRows.map(compactRow),
      achievements:
        achievementRows.map(compactRow),
      certifications:
        certificationRows.map(compactRow),
      professional_links:
        customLinkRows.map(compactRow),
      applications:
        applicationRows.map(compactRow),
      current_drive_matches:
        driveMatches,
    },
    sources,
  };
}
