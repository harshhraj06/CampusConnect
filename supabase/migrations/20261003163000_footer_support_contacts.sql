alter table public.site_footer_settings
add column if not exists support_email text not null default '';

alter table public.site_footer_settings
add column if not exists support_phone text not null default '';

alter table public.site_footer_settings
add column if not exists support_location text not null default '';

alter table public.site_footer_settings
add column if not exists support_hours text not null default '';

alter table public.site_footer_settings
add column if not exists support_url text not null default '';

update public.site_footer_settings
set
  support_email = coalesce(support_email, ''),
  support_phone = coalesce(support_phone, ''),
  support_location = coalesce(support_location, ''),
  support_hours = coalesce(support_hours, ''),
  support_url = coalesce(support_url, '')
where id = 'main';
