# System Architecture Document (ARCHITECTURE.md)
## CampusConnect Pro — Unified Higher-Education Platform

---

### Document Overview
- **System Name**: CampusConnect Pro
- **Status**: Production Reference Architecture
- **Version**: 1.0.0
- **Governing Source Documents**: [PRD.md](file:///Users/harshraj/Downloads/CampusConnect/PRD.md), [SECURITY.md](file:///Users/harshraj/Downloads/CampusConnect/SECURITY.md)

---

## 1. Recommended Tech Stack & Architectural Reasoning

CampusConnect Pro selects a cohesive, lightweight, and modern stack designed for high developer velocity, zero unnecessary microservices, and airtight database-level security.

```
+---------------------------------------------------------------------------------------+
|                                    PRESENTATION LAYER                                 |
|   Next.js 16 (App Router)  *  React 19  *  TypeScript 5.9  *  Tailwind CSS v4        |
|   Framer Motion / Radix UI  *  Lucide Icons  *  HTML5-QRCode Camera Scanner           |
+---------------------------------------------------------------------------------------+
                                           |
                                  HTTPS / JSON / JWT
                                           v
+---------------------------------------------------------------------------------------+
|                                    APPLICATION LAYER                                  |
|   Next.js Route Handlers (Edge / Node.js Runtime via Vite/vinext & Cloudflare)        |
|   Security Gateway: lib/api-auth.ts (withSecurity, Rate Limiting, Role Verification) |
|   AI Engine: Multi-provider Contextual Orchestrator (lib/ai-provider-failover.ts)     |
+---------------------------------------------------------------------------------------+
                 |                                                     |
        Service Role Key                                         User JWT (RLS)
                 v                                                     v
+------------------------------------+               +----------------------------------+
|      EXTERNAL INTEGRATIONS         |               |         DATA & AUTH LAYER        |
| - RNSIT Contineo Connector API     |               | Supabase Managed PostgreSQL      |
| - LLM API Endpoints                |               | - Supabase GoTrue Auth (JWT)     |
| - Private Document Storage         |               | - PostgreSQL Row-Level Security  |
|   (Supabase S3 Buckets)            |               | - Triggers & Security Definers   |
+------------------------------------+               +----------------------------------+
```

### 1.1 Stack Selection Rationale
| Layer | Technology | Architectural Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16 + React 19** | Provides hybrid server/client execution, App Router ergonomics, fast page transitions, and first-class TypeScript support. |
| **Build & Runtime Engine** | **Vite 8 + vinext + Cloudflare** | Replaces heavy legacy bundlers with sub-second HMR in development and lightweight edge-compatible worker compilation. |
| **Styling & Design System** | **Tailwind CSS v4 + Radix UI** | Modern CSS-in-engine paradigm with CSS variables, accessible unstyled primitives, high-performance animation capabilities. |
| **Identity & Authentication** | **Supabase Auth (GoTrue)** | Industry-standard JWT session management, automatic refresh tokens, password reset flows, and zero auth infrastructure maintenance. |
| **Primary Database & RLS** | **Supabase PostgreSQL** | Relational integrity across complex student-faculty schemas. Row-Level Security (RLS) enforces authorization directly at the data layer. |
| **Data Access & Schema** | **Supabase Client + Drizzle ORM** | Direct Supabase browser/server client for authenticated RLS queries; Drizzle ORM for schema definitions and migrations. |
| **File & Document Storage** | **Supabase Storage** | Non-public S3-compatible bucket (`campus-documents`) with folder-scoped user isolation and short-lived signed download URLs. |
| **Client-Side Generation** | **React-PDF, QR/Barcode** | Local client-side generation of student resumes, ID badges, and attendance QR codes, preventing third-party privacy leakage. |

---

## 2. System & Module Architecture

CampusConnect Pro operates as a unified modular monolith. It avoids premature microservice decomposition while maintaining strict internal boundaries across modules.

```
                          app/
                           ├── page.tsx (Dynamic Workspace Shell)
                           ├── [...slug]/ (Direct Route Fallback)
                           ├── api/ (Serverless Route Handlers)
                           │    ├── academics/
                           │    ├── admin/
                           │    ├── ai/
                           │    ├── notifications/
                           │    ├── placement/
                           │    └── rnsit/sync/
                           ├── campus-modules.tsx (Module Controller)
                           ├── placement-cell/ (Placement Command Center)
                           └── campus-seva-kendra.tsx (Grievance Center)
```

### 2.1 Core Subsystems
1. **Workspace Shell & Dynamic Routing (`app/campus-module-routing.ts`)**:
   - Manages module views (`Announcements`, `Assignments`, `Attendance`, `Applications`, `Learning`, `Groups`, `Marketplace`, `Notes & Tasks`, `My Branch`, `Profile`, `Admin`, `Analytics`).
   - Provides role-aware navigation rendering based on authenticated profile claims (`Student`, `Faculty`, `Placement Cell`, `Coordinator`, `Main Admin`).
2. **Placement Command Center (`app/placement-cell/`, `app/components/placement/`)**:
   - Manages drive life cycle, candidate screening, application pipeline transitions, and bulk candidate CSV exports.
3. **Academic & Attendance Subsystem (`app/academic-promotion-module.tsx`, `lib/syllabus-calendar.ts`)**:
   - Evaluates attendance ratios, VTU 75% boundary conditions, subject-wise IA marks, and syllabus progress.
4. **Security & API Gateway (`lib/api-auth.ts`, `lib/security.ts`)**:
   - Common middleware layer wrapping API handlers with bearer token authentication, role validation, rate limiting, and body size constraints.
5. **Campus AI Multi-Context Engine (`lib/ai/`, `app/campus-ai.tsx`)**:
   - Contextual assistant utilizing student academic snapshots and placement guides with multi-provider failover.

---

## 3. Data Flow Architecture

### 3.1 Client-Direct Authenticated Flow (RLS-Protected)
Used for standard application reads and mutations (announcements, group messages, student applications, saved drives):

```
[Browser Client]
       │
       │  1. Authenticates via Supabase Auth (stores JWT in cookie/storage)
       │  2. Dispatches query via createBrowserClient() with Bearer JWT
       ▼
[Supabase PostgREST Gateway]
       │
       │  3. Validates JWT signature & extracts auth.uid()
       │  4. Executes PostgreSQL Row-Level Security (RLS) policies
       ▼
[PostgreSQL Database Engine]
       │
       │  5. Evaluates (auth.uid() = student_id OR current_campus_role() IN (...))
       │  6. Returns only authorized rows
       ▼
[Browser Client UI Update]
```

### 3.2 Server-Mediated Administrative & Sync Flow
Used for privileged operations (Contineo ERP sync, staff role updates, cross-student aggregation, AI orchestration):

```
[Browser Client]
       │
       │  1. HTTP POST /api/rnsit/sync (Header: Authorization: Bearer <UserJWT>)
       ▼
[Next.js API Route: withSecurity Gateway]
       │
       │  2. authenticateRequest(): Validates user JWT via Supabase Auth
       │  3. requireRole(): Checks caller role against permitted roles
       │  4. rateLimit(): Verifies IP / User request bucket
       ▼
[API Route Handler Logic]
       │
       │  5. Calls external RNSIT Connector using service-to-service secrets
       │  6. Normalizes response data (attendance, marks, results)
       │  7. Writes to database via createAdminClient() (SUPABASE_SERVICE_ROLE_KEY)
       ▼
[JSON Response: { success: true, count: N }]
```

---

## 4. Repository & Folder Structure

```
CampusConnect/
├── app/                              # Next.js App Router root
│   ├── [...slug]/                    # Catch-all dynamic view route
│   ├── api/                          # Server-side API endpoints
│   │   ├── academics/                # Marks, attendance, branch analytics
│   │   ├── admin/                    # Role elevation, user audit endpoints
│   │   ├── ai/                       # LLM prompt routing & assistant APIs
│   │   ├── notifications/            # Push alerts & email dispatchers
│   │   ├── placement/                # Drive creation, applicant status, resume
│   │   └── rnsit/sync/               # College ERP server-side sync gateway
│   ├── auth/                         # Sign in, sign up, password recovery pages
│   ├── components/                   # Domain-specific React components
│   │   ├── placement/                # Placement drive cards, applicant modal
│   │   └── ui/                       # Reusable UI primitives
│   ├── layout.tsx                    # Root layout with fonts, theme, providers
│   ├── page.tsx                      # Primary authenticated shell & module switcher
│   ├── campus-modules.tsx            # Main tab views controller
│   ├── campus-module-routing.ts      # Valid module slugs & role permissions
│   └── globals.css                   # Global Tailwind CSS design tokens
├── db/                               # Database schema & Drizzle configuration
│   ├── index.ts                      # Drizzle client instance
│   └── schema.ts                     # Drizzle schema definitions
├── lib/                              # Core shared backend & frontend utilities
│   ├── ai/                           # AI prompt templates & provider drivers
│   ├── api-auth.ts                   # Standardized API route security wrappers
│   ├── security.ts                   # Rate limiting, input sanitization, token tools
│   ├── supabase.ts                   # Supabase client singleton (SSR safe)
│   ├── utils.ts                      # Class merging & formatting helpers
│   └── resume-ats-score.ts           # Resume scoring & parsing engine
├── public/                           # Static assets, icons, manifest
├── scripts/                          # Verification, security audit & build scripts
│   ├── build-verified.sh             # Production build pipeline with checks
│   ├── security-scan.mjs             # AST-based secret and vulnerability scanner
│   └── sites-env.sh                  # Safe environment execution wrapper
├── supabase/                         # Supabase database source of truth
│   └── schema.sql                    # Complete PostgreSQL schema, RLS & triggers
├── tests/                            # Automated test suite
│   ├── rendered-html.test.mjs        # Production HTML rendering smoke tests
│   └── e2e/                          # Playwright user journey specs
├── ARCHITECTURE.md                   # This document
├── PRD.md                            # Product Requirements Document
├── package.json                      # Node.js dependencies & scripts
└── tsconfig.json                     # Strict TypeScript configuration
```

---

## 5. Database Interaction & Security Boundaries

### 5.1 Principle of Least Privilege
- **Anon Key**: Only permitted to communicate with Supabase Auth for unauthenticated login/signup. All table reads by `anon` are revoked by default.
- **Authenticated Role**: Every query made with a user JWT runs under PostgreSQL RLS. A student can never read another student's private documents, attendance records, or draft resumes.
- **Service Role Key**: Never bundled into client builds. Restricted strictly to server-side API routes (`lib/api-auth.ts -> createAdminClient()`).

### 5.2 Key PostgreSQL Security Functions & Triggers
1. `public.handle_new_campus_user()`: Automatically provisions safe profile defaults upon auth signup. Prevents self-assigning privileged roles.
2. `public.current_campus_role()`: Stable security definer function returning the calling user's verified role for RLS policy checks.
3. `public.admin_set_profile_role(target_user_id, next_role)`: Strict procedure requiring the caller to possess the `Placement Cell` or `Main Admin` role before altering permissions.
4. `public.campus_directory`: Secure SQL view created `with (security_invoker = true)` exposing only public profile attributes while hiding phone numbers, emails, and USNs from non-staff.

---

## 6. Authentication & Authorization Architecture

```
User Action (Login)
       │
       ▼
Supabase Auth (GoTrue) ───► Issues JWT containing sub (UID) & session claims
       │
       ▼
Stored in browser client session (autoRefreshToken: true)
       │
       ├───► Client Queries: Passed in Authorization header to Supabase PostgREST
       │
       └───► API Routes: Extracted via lib/security.ts (getBearerToken)
                 │
                 ▼
             lib/api-auth.ts: authenticateRequest()
                 ├── Verified via userClient.auth.getUser()
                 └── Role verified against public.profiles.role
```

---

## 7. AI Context & Failover Architecture

The CampusConnect AI assistant (`app/campus-ai.tsx`, `lib/ai/`) operates on a resilient multi-tier design:
1. **Context Aggregator (`lib/ai-academic-snapshot.ts`, `lib/ai-career-context.ts`)**:
   - Compiles sanitized student context (department, current semester, target skills, attendance alerts).
   - Redacts all Personally Identifiable Information (PII) before prompt injection.
2. **Provider Failover (`lib/ai-provider-failover.ts`)**:
   - Executes primary AI completion (e.g. Gemini / OpenAI).
   - If an API key is missing or encounters a 429/500 error, seamlessly falls back to backup providers or local heuristic guidance without breaking the UI.

---

## 8. Error Handling & Observability

### 8.1 API Error Handling Standards
All API routes wrapped with `withSecurity` adhere to standard RFC 7807 structured JSON responses:
- `400 Bad Request`: Validation failure or malformed JSON (`createErrorResponse('Invalid input', 400)`).
- `401 Unauthorized`: Missing or expired Bearer token.
- `403 Forbidden`: Authenticated user lacks required role (`requireRole`).
- `413 Payload Too Large`: Body size exceeds 1MB limit.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Server exception (detailed message masked in production).

### 8.2 Client-Side Error Boundaries
- Global error boundary configured in `app/global-error.tsx`.
- Granular error boundaries in `app/error.tsx` catching module-level rendering errors while keeping the main navigation shell alive.

---

## 9. Security Boundaries & Threat Modeling

| Threat Vector | Mitigation Strategy |
| :--- | :--- |
| **Privilege Escalation** | Profile `role` column cannot be updated by normal `update` policies. Alterations require `admin_set_profile_role()` security definer function. |
| **Insecure Direct Object Reference (IDOR)** | Enforced via PostgreSQL RLS `using (student_id = auth.uid())` on attendance, marks, and applications. |
| **Private Document Leakage** | `campus-documents` bucket set to `public = false`. File paths enforce `auth.uid()` directory prefix. Served only via temporary signed URLs. |
| **Contineo Credential Theft** | The platform never stores student Contineo passwords or date-of-birth (DOB). Synchronization is performed statelessly in memory. |
| **API Denial of Service (DoS)** | In-memory token-bucket rate limiting applied via `applyRateLimit` in `lib/security.ts`. |
| **Hard-coded Secrets** | Enforced by pre-commit hooks and `npm run security:scan` inspecting all source files for secret leaks before build. |

---

## 10. Testing, Quality Assurance & Deployment

### 10.1 Verification Pipeline
The project enforces a verified deployment workflow configured in `package.json`:
1. **AST Security Scan (`npm run security:scan`)**: Verifies no uncommitted secrets, dangerous eval calls, or hardcoded tokens exist.
2. **Type Check (`npx tsc --noEmit`)**: Validates complete TypeScript type safety across all components and server handlers.
3. **Dependency Audit (`npm run security:audit`)**: Flags high/critical CVEs in installed dependencies.
4. **Rendered HTML Smoke Tests (`tests/rendered-html.test.mjs`)**: Verifies that built production bundles generate clean, valid HTML with no hydration crashes.

### 10.2 Deployment Strategy
- **Target**: Cloudflare Pages / Workers or Vercel Edge Runtime.
- **Build Command**: `npm run build` (executing `scripts/build-verified.sh`).
- **Required Production Environment Variables**:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
  SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
  RNSIT_CONNECTOR_URL=https://approved-college-connector.internal
  RNSIT_CONNECTOR_TOKEN=optional-connector-auth-token
  ```
