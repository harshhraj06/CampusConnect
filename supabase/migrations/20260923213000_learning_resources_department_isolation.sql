
-- ============================================================
-- LEARNING STORAGE LEGACY POLICY RECONCILIATION
--
-- Remote audit confirmed six legacy Learning Resource Storage
-- policies. They are replaced by the stricter department-aware
-- policies later in this migration.
--
-- No unrelated Storage policy is modified.
-- ============================================================


-- ------------------------------------------------------------
-- PREFLIGHT
--
-- Abort before mutation only if an UNKNOWN policy also
-- references the learning-resources bucket.
-- ------------------------------------------------------------

do $$
declare

  v_unknown_policies text;

begin

  select
    string_agg(
      format(
        '%I [%s]%sUSING: %s%sCHECK: %s',
        policyname,
        cmd,
        E'\n',
        coalesce(
          qual,
          '<none>'
        ),
        E'\n',
        coalesce(
          with_check,
          '<none>'
        )
      ),
      E'\n----------------------------------------\n'
    )

  into
    v_unknown_policies

  from
    pg_catalog.pg_policies

  where
    schemaname =
      'storage'

    and
    tablename =
      'objects'

    and
    (
      coalesce(
        qual,
        ''
      ) ilike
        '%learning-resources%'

      or

      coalesce(
        with_check,
        ''
      ) ilike
        '%learning-resources%'
    )

    and
    policyname not in (

      -- Existing legacy policies confirmed from remote.
      'Campus users read learning files',
      'Campus users read learning resources',

      'Campus users upload learning files',
      'Campus users upload learning resources',

      'Owners delete learning files',
      'Owners delete learning resources',


      -- New secure policies from this migration.
      'Learning resource permitted users read files',
      'Assigned Faculty and Admin upload learning files',
      'Faculty owners and Admin delete learning files'

    );


  if
    v_unknown_policies is not null
  then

    raise exception
      E'Unknown learning-resources Storage policies still exist.\n%',
      v_unknown_policies;

  end if;

end;
$$;


-- ------------------------------------------------------------
-- REMOVE CONFIRMED LEGACY POLICIES
-- ------------------------------------------------------------

drop policy if exists
"Campus users read learning files"
on storage.objects;


drop policy if exists
"Campus users read learning resources"
on storage.objects;


drop policy if exists
"Campus users upload learning files"
on storage.objects;


drop policy if exists
"Campus users upload learning resources"
on storage.objects;


drop policy if exists
"Owners delete learning files"
on storage.objects;


drop policy if exists
"Owners delete learning resources"
on storage.objects;


-- Also make the secure policy creation rerun-safe.

drop policy if exists
"Learning resource permitted users read files"
on storage.objects;


drop policy if exists
"Assigned Faculty and Admin upload learning files"
on storage.objects;


drop policy if exists
"Faculty owners and Admin delete learning files"
on storage.objects;



-- ============================================================
-- CAMPUSCONNECT
-- FACULTY MULTI-DEPARTMENT + LEARNING RESOURCE ISOLATION
--
-- Minimal model:
--   • Student: one department from profiles.department
--   • Faculty: zero or more Admin-assigned departments
--   • Main Admin: all departments
--
-- Department assignment affects:
--   • Learning Resources
--   • Faculty department identity
--
-- It does NOT automatically grant batch/class access.
-- Existing teaching allocation security remains authoritative.
-- ============================================================


-- ============================================================
-- 1. NORMALIZE DEPARTMENT TEXT
-- ============================================================

create or replace function
public.normalize_campus_department(
  p_value text
)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select
    upper(
      regexp_replace(
        coalesce(
          btrim(p_value),
          ''
        ),
        '[^A-Za-z0-9]+',
        '',
        'g'
      )
    );
$$;


revoke all
on function
public.normalize_campus_department(text)
from public;

grant execute
on function
public.normalize_campus_department(text)
to authenticated;


-- ============================================================
-- 2. DEPARTMENT EQUIVALENCE
--
-- Supports both branch NAME and CODE.
--
-- Example:
-- ECE
-- Electronics and Communication Engineering
--
-- can resolve to the same campus branch.
-- ============================================================

create or replace function
public.same_campus_department(
  p_left text,
  p_right text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    case

      when
        public.normalize_campus_department(
          p_left
        ) =
        public.normalize_campus_department(
          p_right
        )
      then true

      else exists (

        select
          1

        from
          public.campus_branches branch

        where
          branch.is_active = true

          and
          public.normalize_campus_department(
            p_left
          ) in (
            public.normalize_campus_department(
              branch.name
            ),
            public.normalize_campus_department(
              branch.code
            )
          )

          and
          public.normalize_campus_department(
            p_right
          ) in (
            public.normalize_campus_department(
              branch.name
            ),
            public.normalize_campus_department(
              branch.code
            )
          )
      )

    end;
$$;


revoke all
on function
public.same_campus_department(text, text)
from public;

grant execute
on function
public.same_campus_department(text, text)
to authenticated;


-- ============================================================
-- 3. CURRENT PROFILE DEPARTMENT
-- ============================================================

create or replace function
public.current_campus_department()
returns text
language sql
stable
security definer
set search_path = ''
as $$

  select
    profile.department

  from
    public.profiles profile

  where
    profile.id = auth.uid()

  limit 1;

$$;


revoke all
on function
public.current_campus_department()
from public;

grant execute
on function
public.current_campus_department()
to authenticated;


-- ============================================================
-- 4. FACULTY DEPARTMENT ASSIGNMENTS
--
-- One row = one department.
-- Unlimited rows per Faculty member.
-- ============================================================

create table if not exists
public.faculty_department_assignments (

  faculty_id uuid not null
    references public.profiles(id)
    on delete cascade,

  department text not null
    check (
      char_length(
        btrim(department)
      ) > 0
    ),

  assigned_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  primary key (
    faculty_id,
    department
  )
);


create index if not exists
faculty_department_assignments_department_idx
on public.faculty_department_assignments (
  department
);


alter table
public.faculty_department_assignments
enable row level security;


do $$
declare
  existing_policy record;
begin

  for existing_policy in

    select
      policyname

    from
      pg_catalog.pg_policies

    where
      schemaname =
        'public'

      and
      tablename =
        'faculty_department_assignments'

  loop

    execute format(
      'drop policy if exists %I on public.faculty_department_assignments',
      existing_policy.policyname
    );

  end loop;

end;
$$;


create policy
"Faculty read own department assignments"
on public.faculty_department_assignments
for select
to authenticated
using (

  faculty_id =
    auth.uid()

  or

  public.current_campus_role() =
    'Main Admin'
);


create policy
"Main Admin creates faculty department assignments"
on public.faculty_department_assignments
for insert
to authenticated
with check (

  public.current_campus_role() =
    'Main Admin'
);


create policy
"Main Admin deletes faculty department assignments"
on public.faculty_department_assignments
for delete
to authenticated
using (

  public.current_campus_role() =
    'Main Admin'
);


-- ============================================================
-- 5. BACKFILL EXISTING FACULTY
--
-- Preserve current profile.department as an initial assignment
-- when it matches an active campus branch.
-- ============================================================

insert into
public.faculty_department_assignments (
  faculty_id,
  department,
  assigned_by
)

select distinct
  profile.id,
  branch.name,
  null::uuid

from
  public.profiles profile

join
  public.campus_branches branch

on
  branch.is_active = true

and
  (
    public.normalize_campus_department(
      profile.department
    ) =
    public.normalize_campus_department(
      branch.name
    )

    or

    public.normalize_campus_department(
      profile.department
    ) =
    public.normalize_campus_department(
      branch.code
    )
  )

where
  profile.role =
    'Faculty'

on conflict (
  faculty_id,
  department
)
do nothing;


-- ============================================================
-- 6. FACULTY DEPARTMENT SECURITY HELPER
-- ============================================================

create or replace function
public.faculty_has_department(
  p_faculty_id uuid,
  p_department text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$

  select exists (

    select
      1

    from
      public.faculty_department_assignments assignment

    where
      assignment.faculty_id =
        p_faculty_id

      and
      public.same_campus_department(
        assignment.department,
        p_department
      )

  );

$$;


revoke all
on function
public.faculty_has_department(uuid, text)
from public;

grant execute
on function
public.faculty_has_department(uuid, text)
to authenticated;


-- ============================================================
-- 7. ADMIN ATOMIC ASSIGNMENT RPC
--
-- Admin sends any number of departments.
-- Only active campus_branches are accepted.
-- ============================================================

create or replace function
public.set_faculty_departments(
  p_faculty_id uuid,
  p_departments text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare

  requested_department text;

begin

  if auth.uid() is null then

    raise exception
      'Authentication required.';

  end if;


  if
    public.current_campus_role() <>
      'Main Admin'
  then

    raise exception
      'Main Admin permission required.';

  end if;


  if not exists (

    select
      1

    from
      public.profiles profile

    where
      profile.id =
        p_faculty_id

      and
      profile.role =
        'Faculty'

  )
  then

    raise exception
      'Faculty account not found.';

  end if;


  delete from
  public.faculty_department_assignments

  where
    faculty_id =
      p_faculty_id;


  for requested_department in

    select distinct
      branch.name

    from
      public.campus_branches branch

    where
      branch.is_active = true

      and exists (

        select
          1

        from
          unnest(
            coalesce(
              p_departments,
              array[]::text[]
            )
          ) requested(value)

        where
          public.normalize_campus_department(
            requested.value
          ) in (
            public.normalize_campus_department(
              branch.name
            ),
            public.normalize_campus_department(
              branch.code
            )
          )

      )

    order by
      branch.name

  loop

    insert into
    public.faculty_department_assignments (
      faculty_id,
      department,
      assigned_by
    )
    values (
      p_faculty_id,
      requested_department,
      auth.uid()
    );

  end loop;

end;
$$;


revoke all
on function
public.set_faculty_departments(uuid, text[])
from public;

grant execute
on function
public.set_faculty_departments(uuid, text[])
to authenticated;


-- ============================================================
-- 8. PREVENT FACULTY/STUDENT SELF-CHANGING ROLE/DEPARTMENT
-- ============================================================

create or replace function
public.guard_campus_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if
    auth.uid() is not null

    and
    auth.uid() =
      old.id

    and
    coalesce(
      public.current_campus_role(),
      ''
    ) <>
      'Main Admin'

  then

    new.department :=
      old.department;

    new.role :=
      old.role;

  end if;


  return new;

end;
$$;


drop trigger if exists
profiles_guard_campus_identity
on public.profiles;


create trigger
profiles_guard_campus_identity
before update of
  department,
  role
on public.profiles
for each row
execute function
public.guard_campus_profile_identity();


-- ============================================================
-- 9. RESOURCE WRITE GUARD
--
-- Faculty may write only to an Admin-assigned department.
-- ============================================================

create or replace function
public.enforce_learning_resource_department()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare

  caller_role text;

  canonical_department text;

  caller_name text;

begin

  if auth.uid() is null then

    return new;

  end if;


  caller_role :=
    coalesce(
      public.current_campus_role(),
      ''
    );


  select
    branch.name

  into
    canonical_department

  from
    public.campus_branches branch

  where
    branch.is_active = true

    and
    public.normalize_campus_department(
      new.department
    ) in (
      public.normalize_campus_department(
        branch.name
      ),
      public.normalize_campus_department(
        branch.code
      )
    )

  order by
    branch.name

  limit 1;


  if
    canonical_department is null
  then

    raise exception
      'Select a valid active campus department.';

  end if;


  if
    caller_role =
      'Faculty'
  then

    if not
      public.faculty_has_department(
        auth.uid(),
        canonical_department
      )
    then

      raise exception
        'You are not assigned to this department.';

    end if;


  elsif
    caller_role <>
      'Main Admin'
  then

    raise exception
      'Only Faculty and Main Admin can publish learning resources.';

  end if;


  new.department :=
    canonical_department;


  if tg_op = 'INSERT' then

    new.added_by :=
      auth.uid();


    select
      profile.full_name

    into
      caller_name

    from
      public.profiles profile

    where
      profile.id =
        auth.uid();


    new.contributor_name :=
      coalesce(
        caller_name,
        new.contributor_name
      );


    new.contributor_role :=
      caller_role;

  else

    new.added_by :=
      old.added_by;

  end if;


  return new;

end;
$$;


drop trigger if exists
learning_resources_department_guard
on public.learning_resources;


create trigger
learning_resources_department_guard
before insert or update
on public.learning_resources
for each row
execute function
public.enforce_learning_resource_department();


-- ============================================================
-- 10. LEARNING RESOURCE RLS
-- ============================================================

alter table
public.learning_resources
enable row level security;


do $$
declare
  existing_policy record;
begin

  for existing_policy in

    select
      policyname

    from
      pg_catalog.pg_policies

    where
      schemaname =
        'public'

      and
      tablename =
        'learning_resources'

  loop

    execute format(
      'drop policy if exists %I on public.learning_resources',
      existing_policy.policyname
    );

  end loop;

end;
$$;


-- Main Admin:
-- all.
--
-- Faculty:
-- every assigned department.
--
-- Student/other campus users:
-- verified resources from profile.department only.

create policy
"Department scoped learning resource read"
on public.learning_resources
for select
to authenticated
using (

  public.current_campus_role() =
    'Main Admin'

  or

  (
    public.current_campus_role() =
      'Faculty'

    and

    public.faculty_has_department(
      auth.uid(),
      department
    )
  )

  or

  (
    public.current_campus_role()
      not in (
        'Faculty',
        'Main Admin'
      )

    and

    is_verified = true

    and

    public.same_campus_department(
      department,
      public.current_campus_department()
    )
  )
);


create policy
"Assigned Faculty create learning resources"
on public.learning_resources
for insert
to authenticated
with check (

  (
    public.current_campus_role() =
      'Main Admin'
  )

  or

  (
    public.current_campus_role() =
      'Faculty'

    and

    added_by =
      auth.uid()

    and

    public.faculty_has_department(
      auth.uid(),
      department
    )
  )
);


create policy
"Assigned Faculty update learning resources"
on public.learning_resources
for update
to authenticated
using (

  public.current_campus_role() =
    'Main Admin'

  or

  (
    public.current_campus_role() =
      'Faculty'

    and

    public.faculty_has_department(
      auth.uid(),
      department
    )
  )
)
with check (

  public.current_campus_role() =
    'Main Admin'

  or

  (
    public.current_campus_role() =
      'Faculty'

    and

    public.faculty_has_department(
      auth.uid(),
      department
    )
  )
);


create policy
"Assigned Faculty delete learning resources"
on public.learning_resources
for delete
to authenticated
using (

  public.current_campus_role() =
    'Main Admin'

  or

  (
    public.current_campus_role() =
      'Faculty'

    and

    public.faculty_has_department(
      auth.uid(),
      department
    )
  )
);



-- ============================================================
-- LEARNING RESOURCES — SECURE STORAGE POLICIES
-- ============================================================


-- ------------------------------------------------------------
-- PRIVATE BUCKET
-- ------------------------------------------------------------

insert into
storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'learning-resources',
  'learning-resources',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id)
do update set

  public =
    false,

  file_size_limit =
    excluded.file_size_limit;


-- ------------------------------------------------------------
-- READ
--
-- A Storage object is readable only when the caller can also
-- read the matching learning_resources database row.
--
-- Therefore:
-- Student -> own department verified resources
-- Faculty -> assigned departments
-- Admin   -> all resources
-- ------------------------------------------------------------

create policy
"Learning resource permitted users read files"
on storage.objects
for select
to authenticated
using (

  bucket_id =
    'learning-resources'

  and

  exists (

    select
      1

    from
      public.learning_resources resource

    where
      resource.file_path =
        name

  )

);


-- ------------------------------------------------------------
-- UPLOAD
--
-- Required path:
--
--   <user-id>/<department-token>/<filename>
--
-- Faculty:
--   only own folder + assigned department.
--
-- Main Admin:
--   own folder + any active campus department.
-- ------------------------------------------------------------

create policy
"Assigned Faculty and Admin upload learning files"
on storage.objects
for insert
to authenticated
with check (

  bucket_id =
    'learning-resources'

  and

  (
    storage.foldername(
      name
    )
  )[1] =
    auth.uid()::text

  and

  char_length(
    coalesce(
      (
        storage.foldername(
          name
        )
      )[2],
      ''
    )
  ) > 0

  and

  (

    (
      public.current_campus_role() =
        'Faculty'

      and

      public.faculty_has_department(
        auth.uid(),
        (
          storage.foldername(
            name
          )
        )[2]
      )
    )

    or

    (
      public.current_campus_role() =
        'Main Admin'

      and

      exists (

        select
          1

        from
          public.campus_branches branch

        where
          branch.is_active =
            true

          and

          public.same_campus_department(
            branch.name,
            (
              storage.foldername(
                name
              )
            )[2]
          )

      )
    )

  )

);


-- ------------------------------------------------------------
-- DELETE
--
-- Faculty can delete only files inside their own Storage
-- folder. This is necessary for failed DB insert cleanup.
--
-- Main Admin can delete Learning Resource files.
-- ------------------------------------------------------------

create policy
"Faculty owners and Admin delete learning files"
on storage.objects
for delete
to authenticated
using (

  bucket_id =
    'learning-resources'

  and

  (

    public.current_campus_role() =
      'Main Admin'


    or


    (
      public.current_campus_role() =
        'Faculty'

      and

      (
        storage.foldername(
          name
        )
      )[1] =
        auth.uid()::text

      and

      (

        -- New uploads:
        --
        -- <faculty-id>/<department>/<filename>
        --
        -- Permit cleanup only while Faculty still has
        -- access to the department encoded in the path.

        (
          char_length(
            coalesce(
              (
                storage.foldername(
                  name
                )
              )[2],
              ''
            )
          ) > 0

          and

          public.faculty_has_department(
            auth.uid(),
            (
              storage.foldername(
                name
              )
            )[2]
          )
        )


        or


        -- Legacy files used:
        --
        -- <faculty-id>/<filename>
        --
        -- Allow deletion only when the corresponding
        -- learning_resources row is visible to the caller
        -- through current department RLS.

        exists (

          select
            1

          from
            public.learning_resources resource

          where
            resource.file_path =
              name

        )

      )

    )

  )

);


notify pgrst, 'reload schema';
