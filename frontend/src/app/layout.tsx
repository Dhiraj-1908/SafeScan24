import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// ─── Viewport (Next.js 15 — separate from Metadata) ──────────────────────────
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,          // prevents accidental zoom on iOS form fields
  userScalable: false,
  themeColor: "#ef4444",
  viewportFit: "cover",     // allows content behind notch / Dynamic Island
};

// ─── Metadata ─────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "SafeScan24 — Emergency QR",
  description: "Scan to reach emergency contacts instantly. No app needed.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // blends with notch area
    title: "SafeScan24",
  },
  formatDetection: {
    telephone: false, // prevents iOS from auto-linking numbers we don't want linked
  },
  openGraph: {
    title: "SafeScan24",
    description: "Emergency QR system — scan to call contacts instantly.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* iOS splash / icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Prevent flash of unstyled content on iOS */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans bg-gray-50 text-gray-900 antialiased overscroll-none">
        {/* Safe area wrapper — pushes content away from notch & home bar */}
        <div className="min-h-screen min-h-dvh flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}