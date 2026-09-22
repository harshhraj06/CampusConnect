-- ============================================================
-- CAMPUSCONNECT — STUDENT CALENDAR
-- Faculty + Main Admin manage.
-- Authenticated campus users read published calendar entries.
-- ============================================================

create table if not exists public.campus_calendar_entries (
  id uuid primary key default gen_random_uuid(),

  title text not null
    check (char_length(trim(title)) between 2 and 180),

  description text not null default '',

  category text not null default 'Academic'
    check (
      category in (
        'Holiday',
        'Event',
        'Exam',
        'Academic',
        'Workshop',
        'Placement',
        'Deadline',
        'Meeting',
        'Other'
      )
    ),

  start_at timestamptz not null,
  end_at timestamptz,

  all_day boolean not null default false,

  venue text not null default '',
  organizer text not null default '',

  audience text not null default 'All Students'
    check (
      audience in (
        'All Students',
        'Department',
        'Graduation Year'
      )
    ),

  department text,
  graduation_year text,

  related_url text,

  status text not null default 'Published'
    check (
      status in (
        'Published',
        'Draft',
        'Cancelled'
      )
    ),

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campus_calendar_valid_range
    check (
      end_at is null
      or end_at >= start_at
    )
);

create index if not exists
  campus_calendar_entries_start_at_idx
on public.campus_calendar_entries(start_at);

create index if not exists
  campus_calendar_entries_status_idx
on public.campus_calendar_entries(status);

create index if not exists
  campus_calendar_entries_category_idx
on public.campus_calendar_entries(category);


create or replace function
public.can_manage_student_calendar()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_campus_role()
    in (
      'Faculty',
      'Main Admin'
    );
$$;

revoke all
on function public.can_manage_student_calendar()
from public;

grant execute
on function public.can_manage_student_calendar()
to authenticated;


alter table public.campus_calendar_entries
enable row level security;


drop policy if exists
  "Campus users read published calendar"
on public.campus_calendar_entries;

create policy
  "Campus users read published calendar"
on public.campus_calendar_entries
for select
to authenticated
using (
  status = 'Published'
  or public.can_manage_student_calendar()
);


drop policy if exists
  "Faculty and admin create calendar entries"
on public.campus_calendar_entries;

create policy
  "Faculty and admin create calendar entries"
on public.campus_calendar_entries
for insert
to authenticated
with check (
  public.can_manage_student_calendar()
  and created_by = auth.uid()
);


drop policy if exists
  "Faculty and admin update calendar entries"
on public.campus_calendar_entries;

create policy
  "Faculty and admin update calendar entries"
on public.campus_calendar_entries
for update
to authenticated
using (
  public.can_manage_student_calendar()
)
with check (
  public.can_manage_student_calendar()
);


drop policy if exists
  "Faculty and admin delete calendar entries"
on public.campus_calendar_entries;

create policy
  "Faculty and admin delete calendar entries"
on public.campus_calendar_entries
for delete
to authenticated
using (
  public.can_manage_student_calendar()
);


grant select
on public.campus_calendar_entries
to authenticated;

grant insert, update, delete
on public.campus_calendar_entries
to authenticated;


create or replace function
public.set_campus_calendar_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists
  campus_calendar_entries_updated_at
on public.campus_calendar_entries;

create trigger
  campus_calendar_entries_updated_at
before update
on public.campus_calendar_entries
for each row
execute function
  public.set_campus_calendar_updated_at();
