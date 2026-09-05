"use client";

import { useState } from "react";
import {
  BookOpen, Link2, X, ExternalLink, Pencil, AlertTriangle, GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CourseSummary } from "./AttachmentPicker";

interface ReferenceCourseBarProps {
  /** Currently attached reference course (resolved from the article record). */
  course: CourseSummary | null;
  /** Opens the attachment picker (search + paste link). */
  onAttach: () => void;
  /** Clears the reference course. */
  onRemove: () => void;
  /** True when the user attempted to publish without a reference course. */
  error?: boolean;
}

export function ReferenceCourseBar({ course, onAttach, onRemove, error = false }: ReferenceCourseBarProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (!course) {
    return (
      <div
        className={cn(
          "rounded-xl border p-3.5 flex items-start gap-3 transition-colors",
          error
            ? "border-error/50 bg-error-container/20"
            : "border-dashed border-outline-variant/70 bg-surface-container-low/60"
        )}
        role="region"
        aria-label="Reference course"
      >
        <div className={cn("shrink-0 w-9 h-9 rounded-lg flex items-center justify-center", error ? "bg-error/10 text-error" : "bg-secondary-container/60 text-secondary")}>
          {error ? <AlertTriangle className="h-4.5 w-4.5" /> : <GraduationCap className="h-4.5 w-4.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold font-manrope", error ? "text-error" : "text-on-surface")}>
            {error ? "A reference course is required to publish" : "Attach a reference course"}
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
            {error
              ? "Every article must be about a specific course. Attach one to continue publishing."
              : "Every article is about a specific course. Attach it before publishing."}
          </p>
        </div>
        <button
          type="button"
          onClick={onAttach}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all",
            error ? "btn-primary" : "btn-secondary"
          )}
        >
          <Link2 className="h-4 w-4" />
          Attach
        </button>
      </div>
    );
  }

  const meta = [course.courseCode, course.department, course.university].filter(Boolean).join(" · ");

  return (
    <div
      className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 flex items-center gap-3"
      role="region"
      aria-label="Reference course"
    >
      <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-surface-container-high flex items-center justify-center border border-outline-variant/20">
        {course.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.banner} alt="" className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80 mb-0.5">Reference course</p>
        <p className="text-sm font-semibold font-manrope text-on-surface truncate">{course.title}</p>
        <p className="text-xs text-on-surface-variant truncate">{meta || "Course in the library"}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Link
          href={`/courses/${course.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open course page"
          aria-label="Open course page"
          className="p-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={onAttach}
          title="Change reference course"
          aria-label="Change reference course"
          className="p-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Pencil className="h-4 w-4" />
        </button>
        {confirmRemove ? (
          <button
            type="button"
            onClick={() => { setConfirmRemove(false); onRemove(); }}
            className="flex items-center gap-1 pl-2.5 pr-3 py-2 rounded-lg text-xs font-semibold text-error hover:bg-error-container/30 transition-colors"
          >
            Remove?
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            title="Remove reference course"
            aria-label="Remove reference course"
            className="p-2.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}