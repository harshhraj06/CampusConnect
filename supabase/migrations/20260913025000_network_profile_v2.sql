create or replace function public.can_view_network_profile(
  target_user uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = target_user
        and (
          p.id = auth.uid()

          or p.profile_visibility = 'campus'

          or (
            p.profile_visibility = 'connections'
            and exists (
              select 1
              from public.chat_connections c
              where c.status = 'Accepted'
                and (
                  (
                    c.requester_id = auth.uid()
                    and c.receiver_id = target_user
                  )
                  or
                  (
                    c.receiver_id = auth.uid()
                    and c.requester_id = target_user
                  )
                )
            )
          )
        )
    );
$$;

revoke all
on function public.can_view_network_profile(uuid)
from public, anon;

grant execute
on function public.can_view_network_profile(uuid)
to authenticated;


drop function if exists
  public.get_campus_public_profile(uuid);

create function public.get_campus_public_profile(
  target_user uuid
)
returns table (
  id uuid,
  full_name text,
  campus_uid text,
  department text,
  graduation_year text,
  role text,
  avatar_url text,
  cover_url text,
  headline text,
  bio text,
  skills text,
  location text,
  semester text,
  cgpa numeric,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  projects jsonb,
  achievements jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    coalesce(p.full_name, ''),
    coalesce(p.campus_uid, ''),
    coalesce(p.department, ''),
    coalesce(p.graduation_year::text, ''),
    coalesce(p.role::text, ''),
    p.avatar_url,
    p.cover_url,
    coalesce(p.headline, ''),
    coalesce(p.bio, ''),
    coalesce(p.skills, ''),
    coalesce(p.location, ''),
    coalesce(p.semester, ''),

    case
      when p.show_academics
      then p.cgpa
      else null
    end,

    coalesce(p.linkedin_url, ''),
    coalesce(p.github_url, ''),
    coalesce(p.portfolio_url, ''),

    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', pp.id,
            'title', pp.title,
            'description', pp.description,
            'tech_stack', pp.tech_stack,
            'project_url', pp.project_url,
            'github_url', pp.github_url
          )
          order by pp.created_at desc
        )
        from public.profile_projects pp
        where pp.owner_id = p.id
      ),
      '[]'::jsonb
    ),

    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', pa.id,
            'title', pa.title,
            'issuer', pa.issuer,
            'achievement_type', pa.achievement_type,
            'issued_at', pa.issued_at,
            'credential_url', pa.credential_url,
            'description', pa.description
          )
          order by
            pa.issued_at desc nulls last,
            pa.created_at desc
        )
        from public.profile_achievements pa
        where pa.owner_id = p.id
      ),
      '[]'::jsonb
    )

  from public.profiles p

  where p.id = target_user
    and public.can_view_network_profile(
      target_user
    )

  limit 1;
$$;

revoke all
on function public.get_campus_public_profile(uuid)
from public, anon;

grant execute
on function public.get_campus_public_profile(uuid)
to authenticated;

notify pgrst, 'reload schema';
