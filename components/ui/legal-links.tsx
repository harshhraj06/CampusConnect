"use client";

import Link from "next/link";
import "./legal-links.css";

export function LegalLinks() {
  return (
    <nav className="ccLegalLinks" aria-label="Policies and privacy">
      <Link href="/privacy">Privacy policy</Link>
      <Link href="/privacy/cookies">Cookies &amp; cache</Link>
      <Link href="/terms">Terms of use</Link>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("campusconnect-open-cookie-settings"))}
      >
        Privacy preferences
      </button>
    </nav>
  );
}
