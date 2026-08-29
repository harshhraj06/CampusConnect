create table if not exists public.campus_magazine_issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  edition_label text not null default '',
  status text not null default 'Draft',
  published_at timestamptz,
  created_by uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campus_magazine_issue_title_check
    check (char_length(trim(title)) between 3 and 160),

  constraint campus_magazine_issue_subtitle_check
    check (char_length(subtitle) <= 500),

  constraint campus_magazine_issue_status_check
    check (status in ('Draft', 'Published', 'Archived'))
);


create table if not exists public.campus_magazine_pages (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null
    references public.campus_magazine_issues(id)
    on delete cascade,
  page_number integer not null,
  photo_url text,
  photo_path text,
  headline text not null default '',
  description text not null default '',
  caption text not null default '',
  created_by uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (issue_id, page_number),

  constraint campus_magazine_page_number_check
    check (page_number > 0),

  constraint campus_magazine_headline_check
    check (char_length(headline) <= 220),

  constraint campus_magazine_description_check
    check (char_length(description) <= 10000),

  constraint campus_magazine_caption_check
    check (char_length(caption) <= 500),

  constraint campus_magazine_photo_url_check
    check (photo_url is null or photo_url ~* '^https?://')
);


create index if not exists campus_magazine_issue_status_idx
on public.campus_magazine_issues(status, created_at desc);


create index if not exists campus_magazine_page_order_idx
on public.campus_magazine_pages(issue_id, page_number);


create or replace function public.can_edit_campus_magazine()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_campus_role() in (
    'Placement Cell',
    'Coordinator',
    'Volunteer',
    'Main Admin'
  );
$$;


create or replace function public.prepare_campus_magazine_issue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_edit_campus_magazine() then
    raise exception 'Magazine editor permission is required.';
  end if;

  new.title := trim(new.title);
  new.subtitle := trim(coalesce(new.subtitle, ''));
  new.edition_label := trim(coalesce(new.edition_label, ''));

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;

  if new.status = 'Published' then
    if not exists (
      select 1
      from public.campus_magazine_pages
      where issue_id = new.id
    ) then
      raise exception 'Add at least one magazine spread before publishing.';
    end if;

    if exists (
      select 1
      from public.campus_magazine_pages
      where issue_id = new.id
        and (
          photo_url is null
          or char_length(trim(headline)) < 3
          or char_length(trim(description)) < 10
        )
    ) then
      raise exception
        'Every published spread requires a photo, headline and description.';
    end if;

    if tg_op = 'INSERT' or old.status <> 'Published' then
      new.published_at := now();
    else
      new.published_at := coalesce(old.published_at, now());
    end if;
  elsif new.status = 'Draft' then
    new.published_at := null;
  end if;

  new.updated_by := auth.uid();
  new.updated_at := now();

  return new;
end;
$$;


create or replace function public.prepare_campus_magazine_page()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_edit_campus_magazine() then
    raise exception 'Magazine editor permission is required.';
  end if;

  new.headline := trim(coalesce(new.headline, ''));
  new.description := trim(coalesce(new.description, ''));
  new.caption := trim(coalesce(new.caption, ''));
  new.photo_url := nullif(trim(coalesce(new.photo_url, '')), '');
  new.photo_path := nullif(trim(coalesce(new.photo_path, '')), '');

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;

  new.updated_by := auth.uid();
  new.updated_at := now();

  return new;
end;
$$;


drop trigger if exists prepare_campus_magazine_issue_trigger
on public.campus_magazine_issues;

create trigger prepare_campus_magazine_issue_trigger
before insert or update
on public.campus_magazine_issues
for each row
execute function public.prepare_campus_magazine_issue();


drop trigger if exists prepare_campus_magazine_page_trigger
on public.campus_magazine_pages;

create trigger prepare_campus_magazine_page_trigger
before insert or update
on public.campus_magazine_pages
for each row
execute function public.prepare_campus_magazine_page();


alter table public.campus_magazine_issues enable row level security;
alter table public.campus_magazine_pages enable row level security;


drop policy if exists "Campus users read magazine issues"
on public.campus_magazine_issues;

create policy "Campus users read magazine issues"
on public.campus_magazine_issues
for select
to authenticated
using (
  status = 'Published'
  or public.can_edit_campus_magazine()
);


drop policy if exists "Magazine editors create issues"
on public.campus_magazine_issues;

create policy "Magazine editors create issues"
on public.campus_magazine_issues
for insert
to authenticated
with check (
  public.can_edit_campus_magazine()
  and created_by = (select auth.uid())
);


drop policy if exists "Magazine editors update issues"
on public.campus_magazine_issues;

create policy "Magazine editors update issues"
on public.campus_magazine_issues
for update
to authenticated
using (public.can_edit_campus_magazine())
with check (public.can_edit_campus_magazine());


drop policy if exists "Magazine editors delete issues"
on public.campus_magazine_issues;

create policy "Magazine editors delete issues"
on public.campus_magazine_issues
for delete
to authenticated
using (public.can_edit_campus_magazine());


drop policy if exists "Campus users read magazine pages"
on public.campus_magazine_pages;

create policy "Campus users read magazine pages"
on public.campus_magazine_pages
for select
to authenticated
using (
  public.can_edit_campus_magazine()
  or exists (
    select 1
    from public.campus_magazine_issues issue
    where issue.id = issue_id
      and issue.status = 'Published'
  )
);


drop policy if exists "Magazine editors create pages"
on public.campus_magazine_pages;

create policy "Magazine editors create pages"
on public.campus_magazine_pages
for insert
to authenticated
with check (
  public.can_edit_campus_magazine()
  and created_by = (select auth.uid())
);


drop policy if exists "Magazine editors update pages"
on public.campus_magazine_pages;

create policy "Magazine editors update pages"
on public.campus_magazine_pages
for update
to authenticated
using (public.can_edit_campus_magazine())
with check (public.can_edit_campus_magazine());


drop policy if exists "Magazine editors delete pages"
on public.campus_magazine_pages;

create policy "Magazine editors delete pages"
on public.campus_magazine_pages
for delete
to authenticated
using (public.can_edit_campus_magazine());


insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'campus-magazine',
  'campus-magazine',
  true,
  8388608,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
  ]
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


drop policy if exists "Campus users view magazine photographs"
on storage.objects;

create policy "Campus users view magazine photographs"
on storage.objects
for select
to authenticated
using (bucket_id = 'campus-magazine');


drop policy if exists "Magazine editors upload photographs"
on storage.objects;

create policy "Magazine editors upload photographs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'campus-magazine'
  and public.can_edit_campus_magazine()
);


drop policy if exists "Magazine editors update photographs"
on storage.objects;

create policy "Magazine editors update photographs"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'campus-magazine'
  and public.can_edit_campus_magazine()
)
with check (
  bucket_id = 'campus-magazine'
  and public.can_edit_campus_magazine()
);


drop policy if exists "Magazine editors delete photographs"
on storage.objects;

create policy "Magazine editors delete photographs"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'campus-magazine'
  and public.can_edit_campus_magazine()
);


grant select, insert, update, delete
on public.campus_magazine_issues
to authenticated;

grant select, insert, update, delete
on public.campus_magazine_pages
to authenticated;

revoke all
on function public.can_edit_campus_magazine()
from public;

grant execute
on function public.can_edit_campus_magazine()
to authenticated;

notify pgrst, 'reload schema';
