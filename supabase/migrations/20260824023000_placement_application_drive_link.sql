-- ============================================================
-- CAMPUSCONNECT
-- Placement applications -> exact placement drive
-- ============================================================

alter table if exists public.placement_applications
add column if not exists placement_id uuid;

-- Add FK only when placement_drives exists.
do $$
begin
  if to_regclass('public.placement_drives') is not null then

    if not exists (
      select 1
      from pg_constraint
      where conname = 'placement_applications_placement_id_fkey'
    ) then

      alter table public.placement_applications
      add constraint placement_applications_placement_id_fkey
      foreign key (placement_id)
      references public.placement_drives(id)
      on delete set null;

    end if;

  end if;
end $$;


-- One student can apply to one campus drive only once.
-- NULL placement_id remains allowed for manual/external applications.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'placement_applications_student_drive_unique'
  ) then

    alter table public.placement_applications
    add constraint placement_applications_student_drive_unique
    unique (student_id, placement_id);

  end if;
end $$;


create index if not exists
placement_applications_placement_id_idx
on public.placement_applications(placement_id);
