"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Image as ImageIcon, Quote, FileText, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionReferenceAttrs } from "./extensions/section-reference";
import { editorActions } from "./actions";

export function SectionReferenceView({ node, selected, deleteNode, editor, getPos }: NodeViewProps) {
  const attrs = node.attrs as SectionReferenceAttrs;

  return (
    <NodeViewWrapper
      className="section-reference"
      data-selected={selected || undefined}
      data-ref-type={attrs.type}
    >
      <div
        className={cn(
          "rounded-xl border p-3.5 transition-all",
          selected
            ? "border-primary ring-2 ring-primary/30 bg-primary/5"
            : "border-dashed border-outline-variant/50 bg-surface-container-low/50 hover:border-outline/60"
        )}
        contentEditable={false}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-secondary-container/60 border border-outline-variant/20 flex items-center justify-center text-secondary">
            {attrs.type === "image" ? <ImageIcon className="h-5 w-5" /> : attrs.type === "quote" ? <Quote className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
              Section reference · {attrs.type === "image" ? "Image" : attrs.type === "quote" ? "Quote" : "Text note"}
            </p>
            {attrs.type === "image" && attrs.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attrs.src} alt={attrs.alt || ""} className="mt-2 max-h-40 w-auto rounded-lg border border-outline-variant/20" />
            ) : attrs.type === "quote" && attrs.quote ? (
              <blockquote className="mt-1.5 text-sm italic text-on-surface border-l-2 border-secondary pl-3">
                {attrs.quote}
                {attrs.source && <footer className="not-italic text-xs text-on-surface-variant mt-1">— {attrs.source}</footer>}
              </blockquote>
            ) : attrs.text ? (
              <p className="mt-1.5 text-sm text-on-surface">{attrs.text}</p>
            ) : (
              <p className="mt-1.5 text-xs text-on-surface-variant">No content yet — tap edit to add it.</p>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              title="Edit reference"
              aria-label="Edit reference"
              onClick={() => {
                const pos = typeof getPos === "function" ? getPos() : undefined;
                if (pos !== undefined) editor.chain().focus().setNodeSelection(pos).run();
                editorActions.openReferenceEditor?.(attrs);
              }}
              className="p-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Remove reference"
              aria-label="Remove reference"
              onClick={() => deleteNode()}
              className="p-2.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}