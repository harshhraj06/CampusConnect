# Product Requirements Document (PRD)
## CampusConnect Pro — Unified Higher-Education Student Success Platform

---

### Document Information
- **Product Name**: CampusConnect Pro
- **Status**: Approved Baseline Specification
- **Version**: 1.0.0 (Production Core)
- **Target Audience**: AI Engineering Agents, Product Managers, Full-Stack Developers, QA Engineers, Campus Administrators

---

## 1. Executive Summary & Problem Definition

### 1.1 The Problem
Higher education institutions (especially affiliated engineering and technical colleges) face extreme operational fragmentation across multiple disconnected systems:
1. **Siloed Legacy ERPs**: Systems like Contineo/VTU-SIS hold marks and raw attendance, but lack modern mobile-friendly interfaces, real-time push alerts, and predictive shortage warnings.
2. **Informal and Insecure Communication**: Critical placement drives, academic circulars, and departmental updates are broadcast through fragmented, unverified WhatsApp/Telegram groups, causing students to miss application deadlines and exam notices.
3. **Inefficient Placement Management**: Placement Cells manage multi-tier recruitment pipelines, student eligibility checks (CGPA/active backlogs), and resume collections using messy Google Forms, spreadsheets, and manual emails.
4. **Disjointed Academic & Campus Services**: Course materials (notes, PYQs, lab manuals), grievance redressing (Seva Kendra), timetable adjustments, and student ID verification lack a centralized, authenticated home.
5. **Fabricated & Unreliable Data in Prototypes**: Previous demo iterations of campus portals relied on mock static data, creating security risks and false assumptions regarding student records.

### 1.2 Value Proposition
**CampusConnect Pro** is an all-in-one, enterprise-grade, role-aware digital campus ecosystem built on authenticated, real-time database infrastructure. It bridges the gap between official college administrative data (marks, attendance, fees) and day-to-day student success workflows (placement applications, resume creation, assignment tracking, verified circulars, and campus collaboration).

### 1.3 Target Personas
| Persona | Primary Goal | Key Pain Points |
| :--- | :--- | :--- |
| **Student** | Stay eligible for placements, track attendance above 75%, manage assignments, and apply to campus recruitment drives. | Missing drive deadlines, unexpected attendance shortages, dispersed study materials. |
| **Faculty Member** | Track lecture syllabus progress, post coursework/assignments, log attendance, and manage class coverage/swaps. | Excessive administrative paperwork, lack of real-time student submission tracking. |
| **Placement Cell Officer** | Post placement drives with branch/CGPA eligibility, review applications, update hiring stages, and export candidate rosters. | Manual spreadsheet reconciliation, unverifiable student eligibility, duplicate applications. |
| **Department Coordinator / Admin** | Broadcast verified official circulars, handle student grievances (Seva Kendra), verify ID cards, and supervise timetable schedules. | Unverified rumors spreading on social apps, slow resolution of student campus grievances. |

---

## 2. Core User Journeys & User Stories

### Journey 1: Student Placement Discovery to Offer Acceptance
- **Story**: *As an eligible final-year engineering student, I want to filter verified placement drives matching my branch and CGPA, submit my vetted resume with one click, and track my stage from assessment to interview, so that I never miss an on-campus career opportunity.*
- **Step-by-Step Flow**:
  1. Student logs in via authenticated Supabase session.
  2. Navigates to **Placements** module. System calculates eligibility match based on student's registered CGPA, department (`ECE`), and graduation year (`2027`).
  3. Student opens drive details, reviews rounds, compensation, and criteria.
  4. Clicks "Apply". System creates a record in `placement_applications` with initial status `Applied`.
  5. Placement Cell reviews applicant profile, advances status to `Shortlisted` -> `Assessment` -> `Interview` -> `Offered`.
  6. Student receives live status feedback on their personal application tracker.

### Journey 2: Student Academic Attendance & Shortage Mitigation
- **Story**: *As a student subject to university mandatory attendance rules (minimum 75%), I want to view my current attendance percentage per subject and calculate how many consecutive classes I must attend to clear the threshold, so that I avoid NSAR (Not Satisfied Attendance Requirement) detention.*
- **Step-by-Step Flow**:
  1. Student navigates to **Attendance**.
  2. System queries live `attendance_records` and any synced records from `college_attendance`.
  3. UI displays subject-by-subject percentage dials with color-coded safety indicators (Green > 85%, Amber 75-85%, Red < 75%).
  4. Predictive calculator automatically computes: `Required Classes = ceil((0.75 * Total - Attended) / 0.25)`.

### Journey 3: Placement Cell Drive Creation and Pipeline Management
- **Story**: *As a Placement Officer, I want to create a new recruitment drive specifying company details, CTC, minimum CGPA, eligible branches, and deadlines, and export applicant rosters in CSV format for corporate recruiters.*
- **Step-by-Step Flow**:
  1. Authenticated Placement Cell admin opens the **Placement Operations Dashboard**.
  2. Fills the drive creation modal (Company, CTC, Work Mode, CGPA cutoff, Rounds, Deadline).
  3. System inserts the drive into `placement_drives` with author ID.
  4. Once applications arrive, admin opens the drive roster, filters by status, updates applicants to `Shortlisted`, and clicks "Export CSV" to produce a verified applicant roster.

### Journey 4: Faculty Coursework & Syllabus Tracking
- **Story**: *As a faculty professor, I want to record syllabus coverage against the academic calendar and publish assignments with hard due dates, so that students stay aligned with VTU exam timelines.*
- **Step-by-Step Flow**:
  1. Faculty opens **Faculty Workspace** -> **Syllabus Smart Planner**.
  2. Selects assigned subject, marks completed teaching modules, and generates an exportable syllabus report.
  3. Switches to **Assignments**, posts a new problem set with `due_at` timestamp and target department.
  4. Enrolled students receive notifications and submit their repository or cloud document links before the deadline.

---

## 3. Roles and Permissions Matrix

CampusConnect Pro strictly enforces role-based access control (RBAC) both at the UI layer and via PostgreSQL Row-Level Security (RLS) policies.

| Capability / Resource | Student | Faculty | Placement Cell | Coordinator / Volunteer | Main Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| View Campus Directory (Safe Fields) | Read Only | Read Only | Read Only | Read Only | Full |
| Read Official Announcements | Scoped | All | All | All | All |
| Publish / Pin Announcements | No | Yes (Dept/All) | Yes (Placement) | Yes | Yes |
| View Course Assignments | Enrolled | Author/Dept | Author/Dept | Read Only | Full |
| Post New Assignment | No | Yes | Yes | No | Yes |
| Submit Assignment Work | Yes (Own) | No | No | No | No |
| View Attendance Records | Own Only | Dept Classes | Dept/All | Read Only | Full |
| Update / Record Attendance | No | Yes | Yes | No | Yes |
| View Placement Drives | Read (All) | Read (All) | Full Management | Read Only | Full |
| Create / Edit Placement Drives | No | No | Yes | No | Yes |
| Submit Placement Application | Yes (Own) | No | No | No | No |
| Update Application Stage Pipeline | No | No | Yes | No | Yes |
| Upload & Manage Private Documents | Own Only | Own Only | Read Permitted | Own Only | Full |
| Elevate User Roles (Admin Panel) | No | No | Yes (Staff) | No | Yes |
| Trigger RNSIT Sync Endpoint | Own Token | No | No | No | Service Key |

---

## 4. Comprehensive Features & Functional Requirements

### 4.1 Authentication & Session Management
- **FR-AUTH-1**: Native email/password authentication backed by Supabase Auth with secure JWT bearer tokens.
- **FR-AUTH-2**: Auto-provisioning of baseline `Student` profile via Postgres trigger `on_auth_user_created` upon signup.
- **FR-AUTH-3**: Administrative role elevation (`admin_set_profile_role`) strictly limited to authorized Placement Cell / Main Admin accounts.
- **FR-AUTH-4**: Password recovery and password reset workflow with production URL redirection.
- **FR-AUTH-5**: Client session refresh and silent token rotation handling.

### 4.2 Placement Hub & Recruitment Engine
- **FR-PLC-1 (Drive Board)**: Displays real-time recruitment drives from `placement_drives` ordered by active deadline.
- **FR-PLC-2 (Eligibility Engine)**: Automatic calculation of match percentage considering student CGPA, department whitelist, and graduation batch.
- **FR-PLC-3 (Application Tracker)**: Real-time tracking of candidate status (`Applied`, `Under Review`, `Shortlisted`, `Assessment`, `Interview`, `On Hold`, `Offered`, `Accepted`, `Rejected`).
- **FR-PLC-4 (Saved Placements)**: Bookmarking opportunities to `saved_placements` for offline review.
- **FR-PLC-5 (Resume Studio)**: In-app resume builder populating authenticated student credentials, skills, academic history, and projects with one-click ATS score grading and PDF export.
- **FR-PLC-6 (Applicant Roster Export)**: Placement Cell CSV generation containing candidate USN, name, email, CGPA, branch, and current stage.

### 4.3 Academics, Attendance & ERP Integration
- **FR-ACAD-1 (Live Attendance Dials)**: Real-time calculation of subject-wise attendance percentages with VTU 75% boundary warnings and safe-miss class calculators.
- **FR-ACAD-2 (Assessment Marks & Results)**: Internal assessment (IA-1, IA-2, IA-3) scores, semester SGPA/CGPA history, and grade distribution display.
- **FR-ACAD-3 (RNSIT Contineo Sync Boundary)**: Secure server-side endpoint (`POST /api/rnsit/sync`) accepting verified session tokens to sync attendance, internal marks, semester results, and fee payment statuses without persisting student date-of-birth (DOB) or raw credentials in the browser.
- **FR-ACAD-4 (Syllabus Smart Planner)**: Interactive curriculum progress tracking allowing faculty to map lesson plans, track unit completion percentages, and export signed PDF syllabus audits.

### 4.4 Coursework & Learning Resources
- **FR-LRN-1 (Course Assignments)**: Tabulated coursework with strict submission deadlines, assignment category indicators (`Academic`, `Project`, `Placement`), and submission URL attachments.
- **FR-LRN-2 (Repository)**: Categorized learning material library (`Video`, `PYQ`, `PDF`, `Notes`, `Lab Manual`, `Important Questions`) with staff verification badge (`is_verified`).

### 4.5 Campus Communities & Networking
- **FR-COMM-1 (Directory)**: Safe campus networking directory exposing only professional public fields (name, department, graduation year, skills, bio) while masking private contact numbers, USN, and documents.
- **FR-COMM-2 (Connections)**: Peer connection requests with `pending`, `accepted`, `rejected`, and `blocked` state machines.
- **FR-COMM-3 (Groups & Messaging)**: Role-scoped discussion channels with membership tracking and real-time message exchange governed by RLS.

### 4.6 Campus Administration & Seva Kendra
- **FR-SEVA-1 (Grievance Ticketing)**: Student ticket submission with category assignment, escalation routing, and digital resolution gate pass generation.
- **FR-SEVA-2 (College ID Scanner)**: In-browser camera QR/barcode scanner utilizing HTML5-QRCode to validate student credentials for campus library, exam halls, and event gates.
- **FR-SEVA-3 (Admin Governance)**: User role elevation console, audit logging of critical administrative operations, and security scan status.

---

## 5. Non-Functional Requirements (NFRs)

### 5.1 Security & Data Protection
- **NFR-SEC-1**: Every database table must have Row-Level Security (RLS) enabled. Public `anon` access is revoked by default.
- **NFR-SEC-2**: Zero hard-coded credentials. All secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RNSIT_CONNECTOR_TOKEN`, AI keys) must reside strictly in server environment variables.
- **NFR-SEC-3**: Student private documents (resumes, marksheets, ID proofs) must be stored in private Supabase Storage buckets (`campus-documents`) and served exclusively via short-lived signed URLs.
- **NFR-SEC-4**: API routes must enforce authentication, role whitelisting (`requireRole`), request payload size caps (1MB max), and in-memory rate limiting.

### 5.2 Performance & Responsiveness
- **NFR-PERF-1**: Core dashboard Initial Server Render < 1.2s on standard 4G network conditions.
- **NFR-PERF-2**: Live attendance and placement filter interactions must execute in < 50ms without UI layout shift.
- **NFR-PERF-3**: Database queries for lists must leverage indexed foreign keys and timestamps (`created_at desc`, `student_id`, `deadline`).

### 5.3 Reliability & Offline Capabilities
- **NFR-REL-1**: Graceful degradation when external systems (e.g., RNSIT connector or AI endpoints) fail; student cached local academic data remains readable.
- **NFR-REL-2**: Empty State Discipline: The UI must never generate fake/fabricated records when data is absent. Clean, actionable empty states with guidance messages must be rendered.

### 5.4 Usability & Accessibility
- **NFR-A11Y-1**: Semantic HTML structure (`main`, `nav`, `section`, `h1`-`h4`) with WCAG 2.1 AA compliant contrast ratios.
- **NFR-A11Y-2**: Full keyboard navigation support for modals, dropdowns, and interactive data tables with visible focus rings.

---

## 6. Screen & Page Inventory

| Route / View Slug | View Title | Permitted Roles | Primary Modules & Components |
| :--- | :--- | :--- | :--- |
| `/` | Landing / Public Overview | Public / All | Hero, feature overview, recruiter highlights, authenticated redirect |
| `/[...slug]` (Dynamic Shell) | Dynamic Workspace Shell | Authenticated | Navigation sidebar, universal header, dynamic module loader |
| `?view=Announcements` | Verified Notice Board | All Roles | Broadcast notices, pinned alerts, audience filter, authoring modal |
| `?view=Assignments` | Coursework & Submissions | All Roles | Assignment cards, deadline timer, submission dialog, review panel |
| `?view=Attendance` | Attendance & Shortage Hub | All Roles | Subject dials, 75% target calculator, shortage warnings, faculty entry |
| `?view=Applications` | Placement Drive & Tracker | Student, Placement Cell | Drive catalog, eligibility badge, application pipeline, CSV exporter |
| `?view=Learning` | Learning Resource Library | All Roles | PYQ repository, video lectures, notes finder, verification toggle |
| `?view=Groups` | Campus Communities | All Roles | Group explorer, membership manager, message chat thread |
| `?view=Marketplace` | Peer-to-Peer Marketplace | All Roles | Student listings (books, components), listing creator, contact modal |
| `?view=Notes & Tasks` | Personal Workspace | All Roles | Private task checklist, scratchpad notes, local offline cache |
| `?view=My Branch` | Department Showcase | All Roles | Branch achievements, faculty roster, top rankers, branch events |
| `?view=Profile` | Student Profile & Vault | All Roles | Academic details, USN, skill tags, resume builder, private document vault |
| `?view=Admin` | Role Governance & Logs | Placement Cell, Admin | User role elevation, access logs, system health checks |
| `?view=Analytics` | Outcome & Progress Metrics | All Roles | Student GPA trajectory, branch placement statistics, drive trends |
| `/auth` | Authentication Portal | Public | Sign in, registration, password recovery |
| `/campus-seva-kendra` | Seva Kendra Helpdesk | All Roles | Grievance tickets, resolution status, digital resolution pass |
| `/college-id-scanner` | Digital ID Verification | Staff / Volunteers | Barcode/QR camera scanner, student verification badge |

---

## 7. External Integrations & Boundaries

```
+-----------------------------------------------------------------------+
|                           CampusConnect Pro                           |
+-----------------------------------------------------------------------+
       |                        |                      |
       v                        v                      v
+------------------+   +-------------------+   +-----------------------+
|  Supabase Cloud  |   |   RNSIT Contineo  |   |    AI Engine / LLM    |
|  - Auth (JWT)    |   |   Connector API   |   |    Multi-Provider     |
|  - Postgres RLS  |   |   (POST /sync)    |   |  - Academic Guidance  |
|  - Private S3    |   |  - Attendance     |   |  - Career Context     |
|    Storage       |   |  - Internal Marks |   |  - Failover Handler   |
|                  |   |  - Semester SGPA  |   |                       |
+------------------+   +-------------------+   +-----------------------+
```

1. **Supabase PostgreSQL & Auth**: Identity management, encrypted credential storage, automated profile triggers, and database-level authorization.
2. **Supabase Storage (`campus-documents`)**: Encrypted document bucket enforcing folder-level user UID isolation.
3. **RNSIT / College ERP Connector (`POST /api/rnsit/sync`)**: Stateless server-side gateway that ingests external academic records and normalizes them into `college_attendance`, `college_marks`, and `college_results`.
4. **AI Context Engine (`lib/ai/`)**: Career interview prep, syllabus questions, and resume critique with automatic provider failover.

---

## 8. MVP Scope vs. Out-of-Scope

### 8.1 In-Scope for Core Production Release
- Complete role-based authentication and profile provisioning.
- Live placement drive listings, application tracking pipeline, and applicant CSV export.
- Subject-wise attendance tracking with VTU 75% shortage alert formulas.
- Verified announcements with role/department audience targeting.
- Assignment publishing, deadline tracking, and student URL submissions.
- Private document vault in Supabase Storage with signed download URLs.
- Campus networking directory with privacy-preserving public projection.
- Server-side RNSIT Contineo sync endpoint.
- Seva Kendra grievance submission and resolution tracking.

### 8.2 Out-of-Scope (Deferred to Post-MVP)
- Payment gateway integration for college tuition fee settlement (read-only fee ledger provided).
- Real-time automated proctoring for live coding examinations.
- Biometric hardware driver integration (replaced with camera-based QR/Barcode ID scanning).
- Native iOS/Android app store binaries (Progressive Web App / mobile responsive web architecture is standard).

---

## 9. Assumptions & Decisions Requiring Approval

### Assumptions
1. **Department Whitelist**: Default academic batch assumes engineering streams (ECE, CSE, ISE, MECH, CIVIL, AIML, AIDS) with standard 4-year graduation batches (e.g., 2027).
2. **Staff Role Bootstrap**: The very first Placement Cell administrator must be elevated directly in the Supabase SQL editor using `admin_set_profile_role` or a manual SQL update, after which subsequent staff can be managed through the UI.
3. **Contineo Credentials Policy**: Student date-of-birth (DOB) and Contineo credentials must never be written to database columns or browser storage; authentication tokens are strictly ephemeral.

### Decisions Requiring Product Owner Approval
- **[DECISION-REQ-01]**: Should students with active backlogs be completely blocked from applying to placement drives, or permitted to submit applications with a visible "Backlog Warning" tag for Placement Cell discretion?
- **[DECISION-REQ-02]**: What is the definitive retention window for archived placement applications and student resume files in the Supabase Storage bucket (e.g., 1 academic cycle vs. 4 years)?

---

## 10. Success Criteria & KPIs

- **Zero Fabricated Data**: 100% of user data, applications, and announcements displayed in production must be backed by live database records.
- **Placement Operation Efficiency**: 80% reduction in time required by Placement Cell to compile verified candidate eligibility rosters compared to manual spreadsheet workflows.
- **Attendance Transparency**: > 95% of active students checking their attendance status before semester examination cutoffs to prevent detention.
- **Security Compliance**: Zero unauthorized reads across profile documents, RLS bypasses, or client-side secret exposures in automated security audits (`npm run security:check`).
