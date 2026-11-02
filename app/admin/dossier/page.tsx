"use client";

import Link from "next/link";
import CampusDossierModule from "@/app/campus-dossier-module";

export default function AdminDossierPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
        fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* Top Header */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "16px 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
              <img
                src="/rnsit-logo.png"
                alt="RNSIT"
                style={{ height: 38, width: "auto", objectFit: "contain", marginRight: 10 }}
              />
              <img
                src="/campusconnect-logo.png"
                alt="CampusConnect"
                style={{ height: 34, width: "auto", objectFit: "contain" }}
              />
            </Link>
            <div style={{ width: 1, height: 26, background: "#cbd5e1" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#173b70", letterSpacing: "-0.01em" }}>
                RNS Institute of Technology · Central Admin
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                Institutional Dossier, USN Management & Academic Record Center
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
              background: "#173b70",
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
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px 60px" }}>
        <CampusDossierModule />
      </main>
    </div>
  );
}
