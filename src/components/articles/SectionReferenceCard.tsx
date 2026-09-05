"use client";

import { Image as ImageIcon, Quote, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionNode } from "@/lib/article-content";

export interface RefAttrs {
  type: string;
  src?: string | null;
  alt?: string;
  caption?: string;
  quote?: string;
  source?: string;
  text?: string;
}

function refAttrs(node: SectionNode | null | undefined): RefAttrs | null {
  if (!node || node.type !== "sectionReference") return null;
  const a = (node.attrs ?? {}) as unknown as RefAttrs;
  return a;
}

/** Extract the reference for a parsed section (its sectionReference node). */
export function sectionRefData(section: {
  reference: SectionNode | null;
  images: string[];
}): RefAttrs | null {
  const explicit = refAttrs(section.reference);
  if (explicit) return explicit;
  // Fallback: first inline image in the section acts as its reference.
  if (section.images.length > 0) return { type: "image", src: section.images[0] };
  return null;
}

export function SectionReferenceCard({
  refData, sectionIndex, className,
}: { refData: RefAttrs | null; sectionIndex: number; className?: string }) {
  if (!refData) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-outline-variant/40 bg-surface-container-low/60 overflow-hidden",
        className
      )}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-outline-variant/20">
        <span className="w-6 h-6 rounded-md bg-secondary-container/70 flex items-center justify-center text-secondary shrink-0">
          {refData.type === "image" ? <ImageIcon className="h-3.5 w-3.5" /> : refData.type === "quote" ? <Quote className="h-3 w-3" /> : <FileText className="h-3.5 w-3.5" />}
        </span>
        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80">
          Supporting material{sectionIndex > 0 ? ` · Section ${sectionIndex}` : ""}
        </p>
      </div>

      <div className="p-4">
        {refData.type === "image" && refData.src && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={refData.src} alt={refData.alt || "Supporting image"} className="w-full max-h-[420px] object-contain rounded-lg bg-surface-container-low" />
            {refData.caption && (
              <figcaption className="mt-2 text-sm text-on-surface-variant italic leading-relaxed">{refData.caption}</figcaption>
            )}
          </figure>
        )}

        {refData.type === "quote" && refData.quote && (
          <blockquote className="text-[17px] leading-relaxed text-on-surface italic font-serif border-l-2 border-secondary pl-4">
            {refData.quote}
            {refData.source && (
              <footer className="mt-2 text-sm text-on-surface-variant not-italic font-sans">— {refData.source}</footer>
            )}
          </blockquote>
        )}

        {refData.type === "text" && refData.text && (
          <p className="text-[15px] leading-relaxed text-on-surface-variant">{refData.text}</p>
        )}
      </div>
    </div>
  );
}