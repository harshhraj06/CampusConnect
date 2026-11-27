import { publicPages, siteOrigin } from "@/lib/campus-seo";

// Update the relevant entry when its public content changes substantially.
const lastModified: Record<keyof typeof publicPages, string> = {
  "/": "2026-11-27", "/about": "2026-11-27", "/features": "2026-11-27", "/upcoming": "2026-11-27",
  "/privacy": "2026-11-27", "/terms": "2026-11-27", "/privacy/cookies": "2026-11-27",
};

export function GET() {
  const urls = Object.entries(lastModified).map(([path, lastmod]) =>
    "<url><loc>" + siteOrigin + path + "</loc><lastmod>" + lastmod + "</lastmod></url>",
  );
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.join("\n") + "\n</urlset>\n",
    { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } },
  );
}
