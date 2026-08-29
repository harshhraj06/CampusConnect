create table if not exists
public.campus_notice_rail (
  id uuid primary key
    default gen_random_uuid(),

  author_id uuid not null
    references auth.users(id)
    on delete cascade,

  author_name text not null
    default '',

  author_role text not null
    check (
      author_role in (
        'Faculty',
        'Placement Cell',
        'Coordinator',
        'Volunteer',
        'Main Admin'
      )
    ),

  notice_type text not null
    default 'Important'
    check (
      notice_type in (
        'Important',
        'Academic',
        'Result',
        'Exam',
        'Recruitment',
        'Event'
      )
    ),

  title text not null
    check (
      char_length(title)
      between 3 and 120
    ),

  message text not null
    check (
      char_length(message)
      between 3 and 500
    ),

  link_url text not null
    default ''
    check (
      link_url = ''
      or link_url ~*
        '^https?://'
    ),

  link_label text not null
    default 'Open details'
    check (
      char_length(link_label)
      between 1 and 40
    ),

  starts_at timestamptz not null
    default now(),

  expires_at timestamptz,

  is_active boolean not null
    default true,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  check (
    expires_at is null
    or expires_at > starts_at
  )
);


create index if not exists
campus_notice_rail_active_idx
on public.campus_notice_rail (
  is_active,
  starts_at,
  expires_at
);


create index if not exists
campus_notice_rail_author_idx
on public.campus_notice_rail (
  author_id,
  created_at desc
);


create or replace function
public.secure_campus_notice_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  verified_name text;
  verified_role text;
begin
  if tg_op = 'INSERT' then
    select
      coalesce(
        nullif(trim(full_name), ''),
        'Campus user'
      ),
      role
    into
      verified_name,
      verified_role
    from public.profiles
    where id = auth.uid();

    if verified_role not in (
      'Faculty',
      'Placement Cell',
      'Coordinator',
      'Volunteer',
      'Main Admin'
    ) then
      raise exception
        'This role cannot publish campus notices';
    end if;

    new.author_id := auth.uid();
    new.author_name := verified_name;
    new.author_role := verified_role;
    new.created_at := now();
  else
    new.author_id := old.author_id;
    new.author_name := old.author_name;
    new.author_role := old.author_role;
    new.created_at := old.created_at;
  end if;

  new.updated_at := now();

  return new;
end;
$$;


drop trigger if exists
secure_campus_notice_identity_trigger
on public.campus_notice_rail;


create trigger
secure_campus_notice_identity_trigger
before insert or update
on public.campus_notice_rail
for each row
execute function
public.secure_campus_notice_identity();


alter table
public.campus_notice_rail
enable row level security;


drop policy if exists
"Authenticated users read active campus notices"
on public.campus_notice_rail;


create policy
"Authenticated users read active campus notices"
on public.campus_notice_rail
for select
to authenticated
using (
  (
    is_active = true
    and starts_at <= now()
    and (
      expires_at is null
      or expires_at > now()
    )
  )
  or author_id = (
    select auth.uid()
  )
  or (
    select
      public.current_campus_role()
  ) = 'Main Admin'
);


drop policy if exists
"Professional roles publish campus notices"
on public.campus_notice_rail;


create policy
"Professional roles publish campus notices"
on public.campus_notice_rail
for insert
to authenticated
with check (
  author_id = (
    select auth.uid()
  )
  and author_role = (
    select
      public.current_campus_role()
  )
  and author_role in (
    'Faculty',
    'Placement Cell',
    'Coordinator',
    'Volunteer',
    'Main Admin'
  )
);


drop policy if exists
"Authors manage campus notices"
on public.campus_notice_rail;


create policy
"Authors manage campus notices"
on public.campus_notice_rail
for update
to authenticated
using (
  author_id = (
    select auth.uid()
  )
  or (
    select
      public.current_campus_role()
  ) = 'Main Admin'
)
with check (
  author_id = (
    select auth.uid()
  )
  or (
    select
      public.current_campus_role()
  ) = 'Main Admin'
);


drop policy if exists
"Authors delete campus notices"
on public.campus_notice_rail;


create policy
"Authors delete campus notices"
on public.campus_notice_rail
for delete
to authenticated
using (
  author_id = (
    select auth.uid()
  )
  or (
    select
      public.current_campus_role()
  ) = 'Main Admin'
);


grant
select,
insert,
update,
delete
on public.campus_notice_rail
to authenticated;


revoke all
on function
public.secure_campus_notice_identity()
from public;


grant execute
on function
public.secure_campus_notice_identity()
to authenticated;


do $block$
begin
  alter publication
    supabase_realtime
  add table
    public.campus_notice_rail;
exception
  when duplicate_object then
    null;
  when undefined_object then
    null;
end
$block$;


notify pgrst, 'reload schema';
