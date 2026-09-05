"use client";

import type { SectionReferenceAttrs } from "./extensions/section-reference";

/**
 * NodeViews are created by TipTap without access to page-level props, so
 * actions they need (e.g. "replace this attachment") are registered here by
 * the editor page. Only one editor is mounted at a time.
 */
export const editorActions: {
  /** Opens the inline course/material attachment picker (for replace). */
  openInlinePicker?: () => void;
  /** Opens the reference editor dialog, prefilled for an existing node. */
  openReferenceEditor?: (attrs: SectionReferenceAttrs) => void;
} = {};