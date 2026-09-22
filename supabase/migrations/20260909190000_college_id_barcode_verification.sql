-- ============================================================
-- CAMPUSCONNECT — OFFICIAL COLLEGE ID BARCODE VERIFICATION
-- ============================================================

create table if not exists
public.college_id_barcode_mappings (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references public.profiles(id)
    on delete cascade,

  barcode_value text not null,

  is_active boolean not null
    default true,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique(student_id),

  unique(barcode_value)
);


alter table
public.college_id_barcode_mappings
enable row level security;


revoke all
on table
public.college_id_barcode_mappings
from anon;

revoke all
on table
public.college_id_barcode_mappings
from authenticated;


-- ------------------------------------------------------------
-- REGISTER / UPDATE OWN PHYSICAL COLLEGE BARCODE
-- ------------------------------------------------------------

create or replace function
public.register_my_college_id_barcode(
  p_barcode_value text
)
returns void
language plpgsql
security definer
set search_path =
  public
as $$
declare
  barcode_value_clean text;
begin

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  barcode_value_clean :=
    trim(
      coalesce(
        p_barcode_value,
        ''
      )
    );


  if length(barcode_value_clean) < 3 then
    raise exception
      'Invalid barcode value.';
  end if;


  insert into
  public.college_id_barcode_mappings (
    student_id,
    barcode_value,
    is_active,
    updated_at
  )
  values (
    auth.uid(),
    barcode_value_clean,
    true,
    now()
  )

  on conflict (student_id)
  do update set
    barcode_value =
      excluded.barcode_value,

    is_active =
      true,

    updated_at =
      now();
end;
$$;


revoke all
on function
public.register_my_college_id_barcode(
  text
)
from public;

revoke all
on function
public.register_my_college_id_barcode(
  text
)
from anon;

grant execute
on function
public.register_my_college_id_barcode(
  text
)
to authenticated;


-- ------------------------------------------------------------
-- VERIFY PHYSICAL COLLEGE ID BARCODE
-- Safe student identity only.
-- ------------------------------------------------------------

create or replace function
public.verify_college_id_barcode(
  p_barcode_value text
)
returns table (
  student_id uuid,
  full_name text,
  usn text,
  campus_uid text,
  department text,
  graduation_year text,
  avatar_url text,
  role text,
  verified boolean
)
language plpgsql
stable
security definer
set search_path =
  public
as $$
declare
  barcode_value_clean text;
begin

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  barcode_value_clean :=
    upper(
      trim(
        coalesce(
          p_barcode_value,
          ''
        )
      )
    );


  return query

  select
    p.id,
    p.full_name,
    p.usn,
    p.campus_uid,
    p.department,
    p.graduation_year,
    p.avatar_url,
    p.role::text,
    true

  from public.profiles p

  left join
  public.college_id_barcode_mappings m
    on m.student_id =
      p.id
    and m.is_active =
      true

  where
    upper(
      trim(
        coalesce(
          p.usn,
          ''
        )
      )
    ) =
      barcode_value_clean

    or

    upper(
      trim(
        coalesce(
          p.campus_uid,
          ''
        )
      )
    ) =
      barcode_value_clean

    or

    upper(
      trim(
        coalesce(
          m.barcode_value,
          ''
        )
      )
    ) =
      barcode_value_clean

  limit 1;
end;
$$;


revoke all
on function
public.verify_college_id_barcode(
  text
)
from public;

revoke all
on function
public.verify_college_id_barcode(
  text
)
from anon;

grant execute
on function
public.verify_college_id_barcode(
  text
)
to authenticated;
