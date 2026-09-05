"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2, BookOpen, Link2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CourseSummary } from "./AttachmentPicker";

interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
  initialTitle: string;
  initialSummary: string;
  initialTags: string;
  referenceCourse: CourseSummary | null;
  saving: boolean;
  serverError: string | null;
  onPublish: (meta: { title: string; summary: string; tags: string }) => void;
  onAttachReference: () => void;
}

export function PublishDialog({
  open, onClose, initialTitle, initialSummary, initialTags,
  referenceCourse, saving, serverError, onPublish, onAttachReference,
}: PublishDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState(initialSummary);
  const [tags, setTags] = useState(initialTags);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setSummary(initialSummary);
      setTags(initialTags);
    }
  }, [open, initialTitle, initialSummary, initialTags]);

  const canPublish = !!title.trim() && !!referenceCourse;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={onClose}
          aria-hidden
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.18 }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Publish article"
            className="elevated-surface-strong rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[88vh] overflow-y-auto pb-safe"
          >
            <div className="sticky top-0 z-10 bg-surface-container-lowest rounded-t-2xl border-b border-outline-variant/20 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold font-manrope text-on-surface text-lg">Publish article</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Creates a new edition for readers</p>
              </div>
              <button onClick={onClose} aria-label="Close" className="p-2 -mr-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Reference course gate */}
              {referenceCourse ? (
                <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-container-high flex items-center justify-center border border-outline-variant/20">
                    {referenceCourse.banner ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={referenceCourse.banner} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary/80">
                      <CheckCircle2 className="h-3 w-3" /> Reference course
                    </p>
                    <p className="text-sm font-semibold font-manrope text-on-surface truncate">{referenceCourse.title}</p>
                  </div>
                  <button type="button" onClick={onAttachReference} className="text-xs font-semibold text-primary hover:underline shrink-0">
                    Change
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-error/50 bg-error-container/20 p-3.5">
                  <p className="text-sm font-semibold font-manrope text-error">A reference course is required</p>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Every article must be about a specific course. Attach one to publish this article.
                  </p>
                  <button
                    type="button"
                    onClick={onAttachReference}
                    className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-error text-on-error text-sm font-semibold hover:brightness-110 transition-all"
                  >
                    <Link2 className="h-4 w-4" /> Attach reference course
                  </button>
                </div>
              )}

              {/* Server-side error (e.g. reference removed between check and publish) */}
              {serverError && (
                <div className="rounded-xl border border-error/40 bg-error-container/20 px-3.5 py-3 text-sm text-error">
                  {serverError}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-on-surface block mb-1.5">Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Article title…" className="input-field" />
              </div>

              <div>
                <label className="text-sm font-medium text-on-surface block mb-1.5">Summary</label>
                <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2} placeholder="Brief summary shown to readers…" className="input-field resize-none" />
              </div>

              <div>
                <label className="text-sm font-medium text-on-surface block mb-1.5">Tags (comma separated)</label>
                <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. family-law, custody, human-rights" className="input-field" />
              </div>

              <p className="text-xs text-on-surface-variant">Articles are free to read — part of the open library of THE LAW With Gracious.</p>

              <button
                type="button"
                onClick={() => onPublish({ title, summary, tags })}
                disabled={saving || !canPublish}
                title={canPublish ? undefined : referenceCourse ? "Add a title to publish" : "Attach a reference course to publish"}
                className={cn("btn-primary w-full py-3 text-sm gap-2", !canPublish && "opacity-50")}
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</> : <><Sparkles className="h-4 w-4" /> Publish edition</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}