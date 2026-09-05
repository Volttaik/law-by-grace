/**
 * Shared helpers for article section structure, images and banners.
 *
 * Articles store their body as a TipTap JSON document (in ArticleEdition /
 * ArticleDraft). The section model is content-level, not relational:
 *
 *   - A section starts at every H2 heading. Legacy articles fall back to H1
 *     boundaries when no H2 exists, then to a single implicit section.
 *   - Everything up to the next section heading belongs to that section —
 *     including images — so each image is inherently tied to the section the
 *     author placed it in.
 *   - A section's "reference" is the explicit `sectionReference` node inside
 *     it (image / quote / text note). If a section has none, the first image
 *     in the section is used as a fallback reference.
 *
 * This keeps section relationships structured and reliable without new
 * database tables, and existing articles render correctly with zero data
 * changes.
 */

export interface SectionNode {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: SectionNode[];
  text?: string;
}

export interface SectionRefData {
  type: string; // "image" | "quote" | "text"
  src?: string | null;
  alt?: string;
  caption?: string;
  quote?: string;
  source?: string;
  text?: string;
}

export interface ArticleSection {
  /** Stable anchor id, e.g. "section-1". */
  id: string;
  index: number;
  title: string;
  /** Heading level that opened the section (2, or 1 for legacy). */
  level: number;
  /** Nodes between the section heading and the next one. */
  nodes: SectionNode[];
  /** The designated reference node, if any. */
  reference: SectionNode | null;
  /** Image node srcs inside this section (excludes the reference image). */
  images: string[];
  /** The heading node itself. */
  heading: SectionNode | null;
}

interface ParsedDoc {
  type?: string;
  content?: SectionNode[];
}

/** Walk a node tree, visiting every node. */
function walk(node: SectionNode | undefined | null, visit: (n: SectionNode) => void) {
  if (!node) return;
  visit(node);
  if (Array.isArray(node.content)) {
    for (const child of node.content) walk(child, visit);
  }
}

function nodeText(node: SectionNode | undefined | null): string {
  if (!node) return "";
  if (typeof node.text === "string") return node.text;
  return (node.content ?? []).map(n => nodeText(n)).join("");
}

function imageSrc(node: SectionNode): string | null {
  if (node.type === "image") return (node.attrs?.src as string) || null;
  return null;
}

const SECTION_HEADING_LEVELS = [2, 1, 3, 4];

/**
 * Parse a TipTap doc into sections. `content` may be a JSON string, an
 * already-parsed object, or legacy HTML (returns one implicit section).
 */
export function parseSections(content: string | object | null | undefined): ArticleSection[] {
  let doc: ParsedDoc | null = null;
  if (content == null) return [];
  if (typeof content === "string") {
    try {
      doc = JSON.parse(content) as ParsedDoc;
    } catch {
      doc = null;
    }
  } else {
    doc = content as ParsedDoc;
  }

  // Legacy plain-HTML content: one implicit section, no images we can trust.
  if (!doc || typeof doc !== "object" || !Array.isArray(doc.content)) {
    return [{
      id: "section-1",
      index: 1,
      title: "",
      level: 2,
      nodes: [],
      reference: null,
      images: [],
      heading: null,
    }];
  }

  const children = doc.content;
  const headings = children.filter(
    c => c.type === "heading" && SECTION_HEADING_LEVELS.includes((c.attrs?.level as number) ?? 0)
  );
  const preferred = headings.length > 0
    ? Math.min(...headings.map(h => (h.attrs?.level as number) ?? 2))
    : 2;

  // Which level actually opens sections? Prefer H2; if the doc has no H2 at
  // all but has H1, use H1; otherwise any of the heading levels used.
  const h2s = headings.filter(h => (h.attrs?.level as number) === 2);
  const h1s = headings.filter(h => (h.attrs?.level as number) === 1);
  const boundaryLevel = h2s.length > 0 ? 2 : h1s.length > 0 ? 1 : preferred;

  const sections: ArticleSection[] = [];
  let current: ArticleSection | null = null;

  const pushCurrent = () => {
    if (!current) return;
    current.reference = current.nodes.find(n => n.type === "sectionReference") ?? null;
    const images: string[] = [];
    for (const n of current.nodes) {
      walk(n, node => {
        const src = imageSrc(node);
        if (src && node !== current!.reference) images.push(src);
      });
    }
    current.images = [...new Set(images)];
    sections.push(current);
    current = null;
  };

  for (const node of children) {
    if (node.type === "heading" && (node.attrs?.level as number) === boundaryLevel) {
      pushCurrent();
      current = {
        id: `section-${sections.length + 1}`,
        index: sections.length + 1,
        title: nodeText(node),
        level: boundaryLevel,
        nodes: [],
        reference: null,
        images: [],
        heading: node,
      };
      continue;
    }
    if (!current) {
      // Leading content before any section heading — own implicit section.
      current = {
        id: "section-1",
        index: 1,
        title: "",
        level: boundaryLevel,
        nodes: [],
        reference: null,
        images: [],
        heading: null,
      };
    }
    current.nodes.push(node);
  }
  pushCurrent();

  if (sections.length === 0) {
    return [{
      id: "section-1",
      index: 1,
      title: "",
      level: 2,
      nodes: children,
      reference: null,
      images: [],
      heading: null,
    }];
  }
  return sections;
}

/** Collect every image src in a doc (deduped, in order). */
export function extractImages(content: string | object | null | undefined): string[] {
  const sections = parseSections(content);
  const out: string[] = [];
  for (const s of sections) {
    if (s.reference?.type === "sectionReference" && (s.reference.attrs?.src as string)) {
      out.push(s.reference.attrs?.src as string);
    }
    out.push(...s.images);
  }
  return [...new Set(out.filter(Boolean))];
}

/** Count of images attached across the whole article. */
export function countImages(content: string | object | null | undefined): number {
  return extractImages(content).length;
}

// ─── Banners ──────────────────────────────────────────────────────────────────

const DEFAULT_BANNERS = Array.from({ length: 6 }, (_, i) => `/banners/default-${i + 1}.svg`);

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Deterministic default banner for an article without a custom one. */
export function defaultBannerFor(articleId: string): string {
  return DEFAULT_BANNERS[hashString(articleId) % DEFAULT_BANNERS.length];
}

/**
 * Resolve the banner for an article: the explicit coverImage when set,
 * otherwise a consistent default derived from the article's stable id.
 */
export function resolveArticleBanner(coverImage: string | null | undefined, articleId: string): string {
  if (coverImage && typeof coverImage === "string" && coverImage.trim()) return coverImage;
  return defaultBannerFor(articleId);
}

export { DEFAULT_BANNERS };