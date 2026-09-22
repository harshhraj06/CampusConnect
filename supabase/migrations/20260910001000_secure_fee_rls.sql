-- =========================================================
-- CAMPUSCONNECT PRO
-- RESTRICT FEE DATA ACCESS
-- =========================================================
--
-- Fee/payment information is sensitive student data.
--
-- Students:
--   may read only their own records.
--
-- Coordinators / Main Admin:
--   may read/manage records.
--
-- Faculty:
--   no general access to student financial records.
--
-- Import writes continue server-side through the
-- CampusConnect backend/service role.
-- =========================================================


-- ---------------------------------------------------------
-- DEMANDS
-- ---------------------------------------------------------

drop policy if exists
  "Students read own fee demands"
on public.college_fee_demands;

create policy
  "Students read own fee demands"
on public.college_fee_demands
for select
to authenticated
using (
  student_id = auth.uid()
  or public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
  "Staff manage fee demands"
on public.college_fee_demands;

create policy
  "Staff manage fee demands"
on public.college_fee_demands
for all
to authenticated
using (
  public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
);


-- ---------------------------------------------------------
-- PAYMENTS
-- ---------------------------------------------------------

drop policy if exists
  "Students read own fee payments"
on public.college_fee_payments;

create policy
  "Students read own fee payments"
on public.college_fee_payments
for select
to authenticated
using (
  student_id = auth.uid()
  or public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
  "Staff manage fee payments"
on public.college_fee_payments;

create policy
  "Staff manage fee payments"
on public.college_fee_payments
for all
to authenticated
using (
  public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
);


-- ---------------------------------------------------------
-- PAYMENT HEADS
-- ---------------------------------------------------------

drop policy if exists
  "Students read own fee payment heads"
on public.college_fee_payment_heads;

create policy
  "Students read own fee payment heads"
on public.college_fee_payment_heads
for select
to authenticated
using (
  student_id = auth.uid()
  or public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
  "Staff manage fee payment heads"
on public.college_fee_payment_heads;

create policy
  "Staff manage fee payment heads"
on public.college_fee_payment_heads
for all
to authenticated
using (
  public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
);
