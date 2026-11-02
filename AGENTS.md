# AI Coding Agent Guidelines & Governance (AGENTS.md)
## CampusConnect Pro — Production Codebase Rules

---

### Purpose
This document establishes strict rules that any AI coding agent (including Antigravity) must follow when inspecting, modifying, or creating code in the **CampusConnect Pro** repository. All code contributions must conform to [PRD.md](file:///Users/harshraj/Downloads/CampusConnect/PRD.md) and [ARCHITECTURE.md](file:///Users/harshraj/Downloads/CampusConnect/ARCHITECTURE.md).

---

## 1. Core Operating Principles

1. **Inspect Before You Edit**:
   - Always read and inspect existing files, utilities, and components before writing new code.
   - Never assume an API, type definition, or route does not exist. Check `lib/`, `app/components/`, `db/`, and `supabase/schema.sql` first.

2. **No Fabricated / Mock Data**:
   - Never insert fake mock items (e.g. fake students, fabricated companies, fake attendance numbers) to make the UI look populated.
   - If a table or query has no records, implement a clean, helpful empty state that informs the user how to add or sync their data.

3. **Follow the Approved Tech Stack**:
   - Framework: Next.js 16 (App Router) + React 19 + TypeScript.
   - Styling: Tailwind CSS v4 + predefined utility classes.
   - Database / Auth: Supabase (PostgreSQL with RLS, GoTrue Auth, Supabase Storage).
   - Build Tooling: Vite 8 / vinext / Cloudflare worker adapter.
   - Do NOT introduce new UI component libraries, alternative CSS frameworks, or heavy external microservices without prior user approval.

4. **Surgical, Focused Edits**:
   - Keep diffs minimal and targeted. Do not reformat or refactor unrelated files.
   - Preserve existing code comments, docstrings, and established architecture unless specifically tasked to change them.

---

## 2. Security & Secrets Discipline

1. **Zero Hardcoded Secrets**:
   - Never commit API keys, service role keys, database passwords, or JWT secrets to code.
   - Client-accessible variables must be prefixed with `NEXT_PUBLIC_` and limited to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   - The `SUPABASE_SERVICE_ROLE_KEY` and connector tokens must ONLY be accessed in server-side API routes (`app/api/**`).

2. **Mandatory Server-Side Authorization**:
   - Never trust client-side role claims.
   - All protected API routes must use `withSecurity` from [lib/api-auth.ts](file:///Users/harshraj/Downloads/CampusConnect/lib/api-auth.ts) and call `requireRole` with allowed roles.
   - All database tables must have Row-Level Security (RLS) enabled in [supabase/schema.sql](file:///Users/harshraj/Downloads/CampusConnect/supabase/schema.sql).

3. **Private Document Handling**:
   - Student resumes, identity proofs, and academic records must be stored in the non-public Supabase bucket `campus-documents`.
   - File paths must be scoped to the user's UID (`${userId}/${filename}`).
   - Never generate public download links for sensitive documents; use short-lived signed URLs.

4. **Stateless Credential Exchange**:
   - Never store student college portal passwords or date-of-birth (DOB) in the database or browser storage. RNSIT Contineo sync requests must be processed statelessly in memory.

---

## 3. Code Quality & TypeScript Rules

1. **Strict Type Safety**:
   - Avoid `any` types. Define explicit TypeScript interfaces for all data models, API request bodies, and component props.
   - Database types should match the Supabase PostgreSQL schema.

2. **Component Reuse & Modularization**:
   - Shared UI primitives belong in `app/components/ui/` or `components/`.
   - Domain-specific components belong in their respective feature folders (e.g. `app/components/placement/`).
   - Do not duplicate standard buttons, modals, badges, or input fields.

3. **Error Handling & State Resilience**:
   - Every asynchronous network request must handle all four states:
     - **Loading**: Skeleton or subtle spinner.
     - **Empty**: Informative empty state message with actionable CTA.
     - **Success**: Rendered data.
     - **Error**: User-friendly error notification (avoid exposing raw stack traces).

4. **API Route Conventions**:
   - All API route handlers must reside in `app/api/<feature>/route.ts`.
   - Handlers must use the `withSecurity` wrapper from `lib/api-auth.ts`.
   - Enforce request body size limits (`maxSize = 1024 * 1024`).
   - Validate incoming JSON payloads using explicit type guards.

---

## 4. Verification & Testing Protocol

Before proposing any changes as complete, the agent must ensure:
1. **Type Check**: Run `npx tsc --noEmit` to verify zero TypeScript errors.
2. **Security Check**: Run `npm run security:scan` to verify no secret leaks or AST security violations.
3. **Build Smoke Test**: Ensure `npm run build` succeeds without bundle or SSR crashes.
4. **Regressions**: Check that existing routes, navigation slugs, and RLS policies remain intact.

---

## 5. Decision Escalation Protocol

Stop and ask the user for approval when:
1. A task requires modifying the core database schema or altering existing RLS policies in `supabase/schema.sql`.
2. A task involves adding a new third-party dependency to `package.json`.
3. A blocking ambiguity exists between the PRD specification and existing legacy code.
