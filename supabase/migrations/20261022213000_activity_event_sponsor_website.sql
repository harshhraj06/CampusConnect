-- Add official website links to existing Activity Center sponsors.
alter table public.activity_event_sponsors
  add column if not exists website_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'activity_event_sponsors_website_url_protocol_check'
      and conrelid = 'public.activity_event_sponsors'::regclass
  ) then
    alter table public.activity_event_sponsors
      add constraint activity_event_sponsors_website_url_protocol_check
      check (
        website_url is null
        or website_url ~* '^https?://'
      );
  end if;
end
$$;
