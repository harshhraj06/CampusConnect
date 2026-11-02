"use client";

import Link from "next/link";
import AcademicPromotionModule from "@/app/academic-promotion-module";

export default function AcademicPromotionStandalonePage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      color: "#0f172a",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    }}>
      {/* Top Header */}
      <header style={{
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        padding: "16px 24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
              <img
                src="/campusconnect-logo-ui.webp"
                alt="CampusConnect"
                style={{ height: 34, width: "auto", objectFit: "contain" }}
              />
            </Link>
            <div style={{ width: 1, height: 24, background: "#cbd5e1" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1e3a24", letterSpacing: "-0.01em" }}>
                Academic Control Center
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                Semester Progression & Credit Rules
              </div>
            </div>
          </div>

          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 16px",
              background: "#1e3a24",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 9,
              textDecoration: "none",
              transition: "background 0.15s",
            }}
          >
            ← Return to Main Admin Workspace
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#1e3a24",
            background: "#eaf3ec",
            padding: "4px 10px",
            borderRadius: 999,
            marginBottom: 10,
          }}>
            Institutional Operations · Main Admin
          </div>
          <h1 style={{
            fontSize: "clamp(26px, 3.5vw, 36px)",
            fontWeight: 850,
            letterSpacing: "-0.035em",
            margin: "0 0 10px",
            color: "#0f172a",
          }}>
            Academic Promotion Engine
          </h1>
          <p style={{
            fontSize: 14,
            color: "#64748b",
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 720,
          }}>
            Evaluate student eligibility across departments, configure semester credit policies, and execute verified batch promotions directly into the next academic semester.
          </p>
        </div>

        {/* Embedded Module */}
        <AcademicPromotionModule />
      </main>
    </div>
  );
}
