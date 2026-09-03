"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Code, Minus, Image as ImageIcon,
  Undo, Redo, Type, Highlighter, CheckSquare,
  BookOpen, ChevronDown, X, Loader2, ArrowLeft,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

const HEADINGS = [
  { label: "Normal", level: 0 },
  { label: "Heading 1", level: 1 },
  { label: "Heading 2", level: 2 },
  { label: "Heading 3", level: 3 },
  { label: "Heading 4", level: 4 },
];

const TEXT_COLORS = [
  "#1d1b17","#4d453f","#735b25","#8b4513","#1a472a",
  "#1e3a5f","#4b0082","#8b0000","#006400","#c8860a",
];

const HIGHLIGHT_COLORS = [
  "#fef08a","#bbf7d0","#bfdbfe","#fecaca","#e9d5ff",
  "#fed7aa","#f0abfc","#99f6e4","#fde68a","transparent",
];

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  disabled?: boolean;
}

function ToolbarBtn({ active, onClick, children, title, disabled }: ToolbarButtonProps) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all",
        active
          ? "bg-secondary-container/60 text-on-secondary-container"
          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarSep() {
  return <div className="w-px h-5 bg-outline-variant/30 mx-1" />;
}

function PublishDialog({ onClose, onPublish, saving }: { onClose: () => void; onPublish: (data: { title: string; summary: string; tags: string }) => void; saving: boolean }) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="elevated-surface-strong rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold font-manrope text-on-surface text-lg">Publish Article</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">This will create a new edition</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-on-surface-variant" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-on-surface block mb-1.5">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Article title…" className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-on-surface block mb-1.5">Summary</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2} placeholder="Brief summary…" className="input-field resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-on-surface block mb-1.5">Tags (comma separated)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. family-law, custody, human-rights" className="input-field" />
          </div>
          <p className="text-xs text-on-surface-variant">Articles are free to read — part of the open Law by Grace library.</p>
          <button onClick={() => onPublish({ title, summary, tags })} disabled={!title.trim() || saving} className="btn-primary w-full py-3 text-sm gap-2">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</> : <><Sparkles className="h-4 w-4" /> Publish Edition</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EditorInner() {
  const { status } = useSession();
  const router = useRouter();
  const articleSlug = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("article") : null;

  const [showPublish, setShowPublish] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [headingOpen, setHeadingOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Underline,
      Highlight.configure({ multicolor: true }),
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: "Start writing your article…" }),
      CharacterCount,
    ],
    editorProps: { attributes: { class: "tiptap-editor focus:outline-none" } },
    onUpdate: ({ editor }) => {
      setWordCount(editor.storage.characterCount.words());
    },
  });

  useEffect(() => {
    if (!editor || !articleSlug) return;
    fetch(`/api/articles/${articleSlug}`).then(r => r.json()).then(data => {
      const latestEdition = data.editions?.[0];
      if (latestEdition?.content) {
        try { editor.commands.setContent(JSON.parse(latestEdition.content)); } catch { editor.commands.setContent(latestEdition.content); }
      }
    });
  }, [editor, articleSlug]);

  const insertImage = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url && editor) editor.chain().focus().setImage({ src: data.url }).run();
  };

  const publishArticle = async (meta: { title: string; summary: string; tags: string }) => {
    if (!editor) return;
    setSaving(true);
    try {
      const content = JSON.stringify(editor.getJSON());
      let slug = articleSlug;
      if (!slug) {
        const res = await fetch("/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: meta.title, summary: meta.summary, tags: meta.tags.split(",").map(t => t.trim()).filter(Boolean) }),
        });
        const article = await res.json();
        slug = article.slug;
      } else {
        await fetch(`/api/articles/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: meta.title, summary: meta.summary, isPublished: true, tags: meta.tags.split(",").map(t => t.trim()).filter(Boolean) }),
        });
      }
      await fetch(`/api/articles/${slug}/editions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      await fetch(`/api/articles/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: true }),
      });
      setShowPublish(false);
      setSavedMsg("Published!");
      setTimeout(() => setSavedMsg(""), 3000);
      if (!articleSlug && slug) router.replace(`/editor?article=${slug}`);
    } finally {
      setSaving(false);
    }
  };

  if (!editor) return (
    <div className="min-h-screen app-ambient-bg flex items-center justify-center">
      <Navbar />
      <div className="spinner spinner-lg" />
    </div>
  );

  const currentHeading = HEADINGS.find(h => h.level > 0 ? editor.isActive("heading", { level: h.level }) : !editor.isActive("heading")) || HEADINGS[0];

  return (
    <div className="min-h-screen app-ambient-bg">
      <Navbar />

      {/* Editor Toolbar */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-sm border-b border-outline-variant/15 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-2">
          {/* Row 1 */}
          <div className="flex items-center gap-0.5 flex-wrap">
            {/* Heading dropdown */}
            <div className="relative">
              <button onClick={() => setHeadingOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container transition-colors">
                <Type className="h-3.5 w-3.5" />
                {currentHeading.label}
                <ChevronDown className="h-3 w-3 text-on-surface-variant" />
              </button>
              <AnimatePresence>
                {headingOpen && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="absolute top-10 left-0 z-50 elevated-surface-strong rounded-xl overflow-hidden min-w-[160px] py-1">
                    {HEADINGS.map(h => (
                      <button key={h.level} onClick={() => { if (h.level === 0) { editor.chain().focus().setParagraph().run(); } else { editor.chain().focus().toggleHeading({ level: h.level as 1|2|3|4 }).run(); } setHeadingOpen(false); }}
                        className={cn("w-full text-left px-4 py-2 text-sm hover:bg-surface-container transition-colors", h.level === 0 ? "text-on-surface" : "", h.level === 1 ? "text-xl font-bold font-manrope" : "", h.level === 2 ? "text-lg font-bold font-manrope" : "", h.level === 3 ? "text-base font-semibold font-manrope" : "", h.level === 4 ? "text-sm font-semibold font-manrope" : "")}>
                        {h.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <ToolbarSep />
            <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarSep />
            {/* Text color */}
            <div className="relative">
              <button onClick={() => setColorOpen(v => !v)} title="Text color"
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container transition-colors">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-bold text-on-surface" style={{ fontSize: 11 }}>A</span>
                  <div className="h-1 w-5 rounded-full" style={{ background: editor.getAttributes("textStyle").color || "rgb(var(--c-secondary))" }} />
                </div>
              </button>
              <AnimatePresence>
                {colorOpen && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="absolute top-10 left-0 z-50 elevated-surface-strong rounded-xl p-3">
                    <div className="grid grid-cols-5 gap-1.5">
                      {TEXT_COLORS.map(c => (
                        <button key={c} onClick={() => { editor.chain().focus().setColor(c).run(); setColorOpen(false); }}
                          className="w-6 h-6 rounded-full border-2 border-white/20 hover:scale-110 transition-transform"
                          style={{ background: c }} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Highlight */}
            <div className="relative">
              <button onClick={() => setHighlightOpen(v => !v)} title="Highlight"
                className={cn("w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container transition-colors", editor.isActive("highlight") ? "bg-secondary-container/60" : "")}>
                <Highlighter className="h-3.5 w-3.5 text-on-surface-variant" />
              </button>
              <AnimatePresence>
                {highlightOpen && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="absolute top-10 left-0 z-50 elevated-surface-strong rounded-xl p-3">
                    <div className="grid grid-cols-5 gap-1.5">
                      {HIGHLIGHT_COLORS.map(c => (
                        <button key={c} onClick={() => { if (c === "transparent") { editor.chain().focus().unsetHighlight().run(); } else { editor.chain().focus().setHighlight({ color: c }).run(); } setHighlightOpen(false); }}
                          className="w-6 h-6 rounded border border-outline-variant/30 hover:scale-110 transition-transform text-[9px] font-bold"
                          style={{ background: c || "white" }}>
                          {c === "transparent" && "×"}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <ToolbarSep />
            <ToolbarBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align left"><AlignLeft className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Center"><AlignCenter className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align right"><AlignRight className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justify"><AlignJustify className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><List className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list"><ListOrdered className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Task list"><CheckSquare className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote"><Quote className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code"><Code className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block"><Code className="h-4 w-4" /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn onClick={() => fileInputRef.current?.click()} title="Insert image"><ImageIcon className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarSep />
            <span className="text-[11px] text-on-surface-variant ml-1">{wordCount} words</span>
            <div className="flex-1" />
            {savedMsg && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-secondary font-medium mr-2">{savedMsg}</motion.span>}
            <button onClick={() => setShowPublish(true)} className="btn-primary px-4 py-1.5 text-xs gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Publish Article
            </button>
          </div>
        </div>
      </div>

      {/* Editor content */}
      <div className="pt-32 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          {/* Back button */}
          <div className="mb-8">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </div>

          {/* Tiptap editor */}
          <div className="tiptap-editor min-h-[70vh]">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && insertImage(e.target.files[0])} />

      <AnimatePresence>
        {showPublish && <PublishDialog onClose={() => setShowPublish(false)} onPublish={publishArticle} saving={saving} />}
      </AnimatePresence>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="spinner spinner-lg" /></div>}>
      <EditorInner />
    </Suspense>
  );
}
