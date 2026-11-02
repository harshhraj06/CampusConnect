create table if not exists public.branding_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text unique not null,
  public_url text not null,
  is_active boolean not null default false,
  file_size bigint not null default 0,
  mime_type text not null default 'image/webp',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.branding_assets enable row level security;
revoke all on table public.branding_assets from anon, authenticated;

-- Main Admins can manage branding assets
create policy "Main admins manage branding assets"
on public.branding_assets
for all
to authenticated
using (
  public.current_campus_role() = 'Main Admin'
)
with check (
  public.current_campus_role() = 'Main Admin'
);

-- Public can read branding assets (used to serve the active hero image)
create policy "Public read branding assets"
on public.branding_assets
for select
to public
using (true);

create or replace function public.set_branding_assets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_branding_assets_updated_at on public.branding_assets;
create trigger set_branding_assets_updated_at
before update on public.branding_assets
for each row
execute procedure public.set_branding_assets_updated_at();
