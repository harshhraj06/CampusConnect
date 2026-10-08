export function calculateResumeAtsScore(
  input: unknown
): number {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    return 0;
  }

  const data =
    input as Record<
      string,
      unknown
    >;

  const field = (
    key: string
  ) => {
    const value =
      data[key];

    return typeof value ===
      "string"
      ? value
      : "";
  };

  const normalize = (
    value: string
  ) =>
    value
      .replace(/\s+/g, " ")
      .trim();

  const countItems = (
    value: string
  ) =>
    value
      .split(/[,;\n]/)
      .map(item =>
        item.trim()
      )
      .filter(Boolean)
      .length;

  const containsNumber = (
    value: string
  ) =>
    /\b\d+(?:\.\d+)?%?\b/.test(
      value
    );

  const containsActionVerb = (
    value: string
  ) =>
    /\b(built|developed|designed|implemented|created|engineered|deployed|optimized|integrated|automated|improved|reduced|increased|managed|led|analyzed|delivered|architected|launched|collaborated)\b/i.test(
      value
    );

  const name =
    field("name");

  const email =
    field("email");

  const phone =
    field("phone");

  const city =
    field("city");

  const linkedin =
    field("linkedin");

  const github =
    field("github");

  const portfolio =
    field("portfolio");

  const leetcode =
    field("leetcode");

  const codechef =
    field("codechef");

  const college =
    field("college");

  const degree =
    field("degree");

  const collegeStart =
    field("collegeStart");

  const collegeEnd =
    field("collegeEnd");

  const cgpa =
    field("cgpa");

  const languages =
    field("languages");

  const tools =
    field("tools");

  const frameworks =
    field("frameworks");

  const databases =
    field("databases");

  const coursework =
    field("coursework");

  const experienceTitle =
    field("experienceTitle");

  const experienceDescription =
    field(
      "experienceDescription"
    );

  const achievements =
    field("achievements");

  const certifications =
    field("certifications");

  const engagement =
    field("engagement");

  const validEmail =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email.trim()
    );

  const validPhone =
    phone
      .replace(/\D/g, "")
      .length >= 10;

  const professionalLinkCount =
    [
      linkedin,
      github,
      portfolio,
      leetcode,
      codechef,
    ].filter(
      value =>
        value.trim().length > 0
    ).length;

  const technicalSkillCount =
    [
      languages,
      tools,
      frameworks,
      databases,
    ].reduce(
      (
        total,
        value
      ) =>
        total +
        countItems(value),
      0
    );

  const projects = [
    {
      title:
        field(
          "project1Title"
        ),

      tech:
        field(
          "project1Tech"
        ),

      description:
        field(
          "project1Description"
        ),
    },
    {
      title:
        field(
          "project2Title"
        ),

      tech:
        field(
          "project2Tech"
        ),

      description:
        field(
          "project2Description"
        ),
    },
    {
      title:
        field(
          "project3Title"
        ),

      tech:
        field(
          "project3Tech"
        ),

      description:
        field(
          "project3Description"
        ),
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
          normalize(
            project.description
          );

        return (
          description.length >=
            70 &&
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
    normalize(
      experienceDescription
    );

  const achievementText =
    normalize(
      achievements
    );

  const checks = [
    {
      points: 6,

      passed:
        name.trim().length >=
          3 &&
        validEmail &&
        validPhone &&
        city.trim().length >=
          2,
    },

    {
      points: 6,

      passed:
        Boolean(
          github.trim()
        ) &&
        professionalLinkCount >=
          2,
    },

    {
      points: 9,

      passed:
        Boolean(
          college.trim() &&
          degree.trim() &&
          collegeStart.trim() &&
          collegeEnd.trim()
        ),
    },

    {
      points: 4,

      passed:
        Boolean(
          cgpa.trim()
        ),
    },

    {
      points: 14,

      passed:
        completedProjects.length >=
          2,
    },

    {
      points: 8,

      passed:
        strongProjectDescriptions.length >=
          2,
    },

    {
      points: 8,

      passed:
        quantifiedProjects.length >=
          1,
    },

    {
      points: 12,

      passed:
        technicalSkillCount >=
          10 &&
        Boolean(
          languages.trim()
        ),
    },

    {
      points: 5,

      passed:
        countItems(
          coursework
        ) >= 4,
    },

    {
      points: 8,

      passed:
        Boolean(
          experienceTitle.trim()
        ) &&
        experienceText.length >=
          60 &&
        containsActionVerb(
          experienceText
        ),
    },

    {
      points: 5,

      passed:
        experienceText.length >=
          60 &&
        containsNumber(
          experienceText
        ),
    },

    {
      points: 6,

      passed:
        achievementText.length >=
          50,
    },

    {
      points: 3,

      passed:
        certifications
          .trim()
          .length >= 5,
    },

    {
      points: 3,

      passed:
        engagement
          .trim()
          .length >= 30,
    },

    {
      points: 3,

      passed:
        Boolean(
          name.trim() &&
          college.trim() &&
          languages.trim() &&
          completedProjects.length >=
            1
        ),
    },
  ];

  return Math.min(
    100,
    checks.reduce(
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
}
