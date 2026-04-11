import type { Metadata } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import { Web3Providers } from "@/components/providers/web3-provider";
import { ToastContainer } from "@/components/ToastContainer";
import { CookieBanner } from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "KeyStone | The Command Layer for Treasury Management",
  description:
    "Manage your entire Web3 treasury through natural language. KeyStone turns complex, multi-step operations into simple, declarative prompts.",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml', sizes: '512x512' }
    ],
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      </head>
      <body className="antialiased">
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
        {/* Jupiter Plugin script - load after hydration inside body to prevent head SSR/CSR mismatch */}
        <Script
          src="https://plugin.jup.ag/plugin-v1.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-P23GPETJSL"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-P23GPETJSL');
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