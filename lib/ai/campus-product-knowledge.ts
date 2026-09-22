export type CampusProductKnowledge = {
  identity: {
    name: string;
    description: string;
    purpose: string;
  };

  ownership: {
    developer: string;
    organization: string;
    team: string[];
  };

  technology: {
    frontend: string[];
    backend: string[];
    database: string[];
    infrastructure: string[];
    ai: string[];
  };

  architecture: {
    summary: string;
    security: string[];
  };

  features: string[];

  ai_capabilities: string[];

  facts_policy: string;
};


export const CAMPUS_PRODUCT_KNOWLEDGE:
  CampusProductKnowledge = {

  identity: {
    name:
      "CampusConnect",

    description:
      "CampusConnect is a campus management and student productivity platform that brings academic, campus-life, placement, community and personal-workspace features into one application.",

    purpose:
      "Its purpose is to give students and authorized campus roles a single connected platform for academic information, campus activities, career workflows, communication, personal productivity and AI-assisted access to authorized CampusConnect data.",
  },


  ownership: {
    developer:
      "Harsh Raj",

    organization:
      "Independent CampusConnect project",

    team: [
      "Harsh Raj",
    ],
  },


  technology: {
    frontend: [
      "React",
      "TypeScript",
      "Next.js",
      "Vite",
      "Vinext",
    ],

    backend: [
      "Next.js API routes",
      "Cloudflare Workers",
    ],

    database: [
      "Supabase",
      "PostgreSQL",
      "Supabase Row Level Security",
    ],

    infrastructure: [
      "Cloudflare Workers",
      "Supabase",
    ],

    ai: [
      "CampusConnect AI",
      "Groq-compatible chat completion API",
      "PostgreSQL full-text retrieval",
      "pgvector-ready document retrieval architecture",
    ],
  },


  architecture: {
    summary:
      "CampusConnect uses a React and TypeScript application layer, Supabase PostgreSQL for persistent data, authenticated Supabase access with Row Level Security, server-side AI API routes, and Cloudflare-based deployment infrastructure.",

    security: [
      "Authenticated Supabase sessions",
      "Row Level Security for database authorization",
      "Server-side AI API key usage",
      "User-scoped Campus AI context retrieval",
      "Role-aware access for professional CampusConnect roles",
    ],
  },


  features: [
    "Authentication",
    "Student profiles",
    "Dashboard",
    "Timetable",
    "Attendance",
    "Assignments",
    "Assignment submissions",
    "Notes",
    "Results",
    "Marks",
    "Events",
    "Calendar",
    "Library and learning resources",
    "Fees",
    "Notifications and announcements",
    "Placements",
    "Placement applications",
    "Placement interviews",
    "Placement offers",
    "Resume management",
    "Community",
    "Campus clubs",
    "Campus sports",
    "Campus achievements",
    "Campus research",
    "Campus alumni",
    "Campus directory",
    "Campus faculty directory",
    "Campus Seva service requests",
    "Personal notes",
    "Personal tasks",
    "Personal reminders",
    "Personal task subtasks",
    "File and document management",
    "CampusConnect AI",
  ],


  ai_capabilities: [
    "General AI assistance",
    "Academic advisor",
    "Attendance advisor",
    "Performance coach",
    "Daily academic briefing",
    "Grounded Notes AI",
    "Placement coach",
    "Resume analyzer",
    "Career roadmap",
    "Authorized CampusConnect data retrieval",
    "Campus directory and campus-life questions",
    "Personal task and reminder assistance",
    "Grounded document retrieval",
  ],


  facts_policy:
    "These records are the authoritative source for facts about the CampusConnect product itself. If a product fact is not present here or in another authorized CampusConnect source, the AI must say the information is unavailable rather than inventing it.",
};
