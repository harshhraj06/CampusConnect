-- ============================================================
-- CAMPUSCONNECT
-- FIX COMMUNITY POST REPLY COUNT
--
-- Root cause:
-- hydrate_community_post_identity() protected reply_count on
-- every UPDATE, including the internal UPDATE performed by the
-- reply-count trigger.
--
-- Fix:
-- - Normal client UPDATE => reply_count remains server-owned.
-- - Nested trigger UPDATE => allow calculated reply_count.
-- - Recreate count triggers.
-- - Backfill all existing posts.
-- ============================================================


create or replace function public.hydrate_community_post_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  campus_profile record;
begin

  -- ----------------------------------------------------------
  -- UPDATE
  -- Keep author identity immutable.
  -- ----------------------------------------------------------

  if tg_op = 'UPDATE' then

    new.author_id :=
      old.author_id;

    new.author_name :=
      old.author_name;

    new.author_role :=
      old.author_role;

    new.author_campus_uid :=
      old.author_campus_uid;

    new.author_avatar_url :=
      old.author_avatar_url;

    new.created_at :=
      old.created_at;

    new.updated_at :=
      now();


    -- --------------------------------------------------------
    -- Protect reply_count from direct/client updates.
    --
    -- pg_trigger_depth() = 1
    --   normal community_posts UPDATE
    --
    -- pg_trigger_depth() > 1
    --   internal UPDATE caused by reply insert/delete trigger.
    --
    -- The nested trigger must be allowed to write the real
    -- calculated reply count.
    -- --------------------------------------------------------

    if pg_trigger_depth() <= 1 then
      new.reply_count :=
        old.reply_count;
    end if;


    return new;
  end if;


  -- ----------------------------------------------------------
  -- INSERT
  -- Identity comes only from authenticated profile.
  -- ----------------------------------------------------------

  if (
    select auth.uid()
  ) is null then
    raise exception
      'Authentication required';
  end if;


  select
    profile.full_name,
    profile.role,
    coalesce(
      profile.campus_uid,
      ''
    ) as campus_uid,
    profile.avatar_url

  into campus_profile

  from public.profiles
    as profile

  where profile.id =
    (
      select auth.uid()
    );


  if not found then
    raise exception
      'Campus profile not found';
  end if;


  new.author_id :=
    (
      select auth.uid()
    );

  new.author_name :=
    campus_profile.full_name;

  new.author_role :=
    campus_profile.role;

  new.author_campus_uid :=
    campus_profile.campus_uid;

  new.author_avatar_url :=
    campus_profile.avatar_url;

  new.status :=
    'Open';

  new.reply_count :=
    0;


  return new;
end;
$$;


-- ============================================================
-- AUTHORITATIVE REPLY COUNT FUNCTION
-- ============================================================

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
    target_post_id :=
      old.post_id;
  else
    target_post_id :=
      new.post_id;
  end if;


  update public.community_posts
  as post

  set reply_count =
    (
      select
        count(*)::integer

      from public.community_post_replies
        as reply

      where reply.post_id =
        target_post_id
    )

  where post.id =
    target_post_id;


  if tg_op = 'DELETE' then
    return old;
  end if;


  return new;
end;
$$;


-- ============================================================
-- RECREATE TRIGGERS
-- ============================================================

drop trigger if exists
  sync_community_post_reply_count_insert
on public.community_post_replies;


drop trigger if exists
  sync_community_post_reply_count_delete
on public.community_post_replies;


create trigger
  sync_community_post_reply_count_insert

after insert
on public.community_post_replies

for each row

execute function
  public.sync_community_post_reply_count();


create trigger
  sync_community_post_reply_count_delete

after delete
on public.community_post_replies

for each row

execute function
  public.sync_community_post_reply_count();


-- ============================================================
-- REPAIR COUNTS FOR EXISTING POSTS
-- ============================================================

update public.community_posts
as post

set reply_count =
  (
    select
      count(*)::integer

    from public.community_post_replies
      as reply

    where reply.post_id =
      post.id
  );


notify pgrst,
  'reload schema';
