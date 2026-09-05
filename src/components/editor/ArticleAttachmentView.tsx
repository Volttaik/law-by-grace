"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { BookOpen, FileText, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArticleAttachmentAttrs } from "./extensions/article-attachment";
import { editorActions } from "./actions";

export function ArticleAttachmentView({ node, selected, deleteNode, editor, getPos }: NodeViewProps) {
  const attrs = node.attrs as ArticleAttachmentAttrs;
  const isCourse = attrs.type === "course";

  return (
    <NodeViewWrapper
      className="article-attachment"
      data-selected={selected || undefined}
      data-attachment-type={attrs.type}
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border p-3 transition-all",
          selected
            ? "border-primary ring-2 ring-primary/30 bg-primary/5"
            : "border-outline-variant/40 bg-surface-container-low/70 hover:border-outline/60"
        )}
        contentEditable={false}
      >
        <div className="w-10 h-10 rounded-lg shrink-0 bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-secondary">
          {isCourse ? <BookOpen className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
            {isCourse ? "Attached course" : "Attached material"}
          </p>
          <p className="text-sm font-semibold font-manrope text-on-surface truncate">{attrs.title || "Untitled"}</p>
          {attrs.subtitle && <p className="text-xs text-on-surface-variant truncate">{attrs.subtitle}</p>}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {attrs.url && (
            <a
              href={attrs.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              title="Open"
              aria-label="Open attached content"
              className="p-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            type="button"
            title="Replace"
            aria-label="Replace attached content"
            onClick={() => {
              const pos = typeof getPos === "function" ? getPos() : undefined;
              if (pos !== undefined) editor.chain().focus().setNodeSelection(pos).run();
              editorActions.openInlinePicker?.();
            }}
            className="p-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Remove"
            aria-label="Remove attached content"
            onClick={() => deleteNode()}
            className="p-2.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}