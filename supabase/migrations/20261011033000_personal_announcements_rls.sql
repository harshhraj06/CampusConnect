-- Grant SELECT and UPDATE on student_personal_announcements to authenticated users with RLS
grant select on public.student_personal_announcements to authenticated;
grant update (read_at) on public.student_personal_announcements to authenticated;

drop policy if exists "Recipients and senders read personal announcements"
  on public.student_personal_announcements;
create policy "Recipients and senders read personal announcements"
  on public.student_personal_announcements
  for select to authenticated
  using (student_id = (select auth.uid()) or sender_id = (select auth.uid()));

drop policy if exists "Recipients mark personal announcements read"
  on public.student_personal_announcements;
create policy "Recipients mark personal announcements read"
  on public.student_personal_announcements
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

do $block$
begin
  alter publication supabase_realtime add table public.student_personal_announcements;
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$block$;

notify pgrst, 'reload schema';
