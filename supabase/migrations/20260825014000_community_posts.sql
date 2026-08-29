-- ============================================================
-- CAMPUSCONNECT — AUTHENTICATED COMMUNITY POSTS
-- Six role columns with server-owned author identity and RLS.
-- ============================================================

alter table public.profiles
  add column if not exists campus_uid text not null default '';

alter table public.profiles
  add column if not exists avatar_url text;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_role text not null check (
    author_role in (
      'Student',
      'Faculty',
      'Coordinator',
      'Placement Cell',
      'Volunteer',
      'Main Admin'
    )
  ),
  author_campus_uid text not null default '',
  author_avatar_url text,
  category text not null default 'General' check (
    category in (
      'Academic',
      'Question bank',
      'Technical issue',
      'Placement',
      'Campus service',
      'General'
    )
  ),
  title text not null check (char_length(trim(title)) between 5 and 160),
  body text not null check (char_length(trim(body)) between 10 and 5000),
  status text not null default 'Open' check (status in ('Open', 'Resolved')),
  reply_count integer not null default 0 check (reply_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_role text not null check (
    author_role in (
      'Student',
      'Faculty',
      'Coordinator',
      'Placement Cell',
      'Volunteer',
      'Main Admin'
    )
  ),
  author_campus_uid text not null default '',
  author_avatar_url text,
  body text not null check (char_length(trim(body)) between 1 and 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_created_idx
  on public.community_posts(created_at desc);

create index if not exists community_posts_role_created_idx
  on public.community_posts(author_role, created_at desc);

create index if not exists community_posts_status_idx
  on public.community_posts(status, created_at desc);

create index if not exists community_post_replies_post_idx
  on public.community_post_replies(post_id, created_at asc);

create or replace function public.hydrate_community_post_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  campus_profile record;
begin
  if tg_op = 'UPDATE' then
    new.author_id := old.author_id;
    new.author_name := old.author_name;
    new.author_role := old.author_role;
    new.author_campus_uid := old.author_campus_uid;
    new.author_avatar_url := old.author_avatar_url;
    new.reply_count := old.reply_count;
    new.created_at := old.created_at;
    new.updated_at := now();
    return new;
  end if;

  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select
    profile.full_name,
    profile.role,
    coalesce(profile.campus_uid, '') as campus_uid,
    profile.avatar_url
  into campus_profile
  from public.profiles as profile
  where profile.id = (select auth.uid());

  if not found then
    raise exception 'Campus profile not found';
  end if;

  new.author_id := (select auth.uid());
  new.author_name := campus_profile.full_name;
  new.author_role := campus_profile.role;
  new.author_campus_uid := campus_profile.campus_uid;
  new.author_avatar_url := campus_profile.avatar_url;

  new.status := 'Open';
  new.reply_count := 0;

  return new;
end;
$$;

create or replace function public.hydrate_community_reply_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  campus_profile record;
begin
  if tg_op = 'UPDATE' then
    new.post_id := old.post_id;
    new.author_id := old.author_id;
    new.author_name := old.author_name;
    new.author_role := old.author_role;
    new.author_campus_uid := old.author_campus_uid;
    new.author_avatar_url := old.author_avatar_url;
    new.created_at := old.created_at;
    new.updated_at := now();
    return new;
  end if;

  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select
    profile.full_name,
    profile.role,
    coalesce(profile.campus_uid, '') as campus_uid,
    profile.avatar_url
  into campus_profile
  from public.profiles as profile
  where profile.id = (select auth.uid());

  if not found then
    raise exception 'Campus profile not found';
  end if;

  new.author_id := (select auth.uid());
  new.author_name := campus_profile.full_name;
  new.author_role := campus_profile.role;
  new.author_campus_uid := campus_profile.campus_uid;
  new.author_avatar_url := campus_profile.avatar_url;

  return new;
end;
$$;

drop trigger if exists hydrate_community_post_identity
  on public.community_posts;

create trigger hydrate_community_post_identity
before insert or update on public.community_posts
for each row execute function public.hydrate_community_post_identity();

drop trigger if exists hydrate_community_reply_identity
  on public.community_post_replies;

create trigger hydrate_community_reply_identity
before insert or update on public.community_post_replies
for each row execute function public.hydrate_community_reply_identity();

create or replace function public.sync_community_post_reply_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_post_id uuid;
begin
  if tg_op = 'DELETE' then
    target_post_id := old.post_id;
  else
    target_post_id := new.post_id;
  end if;

  update public.community_posts as post
  set reply_count = (
    select count(*)::integer
    from public.community_post_replies as reply
    where reply.post_id = target_post_id
  )
  where post.id = target_post_id;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_community_post_reply_count_insert
  on public.community_post_replies;

drop trigger if exists sync_community_post_reply_count_delete
  on public.community_post_replies;

create trigger sync_community_post_reply_count_insert
after insert on public.community_post_replies
for each row execute function public.sync_community_post_reply_count();

create trigger sync_community_post_reply_count_delete
after delete on public.community_post_replies
for each row execute function public.sync_community_post_reply_count();

alter table public.community_posts enable row level security;
alter table public.community_post_replies enable row level security;

revoke all on public.community_posts from anon, authenticated;
revoke all on public.community_post_replies from anon, authenticated;

grant select, insert, update, delete
  on public.community_posts to authenticated;

grant select, insert, update, delete
  on public.community_post_replies to authenticated;

drop policy if exists "Campus reads community posts"
  on public.community_posts;
drop policy if exists "Campus creates own community posts"
  on public.community_posts;
drop policy if exists "Authors manage community posts"
  on public.community_posts;
drop policy if exists "Authors delete community posts"
  on public.community_posts;

create policy "Campus reads community posts"
on public.community_posts
for select to authenticated
using (true);

create policy "Campus creates own community posts"
on public.community_posts
for insert to authenticated
with check (author_id = (select auth.uid()));

create policy "Authors manage community posts"
on public.community_posts
for update to authenticated
using (
  author_id = (select auth.uid())
  or (select public.current_campus_role()) = 'Main Admin'
)
with check (
  author_id = (select auth.uid())
  or (select public.current_campus_role()) = 'Main Admin'
);

create policy "Authors delete community posts"
on public.community_posts
for delete to authenticated
using (
  author_id = (select auth.uid())
  or (select public.current_campus_role()) = 'Main Admin'
);

drop policy if exists "Campus reads community replies"
  on public.community_post_replies;
drop policy if exists "Campus creates own community replies"
  on public.community_post_replies;
drop policy if exists "Authors manage community replies"
  on public.community_post_replies;
drop policy if exists "Authors delete community replies"
  on public.community_post_replies;

create policy "Campus reads community replies"
on public.community_post_replies
for select to authenticated
using (true);

create policy "Campus creates own community replies"
on public.community_post_replies
for insert to authenticated
with check (author_id = (select auth.uid()));

create policy "Authors manage community replies"
on public.community_post_replies
for update to authenticated
using (
  author_id = (select auth.uid())
  or (select public.current_campus_role()) = 'Main Admin'
)
with check (
  author_id = (select auth.uid())
  or (select public.current_campus_role()) = 'Main Admin'
);

create policy "Authors delete community replies"
on public.community_post_replies
for delete to authenticated
using (
  author_id = (select auth.uid())
  or (select public.current_campus_role()) = 'Main Admin'
);

do $$
begin
  if exists (
    select 1 from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_posts'
  ) then
    alter publication supabase_realtime add table public.community_posts;
  end if;

  if exists (
    select 1 from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_post_replies'
  ) then
    alter publication supabase_realtime add table public.community_post_replies;
  end if;
end;
$$;

notify pgrst, 'reload schema';
