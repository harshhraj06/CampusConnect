"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../lib/supabase";
import { formatDisplayDate } from "@/lib/utils";
import "./student-directory.css";

type Student = {
  id: string;
  name: string;
  usn: string;
  campusUid: string;
  department: string;
  semester: string;
  section: string;
  phone: string;
  dateOfBirth: string;
};

type DirectoryFilters = {
  semesters: string[];
  departments: string[];
  sections: string[];
};

const emptyFilters: DirectoryFilters = {
  semesters: [],
  departments: [],
  sections: [],
};

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadBlob(content: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function StudentDirectory() {
  const [students, setStudents] = useState<Student[]>([]);
  const [availableFilters, setAvailableFilters] =
    useState<DirectoryFilters>(emptyFilters);
  const [semester, setSemester] = useState("");
  const [department, setDepartment] = useState("");
  const [section, setSection] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const client = getSupabaseClient();
      const { data } = client
        ? await client.auth.getSession()
        : { data: { session: null } };

      const token = data.session?.access_token;
      if (!token) {
        setStudents([]);
        setError("Your session has expired. Sign in again.");
        return;
      }

      const params = new URLSearchParams();
      if (semester) params.set("semester", semester);
      if (department) params.set("department", department);
      if (section) params.set("section", section);
      if (search.trim()) params.set("search", search.trim());

      const response = await fetch(
        `/api/student-directory?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      const result: { error?: string; students?: Student[]; filters?: typeof emptyFilters } = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to load student directory.");
      }

      const serverStudents = result.students || [];
      const mergedStudents = serverStudents.map((st) => {
        if (typeof window !== "undefined") {
          const cachedDob = localStorage.getItem(`cc_student_dob_${st.id}`);
          if (cachedDob) {
            return { ...st, dateOfBirth: cachedDob };
          }
        }
        return st;
      });

      setStudents(mergedStudents);
      setAvailableFilters(result.filters || emptyFilters);
    } catch (cause) {
      setStudents([]);
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load student directory."
      );
    } finally {
      setLoading(false);
    }
  }, [semester, department, section, search]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  // Listen for real-time DOB updates from profile editing
  useEffect(() => {
    const handleDobUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ studentId: string; dob: string }>;
      if (customEvent.detail?.studentId && customEvent.detail?.dob) {
        setStudents((prev) =>
          prev.map((student) =>
            student.id === customEvent.detail.studentId
              ? { ...student, dateOfBirth: customEvent.detail.dob }
              : student
          )
        );
      }
    };

    window.addEventListener("cc_student_dob_updated", handleDobUpdate);
    return () => {
      window.removeEventListener("cc_student_dob_updated", handleDobUpdate);
    };
  }, []);

  const columns: { key: keyof Student; label: string }[] = [
    { key: "name", label: "Student name" },
    { key: "usn", label: "USN" },
    { key: "campusUid", label: "CC ID" },
    { key: "department", label: "Department" },
    { key: "semester", label: "Semester" },
    { key: "section", label: "Section" },
    { key: "phone", label: "Phone" },
    { key: "dateOfBirth", label: "Date of birth" },
  ];

  const exportRows = students.map((student) =>
    Object.fromEntries(
      columns.map(({ key, label }) => [label, student[key] || ""])
    )
  );

  async function exportExcel() {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
      XLSX.writeFile(workbook, "campusconnect-students.xlsx");
    } catch {
      setError("Excel export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  function exportCsv() {
    const header = columns.map(({ label }) => csvCell(label)).join(",");
    const rows = students.map((student) =>
      columns
        .map(({ key }) => csvCell(student[key]))
        .join(",")
    );

    downloadBlob(
      [header, ...rows].join("\r\n"),
      "text/csv;charset=utf-8;",
      "campusconnect-students.csv"
    );
  }

  function exportPdf() {
    // Opens a standalone, print-ready document; choose “Save as PDF”.
    const printWindow = window.open("", "_blank", "popup,width=1100,height=800");
    if (!printWindow) {
      setError("Allow pop-ups to print or save the PDF.");
      return;
    }

    const escapeHtml = (value: unknown) =>
      String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] || character);

    const tableHeader = columns
      .map(({ label }) => `<th>${escapeHtml(label)}</th>`)
      .join("");

    const tableRows = students
      .map(
        (student) =>
          `<tr>${columns
            .map(
              ({ key }) =>
                `<td>${escapeHtml(student[key])}</td>`
            )
            .join("")}</tr>`
      )
      .join("");

    printWindow.document.write(`<!doctype html>
      <html><head><meta charset="utf-8">
      <title>CampusConnect Student Directory</title>
      <style>
        body{font:12px Arial,sans-serif;padding:20px;color:#172033}
        h1{font-size:20px}p{color:#475569}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #cbd5e1;padding:6px;text-align:left;overflow-wrap:anywhere}
        th{background:#eef2f7}
        @media print{body{padding:0}tr{break-inside:avoid}}
      </style></head><body>
      <h1>CampusConnect — Student Directory</h1>
      <p>${students.length} authorized records · Exported ${escapeHtml(new Date().toLocaleString())}</p>
      <table><thead><tr>${tableHeader}</tr></thead>
      <tbody>${tableRows}</tbody></table>
      <script>window.onload=()=>window.print()<\/script>
      </body></html>`);
    printWindow.document.close();
  }

  const controlStyle: React.CSSProperties = {
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "var(--card, #fff)",
    color: "inherit",
    minWidth: 140,
    maxWidth: "100%",
  };

  const buttonStyle: React.CSSProperties = {
    ...controlStyle,
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <section
      className="student-directory"
      style={{
        padding: "clamp(16px, 3vw, 28px)",
        color: "var(--foreground, inherit)",
      }}
    >
      <header style={{ marginBottom: 22 }}>
        <p style={{ margin: "0 0 6px", opacity: 0.7, fontSize: 12 }}>
          CAMPUSCONNECT · ACADEMIC RECORDS
        </p>
        <h1 style={{ margin: "0 0 8px", fontSize: "clamp(24px, 3vw, 32px)" }}>
          Student Directory
        </h1>
        <p style={{ margin: 0, opacity: 0.75 }}>
          Find students and export the records you are authorized to access.
        </p>
      </header>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 18,
          alignItems: "center",
        }}
      >
        <input
          aria-label="Search students"
          placeholder="Search name, USN or CC ID"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ ...controlStyle, flex: "1 1 220px" }}
        />

        <select
          aria-label="Filter by semester"
          value={semester}
          onChange={(event) => setSemester(event.target.value)}
          style={controlStyle}
        >
          <option value="">All semesters</option>
          {availableFilters.semesters.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>

        <select
          aria-label="Filter by department"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
          style={controlStyle}
        >
          <option value="">All departments</option>
          {availableFilters.departments.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>

        <select
          aria-label="Filter by section"
          value={section}
          onChange={(event) => setSection(event.target.value)}
          style={controlStyle}
        >
          <option value="">All sections</option>
          {availableFilters.sections.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>

        <button type="button" onClick={exportCsv} style={buttonStyle} disabled={loading}>
          Export CSV
        </button>
        <button type="button" onClick={() => void exportExcel()} style={buttonStyle} disabled={loading || exporting}>
          {exporting ? "Preparing…" : "Export Excel"}
        </button>
        <button type="button" onClick={exportPdf} style={buttonStyle} disabled={loading}>
          Print / Save PDF
        </button>
      </div>

      <div
        style={{
          padding: "12px 14px",
          border: "1px solid var(--border, #dbe2ea)",
          borderRadius: 10,
          marginBottom: 14,
        }}
      >
        <strong>{loading ? "Loading…" : `${students.length} students`}</strong>
        <span style={{ opacity: 0.7 }}> · Verified contact numbers and institutional academic records.</span>
      </div>

      {error && (
        <p role="alert" style={{ color: "#b91c1c", marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div style={{ overflowX: "auto", border: "1px solid var(--border, #dbe2ea)", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
          <thead>
            <tr>
              {columns.map(({ key, label }) => (
                <th
                  key={key}
                  scope="col"
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    background: "var(--muted, #f1f5f9)",
                    borderBottom: "1px solid var(--border, #dbe2ea)",
                    whiteSpace: "nowrap",
                    fontSize: 13,
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && !error && students.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ padding: 28, textAlign: "center", opacity: 0.7 }}>
                  No students match these filters or are available in your authorized batches.
                </td>
              </tr>
            )}
            {students.map((student) => (
              <tr key={student.id}>
                {columns.map(({ key }) => (
                  <td
                    key={key}
                    style={{
                      padding: "12px 14px",
                      borderBottom: "1px solid var(--border, #e2e8f0)",
                      fontSize: 14,
                    }}
                  >
                    {key === "dateOfBirth" && student.dateOfBirth ? (
                      <div>
                        <b>{formatDisplayDate(student.dateOfBirth)}</b>
                        <small
                          style={{
                            display: "block",
                            color: "var(--muted-foreground, #64748b)",
                            fontSize: 11,
                            marginTop: 2,
                          }}
                        >
                          {student.dateOfBirth}
                        </small>
                      </div>
                    ) : (
                      student[key] || "—"
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, opacity: 0.65, marginTop: 14 }}>
        Date of birth and contact details are institutional academic records available to authorized Main Admins and assigned Faculty. Exports contain all verified fields displayed in this table.
      </p>
    </section>
  );
}
