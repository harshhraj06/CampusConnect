import { JsonLd } from "./campus-seo-content";
import { brandStructuredData, siteName, siteOrigin, publicMetadata } from "@/lib/campus-seo";
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
        <JsonLd data={brandStructuredData} />
      </head>

      <body suppressHydrationWarning>
        <PwaRegister />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
