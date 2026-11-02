-- Surface successful academic promotions in each student's notification center.
create table if not exists public.student_academic_promotion_notifications (
  id uuid primary key default gen_random_uuid(),
  promotion_log_id uuid not null unique
    references public.student_academic_promotion_log(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  source_semester text not null,
  target_semester text not null,
  source_academic_year text not null default '',
  target_academic_year text not null default '',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists student_academic_promotion_notifications_inbox_idx
  on public.student_academic_promotion_notifications(student_id, read_at, created_at desc);

alter table public.student_academic_promotion_notifications enable row level security;
revoke all on public.student_academic_promotion_notifications from public, anon, authenticated;
grant select on public.student_academic_promotion_notifications to authenticated;
grant update (read_at) on public.student_academic_promotion_notifications to authenticated;

drop policy if exists "Students read own promotion notifications"
  on public.student_academic_promotion_notifications;
create policy "Students read own promotion notifications"
  on public.student_academic_promotion_notifications
  for select to authenticated
  using (student_id = (select auth.uid()));

drop policy if exists "Students mark own promotion notifications read"
  on public.student_academic_promotion_notifications;
create policy "Students mark own promotion notifications read"
  on public.student_academic_promotion_notifications
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create or replace function public.create_academic_promotion_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.student_academic_promotion_notifications (
    promotion_log_id,
    student_id,
    source_semester,
    target_semester,
    source_academic_year,
    target_academic_year,
    created_at
  ) values (
    new.id,
    new.student_id,
    new.source_semester,
    new.target_semester,
    coalesce(new.source_academic_year, ''),
    coalesce(new.target_academic_year, ''),
    new.promoted_at
  )
  on conflict (promotion_log_id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_academic_promotion_notification() from public, anon, authenticated;

drop trigger if exists student_academic_promotion_notification_after_insert
  on public.student_academic_promotion_log;
create trigger student_academic_promotion_notification_after_insert
  after insert on public.student_academic_promotion_log
  for each row execute function public.create_academic_promotion_notification();

-- Backfill prior successful promotions so the feature works immediately after migration.
insert into public.student_academic_promotion_notifications (
  promotion_log_id,
  student_id,
  source_semester,
  target_semester,
  source_academic_year,
  target_academic_year,
  created_at
)
select id, student_id, source_semester, target_semester,
  coalesce(source_academic_year, ''), coalesce(target_academic_year, ''), promoted_at
from public.student_academic_promotion_log
on conflict (promotion_log_id) do nothing;

notify pgrst, 'reload schema';