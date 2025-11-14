import type { Metadata } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import { Web3Providers } from "@/components/providers/web3-provider";
import { Toaster } from "@/components/ui/sonner";
import { ToastContainer } from "@/components/ToastContainer";

export const metadata: Metadata = {
  title: "KeyStone — The Command Layer for Treasury Management",
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
          data-debug="true"
          data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        />
        {/* Puter.js SDK (client-side only) */}
        <Script src="https://js.puter.com/v2/" strategy="afterInteractive" />
        {/* Jupiter Plugin script - load after hydration inside body to prevent head SSR/CSR mismatch */}
        <Script
          src="https://plugin.jup.ag/plugin-v1.js"
          strategy="afterInteractive"
        />
        <Web3Providers>{children}</Web3Providers>
        <VisualEditsMessenger />
        {/* Global toast portal */}
        <Toaster position="top-right" richColors closeButton />
        <ToastContainer />
      </body>
    </html>
  );
}