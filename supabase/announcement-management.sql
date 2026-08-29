-- =========================================================
-- CAMPUSCONNECT — ANNOUNCEMENT MANAGEMENT
-- Authors manage their own notices.
-- Placement Cell can moderate all notices.
-- =========================================================

drop policy if exists "Authors manage announcements"
on public.announcements;

drop policy if exists "Authors delete announcements"
on public.announcements;

create policy "Authors manage announcements"
on public.announcements
for update
to authenticated
using (
  author_id = auth.uid()
  or public.current_campus_role() = 'Placement Cell'
)
with check (
  author_id = auth.uid()
  or public.current_campus_role() = 'Placement Cell'
);

create policy "Authors delete announcements"
on public.announcements
for delete
to authenticated
using (
  author_id = auth.uid()
  or public.current_campus_role() = 'Placement Cell'
);
