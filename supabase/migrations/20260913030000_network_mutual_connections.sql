create or replace function public.get_network_connection_stats(
  target_user uuid
)
returns table (
  connection_count bigint,
  mutual_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with target_connections as (
    select
      case
        when c.requester_id = target_user
          then c.receiver_id
        else c.requester_id
      end as user_id
    from public.chat_connections c
    where c.status = 'Accepted'
      and (
        c.requester_id = target_user
        or c.receiver_id = target_user
      )
  ),

  my_connections as (
    select
      case
        when c.requester_id = auth.uid()
          then c.receiver_id
        else c.requester_id
      end as user_id
    from public.chat_connections c
    where c.status = 'Accepted'
      and (
        c.requester_id = auth.uid()
        or c.receiver_id = auth.uid()
      )
  )

  select
    (
      select count(*)
      from target_connections
    )::bigint,

    (
      select count(*)
      from target_connections tc
      inner join my_connections mc
        on mc.user_id = tc.user_id
      where tc.user_id <> auth.uid()
        and tc.user_id <> target_user
    )::bigint

  where
    auth.uid() is not null
    and public.can_view_network_profile(
      target_user
    );
$$;

revoke all
on function public.get_network_connection_stats(uuid)
from public, anon;

grant execute
on function public.get_network_connection_stats(uuid)
to authenticated;


create or replace function public.get_network_mutual_connections(
  target_user uuid,
  result_limit integer default 6
)
returns table (
  id uuid,
  full_name text,
  campus_uid text,
  department text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  with target_connections as (
    select
      case
        when c.requester_id = target_user
          then c.receiver_id
        else c.requester_id
      end as user_id
    from public.chat_connections c
    where c.status = 'Accepted'
      and (
        c.requester_id = target_user
        or c.receiver_id = target_user
      )
  ),

  my_connections as (
    select
      case
        when c.requester_id = auth.uid()
          then c.receiver_id
        else c.requester_id
      end as user_id
    from public.chat_connections c
    where c.status = 'Accepted'
      and (
        c.requester_id = auth.uid()
        or c.receiver_id = auth.uid()
      )
  ),

  mutual_ids as (
    select distinct
      tc.user_id
    from target_connections tc
    inner join my_connections mc
      on mc.user_id = tc.user_id
    where tc.user_id <> auth.uid()
      and tc.user_id <> target_user
  )

  select
    p.id,
    coalesce(p.full_name, ''),
    coalesce(p.campus_uid, ''),
    coalesce(p.department, ''),
    p.avatar_url

  from mutual_ids m

  join public.profiles p
    on p.id = m.user_id

  where
    auth.uid() is not null
    and public.can_view_network_profile(
      target_user
    )
    and public.can_view_network_profile(
      p.id
    )

  order by
    p.full_name asc

  limit greatest(
    0,
    least(
      coalesce(result_limit, 6),
      20
    )
  );
$$;

revoke all
on function public.get_network_mutual_connections(uuid, integer)
from public, anon;

grant execute
on function public.get_network_mutual_connections(uuid, integer)
to authenticated;

notify pgrst, 'reload schema';
