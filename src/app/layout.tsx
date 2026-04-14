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

const siteUrl = getSiteUrl();
const siteOrigin = siteUrl.origin;

const titleDefault = "Dreyv | AI Treasury Operating System for Web3";
const description =
  "Non-custodial treasury OS: natural-language command-ops, simulation before you sign, Solana intelligence, and agents that remember protocols.";

export const viewport: Viewport = {
  themeColor: "#050508",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: titleDefault,
    template: "%s | Dreyv",
  },
  description,
  applicationName: "Dreyv",
  keywords: [
    "Web3 treasury",
    "DAO treasury",
    "Solana treasury",
    "DeFi treasury management",
    "AI treasury",
    "non-custodial treasury",
    "treasury simulation",
    "crypto treasury operations",
    "Command-Ops",
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
    siteName: "Dreyv",
    title: titleDefault,
    description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Dreyv — AI treasury operating system for Web3",
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
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml", sizes: "512x512" },
    ],
    apple: "/icon.svg",
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
      </body>
    </html>
  );
}
