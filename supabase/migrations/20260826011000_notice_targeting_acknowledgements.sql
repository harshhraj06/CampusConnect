alter table
public.campus_notice_rail
add column if not exists
priority text not null
default 'Normal';


alter table
public.campus_notice_rail
add column if not exists
audience_roles text[] not null
default array[
  'Student',
  'Faculty',
  'Placement Cell',
  'Coordinator',
  'Volunteer',
  'Main Admin'
]::text[];


alter table
public.campus_notice_rail
add column if not exists
audience_departments text[] not null
default array[]::text[];


alter table
public.campus_notice_rail
add column if not exists
requires_acknowledgement boolean
not null
default false;


do $constraints$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'campus_notice_rail_priority_check'
  ) then
    alter table
    public.campus_notice_rail
    add constraint
    campus_notice_rail_priority_check
    check (
      priority in (
        'Normal',
        'High',
        'Critical'
      )
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'campus_notice_rail_audience_roles_check'
  ) then
    alter table
    public.campus_notice_rail
    add constraint
    campus_notice_rail_audience_roles_check
    check (
      cardinality(audience_roles) > 0
      and audience_roles <@
        array[
          'Student',
          'Faculty',
          'Placement Cell',
          'Coordinator',
          'Volunteer',
          'Main Admin'
        ]::text[]
    );
  end if;
end
$constraints$;


create or replace function
public.current_campus_department()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select department
      from public.profiles
      where id = auth.uid()
      limit 1
    ),
    ''
  );
$$;


revoke all
on function
public.current_campus_department()
from public;


grant execute
on function
public.current_campus_department()
to authenticated;


drop policy if exists
"Authenticated users read active campus notices"
on public.campus_notice_rail;


create policy
"Authenticated users read targeted campus notices"
on public.campus_notice_rail
for select
to authenticated
using (
  author_id = (
    select auth.uid()
  )

  or (
    select
      public.current_campus_role()
  ) = 'Main Admin'

  or (
    is_active = true

    and starts_at <= now()

    and (
      expires_at is null
      or expires_at > now()
    )

    and (
      select
        public.current_campus_role()
    ) = any(audience_roles)

    and (
      cardinality(
        audience_departments
      ) = 0

      or lower(
        (
          select
            public.current_campus_department()
        )
      ) = any(
        select lower(department)
        from unnest(
          audience_departments
        ) as department
      )
    )
  )
);


create table if not exists
public.campus_notice_receipts (
  notice_id uuid not null
    references
      public.campus_notice_rail(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  viewed_at timestamptz not null
    default now(),

  acknowledged_at timestamptz,

  primary key (
    notice_id,
    user_id
  )
);


create index if not exists
campus_notice_receipts_user_idx
on public.campus_notice_receipts (
  user_id,
  viewed_at desc
);


alter table
public.campus_notice_receipts
enable row level security;


drop policy if exists
"Users read own notice receipts"
on public.campus_notice_receipts;


create policy
"Users read own notice receipts"
on public.campus_notice_receipts
for select
to authenticated
using (
  user_id = (
    select auth.uid()
  )
);


drop policy if exists
"Users create own notice receipts"
on public.campus_notice_receipts;


create policy
"Users create own notice receipts"
on public.campus_notice_receipts
for insert
to authenticated
with check (
  user_id = (
    select auth.uid()
  )

  and exists (
    select 1
    from public.campus_notice_rail notice
    where notice.id = notice_id
  )
);


drop policy if exists
"Users update own notice receipts"
on public.campus_notice_receipts;


create policy
"Users update own notice receipts"
on public.campus_notice_receipts
for update
to authenticated
using (
  user_id = (
    select auth.uid()
  )
)
with check (
  user_id = (
    select auth.uid()
  )
);


grant
select,
insert,
update
on public.campus_notice_receipts
to authenticated;


create or replace function
public.get_campus_notice_stats(
  p_notice_ids uuid[]
)
returns table (
  notice_id uuid,
  recipient_count bigint,
  viewed_count bigint,
  acknowledged_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    notice.id as notice_id,

    (
      select count(*)
      from public.profiles profile
      where
        profile.role =
          any(notice.audience_roles)

        and (
          cardinality(
            notice.audience_departments
          ) = 0

          or lower(
            coalesce(
              profile.department,
              ''
            )
          ) = any(
            select lower(department)
            from unnest(
              notice.audience_departments
            ) as department
          )
        )
    ) as recipient_count,

    count(
      distinct receipt.user_id
    ) as viewed_count,

    count(
      distinct receipt.user_id
    ) filter (
      where
        receipt.acknowledged_at
          is not null
    ) as acknowledged_count

  from public.campus_notice_rail
    notice

  left join
    public.campus_notice_receipts
      receipt
  on receipt.notice_id =
    notice.id

  where
    notice.id =
      any(
        coalesce(
          p_notice_ids,
          array[]::uuid[]
        )
      )

    and (
      notice.author_id =
        auth.uid()

      or public.current_campus_role()
        = 'Main Admin'
    )

  group by notice.id;
$$;


revoke all
on function
public.get_campus_notice_stats(uuid[])
from public;


grant execute
on function
public.get_campus_notice_stats(uuid[])
to authenticated;


notify pgrst, 'reload schema';
