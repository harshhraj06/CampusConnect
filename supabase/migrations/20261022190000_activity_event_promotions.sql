-- Activity Center event spotlight campaigns.
-- Only Coordinators and Main Admins can create or change promotion records.

create table if not exists public.activity_event_promotions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.campus_events(id) on delete cascade,
  club_id uuid not null references public.campus_clubs(id) on delete cascade,
  headline text not null check (char_length(trim(headline)) between 1 and 120),
  message text not null default '' check (char_length(message) <= 420),
  cta_label text not null default 'Explore event' check (char_length(trim(cta_label)) between 1 and 32),
  theme text not null default 'copper'
    check (theme in ('copper', 'coral', 'gold', 'rose')),
  animation_style text not null default 'confetti'
    check (animation_style in ('confetti', 'spotlight', 'orbit', 'shimmer')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  display_priority integer not null default 0 check (display_priority between 0 and 999),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_event_promotions_valid_window
    check (ends_at is null or ends_at > starts_at)
);

create index if not exists activity_event_promotions_active_window_idx
  on public.activity_event_promotions (is_active, starts_at, ends_at, display_priority);

create index if not exists activity_event_promotions_club_idx
  on public.activity_event_promotions (club_id);

create or replace function public.can_manage_activity_event_promotions()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('Coordinator', 'Main Admin')
  );
$$;

revoke all on function public.can_manage_activity_event_promotions() from public;
grant execute on function public.can_manage_activity_event_promotions() to authenticated;

alter table public.activity_event_promotions enable row level security;

drop policy if exists "Read active Activity Center event promotions"
  on public.activity_event_promotions;
drop policy if exists "Manage Activity Center event promotions"
  on public.activity_event_promotions;

create policy "Read active Activity Center event promotions"
  on public.activity_event_promotions
  for select
  to authenticated
  using (
    public.can_manage_activity_event_promotions()
    or (
      is_active = true
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
      and exists (
        select 1
        from public.campus_events e
        where e.id = event_id
          and e.status = 'Published'
          and (
            e.event_date >= now()
            or e.end_date >= now()
          )
      )
    )
  );

create policy "Manage Activity Center event promotions"
  on public.activity_event_promotions
  for all
  to authenticated
  using (public.can_manage_activity_event_promotions())
  with check (public.can_manage_activity_event_promotions());

grant select, insert, update, delete
  on public.activity_event_promotions to authenticated;