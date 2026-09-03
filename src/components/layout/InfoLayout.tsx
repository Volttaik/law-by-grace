import type { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

/** Shared shell for public informational/legal pages (About, policies, support…). */
export default function InfoLayout({
  eyebrow,
  title,
  lede,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 w-full">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 pt-24 md:pt-28">
          <div className="max-w-[860px] mx-auto">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">
              {eyebrow}
            </p>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-on-surface tracking-tight mt-3">
              {title}
            </h1>
            {lede && (
              <p className="mt-4 text-[15px] leading-relaxed text-on-surface-variant">
                {lede}
              </p>
            )}
            {updated && (
              <p className="mt-3 text-xs text-on-surface-variant/70">
                Last updated: {updated}
              </p>
            )}
            <div className="mt-10 pt-10 border-t border-outline-variant/15 pb-20 space-y-12">
              {children}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

/** A titled content block used inside info pages. */
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-serif font-semibold text-[1.35rem] text-on-surface mb-3">
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-[1.8] text-on-surface-variant">
        {children}
      </div>
    </section>
  );
}
