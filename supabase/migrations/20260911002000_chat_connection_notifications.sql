-- ============================================================
-- CAMPUSCONNECT
-- Messenger connection notifications
-- ============================================================

-- The original table was created for operational tasks.
-- It is now safely generalized for other CampusConnect alerts.

alter table public.campus_task_notifications
  alter column task_id drop not null;


alter table public.campus_task_notifications
  add column if not exists notification_type text
    not null default 'task',

  add column if not exists actor_id uuid
    references auth.users(id)
    on delete set null,

  add column if not exists connection_id uuid
    references public.chat_connections(id)
    on delete cascade,

  add column if not exists target text
    not null default 'Dashboard';


update public.campus_task_notifications
set
  notification_type = 'task',
  target = 'Dashboard'
where notification_type is null
   or notification_type = '';


-- One logical notification of each type per connection.
-- NULL connection IDs used by normal task notifications do not conflict.
create unique index if not exists
campus_notifications_connection_type_unique

on public.campus_task_notifications (
  connection_id,
  notification_type
);


-- ============================================================
-- CONNECTION NOTIFICATION TRIGGER
-- ============================================================

create or replace function
public.notify_chat_connection_change()

returns trigger

language plpgsql

security definer

set search_path = ''

as $$

declare
  v_requester_name text;
  v_receiver_name text;

begin

  select
    coalesce(
      nullif(
        trim(profile.full_name),
        ''
      ),
      'A CampusConnect user'
    )

  into v_requester_name

  from public.profiles
    as profile

  where profile.id =
    new.requester_id;


  if v_requester_name is null then
    v_requester_name :=
      'A CampusConnect user';
  end if;


  -- ----------------------------------------------------------
  -- NEW / RESENT CONNECTION REQUEST
  -- ----------------------------------------------------------

  if
    new.status = 'Pending'
    and (
      tg_op = 'INSERT'
      or (
        tg_op = 'UPDATE'
        and old.status is distinct
          from 'Pending'
      )
    )
  then

    insert into
    public.campus_task_notifications (
      recipient_id,
      task_id,
      title,
      message,
      notification_type,
      actor_id,
      connection_id,
      target,
      read_at,
      created_at
    )

    values (
      new.receiver_id,
      null,
      'New connection request',
      v_requester_name ||
        ' wants to connect with you.',
      'connection_request',
      new.requester_id,
      new.id,
      'Messenger',
      null,
      now()
    )

    on conflict (
      connection_id,
      notification_type
    )

    do update

    set
      recipient_id =
        excluded.recipient_id,

      actor_id =
        excluded.actor_id,

      title =
        excluded.title,

      message =
        excluded.message,

      target =
        excluded.target,

      read_at =
        null,

      created_at =
        now();

  end if;


  -- ----------------------------------------------------------
  -- ACCEPTED CONNECTION
  -- ----------------------------------------------------------

  if
    new.status = 'Accepted'
    and (
      tg_op = 'INSERT'
      or (
        tg_op = 'UPDATE'
        and old.status is distinct
          from 'Accepted'
      )
    )
  then

    -- Receiver has acted on the incoming request,
    -- so its request notification is no longer unread.
    update
      public.campus_task_notifications

    set
      read_at =
        coalesce(
          read_at,
          now()
        )

    where
      connection_id =
        new.id

      and notification_type =
        'connection_request'

      and recipient_id =
        new.receiver_id;


    select
      coalesce(
        nullif(
          trim(profile.full_name),
          ''
        ),
        'A CampusConnect user'
      )

    into v_receiver_name

    from public.profiles
      as profile

    where profile.id =
      new.receiver_id;


    if v_receiver_name is null then
      v_receiver_name :=
        'A CampusConnect user';
    end if;


    insert into
    public.campus_task_notifications (
      recipient_id,
      task_id,
      title,
      message,
      notification_type,
      actor_id,
      connection_id,
      target,
      read_at,
      created_at
    )

    values (
      new.requester_id,
      null,
      'Connection accepted',
      v_receiver_name ||
        ' accepted your connection request.',
      'connection_accepted',
      new.receiver_id,
      new.id,
      'Messenger',
      null,
      now()
    )

    on conflict (
      connection_id,
      notification_type
    )

    do update

    set
      recipient_id =
        excluded.recipient_id,

      actor_id =
        excluded.actor_id,

      title =
        excluded.title,

      message =
        excluded.message,

      target =
        excluded.target,

      read_at =
        null,

      created_at =
        now();

  end if;


  -- ----------------------------------------------------------
  -- REJECTED / BLOCKED
  -- ----------------------------------------------------------

  if
    new.status in (
      'Rejected',
      'Blocked'
    )
  then

    update
      public.campus_task_notifications

    set
      read_at =
        coalesce(
          read_at,
          now()
        )

    where
      connection_id =
        new.id

      and notification_type =
        'connection_request';

  end if;


  return new;

end;

$$;


revoke all
on function
public.notify_chat_connection_change()
from public;


drop trigger if exists
chat_connection_notification_trigger
on public.chat_connections;


create trigger
chat_connection_notification_trigger

after insert or update of status

on public.chat_connections

for each row

execute function
public.notify_chat_connection_change();


-- Existing authenticated users only read/update their own
-- notification rows through the already-existing RLS policies.

grant select,
      update
on public.campus_task_notifications
to authenticated;
