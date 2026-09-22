create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),

  seller_id uuid not null
    references public.profiles(id)
    on delete cascade,

  title text not null
    check (
      length(trim(title)) between 3 and 120
    ),

  description text not null
    check (
      length(trim(description)) between 10 and 4000
    ),

  price numeric(12,2) not null
    check (price >= 0),

  category text not null
    check (
      category in (
        'Books',
        'Electronics',
        'Calculator',
        'Lab Equipment',
        'Cycle',
        'Furniture',
        'Hostel Essentials',
        'Sports',
        'Fashion',
        'Stationery',
        'Other'
      )
    ),

  condition text not null
    check (
      condition in (
        'New',
        'Like New',
        'Good',
        'Fair'
      )
    ),

  pickup_location text not null default '',

  negotiable boolean not null default false,

  status text not null default 'Available'
    check (
      status in (
        'Available',
        'Reserved',
        'Sold'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_listing_images (
  id uuid primary key default gen_random_uuid(),

  listing_id uuid not null
    references public.marketplace_listings(id)
    on delete cascade,

  uploader_id uuid not null
    references public.profiles(id)
    on delete cascade,

  file_name text not null,
  file_path text not null unique,
  mime_type text not null default '',
  file_size bigint not null default 0
    check (file_size >= 0),

  sort_order integer not null default 0,

  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_favourites (
  listing_id uuid not null
    references public.marketplace_listings(id)
    on delete cascade,

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  primary key (
    listing_id,
    user_id
  )
);

create table if not exists public.marketplace_reports (
  id uuid primary key default gen_random_uuid(),

  listing_id uuid not null
    references public.marketplace_listings(id)
    on delete cascade,

  reporter_id uuid not null
    references public.profiles(id)
    on delete cascade,

  reason text not null
    check (
      length(trim(reason)) between 3 and 500
    ),

  created_at timestamptz not null default now(),

  unique (
    listing_id,
    reporter_id
  )
);

create index if not exists
  marketplace_listings_created_idx
on public.marketplace_listings(
  created_at desc
);

create index if not exists
  marketplace_listings_category_idx
on public.marketplace_listings(
  category
);

create index if not exists
  marketplace_listings_seller_idx
on public.marketplace_listings(
  seller_id
);

create index if not exists
  marketplace_images_listing_idx
on public.marketplace_listing_images(
  listing_id,
  sort_order
);

alter table public.marketplace_listings
enable row level security;

alter table public.marketplace_listing_images
enable row level security;

alter table public.marketplace_favourites
enable row level security;

alter table public.marketplace_reports
enable row level security;

grant select, insert, update, delete
on public.marketplace_listings
to authenticated;

grant select, insert, delete
on public.marketplace_listing_images
to authenticated;

grant select, insert, delete
on public.marketplace_favourites
to authenticated;

grant insert
on public.marketplace_reports
to authenticated;

drop policy if exists
  "Campus users view marketplace listings"
on public.marketplace_listings;

create policy
  "Campus users view marketplace listings"
on public.marketplace_listings
for select
to authenticated
using (true);

drop policy if exists
  "Users create own marketplace listings"
on public.marketplace_listings;

create policy
  "Users create own marketplace listings"
on public.marketplace_listings
for insert
to authenticated
with check (
  seller_id = auth.uid()
);

drop policy if exists
  "Users update own marketplace listings"
on public.marketplace_listings;

create policy
  "Users update own marketplace listings"
on public.marketplace_listings
for update
to authenticated
using (
  seller_id = auth.uid()
)
with check (
  seller_id = auth.uid()
);

drop policy if exists
  "Users delete own marketplace listings"
on public.marketplace_listings;

create policy
  "Users delete own marketplace listings"
on public.marketplace_listings
for delete
to authenticated
using (
  seller_id = auth.uid()
);

drop policy if exists
  "Campus users view marketplace images"
on public.marketplace_listing_images;

create policy
  "Campus users view marketplace images"
on public.marketplace_listing_images
for select
to authenticated
using (true);

drop policy if exists
  "Users upload own marketplace images"
on public.marketplace_listing_images;

create policy
  "Users upload own marketplace images"
on public.marketplace_listing_images
for insert
to authenticated
with check (
  uploader_id = auth.uid()
  and exists (
    select 1
    from public.marketplace_listings ml
    where ml.id =
      marketplace_listing_images.listing_id
      and ml.seller_id = auth.uid()
  )
);

drop policy if exists
  "Users delete own marketplace images"
on public.marketplace_listing_images;

create policy
  "Users delete own marketplace images"
on public.marketplace_listing_images
for delete
to authenticated
using (
  uploader_id = auth.uid()
);

drop policy if exists
  "Users view own marketplace favourites"
on public.marketplace_favourites;

create policy
  "Users view own marketplace favourites"
on public.marketplace_favourites
for select
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists
  "Users add own marketplace favourites"
on public.marketplace_favourites;

create policy
  "Users add own marketplace favourites"
on public.marketplace_favourites
for insert
to authenticated
with check (
  user_id = auth.uid()
);

drop policy if exists
  "Users delete own marketplace favourites"
on public.marketplace_favourites;

create policy
  "Users delete own marketplace favourites"
on public.marketplace_favourites
for delete
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists
  "Users report marketplace listings"
on public.marketplace_reports;

create policy
  "Users report marketplace listings"
on public.marketplace_reports
for insert
to authenticated
with check (
  reporter_id = auth.uid()
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'marketplace-media',
  'marketplace-media',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id)
do update set
  public = false,
  file_size_limit =
    excluded.file_size_limit,
  allowed_mime_types =
    excluded.allowed_mime_types;

drop policy if exists
  "Campus reads marketplace media"
on storage.objects;

create policy
  "Campus reads marketplace media"
on storage.objects
for select
to authenticated
using (
  bucket_id =
    'marketplace-media'
);

drop policy if exists
  "Users upload own marketplace media"
on storage.objects;

create policy
  "Users upload own marketplace media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id =
    'marketplace-media'
  and (
    storage.foldername(name)
  )[1] = auth.uid()::text
);

drop policy if exists
  "Users delete own marketplace media"
on storage.objects;

create policy
  "Users delete own marketplace media"
on storage.objects
for delete
to authenticated
using (
  bucket_id =
    'marketplace-media'
  and (
    storage.foldername(name)
  )[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
