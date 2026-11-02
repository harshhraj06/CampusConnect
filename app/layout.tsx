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
  metadataBase:
    new URL(
      "https://campusconnect-pro.in"
    ),

  title: {
    default:
      "CampusConnect Pro | College Campus Platform",
    template:
      "%s | CampusConnect Pro",
  },

  description:
    "CampusConnect Pro is a college campus platform for academics, attendance, assignments, student collaboration, campus events and placement preparation. Built by Harsh Raj.",

  applicationName:
    "CampusConnect Pro",

  authors: [{ name: "Harsh Raj", url: "https://github.com/harshhraj06" }],

  creator: "Harsh Raj",

  publisher:
    "CampusConnect Pro",

  alternates: {
    canonical:
      "/",
  },

  icons: {
    icon: [
      {
        url: "/icons/campusconnect-512-v2.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: [
      {
        url: "/icons/campusconnect-192-v2.png",
        type: "image/png",
        sizes: "192x192",
      },
    ],
  },

  openGraph: {
    title:
      "CampusConnect Pro | College Campus Platform",

    description:
      "CampusConnect Pro is a college campus platform for academics, attendance, assignments, student collaboration, campus events and placement preparation. Built by Harsh Raj.",

    url:
      "https://campusconnect-pro.in/",

    siteName:
      "CampusConnect Pro",

    type:
      "website",

    locale:
      "en_IN",

    images: [
      {
        url:
          "/og.png",

        width:
          1200,

        height:
          630,

        alt:
          "CampusConnect Pro | College Campus Platform",
      },
    ],
  },

  twitter: {
    card:
      "summary_large_image",

    title:
      "CampusConnect Pro | College Campus Platform",

    description:
      "CampusConnect Pro is a college campus platform for academics, attendance, assignments, student collaboration, campus events and placement preparation. Built by Harsh Raj.",

    images: [
      "/og.png",
    ],
  },

  robots: {
    index:
      true,

    follow:
      true,

    googleBot: {
      index:
        true,

      follow:
        true,

      "max-image-preview":
        "large",

      "max-snippet":
        -1,

      "max-video-preview":
        -1,
    },
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
