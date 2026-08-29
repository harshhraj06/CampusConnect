# CampusConnect Pro

A production-oriented student success platform for colleges: placements, academics, attendance, assignments, learning resources, communities, profiles, private documents, role-based administration and analytics.

## What was upgraded

- Professional responsive UI refresh with clearer hierarchy, spacing, accessible focus states and mobile layouts.
- Removed seeded/demo users, sample placement drives, fake announcements, fake attendance, fake groups and fake network profiles.
- Supabase is now the single source of truth for authenticated campus data.
- Student / Faculty / Placement Cell permissions are enforced by Supabase RLS and server-side database functions.
- Live placement-drive creation and listing backed by `placement_drives`.
- Persistent saved placement opportunities backed by `saved_placements`.
- Persistent application tracker with role-based pipeline updates.
- Persistent announcements, assignments, attendance, learning resources and community groups/messages.
- Private profile document storage using the `campus-documents` Supabase Storage bucket.
- Safe campus directory view for professional networking without exposing private profile fields.
- Connection requests are stored in Supabase instead of browser-only state.
- Password recovery and password update flow through Supabase Auth.
- Resume preview now uses live profile data and browser print/export instead of fabricated candidate information.
- Analytics reads database counts instead of hard-coded numbers.
- CSV export for real placement applications.

## Stack

- Next.js / React / TypeScript
- Supabase Auth, Postgres, RLS and Storage
- Drizzle ORM for the existing database integration
- Vite / vinext / Cloudflare tooling already present in the project

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run the complete `supabase/schema.sql` file.
4. In **Authentication → URL Configuration**, add your local and production application URLs.
5. Enable email/password authentication.
6. Add the following local environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Do not commit real credentials. `.env.local` is intentionally not included in this archive.

### Staff access

Registration creates Student accounts only. A trusted Placement Cell administrator must promote a staff account from the Supabase SQL editor initially, or use the in-app role management screen after the first Placement Cell administrator exists.

Example:

```sql
update public.profiles
set role = 'Placement Cell'
where email = 'your-authorized-admin-email@example.com';
```

After that, the administrator can manage Faculty / Placement Cell roles through the Admin module.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL printed by Vite/vinext.

## Production build

```bash
npm run build
```

If the Cloudflare/vinext native dependencies are missing, remove `node_modules` and run `npm ci` again on the target machine before building.

## Important production notes

- The application intentionally shows empty states when the database has no records. It never fabricates campus activity.
- Placement drives must be created by a verified Placement Cell account.
- Private documents are stored in a non-public Supabase bucket and opened with short-lived signed URLs.
- RLS policies are part of the source of truth; do not disable them in production.
- For email/password recovery, configure Supabase Auth email templates and your production redirect URL.
- Use HTTPS in production.

## RNSIT Contineo sync
CampusConnect now contains a server-side RNSIT sync boundary at `POST /api/rnsit/sync`. The browser never stores the student's DOB. Configure `SUPABASE_SERVICE_ROLE_KEY` and, when RNSIT/Contineo provides an approved integration endpoint, set `RNSIT_CONNECTOR_URL` (and optionally `RNSIT_CONNECTOR_TOKEN`). The connector is expected to return normalized `attendance`, `marks`, `results`, and `fees` arrays. Run the latest `supabase/schema.sql` in the Supabase SQL Editor before enabling sync.
