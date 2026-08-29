-- =========================================================
-- CAMPUSCONNECT PRO
-- ACADEMICS V2
-- =========================================================


-- ---------------------------------------------------------
-- COLLEGE / RNSIT CONNECTION
-- ---------------------------------------------------------

create table if not exists public.college_connections (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  status text not null default 'disconnected'
    check (
      status in (
        'connected',
        'disconnected',
        'error'
      )
    ),

  provider text not null default 'RNSIT Contineo',

  last_synced_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  unique(student_id)
);


-- ---------------------------------------------------------
-- SUBJECTS
-- ---------------------------------------------------------

create table if not exists public.college_subjects (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  subject_code text not null default '',

  subject_name text not null,

  semester integer,

  academic_year text not null default '',

  credits numeric(4,1),

  faculty_name text not null default '',

  subject_type text not null default 'Theory',

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

-- Legacy compatibility before subject index
alter table public.college_subjects
  add column if not exists semester integer;

create index if not exists
college_subjects_student_idx
on public.college_subjects(
  student_id,
  semester
);


-- ---------------------------------------------------------
-- ATTENDANCE
-- ---------------------------------------------------------

create table if not exists public.college_attendance (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  subject_code text not null default '',

  subject_name text not null,

  semester integer,

  attended integer not null default 0
    check(attended >= 0),

  total integer not null default 0
    check(total >= 0),

  last_class_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


-- =========================================================
-- ACADEMICS V2 BOOTSTRAP REPAIR
-- Ensures new Academics V2 tables exist before legacy ALTERs.
-- =========================================================


-- ---------------------------------------------------------
-- RESULT SUBJECT DETAILS
-- ---------------------------------------------------------

create table if not exists public.college_result_subjects (
  id uuid primary key default gen_random_uuid(),

  result_id uuid not null
    references public.college_results(id)
    on delete cascade,

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  subject_code text not null default '',

  subject_name text not null,

  credits numeric(4,1),

  grade text not null default '',

  grade_points numeric(4,2),

  total_marks numeric(7,2),

  result_status text not null default 'Pass',

  created_at timestamptz not null default now()
);


create index if not exists
college_result_subjects_student_idx
on public.college_result_subjects(
  student_id
);


create index if not exists
college_result_subjects_result_idx
on public.college_result_subjects(
  result_id
);


-- ---------------------------------------------------------
-- TIMETABLE
-- ---------------------------------------------------------

create table if not exists public.college_timetable (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  semester integer,

  day_of_week text not null default '',

  period_order integer not null default 1,

  start_time time,

  end_time time,

  subject_code text not null default '',

  subject_name text not null default '',

  faculty_name text not null default '',

  room text not null default '',

  class_type text not null default 'Lecture',

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


create index if not exists
college_timetable_student_idx
on public.college_timetable(
  student_id,
  semester,
  day_of_week,
  period_order
);


-- ---------------------------------------------------------
-- ACADEMIC EVENTS / EXAMS / DEADLINES
-- ---------------------------------------------------------

create table if not exists public.college_academic_events (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null,

  event_type text not null default 'Exam',

  subject_code text not null default '',

  subject_name text not null default '',

  semester integer,

  starts_at timestamptz not null,

  ends_at timestamptz,

  venue text not null default '',

  description text not null default '',

  created_at timestamptz not null default now()
);


create index if not exists
college_academic_events_student_idx
on public.college_academic_events(
  student_id,
  starts_at
);



-- =========================================================
-- LEGACY ACADEMIC TABLE REPAIR
-- Existing CampusConnect installations may already contain
-- older versions of these tables.
-- =========================================================


-- ---------------------------------------------------------
-- COLLEGE CONNECTIONS
-- ---------------------------------------------------------

alter table public.college_connections
  add column if not exists status text
    default 'disconnected';

alter table public.college_connections
  add column if not exists provider text
    default 'RNSIT Contineo';

alter table public.college_connections
  add column if not exists last_synced_at timestamptz;

alter table public.college_connections
  add column if not exists created_at timestamptz
    default now();

alter table public.college_connections
  add column if not exists updated_at timestamptz
    default now();


-- ---------------------------------------------------------
-- SUBJECTS
-- ---------------------------------------------------------

alter table public.college_subjects
  add column if not exists subject_code text
    default '';

alter table public.college_subjects
  add column if not exists subject_name text;

alter table public.college_subjects
  add column if not exists semester integer;

alter table public.college_subjects
  add column if not exists academic_year text
    default '';

alter table public.college_subjects
  add column if not exists credits numeric(4,1);

alter table public.college_subjects
  add column if not exists faculty_name text
    default '';

alter table public.college_subjects
  add column if not exists subject_type text
    default 'Theory';

alter table public.college_subjects
  add column if not exists created_at timestamptz
    default now();

alter table public.college_subjects
  add column if not exists updated_at timestamptz
    default now();


-- ---------------------------------------------------------
-- ATTENDANCE
-- ---------------------------------------------------------

alter table public.college_attendance
  add column if not exists subject_code text
    default '';

alter table public.college_attendance
  add column if not exists subject_name text;

alter table public.college_attendance
  add column if not exists semester integer;

alter table public.college_attendance
  add column if not exists attended integer
    default 0;

alter table public.college_attendance
  add column if not exists total integer
    default 0;

alter table public.college_attendance
  add column if not exists last_class_at timestamptz;

alter table public.college_attendance
  add column if not exists created_at timestamptz
    default now();

alter table public.college_attendance
  add column if not exists updated_at timestamptz
    default now();


-- ---------------------------------------------------------
-- MARKS
-- ---------------------------------------------------------

alter table public.college_marks
  add column if not exists subject_code text
    default '';

alter table public.college_marks
  add column if not exists subject_name text;

alter table public.college_marks
  add column if not exists semester integer;

alter table public.college_marks
  add column if not exists assessment text
    default '';

alter table public.college_marks
  add column if not exists marks numeric(7,2);

alter table public.college_marks
  add column if not exists max_marks numeric(7,2);

alter table public.college_marks
  add column if not exists published_at timestamptz;

alter table public.college_marks
  add column if not exists created_at timestamptz
    default now();

alter table public.college_marks
  add column if not exists updated_at timestamptz
    default now();


-- ---------------------------------------------------------
-- RESULTS
-- ---------------------------------------------------------

alter table public.college_results
  add column if not exists semester integer;

alter table public.college_results
  add column if not exists academic_year text
    default '';

alter table public.college_results
  add column if not exists sgpa numeric(4,2);

alter table public.college_results
  add column if not exists cgpa numeric(4,2);

alter table public.college_results
  add column if not exists grade text
    default '';

alter table public.college_results
  add column if not exists credits_earned numeric(6,1);

alter table public.college_results
  add column if not exists credits_registered numeric(6,1);

alter table public.college_results
  add column if not exists result_status text
    default 'Published';

alter table public.college_results
  add column if not exists published_at timestamptz;

alter table public.college_results
  add column if not exists created_at timestamptz
    default now();

alter table public.college_results
  add column if not exists updated_at timestamptz
    default now();


-- ---------------------------------------------------------
-- RESULT SUBJECTS
-- ---------------------------------------------------------

alter table public.college_result_subjects
  add column if not exists subject_code text
    default '';

alter table public.college_result_subjects
  add column if not exists subject_name text;

alter table public.college_result_subjects
  add column if not exists credits numeric(4,1);

alter table public.college_result_subjects
  add column if not exists grade text
    default '';

alter table public.college_result_subjects
  add column if not exists grade_points numeric(4,2);

alter table public.college_result_subjects
  add column if not exists total_marks numeric(7,2);

alter table public.college_result_subjects
  add column if not exists result_status text
    default 'Pass';

alter table public.college_result_subjects
  add column if not exists created_at timestamptz
    default now();


-- ---------------------------------------------------------
-- FEES
-- ---------------------------------------------------------

alter table public.college_fees
  add column if not exists fee_type text
    default 'College fee';

alter table public.college_fees
  add column if not exists academic_year text
    default '';

alter table public.college_fees
  add column if not exists semester integer;

alter table public.college_fees
  add column if not exists amount numeric(12,2);

alter table public.college_fees
  add column if not exists paid_amount numeric(12,2);

alter table public.college_fees
  add column if not exists status text
    default 'Pending';

alter table public.college_fees
  add column if not exists due_date date;

alter table public.college_fees
  add column if not exists paid_at timestamptz;

alter table public.college_fees
  add column if not exists receipt_url text;

alter table public.college_fees
  add column if not exists created_at timestamptz
    default now();

alter table public.college_fees
  add column if not exists updated_at timestamptz
    default now();


-- ---------------------------------------------------------
-- TIMETABLE
-- ---------------------------------------------------------

alter table public.college_timetable
  add column if not exists semester integer;

alter table public.college_timetable
  add column if not exists day_of_week text;

alter table public.college_timetable
  add column if not exists period_order integer
    default 1;

alter table public.college_timetable
  add column if not exists start_time time;

alter table public.college_timetable
  add column if not exists end_time time;

alter table public.college_timetable
  add column if not exists subject_code text
    default '';

alter table public.college_timetable
  add column if not exists subject_name text;

alter table public.college_timetable
  add column if not exists faculty_name text
    default '';

alter table public.college_timetable
  add column if not exists room text
    default '';

alter table public.college_timetable
  add column if not exists class_type text
    default 'Lecture';

alter table public.college_timetable
  add column if not exists created_at timestamptz
    default now();

alter table public.college_timetable
  add column if not exists updated_at timestamptz
    default now();


-- ---------------------------------------------------------
-- ACADEMIC EVENTS
-- ---------------------------------------------------------

alter table public.college_academic_events
  add column if not exists title text;

alter table public.college_academic_events
  add column if not exists event_type text
    default 'Exam';

alter table public.college_academic_events
  add column if not exists subject_code text
    default '';

alter table public.college_academic_events
  add column if not exists subject_name text
    default '';

alter table public.college_academic_events
  add column if not exists semester integer;

alter table public.college_academic_events
  add column if not exists starts_at timestamptz;

alter table public.college_academic_events
  add column if not exists ends_at timestamptz;

alter table public.college_academic_events
  add column if not exists venue text
    default '';

alter table public.college_academic_events
  add column if not exists description text
    default '';

alter table public.college_academic_events
  add column if not exists created_at timestamptz
    default now();





create index if not exists
college_attendance_student_idx
on public.college_attendance(
  student_id,
  semester
);


-- ---------------------------------------------------------
-- INTERNAL / CIE MARKS
-- ---------------------------------------------------------

create table if not exists public.college_marks (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  subject_code text not null default '',

  subject_name text not null,

  semester integer,

  assessment text not null,

  marks numeric(7,2),

  max_marks numeric(7,2),

  published_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index if not exists
college_marks_student_idx
on public.college_marks(
  student_id,
  semester
);


-- ---------------------------------------------------------
-- SEMESTER RESULTS
-- ---------------------------------------------------------

create table if not exists public.college_results (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  semester integer not null,

  academic_year text not null default '',

  sgpa numeric(4,2),

  cgpa numeric(4,2),

  grade text not null default '',

  credits_earned numeric(6,1),

  credits_registered numeric(6,1),

  result_status text not null default 'Published',

  published_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  unique(
    student_id,
    semester
  )
);


-- ---------------------------------------------------------
-- SUBJECT RESULT DETAILS
-- ---------------------------------------------------------

create table if not exists public.college_result_subjects (
  id uuid primary key default gen_random_uuid(),

  result_id uuid not null
    references public.college_results(id)
    on delete cascade,

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  subject_code text not null default '',

  subject_name text not null,

  credits numeric(4,1),

  grade text not null default '',

  grade_points numeric(4,2),

  total_marks numeric(7,2),

  result_status text not null default 'Pass',

  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------
-- FEES
-- ---------------------------------------------------------

create table if not exists public.college_fees (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  fee_type text not null default 'College fee',

  academic_year text not null default '',

  semester integer,

  amount numeric(12,2),

  paid_amount numeric(12,2),

  status text not null default 'Pending',

  due_date date,

  paid_at timestamptz,

  receipt_url text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


-- ---------------------------------------------------------
-- TIMETABLE
-- ---------------------------------------------------------

create table if not exists public.college_timetable (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  semester integer,

  day_of_week text not null,

  period_order integer not null default 1,

  start_time time,

  end_time time,

  subject_code text not null default '',

  subject_name text not null,

  faculty_name text not null default '',

  room text not null default '',

  class_type text not null default 'Lecture',

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index if not exists
college_timetable_student_idx
on public.college_timetable(
  student_id,
  semester,
  day_of_week,
  period_order
);


-- ---------------------------------------------------------
-- EXAMS / ACADEMIC DEADLINES
-- ---------------------------------------------------------

create table if not exists public.college_academic_events (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null,

  event_type text not null default 'Exam',

  subject_code text not null default '',

  subject_name text not null default '',

  semester integer,

  starts_at timestamptz not null,

  ends_at timestamptz,

  venue text not null default '',

  description text not null default '',

  created_at timestamptz not null default now()
);




-- =========================================================
-- RLS
-- =========================================================

alter table public.college_connections
enable row level security;

alter table public.college_subjects
enable row level security;

alter table public.college_attendance
enable row level security;

alter table public.college_marks
enable row level security;

alter table public.college_results
enable row level security;

alter table public.college_result_subjects
enable row level security;

alter table public.college_fees
enable row level security;

alter table public.college_timetable
enable row level security;

alter table public.college_academic_events
enable row level security;


grant select, insert, update, delete
on
  public.college_connections,
  public.college_subjects,
  public.college_attendance,
  public.college_marks,
  public.college_results,
  public.college_result_subjects,
  public.college_fees,
  public.college_timetable,
  public.college_academic_events
to authenticated;


-- ---------------------------------------------------------
-- STUDENTS READ THEIR OWN DATA
-- ---------------------------------------------------------

do $$
declare
  table_name text;
begin

  foreach table_name in array array[
    'college_connections',
    'college_subjects',
    'college_attendance',
    'college_marks',
    'college_results',
    'college_result_subjects',
    'college_fees',
    'college_timetable',
    'college_academic_events'
  ]
  loop

    execute format(
      'drop policy if exists "Students read own academic data" on public.%I',
      table_name
    );

    execute format(
      'create policy "Students read own academic data"
       on public.%I
       for select
       to authenticated
       using (
         student_id = auth.uid()
         or public.current_campus_role() in (
           ''Faculty'',
           ''Coordinator'',
           ''Main Admin''
         )
       )',
      table_name
    );

  end loop;

end $$;


-- ---------------------------------------------------------
-- STAFF MANAGE ACADEMIC DATA
-- ---------------------------------------------------------

do $$
declare
  table_name text;
begin

  foreach table_name in array array[
    'college_subjects',
    'college_attendance',
    'college_marks',
    'college_results',
    'college_result_subjects',
    'college_fees',
    'college_timetable',
    'college_academic_events'
  ]
  loop

    execute format(
      'drop policy if exists "Academic staff create records" on public.%I',
      table_name
    );

    execute format(
      'create policy "Academic staff create records"
       on public.%I
       for insert
       to authenticated
       with check (
         public.current_campus_role() in (
           ''Faculty'',
           ''Coordinator'',
           ''Main Admin''
         )
       )',
      table_name
    );


    execute format(
      'drop policy if exists "Academic staff update records" on public.%I',
      table_name
    );

    execute format(
      'create policy "Academic staff update records"
       on public.%I
       for update
       to authenticated
       using (
         public.current_campus_role() in (
           ''Faculty'',
           ''Coordinator'',
           ''Main Admin''
         )
       )
       with check (
         public.current_campus_role() in (
           ''Faculty'',
           ''Coordinator'',
           ''Main Admin''
         )
       )',
      table_name
    );


    execute format(
      'drop policy if exists "Academic staff delete records" on public.%I',
      table_name
    );

    execute format(
      'create policy "Academic staff delete records"
       on public.%I
       for delete
       to authenticated
       using (
         public.current_campus_role() in (
           ''Faculty'',
           ''Coordinator'',
           ''Main Admin''
         )
       )',
      table_name
    );

  end loop;

end $$;

