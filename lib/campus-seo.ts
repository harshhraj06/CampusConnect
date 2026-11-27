import type { Metadata } from "next";

export const siteOrigin = "https://campusconnect-pro.in";
export const siteName = "CampusConnect";

export const publicPages = {
  "/": ["CampusConnect | College Campus Platform", "Use CampusConnect for college attendance, assignments, academic resources, campus updates and placement preparation."],
  "/about": ["About CampusConnect", "Meet the founders of CampusConnect and learn how the platform supports academics, campus operations and placement preparation."],
  "/features": ["Features | CampusConnect", "Explore attendance, academic resources, faculty workflows, campus updates and placement preparation in CampusConnect."],
  "/upcoming": ["Upcoming Features | CampusConnect", "Explore the CampusConnect product roadmap for students, faculty and placement teams."],
  "/privacy": ["Privacy Policy | CampusConnect", "Read how CampusConnect handles personal information, account data and privacy preferences."],
  "/terms": ["Terms of Use | CampusConnect", "Read the terms for using CampusConnect, including account responsibilities and acceptable use."],
  "/privacy/cookies": ["Cookies and Offline Data | CampusConnect", "Manage CampusConnect cookie preferences and review how saved offline app data is handled."],
} as const;

export type PublicPage = keyof typeof publicPages;

export function publicMetadata(path: PublicPage): Metadata {
  const [title, description] = publicPages[path];
  const url = siteOrigin + path;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title, description, url, siteName, type: "website", locale: "en_IN",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: siteName }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}
