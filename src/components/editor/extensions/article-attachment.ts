import { Node, mergeAttributes } from "@tiptap/core";

export interface ArticleAttachmentAttrs {
  /** "course" | "material" */
  type: string;
  /** Stable identifier: course.id or material.id */
  id: string;
  /** course.slug — for materials this mirrors their course slug (informational) */
  slug: string;
  /** Display title (course title / material name) */
  title: string;
  /** Secondary line (e.g. course title for a material, department for a course) */
  subtitle: string;
  /** Absolute in-app path, e.g. /courses/<slug> or /materials/<id> */
  url: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    articleAttachment: {
      /** Insert an attached course/material reference at the current position. */
      setArticleAttachment: (attrs: Partial<ArticleAttachmentAttrs>) => ReturnType;
      /** Update the attachment at the current selection (for replace). */
      updateArticleAttachment: (attrs: Partial<ArticleAttachmentAttrs>) => ReturnType;
    };
  }
}

/**
 * Block-level, atom node representing "this article references library
 * content". The stable `id` (and `slug` for courses) is what resolves on the
 * published article, so renaming the referenced course/material never breaks
 * the reference.
 */
export const ArticleAttachment = Node.create({
  name: "articleAttachment",

  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      type: { default: "course" },
      id: { default: null },
      slug: { default: null },
      title: { default: "" },
      subtitle: { default: "" },
      url: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-article-attachment]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as ArticleAttachmentAttrs;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-article-attachment": "",
        "data-attachment-type": attrs.type,
        "data-attachment-id": attrs.id,
        "data-attachment-slug": attrs.slug,
        "data-attachment-title": attrs.title,
        "data-attachment-subtitle": attrs.subtitle,
        "data-attachment-url": attrs.url,
      }),
    ];
  },

  addCommands() {
    return {
      setArticleAttachment:
        (attrs) =>
        ({ chain }) =>
          chain()
            .focus()
            .insertContent({ type: this.name, attrs })
            .run(),
      updateArticleAttachment:
        (attrs) =>
        ({ commands }) =>
          commands.command(({ tr, state }) => {
            const { selection } = state;
            // Expects the attachment node itself to be selected (NodeSelection).
            const nodeSelection = selection as unknown as { node?: { type: { name: string }; attrs: Record<string, unknown> } };
            if (!selection || nodeSelection.node?.type.name !== this.name) return false;
            tr.setNodeMarkup(selection.$from.pos, undefined, { ...nodeSelection.node.attrs, ...attrs });
            return true;
          }),
    };
  },
});

/** Build an attachment descriptor for a picked course. */
export function courseAttachment(course: {
  id: string;
  slug: string;
  title: string;
  department?: string | null;
  university?: string | null;
}): ArticleAttachmentAttrs {
  return {
    type: "course",
    id: course.id,
    slug: course.slug,
    title: course.title,
    subtitle: [course.department, course.university].filter(Boolean).join(" · ") || "Course in the library",
    url: `/courses/${course.slug}`,
  };
}

/** Build an attachment descriptor for a picked material. */
export function materialAttachment(material: {
  id: string;
  name: string;
  course: { title: string; slug: string };
}): ArticleAttachmentAttrs {
  return {
    type: "material",
    id: material.id,
    slug: material.course.slug,
    title: material.name,
    subtitle: `From “${material.course.title}”`,
    url: `/materials/${material.id}`,
  };
}