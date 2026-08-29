create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'Student' check (
    role in (
      'Student',
      'Faculty',
      'Placement Cell',
      'Coordinator',
      'Volunteer',
      'Main Admin'
    )
  ),
  department text not null default 'ECE',
  graduation_year text not null default '2027',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create or replace function public.handle_new_campus_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, department, graduation_year)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    'Student',
    coalesce(nullif(new.raw_user_meta_data ->> 'department', ''), 'ECE'),
    coalesce(nullif(new.raw_user_meta_data ->> 'graduation_year', ''), '2027')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_campus_user();

-- Promote trusted staff manually from the Supabase SQL editor, never from client code:
-- update public.profiles set role = 'Faculty' where id = '<trusted-user-uuid>';
-- update public.profiles set role = 'Placement Cell' where id = '<trusted-user-uuid>';

-- CampusConnect connected modules -------------------------------------------------
-- This section is idempotent: it can be run again after future updates.

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists skills text not null default '';
alter table public.profiles add column if not exists phone text not null default '';
alter table public.profiles add column if not exists usn text not null default '';

update public.profiles as profile
set email = coalesce(account.email, '')
from auth.users as account
where profile.id = account.id and profile.email = '';

create or replace function public.current_campus_role()
returns text
language sql
stable
security definer set search_path = ''
as $$
  select profile.role from public.profiles as profile where profile.id = (select auth.uid());
$$;

create or replace function public.current_campus_department()
returns text
language sql
stable
security definer set search_path = ''
as $$
  select profile.department from public.profiles as profile where profile.id = (select auth.uid());
$$;

revoke all on function public.current_campus_role() from public;
revoke all on function public.current_campus_department() from public;
grant execute on function public.current_campus_role() to authenticated;
grant execute on function public.current_campus_department() to authenticated;

drop policy if exists "Users can read their profile" on public.profiles;
drop policy if exists "Campus profile directory access" on public.profiles;
create policy "Campus profile directory access"
on public.profiles for select to authenticated
using (
  (select auth.uid()) = id
  or (select public.current_campus_role()) in ('Faculty', 'Placement Cell')
);

revoke update on table public.profiles from authenticated;
grant update (full_name, department, graduation_year, bio, skills, phone, usn, updated_at) on public.profiles to authenticated;
drop policy if exists "Users update their safe profile fields" on public.profiles;
create policy "Users update their safe profile fields"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.admin_set_profile_role(target_user_id uuid, next_role text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if (select public.current_campus_role()) is distinct from 'Placement Cell' then
    raise exception 'Only Placement Cell administrators can change roles';
  end if;
  if next_role not in ('Student', 'Faculty', 'Placement Cell') then
    raise exception 'Invalid CampusConnect role';
  end if;
  update public.profiles
  set role = next_role, updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.admin_set_profile_role(uuid, text) from public;
grant execute on function public.admin_set_profile_role(uuid, text) to authenticated;

create or replace function public.handle_new_campus_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role, department, graduation_year)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    'Student',
    coalesce(nullif(new.raw_user_meta_data ->> 'department', ''), 'ECE'),
    coalesce(nullif(new.raw_user_meta_data ->> 'graduation_year', ''), '2027')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  title text not null check (char_length(title) between 3 and 180),
  body text not null check (char_length(body) between 3 and 4000),
  category text not null default 'Academic',
  audience text not null default 'All' check (audience in ('Student', 'Faculty', 'Placement Cell', 'All')),
  department text not null default 'All',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_by_name text not null,
  title text not null,
  subject text not null,
  description text not null default '',
  due_at timestamptz not null,
  audience_department text not null default 'All',
  kind text not null default 'Academic' check (kind in ('Academic', 'Project', 'Placement')),
  created_at timestamptz not null default now()
);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  status text not null default 'Submitted',
  submission_url text not null default '',
  submitted_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  subject text not null,
  attended integer not null default 0 check (attended >= 0),
  total integer not null default 0 check (total >= attended),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (student_id, subject)
);

create table if not exists public.placement_applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  company text not null,
  role_title text not null,
  status text not null default 'Applied' check (status in ('Applied', 'Shortlisted', 'Assessment', 'Interview', 'Offered', 'Rejected')),
  next_step text not null default 'Awaiting review',
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, company, role_title)
);

create table if not exists public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  added_by uuid not null references auth.users(id) on delete cascade,
  contributor_name text not null,
  resource_type text not null check (
    resource_type in (
      'Video',
      'PYQ',
      'PDF',
      'Notes',
      'Lab Manual',
      'Important Questions',
      'Assignment Material',
      'External Link'
    )
  ),
  subject text not null,
  title text not null,
  url text not null,
  academic_year text not null default '',
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.secure_learning_resource()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.added_by := (select auth.uid());
  else
    new.added_by := old.added_by;
  end if;
  new.is_verified := (select public.current_campus_role()) in (
    'Faculty',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  );
  return new;
end;
$$;

drop trigger if exists secure_learning_resource_insert on public.learning_resources;
drop trigger if exists secure_learning_resource_write on public.learning_resources;
create trigger secure_learning_resource_write
before insert or update on public.learning_resources
for each row execute procedure public.secure_learning_resource();

create table if not exists public.community_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_name text not null,
  name text not null check (char_length(name) between 3 and 100),
  description text not null default '',
  audience text not null default 'All' check (audience in ('Student', 'Faculty', 'Placement Cell', 'All')),
  topic text not null default 'Discussion',
  member_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.community_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_name text not null,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members as membership
    where membership.group_id = target_group_id
      and membership.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_group_member(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;

create or replace function public.sync_group_member_count()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.community_groups
  set member_count = (
    select count(*)::integer from public.group_members
    where group_id = coalesce(new.group_id, old.group_id)
  )
  where id = coalesce(new.group_id, old.group_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_group_member_count_insert on public.group_members;
drop trigger if exists sync_group_member_count_delete on public.group_members;
create trigger sync_group_member_count_insert after insert on public.group_members for each row execute procedure public.sync_group_member_count();
create trigger sync_group_member_count_delete after delete on public.group_members for each row execute procedure public.sync_group_member_count();

create table if not exists public.profile_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  file_size integer not null check (file_size between 1 and 5242880),
  document_type text not null default 'Other',
  created_at timestamptz not null default now()
);

create index if not exists announcements_created_at_idx on public.announcements(created_at desc);
create index if not exists assignments_due_at_idx on public.assignments(due_at);
create index if not exists attendance_student_idx on public.attendance_records(student_id);
create index if not exists applications_student_idx on public.placement_applications(student_id);
create index if not exists learning_subject_idx on public.learning_resources(subject);
create index if not exists messages_group_created_idx on public.group_messages(group_id, created_at);

alter table public.announcements enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.placement_applications enable row level security;
alter table public.learning_resources enable row level security;
alter table public.community_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.profile_documents enable row level security;

revoke all on public.announcements, public.assignments, public.assignment_submissions, public.attendance_records, public.placement_applications, public.learning_resources, public.community_groups, public.group_members, public.group_messages, public.profile_documents from anon, authenticated;
grant select, insert, update, delete on public.announcements, public.assignments, public.assignment_submissions, public.attendance_records, public.placement_applications, public.learning_resources, public.community_groups, public.group_members, public.group_messages, public.profile_documents to authenticated;

drop policy if exists "Relevant announcements are visible" on public.announcements;
drop policy if exists "Staff publish announcements" on public.announcements;
drop policy if exists "Authors manage announcements" on public.announcements;
drop policy if exists "Authors delete announcements" on public.announcements;
create policy "Relevant announcements are visible" on public.announcements for select to authenticated using (
  author_id = (select auth.uid())
  or (
    (audience = 'All' or audience = (select public.current_campus_role()))
    and (department = 'All' or department = (select public.current_campus_department()))
  )
);
create policy "Staff publish announcements" on public.announcements for insert to authenticated with check (
  author_id = (select auth.uid()) and (select public.current_campus_role()) in ('Faculty', 'Placement Cell')
);
create policy "Authors manage announcements" on public.announcements for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "Authors delete announcements" on public.announcements for delete to authenticated using (author_id = (select auth.uid()));

drop policy if exists "Relevant assignments are visible" on public.assignments;
drop policy if exists "Staff create assignments" on public.assignments;
drop policy if exists "Authors manage assignments" on public.assignments;
drop policy if exists "Authors delete assignments" on public.assignments;
create policy "Relevant assignments are visible" on public.assignments for select to authenticated using (
  created_by = (select auth.uid())
  or audience_department = 'All'
  or audience_department = (select public.current_campus_department())
  or (select public.current_campus_role()) in ('Faculty', 'Placement Cell')
);
create policy "Staff create assignments" on public.assignments for insert to authenticated with check (created_by = (select auth.uid()) and (select public.current_campus_role()) in ('Faculty', 'Placement Cell'));
create policy "Authors manage assignments" on public.assignments for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy "Authors delete assignments" on public.assignments for delete to authenticated using (created_by = (select auth.uid()));

drop policy if exists "Submission access" on public.assignment_submissions;
drop policy if exists "Students submit their work" on public.assignment_submissions;
drop policy if exists "Students update their submission" on public.assignment_submissions;
create policy "Submission access" on public.assignment_submissions for select to authenticated using (student_id = (select auth.uid()) or (select public.current_campus_role()) in ('Faculty', 'Placement Cell'));
create policy "Students submit their work" on public.assignment_submissions for insert to authenticated with check (student_id = (select auth.uid()) and (select public.current_campus_role()) = 'Student');
create policy "Students update their submission" on public.assignment_submissions for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

drop policy if exists "Attendance access" on public.attendance_records;
drop policy if exists "Staff record attendance" on public.attendance_records;
drop policy if exists "Staff update attendance" on public.attendance_records;
create policy "Attendance access" on public.attendance_records for select to authenticated using (student_id = (select auth.uid()) or (select public.current_campus_role()) in ('Faculty', 'Placement Cell'));
create policy "Staff record attendance" on public.attendance_records for insert to authenticated with check ((select public.current_campus_role()) in ('Faculty', 'Placement Cell'));
create policy "Staff update attendance" on public.attendance_records for update to authenticated using ((select public.current_campus_role()) in ('Faculty', 'Placement Cell')) with check ((select public.current_campus_role()) in ('Faculty', 'Placement Cell'));

drop policy if exists "Application access" on public.placement_applications;
drop policy if exists "Students create applications" on public.placement_applications;
drop policy if exists "Placement staff update applications" on public.placement_applications;
create policy "Application access" on public.placement_applications for select to authenticated using (student_id = (select auth.uid()) or (select public.current_campus_role()) = 'Placement Cell');
create policy "Students create applications" on public.placement_applications for insert to authenticated with check (student_id = (select auth.uid()) and (select public.current_campus_role()) = 'Student');
create policy "Placement staff update applications" on public.placement_applications for update to authenticated using ((select public.current_campus_role()) = 'Placement Cell') with check ((select public.current_campus_role()) = 'Placement Cell');

drop policy if exists "Campus reads learning resources" on public.learning_resources;
drop policy if exists "Campus adds learning resources" on public.learning_resources;
drop policy if exists "Owners manage learning resources" on public.learning_resources;
drop policy if exists "Owners delete learning resources" on public.learning_resources;
create policy "Campus reads learning resources" on public.learning_resources for select to authenticated using (true);
create policy "Campus adds learning resources" on public.learning_resources for insert to authenticated with check (added_by = (select auth.uid()));
create policy "Owners manage learning resources" on public.learning_resources for update to authenticated using (added_by = (select auth.uid()) or (select public.current_campus_role()) in ('Faculty', 'Placement Cell')) with check (added_by = (select auth.uid()) or (select public.current_campus_role()) in ('Faculty', 'Placement Cell'));
create policy "Owners delete learning resources" on public.learning_resources for delete to authenticated using (added_by = (select auth.uid()) or (select public.current_campus_role()) in ('Faculty', 'Placement Cell'));

drop policy if exists "Campus discovers groups" on public.community_groups;
drop policy if exists "Users create groups" on public.community_groups;
drop policy if exists "Owners manage groups" on public.community_groups;
drop policy if exists "Owners delete groups" on public.community_groups;
create policy "Campus discovers groups" on public.community_groups for select to authenticated using (true);
create policy "Users create groups" on public.community_groups for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners manage groups" on public.community_groups for update to authenticated using (owner_id = (select auth.uid()) or (select public.current_campus_role()) = 'Placement Cell') with check (owner_id = (select auth.uid()) or (select public.current_campus_role()) = 'Placement Cell');
create policy "Owners delete groups" on public.community_groups for delete to authenticated using (owner_id = (select auth.uid()) or (select public.current_campus_role()) = 'Placement Cell');

drop policy if exists "Users read their memberships" on public.group_members;
drop policy if exists "Users join groups" on public.group_members;
drop policy if exists "Users leave groups" on public.group_members;
create policy "Users read their memberships" on public.group_members for select to authenticated using (user_id = (select auth.uid()) or (select public.current_campus_role()) = 'Placement Cell');
create policy "Users join groups" on public.group_members for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.community_groups as community
    where community.id = group_id
      and (
        community.owner_id = (select auth.uid())
        or community.audience = 'All'
        or community.audience = (select public.current_campus_role())
      )
  )
);
create policy "Users leave groups" on public.group_members for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Members read messages" on public.group_messages;
drop policy if exists "Members send messages" on public.group_messages;
drop policy if exists "Senders delete messages" on public.group_messages;
create policy "Members read messages" on public.group_messages for select to authenticated using ((select public.is_group_member(group_id)));
create policy "Members send messages" on public.group_messages for insert to authenticated with check (sender_id = (select auth.uid()) and (select public.is_group_member(group_id)));
create policy "Senders delete messages" on public.group_messages for delete to authenticated using (sender_id = (select auth.uid()) or (select public.current_campus_role()) = 'Placement Cell');

drop policy if exists "Document owner access" on public.profile_documents;
drop policy if exists "Document owner insert" on public.profile_documents;
drop policy if exists "Document owner delete" on public.profile_documents;
create policy "Document owner access" on public.profile_documents for select to authenticated using (owner_id = (select auth.uid()) or (select public.current_campus_role()) = 'Placement Cell');
create policy "Document owner insert" on public.profile_documents for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Document owner delete" on public.profile_documents for delete to authenticated using (owner_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit)
values ('campus-documents', 'campus-documents', false, 5242880)
on conflict (id) do update set public = false, file_size_limit = 5242880;

drop policy if exists "Campus users upload private documents" on storage.objects;
drop policy if exists "Campus users read permitted documents" on storage.objects;
drop policy if exists "Campus users delete private documents" on storage.objects;
create policy "Campus users upload private documents" on storage.objects for insert to authenticated with check (
  bucket_id = 'campus-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy "Campus users read permitted documents" on storage.objects for select to authenticated using (
  bucket_id = 'campus-documents'
  and (owner_id = (select auth.uid()::text) or (select public.current_campus_role()) = 'Placement Cell')
);
create policy "Campus users delete private documents" on storage.objects for delete to authenticated using (
  bucket_id = 'campus-documents' and owner_id = (select auth.uid()::text)
);

-- Production placement + networking tables --------------------------------------
create table if not exists public.placement_drives (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role_title text not null,
  compensation text not null default '',
  deadline timestamptz not null,
  match_score integer not null default 80 check (match_score between 0 and 100),
  logo_label text not null default '',
  location text not null default '',
  work_mode text not null default 'Hybrid',
  employment_type text not null default 'Full-time',
  minimum_cgpa numeric(3,1) not null default 0,
  branches text[] not null default '{}',
  skills text[] not null default '{}',
  about text not null default '',
  rounds text[] not null default '{}',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_placements (
  student_id uuid not null references auth.users(id) on delete cascade,
  placement_id uuid not null references public.placement_drives(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, placement_id)
);

create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists placement_drives_deadline_idx on public.placement_drives(deadline);
create index if not exists connection_addressee_idx on public.connection_requests(addressee_id);

alter table public.placement_drives enable row level security;
alter table public.saved_placements enable row level security;
alter table public.connection_requests enable row level security;
revoke all on public.placement_drives, public.saved_placements, public.connection_requests from anon, authenticated;
grant select, insert, update, delete on public.placement_drives, public.saved_placements, public.connection_requests to authenticated;

drop policy if exists "Campus can read placement drives" on public.placement_drives;
drop policy if exists "Placement staff create drives" on public.placement_drives;
drop policy if exists "Placement staff manage drives" on public.placement_drives;
create policy "Campus can read placement drives" on public.placement_drives for select to authenticated using (true);
create policy "Placement staff create drives" on public.placement_drives for insert to authenticated with check ((select public.current_campus_role()) = 'Placement Cell' and created_by = (select auth.uid()));
create policy "Placement staff manage drives" on public.placement_drives for update to authenticated using ((select public.current_campus_role()) = 'Placement Cell') with check ((select public.current_campus_role()) = 'Placement Cell');

create policy "Students manage their saved placements" on public.saved_placements for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

drop policy if exists "Users manage own connection requests" on public.connection_requests;
drop policy if exists "Users read connection requests" on public.connection_requests;
create policy "Users read connection requests" on public.connection_requests for select to authenticated using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));
create policy "Users manage own connection requests" on public.connection_requests for insert to authenticated with check (requester_id = (select auth.uid()));
create policy "Users update received connection requests" on public.connection_requests for update to authenticated using (addressee_id = (select auth.uid()) or requester_id = (select auth.uid())) with check (addressee_id = (select auth.uid()) or requester_id = (select auth.uid()));

-- Private document storage bucket. Run this block once in the project SQL editor.
insert into storage.buckets (id, name, public) values ('campus-documents', 'campus-documents', false) on conflict (id) do nothing;

drop policy if exists "Campus document owner access" on storage.objects;
drop policy if exists "Campus document owner upload" on storage.objects;
drop policy if exists "Campus document owner delete" on storage.objects;
create policy "Campus document owner access" on storage.objects for select to authenticated using (bucket_id = 'campus-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Campus document owner upload" on storage.objects for insert to authenticated with check (bucket_id = 'campus-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Campus document owner delete" on storage.objects for delete to authenticated using (bucket_id = 'campus-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Safe directory view: exposes only professional/public profile fields.
drop view if exists public.campus_directory;
create view public.campus_directory with (security_invoker = true) as
select
  id,
  full_name,
  role,
  department,
  graduation_year,
  bio,
  skills,
  avatar_url
from public.profiles;
grant select on public.campus_directory to authenticated;

-- Avoid duplicate-policy errors when the schema is re-run.
drop policy if exists "Students manage their saved placements" on public.saved_placements;
create policy "Students manage their saved placements" on public.saved_placements for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

drop policy if exists "Placement staff delete drives" on public.placement_drives;
create policy "Placement staff delete drives" on public.placement_drives for delete to authenticated using ((select public.current_campus_role()) = 'Placement Cell');

-- College integration connection metadata. Never store DOB here. The actual
-- college credential exchange must happen in an approved server-side connector.
create table if not exists public.college_connections (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references auth.users(id) on delete cascade,
  provider text not null default 'RNSIT Contineo',
  external_username text not null,
  status text not null default 'not_connected' check (status in ('not_connected','connected','error','revoked','pending')),
  last_synced_at timestamptz,
  last_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.college_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'RNSIT Contineo',
  subject_code text not null default '',
  subject_name text not null,
  attended integer not null default 0 check (attended >= 0),
  total integer not null default 0 check (total >= attended),
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  unique(student_id, provider, subject_code)
);

create table if not exists public.college_marks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'RNSIT Contineo',
  subject_code text not null default '',
  subject_name text not null,
  assessment text not null,
  marks numeric,
  max_marks numeric,
  grade text not null default '',
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  unique(student_id, provider, subject_code, assessment)
);

alter table public.college_connections enable row level security;
alter table public.college_attendance enable row level security;
alter table public.college_marks enable row level security;
revoke all on public.college_connections, public.college_attendance, public.college_marks from anon, authenticated;
grant select, insert, update, delete on public.college_connections, public.college_attendance, public.college_marks to authenticated;

drop policy if exists "Students manage their college connection" on public.college_connections;
create policy "Students manage their college connection" on public.college_connections for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
drop policy if exists "Students read their synced attendance" on public.college_attendance;
create policy "Students read their synced attendance" on public.college_attendance for select to authenticated using (student_id = (select auth.uid()));
drop policy if exists "Students read their synced marks" on public.college_marks;
create policy "Students read their synced marks" on public.college_marks for select to authenticated using (student_id = (select auth.uid()));

-- RNSIT semester results and fee records synced by the server-side connector.
create table if not exists public.college_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'RNSIT Contineo',
  semester text not null,
  sgpa numeric,
  cgpa numeric,
  grade text not null default '',
  result_status text not null default 'Published',
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  unique(student_id, provider, semester)
);

create table if not exists public.college_fees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'RNSIT Contineo',
  fee_key text not null,
  fee_type text not null default 'College fee',
  academic_year text not null default '',
  amount numeric,
  paid_amount numeric,
  status text not null default 'Unknown',
  due_date date,
  transaction_reference text not null default '',
  synced_at timestamptz not null default now(),
  unique(student_id, provider, fee_key)
);

alter table public.college_results enable row level security;
alter table public.college_fees enable row level security;
revoke all on public.college_results, public.college_fees from anon, authenticated;
grant select on public.college_results, public.college_fees to authenticated;
drop policy if exists "Students read their synced results" on public.college_results;
create policy "Students read their synced results" on public.college_results for select to authenticated using (student_id = (select auth.uid()));
drop policy if exists "Students read their synced fees" on public.college_fees;
create policy "Students read their synced fees" on public.college_fees for select to authenticated using (student_id = (select auth.uid()));
