"use client";

import { cn } from "@/lib/utils";

/**
 * A small curved flow connector linking a section to its reference.
 * Kept at a fixed aspect ratio so the curve and connection dots never
 * distort, and intentionally subtle — it hints structure, it doesn't shout.
 */
export function SectionConnector({ flip = false, className }: { flip?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 200 80"
      className={cn("h-auto", flip ? "-scale-x-100" : "", className)}
      style={{ width: "100%", maxWidth: 240 }}
      aria-hidden
      role="presentation"
    >
      {/* curved flow line: section dot (top-left) → reference dot (bottom-right) */}
      <path
        d="M 22 14 C 22 66, 178 14, 178 66"
        fill="none"
        stroke="rgb(var(--c-secondary))"
        strokeOpacity="0.4"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* connection points */}
      <circle cx="22" cy="14" r="5" fill="rgb(var(--c-secondary))" fillOpacity="0.9" />
      <circle cx="178" cy="66" r="5" fill="none" stroke="rgb(var(--c-secondary))" strokeOpacity="0.55" strokeWidth="1.6" />
      <circle cx="178" cy="66" r="2" fill="rgb(var(--c-secondary))" fillOpacity="0.55" />
    </svg>
  );
}

/** Vertical spacer connecting one flow row to the next in the structure map. */
export function SectionFlowSpacer({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center", className)} aria-hidden role="presentation">
      <svg viewBox="0 0 24 44" className="h-11 w-6" aria-hidden>
        <path
          d="M 12 0 C 12 22, 12 22, 12 44"
          fill="none"
          stroke="rgb(var(--c-secondary))"
          strokeOpacity="0.3"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="0" r="2.5" fill="rgb(var(--c-secondary))" fillOpacity="0.5" />
      </svg>
    </div>
  );
}