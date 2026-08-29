create table if not exists
public.campus_magazine_page_media (
  id uuid primary key
    default gen_random_uuid(),

  page_id uuid not null
    references
      public.campus_magazine_pages(id)
    on delete cascade,

  photo_url text not null,

  photo_path text not null,

  position integer not null
    default 1,

  caption text not null
    default '',

  created_by uuid not null
    default auth.uid()
    references auth.users(id)
    on delete cascade,

  created_at timestamptz not null
    default now(),

  constraint
    campus_magazine_media_position_check
  check (
    position between 1 and 8
  ),

  constraint
    campus_magazine_media_url_check
  check (
    photo_url ~* '^https?://'
  ),

  constraint
    campus_magazine_media_caption_check
  check (
    char_length(caption)
    <= 500
  ),

  unique (
    page_id,
    position
  )
);


create index if not exists
campus_magazine_media_page_idx

on public.campus_magazine_page_media (
  page_id,
  position
);


insert into
public.campus_magazine_page_media (
  page_id,
  photo_url,
  photo_path,
  position,
  caption,
  created_by
)

select
  page.id,
  page.photo_url,
  coalesce(
    page.photo_path,
    page.id::text ||
      '/legacy-image'
  ),
  1,
  page.caption,
  page.created_by

from
  public.campus_magazine_pages
    as page

where
  page.photo_url is not null

on conflict (
  page_id,
  position
)

do nothing;


create or replace function
public.prepare_campus_magazine_media()

returns trigger

language plpgsql

security definer

set search_path =
  public

as $$

begin

  if not public
    .can_edit_campus_magazine()
  then

    raise exception
      'Magazine editor permission is required.';

  end if;


  new.photo_url :=
    trim(
      new.photo_url
    );

  new.photo_path :=
    trim(
      new.photo_path
    );

  new.caption :=
    trim(
      coalesce(
        new.caption,
        ''
      )
    );

  new.created_by :=
    auth.uid();

  new.created_at :=
    coalesce(
      new.created_at,
      now()
    );


  return new;

end;

$$;


drop trigger if exists
prepare_campus_magazine_media_trigger

on public.campus_magazine_page_media;


create trigger
prepare_campus_magazine_media_trigger

before insert

on public.campus_magazine_page_media

for each row

execute function
public.prepare_campus_magazine_media();


alter table
public.campus_magazine_page_media

enable row level security;


drop policy if exists
  "Campus users read magazine media"

on public.campus_magazine_page_media;


create policy
  "Campus users read magazine media"

on public.campus_magazine_page_media

for select

to authenticated

using (
  public
    .can_edit_campus_magazine()

  or exists (
    select 1

    from
      public.campus_magazine_pages
        as page

    join
      public.campus_magazine_issues
        as issue

      on issue.id =
        page.issue_id

    where
      page.id =
        page_id

      and issue.status =
        'Published'
  )
);


drop policy if exists
  "Magazine editors create media"

on public.campus_magazine_page_media;


create policy
  "Magazine editors create media"

on public.campus_magazine_page_media

for insert

to authenticated

with check (
  public
    .can_edit_campus_magazine()

  and created_by =
    (select auth.uid())
);


drop policy if exists
  "Magazine editors update media"

on public.campus_magazine_page_media;


create policy
  "Magazine editors update media"

on public.campus_magazine_page_media

for update

to authenticated

using (
  public
    .can_edit_campus_magazine()
)

with check (
  public
    .can_edit_campus_magazine()
);


drop policy if exists
  "Magazine editors delete media"

on public.campus_magazine_page_media;


create policy
  "Magazine editors delete media"

on public.campus_magazine_page_media

for delete

to authenticated

using (
  public
    .can_edit_campus_magazine()
);


grant select,
      insert,
      update,
      delete

on public.campus_magazine_page_media

to authenticated;


notify pgrst,
  'reload schema';
