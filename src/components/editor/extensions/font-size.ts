import { Extension, getStyleProperty } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      /** Set the font size (e.g. "18px") for the current selection. */
      setFontSize: (size: string) => ReturnType;
      /** Remove the explicit font size, falling back to the editor default. */
      unsetFontSize: () => ReturnType;
    };
  }
}

/**
 * Adds a `fontSize` attribute to the shared `textStyle` mark (same pattern as
 * the v3 Color extension), so text size persists inside the article JSON and
 * can be toggled off independently of color.
 */
export const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const value = getStyleProperty(element, "font-size") ?? element.style.fontSize;
              return value ? value.replace(/['"]+/g, "") : null;
            },
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

/** Normalize a stored fontSize value ("18px" / 18 / null) to a number. */
export function fontSizeToPx(value: unknown, fallback = 16): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export const FONT_SIZE_PRESETS = [
  { label: "Small", px: 14 },
  { label: "Normal", px: 16 },
  { label: "Large", px: 20 },
  { label: "Extra large", px: 26 },
] as const;

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 32;
export const FONT_SIZE_STEP = 2;