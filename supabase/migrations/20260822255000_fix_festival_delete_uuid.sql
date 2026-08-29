-- =========================================================
-- CAMPUSCONNECT
-- FIX FESTIVAL DELETE RPC
-- entity_id is UUID, so compare UUID = UUID
-- =========================================================

create or replace function public.delete_festival_announcement(
  target_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_type text;
begin

  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if public.current_campus_role() <> 'Main Admin' then
    raise exception 'Only Main Admin can delete festival wishes.';
  end if;


  select announcement_type
  into target_type
  from public.announcements
  where id = target_id;


  if not found then
    raise exception 'Festival announcement not found.';
  end if;


  if coalesce(
    target_type,
    'Normal'
  ) <> 'Festival'
  then
    raise exception 'This record is not a festival announcement.';
  end if;


  -- =======================================================
  -- DELETE ATTACHMENT DATABASE RECORDS
  --
  -- IMPORTANT:
  -- campus_attachments.entity_id is UUID.
  -- Do NOT cast target_id to text.
  -- =======================================================

  delete from public.campus_attachments
  where entity_type = 'announcement'
    and entity_id = target_id;


  -- =======================================================
  -- DELETE FESTIVAL
  -- =======================================================

  delete from public.announcements
  where id = target_id
    and announcement_type = 'Festival';


  if not found then
    raise exception 'Festival could not be deleted.';
  end if;


  return true;

end;
$$;


revoke all
on function public.delete_festival_announcement(uuid)
from public;


grant execute
on function public.delete_festival_announcement(uuid)
to authenticated;

