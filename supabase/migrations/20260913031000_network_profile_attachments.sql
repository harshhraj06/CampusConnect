create table if not exists public.network_post_attachments (
  id uuid primary key default gen_random_uuid(),

  post_id uuid not null
    references public.network_posts(id)
    on delete cascade,

  uploader_id uuid not null
    references public.profiles(id)
    on delete cascade,

  file_name text not null,
  file_path text not null unique,
  mime_type text not null default '',
  file_size bigint not null default 0
    check (file_size >= 0),

  created_at timestamptz not null default now()
);

create index if not exists
  network_post_attachments_post_idx
on public.network_post_attachments(post_id);

create table if not exists public.profile_achievement_attachments (
  id uuid primary key default gen_random_uuid(),

  achievement_id uuid not null
    references public.profile_achievements(id)
    on delete cascade,

  owner_id uuid not null
    references public.profiles(id)
    on delete cascade,

  file_name text not null,
  file_path text not null unique,
  mime_type text not null default '',
  file_size bigint not null default 0
    check (file_size >= 0),

  created_at timestamptz not null default now()
);

create index if not exists
  profile_achievement_attachments_achievement_idx
on public.profile_achievement_attachments(achievement_id);

alter table public.network_post_attachments
enable row level security;

alter table public.profile_achievement_attachments
enable row level security;

grant select, insert, delete
on public.network_post_attachments
to authenticated;

grant select, insert, delete
on public.profile_achievement_attachments
to authenticated;

drop policy if exists
  "Campus reads network post attachments"
on public.network_post_attachments;

create policy
  "Campus reads network post attachments"
on public.network_post_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.network_posts np
    where np.id = network_post_attachments.post_id
  )
);

drop policy if exists
  "Users upload own network post attachments"
on public.network_post_attachments;

create policy
  "Users upload own network post attachments"
on public.network_post_attachments
for insert
to authenticated
with check (
  uploader_id = auth.uid()
  and exists (
    select 1
    from public.network_posts np
    where np.id = network_post_attachments.post_id
      and np.author_id = auth.uid()
  )
);

drop policy if exists
  "Users delete own network post attachments"
on public.network_post_attachments;

create policy
  "Users delete own network post attachments"
on public.network_post_attachments
for delete
to authenticated
using (
  uploader_id = auth.uid()
);

drop policy if exists
  "Users read visible achievement attachments"
on public.profile_achievement_attachments;

create policy
  "Users read visible achievement attachments"
on public.profile_achievement_attachments
for select
to authenticated
using (
  owner_id = auth.uid()
  or public.can_view_network_profile(owner_id)
);

drop policy if exists
  "Users upload own achievement attachments"
on public.profile_achievement_attachments;

create policy
  "Users upload own achievement attachments"
on public.profile_achievement_attachments
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.profile_achievements pa
    where pa.id =
      profile_achievement_attachments.achievement_id
      and pa.owner_id = auth.uid()
  )
);

drop policy if exists
  "Users delete own achievement attachments"
on public.profile_achievement_attachments;

create policy
  "Users delete own achievement attachments"
on public.profile_achievement_attachments
for delete
to authenticated
using (
  owner_id = auth.uid()
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'professional-media',
  'professional-media',
  false,
  15728640,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id)
do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types =
    excluded.allowed_mime_types;

drop policy if exists
  "Authenticated users upload professional media"
on storage.objects;

create policy
  "Authenticated users upload professional media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'professional-media'
  and (
    storage.foldername(name)
  )[2] = auth.uid()::text
);

drop policy if exists
  "Users delete own professional media"
on storage.objects;

create policy
  "Users delete own professional media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'professional-media'
  and (
    storage.foldername(name)
  )[2] = auth.uid()::text
);

drop policy if exists
  "Authenticated users read network media"
on storage.objects;

create policy
  "Authenticated users read network media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'professional-media'
  and (
    (
      storage.foldername(name)
    )[1] = 'network'
    and exists (
      select 1
      from public.network_post_attachments npa
      where npa.file_path = name
    )
  )
  or (
    (
      storage.foldername(name)
    )[1] = 'achievements'
    and exists (
      select 1
      from public.profile_achievement_attachments paa
      where paa.file_path = name
        and (
          paa.owner_id = auth.uid()
          or public.can_view_network_profile(
            paa.owner_id
          )
        )
    )
  )
);

notify pgrst, 'reload schema';
