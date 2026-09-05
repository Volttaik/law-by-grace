"use client";

import { useEffect, useRef, useState, useCallback, forwardRef } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, ChevronDown, Undo, Redo,
  Plus, Image as ImageIcon, Link2, Minus,
  BookOpen, Type, Highlighter, CheckSquare, Code, Eraser,
  Heading2, Paperclip,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useIsMobile } from "./useIsMobile";
import { BottomSheet } from "./BottomSheet";
import { ColorPickerContent, TEXT_COLOR_SWATCHES } from "./ColorPicker";
import { FONT_SIZE_PRESETS, FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_STEP, fontSizeToPx } from "./extensions/font-size";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    if (!ref.current) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [ref, onOutside]);
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-outline-variant/40 mx-1 shrink-0" aria-hidden />;
}

interface IconBtnProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function IconBtn({ label, active, disabled, onClick, children }: IconBtnProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-10 w-10 md:h-9 md:w-9 shrink-0 rounded-lg flex items-center justify-center transition-all",
        "focus-visible:outline-2 focus-visible:outline-primary",
        active
          ? "bg-primary-container/70 text-on-primary-container"
          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

/** Dropdown trigger with a label + chevron (paragraph style, align, list, insert). */
const LabelBtn = forwardRef<HTMLButtonElement, {
  label: string;
  icon?: React.ReactNode;
  open: boolean;
  onClick: () => void;
  active?: boolean;
}>(({ label, icon, open, onClick, active }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-haspopup="listbox"
    aria-expanded={open}
    onClick={onClick}
    className={cn(
      "h-10 md:h-9 shrink-0 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-all",
      "focus-visible:outline-2 focus-visible:outline-primary",
      open || active
        ? "bg-primary-container/70 text-on-primary-container"
        : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
    )}
  >
    {icon}
    <span className="max-w-[100px] truncate">{label}</span>
    <ChevronDown className={cn("h-3.5 w-3.5 text-on-surface-variant transition-transform shrink-0", open && "rotate-180")} />
  </button>
));
LabelBtn.displayName = "LabelBtn";

/** Desktop popover anchored under a trigger button, portaled to <body>. */
function ToolbarPopover({
  open, onClose, triggerRef, children, width = 300,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  width?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const trig = triggerRef.current;
      const panel = panelRef.current;
      if (!trig) return;
      const rect = trig.getBoundingClientRect();
      const w = panel ? panel.offsetWidth : width;
      const top = rect.bottom + 6;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8));
      setPos({ top, left });
    };
    place();
    const t = setTimeout(place, 0);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { clearTimeout(t); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, width, triggerRef]);

  useClickOutside(panelRef, onClose);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label="Toolbar options"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.12 }}
          style={{ top: pos.top, left: pos.left, width }}
          className="fixed z-[75] elevated-surface-strong rounded-xl p-3 max-h-[70vh] overflow-y-auto"
          onKeyDown={e => { if (e.key === "Escape") onClose(); }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Sub-panels ───────────────────────────────────────────────────────────────

const HEADINGS = [
  { label: "Normal text", level: 0 },
  { label: "Heading 1", level: 1 },
  { label: "Heading 2", level: 2 },
  { label: "Heading 3", level: 3 },
  { label: "Heading 4", level: 4 },
];

function ParagraphMenu({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const level = [1, 2, 3, 4].find(l => editor.isActive("heading", { level: l })) ?? 0;
  return (
    <div role="listbox" aria-label="Paragraph style">
      {HEADINGS.map(h => (
        <button
          key={h.level}
          role="option"
          aria-selected={level === h.level}
          type="button"
          onClick={() => {
            if (h.level === 0) editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: h.level as 1 | 2 | 3 | 4 }).run();
            onClose();
          }}
          className={cn(
            "w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-surface-container transition-colors",
            level === h.level ? "text-primary font-semibold bg-primary/5" : "text-on-surface",
            h.level === 1 && "text-lg font-bold font-manrope",
            h.level === 2 && "text-base font-bold font-manrope",
            h.level === 3 && "text-sm font-semibold font-manrope",
            h.level === 4 && "text-sm font-medium font-manrope"
          )}
        >
          {h.label}
        </button>
      ))}
    </div>
  );
}

function AlignMenu({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const current = ["left", "center", "right", "justify"].find(a => editor.isActive({ textAlign: a })) ?? "left";
  const items = [
    { value: "left", label: "Align left", icon: AlignLeft },
    { value: "center", label: "Center", icon: AlignCenter },
    { value: "right", label: "Align right", icon: AlignRight },
    { value: "justify", label: "Justify", icon: AlignJustify },
  ] as const;
  return (
    <div role="listbox" aria-label="Text alignment">
      {items.map(it => (
        <button
          key={it.value}
          role="option"
          aria-selected={current === it.value}
          type="button"
          onClick={() => {
            editor.chain().focus().setTextAlign(it.value).run();
            onClose();
          }}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
            current === it.value ? "text-primary font-semibold bg-primary/5" : "text-on-surface hover:bg-surface-container"
          )}
        >
          <it.icon className="h-4 w-4" />
          {it.label}
        </button>
      ))}
    </div>
  );
}

function ListMenu({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const items = [
    { key: "bullet", label: "Bulleted list", icon: List, active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { key: "ordered", label: "Numbered list", icon: ListOrdered, active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
  ];
  return (
    <div role="listbox" aria-label="List type">
      {items.map(it => (
        <button
          key={it.key}
          role="option"
          aria-selected={it.active}
          type="button"
          onClick={() => { it.run(); onClose(); }}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
            it.active ? "text-primary font-semibold bg-primary/5" : "text-on-surface hover:bg-surface-container"
          )}
        >
          <it.icon className="h-4 w-4" />
          {it.label}
          {it.active && <span className="ml-auto text-[10px] text-on-surface-variant">On</span>}
        </button>
      ))}
      <p className="mt-2 px-3 text-[11px] text-on-surface-variant/80">Lists toggle on and off — tap the active type to remove it.</p>
    </div>
  );
}

function FontSizePanel({
  editor, onClose, large,
}: { editor: Editor; onClose: () => void; large?: boolean }) {
  const attrs = editor.getAttributes("textStyle") as { fontSize?: string };
  const current = fontSizeToPx(attrs.fontSize ?? null, 16);
  const isDefault = !attrs.fontSize;

  const apply = (px: number) => {
    if (px === 16) editor.chain().focus().unsetFontSize().run();
    else editor.chain().focus().setFontSize(`${px}px`).run();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70">Text size</p>
        <span className="text-xs font-semibold text-on-surface">{current}px{isDefault && " · default"}</span>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          aria-label="Decrease text size"
          onClick={() => apply(Math.max(FONT_SIZE_MIN, current - FONT_SIZE_STEP))}
          className={cn(
            "flex-1 rounded-xl border border-outline-variant/40 hover:bg-surface-container transition-colors font-bold text-on-surface",
            large ? "h-12 text-lg" : "h-10"
          )}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Return to default text size"
          onClick={() => apply(16)}
          className={cn(
            "flex-[2] rounded-xl border border-outline-variant/40 hover:bg-surface-container transition-colors text-sm font-medium text-on-surface",
            large ? "h-12" : "h-10"
          )}
        >
          Default size
        </button>
        <button
          type="button"
          aria-label="Increase text size"
          onClick={() => apply(Math.min(FONT_SIZE_MAX, current + FONT_SIZE_STEP))}
          className={cn(
            "flex-1 rounded-xl border border-outline-variant/40 hover:bg-surface-container transition-colors font-bold text-on-surface",
            large ? "h-12 text-lg" : "h-10"
          )}
        >
          +
        </button>
      </div>
      <div className="space-y-1">
        {FONT_SIZE_PRESETS.map(p => {
          const active = !isDefault && Math.round(current) === p.px;
          return (
            <button
              key={p.px}
              type="button"
              onClick={() => apply(p.px)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                active ? "text-primary font-semibold bg-primary/5" : "text-on-surface hover:bg-surface-container"
              )}
            >
              <span style={{ fontSize: Math.min(p.px, 20) }}>{p.label}</span>
              <span className="text-[11px] text-on-surface-variant">{p.px}px</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 text-[11px] text-on-surface-variant/80">“Default size” returns selected text to the normal article size.</p>
    </div>
  );
}

function LinkPanel({
  editor, onClose, large,
}: { editor: Editor; onClose: () => void; large?: boolean }) {
  const hasLink = editor.isActive("link");
  const existing = (editor.getAttributes("link") as { href?: string }).href ?? "";
  const [url, setUrl] = useState(existing);
  const [error, setError] = useState("");

  useEffect(() => { setUrl(existing); setError(""); }, [existing, hasLink]);

  const apply = () => {
    const value = url.trim();
    if (!value) {
      setError("Enter a web address first.");
      return;
    }
    let href = value;
    if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) href = `https://${href}`;
    try {
      new URL(href);
    } catch {
      setError("That doesn't look like a valid link.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    onClose();
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
  };

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70 mb-2.5">
        {hasLink ? "Edit link" : "Add link"}
      </p>
      <input
        value={url}
        onChange={e => { setUrl(e.target.value); setError(""); }}
        onKeyDown={e => { if (e.key === "Enter") apply(); }}
        placeholder="https://example.com"
        className="input-field"
        inputMode="url"
        aria-label="Link URL"
      />
      {error && <p className="text-xs text-error mt-2">{error}</p>}
      <div className="flex items-center gap-2 mt-3">
        <button type="button" onClick={apply} className="btn-primary flex-1 py-2.5">
          <Link2 className="h-4 w-4" /> {hasLink ? "Update link" : "Add link"}
        </button>
        {hasLink && (
          <button type="button" onClick={remove} className="btn-secondary flex-1 py-2.5">
            Remove link
          </button>
        )}
      </div>
      {large && hasLink && (
        <p className="mt-2 text-[11px] text-on-surface-variant/80">Remove the link to go back to plain text.</p>
      )}
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

interface ToolbarProps {
  editor: Editor;
  onInsertImage: () => void;
  onAttachInline: () => void;
  /** Starts a new article section (H2 heading). */
  onInsertSection: () => void;
  /** Opens the supporting-material (section reference) dialog. */
  onInsertReference: () => void;
  /** Right-pinned cluster (save status + publish) rendered by the page. */
  rightSlot?: React.ReactNode;
}

export function Toolbar({ editor, onInsertImage, onAttachInline, onInsertSection, onInsertReference, rightSlot }: ToolbarProps) {
  const isMobile = useIsMobile();
  const [openPanel, setOpenPanel] = useState<null | "paragraph" | "color" | "size" | "align" | "list" | "insert" | "link">(null);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [insertSheetOpen, setInsertSheetOpen] = useState(false);

  const paragraphRef = useRef<HTMLButtonElement>(null);
  const colorRef = useRef<HTMLButtonElement>(null);
  const sizeRef = useRef<HTMLButtonElement>(null);
  const alignRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLButtonElement>(null);
  const insertRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpenPanel(null), []);

  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed) return null;
      const textStyle = ed.getAttributes("textStyle") as { color?: string; fontSize?: string };
      return {
        isBold: ed.isActive("bold"),
        isItalic: ed.isActive("italic"),
        isUnderline: ed.isActive("underline"),
        isStrike: ed.isActive("strike"),
        canUndo: ed.can().undo(),
        canRedo: ed.can().redo(),
        color: textStyle.color ?? null,
        fontSize: textStyle.fontSize ?? null,
        heading: [1, 2, 3, 4].find(l => ed.isActive("heading", { level: l })) ?? 0,
        align: ["left", "center", "right", "justify"].find(a => ed.isActive({ textAlign: a })) ?? "left",
        bulletOn: ed.isActive("bulletList"),
        orderedOn: ed.isActive("orderedList"),
        hasLink: ed.isActive("link"),
      };
    },
  });

  const headingLabel = HEADINGS.find(h => h.level === state?.heading)?.label ?? "Normal text";
  const AlignIcon =
    state?.align === "center" ? AlignCenter : state?.align === "right" ? AlignRight : state?.align === "justify" ? AlignJustify : AlignLeft;
  const currentSize = fontSizeToPx(state?.fontSize ?? null, 16);

  const togglePanel = (p: Exclude<typeof openPanel, null>) => {
    setOpenPanel(v => (v === p ? null : p));
    setLinkSheetOpen(false);
    setInsertSheetOpen(false);
  };

  const openLinkPanel = () => {
    if (isMobile) {
      setInsertSheetOpen(false);
      setLinkSheetOpen(true);
    } else {
      setOpenPanel("link");
    }
  };

  const applyColor = (value: string | null) => {
    if (value === null) editor.chain().focus().unsetColor().run();
    else editor.chain().focus().setColor(value).run();
    close();
  };

  const activeColorName =
    TEXT_COLOR_SWATCHES.find(s => s.value && s.value.toLowerCase() === state?.color?.toLowerCase())?.name ?? (state?.color ? "Custom" : "Default");

  const insertItems = [
    { key: "section", label: "New section", desc: "Start a new article section", icon: Heading2, run: onInsertSection },
    { key: "reference", label: "Supporting material", desc: "Add an image, quote or note to a section", icon: Paperclip, run: onInsertReference },
    { key: "image", label: "Image", desc: "Upload a picture from your device", icon: ImageIcon, run: onInsertImage },
    { key: "attach", label: "Attach course or material", desc: "Reference library content", icon: BookOpen, run: onAttachInline },
    { key: "link", label: "Link", desc: "Add a web link to selected text", icon: Link2, run: openLinkPanel, keepOpen: true },
    { key: "highlight", label: "Highlight", desc: "Mark text with a color", icon: Highlighter, run: () => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run() },
    { key: "task", label: "Task list", desc: "Checkable to-do items", icon: CheckSquare, run: () => editor.chain().focus().toggleTaskList().run() },
    { key: "code", label: "Code", desc: "Format text as code", icon: Code, run: () => editor.chain().focus().toggleCode().run() },
    { key: "divider", label: "Divider", desc: "Insert a horizontal line", icon: Minus, run: () => editor.chain().focus().setHorizontalRule().run() },
    { key: "clear", label: "Clear formatting", desc: "Remove bold, color, size, links", icon: Eraser, run: () => editor.chain().focus().unsetAllMarks().run() },
  ];


  const renderInsertMenu = (large: boolean) => (
    <div role="listbox" aria-label="Insert">
      {insertItems.map(it => (
        <button
          key={it.key}
          type="button"
          onClick={() => { it.run(); if (!it.keepOpen) { close(); setInsertSheetOpen(false); } }}
          className={cn(
            "w-full flex items-start gap-3 rounded-lg hover:bg-surface-container transition-colors text-left",
            large ? "px-3 py-3.5" : "px-3 py-2.5"
          )}
        >
          <span className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
            <it.icon className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-medium text-on-surface">{it.label}</span>
            <span className="block text-xs text-on-surface-variant">{it.desc}</span>
          </span>
        </button>
      ))}
    </div>
  );

  // Scrollable row with a subtle right-edge fade hinting more controls.
  const ScrollRow = ({ children }: { children: React.ReactNode }) => (
    <div className="relative flex-1 min-w-0">
      <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar px-2 py-1">{children}</div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-surface-container-lowest/90 to-transparent md:hidden" aria-hidden />
    </div>
  );

  return (
    <header className="editor-toolbar sticky top-16 z-40 bg-surface-container-lowest/95 backdrop-blur-sm border-b border-outline-variant/15 shadow-sm">
      <div className="max-w-5xl mx-auto">
        {/* ── Mobile: two compact rows ─────────────────────────────────── */}
        <div className="md:hidden">
          {/* Row 1 — text formatting */}
          <div className="flex items-stretch">
            <ScrollRow>
              <LabelBtn
                ref={paragraphRef}
                label={headingLabel}
                open={openPanel === "paragraph"}
                onClick={() => togglePanel("paragraph")}
                icon={<Type className="h-3.5 w-3.5 shrink-0" />}
              />
              <ToolbarDivider />
              <IconBtn label="Bold" active={state?.isBold} onClick={() => editor.chain().focus().toggleBold().run()}>
                <Bold className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Italic" active={state?.isItalic} onClick={() => editor.chain().focus().toggleItalic().run()}>
                <Italic className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Underline" active={state?.isUnderline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                <UnderlineIcon className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Strikethrough" active={state?.isStrike} onClick={() => editor.chain().focus().toggleStrike().run()}>
                <Strikethrough className="h-4 w-4" />
              </IconBtn>
              <ToolbarDivider />
              <button
                ref={colorRef}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={openPanel === "color"}
                aria-label={`Text color (${activeColorName})`}
                title="Text color"
                onClick={() => togglePanel("color")}
                className={cn(
                  "h-10 w-10 shrink-0 rounded-lg flex flex-col items-center justify-center gap-[3px] transition-all",
                  state?.color ? "bg-primary-container/70" : "hover:bg-surface-container"
                )}
              >
                <span className="text-sm font-bold leading-none text-on-surface">A</span>
                <span className="h-[3px] w-5 rounded-full" style={{ background: state?.color ?? "rgb(var(--c-outline))" }} />
              </button>
              <button
                ref={sizeRef}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={openPanel === "size"}
                aria-label={`Text size (${currentSize}px)`}
                title="Text size"
                onClick={() => togglePanel("size")}
                className={cn(
                  "h-10 shrink-0 flex items-center gap-1 px-2.5 rounded-lg text-xs font-semibold transition-all",
                  state?.fontSize ? "bg-primary-container/70 text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container"
                )}
              >
                <span className="text-sm font-bold leading-none">A</span>
                <span className="text-[10px] font-semibold">{currentSize}</span>
              </button>
            </ScrollRow>
          </div>

          {/* Row 2 — paragraph, insert, history */}
          <div className="flex items-stretch border-t border-outline-variant/10">
            <ScrollRow>
              <LabelBtn
                ref={alignRef}
                label={state?.align === "left" ? "Left" : state?.align === "justify" ? "Justify" : state?.align === "center" ? "Center" : "Right"}
                open={openPanel === "align"}
                onClick={() => togglePanel("align")}
                icon={<AlignIcon className="h-4 w-4 shrink-0" />}
              />
              <LabelBtn
                ref={listRef}
                label={state?.bulletOn ? "Bullets" : state?.orderedOn ? "Numbered" : "List"}
                open={openPanel === "list"}
                onClick={() => togglePanel("list")}
                active={state?.bulletOn || state?.orderedOn}
                icon={state?.orderedOn ? <ListOrdered className="h-4 w-4 shrink-0" /> : <List className="h-4 w-4 shrink-0" />}
              />
              <IconBtn label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                <Quote className="h-4 w-4" />
              </IconBtn>
              <ToolbarDivider />
              <LabelBtn
                ref={insertRef}
                label="Insert"
                open={openPanel === "insert"}
                onClick={() => { setInsertSheetOpen(true); }}
                icon={<Plus className="h-4 w-4 shrink-0" />}
              />
              <ToolbarDivider />
              <IconBtn label="Undo" disabled={!state?.canUndo} onClick={() => editor.chain().focus().undo().run()}>
                <Undo className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Redo" disabled={!state?.canRedo} onClick={() => editor.chain().focus().redo().run()}>
                <Redo className="h-4 w-4" />
              </IconBtn>
            </ScrollRow>
            {rightSlot && (
              <div className="shrink-0 flex items-center gap-1.5 pl-2 pr-3 border-l border-outline-variant/15">
                {rightSlot}
              </div>
            )}
          </div>
        </div>

        {/* ── Desktop: single row ──────────────────────────────────────── */}
        <div className="hidden md:flex items-stretch">
          <div className="flex-1 flex items-center gap-0.5 overflow-x-auto no-scrollbar px-2 py-1.5">
            <LabelBtn
              ref={paragraphRef}
              label={headingLabel}
              open={openPanel === "paragraph"}
              onClick={() => togglePanel("paragraph")}
              icon={<Type className="h-3.5 w-3.5 shrink-0" />}
            />
            <ToolbarDivider />
            <IconBtn label="Bold" active={state?.isBold} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="Italic" active={state?.isItalic} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="Underline" active={state?.isUnderline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <UnderlineIcon className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="Strikethrough" active={state?.isStrike} onClick={() => editor.chain().focus().toggleStrike().run()}>
              <Strikethrough className="h-4 w-4" />
            </IconBtn>
            <ToolbarDivider />
            <button
              ref={colorRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={openPanel === "color"}
              aria-label={`Text color (${activeColorName})`}
              title={`Text color — ${activeColorName}`}
              onClick={() => togglePanel("color")}
              className={cn(
                "h-9 w-9 shrink-0 rounded-lg flex flex-col items-center justify-center gap-[3px] transition-all",
                state?.color ? "bg-primary-container/70" : "hover:bg-surface-container"
              )}
            >
              <span className="text-sm font-bold leading-none text-on-surface">A</span>
              <span className="h-[3px] w-5 rounded-full" style={{ background: state?.color ?? "rgb(var(--c-outline))" }} />
            </button>
            <button
              ref={sizeRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={openPanel === "size"}
              aria-label={`Text size (${currentSize}px)`}
              title="Text size"
              onClick={() => togglePanel("size")}
              className={cn(
                "h-9 shrink-0 flex items-center gap-1 px-2.5 rounded-lg text-xs font-semibold transition-all",
                state?.fontSize ? "bg-primary-container/70 text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container"
              )}
            >
              <span className="text-sm font-bold leading-none">A</span>
              <span className="text-[10px] font-semibold">{currentSize}</span>
            </button>
            <ToolbarDivider />
            <LabelBtn
              ref={alignRef}
              label={state?.align === "left" ? "Left" : state?.align === "justify" ? "Justify" : state?.align === "center" ? "Center" : "Right"}
              open={openPanel === "align"}
              onClick={() => togglePanel("align")}
              icon={<AlignIcon className="h-4 w-4 shrink-0" />}
            />
            <LabelBtn
              ref={listRef}
              label={state?.bulletOn ? "Bullets" : state?.orderedOn ? "Numbered" : "List"}
              open={openPanel === "list"}
              onClick={() => togglePanel("list")}
              active={state?.bulletOn || state?.orderedOn}
              icon={state?.orderedOn ? <ListOrdered className="h-4 w-4 shrink-0" /> : <List className="h-4 w-4 shrink-0" />}
            />
            <IconBtn label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote className="h-4 w-4" />
            </IconBtn>
            <ToolbarDivider />
            <LabelBtn
              ref={insertRef}
              label="Insert"
              open={openPanel === "insert"}
              onClick={() => { if (isMobile) setInsertSheetOpen(true); else togglePanel("insert"); }}
              icon={<Plus className="h-4 w-4 shrink-0" />}
            />
            <ToolbarDivider />
            <IconBtn label="Undo" disabled={!state?.canUndo} onClick={() => editor.chain().focus().undo().run()}>
              <Undo className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="Redo" disabled={!state?.canRedo} onClick={() => editor.chain().focus().redo().run()}>
              <Redo className="h-4 w-4" />
            </IconBtn>
          </div>
          {rightSlot && (
            <div className="shrink-0 flex items-center gap-1.5 pl-2 pr-3 border-l border-outline-variant/15">
              {rightSlot}
            </div>
          )}
        </div>
      </div>

      {/* Desktop popovers (portaled) */}
      <ToolbarPopover open={openPanel === "paragraph" && !isMobile} onClose={close} triggerRef={paragraphRef} width={200}>
        <ParagraphMenu editor={editor} onClose={close} />
      </ToolbarPopover>
      <ToolbarPopover open={openPanel === "color" && !isMobile} onClose={close} triggerRef={colorRef} width={324}>
        <ColorPickerContent current={state?.color ?? null} onPick={applyColor} />
      </ToolbarPopover>
      <ToolbarPopover open={openPanel === "size" && !isMobile} onClose={close} triggerRef={sizeRef} width={280}>
        <FontSizePanel editor={editor} onClose={close} />
      </ToolbarPopover>
      <ToolbarPopover open={openPanel === "align" && !isMobile} onClose={close} triggerRef={alignRef} width={220}>
        <AlignMenu editor={editor} onClose={close} />
      </ToolbarPopover>
      <ToolbarPopover open={openPanel === "list" && !isMobile} onClose={close} triggerRef={listRef} width={240}>
        <ListMenu editor={editor} onClose={close} />
      </ToolbarPopover>
      <ToolbarPopover open={openPanel === "insert" && !isMobile} onClose={close} triggerRef={insertRef} width={270}>
        {renderInsertMenu(false)}
      </ToolbarPopover>
      <ToolbarPopover open={openPanel === "link" && !isMobile} onClose={close} triggerRef={insertRef} width={320}>
        <LinkPanel editor={editor} onClose={close} />
      </ToolbarPopover>

      {/* Mobile bottom sheets (portaled) */}
      <BottomSheet open={openPanel === "paragraph" && isMobile} onClose={close} title="Paragraph style">
        <ParagraphMenu editor={editor} onClose={close} />
      </BottomSheet>
      <BottomSheet open={openPanel === "color" && isMobile} onClose={close} title="Text color">
        <ColorPickerContent current={state?.color ?? null} onPick={applyColor} large />
      </BottomSheet>
      <BottomSheet open={openPanel === "size" && isMobile} onClose={close} title="Text size">
        <FontSizePanel editor={editor} onClose={close} large />
      </BottomSheet>
      <BottomSheet open={openPanel === "align" && isMobile} onClose={close} title="Alignment">
        <AlignMenu editor={editor} onClose={close} />
      </BottomSheet>
      <BottomSheet open={openPanel === "list" && isMobile} onClose={close} title="Lists">
        <ListMenu editor={editor} onClose={close} />
      </BottomSheet>
      <BottomSheet open={linkSheetOpen} onClose={() => setLinkSheetOpen(false)} title={state?.hasLink ? "Edit link" : "Add link"}>
        <LinkPanel editor={editor} onClose={() => setLinkSheetOpen(false)} large />
      </BottomSheet>
      <BottomSheet open={insertSheetOpen} onClose={() => setInsertSheetOpen(false)} title="Insert">
        {renderInsertMenu(true)}
      </BottomSheet>
    </header>
  );
}