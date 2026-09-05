"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
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
import Link from "next/link";
import {
  ArrowLeft, Loader2, Cloud, CloudUpload, Check, AlertTriangle, X,
  BookOpen, ExternalLink, PenLine, Plus, ImagePlus,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";
import { Toolbar } from "@/components/editor/Toolbar";
import { AttachmentPicker, type CourseSummary, type MaterialSummary } from "@/components/editor/AttachmentPicker";
import { ReferenceCourseBar } from "@/components/editor/ReferenceCourseBar";
import { PublishDialog } from "@/components/editor/PublishDialog";
import { ImageView } from "@/components/editor/ImageView";
import { ArticleAttachmentView } from "@/components/editor/ArticleAttachmentView";
import { FontSize } from "@/components/editor/extensions/font-size";
import { ArticleAttachment, courseAttachment, materialAttachment } from "@/components/editor/extensions/article-attachment";
import { SectionReference, emptySectionReference, type SectionReferenceAttrs } from "@/components/editor/extensions/section-reference";
import { ReferenceDialog } from "@/components/editor/ReferenceDialog";
import { SectionReferenceView } from "@/components/editor/SectionReferenceView";
import { SectionHeadingView } from "@/components/editor/SectionHeadingView";
import { editorActions } from "@/components/editor/actions";

const ImageWithActions = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

const AttachmentWithActions = ArticleAttachment.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ArticleAttachmentView);
  },
});

const SectionReferenceWithActions = SectionReference.extend({
  addNodeView() {
    return ReactNodeViewRenderer(SectionReferenceView);
  },
});

/** Level-2 headings are article sections — render them with section controls. */
const SectionHeadingWithActions = Heading.extend({
  addNodeView() {
    return ReactNodeViewRenderer(SectionHeadingView);
  },
});

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

function EditorInner() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const articleSlug = searchParams.get("article");

  // ── Article state ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [referenceCourse, setReferenceCourse] = useState<CourseSummary | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // ── Save state ─────────────────────────────────────────────────────────────
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [publishedMsg, setPublishedMsg] = useState("");

  // ── Publish state ──────────────────────────────────────────────────────────
  const [showPublish, setShowPublish] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [referenceError, setReferenceError] = useState(false);

  // ── Pickers / uploads ──────────────────────────────────────────────────────
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachMode, setAttachMode] = useState<"reference" | "inline">("reference");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [refDialogOpen, setRefDialogOpen] = useState(false);
  const [refDialogInitial, setRefDialogInitial] = useState<SectionReferenceAttrs | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Where the next uploaded image / created reference should land (set by the
  // section controls so content attaches to the section it was added from).
  const pendingImagePosRef = useRef<number | null>(null);
  const pendingRefPosRef = useRef<number | null>(null);

  // ── Autosave plumbing (refs keep timers/values out of stale closures) ─────
  const slugRef = useRef<string | null>(null);
  const titleRef = useRef(title);
  const summaryRef = useRef(summary);
  const tagsRef = useRef(tags);
  const referenceRef = useRef<CourseSummary | null>(null);
  const bannerRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedForRef = useRef<string | null>(null);
  const suppressAutosaveRef = useRef(false);
  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { summaryRef.current = summary; }, [summary]);
  useEffect(() => { tagsRef.current = tags; }, [tags]);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  const persist = useCallback(async (immediate = false) => {
    const editor = editorRef.current;
    if (!editor) return;
    if (!dirtyRef.current && !immediate) return;
    if (!immediate && saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    try {
      const content = JSON.stringify(editor.getJSON());
      let slug = slugRef.current;
      if (!slug) {
        const res = await fetch("/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: titleRef.current.trim() || "Untitled draft" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.slug) throw new Error(data.error || "Couldn't create the article.");
        slug = data.slug;
        slugRef.current = slug;
        // The load effect must not clobber the document we just saved.
        loadedForRef.current = slug;
        router.replace(`/editor?article=${slug}`, { scroll: false });
      }
      const res = await fetch(`/api/articles/${slug}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          title: titleRef.current,
          summary: summaryRef.current,
          tags: tagsRef.current,
          referenceCourseId: referenceRef.current?.id ?? null,
          coverImage: bannerRef.current ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save the draft.");
      dirtyRef.current = false;
      setSaveState("saved");
      setSavedAt(new Date());
    } catch (err) {
      setSaveState("error");
    }
  }, [router]);

  const persistRef = useRef(persist);
  useEffect(() => { persistRef.current = persist; }, [persist]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setSaveState("dirty");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { persistRef.current(true); }, 1200);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      SectionHeadingWithActions,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      FontSize,
      Underline,
      Highlight.configure({ multicolor: true }),
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      ImageWithActions.configure({ inline: false, allowBase64: true }),
      AttachmentWithActions,
      SectionReferenceWithActions,
      Placeholder.configure({ placeholder: "Start writing your article…" }),
      CharacterCount,
    ],
    editorProps: { attributes: { class: "tiptap-editor focus:outline-none" } },
    onCreate: ({ editor: ed }) => {
      editorRef.current = ed;
    },
    onUpdate: ({ editor: ed }) => {
      if (suppressAutosaveRef.current) return;
      setWordCount(ed.storage.characterCount.words());
      markDirty();
    },
  });

  useEffect(() => { editorRef.current = editor; }, [editor]);

  // ── Load an existing article (or its draft) ────────────────────────────────
  useEffect(() => {
    if (!editor) return;
    if (!articleSlug) {
      // Fresh article — nothing to load from the server.
      setLoaded(true);
      return;
    }
    if (loadedForRef.current === articleSlug) {
      // Just saved this article locally; don't clobber the document.
      setLoaded(true);
      return;
    }
    loadedForRef.current = articleSlug;

    (async () => {
      try {
        const res = await fetch(`/api/articles/${articleSlug}`);
        const data = await res.json();
        if (data.error || !data.id) {
          router.push("/articles");
          return;
        }
        slugRef.current = articleSlug;
        setTitle(data.title ?? "");
        setSummary(data.summary ?? "");
        setTags(Array.isArray(data.tags) ? data.tags.join(", ") : "");
        if (data.referenceCourse) {
          const rc = data.referenceCourse as CourseSummary;
          setReferenceCourse(rc);
          referenceRef.current = rc;
        }
        const cv = typeof data.coverImage === "string" ? data.coverImage : null;
        setBanner(cv);
        bannerRef.current = cv;

        // Prefer the in-progress draft; fall back to the latest published edition.
        let content: string | null = null;
        const draftRes = await fetch(`/api/articles/${articleSlug}/draft`).catch(() => null);
        if (draftRes?.ok) {
          const draft = await draftRes.json().catch(() => ({}));
          if (draft.content) content = draft.content;
        }
        if (!content && data.editions?.[0]?.content) content = data.editions[0].content;
        if (content) {
          suppressAutosaveRef.current = true;
          try { editor.commands.setContent(JSON.parse(content)); }
          catch { editor.commands.setContent(content); }
          suppressAutosaveRef.current = false;
          setWordCount(editor.storage.characterCount.words());
        }
      } catch {
        router.push("/articles");
      } finally {
        setLoaded(true);
      }
    })();
  }, [editor, articleSlug, router]);

  // ── Flush pending changes when the page is hidden/unloaded ─────────────────
  useEffect(() => {
    const flush = () => {
      const ed = editorRef.current;
      if (!dirtyRef.current || !ed) return;
      const slug = slugRef.current;
      if (!slug) return;
      const payload = JSON.stringify({
        content: JSON.stringify(ed.getJSON()),
        title: titleRef.current,
        summary: summaryRef.current,
        tags: tagsRef.current,
        referenceCourseId: referenceRef.current?.id ?? null,
      });
      navigator.sendBeacon(`/api/articles/${slug}/draft`, new Blob([payload], { type: "application/json" }));
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, []);

  // ── Cmd/Ctrl+S saves immediately ────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        persistRef.current(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Expose pickers to NodeViews (replace/edit actions) ─────────────────────
  useEffect(() => {
    editorActions.openInlinePicker = () => { setAttachMode("inline"); setAttachOpen(true); };
    editorActions.openReferenceEditor = (attrs) => {
      // Editing an existing node — not inserting into a section.
      pendingRefPosRef.current = null;
      setRefDialogInitial(attrs);
      setRefDialogOpen(true);
    };
    editorActions.openSectionImagePicker = (pos) => {
      pendingImagePosRef.current = pos;
      fileInputRef.current?.click();
    };
    editorActions.openSectionReference = (pos) => {
      pendingRefPosRef.current = pos;
      setRefDialogInitial(null);
      setRefDialogOpen(true);
    };
  }, []);

  // ── Sections & references ──────────────────────────────────────────────────
  const insertSection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.chain().focus().insertContent([
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Section title" }] },
      { type: "paragraph" },
    ]).run();
  }, []);

  /** Append a new section at the end of the article and select its title. */
  const addSectionAtEnd = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const pos = editor.state.doc.content.size;
    const placeholder = "Section title";
    editor.chain()
      .focus()
      .insertContentAt(pos, [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: placeholder }] },
        { type: "paragraph" },
      ])
      .setTextSelection({ from: pos + 1, to: pos + 1 + placeholder.length })
      .run();
  }, []);

  /** Attach an image to the end of the article (its last section). */
  const addImageAtEnd = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    pendingImagePosRef.current = editor.state.doc.content.size;
    fileInputRef.current?.click();
  }, []);

  const handleSaveReference = useCallback((attrs: SectionReferenceAttrs) => {
    const editor = editorRef.current;
    if (!editor) return;
    const pendingPos = pendingRefPosRef.current;
    if (pendingPos != null) {
      // Inserted from a section's controls — attach to the end of that section.
      pendingRefPosRef.current = null;
      editor.chain().focus().insertContentAt(pendingPos, { type: "sectionReference", attrs }).run();
      return;
    }
    const sel = editor.state.selection as unknown as { node?: { type: { name: string } } };
    if (sel?.node?.type?.name === "sectionReference") {
      editor.chain().focus().updateSectionReference(attrs).run();
    } else {
      editor.chain().focus().setSectionReference(attrs).run();
    }
  }, []);

  // ── Banner ──────────────────────────────────────────────────────────────────
  const handleBannerUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { setUploadError("Please choose an image file for the banner."); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError("Banner images must be under 10 MB."); return; }
    setUploadingBanner(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "The banner couldn't be uploaded.");
      bannerRef.current = data.url;
      setBanner(data.url);
      persistRef.current(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "The banner couldn't be uploaded.");
    } finally {
      setUploadingBanner(false);
    }
  }, []);

  const handleBannerRemove = useCallback(() => {
    bannerRef.current = null;
    setBanner(null);
    persistRef.current(true);
  }, []);

  // ── Reference course ───────────────────────────────────────────────────────
  const openReferencePicker = useCallback(() => {
    setPublishError(null);
    setReferenceError(false);
    setAttachMode("reference");
    setAttachOpen(true);
    setShowPublish(false);
  }, []);

  /** Insert (or replace the selected) attachment node with the given content. */
  const insertAttachment = useCallback((attrs: { type: string; id: string; slug: string; title: string; subtitle: string; url: string }) => {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = editor.state.selection as unknown as { node?: { type: { name: string } } };
    if (sel?.node?.type?.name === "articleAttachment") {
      editor.chain().focus().updateArticleAttachment(attrs).run();
    } else {
      editor.chain().focus().setArticleAttachment(attrs).run();
    }
  }, []);

  const handleSelectCourse = useCallback((course: CourseSummary) => {
    if (attachMode === "reference") {
      referenceRef.current = course;
      setReferenceCourse(course);
      setReferenceError(false);
      persistRef.current(true);
    } else {
      insertAttachment(courseAttachment(course));
    }
  }, [attachMode, insertAttachment]);

  const handleSelectMaterial = useCallback((material: MaterialSummary) => {
    if (attachMode === "inline") insertAttachment(materialAttachment(material));
  }, [attachMode, insertAttachment]);

  const handleRemoveReference = useCallback(() => {
    referenceRef.current = null;
    setReferenceCourse(null);
    persistRef.current(true);
  }, []);

  // ── Images ──────────────────────────────────────────────────────────────────
  const insertImage = useCallback(async (file: File) => {
    if (!editorRef.current) return;
    if (!file.type.startsWith("image/")) { setUploadError("Please choose an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError("Images must be under 10 MB."); return; }
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "The image couldn't be uploaded.");
      const pos = pendingImagePosRef.current;
      pendingImagePosRef.current = null;
      if (pos != null) {
        // Attached to a specific section (added from its controls).
        editorRef.current.chain().focus().insertContentAt(pos, { type: "image", attrs: { src: data.url, alt: file.name } }).run();
      } else {
        editorRef.current.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "The image couldn't be uploaded. Try again.");
    } finally {
      setUploading(false);
    }
  }, []);

  // ── Publish ─────────────────────────────────────────────────────────────────
  const publishArticle = useCallback(async (meta: { title: string; summary: string; tags: string }) => {
    const editor = editorRef.current;
    if (!editor) return;

    // Frontend gate — the server re-validates.
    if (!referenceRef.current) {
      setReferenceError(true);
      setPublishError("A reference course is required before publishing.");
      setShowPublish(false);
      setAttachMode("reference");
      setAttachOpen(true);
      return;
    }

    setSaving(true);
    setPublishError(null);
    try {
      const content = JSON.stringify(editor.getJSON());
      const tagsArr = meta.tags.split(",").map(t => t.trim()).filter(Boolean);

      let slug = slugRef.current;
      if (!slug) {
        const res = await fetch("/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: meta.title.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.slug) throw new Error(data.error || "Couldn't create the article.");
        slug = data.slug;
        slugRef.current = slug;
      }

      // Persist content + metadata (including the reference) before publishing.
      const draftRes = await fetch(`/api/articles/${slug}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          title: meta.title,
          summary: meta.summary,
          tags: tagsArr,
          referenceCourseId: referenceRef.current.id,
          coverImage: bannerRef.current ?? null,
        }),
      });
      const draftData = await draftRes.json().catch(() => ({}));
      if (!draftRes.ok) throw new Error(draftData.error || "Couldn't save the article before publishing.");

      // Server-side reference validation happens here.
      const edRes = await fetch(`/api/articles/${slug}/editions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const edData = await edRes.json().catch(() => ({}));
      if (!edRes.ok) throw new Error(edData.error || "Couldn't publish the edition.");

      const pubRes = await fetch(`/api/articles/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: true }),
      });
      const pubData = await pubRes.json().catch(() => ({}));
      if (!pubRes.ok) throw new Error(pubData.error || "Couldn't mark the article as published.");

      // The published edition is now the source of truth — drop the draft.
      await fetch(`/api/articles/${slug}/draft`, { method: "DELETE" }).catch(() => {});

      dirtyRef.current = false;
      setShowPublish(false);
      setSaveState("saved");
      setSavedAt(new Date());
      loadedForRef.current = slug;
      if (slug !== articleSlug) router.replace(`/editor?article=${slug}`, { scroll: false });
      if (slug) setPublishedMsg(slug);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong while publishing.";
      setPublishError(msg);
      setShowPublish(true);
      // A reference problem sends the author straight back to the attachment control.
      if (/reference course/i.test(msg)) {
        setShowPublish(false);
        setAttachMode("reference");
        setAttachOpen(true);
      }
    } finally {
      setSaving(false);
    }
  }, [articleSlug, router]);

  const handlePublishClick = useCallback(() => {
    setReferenceError(false);
    if (!referenceRef.current) {
      setReferenceError(true);
      setAttachMode("reference");
      setAttachOpen(true);
      return;
    }
    setPublishError(null);
    setShowPublish(true);
  }, []);

  // ── Rendering ───────────────────────────────────────────────────────────────
  if (!editor || !loaded) {
    return (
      <div className="min-h-screen app-ambient-bg flex items-center justify-center">
        <Navbar />
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const saveLabel =
    saveState === "saving" ? "Saving…" :
    saveState === "dirty" ? "Saving…" :
    saveState === "error" ? "Save failed" :
    saveState === "saved" && savedAt ? `Saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` :
    "Not saved yet";

  const rightSlot = (
    <>
      {/* Save status */}
      <div
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap",
          saveState === "error" ? "text-error" : "text-on-surface-variant"
        )}
        aria-live="polite"
      >
        {saveState === "saving" || saveState === "dirty" ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin sm:hidden" />
            <span className="hidden sm:inline"><Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" />{saveLabel}</span>
          </>
        ) : saveState === "error" ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5" />
            <button type="button" onClick={() => persistRef.current(true)} className="underline hover:text-error/80">Retry</button>
          </>
        ) : saveState === "saved" ? (
          <>
            <Check className={cn("text-secondary", "sm:hidden h-3.5 w-3.5")} />
            <span className="hidden sm:inline"><Check className="h-3.5 w-3.5 text-secondary inline mr-1" />{saveLabel}</span>
          </>
        ) : (
          <>
            <Cloud className="h-3.5 w-3.5 sm:hidden" />
            <span className="hidden sm:inline"><Cloud className="h-3.5 w-3.5 inline mr-1" />{saveLabel}</span>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={handlePublishClick}
        className="btn-primary px-4 py-2 text-xs gap-1.5 whitespace-nowrap"
      >
        <BookOpen className="h-3.5 w-3.5" /> Publish
      </button>
    </>
  );

  return (
    <div className="min-h-screen app-ambient-bg">
      <Navbar />

      <Toolbar
        editor={editor}
        onInsertImage={() => { pendingImagePosRef.current = null; fileInputRef.current?.click(); }}
        onAttachInline={() => { setAttachMode("inline"); setAttachOpen(true); }}
        onInsertSection={insertSection}
        onInsertReference={() => { pendingRefPosRef.current = null; setRefDialogInitial(null); setRefDialogOpen(true); }}
        rightSlot={rightSlot}
      />

      {/* Upload / save error banner */}
      {(uploadError || (saveState === "error")) && (
        <div className="fixed top-[8.5rem] left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md">
          <div className="flex items-center gap-2.5 rounded-xl border border-error/40 bg-surface-container-lowest px-4 py-3 shadow-elevation-md">
            <AlertTriangle className="h-4 w-4 text-error shrink-0" />
            <p className="text-sm text-on-surface flex-1">
              {uploadError || "Couldn't save your changes. Tap Retry in the toolbar or keep typing and we'll try again."}
            </p>
            <button
              type="button"
              onClick={() => { setUploadError(null); if (saveState === "error") persistRef.current(true); }}
              aria-label="Dismiss"
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Published confirmation */}
      {publishedMsg && (
        <div className="fixed top-[8.5rem] left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md">
          <div className="flex items-center gap-2.5 rounded-xl border border-secondary/40 bg-surface-container-lowest px-4 py-3 shadow-elevation-md">
            <Check className="h-4 w-4 text-secondary shrink-0" />
            <p className="text-sm text-on-surface flex-1">Article published!</p>
            <Link href={`/articles/${publishedMsg}`} className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              View <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setPublishedMsg("")}
              aria-label="Dismiss"
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Editor content */}
      <div className="pt-4 pb-24">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          {/* Back button */}
          <div className="mb-6">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </div>

          {/* Reference course (required) */}
          <div className="mb-6">
            <ReferenceCourseBar
              course={referenceCourse}
              onAttach={openReferencePicker}
              onRemove={handleRemoveReference}
              error={referenceError}
            />
          </div>

          {/* Title */}
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); markDirty(); }}
            placeholder="Article title"
            aria-label="Article title"
            className="w-full bg-transparent outline-none font-serif font-bold text-3xl md:text-4xl text-on-surface placeholder:text-on-surface-variant/40 leading-tight mb-6"
          />

          {/* Tiptap editor */}
          <div className="tiptap-editor min-h-[70vh]">
            <EditorContent editor={editor} />
          </div>

          {/* Add section / add image — the obvious places to grow the article */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={addSectionAtEnd}
              onMouseDown={e => e.preventDefault()}
              className="editor-add-button flex-1"
            >
              <Plus className="h-4 w-4" /> Add section
            </button>
            <button
              type="button"
              onClick={addImageAtEnd}
              onMouseDown={e => e.preventDefault()}
              className="editor-add-button flex-1"
            >
              <ImagePlus className="h-4 w-4" /> Add image
            </button>
          </div>

          {wordCount > 0 && (
            <p className="mt-10 text-[11px] text-on-surface-variant/70 border-t border-outline-variant/15 pt-4 flex items-center gap-4">
              <span><PenLine className="h-3 w-3 inline mr-1" />{wordCount} words</span>
              <span className="hidden sm:inline">Drafts autosave — you can leave anytime.</span>
            </p>
          )}
        </div>
      </div>

      {/* Hidden image input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) insertImage(file);
          e.target.value = "";
        }}
      />

      {/* Uploading indicator */}
      {uploading && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] pb-safe">
          <div className="flex items-center gap-2 rounded-full bg-surface-container-lowest border border-outline-variant/40 shadow-elevation-md px-4 py-2.5 text-sm text-on-surface">
            <CloudUpload className="h-4 w-4 text-secondary animate-pulse" /> Uploading image…
          </div>
        </div>
      )}

      {/* Attachment picker (reference course or inline content) */}
      <AttachmentPicker
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        mode={attachMode}
        onSelectCourse={handleSelectCourse}
        onSelectMaterial={handleSelectMaterial}
      />

      {/* Section reference dialog (add / edit supporting material) */}
      <ReferenceDialog
        open={refDialogOpen}
        onClose={() => { pendingRefPosRef.current = null; setRefDialogOpen(false); }}
        initial={refDialogInitial}
        onSave={handleSaveReference}
      />

      {/* Publish dialog */}
      <PublishDialog
        open={showPublish}
        onClose={() => setShowPublish(false)}
        initialTitle={title}
        initialSummary={summary}
        initialTags={tags}
        referenceCourse={referenceCourse}
        saving={saving}
        serverError={publishError}
        banner={banner}
        uploadingBanner={uploadingBanner}
        onBannerUpload={handleBannerUpload}
        onBannerRemove={handleBannerRemove}
        onPublish={publishArticle}
        onAttachReference={openReferencePicker}
      />
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