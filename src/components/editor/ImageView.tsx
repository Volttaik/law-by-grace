"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2 } from "lucide-react";

export function ImageView({ node, selected, deleteNode }: NodeViewProps) {
  const src = (node.attrs.src as string) || "";
  const alt = (node.attrs.alt as string) || "";

  return (
    <NodeViewWrapper className="image-node-view" data-selected={selected || undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="tiptap-image" contentEditable={false} />
      {selected && (
        <div className="image-node-actions" contentEditable={false}>
          <button
            type="button"
            onClick={() => deleteNode()}
            title="Remove image"
            aria-label="Remove image"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 shadow-elevation-sm text-xs font-semibold text-error hover:bg-error-container/20 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove image
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
}