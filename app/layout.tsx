import { siteName, siteOrigin, publicMetadata } from "@/lib/campus-seo";
import type {
  Metadata,
  Viewport,
} from "next";

import "./public-shell.css";
import "./opening-animation.css";
import "./auth-warm.css";
import "./mobile-compat.css";

import PwaRegister from "./pwa-register";
import CookieConsent from "./cookie-consent";

const campusConnectStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://campusconnect-pro.in/#website",
      name: "CampusConnect Pro",
      alternateName: "CampusConnect",
      url: "https://campusconnect-pro.in/",
      publisher: {
        "@id": "https://campusconnect-pro.in/#organization",
      },
      creator: {
        "@type": "Person",
        "@id": "https://campusconnect-pro.in/#creator-harsh-raj",
        name: "Harsh Raj",
        url: "https://github.com/harshhraj06",
        sameAs: ["https://github.com/harshhraj06"],
      },
    },
    {
      "@type": "Organization",
      "@id": "https://campusconnect-pro.in/#organization",
      name: "CampusConnect Pro",
      alternateName: "CampusConnect",
      url: "https://campusconnect-pro.in/",
      logo: {
        "@type": "ImageObject",
        url: "https://campusconnect-pro.in/campusconnect-logo.png",
        contentUrl: "https://campusconnect-pro.in/campusconnect-logo.png",
        width: 2120,
        height: 742,
      },
    },
  ],
} as const;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111827",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: { default: "CampusConnect | College Campus Platform", template: "%s | CampusConnect" },
  description: publicMetadata("/").description,
  applicationName: siteName,
  publisher: siteName,
  icons: {
    icon: [
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32 48x48", type: "image/x-icon" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },

};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="manifest"
          href="/manifest.json"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              campusConnectStructuredData
            ).replace(/</g, "\\u003c"),
          }}
        />
      </head>

      <body suppressHydrationWarning>
        <PwaRegister />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
