"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, BookOpen, FileText, Link2, Loader2, ExternalLink,
  GraduationCap, Landmark, Check,
} from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { cn } from "@/lib/utils";

export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  courseCode?: string | null;
  university?: string | null;
  department?: string | null;
  semester?: string | null;
  banner?: string | null;
}

export interface MaterialSummary {
  id: string;
  name: string;
  kind: string;
  mimeType: string;
  size: number;
  course: { id: string; title: string; slug: string; department: string | null };
}

interface AttachmentPickerProps {
  open: boolean;
  onClose: () => void;
  /** "reference" picks a single course (required before publish); "inline" inserts course/material content into the article. */
  mode: "reference" | "inline";
  /** Called when a course is chosen (both modes). */
  onSelectCourse: (course: CourseSummary) => void;
  /** Called when a material is chosen (inline mode only). */
  onSelectMaterial?: (material: MaterialSummary) => void;
}

function courseMeta(c: CourseSummary) {
  return [c.courseCode, c.department, c.university].filter(Boolean).join(" · ") || "Course in the library";
}

function CourseRow({
  course, onPick, picked,
}: { course: CourseSummary; onPick: () => void; picked?: boolean }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group",
        picked
          ? "border-primary/40 bg-primary/5"
          : "border-outline-variant/25 hover:border-outline/50 hover:bg-surface-container"
      )}
    >
      <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-surface-container-high flex items-center justify-center border border-outline-variant/20">
        {course.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.banner} alt="" className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="h-5 w-5 text-secondary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold font-manrope text-on-surface truncate">{course.title}</p>
        <p className="text-xs text-on-surface-variant truncate">{courseMeta(course)}</p>
      </div>
      {picked ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-primary">
          <Check className="h-3.5 w-3.5" /> Attached
        </span>
      ) : (
        <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">Attach</span>
      )}
    </button>
  );
}

export function AttachmentPicker({ open, onClose, mode, onSelectCourse, onSelectMaterial }: AttachmentPickerProps) {
  const [tab, setTab] = useState<"search" | "link" | "materials">("search");
  const [q, setQ] = useState("");
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [materials, setMaterials] = useState<MaterialSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [resolving, setResolving] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tab2 = mode === "reference" ? "link" : "materials";

  useEffect(() => {
    if (!open) return;
    setTab("search");
    setQ("");
    setError("");
    setLinkUrl("");
    loadCourses("");
  }, [open, mode]);

  const loadCourses = useCallback(async (query: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/courses?q=${encodeURIComponent(query)}&limit=20`);
      const data = await res.json();
      setCourses(Array.isArray(data.courses) ? data.courses : []);
    } catch {
      setError("Couldn't load courses. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMaterials = useCallback(async (query: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/materials?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setMaterials(Array.isArray(data.materials) ? data.materials : []);
    } catch {
      setError("Couldn't load materials. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const onSearchChange = (value: string) => {
    setQ(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (tab === "search") loadCourses(value);
      else if (tab === "materials") loadMaterials(value);
    }, 350);
  };

  const pickCourse = (course: CourseSummary) => {
    onSelectCourse(course);
    onClose();
  };

  const resolveLink = async () => {
    const url = linkUrl.trim();
    if (!url) {
      setError("Paste a course link first.");
      return;
    }
    setResolving(true);
    setError("");
    try {
      const res = await fetch(`/api/courses/resolve?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok || !data.course) {
        setError(data.error || "We couldn't find a course at that link.");
        return;
      }
      pickCourse(data.course as CourseSummary);
    } catch {
      setError("Something went wrong while checking that link. Try again.");
    } finally {
      setResolving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      centered
      title={mode === "reference" ? "Attach reference course" : "Attach course or material"}
    >
      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-outline-variant/25 mb-4">
        <button
          type="button"
          onClick={() => { setTab("search"); loadCourses(q); }}
          className={cn(
            "flex-1 px-4 py-2.5 text-sm font-medium transition-colors",
            tab === "search" ? "bg-secondary-container/60 text-on-secondary-container" : "text-on-surface-variant hover:bg-surface-container"
          )}
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => { setTab(tab2); if (tab2 === "materials") loadMaterials(q); }}
          className={cn(
            "flex-1 px-4 py-2.5 text-sm font-medium transition-colors",
            tab === tab2 ? "bg-secondary-container/60 text-on-secondary-container" : "text-on-surface-variant hover:bg-surface-container"
          )}
        >
          {mode === "reference" ? "Paste a link" : "Materials"}
        </button>
      </div>

      {tab === "search" && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              value={q}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={mode === "reference" ? "Search for the course this article is about…" : "Search courses…"}
              className="input-field pl-10"
              aria-label="Search courses"
            />
          </div>
          {mode === "reference" && (
            <p className="text-xs text-on-surface-variant/80 mb-3 -mt-1">
              Every article must reference a course. Pick the course this article is about.
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 text-secondary animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm text-error text-center py-8">{error}</p>
          ) : courses.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant">
              <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-60" />
              <p className="text-sm">No courses found{ q ? ` for “${q}”` : "" }.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              {courses.map(c => (
                <CourseRow key={c.id} course={c} onPick={() => pickCourse(c)} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "materials" && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              value={q}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search materials…"
              className="input-field pl-10"
              aria-label="Search materials"
            />
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 text-secondary animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm text-error text-center py-8">{error}</p>
          ) : materials.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-60" />
              <p className="text-sm">No materials found.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              {materials.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { onSelectMaterial?.(m); onClose(); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-outline-variant/25 hover:border-outline/50 hover:bg-surface-container transition-all text-left group"
                >
                  <div className="w-11 h-11 rounded-lg shrink-0 bg-surface-container-high flex items-center justify-center border border-outline-variant/20">
                    <FileText className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold font-manrope text-on-surface truncate">{m.name}</p>
                    <p className="text-xs text-on-surface-variant truncate">{m.kind} · {m.course.title}</p>
                  </div>
                  <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">Attach</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "link" && (
        <div>
          <p className="text-sm text-on-surface-variant mb-3">
            Paste the link to the course page. We'll find the course and attach it.
          </p>
          <div className="relative">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") resolveLink(); }}
              placeholder="e.g. https://lawbygrace.app/courses/constitutional-law-1"
              className="input-field pl-10"
              aria-label="Course share link"
              inputMode="url"
            />
          </div>
          {error && <p className="text-sm text-error mt-3">{error}</p>}
          <button
            type="button"
            onClick={resolveLink}
            disabled={resolving}
            className="btn-primary w-full mt-4 py-3"
          >
            {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            {resolving ? "Checking link…" : "Attach this course"}
          </button>
          <div className="flex items-center gap-2 mt-4 text-xs text-on-surface-variant/70">
            <Landmark className="h-3.5 w-3.5 shrink-0" />
            <span>Share links from the course page work too — just copy the browser address.</span>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}