export type PlacementMatchProfile = {
  department?: string;
  skills?: string;
  cgpa?: number | string | null;
  year?: string;
};

export type PlacementMatchDrive = {
  branches?: string[];
  skills?: string[];
  cgpa?: string | number;
};

export type PlacementMatchResult = {
  score: number;
  eligible: boolean;
  branchEligible: boolean;
  cgpaEligible: boolean | null;

  matchedSkills: string[];
  missingSkills: string[];

  skillScore: number;
  branchScore: number;
  cgpaScore: number;

  reasons: string[];
};

function normalize(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeBranch(value: unknown) {
  const branch = normalize(value);

  const aliases: Record<string, string> = {
    ece: "ece",
    "electronics and communication": "ece",
    "electronics & communication": "ece",
    "electronics and communication engineering": "ece",

    cse: "cse",
    "computer science": "cse",
    "computer science engineering": "cse",
    "computer science and engineering": "cse",

    ise: "ise",
    "information science": "ise",
    "information science engineering": "ise",

    it: "it",
    "information technology": "it",

    eee: "eee",
    "electrical and electronics": "eee",
    "electrical & electronics": "eee",

    mech: "mech",
    mechanical: "mech",
    "mechanical engineering": "mech",

    civil: "civil",
    "civil engineering": "civil",
  };

  return aliases[branch] || branch;
}

function splitSkills(value?: string) {
  if (!value) return [];

  return value
    .split(/[,;\n|]/)
    .map(skill => skill.trim())
    .filter(Boolean);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function skillKey(value: string) {
  return normalize(value)
    .replace(/[.#/+_-]/g, "")
    .replace(/\s+/g, "");
}

function skillsMatch(studentSkill: string, requiredSkill: string) {
  const a = skillKey(studentSkill);
  const b = skillKey(requiredSkill);

  if (!a || !b) return false;

  return a === b;
}

export function calculatePlacementMatch(
  profile: PlacementMatchProfile,
  drive: PlacementMatchDrive
): PlacementMatchResult {
  const studentBranch = normalizeBranch(profile.department);

  const eligibleBranches = (drive.branches || [])
    .map(normalizeBranch)
    .filter(Boolean);

  const studentSkills = unique(splitSkills(profile.skills));

  const requiredSkills = unique(
    (drive.skills || [])
      .map(skill => String(skill).trim())
      .filter(Boolean)
  );

  const branchEligible =
    eligibleBranches.length === 0 ||
    eligibleBranches.includes(studentBranch);

  const matchedSkills = requiredSkills.filter(required =>
    studentSkills.some(student =>
      skillsMatch(student, required)
    )
  );

  const missingSkills = requiredSkills.filter(
    required =>
      !studentSkills.some(student =>
        skillsMatch(student, required)
      )
  );

  const skillScore =
    requiredSkills.length === 0
      ? 100
      : Math.round(
          (matchedSkills.length /
            requiredSkills.length) *
            100
        );

  const minimumCgpa = Number(drive.cgpa || 0);
  const studentCgpa = Number(profile.cgpa);

  const hasStudentCgpa =
    profile.cgpa !== undefined &&
    profile.cgpa !== null &&
    profile.cgpa !== "" &&
    Number.isFinite(studentCgpa);

  const cgpaEligible =
    minimumCgpa <= 0
      ? true
      : hasStudentCgpa
        ? studentCgpa >= minimumCgpa
        : null;

  const branchScore = branchEligible ? 100 : 0;

  const cgpaScore =
    minimumCgpa <= 0
      ? 100
      : cgpaEligible === null
        ? 50
        : cgpaEligible
          ? 100
          : Math.max(
              0,
              Math.min(
                100,
                Math.round(
                  (studentCgpa /
                    minimumCgpa) *
                    100
                )
              )
            );

  /*
   * Match score:
   *
   * Skills = 60%
   * Branch = 25%
   * CGPA   = 15%
   *
   * Skills carry the highest weight because
   * they describe actual role alignment.
   */
  let score = Math.round(
    skillScore * 0.6 +
    branchScore * 0.25 +
    cgpaScore * 0.15
  );

  /*
   * Hard eligibility conditions should prevent
   * misleading 80–90% matches.
   */
  if (!branchEligible) {
    score = Math.min(score, 49);
  }

  if (cgpaEligible === false) {
    score = Math.min(score, 59);
  }

  score = Math.max(
    0,
    Math.min(100, score)
  );

  const eligible =
    branchEligible &&
    cgpaEligible !== false;

  const reasons: string[] = [];

  if (branchEligible) {
    reasons.push("Your department is eligible.");
  } else {
    reasons.push(
      "Your department is not listed for this drive."
    );
  }

  if (minimumCgpa > 0) {
    if (cgpaEligible === true) {
      reasons.push(
        `You meet the ${minimumCgpa} CGPA requirement.`
      );
    } else if (cgpaEligible === false) {
      reasons.push(
        `This drive requires at least ${minimumCgpa} CGPA.`
      );
    } else {
      reasons.push(
        `Add your CGPA to verify the ${minimumCgpa} CGPA requirement.`
      );
    }
  }

  if (requiredSkills.length === 0) {
    reasons.push(
      "No specific technical skills were required."
    );
  } else if (
    matchedSkills.length === requiredSkills.length
  ) {
    reasons.push(
      "Your profile contains every listed skill."
    );
  } else if (matchedSkills.length > 0) {
    reasons.push(
      `You match ${matchedSkills.length} of ${requiredSkills.length} listed skills.`
    );
  } else {
    reasons.push(
      "Your profile does not currently contain the listed skills."
    );
  }

  return {
    score,
    eligible,
    branchEligible,
    cgpaEligible,

    matchedSkills,
    missingSkills,

    skillScore,
    branchScore,
    cgpaScore,

    reasons,
  };
}

export function placementMatchLabel(
  score: number
) {
  if (score >= 90) return "Excellent match";
  if (score >= 75) return "Strong match";
  if (score >= 60) return "Good match";
  if (score >= 40) return "Partial match";

  return "Low match";
}
