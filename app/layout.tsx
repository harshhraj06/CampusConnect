import type {
  Metadata,
  Viewport,
} from "next";

import "./globals.css";
import "./dashboard-parchment.css";

import PwaRegister from "./pwa-register";

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
        contentUrl:
          "https://campusconnect-pro.in/campusconnect-logo.png",
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
  metadataBase:
    new URL(
      "https://campusconnect-pro.in"
    ),

  title:
    "CampusConnect Pro — Student Success Platform",

  description:
    "Academics, placements, campus networking and resume building in one verified student platform.",

  applicationName:
    "CampusConnect Pro",

  alternates: {
    canonical:
      "https://campusconnect-pro.in/",
  },

  icons: {
    icon: [
      {
        url: "/favicon.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: [
      {
        url:
          "/icons/campusconnect-192-v2.png",
        type: "image/png",
        sizes: "192x192",
      },
    ],
  },

  appleWebApp: {
    capable: true,
    title: "CampusConnect",
    statusBarStyle: "default",
  },

  openGraph: {
    title: "CampusConnect Pro",
    description:
      "Learn. Connect. Get placed.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt:
          "CampusConnect Pro — Learn. Connect. Get placed.",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "CampusConnect Pro",
    description:
      "Learn. Connect. Get placed.",
    images: ["/og.png"],
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
      </body>
    </html>
  );
}
