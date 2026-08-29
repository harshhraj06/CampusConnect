-- =========================================================
-- CAMPUSCONNECT
-- FESTIVAL MANAGEMENT = MAIN ADMIN ONLY
--
-- Everyone can SEE festivals.
-- Only Main Admin can CREATE / EDIT / DELETE festivals.
-- =========================================================

create or replace function public.protect_festival_management()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  campus_role text;
begin

  campus_role :=
    public.current_campus_role();

  -- -------------------------------------------------------
  -- INSERT
  -- -------------------------------------------------------

  if TG_OP = 'INSERT' then

    if coalesce(NEW.announcement_type, 'Normal') = 'Festival'
       and campus_role <> 'Main Admin'
    then
      raise exception
        'Only Main Admin can publish festival wishes.';
    end if;

    return NEW;

  end if;


  -- -------------------------------------------------------
  -- UPDATE
  --
  -- Protect BOTH:
  -- Festival -> Festival
  -- Normal -> Festival
  -- Festival -> Normal
  -- -------------------------------------------------------

  if TG_OP = 'UPDATE' then

    if (
      coalesce(OLD.announcement_type, 'Normal') = 'Festival'
      or
      coalesce(NEW.announcement_type, 'Normal') = 'Festival'
    )
    and campus_role <> 'Main Admin'
    then
      raise exception
        'Only Main Admin can edit festival wishes.';
    end if;

    return NEW;

  end if;


  -- -------------------------------------------------------
  -- DELETE
  -- -------------------------------------------------------

  if TG_OP = 'DELETE' then

    if coalesce(OLD.announcement_type, 'Normal') = 'Festival'
       and campus_role <> 'Main Admin'
    then
      raise exception
        'Only Main Admin can delete festival wishes.';
    end if;

    return OLD;

  end if;


  return null;

end;
$$;


drop trigger if exists
protect_festival_management_trigger
on public.announcements;


create trigger
protect_festival_management_trigger
before insert or update or delete
on public.announcements
for each row
execute function
public.protect_festival_management();

