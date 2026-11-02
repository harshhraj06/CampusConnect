-- CampusConnect My Branch hub.
create table if not exists public.branch_hub_entries (
  id uuid primary key default gen_random_uuid(),
  department text not null check (char_length(btrim(department)) between 1 and 120),
  entry_type text not null check (entry_type in ('achievement','topper','event')),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  summary text not null default '' check (char_length(summary) <= 500),
  details text not null default '' check (char_length(details) <= 5000),
  person_name text not null default '' check (char_length(person_name) <= 120),
  award text not null default '' check (char_length(award) <= 200),
  semester text not null default '' check (char_length(semester) <= 40),
  academic_year text not null default '' check (char_length(academic_year) <= 40),
  event_start timestamptz,
  event_end timestamptz,
  venue text not null default '' check (char_length(venue) <= 180),
  registration_url text not null default '' check (char_length(registration_url) <= 500),
  status text not null default 'published' check (status in ('published','draft')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (event_end is null or event_start is null or event_end >= event_start),
  check (entry_type <> 'event' or event_start is not null)
);
create index if not exists branch_hub_entries_department_created_idx
  on public.branch_hub_entries (department, created_at desc);
create index if not exists branch_hub_entries_department_type_idx
  on public.branch_hub_entries (department, entry_type, status);
alter table public.branch_hub_entries enable row level security;
revoke all on table public.branch_hub_entries from anon, authenticated;
grant all on table public.branch_hub_entries to service_role;
