-- Grant SELECT permission to anon and authenticated roles on branding_assets
-- This allows the public login screen to read the active branding hero image.
grant select on table public.branding_assets to anon, authenticated;
