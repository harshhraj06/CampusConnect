import Link from "next/link";
import { publicPages, siteOrigin, type PublicPage } from "@/lib/campus-seo";

export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json">{json}</script>;
}

export function Breadcrumb({ path }: { path: Exclude<PublicPage, "/"> }) {
  const page = Object.entries(publicPages).find(([url]) => url === path)?.[1];
  if (!page) return null;

  return <JsonLd data={{
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteOrigin + "/" },
      { "@type": "ListItem", position: 2, name: page[0].split(" | ")[0], item: siteOrigin + path },
    ],
  }} />;
}

export function PublicLinks() {
  return (
    <nav aria-label="Explore CampusConnect">
      <Link href="/">Home</Link>{" · "}
      <Link href="/about">About</Link>{" · "}
      <Link href="/features">Features</Link>{" · "}
      <Link href="/upcoming">Upcoming features</Link>{" · "}
      <Link href="/privacy">Privacy</Link>{" · "}
      <Link href="/terms">Terms</Link>{" · "}
      <Link href="/privacy/cookies">Cookies</Link>
    </nav>
  );
}
