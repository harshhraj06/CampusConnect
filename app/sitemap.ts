import type { MetadataRoute } from "next";
import { publicPages, siteOrigin } from "@/lib/campus-seo";

// Update the relevant entry when its public content changes substantially.
const lastModified: Record<keyof typeof publicPages, string> = {
  "/": "2026-11-27", "/about": "2026-11-27", "/features": "2026-11-27", "/upcoming": "2026-11-27",
  "/privacy": "2026-11-27", "/terms": "2026-11-27", "/privacy/cookies": "2026-11-27",
};

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.entries(lastModified).map(([path, lastModified]) => ({
    url: siteOrigin + path,
    lastModified,
  }));
}
