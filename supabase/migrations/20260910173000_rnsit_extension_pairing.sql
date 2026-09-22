-- =========================================================
-- CAMPUSCONNECT — RNSIT EXTENSION SECURE PAIRING
-- =========================================================
--
-- Security model:
--   CampusConnect authenticated session creates pairing.
--   Extension receives only a short-lived one-time code.
--   No Supabase JWT is copied into the extension.
--   No Contineo password, DOB or cookies are stored.
--
-- Pairing codes:
--   - expire after a short period
--   - are single-use
--   - stored as hashes, never plaintext
-- =========================================================


create table if not exists public.rnsit_extension_pairings (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  code_hash text not null unique,

  expires_at timestamptz not null,

  used_at timestamptz,

  revoked_at timestamptz,

  created_at timestamptz not null default now(),

  constraint rnsit_extension_pairings_expiry_check
    check (expires_at > created_at)
);


-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists
  rnsit_extension_pairings_student_idx
on public.rnsit_extension_pairings(student_id);


create index if not exists
  rnsit_extension_pairings_expiry_idx
on public.rnsit_extension_pairings(expires_at);


create index if not exists
  rnsit_extension_pairings_active_idx
on public.rnsit_extension_pairings(
  student_id,
  expires_at
)
where
  used_at is null
  and revoked_at is null;


-- =========================================================
-- RLS
-- =========================================================

alter table public.rnsit_extension_pairings
enable row level security;


-- No browser/client access is intentionally granted.
--
-- Pairing creation and consumption must happen through
-- trusted CampusConnect server routes using the service role.
--
-- This prevents students from:
--   - reading pairing hashes
--   - inserting arbitrary pairings
--   - marking codes as used
--   - changing expiration timestamps
-- =========================================================


revoke all
on table public.rnsit_extension_pairings
from anon;


revoke all
on table public.rnsit_extension_pairings
from authenticated;


-- Explicit service-role access for server-side operations.
grant select, insert, update, delete
on table public.rnsit_extension_pairings
to service_role;


-- =========================================================
-- CLEANUP SUPPORT
-- =========================================================

create index if not exists
  rnsit_extension_pairings_cleanup_idx
on public.rnsit_extension_pairings(expires_at)
where
  used_at is not null
  or revoked_at is not null;


comment on table public.rnsit_extension_pairings is
'Short-lived one-time pairing records used to securely authorize the CampusConnect RNSIT browser extension without exposing Supabase sessions or Contineo credentials.';

comment on column public.rnsit_extension_pairings.code_hash is
'SHA-256 hash of the one-time pairing secret. Plaintext pairing codes are never persisted.';

comment on column public.rnsit_extension_pairings.used_at is
'Set when the pairing code is successfully consumed. A pairing can be consumed only once.';

