"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import {
  nextAcademicSemester,
  parseSemesterNumber,
  type EligibilityReason,
} from "@/lib/academic-promotion";
import "./academic-promotion-module.css";

export type Student = {
  student_id: string;
  student_name: string;
  campus_uid: string;
  roll_number: string;
  department: string;
  graduation_year: string;
  batch_id: string;
  batch_name: string;
  section: string;
  batch_department: string;
  academic_year: string;
  semester: string;
  has_result?: boolean;
  already_promoted?: boolean;
  promotion_at?: string | null;
  target_status?: "ok" | "missing" | "ambiguous" | "unknown";
  eligibility?: EligibilityReason;
};

export type Result = {
  batch_id: string;
  student_id: string;
  credits_earned: number | "";
  exam_status: "pass" | "fail" | "pending";
  result_verified: boolean;
  has_result: boolean;
};

export type CreditRule = {
  department: string;
  semester: string;
  total_credits: number;
  minimum_credits: number;
} | null;

export type TargetReady = {
  source_batch_id: string;
  source_batch_name: string;
  department: string;
  section: string;
  status: "ok" | "missing" | "ambiguous";
  target_batch_name: string | null;
};

const PAGE_SIZE = 25;

const STATUS_LABELS: Record<EligibilityReason, { text: string; type: "eligible" | "warning" | "danger" | "neutral" }> = {
  eligible: { text: "Eligible for Promotion", type: "eligible" },
  insufficient_credits: { text: "Insufficient Credits", type: "warning" },
  result_not_verified: { text: "Result Not Verified", type: "warning" },
  exam_failed: { text: "Exam Failed", type: "danger" },
  result_missing: { text: "Result Pending", type: "neutral" },
  already_promoted: { text: "Already Promoted", type: "warning" },
  target_batch_missing: { text: "Target Batch Missing", type: "danger" },
  target_batch_ambiguous: { text: "Target Batch Ambiguous", type: "danger" },
  manual_override: { text: "Admin Override Active", type: "warning" },
  credit_rule_missing: { text: "Credit Rule Unset", type: "danger" },
  credits_exceed_total: { text: "Credits Exceed Total", type: "danger" },
  duplicate_source_membership: { text: "Duplicate Membership", type: "danger" },
};

export default function AcademicPromotionModule() {
  const [semesters, setSemesters] = useState<string[]>([]);
  const [semester, setSemester] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [rule, setRule] = useState<CreditRule>(null);
  const [targets, setTargets] = useState<TargetReady[]>([]);
  const [totalCredits, setTotalCredits] = useState("");
  const [minimumCredits, setMinimumCredits] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [promoteAllEligible, setPromoteAllEligible] = useState(false);
  const [overrideIds, setOverrideIds] = useState<string[]>([]);
  const [overrideReason, setOverrideReason] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [eligibilityFilter, setEligibilityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success" | "info" | "">("");
  const semesterLoadSequence = useRef(0);

  const request = useCallback(async (url: string, init?: RequestInit): Promise<Record<string, any>> => {
    const client = getSupabaseClient();
    const { data } = client
      ? await client.auth.getSession()
      : { data: { session: null } };
    const token = data.session?.access_token;

    if (!token) throw new Error("Your session has expired. Please sign in again.");

    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
    if (!response.ok) throw new Error(payload.error || "Request failed.");
    return payload;
  }, []);

  const loadSemesters = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request("/api/admin/academic-promotion");
      const nextSemesters = (data.semesters || []) as string[];
      setSemesters(nextSemesters);
      setMessage("");
      setMessageType("");
      setSemester(current =>
        current && nextSemesters.includes(current) ? current : (nextSemesters[0] || "")
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load academic semesters.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, [request]);

  const loadSemester = useCallback(async (value: string) => {
    const sequence = ++semesterLoadSequence.current;
    if (!value) {
      setStudents([]);
      setResults({});
      setRule(null);
      setTargets([]);
      setTotalCredits("");
      setMinimumCredits("");
      setSelected([]);
      setPromoteAllEligible(false);
      setOverrideIds([]);
      setOverrideReason("");
      if (semesters.length > 0) setLoading(false);
      return;
    }

    setLoading(true);
    setStudents([]);
    setResults({});
    setRule(null);
    setTargets([]);
    setSelected([]);
    setPromoteAllEligible(false);
    setOverrideIds([]);
    setOverrideReason("");

    try {
      const data = await request(
        `/api/admin/academic-promotion?semester=${encodeURIComponent(value)}`
      );
      if (sequence !== semesterLoadSequence.current) return;
      if (data.complete !== true) {
        throw new Error("Semester roster completeness could not be confirmed. Promotion is blocked until the full dataset loads.");
      }
      const nextStudents = (data.students || []) as Student[];
      const nextResults: Record<string, Result> = {};
      const recorded = new Map<string, Result>(
        ((data.results || []) as Result[]).map(row => [`${row.batch_id}:${row.student_id}`, row] as const)
      );

      for (const student of nextStudents) {
        const key = `${student.batch_id}:${student.student_id}`;
        const existing = recorded.get(key);
        nextResults[key] = existing
          ? {
              batch_id: student.batch_id,
              student_id: student.student_id,
              credits_earned: existing.credits_earned,
              exam_status: existing.exam_status,
              result_verified: existing.result_verified,
              has_result: true,
            }
          : {
              batch_id: student.batch_id,
              student_id: student.student_id,
              credits_earned: "",
              exam_status: "pending",
              result_verified: false,
              has_result: false,
            };
      }

      const nextRule = (data.rule || null) as CreditRule;
      setStudents(nextStudents);
      setResults(nextResults);
      setRule(nextRule);
      setTargets((data.targetReadiness || []) as TargetReady[]);
      setTotalCredits(nextRule ? String(nextRule.total_credits) : "");
      setMinimumCredits(nextRule ? String(nextRule.minimum_credits) : "");
      setPage(1);
    } catch (error) {
      if (sequence !== semesterLoadSequence.current) return;
      setStudents([]);
      setResults({});
      setRule(null);
      setTargets([]);
      setTotalCredits("");
      setMinimumCredits("");
      setSelected([]);
      setPromoteAllEligible(false);
      setOverrideIds([]);
      setOverrideReason("");
      setMessage(error instanceof Error ? error.message : "Could not load semester data.");
      setMessageType("error");
    } finally {
      if (sequence === semesterLoadSequence.current) setLoading(false);
    }
  }, [request, semesters.length]);

  useEffect(() => {
    void loadSemesters();
  }, [loadSemesters]);

  useEffect(() => {
    void loadSemester(semester);
  }, [semester, loadSemester]);

  const nextSemester = nextAcademicSemester(semester);
  const departments = useMemo(
    () => [...new Set(students.map(s => s.batch_department || s.department).filter(Boolean))].sort(),
    [students]
  );
  const sections = useMemo(
    () => [...new Set(students.map(s => s.section).filter(Boolean))].sort(),
    [students]
  );

  const reasonFor = (student: Student): EligibilityReason => {
    if (
      overrideIds.includes(student.student_id) &&
      student.eligibility !== "already_promoted" &&
      student.eligibility !== "duplicate_source_membership" &&
      student.target_status === "ok" &&
      student.eligibility !== "eligible"
    ) {
      return "manual_override";
    }
    return student.eligibility || "result_missing";
  };

  const filtered = students.filter(student => {
    const haystack = `${student.student_name} ${student.campus_uid} ${student.roll_number}`.toLowerCase();
    if (query && !haystack.includes(query.trim().toLowerCase())) return false;
    if (departmentFilter && (student.batch_department || student.department) !== departmentFilter) return false;
    if (sectionFilter && student.section !== sectionFilter) return false;
    if (eligibilityFilter && reasonFor(student) !== eligibilityFilter) return false;
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const eligibleIds = [...new Set(students.filter(s => s.eligibility === "eligible").map(s => s.student_id))];
  const selectedIds = promoteAllEligible ? eligibleIds : selected;
  const requestedStudentIds = new Set([...selectedIds, ...overrideIds]);
  const selectedStudents = students.filter(s => requestedStudentIds.has(s.student_id));
  const eligibleCount = eligibleIds.length;
  const alreadyPromotedCount = students.filter(s => s.already_promoted).length;
  const missingTargets = targets.filter(item => item.status !== "ok");

  const saveRule = async () => {
    const total = Number(totalCredits);
    const minimum = Number(minimumCredits);
    if (!semester || totalCredits.trim() === "" || minimumCredits.trim() === "" || !Number.isFinite(total) || !Number.isFinite(minimum) || total <= 0 || minimum < 0 || minimum > total) {
      setMessage("Enter a valid total credit count and minimum required credits.");
      setMessageType("error");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      await request("/api/admin/academic-promotion", {
        method: "POST",
        body: JSON.stringify({
          action: "set_rule",
          semester,
          total_credits: total,
          minimum_credits: minimum,
        }),
      });
      setRule({ department: "All branches", semester, total_credits: total, minimum_credits: minimum });
      setMessage(`Shared credit requirement saved for ${semester}: Minimum ${minimum} / ${total} total.`);
      setMessageType("success");
      await loadSemester(semester);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save credit requirement.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const saveResult = async (student: Student) => {
    const result = results[`${student.batch_id}:${student.student_id}`];
    const credits = Number(result?.credits_earned);
    if (!rule || result?.credits_earned === "" || !Number.isFinite(credits) || credits < 0 || credits > Number(rule.total_credits)) {
      setMessage("Credits earned must be recorded between zero and total semester credits.");
      setMessageType("error");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await request("/api/admin/academic-promotion", {
        method: "POST",
        body: JSON.stringify({
          action: "save_result",
          batch_id: student.batch_id,
          student_id: student.student_id,
          credits_earned: credits,
          exam_status: result.exam_status,
          result_verified: result.result_verified,
        }),
      });
      setMessage(`Result updated for ${student.student_name}.`);
      setMessageType("success");
      await loadSemester(semester);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save student result.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const openConfirm = () => {
    if (!semester || !rule) return;
    if (!promoteAllEligible && !selectedIds.length && !overrideIds.length) {
      setMessage("Select at least one student or choose “Promote all eligible”.");
      setMessageType("error");
      return;
    }
    if (overrideIds.length && overrideReason.trim().length < 8) {
      setMessage("An admin override requires an explicit reason of at least 8 characters.");
      setMessageType("error");
      return;
    }
    setConfirmOpen(true);
  };

  const promote = async () => {
    setConfirmOpen(false);
    setSaving(true);
    setMessage("");
    try {
      const data = await request("/api/admin/academic-promotion", {
        method: "POST",
        body: JSON.stringify({
          action: "promote_semester",
          semester,
          student_ids: promoteAllEligible ? null : selectedIds,
          note,
          override_student_ids: overrideIds.length ? overrideIds : null,
          override_reason: overrideReason.trim(),
        }),
      });
      const result = data.result || {};
      setMessage(
        `Promotion executed. Successfully promoted: ${result.promoted_count ?? 0}; ` +
        `Blocked: ${result.blocked_count ?? 0}; ` +
        `Skipped (already promoted): ${result.skipped_already_promoted_count ?? 0}.`
      );
      setMessageType(Number(result.promoted_count ?? 0) > 0 || Number(result.blocked_count ?? 0) === 0 ? "success" : "error");
      setOverrideIds([]);
      setOverrideReason("");
      setSelected([]);
      await loadSemester(semester);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Promotion transaction failed.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="academicPromoRoot">
      {/* Metric KPI Banner */}
      <div className="promoKpiGrid">
        <div className="promoKpiCard">
          <span className="promoKpiLabel">Selected Semester</span>
          <span className="promoKpiValue">{semester || "—"}</span>
          <span className="promoKpiNote">Destination: {nextSemester || "Select source"}</span>
        </div>
        <div className="promoKpiCard">
          <span className="promoKpiLabel">Active Students</span>
          <span className="promoKpiValue">{students.length}</span>
          <span className="promoKpiNote">Across {departments.length || 0} departments</span>
        </div>
        <div className="promoKpiCard">
          <span className="promoKpiLabel">Eligible for Promotion</span>
          <span className="promoKpiValue" style={{ color: "#15803d" }}>{eligibleCount}</span>
          <span className="promoKpiNote">{alreadyPromotedCount} already promoted</span>
        </div>
        <div className="promoKpiCard">
          <span className="promoKpiLabel">Target Batch Readiness</span>
          <span className="promoKpiValue" style={{ color: missingTargets.length === 0 ? "#15803d" : "#b91c1c" }}>
            {missingTargets.length === 0 ? "100% Ready" : `${missingTargets.length} Missing`}
          </span>
          <span className="promoKpiNote">{rule ? `Rule: ${rule.minimum_credits}/${rule.total_credits} cr` : "Rule not configured"}</span>
        </div>
      </div>

      {message && (
        <div className={`promoBanner ${messageType}`} role="status">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")} style={{ background: "transparent", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Step 1: Semester Selector */}
      <section className="promoSectionCard">
        <div className="promoHeaderRow">
          <div>
            <span className="promoStepTag">Step 1 · Semester Pathway</span>
            <h3 className="promoTitle">Select Academic Semester</h3>
            <p className="promoSubtitle">Choose the source semester to evaluate student eligibility and promote to the next level.</p>
          </div>
        </div>

        <div className="promoPathway">
          <div className="promoPathwayGroup">
            <label className="promoInputLabel">Current Semester</label>
            <select
              className="promoSelect"
              value={semester}
              onChange={e => setSemester(e.target.value)}
              disabled={loading || saving}
            >
              <option value="">Choose semester…</option>
              {semesters.map(val => (
                <option key={val} value={val}>
                  {parseSemesterNumber(val) ? `Semester ${parseSemesterNumber(val)}` : val}
                </option>
              ))}
            </select>
          </div>

          <div className="promoPathwayArrow">→</div>

          <div className="promoTargetBadge">
            <span className="promoInputLabel">Destination Semester</span>
            <span className="promoTargetName">{nextSemester || "Select source semester first"}</span>
          </div>
        </div>
      </section>

      {/* Step 2: Shared Credit Rule */}
      {semester && (
        <section className="promoSectionCard">
          <div className="promoHeaderRow">
            <div>
              <span className="promoStepTag">Step 2 · Academic Policy</span>
              <h3 className="promoTitle">Shared Credit Requirement</h3>
              <p className="promoSubtitle">Defines total semester credits and minimum threshold. Applies across all departments in {semester}.</p>
            </div>
          </div>

          <div className="promoRuleGrid">
            <div className="promoInputGroup">
              <label className="promoInputLabel">Total Semester Credits</label>
              <input
                type="number"
                min="1"
                step="0.5"
                className="promoInput"
                placeholder="e.g. 24"
                value={totalCredits}
                onChange={e => setTotalCredits(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="promoInputGroup">
              <label className="promoInputLabel">Minimum Credits Required for Promotion</label>
              <input
                type="number"
                min="0"
                step="0.5"
                className="promoInput"
                placeholder="e.g. 20"
                value={minimumCredits}
                onChange={e => setMinimumCredits(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <button
            type="button"
            className="promoBtnPrimary"
            onClick={() => void saveRule()}
            disabled={saving || loading || !totalCredits || minimumCredits === ""}
          >
            {saving ? "Saving Policy…" : "Save Shared Credit Requirement"}
          </button>
        </section>
      )}

      {/* Step 3: Student Roster */}
      {semester && (
        <section className="promoSectionCard">
          <div className="promoHeaderRow">
            <div>
              <span className="promoStepTag">Step 3 · Candidate Roster</span>
              <h3 className="promoTitle">{semester} Students ({filtered.length})</h3>
              <p className="promoSubtitle">Review verified credits and exam results. Select students for mass or individual promotion.</p>
            </div>
          </div>

          <div className="promoFilterRow">
            <input
              type="text"
              className="promoInput"
              placeholder="Search name, roll number, or ID…"
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
            />
            <select className="promoSelect" value={departmentFilter} onChange={e => { setDepartmentFilter(e.target.value); setPage(1); }}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="promoSelect" value={sectionFilter} onChange={e => { setSectionFilter(e.target.value); setPage(1); }}>
              <option value="">All Sections</option>
              {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
            </select>
            <select className="promoSelect" value={eligibilityFilter} onChange={e => { setEligibilityFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([key, info]) => (
                <option key={key} value={key}>{info.text}</option>
              ))}
            </select>
          </div>

          <div className="promoActionToolbar">
            <div className="promoSelectionBadges">
              <span>Selected: <strong>{promoteAllEligible ? `All Eligible (${eligibleCount})` : selectedIds.length}</strong></span>
              {overrideIds.length > 0 && <span style={{ color: "#b45309" }}>· Overrides: <strong>{overrideIds.length}</strong></span>}
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="promoBtnSecondary"
                onClick={() => { setPromoteAllEligible(true); setSelected([]); }}
                disabled={saving || !eligibleCount}
              >
                Select All Eligible ({eligibleCount})
              </button>
              <button
                type="button"
                className="promoBtnSecondary"
                onClick={() => {
                  setPromoteAllEligible(false);
                  const inelig = [...new Set(students.filter(s => s.eligibility && s.eligibility !== "eligible" && !s.already_promoted && s.target_status === "ok").map(s => s.student_id))];
                  setSelected(inelig.slice(0, 500));
                  setOverrideIds([]);
                }}
                disabled={saving}
              >
                Select Ineligible for Override
              </button>
              <button
                type="button"
                className="promoBtnSecondary"
                onClick={() => { setSelected([]); setOverrideIds([]); setPromoteAllEligible(false); }}
                disabled={saving}
              >
                Clear Selection
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="promoTableContainer">
            <table className="promoTable">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: "center" }}>Select</th>
                  <th>Student</th>
                  <th>Branch & Section</th>
                  <th>Credits Earned</th>
                  <th>Exam Status</th>
                  <th>Verified</th>
                  <th>Eligibility</th>
                  <th>Status</th>
                  <th>Override</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(student => {
                  const key = `${student.batch_id}:${student.student_id}`;
                  const result = results[key];
                  const reason = reasonFor(student);
                  const statusInfo = STATUS_LABELS[reason] || { text: reason, type: "neutral" };
                  const isChecked = selectedIds.includes(student.student_id) || overrideIds.includes(student.student_id);

                  return (
                    <tr key={key}>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={saving || promoteAllEligible || student.already_promoted}
                          onChange={e => {
                            const c = e.target.checked;
                            setSelected(prev => c ? [...new Set([...prev, student.student_id])] : prev.filter(id => id !== student.student_id));
                            if (!c) setOverrideIds(prev => prev.filter(id => id !== student.student_id));
                          }}
                        />
                      </td>
                      <td>
                        <strong>{student.student_name}</strong>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{student.campus_uid || student.roll_number || student.student_id.slice(0, 8)}</div>
                      </td>
                      <td>
                        <strong>{student.batch_department || student.department}</strong>
                        <div style={{ fontSize: 11, color: "#64748b" }}>Section {student.section}</div>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="promoTableInput"
                          placeholder="0"
                          value={result?.credits_earned === "" || result?.credits_earned == null ? "" : result.credits_earned}
                          disabled={!rule || saving}
                          onChange={e => {
                            const val = e.target.value === "" ? "" : Number(e.target.value);
                            setResults(prev => ({
                              ...prev,
                              [key]: {
                                ...result,
                                batch_id: student.batch_id,
                                student_id: student.student_id,
                                credits_earned: val,
                                exam_status: result?.exam_status || "pending",
                                result_verified: result?.result_verified || false,
                                has_result: true,
                              },
                            }));
                          }}
                        />
                      </td>
                      <td>
                        <select
                          className="promoTableSelect"
                          value={result?.exam_status || "pending"}
                          disabled={!rule || saving}
                          onChange={e => {
                            const val = e.target.value as Result["exam_status"];
                            setResults(prev => ({
                              ...prev,
                              [key]: {
                                ...result,
                                batch_id: student.batch_id,
                                student_id: student.student_id,
                                credits_earned: result?.credits_earned ?? "",
                                exam_status: val,
                                result_verified: result?.result_verified || false,
                                has_result: true,
                              },
                            }));
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="pass">Pass</option>
                          <option value="fail">Fail</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(result?.result_verified)}
                          disabled={!rule || saving}
                          onChange={e => {
                            const val = e.target.checked;
                            setResults(prev => ({
                              ...prev,
                              [key]: {
                                ...result,
                                batch_id: student.batch_id,
                                student_id: student.student_id,
                                credits_earned: result?.credits_earned ?? "",
                                exam_status: result?.exam_status || "pending",
                                result_verified: val,
                                has_result: true,
                              },
                            }));
                          }}
                        />
                      </td>
                      <td>
                        <span className={`promoStatusPill status-${statusInfo.type}`}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td>
                        {student.already_promoted ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d" }}>✓ Promoted</span>
                        ) : (
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>Pending</span>
                        )}
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={overrideIds.includes(student.student_id)}
                          disabled={saving || student.already_promoted || student.eligibility === "eligible" || student.target_status !== "ok" || (!promoteAllEligible && !selected.includes(student.student_id))}
                          onChange={e => {
                            const c = e.target.checked;
                            setOverrideIds(prev => c ? [...new Set([...prev, student.student_id])] : prev.filter(id => id !== student.student_id));
                          }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="promoBtnSecondary"
                          style={{ height: 32, padding: "0 10px", fontSize: 11 }}
                          onClick={() => void saveResult(student)}
                          disabled={!rule || saving}
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
              <button
                type="button"
                className="promoBtnSecondary"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span style={{ fontSize: 12, color: "#64748b" }}>Page {page} of {pageCount} ({filtered.length} students)</span>
              <button
                type="button"
                className="promoBtnSecondary"
                disabled={page >= pageCount}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </section>
      )}

      {/* Step 4: Promotion Execution */}
      {semester && (
        <section className="promoSectionCard">
          <div className="promoHeaderRow">
            <div>
              <span className="promoStepTag">Step 4 · Execution</span>
              <h3 className="promoTitle">Promote to {nextSemester}</h3>
              <p className="promoSubtitle">Finalize promotion batch transaction. Student records and history remain preserved.</p>
            </div>
          </div>

          {overrideIds.length > 0 && (
            <div className="promoInputGroup" style={{ marginBottom: 16 }}>
              <label className="promoInputLabel">Required Override Reason ({overrideReason.length}/500 chars · min 8)</label>
              <textarea
                className="promoInput"
                style={{ height: 60, padding: 10, resize: "none" }}
                placeholder="Explain the academic exception or committee justification for overriding requirements…"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                disabled={saving}
              />
            </div>
          )}

          <div className="promoInputGroup" style={{ marginBottom: 20 }}>
            <label className="promoInputLabel">Administrative Note (Optional)</label>
            <input
              type="text"
              className="promoInput"
              placeholder="e.g. Promotion approved by Academic Council for 2026-27"
              value={note}
              onChange={e => setNote(e.target.value)}
              disabled={saving}
            />
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="promoBtnPrimary"
              onClick={openConfirm}
              disabled={saving || loading || !rule || students.length === 0 || (!promoteAllEligible && selected.length === 0 && overrideIds.length === 0) || (overrideIds.length > 0 && overrideReason.trim().length < 8)}
            >
              {saving ? "Processing…" : `Review & Promote Candidates (${promoteAllEligible ? eligibleCount + overrideIds.length : selectedStudents.length})`}
            </button>
            <button
              type="button"
              className="promoBtnSecondary"
              onClick={() => void loadSemester(semester)}
              disabled={saving || loading}
            >
              Refresh Roster
            </button>
          </div>
        </section>
      )}

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div className="promoModalBackdrop" role="dialog" aria-modal="true">
          <div className="promoModalCard">
            <div className="promoModalHeader">
              <span className="promoStepTag">Transaction Confirmation</span>
              <h3 className="promoModalTitle">Promote to {nextSemester}?</h3>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                You are about to promote selected students from <strong>{semester}</strong> to <strong>{nextSemester}</strong>.
              </p>
            </div>

            <div className="promoModalSummary">
              <div>
                <span className="promoKpiLabel">Total Candidates</span>
                <strong style={{ fontSize: 18, color: "#0f172a", display: "block", marginTop: 4 }}>
                  {promoteAllEligible ? eligibleCount + overrideIds.length : selectedStudents.length}
                </strong>
              </div>
              <div>
                <span className="promoKpiLabel">Normal Eligible</span>
                <strong style={{ fontSize: 18, color: "#15803d", display: "block", marginTop: 4 }}>
                  {selectedStudents.filter(s => s.eligibility === "eligible").length}
                </strong>
              </div>
              <div>
                <span className="promoKpiLabel">Overrides Used</span>
                <strong style={{ fontSize: 18, color: "#b45309", display: "block", marginTop: 4 }}>
                  {overrideIds.length}
                </strong>
              </div>
              <div>
                <span className="promoKpiLabel">Destination Batches</span>
                <strong style={{ fontSize: 18, color: "#0f172a", display: "block", marginTop: 4 }}>
                  {targets.filter(t => t.status === "ok").length} OK
                </strong>
              </div>
            </div>

            {missingTargets.length > 0 && (
              <div className="promoBanner error" style={{ marginBottom: 18 }}>
                <span>Warning: {missingTargets.length} source batch(es) do not have a corresponding {nextSemester} target batch. Students in those batches will be blocked.</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="promoBtnSecondary"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="promoBtnPrimary"
                onClick={() => void promote()}
                disabled={saving}
              >
                {saving ? "Executing Promotion…" : "Confirm & Execute Promotion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
