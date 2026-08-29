-- ============================================================
-- CAMPUSCONNECT AI INTELLIGENCE LAYER
-- PHASE 1 — FOUNDATION
-- ============================================================

create extension if not exists vector
with schema extensions;


-- ============================================================
-- AI CONVERSATIONS
-- ============================================================

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null
    default 'New conversation',

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


-- ============================================================
-- AI MESSAGES
-- ============================================================

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null
    references public.ai_conversations(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  role text not null
    check (
      role in (
        'user',
        'assistant'
      )
    ),

  content text not null
    check (
      char_length(content)
        between 1 and 30000
    ),

  sources jsonb not null
    default '[]'::jsonb,

  model text not null
    default '',

  input_tokens integer not null
    default 0
    check (input_tokens >= 0),

  output_tokens integer not null
    default 0
    check (output_tokens >= 0),

  created_at timestamptz not null
    default now()
);


-- ============================================================
-- AI USAGE + COST CONTROL
-- ============================================================

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  conversation_id uuid
    references public.ai_conversations(id)
    on delete set null,

  request_type text not null
    default 'chat',

  model text not null
    default '',

  input_tokens integer not null
    default 0
    check (input_tokens >= 0),

  output_tokens integer not null
    default 0
    check (output_tokens >= 0),

  estimated_cost numeric(14, 8)
    not null
    default 0
    check (estimated_cost >= 0),

  status text not null
    default 'started'
    check (
      status in (
        'started',
        'completed',
        'failed'
      )
    ),

  error_code text not null
    default '',

  created_at timestamptz not null
    default now()
);


-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists
ai_conversations_user_created_idx
on public.ai_conversations(
  user_id,
  created_at desc
);

create index if not exists
ai_messages_conversation_created_idx
on public.ai_messages(
  conversation_id,
  created_at
);

create index if not exists
ai_usage_user_created_idx
on public.ai_usage(
  user_id,
  created_at desc
);

create index if not exists
ai_usage_created_idx
on public.ai_usage(
  created_at desc
);


-- ============================================================
-- RLS
-- ============================================================

alter table
  public.ai_conversations
enable row level security;

alter table
  public.ai_messages
enable row level security;

alter table
  public.ai_usage
enable row level security;


revoke all on
  public.ai_conversations,
  public.ai_messages,
  public.ai_usage
from anon;


grant
  select,
  insert,
  update,
  delete
on public.ai_conversations
to authenticated;


grant
  select,
  insert,
  update,
  delete
on public.ai_messages
to authenticated;


grant
  select,
  insert,
  update
on public.ai_usage
to authenticated;


-- ============================================================
-- CONVERSATION POLICIES
-- ============================================================

drop policy if exists
  "Users manage own AI conversations"
on public.ai_conversations;

create policy
  "Users manage own AI conversations"
on public.ai_conversations
for all
to authenticated

using (
  user_id =
    (select auth.uid())
)

with check (
  user_id =
    (select auth.uid())
);


-- ============================================================
-- MESSAGE POLICIES
-- ============================================================

drop policy if exists
  "Users manage own AI messages"
on public.ai_messages;

create policy
  "Users manage own AI messages"
on public.ai_messages
for all
to authenticated

using (
  user_id =
    (select auth.uid())

  and exists (
    select 1
    from public.ai_conversations c
    where
      c.id = conversation_id
      and
      c.user_id =
        (select auth.uid())
  )
)

with check (
  user_id =
    (select auth.uid())

  and exists (
    select 1
    from public.ai_conversations c
    where
      c.id = conversation_id
      and
      c.user_id =
        (select auth.uid())
  )
);


-- ============================================================
-- USAGE POLICIES
-- Students see their own usage.
-- Main Admin can view usage analytics.
-- Main Admin does NOT automatically get access to chat content.
-- ============================================================

drop policy if exists
  "AI usage access"
on public.ai_usage;

create policy
  "AI usage access"
on public.ai_usage
for select
to authenticated

using (
  user_id =
    (select auth.uid())

  or

  (
    select public.current_campus_role()
  ) = 'Main Admin'
);


drop policy if exists
  "Users create own AI usage"
on public.ai_usage;

create policy
  "Users create own AI usage"
on public.ai_usage
for insert
to authenticated

with check (
  user_id =
    (select auth.uid())
);


drop policy if exists
  "Users update own AI usage"
on public.ai_usage;

create policy
  "Users update own AI usage"
on public.ai_usage
for update
to authenticated

using (
  user_id =
    (select auth.uid())
)

with check (
  user_id =
    (select auth.uid())
);


-- ============================================================
-- ATOMIC AI RATE LIMIT
--
-- Default:
-- 20 requests / hour
-- 100 requests / day
--
-- We can tune these later without changing the frontend.
-- ============================================================

create or replace function
public.ai_claim_request(
  p_request_type text
    default 'chat',

  p_model text
    default '',

  p_hourly_limit integer
    default 20,

  p_daily_limit integer
    default 100
)

returns table (
  allowed boolean,
  usage_id uuid,
  hourly_used integer,
  daily_used integer
)

language plpgsql

security definer

set search_path =
  public,
  auth

as $$
declare

  v_user uuid :=
    auth.uid();

  v_hourly integer :=
    0;

  v_daily integer :=
    0;

  v_usage uuid;

begin

  if v_user is null then
    raise exception
      'Authentication required';
  end if;


  -- Prevent simultaneous requests from bypassing
  -- the rate limiter for the same user.

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

    and
    created_at >=
      now() - interval '1 hour'

    and
    status in (
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

    and
    created_at >=
      now() - interval '24 hours'

    and
    status in (
      'started',
      'completed'
    );


  if
    v_hourly >=
      greatest(
        coalesce(
          p_hourly_limit,
          20
        ),
        1
      )

    or

    v_daily >=
      greatest(
        coalesce(
          p_daily_limit,
          100
        ),
        1
      )

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
    coalesce(
      nullif(
        trim(
          p_request_type
        ),
        ''
      ),
      'chat'
    ),
    coalesce(
      p_model,
      ''
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
$$;


revoke all
on function
public.ai_claim_request(
  text,
  text,
  integer,
  integer
)
from public;


grant execute
on function
public.ai_claim_request(
  text,
  text,
  integer,
  integer
)
to authenticated;


notify pgrst,
  'reload schema';
