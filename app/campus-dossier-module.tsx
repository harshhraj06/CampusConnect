"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Document, Page, Text, View, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import { getSupabaseClient } from "../lib/supabase";
import "./campus-dossier-module.css";

interface ProfileCandidate {
  id: string;
  full_name: string;
  email?: string | null;
  role: string;
  department?: string | null;
  campus_uid?: string | null;
  usn?: string | null;
  employee_id?: string | null;
  account_status?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  semester?: number | null;
}

interface StudentResult {
  id: string;
  semester: number;
  academic_year?: string | null;
  sgpa?: number | null;
  cgpa?: number | null;
  grade?: string | null;
  credits_earned?: number | null;
  credits_registered?: number | null;
  result_status?: string | null;
  published_at?: string | null;
}

interface ResultSubject {
  id: string;
  result_id?: string | null;
  subject_code: string;
  subject_name: string;
  credits?: number | null;
  grade?: string | null;
  grade_points?: number | null;
  total_marks?: number | null;
  result_status?: string | null;
}

interface CollegeMark {
  id: string;
  subject_code?: string | null;
  subject_name?: string | null;
  semester?: number | null;
  assessment?: string | null;
  marks?: number | null;
  max_marks?: number | null;
}

interface CollegeAttendance {
  id: string;
  subject_code?: string | null;
  subject_name?: string | null;
  semester?: number | null;
  attended: number;
  total: number;
}

interface TeachingAllocation {
  id: string;
  allocation_type: string;
  subgroup?: string | null;
  weekly_hours: number;
  is_primary?: boolean;
  status: string;
  attendance_batches?: {
    id: string;
    batch_name: string;
    section: string;
    department: string;
    semester: string;
  } | null;
  attendance_batch_subjects?: {
    id: string;
    subject_name: string;
    subject_code: string;
    credits: number;
    subject_type: string;
  } | null;
}

interface FacultyWorkload {
  total_allocations: number;
  theory_hours: number;
  lab_hours: number;
  tutorial_hours: number;
  project_hours: number;
  mentoring_hours: number;
  total_weekly_hours: number;
  sessions_conducted_count: number;
}

interface ConductedSession {
  id: string;
  subject: string;
  attendance_date: string;
  period_name?: string | null;
  topic?: string | null;
  status: string;
}

interface TimetableSlot {
  id: string;
  day_of_week?: string | null;
  period_order?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
  subject_name?: string | null;
  subject_code?: string | null;
  class_type?: string | null;
}

function compressAndEncodeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read image file"));
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Invalid image format"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}


const dossierPdfStyles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 36, paddingHorizontal: 34, fontFamily: "Helvetica", fontSize: 9, color: "#172238" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: "#173b70", paddingBottom: 12, marginBottom: 14 },
  logo: { width: 48, height: 48, objectFit: "contain" },
  institution: { flexGrow: 1, marginHorizontal: 10, textAlign: "center" },
  college: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#173b70" },
  subtitle: { fontSize: 7, color: "#58677c", marginTop: 4, lineHeight: 1.4 },
  report: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#a65c14", marginTop: 6 },
  meta: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", backgroundColor: "#f1f5f9", padding: 8, marginBottom: 12, fontSize: 7, color: "#475569" },
  identity: { flexDirection: "row", gap: 14, padding: 12, borderWidth: 1, borderColor: "#d7e0ea", borderRadius: 5, marginBottom: 12 },
  portrait: { width: 76, height: 92, objectFit: "cover", borderWidth: 1, borderColor: "#cbd5e1" },
  details: { flexGrow: 1 },
  name: { fontSize: 17, fontFamily: "Helvetica-Bold", color: "#172238", marginBottom: 5 },
  muted: { fontSize: 8, color: "#526176", marginBottom: 4 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  metric: { width: "31%", padding: 7, backgroundColor: "#f1f5f9", borderRadius: 3 },
  metricLabel: { fontSize: 6.5, color: "#64748b", marginBottom: 4 },
  metricValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#173b70" },
  section: { marginTop: 10 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#173b70", paddingBottom: 5, marginBottom: 6, borderBottomWidth: 0.8, borderBottomColor: "#cbd5e1" },
  row: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.4, borderBottomColor: "#e2e8f0" },
  cell: { flex: 1, paddingRight: 5, fontSize: 7.5, lineHeight: 1.3 },
  tableHead: { flexDirection: "row", backgroundColor: "#eaf0f7", paddingVertical: 6, paddingHorizontal: 3 },
  tableHeadText: { flex: 1, paddingRight: 5, fontSize: 7, fontFamily: "Helvetica-Bold", color: "#173b70" },
  footer: { position: "absolute", bottom: 15, left: 34, right: 34, borderTopWidth: 0.6, borderTopColor: "#cbd5e1", paddingTop: 6, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#64748b" },
  approvals: { marginTop: 22, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#cbd5e1" },
  approvalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  approvalBlock: { width: "32%", alignItems: "center", paddingHorizontal: 3 },
  approvalRole: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#173b70", textAlign: "center", lineHeight: 1.3 },
  approvalOrg: { fontSize: 7, color: "#526176", textAlign: "center", marginTop: 3, lineHeight: 1.3 },
  approvalSignLine: { width: "90%", marginTop: 24, borderTopWidth: 0.8, borderTopColor: "#64748b", paddingTop: 4, fontSize: 6.5, color: "#64748b", textAlign: "center" },
  seal: { width: 54, height: 54, borderWidth: 1.4, borderColor: "#173b70", borderRadius: 27, alignItems: "center", justifyContent: "center", padding: 4, marginBottom: 5 },
  sealText: { fontSize: 6, fontFamily: "Helvetica-Bold", color: "#173b70", textAlign: "center", lineHeight: 1.25 },
  adminApproval: { alignItems: "center", marginTop: 13, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: "#e2e8f0" },
  adminRole: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#173b70", textAlign: "center" },
  adminOrg: { fontSize: 7, color: "#526176", textAlign: "center", marginTop: 3 },
  adminSignLine: { width: 180, marginTop: 18, borderTopWidth: 0.8, borderTopColor: "#64748b", paddingTop: 4, fontSize: 6.5, color: "#64748b", textAlign: "center" },
  signature: { marginTop: 20, flexDirection: "row", justifyContent: "space-between" },
  signatureLine: { width: 150, borderTopWidth: 0.8, borderTopColor: "#64748b", paddingTop: 5, fontSize: 7, color: "#475569" },
});

function DossierPdfDocument({ profile, isStudent, results, subjects, attendance, marks, allocations, workload, sessions, timetable, overallCgpa, totalCredits, attendancePct, totalAttended, totalHeld }: {
  profile: ProfileCandidate; isStudent: boolean; results: StudentResult[]; subjects: ResultSubject[];
  attendance: CollegeAttendance[]; marks: CollegeMark[]; allocations: TeachingAllocation[];
  workload: FacultyWorkload | null; sessions: ConductedSession[]; timetable: TimetableSlot[];
  overallCgpa: string; totalCredits: number; attendancePct: number; totalAttended: number; totalHeld: number;
}) {
  const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const fmt = (v: unknown) => v === null || v === undefined || v === "" ? "—" : String(v);
  const heading = isStudent ? "STUDENT ACADEMIC DOSSIER" : "FACULTY & STAFF DOSSIER";
  const metrics = isStudent
    ? [["Current semester", `Semester ${fmt(profile.semester)}`], ["Cumulative CGPA", overallCgpa], ["Credits earned", String(totalCredits)], ["Attendance", attendancePct < 0 ? "No records" : `${attendancePct}%`], ["Classes attended", String(totalAttended)], ["Classes held", String(totalHeld)]]
    : [["Employee ID", fmt(profile.employee_id)], ["Weekly hours", `${workload?.total_weekly_hours ?? 0} hrs`], ["Teaching allocations", String(allocations.length)], ["Sessions conducted", String(workload?.sessions_conducted_count ?? 0)]];
  return (
    <Document title={`${profile.full_name} — CampusConnect Dossier`} author="CampusConnect · RNS Institute of Technology" subject={heading}>
      <Page size="A4" style={dossierPdfStyles.page} wrap>
        <View style={dossierPdfStyles.header} fixed>
          <Image src="/rnsit-logo.png" style={dossierPdfStyles.logo} />
          <View style={dossierPdfStyles.institution}>
            <Text style={dossierPdfStyles.college}>R.N.S. INSTITUTE OF TECHNOLOGY</Text>
            <Text style={dossierPdfStyles.subtitle}>Autonomous Institution · Bengaluru, Karnataka</Text>
            <Text style={dossierPdfStyles.report}>{heading}</Text>
          </View>
          <Image src="/campusconnect-logo.png" style={dossierPdfStyles.logo} />
        </View>
        <View style={dossierPdfStyles.meta}>
          <Text>DOCUMENT REF: RNSIT-CC-DOS-{profile.id.slice(0, 8).toUpperCase()}</Text>
          <Text>GENERATED: {date}</Text>
          <Text>CONFIDENTIAL · ADMINISTRATIVE USE</Text>
        </View>
        <View style={dossierPdfStyles.identity} wrap={false}>
          {profile.avatar_url ? <Image src={profile.avatar_url} style={dossierPdfStyles.portrait} /> : <View style={[dossierPdfStyles.portrait, { justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" }]}><Text>{(profile.full_name || "CU").split(" ").map(x => x[0]).slice(0, 2).join("")}</Text></View>}
          <View style={dossierPdfStyles.details}>
            <Text style={dossierPdfStyles.name}>{profile.full_name}</Text>
            <Text style={dossierPdfStyles.muted}>{fmt(profile.role)} · {fmt(profile.department ? `Department of ${profile.department}` : null)}</Text>
            <Text style={dossierPdfStyles.muted}>Campus UID: {fmt(profile.campus_uid)}   Status: {fmt(profile.account_status || "Active")}</Text>
            <Text style={dossierPdfStyles.muted}>Email: {fmt(profile.email)}   Phone: {fmt(profile.phone)}</Text>
            {isStudent ? <Text style={dossierPdfStyles.muted}>USN: {fmt(profile.usn)}   Current semester: {fmt(profile.semester)}</Text> : <Text style={dossierPdfStyles.muted}>Employee ID: {fmt(profile.employee_id)}</Text>}
          </View>
        </View>
        <View style={dossierPdfStyles.metrics}>
          {metrics.map(([label, value]) => <View key={label} style={dossierPdfStyles.metric} wrap={false}><Text style={dossierPdfStyles.metricLabel}>{label.toUpperCase()}</Text><Text style={dossierPdfStyles.metricValue}>{value}</Text></View>)}
        </View>
        {isStudent ? <>
          <View style={dossierPdfStyles.section}>
            <Text style={dossierPdfStyles.sectionTitle}>ACADEMIC RESULTS & SEMESTER HISTORY</Text>
            <View style={dossierPdfStyles.tableHead}><Text style={dossierPdfStyles.tableHeadText}>Semester</Text><Text style={dossierPdfStyles.tableHeadText}>Academic year</Text><Text style={dossierPdfStyles.tableHeadText}>SGPA</Text><Text style={dossierPdfStyles.tableHeadText}>CGPA</Text><Text style={dossierPdfStyles.tableHeadText}>Credits</Text><Text style={dossierPdfStyles.tableHeadText}>Status</Text></View>
            {results.length ? results.map((r, i) => <View key={r.id || i} style={dossierPdfStyles.row} wrap={false}><Text style={dossierPdfStyles.cell}>{r.semester}</Text><Text style={dossierPdfStyles.cell}>{fmt(r.academic_year)}</Text><Text style={dossierPdfStyles.cell}>{fmt(r.sgpa)}</Text><Text style={dossierPdfStyles.cell}>{fmt(r.cgpa)}</Text><Text style={dossierPdfStyles.cell}>{fmt(r.credits_earned)}</Text><Text style={dossierPdfStyles.cell}>{fmt(r.result_status)}</Text></View>) : <Text style={dossierPdfStyles.muted}>No published semester results available.</Text>}
          </View>
          <View style={dossierPdfStyles.section}>
            <Text style={dossierPdfStyles.sectionTitle}>COURSE-WISE ATTENDANCE</Text>
            <View style={dossierPdfStyles.tableHead}><Text style={dossierPdfStyles.tableHeadText}>Subject / code</Text><Text style={dossierPdfStyles.tableHeadText}>Semester</Text><Text style={dossierPdfStyles.tableHeadText}>Attended</Text><Text style={dossierPdfStyles.tableHeadText}>Held</Text><Text style={dossierPdfStyles.tableHeadText}>Attendance</Text></View>
            {attendance.length ? attendance.map((a, i) => <View key={a.id || i} style={dossierPdfStyles.row} wrap={false}><Text style={dossierPdfStyles.cell}>{fmt(a.subject_name || a.subject_code)}</Text><Text style={dossierPdfStyles.cell}>{fmt(a.semester)}</Text><Text style={dossierPdfStyles.cell}>{a.attended}</Text><Text style={dossierPdfStyles.cell}>{a.total}</Text><Text style={dossierPdfStyles.cell}>{a.total > 0 ? `${Math.round(a.attended / a.total * 100)}%` : "—"}</Text></View>) : <Text style={dossierPdfStyles.muted}>No attendance records available.</Text>}
          </View>
          <View style={dossierPdfStyles.section}>
            <Text style={dossierPdfStyles.sectionTitle}>RESULT SUBJECT BREAKDOWN</Text>
            <View style={dossierPdfStyles.tableHead}><Text style={dossierPdfStyles.tableHeadText}>Subject code</Text><Text style={dossierPdfStyles.tableHeadText}>Subject name</Text><Text style={dossierPdfStyles.tableHeadText}>Credits</Text><Text style={dossierPdfStyles.tableHeadText}>Grade</Text><Text style={dossierPdfStyles.tableHeadText}>Marks</Text><Text style={dossierPdfStyles.tableHeadText}>Status</Text></View>
            {subjects.length ? subjects.map((s, i) => <View key={s.id || i} style={dossierPdfStyles.row} wrap={false}><Text style={dossierPdfStyles.cell}>{fmt(s.subject_code)}</Text><Text style={dossierPdfStyles.cell}>{fmt(s.subject_name)}</Text><Text style={dossierPdfStyles.cell}>{fmt(s.credits)}</Text><Text style={dossierPdfStyles.cell}>{fmt(s.grade)}</Text><Text style={dossierPdfStyles.cell}>{fmt(s.total_marks)}</Text><Text style={dossierPdfStyles.cell}>{fmt(s.result_status)}</Text></View>) : <Text style={dossierPdfStyles.muted}>No subject-level results available.</Text>}
          </View>
          <View style={dossierPdfStyles.section}>
            <Text style={dossierPdfStyles.sectionTitle}>INTERNAL ASSESSMENT RECORDS</Text>
            <View style={dossierPdfStyles.tableHead}><Text style={dossierPdfStyles.tableHeadText}>Subject</Text><Text style={dossierPdfStyles.tableHeadText}>Semester</Text><Text style={dossierPdfStyles.tableHeadText}>Assessment</Text><Text style={dossierPdfStyles.tableHeadText}>Marks</Text><Text style={dossierPdfStyles.tableHeadText}>Maximum</Text></View>
            {marks.length ? marks.map((m, i) => <View key={m.id || i} style={dossierPdfStyles.row} wrap={false}><Text style={dossierPdfStyles.cell}>{fmt(m.subject_name || m.subject_code)}</Text><Text style={dossierPdfStyles.cell}>{fmt(m.semester)}</Text><Text style={dossierPdfStyles.cell}>{fmt(m.assessment)}</Text><Text style={dossierPdfStyles.cell}>{fmt(m.marks)}</Text><Text style={dossierPdfStyles.cell}>{fmt(m.max_marks)}</Text></View>) : <Text style={dossierPdfStyles.muted}>No internal assessment records available.</Text>}
          </View>
        </> : <>
          <View style={dossierPdfStyles.section}>
            <Text style={dossierPdfStyles.sectionTitle}>TEACHING ALLOCATION & WORKLOAD</Text>
            <View style={dossierPdfStyles.tableHead}><Text style={dossierPdfStyles.tableHeadText}>Subject</Text><Text style={dossierPdfStyles.tableHeadText}>Allocation</Text><Text style={dossierPdfStyles.tableHeadText}>Type</Text><Text style={dossierPdfStyles.tableHeadText}>Weekly hours</Text><Text style={dossierPdfStyles.tableHeadText}>Status</Text></View>
            {allocations.length ? allocations.map((a, i) => <View key={a.id || i} style={dossierPdfStyles.row} wrap={false}><Text style={dossierPdfStyles.cell}>{fmt(a.attendance_batch_subjects?.subject_name)}</Text><Text style={dossierPdfStyles.cell}>{fmt(a.allocation_type)}</Text><Text style={dossierPdfStyles.cell}>{fmt(a.attendance_batch_subjects?.subject_type)}</Text><Text style={dossierPdfStyles.cell}>{a.weekly_hours}</Text><Text style={dossierPdfStyles.cell}>{fmt(a.status)}</Text></View>) : <Text style={dossierPdfStyles.muted}>No teaching allocations available.</Text>}
          </View>
          <View style={dossierPdfStyles.section}>
            <Text style={dossierPdfStyles.sectionTitle}>RECENT CONDUCTED SESSIONS</Text>
            <View style={dossierPdfStyles.tableHead}><Text style={dossierPdfStyles.tableHeadText}>Date</Text><Text style={dossierPdfStyles.tableHeadText}>Subject</Text><Text style={dossierPdfStyles.tableHeadText}>Period</Text><Text style={dossierPdfStyles.tableHeadText}>Topic</Text><Text style={dossierPdfStyles.tableHeadText}>Status</Text></View>
            {sessions.length ? sessions.map((a, i) => <View key={a.id || i} style={dossierPdfStyles.row} wrap={false}><Text style={dossierPdfStyles.cell}>{a.attendance_date}</Text><Text style={dossierPdfStyles.cell}>{a.subject}</Text><Text style={dossierPdfStyles.cell}>{fmt(a.period_name)}</Text><Text style={dossierPdfStyles.cell}>{fmt(a.topic)}</Text><Text style={dossierPdfStyles.cell}>{a.status}</Text></View>) : <Text style={dossierPdfStyles.muted}>No conducted sessions available.</Text>}
          </View>
          <View style={dossierPdfStyles.section}>
            <Text style={dossierPdfStyles.sectionTitle}>TIMETABLE ENTRIES</Text>
            <View style={dossierPdfStyles.tableHead}><Text style={dossierPdfStyles.tableHeadText}>Day</Text><Text style={dossierPdfStyles.tableHeadText}>Time</Text><Text style={dossierPdfStyles.tableHeadText}>Subject</Text><Text style={dossierPdfStyles.tableHeadText}>Room</Text><Text style={dossierPdfStyles.tableHeadText}>Class type</Text></View>
            {timetable.length ? timetable.map((a, i) => <View key={a.id || i} style={dossierPdfStyles.row} wrap={false}><Text style={dossierPdfStyles.cell}>{fmt(a.day_of_week)}</Text><Text style={dossierPdfStyles.cell}>{fmt(a.start_time)}–{fmt(a.end_time)}</Text><Text style={dossierPdfStyles.cell}>{fmt(a.subject_name)}</Text><Text style={dossierPdfStyles.cell}>{fmt(a.room)}</Text><Text style={dossierPdfStyles.cell}>{fmt(a.class_type)}</Text></View>) : <Text style={dossierPdfStyles.muted}>No timetable entries available.</Text>}
          </View>
        </>}
        <View style={dossierPdfStyles.approvals} wrap={false}>
          <View style={dossierPdfStyles.approvalRow}>
            <View style={dossierPdfStyles.approvalBlock}>
              <Text style={dossierPdfStyles.approvalRole}>Head of Department</Text>
              <Text style={dossierPdfStyles.approvalOrg}>Department of {fmt(profile.department || "ECE")}</Text>
              <Text style={dossierPdfStyles.approvalSignLine}>Signature</Text>
            </View>
            <View style={dossierPdfStyles.approvalBlock}>
              <View style={dossierPdfStyles.seal}>
                <Text style={dossierPdfStyles.sealText}>★ RNSIT ★</Text>
                <Text style={dossierPdfStyles.sealText}>AUTONOMOUS</Text>
                <Text style={dossierPdfStyles.sealText}>BENGALURU</Text>
              </View>
              <Text style={dossierPdfStyles.approvalRole}>Institutional Seal</Text>
              <Text style={dossierPdfStyles.approvalOrg}>Decorative placeholder</Text>
            </View>
            <View style={dossierPdfStyles.approvalBlock}>
              <Text style={dossierPdfStyles.approvalRole}>Dean / Controller of Exams</Text>
              <Text style={dossierPdfStyles.approvalOrg}>RNS Institute of Technology</Text>
              <Text style={dossierPdfStyles.approvalSignLine}>Authorized signature</Text>
            </View>
          </View>
          <View style={dossierPdfStyles.adminApproval}>
            <Text style={dossierPdfStyles.adminRole}>Main Administrator</Text>
            <Text style={dossierPdfStyles.adminOrg}>CampusConnect Core Registry</Text>
            <Text style={dossierPdfStyles.adminSignLine}>Registry authorization</Text>
          </View>
        </View>
        <Text style={{ marginTop: 12, fontSize: 7, color: "#64748b" }}>Administrative record generated from data available in CampusConnect on {date}. Missing information is shown as —. Verify against official institutional records before external use.</Text>
        <View style={dossierPdfStyles.footer} fixed><Text>RNSIT · CampusConnect · Confidential administrative record</Text><Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} /></View>
      </Page>
    </Document>
  );
}

export default function CampusDossierModule() {
  // Search & Candidates
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [candidates, setCandidates] = useState<ProfileCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Active Dossier
  const [dossierLoading, setDossierLoading] = useState(false);
  const [activeProfile, setActiveProfile] = useState<ProfileCandidate | null>(null);
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [resultSubjects, setResultSubjects] = useState<ResultSubject[]>([]);
  const [marks, setMarks] = useState<CollegeMark[]>([]);
  const [attendance, setAttendance] = useState<CollegeAttendance[]>([]);
  const [facultyAllocations, setFacultyAllocations] = useState<TeachingAllocation[]>([]);
  const [facultyWorkload, setFacultyWorkload] = useState<FacultyWorkload | null>(null);
  const [conductedSessions, setConductedSessions] = useState<ConductedSession[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);

  // Form State for Editing
  const [formData, setFormData] = useState({
    full_name: "",
    usn: "",
    campus_uid: "",
    employee_id: "",
    role: "Student",
    department: "",
    semester: "1",
    phone: "",
    account_status: "Active",
    avatar_url: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // View switch: "all" | "profile" | "attendance" | "results" | "workload"
  const [activeSection, setActiveSection] = useState<"all" | "profile" | "attendance" | "results" | "workload">("all");

  // Helper to make authenticated requests
  const apiFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<any> => {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase client is not available.");

    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("Authentication token required. Sign in as Main Admin.");

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.error || `HTTP ${res.status}: Failed request`);
    }
    return body;
  }, []);

  // Search profiles by query
  const searchProfiles = useCallback(async (query: string) => {
    setSearching(true);
    try {
      const q = encodeURIComponent(query.trim());
      const data = await apiFetch(`/api/admin/dossier?q=${q}`);
      setCandidates(data.users || []);
    } catch (err: any) {
      console.error("[Dossier Search]", err);
    } finally {
      setSearching(false);
    }
  }, [apiFetch]);

  // Initial load of recent profiles
  useEffect(() => {
    void searchProfiles("");
  }, [searchProfiles]);

  // Debounced search on query change
  useEffect(() => {
    const handler = setTimeout(() => {
      void searchProfiles(searchQuery);
    }, 280);
    return () => clearTimeout(handler);
  }, [searchQuery, searchProfiles]);

  // Load specific user dossier
  const loadUserDossier = useCallback(async (userId: string) => {
    setSelectedUserId(userId);
    setDossierLoading(true);
    setStatusMessage(null);

    try {
      const data = await apiFetch(`/api/admin/dossier?userId=${userId}`);
      const p: ProfileCandidate = data.profile;
      setActiveProfile(p);

      // Populate edit form
      setFormData({
        full_name: p.full_name || "",
        usn: p.usn || "",
        campus_uid: p.campus_uid || "",
        employee_id: p.employee_id || "",
        role: p.role || "Student",
        department: p.department || "",
        semester: String(p.semester || "1"),
        phone: p.phone || "",
        account_status: p.account_status || "Active",
        avatar_url: p.avatar_url || "",
      });

      // Populate student records
      setStudentResults(data.studentData?.results || []);
      setResultSubjects(data.studentData?.resultSubjects || []);
      setMarks(data.studentData?.marks || []);
      setAttendance(data.studentData?.attendance || []);

      // Populate faculty records
      setFacultyAllocations(data.facultyData?.allocations || []);
      setFacultyWorkload(data.facultyData?.workload || null);
      setConductedSessions(data.facultyData?.conductedSessions || []);
      setTimetableSlots(data.facultyData?.timetableEntries || []);

      // Scroll smoothly to dossier card
      const sheet = document.getElementById("official-dossier-sheet");
      if (sheet) {
        sheet.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to load dossier." });
    } finally {
      setDossierLoading(false);
    }
  }, [apiFetch]);

  // Handle Photo File Upload
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMessage({ type: "error", text: "Please select a valid image file (PNG, JPG, WebP)." });
      return;
    }

    setPhotoUploading(true);
    setStatusMessage(null);
    try {
      const compressedDataUrl = await compressAndEncodeImage(file);
      let finalUrl = compressedDataUrl;

      // Attempt Supabase storage upload if available
      try {
        const client = getSupabaseClient();
        if (client && selectedUserId) {
          const fileExt = file.name.split(".").pop() || "jpg";
          const filePath = `dossier-avatars/${selectedUserId}-${Date.now()}.${fileExt}`;
          const { error: uploadErr } = await client.storage
            .from("profile-media")
            .upload(filePath, file, { cacheControl: "3600", upsert: true, contentType: file.type });
          if (!uploadErr) {
            const { data: pubData } = client.storage.from("profile-media").getPublicUrl(filePath);
            if (pubData?.publicUrl) {
              finalUrl = pubData.publicUrl;
            }
          }
        }
      } catch {
        // Fallback cleanly to compressed Data URL
      }

      setFormData((prev) => ({ ...prev, avatar_url: finalUrl }));
      setStatusMessage({
        type: "success",
        text: "Photograph preview updated. Click 'Update Identity, Photo & USN' to save changes.",
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to process photo." });
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  // Handle Profile Update Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setSavingProfile(true);
    setStatusMessage(null);

    const isStudentRole = formData.role === "Student";

    try {
      const payload: Record<string, any> = {
        userId: selectedUserId,
        full_name: formData.full_name.trim(),
        campus_uid: formData.campus_uid.trim(),
        role: formData.role,
        department: formData.department.trim(),
        phone: formData.phone.trim(),
        account_status: formData.account_status,
        avatar_url: formData.avatar_url.trim(),
      };

      if (isStudentRole) {
        payload.usn = formData.usn.trim();
        payload.semester = Number(formData.semester) || 1;
        payload.employee_id = "";
      } else {
        payload.employee_id = formData.employee_id.trim();
        payload.usn = "";
      }

      const result = await apiFetch("/api/admin/dossier", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setStatusMessage({
        type: "success",
        text: "Identity, Profile Photo & Credentials successfully updated and audited in institutional registry.",
      });

      setActiveProfile(result.user);
      setCandidates((prev) =>
        prev.map((c) => (c.id === result.user.id ? { ...c, ...result.user } : c))
      );
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Could not save profile changes." });
    } finally {
      setSavingProfile(false);
    }
  };

  // Filter candidates locally by role chip
  const filteredCandidates = useMemo(() => {
    if (roleFilter === "all") return candidates;
    if (roleFilter === "student") return candidates.filter(c => c.role === "Student");
    if (roleFilter === "faculty") return candidates.filter(c => ["Faculty", "Coordinator"].includes(c.role));
    if (roleFilter === "admin") return candidates.filter(c => c.role === "Main Admin");
    return candidates;
  }, [candidates, roleFilter]);

  // Overall student GPA stats
  const overallCgpa = useMemo(() => {
    if (!studentResults.length) return "N/A";
    const withCgpa = studentResults.filter(r => r.cgpa && r.cgpa > 0);
    if (withCgpa.length) {
      return withCgpa[withCgpa.length - 1].cgpa?.toFixed(2);
    }
    const withSgpa = studentResults.filter(r => r.sgpa && r.sgpa > 0);
    if (!withSgpa.length) return "N/A";
    const sum = withSgpa.reduce((acc, r) => acc + (r.sgpa || 0), 0);
    return (sum / withSgpa.length).toFixed(2);
  }, [studentResults]);

  const totalCredits = useMemo(() => {
    return studentResults.reduce((acc, r) => acc + (Number(r.credits_earned) || 0), 0);
  }, [studentResults]);

  // Overall attendance metrics
  const overallAttendancePct = useMemo(() => {
    if (!attendance.length) return -1;
    const totalHeld = attendance.reduce((acc, a) => acc + (a.total || 0), 0);
    const totalAtt = attendance.reduce((acc, a) => acc + (a.attended || 0), 0);
    if (!totalHeld) return 0;
    return Math.round((totalAtt / totalHeld) * 100);
  }, [attendance]);

  const totalClassesAttended = useMemo(() => {
    return attendance.reduce((acc, a) => acc + (a.attended || 0), 0);
  }, [attendance]);

  const totalClassesHeld = useMemo(() => {
    return attendance.reduce((acc, a) => acc + (a.total || 0), 0);
  }, [attendance]);

  // Role-based separation of concerns
  const isStudent = (activeProfile?.role || "Student").toLowerCase() === "student";
  const isFaculty = ["faculty", "coordinator", "placement cell"].includes(
    (activeProfile?.role || "").toLowerCase()
  );

  // Dynamic Section Tabs based on candidate role
  const sectionTabs = useMemo(() => {
    if (isStudent) {
      return [
        { id: "all", label: "Complete Student Dossier" },
        { id: "profile", label: "Student Identity & Photo" },
        { id: "attendance", label: `Course Attendance (${attendance.length} Courses)` },
        { id: "results", label: `Academic Results & Transcript (${studentResults.length})` },
      ];
    }
    return [
      { id: "all", label: "Complete Faculty Dossier" },
      { id: "profile", label: "Faculty Profile & Photo" },
      { id: "workload", label: `Faculty Working Hours & Workload (${facultyAllocations.length})` },
    ];
  }, [isStudent, attendance.length, studentResults.length, facultyAllocations.length]);

  // Generate a real, paginated A4 PDF rather than relying on browser print layout.
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const handlePrintDossier = async () => {
    if (!activeProfile || generatingPdf) return;
    setGeneratingPdf(true);
    setStatusMessage(null);
    try {
      // Embed the profile photograph when accessible. A photo failure
      // must not prevent the administrative dossier from being generated.
      const photoUrl = formData.avatar_url || activeProfile.avatar_url || "";
      let pdfAvatarUrl = "";

      if (photoUrl.startsWith("data:image/")) {
        pdfAvatarUrl = photoUrl;
      } else if (photoUrl) {
        try {
          const absolutePhotoUrl = new URL(photoUrl, window.location.origin).href;
          const parsedPhotoUrl = new URL(absolutePhotoUrl);
          let photoRequestUrl = absolutePhotoUrl;

          // Supabase Storage photos are downloaded server-side to avoid browser
          // CORS issues. Other image URLs retain the existing browser-fetch path.
          const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (configuredSupabaseUrl) {
            try {
              const supabaseOrigin = new URL(configuredSupabaseUrl).origin;
              if (
                parsedPhotoUrl.origin === supabaseOrigin &&
                /^\/storage\/v1\/object\/(?:public|sign|authenticated)\/profile-media\//.test(parsedPhotoUrl.pathname)
              ) {
                photoRequestUrl =
                  `/api/admin/dossier/photo?userId=${encodeURIComponent(activeProfile.id)}` +
                  `&url=${encodeURIComponent(absolutePhotoUrl)}`;
              }
            } catch {
              // Keep the original URL; the normal image validation below applies.
            }
          }

          let photoHeaders: HeadersInit | undefined;

          if (photoRequestUrl.startsWith("/api/admin/dossier/photo?")) {
            const supabaseClient = getSupabaseClient();
            if (!supabaseClient) {
              throw new Error("Supabase client is unavailable for photo authentication.");
            }

            const {
              data: { session },
              error: sessionError,
            } = await supabaseClient.auth.getSession();

            if (sessionError || !session?.access_token) {
              throw new Error("No active Supabase access token is available for the photo request.");
            }

            photoHeaders = {
              Authorization: `Bearer ${session.access_token}`,
            };
          }

          const photoResponse = await fetch(photoRequestUrl, {
            headers: photoHeaders,
            credentials: "include",
            cache: "no-store",
          });

          if (!photoResponse.ok) {
            throw new Error(`Photo request returned HTTP ${photoResponse.status}`);
          }

          const photoBlob = await photoResponse.blob();
          if (!photoBlob.type.startsWith("image/")) {
            throw new Error("Photo URL did not return an image");
          }

          // Decode the fetched image in the browser and re-encode it as JPEG.
          // This avoids passing unsupported formats such as WebP to the PDF renderer.
          pdfAvatarUrl = await new Promise<string>((resolve, reject) => {
            const objectUrl = URL.createObjectURL(photoBlob);
            const image = new window.Image();

            image.onload = () => {
              try {
                const canvas = document.createElement("canvas");
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;

                const context = canvas.getContext("2d");
                if (!context || canvas.width < 1 || canvas.height < 1) {
                  throw new Error("Photo has invalid dimensions or cannot be decoded.");
                }

                context.fillStyle = "#ffffff";
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.drawImage(image, 0, 0);

                const jpeg = canvas.toDataURL("image/jpeg", 0.9);
                if (!jpeg.startsWith("data:image/jpeg;base64,")) {
                  throw new Error("Browser could not encode the photo as JPEG.");
                }

                resolve(jpeg);
              } catch (error) {
                reject(error instanceof Error ? error : new Error("Photo conversion failed."));
              } finally {
                URL.revokeObjectURL(objectUrl);
              }
            };

            image.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              reject(new Error(
                `Browser could not decode fetched photo (${photoBlob.type || "unknown MIME type"}).`
              ));
            };

            image.src = objectUrl;
          });
        } catch (photoError) {
          // DossierPdfDocument renders initials when avatar_url is empty.
          console.warn(
            "[CampusConnect dossier] Photo unavailable; generating PDF with initials instead.",
            photoError
          );
        }
      }

      const blob = await pdf(
        <DossierPdfDocument
          profile={{
            ...activeProfile,
            ...formData,
            avatar_url: pdfAvatarUrl,
            semester:
              formData.semester !== "" &&
              Number.isFinite(Number(formData.semester))
                ? Number(formData.semester)
                : activeProfile.semester,
          }}
          isStudent={isStudent}
          results={studentResults}
          subjects={resultSubjects}
          attendance={attendance}
          marks={marks}
          allocations={facultyAllocations}
          workload={facultyWorkload}
          sessions={conductedSessions}
          timetable={timetableSlots}
          overallCgpa={overallCgpa || "N/A"}
          totalCredits={totalCredits}
          attendancePct={overallAttendancePct}
          totalAttended={totalClassesAttended}
          totalHeld={totalClassesHeld}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const safeName = (activeProfile.full_name || "campus-member")
        .normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "campus-member";
      anchor.href = url;
      anchor.download = `CampusConnect-Dossier-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatusMessage({ type: "success", text: "Professional A4 dossier PDF generated and downloaded." });
    } catch (err) {
      console.error("[Dossier PDF]", err);
      setStatusMessage({ type: "error", text: "PDF generation failed. Please check the profile photo URL and try again." });
    } finally {
      setGeneratingPdf(false);
    }
  };

  /* Legacy browser-print flow retained below for reference. */
  const handleLegacyPrintDossier = () => {
    const prev = activeSection;
    setActiveSection("all");

    setTimeout(() => {
      const sheet = document.getElementById("official-dossier-sheet");
      if (!sheet) {
        window.print();
        return;
      }

      // Create isolated host directly on body to purge any exterior document flow
      let printHost = document.getElementById("cc-dossier-print-host");
      if (!printHost) {
        printHost = document.createElement("div");
        printHost.id = "cc-dossier-print-host";
        document.body.appendChild(printHost);
      }
      printHost.innerHTML = "";
      const clone = sheet.cloneNode(true) as HTMLElement;
      clone.id = "official-dossier-sheet-print-clone";
      printHost.appendChild(clone);

      document.documentElement.classList.add("cc-printing-dossier-active");
      document.body.classList.add("cc-printing-dossier-active");

      const cleanup = () => {
        document.documentElement.classList.remove("cc-printing-dossier-active");
        document.body.classList.remove("cc-printing-dossier-active");
        if (printHost && printHost.parentNode) {
          printHost.parentNode.removeChild(printHost);
        }
        if (prev !== "all") {
          setActiveSection(prev);
        }
      };

      window.addEventListener("afterprint", cleanup, { once: true });

      setTimeout(() => {
        window.print();
        setTimeout(cleanup, 1200);
      }, 100);
    }, 120);
  };

  return (
    <div className="dossierRoot">
      {/* --------------------------------------------------------------------
          TOP NAVIGATION & OFFICIAL LOGO HEADER
          -------------------------------------------------------------------- */}
      <div className="dossierTopNav">
        <div className="dossierBrandCluster">
          <div className="dossierBrandLogos">
            <img
              src="/rnsit-logo.png"
              alt="RNSIT Logo"
              className="dossierLogoRnsit"
            />
            <div className="dossierLogoDivider" />
            <img
              src="/campusconnect-logo.png"
              alt="CampusConnect Logo"
              className="dossierLogoCc"
            />
          </div>

          <div className="dossierTopTitles">
            <h2>RNS Institute of Technology · Campus Dossier</h2>
            <p>Institutional Profile Inspection, USN Management, VTU Result History & Faculty Workload</p>
          </div>
        </div>

        <div className="dossierTopActions">
          {activeProfile && (
            <button
              type="button"
              className="dossierPrintBtn"
              onClick={handlePrintDossier}
              title="Download a professionally formatted, paginated A4 PDF"
              disabled={generatingPdf}
            >
              {generatingPdf ? "Generating professional PDF…" : "Download Official Dossier (PDF)"}
            </button>
          )}

          <button
            type="button"
            className="dossierReloadBtn"
            onClick={() => {
              void searchProfiles(searchQuery);
              if (selectedUserId) void loadUserDossier(selectedUserId);
            }}
          >
            ↻ Refresh Data
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------
          SEARCH & LOOKUP ENGINE (CC ID, USN, NAME, EMAIL)
          -------------------------------------------------------------------- */}
      <div className="dossierSearchCard">
        <div className="dossierSearchHeader">
          <h3>
            <span>🔍</span> Find Anyone via CC ID, USN, Name, or Employee ID
          </h3>
          <span className="dossierSearchBadge">
            {filteredCandidates.length} Identified Records
          </span>
        </div>

        <div className="dossierInputWrapper">
          <span className="dossierInputIcon">⌕</span>
          <input
            type="text"
            className="dossierSearchInput"
            placeholder="Type CC ID (e.g. CC-1234), USN (e.g. 1RN21CS001), full name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Quick Filter Chips */}
        <div className="dossierQuickFilters">
          <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginRight: 4 }}>Filter:</span>
          {[
            { id: "all", label: "All Campus Members" },
            { id: "student", label: "Students (USN)" },
            { id: "faculty", label: "Faculty & Staff" },
            { id: "admin", label: "Main Admins" },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`dossierFilterChip ${roleFilter === chip.id ? "active" : ""}`}
              onClick={() => setRoleFilter(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Candidates Grid */}
        {searching ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "#64748b", fontSize: 14 }}>
            Searching institutional registry...
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "#64748b", fontSize: 14 }}>
            No accounts matched "{searchQuery}". Verify the CC ID, USN, or name.
          </div>
        ) : (
          <div className="dossierCandidateGrid">
            {filteredCandidates.map((user) => {
              const isSelected = selectedUserId === user.id;
              const isFac = ["Faculty", "Coordinator"].includes(user.role);
              const initials = (user.full_name || "CU")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("");

              return (
                <div
                  key={user.id}
                  className={`dossierCandidateCard ${isSelected ? "selected" : ""}`}
                  onClick={() => void loadUserDossier(user.id)}
                >
                  <div className="dossierCandidateMeta">
                    <div className={`dossierAvatar ${isFac ? "faculty" : ""}`}>
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name}
                          className="dossierAvatarImg"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="dossierCandidateInfo">
                      <div className="dossierCandidateName" title={user.full_name}>
                        {user.full_name}
                      </div>
                      <div className="dossierCandidateTags">
                        <span
                          className={`dossierRoleBadge ${
                            user.role === "Student"
                              ? "student"
                              : isFac
                              ? "faculty"
                              : user.role === "Main Admin"
                              ? "admin"
                              : "other"
                          }`}
                        >
                          {user.role}
                        </span>
                        {user.usn && <span style={{ fontWeight: 700, color: "#1e293b" }}>{user.usn}</span>}
                        {user.campus_uid && <span>• {user.campus_uid}</span>}
                      </div>
                    </div>
                  </div>

                  <span style={{ fontSize: 13, color: isSelected ? "#173b70" : "#94a3b8", fontWeight: 800 }}>
                    {isSelected ? "● ACTIVE" : "Inspect →"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------
          ACTIVE DOSSIER SHEET (OFFICIAL REPORT & EDITABLE FORM)
          -------------------------------------------------------------------- */}
      {dossierLoading ? (
        <div style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: 60,
          textAlign: "center",
          border: "2px solid #e2e8f0",
          color: "#173b70",
          fontWeight: 700,
        }}>
          Loading official institutional dossier for selected profile...
        </div>
      ) : activeProfile ? (
        <div id="official-dossier-sheet" className="dossierOfficialSheet">
          {/* Institutional Crest Letterhead */}
          <div className="dossierOfficialHeader">
            <img
              src="/rnsit-logo.png"
              alt="RNSIT Crest"
              className="dossierHeaderLogoLeft"
            />

            <div className="dossierHeaderTitleBlock">
              <h1 className="dossierCollegeTitle">R.N.S. INSTITUTE OF TECHNOLOGY</h1>
              <div className="dossierCollegeSubtitle">
                (Autonomous Institution Affiliated to VTU, Belagavi • Approved by AICTE, New Delhi • Accredited by NAAC 'A+')
                <br />
                Dr. Vishnuvardhan Road, Channasandra, R R Nagar Post, Bengaluru – 560 098
              </div>
              <div className="dossierReportSubject">
                {isStudent
                  ? "OFFICIAL ADMINISTRATIVE DOSSIER & CERTIFIED ACADEMIC RECORD"
                  : "OFFICIAL FACULTY DOSSIER & CERTIFIED TEACHING WORKLOAD LEDGER"}
              </div>
            </div>

            <img
              src="/campusconnect-logo.png"
              alt="CampusConnect Crest"
              className="dossierHeaderLogoRight"
            />
          </div>

          {/* Dossier Meta Bar */}
          <div className="dossierMetaBar">
            <div>
              <strong>DOCUMENT REF:</strong> RNSIT-CC-DOS-{activeProfile.id.slice(0, 8).toUpperCase()}
            </div>
            <div>
              <strong>ISSUED BY:</strong> Main Admin Office · Autonomous Governance
            </div>
            <div>
              <strong>TIMESTAMP:</strong> {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>

          {/* Alert Banner */}
          {statusMessage && (
            <div className={`dossierAlert ${statusMessage.type}`}>
              <span>{statusMessage.type === "success" ? "✓" : "⚠"}</span>
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Candidate Certified Identity & Photograph Banner (Print-Ready) */}
          <div className="dossierCandidateIdentityBanner">
            <div className="dossierCandidatePhotoFrame">
              {formData.avatar_url || activeProfile.avatar_url ? (
                <img
                  src={formData.avatar_url || activeProfile.avatar_url || ""}
                  alt={`${activeProfile.full_name} portrait`}
                  className="dossierPassportPhoto"
                />
              ) : (
                <div className="dossierPassportPhotoPlaceholder">
                  <span className="dossierPhotoInitials">
                    {(activeProfile.full_name || "CU")
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span className="dossierNoPhotoLabel">No Photo</span>
                </div>
              )}
              <div className="dossierPhotoSealBadge">OFFICIAL PHOTO</div>
            </div>

            <div className="dossierCandidateDetailsBlock">
              <div className="dossierCandidateTitleRow">
                <div>
                  <h2 className="dossierCandidateNameTitle">{activeProfile.full_name}</h2>
                  <div className="dossierCandidateRoleSub">
                    <span className={`dossierRoleBadge ${isStudent ? "student" : isFaculty ? "faculty" : "admin"}`}>
                      {activeProfile.role}
                    </span>
                    <span className="dossierDeptBadge">
                      {activeProfile.department ? `Department of ${activeProfile.department}` : "General Engineering"}
                    </span>
                    <span className="dossierStatusBadge active">
                      ● Status: {activeProfile.account_status || "Active"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="dossierCandidateIdentifiersGrid">
                {isStudent ? (
                  <>
                    <div className="dossierIdBox highlight">
                      <span className="dossierIdLabel">UNIVERSITY SEAT NUMBER (USN)</span>
                      <span className="dossierIdValue">{activeProfile.usn || formData.usn || "NOT REGISTERED"}</span>
                    </div>
                    <div className="dossierIdBox">
                      <span className="dossierIdLabel">CAMPUS UID (CC ID)</span>
                      <span className="dossierIdValue">{activeProfile.campus_uid || formData.campus_uid || "—"}</span>
                    </div>
                    <div className="dossierIdBox">
                      <span className="dossierIdLabel">CURRENT SEMESTER</span>
                      <span className="dossierIdValue">Semester {formData.semester || activeProfile.semester || "1"}</span>
                    </div>
                    <div className="dossierIdBox">
                      <span className="dossierIdLabel">OVERALL CGPA</span>
                      <span className="dossierIdValue accent">{overallCgpa}</span>
                    </div>
                    <div className="dossierIdBox">
                      <span className="dossierIdLabel">ATTENDANCE COMPLIANCE</span>
                      <span className={`dossierIdValue ${overallAttendancePct >= 75 ? "accent" : overallAttendancePct >= 0 ? "warn" : ""}`}>
                        {overallAttendancePct >= 0 ? `${overallAttendancePct}% (${overallAttendancePct >= 75 ? "Eligible" : "Shortage"})` : "—"}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="dossierIdBox highlight">
                      <span className="dossierIdLabel">FACULTY EMPLOYEE ID</span>
                      <span className="dossierIdValue">{activeProfile.employee_id || formData.employee_id || "NOT ASSIGNED"}</span>
                    </div>
                    <div className="dossierIdBox">
                      <span className="dossierIdLabel">CAMPUS UID (CC ID)</span>
                      <span className="dossierIdValue">{activeProfile.campus_uid || formData.campus_uid || "—"}</span>
                    </div>
                    <div className="dossierIdBox">
                      <span className="dossierIdLabel">WEEKLY TEACHING LOAD</span>
                      <span className="dossierIdValue accent">{facultyWorkload?.total_weekly_hours || 0} hrs/wk</span>
                    </div>
                    <div className="dossierIdBox">
                      <span className="dossierIdLabel">ALLOCATED COURSES</span>
                      <span className="dossierIdValue">{facultyAllocations.length} Active Courses</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Section View Tabs */}
          <div className="dossierQuickFilters" style={{ marginBottom: 20 }}>
            {sectionTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`dossierFilterChip ${activeSection === tab.id ? "active" : ""}`}
                onClick={() => setActiveSection(tab.id as any)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ----------------------------------------------------------------
              SECTION 1: EDITABLE IDENTITY, PHOTO & USN RECORD
              ---------------------------------------------------------------- */}
          {(activeSection === "all" || activeSection === "profile") && (
            <div className="dossierProfileSection">
              <div className="dossierSectionHeader">
                <h4>
                  <span>👤</span> Campus Identity, Photo & Credentials (Admin Authorized)
                </h4>
                <span className={`dossierRoleBadge ${isStudent ? "student" : "faculty"}`}>
                  Status: {activeProfile.account_status || "Active"}
                </span>
              </div>

              <form onSubmit={handleSaveProfile}>
                {/* Photo Upload & Preview Card */}
                <div className="dossierPhotoEditorCard">
                  <div className="dossierPhotoEditorHeader">
                    <div>
                      <strong>Candidate Institutional Photograph (Passport Size)</strong>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                        Photo is certified on VTU transcripts, college certificates, and identity verification cards.
                      </p>
                    </div>
                    {formData.avatar_url && (
                      <button
                        type="button"
                        className="dossierRemovePhotoBtn"
                        onClick={() => setFormData({ ...formData, avatar_url: "" })}
                      >
                        ✕ Remove Photo
                      </button>
                    )}
                  </div>

                  <div className="dossierPhotoEditorBody">
                    <div className="dossierPhotoEditorPreview">
                      {formData.avatar_url ? (
                        <img
                          src={formData.avatar_url}
                          alt="Preview"
                          className="dossierPhotoThumb"
                        />
                      ) : (
                        <div className="dossierPhotoThumbPlaceholder">
                          <span>👤</span>
                          <small>No Photo</small>
                        </div>
                      )}
                    </div>

                    <div className="dossierPhotoEditorInputs">
                      <div className="dossierPhotoUploadRow">
                        <label className="dossierUploadBtn">
                          <span>📷 {photoUploading ? "Processing Photo..." : "Upload New Photo (PNG / JPG)"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            disabled={photoUploading}
                            onChange={handlePhotoFileChange}
                          />
                        </label>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>
                          Auto-formatted to institutional passport photo specs.
                        </span>
                      </div>

                      <div className="dossierField" style={{ marginTop: 10 }}>
                        <label>Or Direct Photo URL / CDN Link</label>
                        <input
                          type="url"
                          className="dossierInput"
                          placeholder="https://example.com/student-photo.jpg"
                          value={formData.avatar_url}
                          onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dossierFormGrid">
                  {/* Full Name */}
                  <div className="dossierField">
                    <label>Full Legal Name</label>
                    <input
                      type="text"
                      className="dossierInput"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>

                  {/* USN (University Seat Number) — Strictly for Students */}
                  {formData.role === "Student" && (
                    <div className="dossierField">
                      <label>University Seat Number (USN) · VTU Mandatory</label>
                      <input
                        type="text"
                        className="dossierInput highlight"
                        placeholder="e.g. 1RN21CS001"
                        value={formData.usn}
                        onChange={(e) => setFormData({ ...formData, usn: e.target.value.toUpperCase() })}
                      />
                    </div>
                  )}

                  {/* Employee ID — Strictly for Faculty & Staff */}
                  {formData.role !== "Student" && (
                    <div className="dossierField">
                      <label>Employee ID (Faculty/Staff)</label>
                      <input
                        type="text"
                        className="dossierInput highlight"
                        placeholder="e.g. EMP-ECE-042"
                        value={formData.employee_id}
                        onChange={(e) => setFormData({ ...formData, employee_id: e.target.value.toUpperCase() })}
                      />
                    </div>
                  )}

                  {/* Campus UID / CC ID */}
                  <div className="dossierField">
                    <label>CampusConnect ID (CC ID)</label>
                    <input
                      type="text"
                      className="dossierInput"
                      placeholder="e.g. CC-STU-2026-001"
                      value={formData.campus_uid}
                      onChange={(e) => setFormData({ ...formData, campus_uid: e.target.value })}
                    />
                  </div>

                  {/* Role */}
                  <div className="dossierField">
                    <label>Institutional Role</label>
                    <select
                      className="dossierInput"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="Student">Student</option>
                      <option value="Faculty">Faculty</option>
                      <option value="Coordinator">Coordinator</option>
                      <option value="Placement Cell">Placement Cell</option>
                      <option value="Volunteer">Volunteer</option>
                      <option value="Main Admin">Main Admin</option>
                    </select>
                  </div>

                  {/* Department */}
                  <div className="dossierField">
                    <label>Department / Branch</label>
                    <input
                      type="text"
                      className="dossierInput"
                      placeholder="e.g. ECE, CSE, ISE, AIML, MECH"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value.toUpperCase() })}
                    />
                  </div>

                  {/* Semester — Strictly for Students */}
                  {formData.role === "Student" && (
                    <div className="dossierField">
                      <label>Current Semester (1-10)</label>
                      <select
                        className="dossierInput"
                        value={formData.semester}
                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                          <option key={s} value={s}>
                            Semester {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Phone */}
                  <div className="dossierField">
                    <label>Registered Phone Number</label>
                    <input
                      type="tel"
                      className="dossierInput"
                      placeholder="e.g. +91 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  {/* Account Status */}
                  <div className="dossierField">
                    <label>Account Lifecycle Status</label>
                    <select
                      className="dossierInput"
                      value={formData.account_status}
                      onChange={(e) => setFormData({ ...formData, account_status: e.target.value })}
                    >
                      <option value="Active">Active (Permitted)</option>
                      <option value="Suspended">Suspended (Restricted)</option>
                      <option value="Pending">Pending Verification</option>
                    </select>
                  </div>
                </div>

                <div className="dossierFormActions">
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    Changes are committed directly with administrative cryptographic audit trail.
                  </span>
                  <button
                    type="submit"
                    className="dossierSaveBtn"
                    disabled={savingProfile || photoUploading}
                  >
                    {savingProfile ? "Committing Updates..." : "💾 Update Identity, Photo & USN →"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ----------------------------------------------------------------
              STUDENT ACADEMIC & ATTENDANCE RECORD (DUAL-PANEL PRINT LAYOUT)
              ---------------------------------------------------------------- */}
          {isStudent && (
            <div className="dossierPrintDualGrid">
              {/* SECTION 2A: STUDENT ATTENDANCE LEDGER */}
              {(activeSection === "all" || activeSection === "attendance") && (
                <div className="dossierAttendanceContainer">
                  <div className="dossierSectionHeader">
                    <h4>
                      <span>📊</span> Course Attendance Ledger
                    </h4>
                    <span
                      className={`dossierAttendanceBadge ${
                        overallAttendancePct >= 75 ? "safe" : overallAttendancePct >= 65 ? "warning" : "danger"
                      }`}
                    >
                      {overallAttendancePct >= 85
                        ? "✓ Safe (≥ 85%)"
                        : overallAttendancePct >= 75
                        ? "✓ Eligible (≥ 75%)"
                        : overallAttendancePct >= 65
                        ? "⚠ Condonable"
                        : overallAttendancePct >= 0
                        ? "✕ Shortage"
                        : "No Attendance"}
                    </span>
                  </div>

                  {/* Attendance KPI Cards (Screen Only) */}
                  <div className="dossierMetricsGrid">
                    <div className="dossierMetricCard">
                      <div
                        className={`dossierMetricValue ${
                          overallAttendancePct >= 75 ? "success" : overallAttendancePct >= 0 ? "danger" : ""
                        }`}
                      >
                        {overallAttendancePct >= 0 ? `${overallAttendancePct}%` : "—"}
                      </div>
                      <div className="dossierMetricLabel">Cumulative Attendance</div>
                    </div>

                    <div className="dossierMetricCard">
                      <div className="dossierMetricValue" style={{ color: "#173b70" }}>
                        {totalClassesAttended} / {totalClassesHeld}
                      </div>
                      <div className="dossierMetricLabel">Attended / Total Held</div>
                    </div>

                    <div className="dossierMetricCard">
                      <div className="dossierMetricValue">{attendance.length}</div>
                      <div className="dossierMetricLabel">Active Courses</div>
                    </div>

                    <div className="dossierMetricCard">
                      <div
                        className="dossierMetricValue"
                        style={{
                          fontSize: 16,
                          marginTop: 6,
                          color: overallAttendancePct >= 75 ? "#15803d" : "#b91c1c",
                        }}
                      >
                        {overallAttendancePct >= 75 ? "Permitted for SEE" : overallAttendancePct >= 0 ? "Under Review" : "—"}
                      </div>
                      <div className="dossierMetricLabel">Hall Ticket Eligibility</div>
                    </div>
                  </div>

                  {/* Course-Wise Attendance Table */}
                  <div className="dossierSemCard">
                    <div className="dossierSemHeader">
                      <div className="dossierSemTitle">Course-Wise Attendance Compliance</div>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        Min. 75% VTU Req.
                      </span>
                    </div>

                    {attendance.length === 0 ? (
                      <div
                        style={{
                          padding: 18,
                          textAlign: "center",
                          color: "#64748b",
                          fontSize: 12,
                        }}
                      >
                        No course-wise attendance entries logged for this student.
                      </div>
                    ) : (
                      <table className="dossierTable">
                        <thead>
                          <tr>
                            <th>Course</th>
                            <th>Title</th>
                            <th>Attd / Held</th>
                            <th>%</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.map((att) => {
                            const pct =
                              att.total && att.total > 0
                                ? Math.round(((att.attended || 0) / att.total) * 100)
                                : 0;
                            const isSafe = pct >= 85;
                            const isEligible = pct >= 75;
                            const isCondonable = pct >= 65;

                            return (
                              <tr key={att.id}>
                                <td>
                                  <strong>{att.subject_code || "—"}</strong>
                                </td>
                                <td>{att.subject_name || att.subject_code || "Course"}</td>
                                <td>
                                  <strong style={{ color: "#173b70" }}>{att.attended || 0}</strong> / {att.total || 0}
                                </td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div className="dossierProgressBar">
                                      <div
                                        className={`dossierProgressFill ${
                                          isEligible ? "safe" : isCondonable ? "warning" : "danger"
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                      />
                                    </div>
                                    <span
                                      style={{
                                        fontWeight: 800,
                                        fontSize: 11,
                                        color: isEligible ? "#15803d" : isCondonable ? "#d97706" : "#b91c1c",
                                      }}
                                    >
                                      {pct}%
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <span
                                    className={`dossierAttendanceBadge ${
                                      isSafe ? "safe" : isEligible ? "eligible" : isCondonable ? "warning" : "danger"
                                    }`}
                                  >
                                    {isSafe
                                      ? "Safe"
                                      : isEligible
                                      ? "Eligible"
                                      : isCondonable
                                      ? "Condonable"
                                      : "Shortage"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {attendance.length > 0 && (
                          <tfoot className="dossierTableFoot">
                            <tr>
                              <td colSpan={2}>
                                <strong>Aggregate Compliance:</strong>
                              </td>
                              <td>
                                <strong style={{ color: "#173b70" }}>
                                  {totalClassesAttended} / {totalClassesHeld}
                                </strong>
                              </td>
                              <td>
                                <strong
                                  style={{
                                    color: overallAttendancePct >= 75 ? "#15803d" : "#b91c1c",
                                  }}
                                >
                                  {overallAttendancePct >= 0 ? `${overallAttendancePct}%` : "—"}
                                </strong>
                              </td>
                              <td>
                                <span
                                  className={`dossierAttendanceBadge ${
                                    overallAttendancePct >= 75 ? "safe" : overallAttendancePct >= 65 ? "warning" : "danger"
                                  }`}
                                >
                                  {overallAttendancePct >= 75 ? "Eligible" : "Shortage"}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 2B: STUDENT RESULT HISTORY & ACADEMIC TRANSCRIPT */}
              {(activeSection === "all" || activeSection === "results") && (
                <div className="dossierResultsContainer">
                  <div className="dossierSectionHeader">
                    <h4>
                      <span>🎓</span> Academic Progression Transcript
                    </h4>
                    <span className="dossierRoleBadge student">
                      CGPA: {overallCgpa}
                    </span>
                  </div>

                  {/* Student Academic Key Performance Metrics (Screen Only) */}
                  <div className="dossierMetricsGrid">
                    <div className="dossierMetricCard">
                      <div className="dossierMetricValue success">{overallCgpa}</div>
                      <div className="dossierMetricLabel">Cumulative GPA (CGPA)</div>
                    </div>
                    <div className="dossierMetricCard">
                      <div className="dossierMetricValue">{totalCredits}</div>
                      <div className="dossierMetricLabel">Credits Earned</div>
                    </div>
                    <div className="dossierMetricCard">
                      <div className="dossierMetricValue">{studentResults.length}</div>
                      <div className="dossierMetricLabel">Published Semesters</div>
                    </div>
                    <div className="dossierMetricCard">
                      <div className="dossierMetricValue">
                        {overallAttendancePct >= 0 ? `${overallAttendancePct}%` : "—"}
                      </div>
                      <div className="dossierMetricLabel">Attendance Standing</div>
                    </div>
                  </div>

                  {/* Semester Progression Ledger Table (Print-Ready Single-Page Summary) */}
                  <div className="dossierSemCard">
                    <div className="dossierSemHeader">
                      <div className="dossierSemTitle">Semester-Wise Grade Progression Ledger</div>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        VTU Autonomous Record
                      </span>
                    </div>

                    {studentResults.length === 0 ? (
                      <div
                        style={{
                          padding: 18,
                          textAlign: "center",
                          color: "#64748b",
                          fontSize: 12,
                        }}
                      >
                        No semester examination records archived for this student.
                      </div>
                    ) : (
                      <table className="dossierTable">
                        <thead>
                          <tr>
                            <th>Semester</th>
                            <th>Session</th>
                            <th>Credits</th>
                            <th>SGPA</th>
                            <th>Result Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentResults.map((r) => (
                            <tr key={r.id}>
                              <td>
                                <strong>Semester {r.semester}</strong>
                              </td>
                              <td>{r.academic_year || "Autonomous"}</td>
                              <td>{r.credits_earned || "—"}</td>
                              <td>
                                <strong style={{ color: "#173b70" }}>{r.sgpa?.toFixed(2) || "—"}</strong>
                              </td>
                              <td>
                                <span
                                  className={`dossierGradeBadge ${
                                    (r.result_status || "").toLowerCase().includes("fail") ? "fail" : "pass"
                                  }`}
                                >
                                  {r.result_status || "Passed"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {studentResults.length > 0 && (
                          <tfoot className="dossierTableFoot">
                            <tr>
                              <td colSpan={2}>
                                <strong>Cumulative Progression:</strong>
                              </td>
                              <td>
                                <strong>{totalCredits} Credits</strong>
                              </td>
                              <td>
                                <strong style={{ color: "#173b70" }}>CGPA: {overallCgpa}</strong>
                              </td>
                              <td>
                                <span className="dossierGradeBadge pass">
                                  {Number(overallCgpa) >= 7.75 ? "Distinction" : Number(overallCgpa) >= 6.75 ? "First Class" : "Compliant"}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    )}
                  </div>

                  {/* Detailed Per-Semester Course Breakdown (Interactive Screen View) */}
                  <div className="dossierDetailedBreakdownCards">
                    {studentResults.map((result) => {
                      const subjs = resultSubjects.filter((s) => s.result_id === result.id);

                      return (
                        <div key={result.id} className="dossierSemCard">
                          <div className="dossierSemHeader">
                            <div className="dossierSemTitle">
                              Semester {result.semester} Detailed Transcript ({result.academic_year || "Autonomous Session"})
                            </div>
                            <div className="dossierSemStats">
                              <span>SGPA: <strong style={{ color: "#15803d" }}>{result.sgpa?.toFixed(2) || "—"}</strong></span>
                              <span>Credits: <strong>{result.credits_earned || "—"} / {result.credits_registered || "—"}</strong></span>
                              <span
                                className={`dossierGradeBadge ${
                                  (result.result_status || "").toLowerCase().includes("fail") ? "fail" : "pass"
                                }`}
                              >
                                {result.result_status || "Passed"}
                              </span>
                            </div>
                          </div>

                          {subjs.length > 0 ? (
                            <table className="dossierTable">
                              <thead>
                                <tr>
                                  <th>Course Code</th>
                                  <th>Course Title</th>
                                  <th>Credits</th>
                                  <th>Grade</th>
                                  <th>Grade Points</th>
                                  <th>Total Marks</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {subjs.map((s) => (
                                  <tr key={s.id}>
                                    <td><strong>{s.subject_code}</strong></td>
                                    <td>{s.subject_name}</td>
                                    <td>{s.credits ?? "—"}</td>
                                    <td><strong style={{ color: "#173b70" }}>{s.grade || "—"}</strong></td>
                                    <td>{s.grade_points ?? "—"}</td>
                                    <td>{s.total_marks ?? "—"}</td>
                                    <td>
                                      <span
                                        className={`dossierGradeBadge ${
                                          (s.result_status || "Pass").toLowerCase().includes("fail") ? "fail" : "pass"
                                        }`}
                                      >
                                        {s.result_status || "Pass"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div style={{ padding: 14, color: "#64748b", fontSize: 12 }}>
                              Aggregated SGPA certified. Individual subject ledger not archived for this semester.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Internal Marks (CIE) if available (Screen Only) */}
                  {marks.length > 0 && (
                    <div className="dossierSemCard dossierCieMarksSection">
                      <div className="dossierSemHeader">
                        <div className="dossierSemTitle">Internal Assessments & Continuous Evaluation (CIE)</div>
                        <span style={{ fontSize: 12, color: "#64748b" }}>{marks.length} Assessment Entries</span>
                      </div>
                      <table className="dossierTable">
                        <thead>
                          <tr>
                            <th>Subject Code</th>
                            <th>Subject Name</th>
                            <th>Semester</th>
                            <th>Assessment</th>
                            <th>Marks Secured</th>
                            <th>Max Marks</th>
                            <th>Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {marks.slice(0, 15).map((m) => {
                            const pct = m.max_marks && m.max_marks > 0 ? Math.round(((m.marks || 0) / m.max_marks) * 100) : 0;
                            return (
                              <tr key={m.id}>
                                <td><strong>{m.subject_code || "—"}</strong></td>
                                <td>{m.subject_name || "—"}</td>
                                <td>Sem {m.semester || "—"}</td>
                                <td>{m.assessment || "CIE"}</td>
                                <td><strong>{m.marks}</strong></td>
                                <td>{m.max_marks}</td>
                                <td>
                                  <span style={{ fontWeight: 700, color: pct >= 60 ? "#15803d" : "#b91c1c" }}>
                                    {pct}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------
              SECTION 3: FACULTY WORKING HOURS & TEACHING WORKLOAD
              (Rendered strictly for Faculty/Staff — Hidden for Students)
              ---------------------------------------------------------------- */}
          {!isStudent && (activeSection === "all" || activeSection === "workload") && (
            <div className="dossierFacultyContainer">
              <div className="dossierSectionHeader">
                <h4>
                  <span>⏱️</span> Faculty Working Hours & Teaching Allocation Ledger
                </h4>
                <span className="dossierRoleBadge faculty">
                  Academic Workload & Timetable Audit
                </span>
              </div>

              {/* Workload Metric Cards */}
              <div className="dossierWorkloadGrid">
                <div className="dossierWorkloadCard">
                  <div className="dossierWorkloadHours" style={{ color: "#173b70" }}>
                    {facultyWorkload?.total_weekly_hours || 0} hrs/wk
                  </div>
                  <div className="dossierWorkloadTitle">Total Weekly Hours</div>
                </div>

                <div className="dossierWorkloadCard">
                  <div className="dossierWorkloadHours">
                    {facultyWorkload?.theory_hours || 0} hrs/wk
                  </div>
                  <div className="dossierWorkloadTitle">Theory Lecture Hours</div>
                </div>

                <div className="dossierWorkloadCard">
                  <div className="dossierWorkloadHours">
                    {facultyWorkload?.lab_hours || 0} hrs/wk
                  </div>
                  <div className="dossierWorkloadTitle">Practical / Lab Hours</div>
                </div>

                <div className="dossierWorkloadCard">
                  <div className="dossierWorkloadHours">
                    {facultyWorkload?.tutorial_hours || 0} hrs/wk
                  </div>
                  <div className="dossierWorkloadTitle">Tutorial & Mentoring</div>
                </div>

                <div className="dossierWorkloadCard">
                  <div className="dossierWorkloadHours">
                    {facultyWorkload?.sessions_conducted_count || 0}
                  </div>
                  <div className="dossierWorkloadTitle">Classes Conducted</div>
                </div>
              </div>

              {/* Teaching Course Allocations Table */}
              <div className="dossierSemCard">
                <div className="dossierSemHeader">
                  <div className="dossierSemTitle">Approved Course Allocations & Teaching Batches</div>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {facultyAllocations.length} Active Courses Allocated
                  </span>
                </div>

                {facultyAllocations.length === 0 ? (
                  <div style={{ padding: 18, textAlign: "center", color: "#64748b", fontSize: 13 }}>
                    No formal teaching allocations logged under this account in the faculty scheduler.
                  </div>
                ) : (
                  <table className="dossierTable">
                    <thead>
                      <tr>
                        <th>Batch / Section</th>
                        <th>Course Code</th>
                        <th>Course Title</th>
                        <th>Type</th>
                        <th>Subgroup</th>
                        <th>Weekly Hours</th>
                        <th>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facultyAllocations.map((alloc) => (
                        <tr key={alloc.id}>
                          <td>
                            <strong>{alloc.attendance_batches?.batch_name || "Batch"}</strong>{" "}
                            (Sec {alloc.attendance_batches?.section || "A"}, Sem {alloc.attendance_batches?.semester || "—"})
                          </td>
                          <td>
                            <strong>{alloc.attendance_batch_subjects?.subject_code || "—"}</strong>
                          </td>
                          <td>{alloc.attendance_batch_subjects?.subject_name || "Subject"}</td>
                          <td>
                            <span className="dossierRoleBadge faculty">{alloc.allocation_type}</span>
                          </td>
                          <td>{alloc.subgroup || "Whole Batch"}</td>
                          <td>
                            <strong>{alloc.weekly_hours} hrs/wk</strong>
                          </td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 700, color: alloc.is_primary ? "#15803d" : "#64748b" }}>
                              {alloc.is_primary ? "Primary Faculty" : "Secondary Faculty"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Timetable Weekly Schedule */}
              {timetableSlots.length > 0 && (
                <div className="dossierSemCard">
                  <div className="dossierSemHeader">
                    <div className="dossierSemTitle">Published Weekly Timetable Sessions</div>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{timetableSlots.length} Weekly Periods</span>
                  </div>
                  <table className="dossierTable">
                    <thead>
                      <tr>
                        <th>Day of Week</th>
                        <th>Period</th>
                        <th>Time Window</th>
                        <th>Course</th>
                        <th>Room / Lab</th>
                        <th>Class Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timetableSlots.map((slot) => (
                        <tr key={slot.id}>
                          <td><strong>{slot.day_of_week || "Monday"}</strong></td>
                          <td>Period {slot.period_order || 1}</td>
                          <td>{slot.start_time || "—"} – {slot.end_time || "—"}</td>
                          <td>{slot.subject_name || slot.subject_code || "Session"}</td>
                          <td><strong>{slot.room || "Classroom"}</strong></td>
                          <td>
                            <span className="dossierRoleBadge other">{slot.class_type || "Lecture"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Conducted Class Sessions History */}
              {conductedSessions.length > 0 && (
                <div className="dossierSemCard">
                  <div className="dossierSemHeader">
                    <div className="dossierSemTitle">Recent Classes Conducted & Session Log</div>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Latest {conductedSessions.length} Sessions</span>
                  </div>
                  <table className="dossierTable">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Course / Subject</th>
                        <th>Period</th>
                        <th>Syllabus Topic Covered</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conductedSessions.slice(0, 10).map((sess) => (
                        <tr key={sess.id}>
                          <td><strong>{sess.attendance_date}</strong></td>
                          <td>{sess.subject}</td>
                          <td>{sess.period_name || "—"}</td>
                          <td>{sess.topic || "Regular Curriculum Delivery"}</td>
                          <td>
                            <span className="dossierGradeBadge pass">{sess.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------
              OFFICIAL CERTIFICATION & SIGNATURE BLOCK (PRINT-READY)
              ---------------------------------------------------------------- */}
          <div className="dossierSignatureBlock">
            <div className="dossierSignatureItem">
              <div className="dossierSignatureLine" />
              <div className="dossierSignatureRole">Head of Department</div>
              <div className="dossierSignatureSub">Department of {formData.department || "Engineering"}</div>
            </div>

            <div className="dossierOfficialSeal">
              <span>★ RNSIT ★</span>
              <span>Autonomous</span>
              <span>Verified Seal</span>
              <span>Bengaluru</span>
            </div>

            <div className="dossierSignatureItem">
              <div className="dossierSignatureLine" />
              <div className="dossierSignatureRole">
                {isStudent ? "Dean / Controller of Exams" : "Principal / Dean Academic"}
              </div>
              <div className="dossierSignatureSub">RNS Institute of Technology</div>
            </div>

            <div className="dossierSignatureItem">
              <div className="dossierSignatureLine" />
              <div className="dossierSignatureRole">Main Administrator</div>
              <div className="dossierSignatureSub">CampusConnect Core Registry</div>
            </div>
          </div>

          <div className="dossierDisclaimer">
            Official Academic & Working Hours Document generated from authenticated CampusConnect records for RNS Institute of Technology.
            Tampering with or unauthorized modification of this document violates institutional governance rules.
            Verification Key: SHA256:{activeProfile.id.replace(/-/g, "").slice(0, 32).toUpperCase()}
          </div>
        </div>
      ) : (
        <div style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: "50px 20px",
          textAlign: "center",
          border: "2px dashed #cbd5e1",
          color: "#64748b",
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <h3 style={{ margin: "0 0 6px", color: "#172033" }}>No Profile Selected for Inspection</h3>
          <p style={{ margin: 0, fontSize: 14 }}>
            Search by CC ID, USN, or Name above and click <strong>"Inspect →"</strong> on any candidate to view their complete official record.
          </p>
        </div>
      )}
    </div>
  );
}
