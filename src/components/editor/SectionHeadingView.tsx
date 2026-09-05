"use client";

import { createElement, useMemo } from "react";
import { NodeViewWrapper, useReactNodeView, type NodeViewProps } from "@tiptap/react";
import { ImagePlus, Quote, Trash2 } from "lucide-react";
import { editorActions } from "./actions";

/**
 * Node view for heading nodes. Level-2 headings are article sections: they
 * render with a "Section N" badge and per-section controls (add image to this
 * section, add supporting material, delete the whole section). Other heading
 * levels render as plain headings so nothing else changes.
 */
export function SectionHeadingView({ node, getPos, selected, editor }: NodeViewProps) {
  const level = Math.min(6, Math.max(1, (node.attrs.level as number) || 1));
  const isSection = level === 2;

  const sectionIndex = useMemo(() => {
    if (!isSection || !editor) return 0;
    const pos = typeof getPos === "function" ? (getPos() ?? -1) : -1;
    let count = 0;
    editor.state.doc.forEach((child, offset) => {
      if (child.type.name === "heading" && child.attrs.level === 2 && offset < pos) count += 1;
    });
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.state.doc, isSection, getPos]);

  /** Position right after this section's content (start of next section / doc end). */
  const sectionEnd = () => {
    const doc = editor.state.doc;
    const pos = typeof getPos === "function" ? getPos() : undefined;
    if (pos == null) return null;
    let end = doc.content.size;
    doc.nodesBetween(pos + node.nodeSize, doc.content.size, (child, childPos) => {
      if (child.type.name === "heading" && child.attrs.level === 2) {
        end = childPos;
        return false;
      }
      return undefined;
    });
    return end;
  };

  const addImage = () => {
    const end = sectionEnd();
    if (end == null) return;
    editor.commands.focus();
    editorActions.openSectionImagePicker?.(end);
  };

  const addReference = () => {
    const end = sectionEnd();
    if (end == null) return;
    editor.commands.focus();
    editorActions.openSectionReference?.(end);
  };

  const deleteSection = () => {
    const doc = editor.state.doc;
    const pos = typeof getPos === "function" ? getPos() : undefined;
    if (pos == null) return;
    let end = doc.content.size;
    doc.nodesBetween(pos + node.nodeSize, doc.content.size, (child, childPos) => {
      if (child.type.name === "heading" && child.attrs.level === 2) {
        end = childPos;
        return false;
      }
      return undefined;
    });
    if (end > pos) {
      editor.chain().focus().deleteRange({ from: pos, to: end }).run();
    }
  };

  if (!isSection) {
    return <EditableHeading tag={`h${level}` as keyof React.JSX.IntrinsicElements} />;
  }

  return (
    <NodeViewWrapper
      className="section-heading-wrap"
      data-selected={selected || undefined}
    >
      <div className="section-heading-bar">
        <EditableHeading tag="h2" className="section-heading-text" />
        <span className="section-badge" contentEditable={false}>Section {sectionIndex + 1}</span>
      </div>
      <div
        className="section-heading-actions"
        contentEditable={false}
        role="toolbar"
        aria-label={`Actions for section ${sectionIndex + 1}`}
        onMouseDown={e => e.preventDefault()}
      >
        <button type="button" onClick={addImage} title="Add image to this section" aria-label="Add image to this section">
          <ImagePlus className="h-3.5 w-3.5" /> Image
        </button>
        <button type="button" onClick={addReference} title="Add supporting material to this section" aria-label="Add supporting material to this section">
          <Quote className="h-3 w-3" /> Material
        </button>
        <button type="button" onClick={deleteSection} title="Delete this section" aria-label="Delete this section" className="danger">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </NodeViewWrapper>
  );
}

/** The editable heading element — ProseMirror's content goes here. */
function EditableHeading({ tag, className }: { tag: keyof React.JSX.IntrinsicElements; className?: string }) {
  const { nodeViewContentRef } = useReactNodeView();
  return createElement(tag, {
    ref: nodeViewContentRef,
    "data-node-view-content": "",
    ...(className ? { className } : {}),
  });
}