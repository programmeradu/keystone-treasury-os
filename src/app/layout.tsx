import type { Metadata } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import { Web3Providers } from "@/components/providers/web3-provider";
import { Toaster } from "@/components/ui/sonner";
import { ToastContainer } from "@/components/ToastContainer";

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
          data-debug="true"
          data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        />
        {/* Jupiter Plugin script - load after hydration inside body to prevent head SSR/CSR mismatch */}
        <Script
          src="https://plugin.jup.ag/plugin-v1.js"
          strategy="afterInteractive"
        />
        <Web3Providers>{children}</Web3Providers>
        <VisualEditsMessenger />
        {/* Global toast portal */}
        {/* Global toast portal */}
        <Toaster
          position="top-right"
          theme="dark"
          expand={false}
          richColors={false}
          toastOptions={{
            style: {
              background: 'rgba(9, 9, 11, 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(54, 226, 123, 0.1)',
              color: '#f4f4f5',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
            },
            classNames: {
              toast: 'group border-zinc-800',
              error: 'bg-red-500/10 text-red-500 !border-red-500/20',
              success: 'bg-[#36e27b]/10 text-[#36e27b] !border-[#36e27b]/40',
              warning: 'bg-yellow-500/10 text-yellow-500 !border-yellow-500/20',
              info: 'bg-zinc-900/50 text-zinc-400 !border-zinc-800',
              description: 'text-zinc-500 text-[11px] mt-1',
              actionButton: 'bg-primary text-primary-foreground',
              cancelButton: 'bg-muted text-muted-foreground',
            }
          }}
        />
        <ToastContainer />
      </body>
    </html>
  );
}