import type {
  Metadata,
  Viewport,
} from "next";

import "./public-shell.css";
import "./opening-animation.css";
import "./auth-warm.css";

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

  title: {
    default:
      "CampusConnect Pro — Campus Operating System",
    template:
      "%s | CampusConnect Pro",
  },

  description:
    "CampusConnect Pro brings academics, attendance, assignments, placements, events, campus networking, faculty workflows and AI assistance into one secure campus platform.",

  applicationName:
    "CampusConnect Pro",

  authors: [
    {
      name:
        "CampusConnect Pro",
    },
  ],

  creator:
    "CampusConnect Pro",

  publisher:
    "CampusConnect Pro",

  alternates: {
    canonical:
      "/",
  },

  icons: {
    icon: [
      {
        url:
          "/favicon.png",
        type:
          "image/png",
        sizes:
          "512x512",
      },
      {
        url:
          "/favicon.ico",
        type:
          "image/x-icon",
      },
    ],

    apple: [
      {
        url:
          "/icons/campusconnect-192-v2.png",
        type:
          "image/png",
        sizes:
          "192x192",
      },
    ],
  },

  openGraph: {
    title:
      "CampusConnect Pro — Campus Operating System",

    description:
      "Academics, attendance, placements, campus life and AI assistance in one secure platform.",

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
          "CampusConnect Pro — Campus Operating System",
      },
    ],
  },

  twitter: {
    card:
      "summary_large_image",

    title:
      "CampusConnect Pro — Campus Operating System",

    description:
      "Academics, attendance, placements, campus life and AI assistance in one secure platform.",

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
