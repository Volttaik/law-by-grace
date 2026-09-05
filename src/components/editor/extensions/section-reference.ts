import { Node, mergeAttributes } from "@tiptap/core";
import type { NodeSelection } from "prosemirror-state";

export interface SectionReferenceAttrs {
  /** "image" | "quote" | "text" */
  type: string;
  src: string | null;
  alt: string;
  caption: string;
  quote: string;
  source: string;
  text: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    sectionReference: {
      /** Insert a supporting reference (image/quote/text) at the current position. */
      setSectionReference: (attrs: Partial<SectionReferenceAttrs>) => ReturnType;
      /** Update the reference node currently selected. */
      updateSectionReference: (attrs: Partial<SectionReferenceAttrs>) => ReturnType;
    };
  }
}

/**
 * A block-level, atom node marking the supporting material that belongs to
 * the section above it. Stored inside the article JSON, so the relationship
 * "section → reference" persists through drafts, editions and publishing.
 */
export const SectionReference = Node.create({
  name: "sectionReference",

  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      type: { default: "image" },
      src: { default: null },
      alt: { default: "" },
      caption: { default: "" },
      quote: { default: "" },
      source: { default: "" },
      text: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-section-reference]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as SectionReferenceAttrs;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-section-reference": "",
        "data-ref-type": attrs.type,
        "data-ref-src": attrs.src ?? "",
        "data-ref-quote": attrs.quote,
        "data-ref-source": attrs.source,
        "data-ref-text": attrs.text,
      }),
    ];
  },

  addCommands() {
    return {
      setSectionReference:
        (attrs) =>
        ({ chain }) =>
          chain().focus().insertContent({ type: this.name, attrs }).run(),
      updateSectionReference:
        (attrs) =>
        ({ commands }) =>
          commands.command(({ tr, state }) => {
            const selection = state.selection as NodeSelection;
            if (!selection?.node || selection.node.type.name !== this.name) return false;
            tr.setNodeMarkup(selection.$from.pos, undefined, { ...selection.node.attrs, ...attrs });
            return true;
          }),
    };
  },
});

export function emptySectionReference(type: "image" | "quote" | "text"): SectionReferenceAttrs {
  return {
    type,
    src: null,
    alt: "",
    caption: "",
    quote: "",
    source: "",
    text: "",
  };
}