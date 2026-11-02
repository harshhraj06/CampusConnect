-- Enable Realtime refreshes for recruitment-drive notifications.
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'placement_drives'
  ) then
    execute 'alter publication supabase_realtime add table public.placement_drives';
  end if;
end;
$$;
