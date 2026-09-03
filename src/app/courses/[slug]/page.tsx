"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, Shield, Clock, Share2, Bookmark, BookOpen, FileText, Video,
  ChevronRight, ArrowLeft, Loader2, Download, Check, Scale,
  File as FileIcon, PlayCircle, Image as ImageIcon, Link2,
  Library, Settings2, GraduationCap, CheckCircle2,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import PdfReader from "@/components/PdfReader";

/* ── Material helpers ─────────────────────────────────── */

interface MaterialRecord {
  id: string; name: string; url: string; rawPath: string | null;
  size: number; mimeType: string; moduleId: string | null;
  createdAt?: string;
}

interface CourseModule {
  id: string; title: string; type: string; files: number; duration: string | null; order: number;
}

function isVideoMime(mime: string, name: string) {
  return /^video\//.test(mime ?? "") || /\.(mp4|webm|mov|m4v)$/i.test(name ?? "");
}
function isAudioMime(mime: string, name: string) {
  return /^audio\//.test(mime ?? "") || /\.(mp3|wav|ogg|m4a)$/i.test(name ?? "");
}
function isImageMime(mime: string) {
  return /^image\//.test(mime ?? "");
}
function isPdf(name: string, mime: string) {
  return /\.pdf$/i.test(name ?? "") || mime === "application/pdf";
}
function fileKind(f: MaterialRecord): { label: string; icon: React.ReactNode } {
  const name = f.name || "";
  if (isVideoMime(f.mimeType, name)) return { label: "Video", icon: <Video className="w-4 h-4" /> };
  if (isAudioMime(f.mimeType, name)) return { label: "Audio", icon: <PlayCircle className="w-4 h-4" /> };
  if (isImageMime(f.mimeType)) return { label: "Image", icon: <ImageIcon className="w-4 h-4" /> };
  if (isPdf(name, f.mimeType)) return { label: "PDF", icon: <FileText className="w-4 h-4" /> };
  return { label: "Document", icon: <FileIcon className="w-4 h-4" /> };
}
function canDownload(f: MaterialRecord) {
  return !!(f.rawPath || f.url);
}
function downloadHref(f: MaterialRecord, slug: string) {
  if (f.rawPath) return `/api/courses/${slug}/files/${f.id}/download`;
  return f.url;
}

/* ── Desktop rail row (open + share) ──────────────────── */

function MaterialRow({ f, kindLabel, kindIcon, active, onOpen }: {
  f: MaterialRecord;
  kindLabel: string;
  kindIcon: React.ReactNode;
  active: boolean;
  onOpen: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className={cn(
        "w-full flex items-center gap-1 rounded-xl transition-all group border",
        active
          ? "bg-primary/10 border-primary/15"
          : "border-transparent hover:bg-surface-container"
      )}
    >
      <button
        onClick={onOpen}
        className="flex-1 min-w-0 flex items-center gap-2.5 pl-3 pr-1.5 py-2.5 text-left text-[13px] transition-colors"
      >
        <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", active ? "bg-primary/15 text-primary" : "bg-surface-container-high text-on-surface-variant group-hover:text-secondary")}>
          {kindIcon}
        </span>
        <span className="flex-1 min-w-0">
          <span className={cn("block truncate leading-snug", active ? "text-primary font-semibold" : "text-on-surface-variant group-hover:text-on-surface")}>{f.name}</span>
          <span className={cn("block text-[10px] mt-0.5", active ? "text-primary/70" : "text-on-surface-variant/60")}>
            {kindLabel}
          </span>
        </span>
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", active ? "bg-primary" : "bg-transparent")} />
      </button>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(
            `${typeof window !== "undefined" ? window.location.origin : ""}/materials/${f.id}`
          ).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="mr-1.5 p-1.5 rounded-lg text-on-surface-variant/0 group-hover:text-on-surface-variant hover:!text-primary hover:bg-surface-container-high transition-all shrink-0"
        title="Copy share link"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Link2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

/* ── Shared controls ──────────────────────────────────── */

function CopyLinkBtn({ url, label = "Copy link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(url).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-outline-variant/25 text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Link2 className="w-3.5 h-3.5" />}
      {copied ? "Link copied" : label}
    </button>
  );
}

/* ── Main page ────────────────────────────────────────── */

interface CourseData {
  id: string; title: string; slug: string; description: string; courseCode: string;
  university: string; department: string; semester: string;
  isVerified: boolean; isPublic: boolean; views: number; readme: string | null;
  tags: string[];
  owner: { id: string; name: string; username: string; image: string | null };
  modules: CourseModule[];
  updatedDaysAgo: number; lastUpdated: string;
  isSaved: boolean;
  banner?: string | null;
}

type Selection = { kind: "overview" } | { kind: "file"; file: MaterialRecord };

export default function CoursePage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const userRole = (session?.user as any)?.role ?? "";
  const isAdmin = userRole === "ADMIN";

  const [course, setCourse] = useState<CourseData | null>(null);
  const [files, setFiles] = useState<MaterialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [selection, setSelection] = useState<Selection>({ kind: "overview" });
  const [showMobilePicker, setShowMobilePicker] = useState(false);
  const contentTopRef = useRef<HTMLDivElement>(null);

  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      fetch(`/api/courses/${slug}`).then(r => r.json()),
      fetch(`/api/courses/${slug}/files`).then(r => r.json()).catch(() => ({ files: [] })),
    ])
      .then(([courseData, filesData]) => {
        if (courseData.error) { setError(courseData.error); return; }
        setCourse(courseData);
        setIsSaved(courseData.isSaved);
        // The API returns { materials }; accept both key names defensively.
        const materialList = filesData.materials ?? filesData.files ?? [];
        setFiles(materialList);
        // Deep link: select a material via ?material=<fileId>
        const requested = searchParams.get("material");
        if (requested) {
          const target = materialList.find((f: MaterialRecord) => f.id === requested);
          if (target) setSelection({ kind: "file", file: target });
        }
      })
      .catch(() => setError("Failed to load this course."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleSave = async () => {
    if (!session?.user) {
      router.push(`/login?callbackUrl=/courses/${slug}`);
      return;
    }
    setActionLoading("save");
    try {
      const res = await fetch(`/api/courses/${slug}/save`, { method: "POST" });
      const d = await res.json();
      if (res.ok) {
        setIsSaved(d.saved);
        showToast(d.saved ? "Saved to your courses" : "Removed from saved courses");
      }
    } finally { setActionLoading(null); }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    showToast("Course link copied");
  };

  const selectFile = (file: MaterialRecord) => {
    setSelection({ kind: "file", file });
    setShowMobilePicker(false);
    // Smooth-scroll to the content area on small screens.
    requestAnimationFrame(() => {
      if (window.innerWidth < 1024) {
        contentTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const orderedModules = useMemo(
    () => [...(course?.modules ?? [])].sort((a, b) => a.order - b.order),
    [course]
  );

  const filesInModule = (moduleId: string) =>
    files
      .filter(f => f.moduleId === moduleId)
      .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));

  const generalFiles = useMemo(() => files.filter(f => !f.moduleId), [files]);
  const visibleFiles = files; // ordered as returned (createdAt asc)

  // ── Loading / error states ──
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="spinner spinner-lg" />
          <p className="text-sm text-on-surface-variant">Loading course…</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-outline-variant" />
          </div>
          <h2 className="font-serif font-bold text-2xl text-on-surface">Course not available</h2>
          <p className="text-on-surface-variant text-sm max-w-sm">
            {error === "This course is not published" || error === "Course not found"
              ? "This course is not published in the library yet, or it may have been removed."
              : error || "This course doesn't exist in the library."}
          </p>
          <Link href="/explore" className="btn-primary mt-2">Browse the library</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const selectedFile = selection.kind === "file" ? selection.file : null;
  const materialCount = files.length;

  const openOverview = () => setSelection({ kind: "overview" });

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24 md:pb-0">
      <Navbar />

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] bg-surface-container-lowest border border-outline-variant/30 text-on-surface text-sm font-medium px-5 py-2.5 rounded-2xl shadow-modal"
        >
          {toast}
        </motion.div>
      )}

      {/* ── Course header ── */}
      <section className="relative">
        <div className={cn("w-full relative overflow-hidden", course.banner ? "h-40 md:h-52" : "h-20 md:h-24 bg-gradient-to-br from-surface-container-high to-surface-container border-b border-outline-variant/10")}>
          {course.banner && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={course.banner} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-black/10" />
            </>
          )}
        </div>

        <div className="max-w-[1200px] mx-auto px-4 md:px-6 relative z-10">
          <div className={cn("card overflow-hidden -mt-10 md:-mt-12", !course.banner && "mt-2")}>
            <div className="p-5 md:p-7">
              <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                <div className="flex-1 min-w-0">
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant mb-4">
                    <Link href="/explore" className="hover:text-primary transition-colors flex items-center gap-1">
                      <ArrowLeft className="w-3.5 h-3.5" /> Library
                    </Link>
                    <span>/</span>
                    <span className="text-on-surface-variant truncate max-w-[180px] md:max-w-[340px]">{course.department || "Course"}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {course.department && <span className="tag-accent text-[11px]">{course.department}</span>}
                    {course.courseCode && <span className="tag text-[11px]">{course.courseCode}</span>}
                    {course.university && <span className="tag text-[11px]">{course.university}</span>}
                    {course.semester && <span className="tag text-[11px]">{course.semester}</span>}
                    {course.isVerified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary-container/50 border border-primary/20 px-2.5 py-0.5 rounded-full">
                        <Shield className="w-3 h-3" /> Library verified
                      </span>
                    )}
                  </div>

                  <h1 className="font-serif font-bold text-2xl md:text-[1.9rem] text-on-surface leading-tight mb-3">{course.title}</h1>
                  <p className="text-on-surface-variant leading-relaxed max-w-3xl mb-4 text-[15px]">{course.description}</p>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-on-surface-variant">
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                      <strong className="text-on-surface font-medium">{materialCount}</strong> material{materialCount === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <strong className="text-on-surface font-medium">{formatNumber(course.views)}</strong> views
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      Updated {course.updatedDaysAgo === 0 ? "today" : `${course.updatedDaysAgo} day${course.updatedDaysAgo === 1 ? "" : "s"} ago`}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row flex-wrap lg:flex-col gap-2 shrink-0">
                  {isAdmin && (
                    <Link href="/admin" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-manrope bg-surface-container-high border border-outline-variant/40 text-on-surface hover:bg-surface-container transition-all">
                      <Settings2 className="w-3.5 h-3.5 text-secondary" /> Library Admin
                    </Link>
                  )}
                  {session?.user ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={actionLoading === "save"}
                        className={cn(
                          "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all",
                          isSaved ? "bg-surface-container-high text-on-surface border border-outline-variant/30" : "bg-primary text-on-primary hover:brightness-110"
                        )}
                      >
                        {actionLoading === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />}
                        {isSaved ? "Saved" : "Save course"}
                      </button>
                      <button onClick={handleShare} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border border-outline-variant/25 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all">
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </button>
                    </>
                  ) : (
                    <Link href={`/login?callbackUrl=/courses/${slug}`} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-on-primary hover:brightness-110 transition-all">
                      Sign in to save &amp; study
                    </Link>
                  )}
                </div>
              </div>

              {/* Curated by */}
              <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-outline-variant/10">
                <Link href={`/profile/${course.owner.username}`} className="flex items-center gap-2 group">
                  <div className="w-7 h-7 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-[10px] font-bold font-manrope text-on-surface-variant overflow-hidden shrink-0">
                    {course.owner.image
                      ? <img src={course.owner.image} alt="" className="w-full h-full object-cover" />
                      : course.owner.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="leading-tight">
                    <p className="text-[10px] text-on-surface-variant">Curated by</p>
                    <p className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors">{course.owner.name}</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Study area ── */}
      <main className="flex-1 max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
        {/* Mobile material picker bar */}
        <div className="lg:hidden mb-5 -mx-4 px-4 sticky top-16 z-30 bg-background/95 backdrop-blur-md border-b border-outline-variant/10 pb-3 pt-1">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => { openOverview(); setShowMobilePicker(false); }}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all",
                selection.kind === "overview" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
              )}
            >
              <Library className="w-3.5 h-3.5" /> Overview
            </button>
            {visibleFiles.map(f => {
              const kind = fileKind(f);
              const active = selection.kind === "file" && selection.file.id === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => selectFile(f)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all max-w-[190px]",
                    active ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
                  )}
                >
                  {kind.icon}
                  <span className="truncate">{f.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 md:gap-8">
          {/* ── Materials rail (desktop) ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar pr-1">
              <div className="flex items-center gap-2 mb-3 px-1">
                <BookOpen className="w-4 h-4 text-secondary" />
                <h2 className="font-manrope font-semibold text-sm text-on-surface">Course materials</h2>
                <span className="ml-auto text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded-full tabular-nums">
                  {materialCount}
                </span>
              </div>

              <button
                onClick={openOverview}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1 border",
                  selection.kind === "overview"
                    ? "bg-primary/10 text-primary border-primary/15 font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container border-transparent hover:text-on-surface"
                )}
              >
                <Library className="w-4 h-4 shrink-0" />
                Course overview
              </button>

              {/* Module groups */}
              {orderedModules.length > 0 && (
                <div className="mt-3 space-y-3">
                  {orderedModules.map((module, mi) => {
                    const moduleFiles = filesInModule(module.id);
                    return (
                      <div key={module.id}>
                        <div className="flex items-center gap-2 px-3 py-1">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant truncate">
                              {mi + 1}. {module.title}
                            </p>
                            <p className="text-[9px] text-on-surface-variant/70">{moduleFiles.length} material{moduleFiles.length === 1 ? "" : "s"}</p>
                          </div>
                        </div>
                        <div className="space-y-0.5 mt-1">
                          {moduleFiles.length === 0 && (
                            <p className="text-[11px] text-on-surface-variant/60 px-3 py-1 italic">Coming soon</p>
                          )}
                          {moduleFiles.map(f => {
                            const kind = fileKind(f);
                            const active = selection.kind === "file" && selection.file.id === f.id;
                            return (
                              <MaterialRow
                                key={f.id}
                                f={f}
                                kindLabel={kind.label}
                                kindIcon={kind.icon}
                                active={active}
                                onOpen={() => selectFile(f)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* General materials */}
              {generalFiles.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant px-3 py-1">Materials</p>
                  <div className="space-y-0.5 mt-1">
                    {generalFiles.map(f => {
                      const kind = fileKind(f);
                      const active = selection.kind === "file" && selection.file.id === f.id;
                      return (
                        <MaterialRow
                          key={f.id}
                          f={f}
                          kindLabel={kind.label}
                          kindIcon={kind.icon}
                          active={active}
                          onOpen={() => selectFile(f)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {materialCount === 0 && (
                <p className="text-xs text-on-surface-variant px-3 py-3 leading-relaxed">
                  Materials are being added to this course. Check back soon.
                </p>
              )}
            </div>
          </aside>

          {/* ── Main content ── */}
          <div ref={contentTopRef} className="min-w-0 scroll-mt-24">
            <AnimatePresence mode="wait">
              {selection.kind === "overview" ? (
                <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                  {/* About */}
                  <div className="card p-6 md:p-8 mb-6">
                    <div className="flex items-center gap-2 mb-5 pb-4 border-b border-outline-variant/10">
                      <BookOpen className="w-5 h-5 text-primary" />
                      <h2 className="font-serif font-semibold text-lg text-on-surface">About this course</h2>
                    </div>
                    {course.readme ? (
                      <div className="text-on-surface-variant leading-relaxed whitespace-pre-wrap text-[15px]">{course.readme}</div>
                    ) : (
                      <div className="space-y-5">
                        <p className="text-on-surface-variant leading-relaxed text-[15px]">
                          {course.description || "Course materials from the Law by Grace library."}
                          {course.department ? ` Part of the ${course.department} collection.` : ""}
                        </p>
                        {course.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {course.tags.map(tag => <span key={tag} className="tag text-xs">{tag}</span>)}
                          </div>
                        )}
                        <div className="flex items-start gap-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl p-4">
                          <Scale className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                          <p className="text-sm text-on-surface-variant leading-relaxed">
                            Materials in this course are part of the Law by Grace library. Read documents in the
                            built-in reader, watch lectures, or download materials to study offline — free to use.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* What's included */}
                  {orderedModules.length > 0 && (
                    <div className="card p-6 md:p-8 mb-6">
                      <h2 className="font-serif font-semibold text-lg text-on-surface mb-5">What&apos;s inside</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {orderedModules.map(m => {
                          const count = filesInModule(m.id).length || m.files;
                          return (
                            <div key={m.id} className="flex items-center gap-3 bg-surface-container rounded-xl px-4 py-3 border border-outline-variant/10">
                              <div className="w-9 h-9 bg-secondary-container rounded-lg flex items-center justify-center shrink-0">
                                <BookOpen className="w-4 h-4 text-on-secondary-container" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-on-surface truncate">{m.title}</p>
                                <p className="text-[11px] text-on-surface-variant">{count} material{count === 1 ? "" : "s"}{m.duration ? ` · ${m.duration}` : ""}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  {materialCount > 0 && (
                    <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center shrink-0">
                          <GraduationCap className="w-5 h-5 text-on-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">
                            {materialCount} material{materialCount === 1 ? "" : "s"} ready to study
                          </p>
                          <p className="text-xs text-on-surface-variant">Choose any material from the list to begin.</p>
                        </div>
                      </div>
                      {files[0] && (
                        <button onClick={() => selectFile(files[0])} className="btn-primary shrink-0">
                          Start with the first material <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {materialCount === 0 && (
                    <div className="card p-14 text-center">
                      <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileIcon className="w-8 h-8 text-outline-variant" />
                      </div>
                      <h3 className="font-serif font-semibold text-lg text-on-surface mb-2">No materials yet</h3>
                      <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
                        New materials are being added to this course. Save it and check back soon.
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : selectedFile ? (
                <motion.div key={`file-${selectedFile.id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                  <ContentViewer
                    file={selectedFile}
                    slug={slug}
                    onClose={openOverview}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* ── Content viewer: renders the right experience per material type ── */

function ContentViewer({ file, slug, onClose }: {
  file: MaterialRecord;
  slug: string;
  onClose: () => void;
}) {
  const kind = fileKind(file);
  const name = file.name || "material";

  return (
    <div className="space-y-4">
      {/* Material header bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-primary transition-colors shrink-0">
          <ArrowLeft className="w-3.5 h-3.5" /> All materials
        </button>
        <span className="hidden sm:block text-on-surface-variant/40">|</span>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="w-8 h-8 bg-secondary-container rounded-lg flex items-center justify-center shrink-0">
            {kind.icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate max-w-[300px] md:max-w-md">{name}</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{kind.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CopyLinkBtn
            url={`${typeof window !== "undefined" ? window.location.origin : ""}/materials/${file.id}`}
            label="Share"
          />
          {canDownload(file) && (
            <a
              href={downloadHref(file, slug)}
              download={!file.rawPath}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:brightness-110 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          )}
        </div>
      </div>

      {/* Reader / player */}
      {isPdf(name, file.mimeType) ? (
        <div className="h-[72vh] min-h-[480px]">
          <PdfReader slug={slug} fileId={file.id} fileName={file.name} embedded onBack={onClose} />
        </div>
      ) : isVideoMime(file.mimeType, name) && file.url ? (
        <div className="card overflow-hidden">
          <div className="bg-black aspect-video flex items-center justify-center">
            <video
              src={file.url}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full max-h-[75vh] object-contain"
            >
              Your browser does not support video playback. <a href={file.url} download>Download the video instead</a>.
            </video>
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between gap-3 border-t border-outline-variant/10">
            <p className="text-xs text-on-surface-variant">Streaming lecture — controls are available on the player.</p>
          </div>
        </div>
      ) : isImageMime(file.mimeType) && file.url ? (
        <div className="card overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={file.url} alt={file.name} className="w-full max-h-[75vh] object-contain bg-surface-container-low" />
        </div>
      ) : isAudioMime(file.mimeType, file.name) && file.url ? (
        <div className="card p-8 md:p-12">
          <div className="max-w-lg mx-auto text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <PlayCircle className="w-10 h-10 text-primary" />
            </div>
            <p className="text-sm font-medium text-on-surface break-words">{file.name}</p>
            <audio src={file.url} controls className="w-full" preload="metadata">
              Your browser does not support audio playback.
            </audio>
          </div>
        </div>
      ) : file.url ? (
        <div className="card p-8 text-center">
          <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Open {kind.label.toLowerCase()} in a new tab
          </a>
        </div>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-sm text-on-surface-variant mb-4">This material can&apos;t be previewed online.</p>
          {canDownload(file) && (
            <a href={downloadHref(file, slug)} className="btn-primary inline-flex">
              <Download className="w-4 h-4" /> Download to read offline
            </a>
          )}
        </div>
      )}

      {/* Feedback card */}
      <div className="flex items-start gap-3 card p-4 bg-surface-container-low border-outline-variant/20">
        <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Studying a material? Use the list on the left to move between them — your place is kept while you browse.
          Found something worth sharing? Use the share button to send this material&apos;s library link to a friend.
        </p>
      </div>
    </div>
  );
}
