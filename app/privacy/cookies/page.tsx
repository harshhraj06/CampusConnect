import type { Metadata } from "next";
import CookieCacheSettings from "../../cookie-cache-settings";

export const metadata: Metadata = {
  title: "Cookies and cache",
  description: "Manage CampusConnect privacy preferences and saved offline app data.",
  alternates: { canonical: "/privacy/cookies" },
};

export default function CookiesAndCachePage() {
  return <CookieCacheSettings />;
}
