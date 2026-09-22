-- =========================================================
-- CAMPUSCONNECT PRO
-- RNSIT CONTINEO VERIFIED FEE SYNC
-- =========================================================
--
-- Stores fee information extracted from the student's
-- authenticated Contineo session by the CampusConnect
-- browser extension.
--
-- This intentionally does NOT replace college_fees.
--
-- college_fees:
--   CampusConnect's existing generic/manual fee model.
--
-- college_fee_demands:
--   Current Contineo fee demand snapshot.
--
-- college_fee_payments:
--   Historical Contineo challans/payments.
--
-- college_fee_payment_heads:
--   Validated fee-head breakdown for each payment.
--
-- No Contineo password, DOB, cookie, or session token is
-- stored in these tables.
-- =========================================================


-- ---------------------------------------------------------
-- CURRENT FEE DEMAND
-- ---------------------------------------------------------

create table if not exists public.college_fee_demands (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  provider text not null
    default 'RNSIT Contineo',

  fee_head text not null,

  current_demand numeric(12,2) not null
    default 0
    check (current_demand >= 0),

  paid_so_far numeric(12,2) not null
    default 0
    check (paid_so_far >= 0),

  transaction_under_processing numeric(12,2)
    not null
    default 0
    check (
      transaction_under_processing >= 0
    ),

  balance numeric(12,2) not null
    default 0
    check (balance >= 0),

  synced_at timestamptz not null
    default now(),

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique (
    student_id,
    provider,
    fee_head
  )
);


-- ---------------------------------------------------------
-- PAYMENT / CHALLAN HISTORY
-- ---------------------------------------------------------

create table if not exists public.college_fee_payments (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  provider text not null
    default 'RNSIT Contineo',

  challan_no text not null,

  academic_year text,

  transaction_reference text,

  amount_paid numeric(12,2) not null
    check (amount_paid >= 0),

  payment_mode text,

  paid_at date,

  heads_total numeric(12,2),

  heads_validated boolean not null
    default false,

  synced_at timestamptz not null
    default now(),

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique (
    student_id,
    provider,
    challan_no
  )
);


-- ---------------------------------------------------------
-- PAYMENT HEAD BREAKDOWN
-- ---------------------------------------------------------

create table if not exists public.college_fee_payment_heads (
  id uuid primary key default gen_random_uuid(),

  payment_id uuid not null
    references public.college_fee_payments(id)
    on delete cascade,

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  fee_head text not null,

  amount numeric(12,2) not null
    check (amount >= 0),

  created_at timestamptz not null
    default now(),

  unique (
    payment_id,
    fee_head
  )
);


-- ---------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------

create index if not exists
  college_fee_demands_student_idx
on public.college_fee_demands (
  student_id
);

create index if not exists
  college_fee_payments_student_idx
on public.college_fee_payments (
  student_id
);

create index if not exists
  college_fee_payments_paid_at_idx
on public.college_fee_payments (
  student_id,
  paid_at desc
);

create index if not exists
  college_fee_payment_heads_student_idx
on public.college_fee_payment_heads (
  student_id
);

create index if not exists
  college_fee_payment_heads_payment_idx
on public.college_fee_payment_heads (
  payment_id
);


-- ---------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------

alter table public.college_fee_demands
enable row level security;

alter table public.college_fee_payments
enable row level security;

alter table public.college_fee_payment_heads
enable row level security;


-- ---------------------------------------------------------
-- STUDENT / STAFF READ ACCESS
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
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


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
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


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
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


-- ---------------------------------------------------------
-- STAFF MANAGEMENT
-- ---------------------------------------------------------

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
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Faculty',
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
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Faculty',
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
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


-- ---------------------------------------------------------
-- GRANTS
-- ---------------------------------------------------------

grant select, insert, update, delete
on
  public.college_fee_demands,
  public.college_fee_payments,
  public.college_fee_payment_heads
to authenticated;


-- ---------------------------------------------------------
-- COMMENTS
-- ---------------------------------------------------------

comment on table
  public.college_fee_demands
is
  'Current verified fee demand snapshot imported from an academic provider.';

comment on table
  public.college_fee_payments
is
  'Verified historical fee payment/challan records imported from an academic provider.';

comment on table
  public.college_fee_payment_heads
is
  'Validated fee-head breakdown belonging to an imported fee payment.';
