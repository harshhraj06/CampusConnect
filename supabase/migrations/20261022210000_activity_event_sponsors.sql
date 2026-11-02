-- Admin-managed sponsor logos for the Activity Center hero ticker.

create table if not exists public.activity_event_sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null
    check (char_length(trim(name)) between 1 and 90),
  image_url text not null,
  storage_path text not null,
  is_active boolean not null default true,
  display_order integer not null default 0
    check (display_order between 0 and 9999),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activity_event_sponsors_display_idx
  on public.activity_event_sponsors
    (is_active, display_order, created_at);

alter table public.activity_event_sponsors
  enable row level security;

drop policy if exists "Read active activity event sponsors"
  on public.activity_event_sponsors;

create policy "Read active activity event sponsors"
  on public.activity_event_sponsors
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Manage activity event sponsors"
  on public.activity_event_sponsors;

create policy "Manage activity event sponsors"
  on public.activity_event_sponsors
  for all
  to authenticated
  using (public.can_manage_activity_event_promotions())
  with check (public.can_manage_activity_event_promotions());

grant select on public.activity_event_sponsors
  to anon, authenticated;

grant insert, update, delete on public.activity_event_sponsors
  to authenticated;
