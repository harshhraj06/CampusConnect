"use client";

import {useEffect, useState} from "react";
import {RoleActionCenter} from "./role-action-center";
import {StaffOperationsBoard} from "./staff-operations-board";
import "./faculty-dashboard-premium.css";

type Counts = {
  primary: number;
  secondary: number;
  tertiary: number;
  fourth: number;
};

type Props = {
  department: string;
  counts: Counts;
  loading: boolean;
  go: (view: any) => void;
  onOpenCalculator?: () => void;
};

function FacultyMetric({
  label,
  value,
  detail,
  loading,
}: {
  label: string;
  value: number;
  detail: string;
  loading: boolean;
}) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (loading) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayed(value);
      return;
    }

    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 480);
      setDisplayed(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, loading]);

  return (
    <article className="fdp-metric">
      <span className="fdp-metric-label">{label}</span>
      {loading ? (
        <span className="fdp-metric-skeleton" role="status" aria-label={`Loading ${label.toLowerCase()}`} />
      ) : (
        <strong aria-label={`${value} ${label.toLowerCase()} records`}>
          <span aria-hidden="true">{displayed.toLocaleString("en-IN")}</span>
        </strong>
      )}
      <small>{detail}</small>
    </article>
  );
}

export function FacultyDashboardPremium({
  department,
  counts,
  loading,
  go,
  onOpenCalculator,
}: Props) {
  const metrics = [
    {label: "Assignments", value: counts.primary, detail: "Coursework records"},
    {label: "Attendance", value: counts.secondary, detail: "Attendance records"},
    {label: "Resources", value: counts.tertiary, detail: "Learning assets"},
    {label: "Announcements", value: counts.fourth, detail: "Campus notices"},
  ];

  return (
    <section className="facultyDashboardPremium" aria-label="Faculty dashboard">
      <section className="fdp-hero" aria-labelledby="fdp-heading">
        <div className="fdp-hero-copy">
          <span className="fdp-eyebrow"><span aria-hidden="true" /> FACULTY WORKSPACE</span>
          <h2 id="fdp-heading">Your teaching, at a glance.</h2>
          <p><strong>{department || "Faculty"}</strong> · Find your academic records, review what needs attention, and manage your campus work in one focused view.</p>
        </div>
        <div className="fdp-hero-actions">
          <button className="fdp-button fdp-button-primary" type="button" onClick={() => go("Faculty Workspace")}>Open faculty workspace <span aria-hidden="true">↗</span></button>
          <button className="fdp-button fdp-button-secondary" type="button" onClick={() => go("Today's Classes")}>Today&apos;s classes <span aria-hidden="true">→</span></button>
        </div>
      </section>

      <section className="fdp-overview" aria-labelledby="fdp-overview-title">
        <div className="fdp-section-heading">
          <div><span className="fdp-kicker">ACADEMIC SNAPSHOT</span><h2 id="fdp-overview-title">Visible records</h2></div>
          <p>From your authorized campus account</p>
        </div>
        <div className="fdp-metrics">
          {metrics.map(metric => <FacultyMetric key={metric.label} {...metric} loading={loading} />)}
        </div>
      </section>

      <RoleActionCenter role="Faculty" go={go} />
      <StaffOperationsBoard role="Faculty" go={go} />

      {onOpenCalculator && (
        <div className="fdp-utility">
          <span>Need a quick grade calculation?</span>
          <button className="fdp-button fdp-button-secondary" type="button" onClick={onOpenCalculator}>Open SGPA / CGPA calculator <span aria-hidden="true">→</span></button>
        </div>
      )}
    </section>
  );
}
