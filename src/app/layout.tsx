import type { Metadata, Viewport } from "next";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import MobileNav from "@/components/layout/MobileNav";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export const metadata: Metadata = {
  title: "Law by Grace — Legal E-Library & Study Platform",
  description:
    "A calm, beautiful e-library for law. Discover legal courses, books, PDFs, videos and articles — study effectively and understand the law.",
  keywords: [
    "law",
    "legal education",
    "e-library",
    "courses",
    "law books",
    "legal materials",
    "constitutional law",
    "criminal law",
    "study",
    "Law by Grace",
  ],
  openGraph: {
    title: "Law by Grace — Legal E-Library & Study Platform",
    description:
      "A calm, beautiful e-library for law. Discover legal courses, books, PDFs, videos and articles.",
    type: "website",
    siteName: "Law by Grace",
    images: [
      {
        url: "/icons/og-1200x630.png",
        width: 1200,
        height: 630,
        alt: "Law by Grace — Legal E-Library & Study Platform",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Law by Grace — Legal E-Library & Study Platform",
    description:
      "A calm, beautiful e-library for law. Discover legal courses, books, PDFs, videos and articles.",
    images: ["/icons/og-1200x630.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Law by Grace",
  },
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Be+Vietnam+Pro:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <style dangerouslySetInnerHTML={{ __html: `html{background:#f6f9fe}html.dark{background:#070b15}` }} />
        <script
          dangerouslySetInnerHTML={{
            // Light mode is the default; apply dark only when the user has
            // explicitly saved that preference. Runs pre-hydration so there
            // is never a theme flash.
            __html: `(function(){try{var t=localStorage.getItem('lbg-theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});})}`,
          }}
        />
      </head>
      <body className="min-h-full antialiased bg-background text-on-background">
        <ThemeProvider>
          <SessionProvider>
            <div className="pt-16 min-h-screen">
              {children}
            </div>
            <MobileNav />
            <PWAInstallPrompt />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
