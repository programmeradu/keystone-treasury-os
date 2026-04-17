import type { Metadata, Viewport } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import { Web3Providers } from "@/components/providers/web3-provider";
import { ToastContainer } from "@/components/ToastContainer";
import { CookieBanner } from "@/components/CookieBanner";
import { RootJsonLd } from "@/components/seo/JsonLd";
import { getSiteUrl } from "@/lib/seo/site";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const siteUrl = getSiteUrl();
const siteOrigin = siteUrl.origin;

const titleDefault = "dreyv | AI treasury command layer for Solana & Web3 teams";
const description =
  "dreyv (dreyv.com) — non-custodial treasury for DAOs and protocols: plain-language intent, simulation before you sign, human-readable impact for approvers, multisig-native (e.g. Squads). Solana-native; you keep the keys. Includes dreyv atlas.";

export const viewport: Viewport = {
  themeColor: "#fdf7ff",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: titleDefault,
    template: "%s | dreyv",
  },
  description,
  applicationName: "dreyv",
  keywords: [
    "dreyv",
    "dreyv.com",
    "dreyv atlas",
    "AI powered treasury",
    "AI treasury Web3",
    "Web3 treasury",
    "DAO treasury",
    "Solana treasury",
    "DeFi treasury management",
    "AI treasury",
    "non-custodial treasury",
    "treasury simulation",
    "crypto treasury operations",
    "intent-driven treasury",
  ],
  authors: [{ name: "StaUniverse", url: "https://stauniverse.tech" }],
  creator: "StaUniverse",
  publisher: "StaUniverse",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteOrigin,
    siteName: "dreyv",
    title: titleDefault,
    description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "dreyv — AI treasury command layer for Solana teams",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: titleDefault,
    description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
};

const gtmId = process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-KNKWW6MC";

const gtmScript = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`;

/** GA4 property for dreyv (Google Analytics). If you also send the same ID from GTM, disable one to avoid double page_view. */
const gaMeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-FYR5RC3HK9";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="google-tag-manager" strategy="beforeInteractive">
          {gtmScript}
        </Script>
      </head>
      <body className="antialiased">
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
            height={0}
            width={0}
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        <RootJsonLd />
        <ErrorReporter />
        <Script
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
          strategy="afterInteractive"
          data-target-origin="*"
          data-message-type="ROUTE_CHANGE"
          data-include-search-params="true"
          data-only-in-iframe="true"
          data-debug={process.env.NODE_ENV === "development" ? "true" : "false"}
          data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        />
        <Script
          src="https://plugin.jup.ag/plugin-v1.js"
          strategy="afterInteractive"
        />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics-ga4" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaMeasurementId}');
          `}
        </Script>
        <Web3Providers>{children}</Web3Providers>
        <VisualEditsMessenger />
        <ToastContainer />
        <CookieBanner />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
