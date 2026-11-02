-- CampusConnect class-specific Notice Board.
-- Independent from public.announcements to preserve existing feeds.

create table if not exists public.student_notices (
  id uuid primary key default gen_random_uuid(),
  target_batch_id uuid not null references public.attendance_batches(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  author_name text not null default 'CampusConnect Staff',
  title text not null check (char_length(btrim(title)) between 3 and 180),
  body text not null check (char_length(btrim(body)) between 3 and 4000),
  category text not null default 'Academic'
    check (category in ('Academic','Exam','Event','Placement','Urgent','General')),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_notices_batch_created_idx
  on public.student_notices (target_batch_id, created_at desc);

create index if not exists student_notices_pinned_idx
  on public.student_notices (target_batch_id, is_pinned desc, created_at desc);

alter table public.student_notices enable row level security;
grant select, insert, update, delete on public.student_notices to authenticated;

-- Return only batches relevant to the signed-in account.
-- SECURITY DEFINER keeps the student roster private.
create or replace function public.get_my_notice_batches()
returns table (
  batch_id uuid,
  batch_name text,
  section text,
  department text,
  semester text,
  academic_year text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    b.batch_name,
    b.section,
    b.department,
    b.semester,
    b.academic_year
  from public.attendance_batches b
  where auth.uid() is not null
    and (
      public.current_campus_role() in ('Coordinator', 'Main Admin')
      or (
        public.current_campus_role() = 'Student'
        and exists (
          select 1
          from public.attendance_batch_students m
          where m.batch_id = b.id
            and m.student_id = auth.uid()
        )
      )
      or (
        public.current_campus_role() = 'Faculty'
        and (
          exists (
            select 1
            from public.attendance_batch_subjects s
            where s.batch_id = b.id
              and s.faculty_id = auth.uid()
          )
          or exists (
            select 1
            from public.faculty_teaching_allocations a
            where a.batch_id = b.id
              and a.faculty_id = auth.uid()
              and a.status = 'Active'
          )
        )
      )
    )
  order by b.department, b.semester, b.section, b.batch_name;
$$;

revoke all on function public.get_my_notice_batches() from public, anon;
grant execute on function public.get_my_notice_batches() to authenticated;

-- Re-check authorization inside Postgres for every read and write.
create or replace function public.can_manage_student_notice_batch(p_batch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.attendance_batches b
      where b.id = p_batch_id
        and (
          public.current_campus_role() in ('Coordinator', 'Main Admin')
          or (
            public.current_campus_role() = 'Faculty'
            and (
              exists (
                select 1
                from public.attendance_batch_subjects s
                where s.batch_id = b.id
                  and s.faculty_id = auth.uid()
              )
              or exists (
                select 1
                from public.faculty_teaching_allocations a
                where a.batch_id = b.id
                  and a.faculty_id = auth.uid()
                  and a.status = 'Active'
              )
            )
          )
        )
    );
$$;

create or replace function public.is_my_student_notice_batch(p_batch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and public.current_campus_role() = 'Student'
    and exists (
      select 1
      from public.attendance_batch_students m
      where m.batch_id = p_batch_id
        and m.student_id = auth.uid()
    );
$$;

revoke all on function public.can_manage_student_notice_batch(uuid) from public, anon;
revoke all on function public.is_my_student_notice_batch(uuid) from public, anon;
grant execute on function public.can_manage_student_notice_batch(uuid) to authenticated;
grant execute on function public.is_my_student_notice_batch(uuid) to authenticated;

drop policy if exists "Read notices for assigned class" on public.student_notices;
create policy "Read notices for assigned class"
on public.student_notices
for select
to authenticated
using (
  public.can_manage_student_notice_batch(target_batch_id)
  or public.is_my_student_notice_batch(target_batch_id)
);

drop policy if exists "Staff post notices to assigned class" on public.student_notices;
create policy "Staff post notices to assigned class"
on public.student_notices
for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.can_manage_student_notice_batch(target_batch_id)
);

drop policy if exists "Staff update notices in assigned class" on public.student_notices;
create policy "Staff update notices in assigned class"
on public.student_notices
for update
to authenticated
using (public.can_manage_student_notice_batch(target_batch_id))
with check (public.can_manage_student_notice_batch(target_batch_id));

drop policy if exists "Staff delete notices in assigned class" on public.student_notices;
create policy "Staff delete notices in assigned class"
on public.student_notices
for delete
to authenticated
using (public.can_manage_student_notice_batch(target_batch_id));

notify pgrst, 'reload schema';
