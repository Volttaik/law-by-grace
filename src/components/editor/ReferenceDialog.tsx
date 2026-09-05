"use client";

import { useState, useEffect, useRef } from "react";
import { Image as ImageIcon, Quote, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { cn } from "@/lib/utils";
import { emptySectionReference, type SectionReferenceAttrs } from "./extensions/section-reference";

interface ReferenceDialogProps {
  open: boolean;
  onClose: () => void;
  /** Prefilled attributes when editing an existing reference. */
  initial?: SectionReferenceAttrs | null;
  onSave: (attrs: SectionReferenceAttrs) => void;
}

const TYPE_TABS = [
  { key: "image", label: "Image", icon: ImageIcon },
  { key: "quote", label: "Quote", icon: Quote },
  { key: "text", label: "Text note", icon: FileText },
] as const;

export function ReferenceDialog({ open, onClose, initial, onSave }: ReferenceDialogProps) {
  const [type, setType] = useState<"image" | "quote" | "text">("image");
  const [src, setSrc] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [quote, setQuote] = useState("");
  const [source, setSource] = useState("");
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setType(initial?.type === "quote" || initial?.type === "text" ? initial.type : "image");
    setSrc(initial?.src ?? null);
    setAlt(initial?.alt ?? "");
    setCaption(initial?.caption ?? "");
    setQuote(initial?.quote ?? "");
    setSource(initial?.source ?? "");
    setText(initial?.text ?? "");
    setError("");
  }, [open, initial]);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Images must be under 10 MB."); return; }
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      setSrc(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The image couldn't be uploaded.");
    } finally {
      setUploading(false);
    }
  };

  const save = () => {
    const attrs = emptySectionReference(type);
    if (type === "image") {
      if (!src) { setError("Choose an image for the reference."); return; }
      attrs.src = src;
      attrs.alt = alt;
      attrs.caption = caption;
    } else if (type === "quote") {
      if (!quote.trim()) { setError("Enter the quote text."); return; }
      attrs.quote = quote.trim();
      attrs.source = source.trim();
    } else {
      if (!text.trim()) { setError("Enter the note text."); return; }
      attrs.text = text.trim();
    }
    onSave(attrs);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} centered title={initial ? "Edit reference" : "Add supporting material"}>
      <p className="text-sm text-on-surface-variant mb-4">
        Supporting material belongs to the section it's placed in — readers will see it visually connected to that section.
      </p>

      {/* Type tabs */}
      <div className="flex rounded-xl overflow-hidden border border-outline-variant/25 mb-4">
        {TYPE_TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-sm font-medium transition-colors",
              type === t.key ? "bg-secondary-container/60 text-on-secondary-container" : "text-on-surface-variant hover:bg-surface-container"
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {type === "image" && (
        <div>
          {src ? (
            <div className="relative rounded-xl overflow-hidden border border-outline-variant/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt || "Reference image"} className="w-full max-h-56 object-contain bg-surface-container-low" />
              <button
                type="button"
                onClick={() => setSrc(null)}
                aria-label="Remove image"
                className="absolute top-2 right-2 p-2 rounded-lg bg-surface-container-lowest/90 border border-outline-variant/40 text-on-surface-variant hover:text-error transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed border-outline-variant/50 text-on-surface-variant hover:border-primary/50 hover:text-primary transition-colors"
            >
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
              <span className="text-sm font-medium">{uploading ? "Uploading…" : "Upload an image"}</span>
              <span className="text-xs opacity-70">Screenshots, case pages, diagrams…</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          {src && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-sm font-medium text-on-surface block mb-1.5">Caption (optional)</label>
                <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="What does this image show?" className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium text-on-surface block mb-1.5">Alt text (optional)</label>
                <input value={alt} onChange={e => setAlt(e.target.value)} placeholder="Describe the image" className="input-field" />
              </div>
            </div>
          )}
        </div>
      )}

      {type === "quote" && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-on-surface block mb-1.5">Quote *</label>
            <textarea value={quote} onChange={e => setQuote(e.target.value)} rows={3} placeholder="The key line from the case, statute or source…" className="input-field resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-on-surface block mb-1.5">Source (optional)</label>
            <input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. S. 21(1), Constitution of Nigeria 1999" className="input-field" />
          </div>
        </div>
      )}

      {type === "text" && (
        <div>
          <label className="text-sm font-medium text-on-surface block mb-1.5">Note *</label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={4} placeholder="A short supporting note or highlighted passage…" className="input-field resize-none" />
        </div>
      )}

      {error && <p className="text-sm text-error mt-3">{error}</p>}

      <button type="button" onClick={save} className="btn-primary w-full mt-5 py-3">
        {initial ? "Save changes" : "Add reference"}
      </button>
    </BottomSheet>
  );
}