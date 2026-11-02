-- =========================================================
-- CAMPUSCONNECT BRANCH-WISE PLACEMENT TRAINING & CAREER READINESS SYSTEM
-- Migration: 20261017010000_placement_training_system.sql
-- =========================================================

-- 1. Branches & Tracks Configuration
create table if not exists public.placement_branches (
  id text primary key, -- e.g. 'ECE', 'CSE', 'ISE', 'MECH', 'CIVIL', 'EEE', 'CHEM', 'AIML'
  name text not null,
  description text not null default '',
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.placement_tracks (
  id text primary key, -- 'core', 'software', 'aptitude', 'company', 'interview'
  title text not null,
  description text not null default '',
  icon text not null default '◈',
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 2. Subjects & Topics Hierarchy
create table if not exists public.placement_subjects (
  id uuid primary key default gen_random_uuid(),
  branch_id text references public.placement_branches(id) on delete cascade, -- null = branch-agnostic (e.g. software, aptitude)
  track_id text not null references public.placement_tracks(id) on delete cascade,
  name text not null,
  code text not null default '',
  description text not null default '',
  icon text not null default 'BookOpen',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.placement_topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.placement_subjects(id) on delete cascade,
  name text not null,
  description text not null default '',
  learning_content text not null default '', -- Key formulas, notes, tips
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Comprehensive Question Bank
create table if not exists public.placement_questions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  question_text text not null,
  question_type text not null check (
    question_type in (
      'mcq_single',
      'mcq_multiple',
      'true_false',
      'short_answer',
      'numerical',
      'coding',
      'interview',
      'scenario',
      'subjective',
      'collection'
    )
  ),
  branch_id text references public.placement_branches(id) on delete set null,
  track_id text not null references public.placement_tracks(id) on delete cascade,
  subject_id uuid references public.placement_subjects(id) on delete set null,
  topic_id uuid references public.placement_topics(id) on delete set null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')) default 'intermediate',
  options jsonb not null default '[]'::jsonb, -- Array of { id: string, text: string, is_correct: boolean, explanation?: string }
  correct_answer text not null default '',
  explanation text not null default '',
  marks numeric(5,2) not null default 1.0,
  negative_marks numeric(5,2) not null default 0.0,
  coding_template jsonb, -- { languages: string[], starter_code: Record<string,string>, test_cases: Array<{ input: string, expected_output: string, is_hidden: boolean }> }
  tags text[] not null default array[]::text[],
  status text not null check (status in ('draft', 'review', 'published', 'archived')) default 'published',
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default '',
  source_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Assessments & Question Sets
create table if not exists public.placement_assessments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  track_id text not null references public.placement_tracks(id) on delete cascade,
  branch_id text references public.placement_branches(id) on delete set null,
  subject_id uuid references public.placement_subjects(id) on delete set null,
  duration_minutes integer not null default 30,
  total_marks numeric(6,2) not null default 0.0,
  passing_percentage numeric(5,2) not null default 50.0,
  negative_marking boolean not null default false,
  randomize_questions boolean not null default false,
  feedback_release text not null check (feedback_release in ('immediate', 'after_deadline', 'manual')) default 'immediate',
  eligible_branches text[] not null default array['ALL']::text[],
  target_batches text[] not null default array['ALL']::text[],
  max_attempts integer not null default 1,
  status text not null check (status in ('draft', 'published', 'archived')) default 'published',
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.placement_assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.placement_assessments(id) on delete cascade,
  question_id uuid not null references public.placement_questions(id) on delete cascade,
  order_index integer not null default 0,
  marks numeric(5,2) not null default 1.0,
  negative_marks numeric(5,2) not null default 0.0,
  unique (assessment_id, question_id)
);

-- 5. Student Attempts & Evaluations
create table if not exists public.placement_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.placement_assessments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null default '',
  student_branch text not null default '',
  attempt_number integer not null default 1,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(6,2) not null default 0.0,
  total_marks numeric(6,2) not null default 0.0,
  percentage numeric(5,2) not null default 0.0,
  passed boolean not null default false,
  responses jsonb not null default '{}'::jsonb, -- { [question_id]: { answer: any, is_correct: boolean, marks_awarded: number, time_spent_seconds?: number } }
  status text not null check (status in ('in_progress', 'submitted', 'evaluated', 'abandoned')) default 'in_progress',
  created_at timestamptz not null default now()
);

-- 6. Student Practice Progress Tracking
create table if not exists public.placement_student_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null references public.placement_tracks(id) on delete cascade,
  branch_id text references public.placement_branches(id) on delete cascade,
  subject_id uuid references public.placement_subjects(id) on delete cascade,
  topic_id uuid references public.placement_topics(id) on delete cascade,
  questions_attempted integer not null default 0,
  questions_correct integer not null default 0,
  coding_problems_solved integer not null default 0,
  last_practiced_at timestamptz not null default now(),
  unique (student_id, track_id, subject_id, topic_id)
);

-- 7. Bookmarks / Revision Saved Questions
create table if not exists public.placement_bookmarks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.placement_questions(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (student_id, question_id)
);

-- 8. Company Preparation Track Collections
create table if not exists public.placement_company_kits (
  id uuid primary key default gen_random_uuid(),
  company_name text not null unique,
  logo_label text not null default '',
  industry text not null default '',
  recruitment_pattern text not null default '',
  eligibility_criteria text not null default '',
  interview_stages text[] not null default array[]::text[],
  frequently_asked_topics text[] not null default array[]::text[],
  sample_questions jsonb not null default '[]'::jsonb,
  is_verified boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Coding Submissions & Test-case History
create table if not exists public.placement_coding_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.placement_questions(id) on delete cascade,
  language text not null,
  source_code text not null,
  status text not null check (status in ('accepted', 'wrong_answer', 'runtime_error', 'time_limit_exceeded', 'compilation_error')),
  test_cases_passed integer not null default 0,
  test_cases_total integer not null default 0,
  execution_time_ms integer not null default 0,
  output text not null default '',
  created_at timestamptz not null default now()
);

-- Indexes for high-performance querying
create index if not exists idx_placement_subjects_branch on public.placement_subjects(branch_id);
create index if not exists idx_placement_subjects_track on public.placement_subjects(track_id);
create index if not exists idx_placement_topics_subject on public.placement_topics(subject_id);
create index if not exists idx_placement_questions_branch on public.placement_questions(branch_id);
create index if not exists idx_placement_questions_track on public.placement_questions(track_id);
create index if not exists idx_placement_questions_subject on public.placement_questions(subject_id);
create index if not exists idx_placement_questions_topic on public.placement_questions(topic_id);
create index if not exists idx_placement_questions_type on public.placement_questions(question_type);
create index if not exists idx_placement_questions_status on public.placement_questions(status);
create index if not exists idx_placement_assessments_track on public.placement_assessments(track_id);
create index if not exists idx_placement_assessments_branch on public.placement_assessments(branch_id);
create index if not exists idx_placement_attempts_student on public.placement_assessment_attempts(student_id);
create index if not exists idx_placement_attempts_assessment on public.placement_assessment_attempts(assessment_id);
create index if not exists idx_placement_progress_student on public.placement_student_progress(student_id);
create index if not exists idx_placement_bookmarks_student on public.placement_bookmarks(student_id);
create index if not exists idx_placement_coding_student on public.placement_coding_submissions(student_id);

-- Enable Row Level Security (RLS) on all tables
alter table public.placement_branches enable row level security;
alter table public.placement_tracks enable row level security;
alter table public.placement_subjects enable row level security;
alter table public.placement_topics enable row level security;
alter table public.placement_questions enable row level security;
alter table public.placement_assessments enable row level security;
alter table public.placement_assessment_questions enable row level security;
alter table public.placement_assessment_attempts enable row level security;
alter table public.placement_student_progress enable row level security;
alter table public.placement_bookmarks enable row level security;
alter table public.placement_company_kits enable row level security;
alter table public.placement_coding_submissions enable row level security;

-- Drop existing policies if any
drop policy if exists "Read placement branches" on public.placement_branches;
drop policy if exists "Manage placement branches" on public.placement_branches;
drop policy if exists "Read placement tracks" on public.placement_tracks;
drop policy if exists "Manage placement tracks" on public.placement_tracks;
drop policy if exists "Read placement subjects" on public.placement_subjects;
drop policy if exists "Manage placement subjects" on public.placement_subjects;
drop policy if exists "Read placement topics" on public.placement_topics;
drop policy if exists "Manage placement topics" on public.placement_topics;
drop policy if exists "Read placement questions" on public.placement_questions;
drop policy if exists "Manage placement questions" on public.placement_questions;
drop policy if exists "Read placement assessments" on public.placement_assessments;
drop policy if exists "Manage placement assessments" on public.placement_assessments;
drop policy if exists "Read assessment questions" on public.placement_assessment_questions;
drop policy if exists "Manage assessment questions" on public.placement_assessment_questions;
drop policy if exists "Read assessment attempts" on public.placement_assessment_attempts;
drop policy if exists "Create own assessment attempt" on public.placement_assessment_attempts;
drop policy if exists "Update own assessment attempt" on public.placement_assessment_attempts;
drop policy if exists "Read own progress" on public.placement_student_progress;
drop policy if exists "Manage own progress" on public.placement_student_progress;
drop policy if exists "Manage own bookmarks" on public.placement_bookmarks;
drop policy if exists "Read company kits" on public.placement_company_kits;
drop policy if exists "Manage company kits" on public.placement_company_kits;
drop policy if exists "Read coding submissions" on public.placement_coding_submissions;
drop policy if exists "Create coding submission" on public.placement_coding_submissions;

-- Policies for Branches & Tracks
create policy "Read placement branches" on public.placement_branches
  for select to authenticated using (true);

create policy "Manage placement branches" on public.placement_branches
  for all to authenticated
  using (public.current_campus_role() in ('Placement Cell', 'Main Admin'))
  with check (public.current_campus_role() in ('Placement Cell', 'Main Admin'));

create policy "Read placement tracks" on public.placement_tracks
  for select to authenticated using (true);

create policy "Manage placement tracks" on public.placement_tracks
  for all to authenticated
  using (public.current_campus_role() in ('Placement Cell', 'Main Admin'))
  with check (public.current_campus_role() in ('Placement Cell', 'Main Admin'));

-- Policies for Subjects & Topics
create policy "Read placement subjects" on public.placement_subjects
  for select to authenticated using (true);

create policy "Manage placement subjects" on public.placement_subjects
  for all to authenticated
  using (public.current_campus_role() in ('Placement Cell', 'Main Admin'))
  with check (public.current_campus_role() in ('Placement Cell', 'Main Admin'));

create policy "Read placement topics" on public.placement_topics
  for select to authenticated using (true);

create policy "Manage placement topics" on public.placement_topics
  for all to authenticated
  using (public.current_campus_role() in ('Placement Cell', 'Main Admin'))
  with check (public.current_campus_role() in ('Placement Cell', 'Main Admin'));

-- Policies for Questions
create policy "Read placement questions" on public.placement_questions
  for select to authenticated
  using (
    status = 'published'
    or public.current_campus_role() in ('Placement Cell', 'Main Admin')
  );

create policy "Manage placement questions" on public.placement_questions
  for all to authenticated
  using (public.current_campus_role() in ('Placement Cell', 'Main Admin'))
  with check (public.current_campus_role() in ('Placement Cell', 'Main Admin'));

-- Policies for Assessments
create policy "Read placement assessments" on public.placement_assessments
  for select to authenticated
  using (
    status = 'published'
    or public.current_campus_role() in ('Placement Cell', 'Main Admin')
  );

create policy "Manage placement assessments" on public.placement_assessments
  for all to authenticated
  using (public.current_campus_role() in ('Placement Cell', 'Main Admin'))
  with check (public.current_campus_role() in ('Placement Cell', 'Main Admin'));

create policy "Read assessment questions" on public.placement_assessment_questions
  for select to authenticated using (true);

create policy "Manage assessment questions" on public.placement_assessment_questions
  for all to authenticated
  using (public.current_campus_role() in ('Placement Cell', 'Main Admin'))
  with check (public.current_campus_role() in ('Placement Cell', 'Main Admin'));

-- Policies for Attempts
create policy "Read assessment attempts" on public.placement_assessment_attempts
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.current_campus_role() in ('Placement Cell', 'Main Admin')
  );

create policy "Create own assessment attempt" on public.placement_assessment_attempts
  for insert to authenticated
  with check (student_id = auth.uid());

create policy "Update own assessment attempt" on public.placement_assessment_attempts
  for update to authenticated
  using (
    student_id = auth.uid()
    or public.current_campus_role() in ('Placement Cell', 'Main Admin')
  )
  with check (
    student_id = auth.uid()
    or public.current_campus_role() in ('Placement Cell', 'Main Admin')
  );

-- Policies for Progress & Bookmarks
create policy "Read own progress" on public.placement_student_progress
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.current_campus_role() in ('Placement Cell', 'Main Admin')
  );

create policy "Manage own progress" on public.placement_student_progress
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "Manage own bookmarks" on public.placement_bookmarks
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Policies for Company Kits
create policy "Read company kits" on public.placement_company_kits
  for select to authenticated using (true);

create policy "Manage company kits" on public.placement_company_kits
  for all to authenticated
  using (public.current_campus_role() in ('Placement Cell', 'Main Admin'))
  with check (public.current_campus_role() in ('Placement Cell', 'Main Admin'));

-- Policies for Coding Submissions
create policy "Read coding submissions" on public.placement_coding_submissions
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.current_campus_role() in ('Placement Cell', 'Main Admin')
  );

create policy "Create coding submission" on public.placement_coding_submissions
  for insert to authenticated
  with check (student_id = auth.uid());

-- Grants
grant select on public.placement_branches to authenticated;
grant select on public.placement_tracks to authenticated;
grant select on public.placement_subjects to authenticated;
grant select on public.placement_topics to authenticated;
grant select on public.placement_questions to authenticated;
grant select on public.placement_assessments to authenticated;
grant select on public.placement_assessment_questions to authenticated;
grant select, insert, update on public.placement_assessment_attempts to authenticated;
grant select, insert, update on public.placement_student_progress to authenticated;
grant select, insert, delete on public.placement_bookmarks to authenticated;
grant select on public.placement_company_kits to authenticated;
grant select, insert on public.placement_coding_submissions to authenticated;

-- Service role full access
grant all on public.placement_branches to service_role;
grant all on public.placement_tracks to service_role;
grant all on public.placement_subjects to service_role;
grant all on public.placement_topics to service_role;
grant all on public.placement_questions to service_role;
grant all on public.placement_assessments to service_role;
grant all on public.placement_assessment_questions to service_role;
grant all on public.placement_assessment_attempts to service_role;
grant all on public.placement_student_progress to service_role;
grant all on public.placement_bookmarks to service_role;
grant all on public.placement_company_kits to service_role;
grant all on public.placement_coding_submissions to service_role;

-- =========================================================
-- INITIAL SEED DATA
-- =========================================================

-- Branches
insert into public.placement_branches (id, name, description, display_order)
values
  ('ECE', 'Electronics & Communication Engineering', 'VLSI, Embedded Systems, Signal Processing, IoT, Semiconductor Devices', 1),
  ('CSE', 'Computer Science & Engineering', 'Software Systems, Algorithms, Networks, Web, Cloud, AI/ML', 2),
  ('ISE', 'Information Science & Engineering', 'Software Engineering, Database Architecture, Systems, Data Analytics', 3),
  ('MECH', 'Mechanical Engineering', 'Thermodynamics, Machine Design, Fluid Mechanics, CAD/CAM, Robotics', 4),
  ('CIVIL', 'Civil Engineering', 'Structural Analysis, Geotechnical, RCC, Construction, AutoCAD, BIM', 5),
  ('EEE', 'Electrical & Electronics Engineering', 'Power Systems, Electrical Machines, Control Systems, Power Electronics', 6),
  ('CHEM', 'Chemical Engineering', 'Process Calculations, Thermodynamics, Heat & Mass Transfer, Reaction Engineering', 7),
  ('AIML', 'Artificial Intelligence & Machine Learning', 'Deep Learning, NLP, Computer Vision, Model Deployment', 8)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order;

-- Tracks
insert into public.placement_tracks (id, title, description, icon, display_order)
values
  ('core', 'Branch-Wise Core Engineering', 'Rigorous branch-specific technical preparation for core engineering campus hiring.', 'Cpu', 1),
  ('software', 'Complete Software Placement', 'Comprehensive software engineering curriculum accessible to all engineering branches.', 'Code', 2),
  ('aptitude', 'Aptitude & Logical Reasoning', 'Quantitative ability, logical reasoning, and verbal communication for recruitment screenings.', 'Brain', 3),
  ('company', 'Company Specific Preparation', 'Curated hiring patterns, interview archives, and online assessment question banks.', 'Building2', 4),
  ('interview', 'Interview Studio & Career Tools', 'Technical, HR and behavioral mock interviews with structured rubrics and actionable feedback.', 'Briefcase', 5)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  display_order = excluded.display_order;

-- Initial Core Subjects for ECE
insert into public.placement_subjects (id, branch_id, track_id, name, code, description, icon, display_order)
values
  ('10000000-0000-0000-0000-000000000001', 'ECE', 'core', 'Digital Electronics & Logic Design', 'ECE-201', 'Boolean algebra, combinational & sequential circuits, FSMs, setup & hold times', 'Cpu', 1),
  ('10000000-0000-0000-0000-000000000002', 'ECE', 'core', 'Analog Electronics & CMOS', 'ECE-202', 'BJT, MOSFET amplifiers, op-amps, feedback, frequency response, CMOS inverters', 'Radio', 2),
  ('10000000-0000-0000-0000-000000000003', 'ECE', 'core', 'VLSI Design & HDLs (Verilog/VHDL)', 'ECE-301', 'Verilog/SystemVerilog RTL coding, synthesis, static timing analysis (STA)', 'Microchip', 3),
  ('10000000-0000-0000-0000-000000000004', 'ECE', 'core', 'Embedded Systems & Microcontrollers', 'ECE-302', 'ARM Cortex, 8051, Embedded C, timers, interrupts, UART, SPI, I2C, RTOS', 'Server', 4),
  ('10000000-0000-0000-0000-000000000005', 'ECE', 'core', 'Signals, Systems & DSP', 'ECE-303', 'Fourier/Laplace/Z-transform, FIR/IIR filters, sampling, digital communication', 'Activity', 5)
on conflict (id) do nothing;

-- Initial Core Subjects for Mechanical
insert into public.placement_subjects (id, branch_id, track_id, name, code, description, icon, display_order)
values
  ('20000000-0000-0000-0000-000000000001', 'MECH', 'core', 'Thermodynamics & Heat Transfer', 'MECH-201', 'Laws of thermodynamics, power cycles, conduction, convection, radiation', 'Flame', 1),
  ('20000000-0000-0000-0000-000000000002', 'MECH', 'core', 'Fluid Mechanics & Hydraulic Machinery', 'MECH-202', 'Bernoulli equation, viscous flow, pumps, turbines, boundary layers', 'Waves', 2),
  ('20000000-0000-0000-0000-000000000003', 'MECH', 'core', 'Strength of Materials & Machine Design', 'MECH-301', 'Stress-strain, Mohr circle, bending, torsion, shafts, gears, bearings', 'Shield', 3),
  ('20000000-0000-0000-0000-000000000004', 'MECH', 'core', 'Manufacturing & CAD/CAM', 'MECH-302', 'Casting, welding, machining, CNC programming, GD&T, metrology', 'Settings', 4)
on conflict (id) do nothing;

-- Initial Core Subjects for Civil
insert into public.placement_subjects (id, branch_id, track_id, name, code, description, icon, display_order)
values
  ('30000000-0000-0000-0000-000000000001', 'CIVIL', 'core', 'Structural Analysis & RCC Design', 'CIVIL-201', 'Shear force, bending moment, trusses, limit state design of beams, columns', 'Building', 1),
  ('30000000-0000-0000-0000-000000000002', 'CIVIL', 'core', 'Geotechnical & Soil Mechanics', 'CIVIL-202', 'Soil classification, permeability, shear strength, bearing capacity', 'Layers', 2),
  ('30000000-0000-0000-0000-000000000003', 'CIVIL', 'core', 'Surveying, Transportation & Estimation', 'CIVIL-301', 'Total station, leveling, highway geometric design, estimation and costing', 'Compass', 3)
on conflict (id) do nothing;

-- Initial Core Subjects for EEE
insert into public.placement_subjects (id, branch_id, track_id, name, code, description, icon, display_order)
values
  ('40000000-0000-0000-0000-000000000001', 'EEE', 'core', 'Power Systems & Analysis', 'EEE-201', 'Transmission lines, fault analysis, load flow, protection, stability', 'Zap', 1),
  ('40000000-0000-0000-0000-000000000002', 'EEE', 'core', 'Electrical Machines & Transformers', 'EEE-202', 'DC machines, induction motors, synchronous machines, transformers', 'Cog', 2),
  ('40000000-0000-0000-0000-000000000003', 'EEE', 'core', 'Control Systems & Power Electronics', 'EEE-301', 'Transfer functions, root locus, Bode plot, converters, inverters, motor drives', 'Sliders', 3)
on conflict (id) do nothing;

-- Initial Core Subjects for Chemical
insert into public.placement_subjects (id, branch_id, track_id, name, code, description, icon, display_order)
values
  ('50000000-0000-0000-0000-000000000001', 'CHEM', 'core', 'Chemical Process Calculations', 'CHEM-201', 'Material and energy balances, recycle, bypass, combustion', 'Percent', 1),
  ('50000000-0000-0000-0000-000000000002', 'CHEM', 'core', 'Heat & Mass Transfer Operations', 'CHEM-202', 'Distillation, absorption, heat exchangers, evaporators, diffusion', 'Thermometer', 2),
  ('50000000-0000-0000-0000-000000000003', 'CHEM', 'core', 'Chemical Reaction Engineering', 'CHEM-301', 'Kinetics, batch and flow reactors, design of CSTR and PFR, catalysis', 'TestTube', 3)
on conflict (id) do nothing;

-- Software Track Subjects (UNIVERSAL FOR EVERY BRANCH)
insert into public.placement_subjects (id, branch_id, track_id, name, code, description, icon, display_order)
values
  ('60000000-0000-0000-0000-000000000001', null, 'software', 'Programming Fundamentals (Java/Python/C++)', 'CS-101', 'Variables, control flow, functions, memory, pointers/references, standard libraries', 'Code2', 1),
  ('60000000-0000-0000-0000-000000000002', null, 'software', 'Data Structures & Algorithms (Beginner to Advanced)', 'CS-201', 'Arrays, strings, linked lists, stacks, queues, trees, graphs, hashing, DP', 'Binary', 2),
  ('60000000-0000-0000-0000-000000000003', null, 'software', 'Object Oriented Programming (OOP)', 'CS-202', 'Classes, encapsulation, inheritance, polymorphism, abstraction, design patterns', 'Box', 3),
  ('60000000-0000-0000-0000-000000000004', null, 'software', 'Database Management Systems & SQL', 'CS-203', 'Relational design, normalization, ACID, transactions, indexing, complex SQL queries', 'Database', 4),
  ('60000000-0000-0000-0000-000000000005', null, 'software', 'Operating Systems & Computer Networks', 'CS-301', 'Processes, threads, synchronization, deadlocks, paging, TCP/IP, DNS, HTTP, sockets', 'Network', 5),
  ('60000000-0000-0000-0000-000000000006', null, 'software', 'System Design & Modern Software Architecture', 'CS-401', 'Scalability, microservices, caching, load balancing, message queues, API design', 'Workflow', 6)
on conflict (id) do nothing;

-- Aptitude & Reasoning Subjects
insert into public.placement_subjects (id, branch_id, track_id, name, code, description, icon, display_order)
values
  ('70000000-0000-0000-0000-000000000001', null, 'aptitude', 'Quantitative Aptitude', 'APT-101', 'Percentages, profit & loss, time & work, speed & distance, permutations, probability', 'Calculator', 1),
  ('70000000-0000-0000-0000-000000000002', null, 'aptitude', 'Logical & Analytical Reasoning', 'APT-102', 'Syllogisms, blood relations, seating arrangements, coding-decoding, series, puzzles', 'Puzzle', 2),
  ('70000000-0000-0000-0000-000000000003', null, 'aptitude', 'Verbal Ability & Professional Communication', 'APT-103', 'Reading comprehension, error spotting, sentence completion, vocabulary, idioms', 'MessageSquare', 3)
on conflict (id) do nothing;

-- Sample Topics
insert into public.placement_topics (id, subject_id, name, description, learning_content, display_order)
values
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Combinational Logic & Minimization', 'K-maps, multiplexers, decoders, encoders, parity generators', 'Minimization formulas, Karnaugh Maps up to 5 variables, Hazard identification.', 1),
  ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Sequential Circuits & Timing Analysis', 'Flip-flops, registers, counters, setup time (Tsu) and hold time (Th)', 'Setup violation condition: Tclk >= Tcq + Tcomb + Tsu. Hold violation condition: Tcq + Tcomb >= Th.', 2),
  ('61000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 'Arrays & Two-Pointer Technique', 'Prefix sums, sliding window, two-pointer search', 'Time complexity O(N), space complexity O(1). Essential for string & array problems.', 1),
  ('61000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 'Binary Trees & Traversals', 'Inorder, Preorder, Postorder, Level order, BST validation', 'Depth-first search (DFS) with stack/recursion; Breadth-first search (BFS) with queue.', 2),
  ('61000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000004', 'SQL Indexing & Normalization', 'B-Tree indexes, 1NF to BCNF, joins, query optimization', 'Indexes speed up reads but add overhead to writes. Avoid SELECT * in high-throughput endpoints.', 1)
on conflict (id) do nothing;

-- Verified Sample Questions (Representative across Core ECE, Software, Aptitude, Coding, Interview)
insert into public.placement_questions (
  id, title, question_text, question_type, branch_id, track_id, subject_id, topic_id,
  difficulty, options, correct_answer, explanation, marks, negative_marks, coding_template, tags, status
) values
  (
    '90000000-0000-0000-0000-000000000001',
    'Setup and Hold Time Violation Fix',
    'In a synchronous digital design, a timing report flags a setup time violation on a data path between two flip-flops. Which of the following is the most appropriate architectural fix?',
    'mcq_single',
    'ECE',
    'core',
    '10000000-0000-0000-0000-000000000001',
    '11000000-0000-0000-0000-000000000002',
    'intermediate',
    '[
      {"id": "a", "text": "Decrease the clock period.", "is_correct": false},
      {"id": "b", "text": "Insert pipeline registers along the combinational logic path.", "is_correct": true, "explanation": "Pipelining divides the long combinational delay, reducing the arrival time at the receiving flip-flop."},
      {"id": "c", "text": "Insert delay buffers into the data line.", "is_correct": false},
      {"id": "d", "text": "Increase the supply voltage without limit.", "is_correct": false}
    ]'::jsonb,
    'b',
    'Setup time requires Tclk >= Tcq + Tcomb + Tsu. Inserting a pipeline register cuts Tcomb into smaller intervals, meeting the setup constraint.',
    2.0, 0.5, null,
    array['VLSI', 'Digital Design', 'STA', 'Timing Analysis'],
    'published'
  ),
  (
    '90000000-0000-0000-0000-000000000002',
    'Two Sum Problem — Optimal Lookup',
    'Write a function `twoSum(nums, target)` that returns the 0-based indices of two numbers that add up to `target`. Assume exactly one solution exists.',
    'coding',
    null,
    'software',
    '60000000-0000-0000-0000-000000000002',
    '61000000-0000-0000-0000-000000000001',
    'beginner',
    '[]'::jsonb,
    '',
    'Using a hash table maps each complement target - nums[i] to its index in O(N) time and O(N) space.',
    5.0, 0.0,
    '{
      "languages": ["python", "javascript", "java", "cpp"],
      "starter_code": {
        "python": "def twoSum(nums, target):\n    # Return [i, j]\n    seen = {}\n    for i, n in enumerate(nums):\n        diff = target - n\n        if diff in seen:\n            return [seen[diff], i]\n        seen[n] = i\n    return []",
        "javascript": "function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const diff = target - nums[i];\n        if (map.has(diff)) return [map.get(diff), i];\n        map.set(nums[i], i);\n    }\n    return [];\n}"
      },
      "test_cases": [
        {"input": "[2, 7, 11, 15], target = 9", "expected_output": "[0, 1]", "is_hidden": false},
        {"input": "[3, 2, 4], target = 6", "expected_output": "[1, 2]", "is_hidden": false},
        {"input": "[3, 3], target = 6", "expected_output": "[0, 1]", "is_hidden": true}
      ]
    }'::jsonb,
    array['DSA', 'Arrays', 'Hash Map', 'LeetCode-Easy'],
    'published'
  ),
  (
    '90000000-0000-0000-0000-000000000003',
    'Work and Time Equivalence',
    'Worker A completes a machining task in 8 hours. Worker B completes the same task in 12 hours. If both workers collaborate simultaneously, how many hours will they require?',
    'numerical',
    null,
    'aptitude',
    '70000000-0000-0000-0000-000000000001',
    null,
    'intermediate',
    '[]'::jsonb,
    '4.8',
    'Rate of A = 1/8 per hour. Rate of B = 1/12 per hour. Combined rate = 1/8 + 1/12 = 5/24. Time required = 24/5 = 4.8 hours.',
    1.0, 0.25, null,
    array['Aptitude', 'Time and Work', 'Quantitative'],
    'published'
  ),
  (
    '90000000-0000-0000-0000-000000000004',
    'ACID Transactions & Dirty Reads',
    'Which SQL transaction isolation level is the lowest level that guarantees the prevention of "Dirty Reads"?',
    'mcq_single',
    null,
    'software',
    '60000000-0000-0000-0000-000000000004',
    '61000000-0000-0000-0000-000000000003',
    'intermediate',
    '[
      {"id": "a", "text": "Read Uncommitted", "is_correct": false},
      {"id": "b", "text": "Read Committed", "is_correct": true, "explanation": "Read Committed prevents transactions from reading uncommitted data written by concurrent transactions."},
      {"id": "c", "text": "Repeatable Read", "is_correct": false},
      {"id": "d", "text": "Serializable", "is_correct": false}
    ]'::jsonb,
    'b',
    'Read Committed guarantees that any data read was committed at the moment it is read. Read Uncommitted allows dirty reads.',
    1.0, 0.25, null,
    array['DBMS', 'SQL', 'Transactions', 'ACID'],
    'published'
  ),
  (
    '90000000-0000-0000-0000-000000000005',
    'Technical Interview: Virtual Functions in C++',
    'How does C++ implement dynamic polymorphism via virtual functions, and what is the memory/runtime cost of vtables?',
    'interview',
    null,
    'software',
    '60000000-0000-0000-0000-000000000003',
    null,
    'advanced',
    '[]'::jsonb,
    '',
    'Each class containing virtual functions has a compiler-generated virtual table (vtable) containing function pointers. Each instance holds a hidden vptr pointing to this table. Invocation involves one pointer dereference (minor overhead).',
    3.0, 0.0, null,
    array['Interview', 'OOP', 'C++', 'Polymorphism'],
    'published'
  )
on conflict (id) do nothing;

-- Sample Assessment
insert into public.placement_assessments (
  id, title, description, track_id, branch_id, duration_minutes, total_marks, passing_percentage,
  negative_marking, randomize_questions, feedback_release, eligible_branches, target_batches, status
) values (
  'a0000000-0000-0000-0000-000000000001',
  'Campus Technical Readiness Assessment — Round 1',
  'Multi-track benchmark test testing Core Engineering, Programming Fundamentals, Database Principles, and Quantitative Aptitude.',
  'software',
  null,
  45,
  10.0,
  50.0,
  true,
  false,
  'immediate',
  array['ALL'],
  array['ALL'],
  'published'
) on conflict (id) do nothing;

-- Map Questions to Assessment
insert into public.placement_assessment_questions (assessment_id, question_id, order_index, marks, negative_marks)
values
  ('a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 1, 2.0, 0.5),
  ('a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000004', 2, 1.0, 0.25),
  ('a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000003', 3, 1.0, 0.25),
  ('a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002', 4, 5.0, 0.0)
on conflict (assessment_id, question_id) do nothing;

-- Sample Company Kit
insert into public.placement_company_kits (
  company_name, logo_label, industry, recruitment_pattern, eligibility_criteria,
  interview_stages, frequently_asked_topics, sample_questions
) values (
  'Tata Consultancy Services (TCS)',
  'TCS',
  'Information Technology & Consulting',
  'Online Cognitive & Technical Assessment (NQT) -> Technical Interview -> Managerial & HR Interview.',
  'B.E/B.Tech from all branches. Minimum 60% or 6.0 CGPA throughout 10th, 12th and Engineering. Maximum 1 active backlog permitted at test time.',
  array['Online Cognitive & Tech Test', 'Technical Round', 'HR & Managerial Round'],
  array['Numerical Ability', 'Verbal Ability', 'C Programming MCQs', 'Arrays and Strings', 'DBMS Joins', 'OOP Concepts'],
  '[
    {"question": "Explain the difference between call by value and call by reference in C/C++.", "stage": "Technical"},
    {"question": "How do you reverse a singly linked list in-place?", "stage": "Technical"},
    {"question": "Describe a project conflict you experienced and how you resolved it.", "stage": "HR"}
  ]'::jsonb
),
(
  'Texas Instruments',
  'TI',
  'Semiconductor & Embedded Electronics',
  'Online Technical Test (Analog & Digital Circuits) -> Technical Round 1 -> Technical Round 2 -> HR.',
  'B.E/B.Tech in ECE, EEE, Instrumentation. Minimum 7.0 CGPA, no active backlogs.',
  array['Analog & Digital Online Test', 'Deep Technical Round 1', 'Architecture & System Round 2', 'HR Fitment'],
  array['CMOS Inverters', 'Op-Amp Circuits', 'Setup and Hold Time Analysis', 'Verilog FSMs', 'ARM Microcontrollers', 'RC Filters'],
  '[
    {"question": "Draw the small-signal equivalent circuit of a common-source amplifier and calculate its voltage gain.", "stage": "Technical"},
    {"question": "What is metastability in flip-flops and how do multi-stage synchronizers resolve it?", "stage": "Technical"}
  ]'::jsonb
) on conflict (company_name) do nothing;
