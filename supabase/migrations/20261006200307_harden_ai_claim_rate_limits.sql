create or replace function public.ai_claim_request(
  p_request_type text default 'chat',
  p_model text default '',
  p_hourly_limit integer default 20,
  p_daily_limit integer default 100
)
returns table(
  allowed boolean,
  usage_id uuid,
  hourly_used integer,
  daily_used integer
)
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_user uuid :=
    auth.uid();

  v_hourly integer :=
    0;

  v_daily integer :=
    0;

  v_usage uuid;

  v_hourly_limit integer :=
    least(
      greatest(
        coalesce(
          p_hourly_limit,
          20
        ),
        1
      ),
      20
    );

  v_daily_limit integer :=
    least(
      greatest(
        coalesce(
          p_daily_limit,
          100
        ),
        1
      ),
      100
    );
begin
  if v_user is null then
    raise exception
      'Authentication required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_user::text,
      0
    )
  );

  select
    count(*)::integer
  into
    v_hourly
  from public.ai_usage
  where
    user_id = v_user
    and created_at >=
      now() - interval '1 hour'
    and status in (
      'started',
      'completed'
    );

  select
    count(*)::integer
  into
    v_daily
  from public.ai_usage
  where
    user_id = v_user
    and created_at >=
      now() - interval '24 hours'
    and status in (
      'started',
      'completed'
    );

  if
    v_hourly >= v_hourly_limit
    or
    v_daily >= v_daily_limit
  then
    return query
    select
      false,
      null::uuid,
      v_hourly,
      v_daily;

    return;
  end if;

  insert into public.ai_usage (
    user_id,
    request_type,
    model,
    status
  )
  values (
    v_user,
    left(
      coalesce(
        nullif(
          trim(
            p_request_type
          ),
          ''
        ),
        'chat'
      ),
      80
    ),
    left(
      coalesce(
        p_model,
        ''
      ),
      160
    ),
    'started'
  )
  returning id
  into v_usage;

  return query
  select
    true,
    v_usage,
    v_hourly + 1,
    v_daily + 1;
end;
$function$;

revoke execute on function public.ai_claim_request(
  text,
  text,
  integer,
  integer
) from public, anon;

grant execute on function public.ai_claim_request(
  text,
  text,
  integer,
  integer
) to authenticated;

notify pgrst, 'reload schema';
