"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  LayoutDashboard, BookOpen, FileText, Newspaper, Users,
  Search, Plus, Pencil, Trash2, X, Check, Loader2,
  Eye, Globe, EyeOff, Link2, Copy, ExternalLink,
  ArrowUp, ArrowDown, Upload, ChevronLeft, ChevronRight,
  ShieldCheck, BookMarked, TrendingUp, UserCheck, UserX,
  AlertTriangle, Image as ImageIcon, File as FileIcon, Video, PlayCircle,
  Settings2, FolderPlus, ArrowLeft, Scale,
} from "lucide-react";
import { cn, formatNumber, timeAgo } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────── */

interface Stats {
  totalUsers: number;
  newUsersThisWeek: number;
  totalCourses: number;
  publishedCourses: number;
  newCoursesThisWeek: number;
  totalMaterials: number;
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalViews: number;
  totalSaves: number;
  recentUsers: any[];
  recentCourses: any[];
  recentMaterials: any[];
  recentArticles: any[];
}

interface CourseRow {
  id: string; title: string; slug: string; description: string;
  department: string | null; courseCode: string | null; university: string | null;
  semester: string | null; isPublic: boolean; banner: string | null;
  views: number; updatedAt: string; createdAt: string; tags: string[];
  modules: { id: string; title: string; type: string; order: number; fileCount: number }[];
  materialCount: number; saveCount: number;
}

interface MaterialRow {
  id: string; name: string; mimeType: string; size: number;
  url: string | null; rawPath: string | null;
  createdAt: string;
  course: { id: string; title: string; slug: string; isPublic: boolean; department: string | null } | null;
  module: { id: string; title: string } | null;
}

interface ArticleRow {
  id: string; slug: string; title: string; summary: string | null; tags: string[];
  isPublished: boolean; views: number; likes: number; updatedAt: string; createdAt: string;
  author: { id: string; name: string; username: string; image: string | null; role: string };
  editionCount: number;
}

interface AdminUser {
  id: string; name: string; username: string; email: string;
  role: string; isVerified: boolean; emailVerified: string | null; bannedAt: string | null; banReason: string | null;
  createdAt: string; university: string | null;
  _count: { courses: number; saves: number };
}

type Tab = "overview" | "courses" | "materials" | "articles" | "users";

const NAV: { id: Tab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "materials", label: "Materials", icon: FileText },
  { id: "articles", label: "Articles", icon: Newspaper },
  { id: "users", label: "Users", icon: Users },
];

const DEPARTMENT_OPTIONS = [
  "Constitutional Law", "Criminal Law", "Contract Law", "Family Law", "Tort Law",
  "Property Law", "Company Law", "Evidence & Litigation", "Human Rights",
  "Public International Law", "Jurisprudence & Legal Theory", "Legal Research & Writing",
  "Commercial Law", "Other",
];

/* ── Small shared helpers ── */

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

function fileKind(mime: string, name: string): { label: string; icon: React.ReactNode; color: string } {
  if (isVideoMime(mime, name)) return { label: "Video", icon: <Video className="w-4 h-4" />, color: "bg-secondary-container/70 text-on-secondary-container" };
  if (isAudioMime(mime, name)) return { label: "Audio", icon: <PlayCircle className="w-4 h-4" />, color: "bg-secondary-container/70 text-on-secondary-container" };
  if (isImageMime(mime)) return { label: "Image", icon: <ImageIcon className="w-4 h-4" />, color: "bg-secondary-container/70 text-on-secondary-container" };
  if (isPdf(name, mime)) return { label: "PDF", icon: <FileText className="w-4 h-4" />, color: "bg-secondary-container/70 text-on-secondary-container" };
  return { label: "Document", icon: <FileIcon className="w-4 h-4" />, color: "bg-secondary-container/70 text-on-secondary-container" };
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusPill({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border",
        published
          ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/25"
          : "bg-surface-container-high text-on-surface-variant border-outline-variant/40"
      )}
    >
      {published ? <><Globe className="w-2.5 h-2.5" />Published</> : <><EyeOff className="w-2.5 h-2.5" />Draft</>}
    </span>
  );
}

function Modal({ title, subtitle, onClose, children, wide = false }: {
  title: React.ReactNode; subtitle?: string; onClose: () => void;
  children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-start md:items-center justify-center p-3 md:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-modal w-full",
          wide ? "max-w-3xl" : "max-w-lg"
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-outline-variant/10">
          <div>
            <h3 className="font-manrope font-bold text-base text-on-surface leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors -mr-1.5">
            <X className="w-4 h-4" size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </motion.div>
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel = "Delete", onCancel, onConfirm, loading }: {
  title: string; message: React.ReactNode; confirmLabel?: string;
  onCancel: () => void; onConfirm: () => void; loading?: boolean;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-error-container/60 rounded-xl flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-error" />
        </div>
        <p className="text-sm text-on-surface-variant leading-relaxed">{message}</p>
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold font-manrope bg-error text-on-error hover:opacity-90 disabled:opacity-60 transition-all"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

function EmptyState({ icon: Icon, title, message, action }: {
  icon: any; title: string; message: string; action?: React.ReactNode;
}) {
  return (
    <div className="card p-12 text-center">
      <div className="w-14 h-14 bg-surface-container rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-outline-variant" />
      </div>
      <h3 className="font-manrope font-semibold text-on-surface mb-1.5">{title}</h3>
      <p className="text-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">{message}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

function CopyLinkButton({ url, label = "Copy link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(url).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant border border-outline-variant/25 hover:bg-surface-container hover:text-primary transition-all"
      title={label}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Link2 className="w-3.5 h-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────
   Main admin page
   ──────────────────────────────────────────────────────────── */

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const userRole = (session?.user as any)?.role ?? "";

  const [tab, setTab] = useState<Tab>("overview");
  const [toast, setToast] = useState("");

  // overview
  const [stats, setStats] = useState<Stats | null>(null);

  // courses
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [courseTotal, setCourseTotal] = useState(0);
  const [coursePage, setCoursePage] = useState(1);
  const [coursePages, setCoursePages] = useState(1);
  const [courseQ, setCourseQ] = useState("");
  const [courseStatus, setCourseStatus] = useState("");
  // materials
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [materialTotal, setMaterialTotal] = useState(0);
  const [materialPage, setMaterialPage] = useState(1);
  const [materialPages, setMaterialPages] = useState(1);
  const [materialQ, setMaterialQ] = useState("");
  const [materialType, setMaterialType] = useState("");
  // articles
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [articleQ, setArticleQ] = useState("");
  const [articleStatus, setArticleStatus] = useState("");
  // users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userQ, setUserQ] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Modals
  const [showCourseForm, setShowCourseForm] = useState<null | "create" | CourseRow>(null);
  const [manageCourse, setManageCourse] = useState<CourseRow | null>(null);
  const [showArticleForm, setShowArticleForm] = useState<null | "create" | ArticleRow>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | { kind: "course" | "material" | "article" | "user"; id: string; name: string }>(null);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [showCoursePicker, setShowCoursePicker] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 3200);
  };

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (res.ok) setStats(await res.json());
  }, []);

  const loadCourses = useCallback(async (opts?: { q?: string; status?: string; page?: number }) => {
    const q = opts?.q ?? courseQ;
    const status = opts?.status ?? courseStatus;
    const page = opts?.page ?? coursePage;
    const res = await fetch(`/api/admin/courses?q=${encodeURIComponent(q)}&status=${status}&page=${page}`);
    if (res.ok) {
      const d = await res.json();
      setCourses(d.courses ?? []);
      setCourseTotal(d.total ?? 0);
      setCoursePages(d.pages ?? 1);
    }
  }, [courseQ, courseStatus, coursePage]);

  const loadMaterials = useCallback(async (opts?: { q?: string; type?: string; page?: number }) => {
    const q = opts?.q ?? materialQ;
    const type = opts?.type ?? materialType;
    const page = opts?.page ?? materialPage;
    const res = await fetch(`/api/admin/materials?q=${encodeURIComponent(q)}&type=${type}&page=${page}`);
    if (res.ok) {
      const d = await res.json();
      setMaterials(d.materials ?? []);
      setMaterialTotal(d.total ?? 0);
      setMaterialPages(d.pages ?? 1);
    }
  }, [materialQ, materialType, materialPage]);

  const loadArticles = useCallback(async (opts?: { q?: string; status?: string }) => {
    const q = opts?.q ?? articleQ;
    const status = opts?.status ?? articleStatus;
    const res = await fetch(`/api/admin/articles?q=${encodeURIComponent(q)}&status=${status}`);
    if (res.ok) setArticles(await res.json());
  }, [articleQ, articleStatus]);

  const loadUsers = useCallback(async (opts?: { q?: string }) => {
    const q = opts?.q ?? userQ;
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users ?? []);
      setUserTotal(d.total ?? 0);
    }
  }, [userQ]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user) {
      router.replace("/admin/login");
      return;
    }
    if (userRole !== "ADMIN") {
      router.replace("/explore");
      return;
    }
    setLoading(true);
    Promise.all([loadStats(), loadCourses(), loadMaterials(), loadArticles(), loadUsers()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, session?.user?.id]);

  // Debounced searches
  useEffect(() => {
    const t = setTimeout(() => { if (tab === "courses") loadCourses({ page: 1 }); }, 350);
    return () => clearTimeout(t);
  }, [courseQ, courseStatus]);
  useEffect(() => {
    const t = setTimeout(() => { if (tab === "materials") loadMaterials({ page: 1 }); }, 350);
    return () => clearTimeout(t);
  }, [materialQ, materialType]);
  useEffect(() => {
    const t = setTimeout(() => { if (tab === "articles") loadArticles(); }, 350);
    return () => clearTimeout(t);
  }, [articleQ, articleStatus]);
  useEffect(() => {
    const t = setTimeout(() => { if (tab === "users") loadUsers(); }, 350);
    return () => clearTimeout(t);
  }, [userQ]);

  /* ── Access states ── */
  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-3">
        <div className="spinner spinner-lg" />
        <span className="text-sm text-on-surface-variant">Loading admin…</span>
      </div>
    );
  }
  if (!session?.user) return null;
  if (userRole !== "ADMIN") return null;

  /* ── Actions ── */
  const run = async (key: string, fn: () => Promise<boolean>, successMsg?: string) => {
    setBusy(key);
    try {
      const ok = await fn();
      if (ok && successMsg) showToast(successMsg);
    } finally {
      setBusy(null);
    }
  };

  const toggleCoursePublish = (c: CourseRow) =>
    run(`pub-${c.id}`, async () => {
      const res = await fetch(`/api/admin/courses/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !c.isPublic }),
      });
      if (res.ok) { showToast(c.isPublic ? "Course unpublished (draft)" : "Course published to the library"); loadCourses(); loadStats(); return true; }
      return false;
    });

  const toggleArticlePublish = (a: ArticleRow) =>
    run(`apub-${a.id}`, async () => {
      const res = await fetch(`/api/admin/articles/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !a.isPublished }),
      });
      if (res.ok) { showToast(a.isPublished ? "Article moved to drafts" : "Article published"); loadArticles(); loadStats(); return true; }
      return false;
    });

  const performDelete = async () => {
    if (!confirmDelete) return;
    const { kind, id, name } = confirmDelete;
    setBusy(`del-${kind}-${id}`);
    try {
      let res: Response | null = null;
      if (kind === "course") res = await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
      else if (kind === "material") res = await fetch(`/api/admin/materials/${id}`, { method: "DELETE" });
      else if (kind === "article") res = await fetch(`/api/admin/articles/${id}`, { method: "DELETE" });
      else if (kind === "user") res = await fetch("/api/admin/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id, action: "delete" }),
      });
      if (res?.ok) {
        showToast(`${name} deleted`);
        setConfirmDelete(null);
        if (kind === "course") loadCourses();
        if (kind === "material") loadMaterials();
        if (kind === "article") loadArticles();
        if (kind === "user") loadUsers();
        loadStats();
      }
    } finally { setBusy(null); }
  };

  const userAction = (user: AdminUser, action: string, reason?: string) =>
    run(`u-${action}-${user.id}`, async () => {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action, reason }),
      });
      if (res.ok) {
        showToast(`User ${action === "ban" ? "banned" : action === "unban" ? "unbanned" : action === "verify" ? "verification toggled" : action === "promote" ? "promoted" : "demoted"}`);
        loadUsers(); loadStats();
        return true;
      }
      return false;
    });

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t === "overview" && !stats) loadStats();
  };

  const greeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="fixed top-4 right-4 z-[110] bg-primary text-on-primary px-4 py-2.5 rounded-xl shadow-modal text-sm font-medium"
        >
          {toast}
        </motion.div>
      )}

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 shrink-0 bg-surface-container-low border-r border-outline-variant/15 min-h-screen sticky top-0 h-screen">
        <div className="px-5 pt-6 pb-5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon.svg" alt="Law by Grace" className="w-full h-full object-cover" />
            </div>
            <div className="leading-tight">
              <p className="font-serif font-bold text-[15px] text-on-surface leading-none">Law by Grace</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary mt-1">Library Admin</p>
            </div>
          </Link>
        </div>

        <nav className="px-3 flex-1 space-y-0.5">
          {NAV.map((item) => {
            const active = tab === item.id;
            const badge =
              item.id === "courses" ? courseTotal :
              item.id === "materials" ? materialTotal :
              item.id === "articles" ? articles.length :
              item.id === "users" ? userTotal : 0;
            return (
              <button
                key={item.id}
                onClick={() => switchTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5",
                  active
                    ? "bg-primary/10 text-primary font-semibold border border-primary/10"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface border border-transparent"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
                {badge > 0 && item.id !== "overview" && (
                  <span className="ml-auto text-[10px] font-bold bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded-full tabular-nums">
                    {formatNumber(badge)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 space-y-1 border-t border-outline-variant/10">
          <Link href="/explore" className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors">
            <ExternalLink className="w-4 h-4" /> View the library
          </Link>
          <Link href="/dashboard" className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to my dashboard
          </Link>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/15 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon.svg" alt="Law by Grace" className="w-full h-full object-cover" />
            </div>
            <div className="leading-tight">
              <p className="font-serif font-bold text-sm text-on-surface leading-none">Law by Grace</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary mt-0.5">Library Admin</p>
            </div>
            <Link href="/dashboard" className="ml-auto text-xs text-on-surface-variant hover:text-primary px-2 py-1">Exit</Link>
          </Link>
        </header>

        {/* Mobile tab rail */}
        <div className="lg:hidden sticky top-[57px] z-30 bg-surface-container-low/95 backdrop-blur-md border-b border-outline-variant/10 px-2 py-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5 w-max">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => switchTab(item.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all",
                  tab === item.id ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
                )}
              >
                <item.icon className="w-3.5 h-3.5" /> {item.label}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 w-full px-4 md:px-8 py-6 md:py-8 max-w-[1240px] mx-auto">
          {/* Page header */}
          <div className="hidden lg:flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif font-bold text-2xl text-on-surface">
                {greeting()}, {session.user?.name?.split(" ")[0]}
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                Manage the Law by Grace library — courses, materials, articles and readers.
              </p>
            </div>
            <Link href="/dashboard" className="text-xs font-medium text-on-surface-variant hover:text-primary transition-colors">
              ← Back to my dashboard
            </Link>
          </div>

          {/* ═══════════ OVERVIEW ═══════════ */}
          {tab === "overview" && (
            <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              {loading && !stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-28 bg-surface-container rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {[
                      { label: "Readers", value: stats?.totalUsers ?? 0, sub: `${stats?.newUsersThisWeek ?? 0} joined this week`, icon: Users, tone: "from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-400" },
                      { label: "Courses", value: stats?.totalCourses ?? 0, sub: `${stats?.publishedCourses ?? 0} published`, icon: BookOpen, tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400" },
                      { label: "Materials", value: stats?.totalMaterials ?? 0, sub: "PDFs, videos & docs", icon: FileText, tone: "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400" },
                      { label: "Articles", value: stats?.totalArticles ?? 0, sub: `${stats?.publishedArticles ?? 0} published · ${stats?.draftArticles ?? 0} drafts`, icon: Newspaper, tone: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400" },
                    ].map((s, i) => (
                      <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        className="card p-4 md:p-5 overflow-hidden relative">
                        <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br opacity-60 pointer-events-none", s.tone.split(" ").slice(0, 2).join(" "))} />
                        <div className="w-9 h-9 rounded-xl bg-surface-container-high border border-outline-variant/30 flex items-center justify-center mb-3">
                          <s.icon className="w-4 h-4 text-secondary" />
                        </div>
                        <p className="font-manrope font-bold text-2xl text-on-surface tabular-nums">{formatNumber(s.value)}</p>
                        <p className="text-xs font-semibold text-on-surface mt-0.5">{s.label}</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">{s.sub}</p>
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {[
                      { label: "Total course views", value: stats?.totalViews ?? 0, icon: Eye },
                      { label: "Course saves by readers", value: stats?.totalSaves ?? 0, icon: BookMarked },
                      { label: "New courses (7d)", value: stats?.newCoursesThisWeek ?? 0, icon: TrendingUp },
                    ].map((s) => (
                      <div key={s.label} className="card p-4 flex items-center gap-3.5">
                        <div className="w-9 h-9 bg-secondary-container/70 rounded-xl flex items-center justify-center shrink-0">
                          <s.icon className="w-4 h-4 text-on-secondary-container" />
                        </div>
                        <div>
                          <p className="font-manrope font-bold text-lg text-on-surface tabular-nums">{formatNumber(s.value)}</p>
                          <p className="text-[11px] text-on-surface-variant">{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "New course", icon: BookOpen, onClick: () => setShowCourseForm("create"), primary: true },
                      { label: "Add material", icon: FileText, onClick: () => setShowCoursePicker(true) },
                      { label: "Write article", icon: Newspaper, onClick: () => setShowArticleForm("create") },
                      { label: "Manage readers", icon: Users, onClick: () => switchTab("users") },
                    ].map((a) => (
                      <button key={a.label} onClick={a.onClick as any}
                        className={cn(
                          "flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all text-left",
                          a.primary
                            ? "bg-primary text-on-primary hover:brightness-110 shadow-sm"
                            : "bg-surface-container-lowest border border-outline-variant/25 text-on-surface hover:bg-surface-container-high hover:-translate-y-0.5"
                        )}>
                        <a.icon className="w-4 h-4 shrink-0" /> {a.label}
                      </button>
                    ))}
                  </div>

                  {/* Recent activity (real data only) */}
                  <div>
                    <h2 className="font-manrope font-semibold text-base text-on-surface mb-4">Recent activity</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <RecentBlock title="Latest courses" empty="No courses created yet" icon={BookOpen}
                        items={(stats?.recentCourses ?? []).map((c: any) => ({
                          id: c.id, title: c.title, sub: `by ${c.owner?.name ?? "Grace"} · ${timeAgo(c.createdAt)}`,
                          href: `/courses/${c.slug}`, meta: `${c.materialCount} materials`,
                        }))} />
                      <RecentBlock title="Latest materials" empty="No materials uploaded yet" icon={FileText}
                        items={(stats?.recentMaterials ?? []).map((m: any) => ({
                          id: m.id, title: m.name, sub: m.course?.title ? `in ${m.course.title} · ${timeAgo(m.createdAt)}` : timeAgo(m.createdAt),
                          href: `/courses/${m.course?.slug ?? ""}`, meta: fileKind(m.mimeType, m.name).label,
                        }))} />
                      <RecentBlock title="Latest articles" empty="No articles written yet" icon={Newspaper}
                        items={(stats?.recentArticles ?? []).map((a: any) => ({
                          id: a.id, title: a.title, sub: `by ${a.author?.name ?? "Grace"} · ${timeAgo(a.createdAt)}`,
                          href: `/articles/${a.slug}`, meta: a.isPublished ? "Published" : "Draft",
                        }))} />
                      <RecentBlock title="Newest readers" empty="No readers yet" icon={Users}
                        items={(stats?.recentUsers ?? []).map((u: any) => ({
                          id: u.id, title: u.name, sub: `@${u.username} · joined ${timeAgo(u.createdAt)}`,
                          href: `/profile/${u.username}`, meta: u.university ?? "Reader",
                        }))} />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ═══════════ COURSES ═══════════ */}
          {tab === "courses" && (
            <motion.div key="co" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                  <div className="relative sm:max-w-xs flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60" />
                    <input value={courseQ} onChange={(e) => setCourseQ(e.target.value)} placeholder="Search courses…" className="input-field pl-9" />
                  </div>
                  <div className="flex gap-1 bg-surface-container rounded-xl p-1 w-fit">
                    {[["", "All"], ["published", "Published"], ["draft", "Drafts"]].map(([v, l]) => (
                      <button key={v} onClick={() => setCourseStatus(v)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                          courseStatus === v ? "bg-surface-container-lowest text-primary shadow-card" : "text-on-surface-variant hover:text-primary")}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setShowCourseForm("create")} className="btn-primary justify-center">
                  <Plus className="w-4 h-4" /> New course
                </button>
              </div>

              <p className="text-xs text-on-surface-variant">{courseTotal} course{courseTotal === 1 ? "" : "s"} in the library</p>

              {loading && courses.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 bg-surface-container rounded-2xl animate-pulse" />)}
                </div>
              ) : courses.length === 0 ? (
                <EmptyState icon={BookOpen} title="No courses found"
                  message={courseQ || courseStatus ? "No courses match that search. Try a different filter." : "The library has no courses yet. Create the first course to begin."}
                  action={<button onClick={() => setShowCourseForm("create")} className="btn-primary"><Plus className="w-4 h-4" />Create a course</button>} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {courses.map((c, i) => (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}
                      className="card overflow-hidden flex flex-col group">
                      <button onClick={() => setManageCourse(c)} className="relative h-28 overflow-hidden bg-surface-container-high text-left block">
                        {c.banner ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.banner} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-surface-container-high to-surface-container flex items-center justify-center">
                            <Scale className="w-10 h-10 text-outline-variant/60" />
                          </div>
                        )}
                        <div className="absolute top-2.5 right-2.5"><StatusPill published={c.isPublic} /></div>
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
                      </button>
                      <div className="p-4 flex-1 flex flex-col">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary mb-1.5">
                          {c.department || c.courseCode || "Legal studies"}
                        </p>
                        <button onClick={() => setManageCourse(c)} className="text-left">
                          <h3 className="font-manrope font-semibold text-sm text-on-surface leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-1">
                            {c.title}
                          </h3>
                        </button>
                        <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 mb-3">{c.description}</p>
                        <div className="flex items-center gap-3 text-[11px] text-on-surface-variant mt-auto pt-3 border-t border-outline-variant/10">
                          <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{c.materialCount} materials</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(c.views)}</span>
                          <span className="ml-auto">{timeAgo(c.updatedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3.5">
                          <button onClick={() => setManageCourse(c)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface-container-high text-on-surface hover:bg-surface-container transition-all">
                            <Settings2 className="w-3.5 h-3.5 text-secondary" /> Manage
                          </button>
                          <button onClick={() => setShowCourseForm(c)}
                            className="px-2.5 py-1.5 rounded-lg text-xs border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container transition-all" title="Edit details">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => toggleCoursePublish(c)} disabled={busy === `pub-${c.id}`}
                            className="px-2.5 py-1.5 rounded-lg text-xs border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-50" title={c.isPublic ? "Unpublish" : "Publish"}>
                            {busy === `pub-${c.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : c.isPublic ? <Globe className="w-3.5 h-3.5 text-green-500" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => setConfirmDelete({ kind: "course", id: c.id, name: c.title })}
                            className="px-2.5 py-1.5 rounded-lg text-xs border border-error/15 text-error hover:bg-error-container/20 transition-all" title="Delete course">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {coursePages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button onClick={() => { setCoursePage((p) => Math.max(1, p - 1)); }} disabled={coursePage <= 1}
                    className="p-2 rounded-lg border border-outline-variant/25 text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-all">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-on-surface-variant tabular-nums">Page {coursePage} of {coursePages}</span>
                  <button onClick={() => { setCoursePage((p) => Math.min(coursePages, p + 1)); }} disabled={coursePage >= coursePages}
                    className="p-2 rounded-lg border border-outline-variant/25 text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════ MATERIALS ═══════════ */}
          {tab === "materials" && (
            <motion.div key="ma" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                  <div className="relative sm:max-w-xs flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60" />
                    <input value={materialQ} onChange={(e) => setMaterialQ(e.target.value)} placeholder="Search materials…" className="input-field pl-9" />
                  </div>
                  <div className="flex gap-1 bg-surface-container rounded-xl p-1 overflow-x-auto no-scrollbar w-fit">
                    {[["", "All"], ["pdf", "PDFs"], ["video", "Videos"], ["document", "Docs"], ["image", "Images"], ["audio", "Audio"]].map(([v, l]) => (
                      <button key={v} onClick={() => setMaterialType(v)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                          materialType === v ? "bg-surface-container-lowest text-primary shadow-card" : "text-on-surface-variant hover:text-primary")}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setShowCoursePicker(true)} className="btn-secondary justify-center shrink-0">
                  <Plus className="w-4 h-4" /> Add material
                </button>
              </div>

              <p className="text-xs text-on-surface-variant">{materialTotal} material{materialTotal === 1 ? "" : "s"} across the library</p>

              {loading && materials.length === 0 ? (
                <div className="card divide-y divide-outline-variant/5">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 bg-surface-container/60 animate-pulse" />)}
                </div>
              ) : materials.length === 0 ? (
                <EmptyState icon={FileText} title="No materials found"
                  message="Materials are the PDFs, videos, documents and images that make up each course." />
              ) : (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead>
                        <tr className="border-b border-outline-variant/10 bg-surface-container/60">
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Material</th>
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Course</th>
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hidden md:table-cell">Added</th>
                          <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materials.map((m) => {
                          const kind = fileKind(m.mimeType, m.name);
                          return (
                            <tr key={m.id} className="border-b border-outline-variant/5 hover:bg-surface-container/40 transition-colors">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", kind.color)}>{kind.icon}</div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-on-surface truncate max-w-[280px]">{m.name}</p>
                                    <p className="text-[11px] text-on-surface-variant">
                                      {kind.label}
                                      {m.module ? ` · ${m.module.title}` : ""}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                {m.course ? (
                                  <Link href={`/courses/${m.course.slug}`} className="text-sm text-secondary hover:underline inline-flex items-center gap-1.5">
                                    <BookOpen className="w-3 h-3" />
                                    <span className="truncate max-w-[200px]">{m.course.title}</span>
                                  </Link>
                                ) : <span className="text-xs text-on-surface-variant">—</span>}
                              </td>
                              <td className="px-5 py-3.5 hidden md:table-cell text-xs text-on-surface-variant">{timeAgo(m.createdAt)}</td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center justify-end gap-1">
                                  <CopyLinkButton url={`${typeof window !== "undefined" ? window.location.origin : ""}/materials/${m.id}`} label="Copy link" />
                                  {m.course && (
                                    <Link href={`/materials/${m.id}`} className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" title="View material page">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                  )}
                                  <button onClick={() => setConfirmDelete({ kind: "material", id: m.id, name: m.name })}
                                    className="p-2 rounded-lg text-on-surface-variant hover:bg-error-container/20 hover:text-error transition-colors" title="Delete">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {materialPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button onClick={() => setMaterialPage((p) => Math.max(1, p - 1))} disabled={materialPage <= 1}
                    className="p-2 rounded-lg border border-outline-variant/25 text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-all">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-on-surface-variant tabular-nums">Page {materialPage} of {materialPages}</span>
                  <button onClick={() => setMaterialPage((p) => Math.min(materialPages, p + 1))} disabled={materialPage >= materialPages}
                    className="p-2 rounded-lg border border-outline-variant/25 text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════ ARTICLES ═══════════ */}
          {tab === "articles" && (
            <motion.div key="ar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                  <div className="relative sm:max-w-xs flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60" />
                    <input value={articleQ} onChange={(e) => setArticleQ(e.target.value)} placeholder="Search articles…" className="input-field pl-9" />
                  </div>
                  <div className="flex gap-1 bg-surface-container rounded-xl p-1 w-fit">
                    {[["", "All"], ["published", "Published"], ["draft", "Drafts"]].map(([v, l]) => (
                      <button key={v} onClick={() => setArticleStatus(v)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                          articleStatus === v ? "bg-surface-container-lowest text-primary shadow-card" : "text-on-surface-variant hover:text-primary")}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setShowArticleForm("create")} className="btn-primary justify-center shrink-0">
                  <Plus className="w-4 h-4" /> New article
                </button>
              </div>

              {loading && articles.length === 0 ? (
                <div className="card divide-y divide-outline-variant/5">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-surface-container/60 animate-pulse" />)}
                </div>
              ) : articles.length === 0 ? (
                <EmptyState icon={Newspaper} title="No articles yet"
                  message="Articles are the library's legal writing — create a draft, then publish when it's ready."
                  action={<button onClick={() => setShowArticleForm("create")} className="btn-primary"><Plus className="w-4 h-4" />Write an article</button>} />
              ) : (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px]">
                      <thead>
                        <tr className="border-b border-outline-variant/10 bg-surface-container/60">
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Article</th>
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hidden md:table-cell">Author</th>
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hidden md:table-cell">Reads</th>
                          <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {articles.map((a) => (
                          <tr key={a.id} className="border-b border-outline-variant/5 hover:bg-surface-container/40 transition-colors">
                            <td className="px-5 py-3.5">
                              <p className="text-sm font-medium text-on-surface line-clamp-1 max-w-[340px]">{a.title}</p>
                              <p className="text-[11px] text-on-surface-variant mt-0.5">
                                {a.editionCount} edition{a.editionCount === 1 ? "" : "s"} · updated {timeAgo(a.updatedAt)}
                              </p>
                            </td>
                            <td className="px-5 py-3.5 hidden md:table-cell">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center text-[10px] font-bold text-on-secondary-container shrink-0 overflow-hidden">
                                  {a.author.image ? <img src={a.author.image} alt="" className="w-full h-full object-cover" /> : a.author.name[0]}
                                </div>
                                <span className="text-xs text-on-surface-variant">{a.author.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5"><StatusPill published={a.isPublished} /></td>
                            <td className="px-5 py-3.5 hidden md:table-cell text-xs text-on-surface-variant tabular-nums">{formatNumber(a.views)}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center justify-end gap-1 flex-wrap">
                                <Link href={`/articles/${a.slug}`} className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" title="View">
                                  <Eye className="w-3.5 h-3.5" />
                                </Link>
                                {a.author.id === (session.user as any)?.id && (
                                  <Link href={`/editor?article=${a.slug}`} className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" title="Edit in editor">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Link>
                                )}
                                <button onClick={() => setShowArticleForm(a)}
                                  className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" title="Details / publish">
                                  <Settings2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => toggleArticlePublish(a)} disabled={busy === `apub-${a.id}`} title={a.isPublished ? "Unpublish" : "Publish"}
                                  className={cn("px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all disabled:opacity-50",
                                    a.isPublished ? "border-outline-variant/25 text-on-surface-variant hover:bg-surface-container" : "border-primary/30 text-primary hover:bg-primary/5")}>
                                  {busy === `apub-${a.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : a.isPublished ? "Unpublish" : "Publish"}
                                </button>
                                <button onClick={() => setConfirmDelete({ kind: "article", id: a.id, name: a.title })}
                                  className="p-2 rounded-lg text-on-surface-variant hover:bg-error-container/20 hover:text-error transition-colors" title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════ USERS ═══════════ */}
          {tab === "users" && (
            <motion.div key="us" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <div className="relative sm:max-w-xs flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60" />
                  <input value={userQ} onChange={(e) => setUserQ(e.target.value)} placeholder="Search readers…" className="input-field pl-9" />
                </div>
                <p className="text-xs text-on-surface-variant shrink-0">{userTotal} reader{userTotal === 1 ? "" : "s"}</p>
              </div>

              {loading && users.length === 0 ? (
                <div className="card divide-y divide-outline-variant/5">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 bg-surface-container/60 animate-pulse" />)}
                </div>
              ) : users.length === 0 ? (
                <EmptyState icon={Users} title="No readers found" message="Nobody matches that search yet." />
              ) : (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                      <thead>
                        <tr className="border-b border-outline-variant/10 bg-surface-container/60">
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Reader</th>
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hidden md:table-cell">Joined</th>
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hidden lg:table-cell">Status</th>
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hidden lg:table-cell">Role</th>
                          <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => {
                          const isAdmin = u.role === "ADMIN";
                          const banned = !!u.bannedAt;
                          return (
                            <tr key={u.id} className={cn("border-b border-outline-variant/5 hover:bg-surface-container/40 transition-colors", banned && "opacity-55")}>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-xs font-bold text-on-secondary-container shrink-0 overflow-hidden">
                                    {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-sm font-medium text-on-surface truncate">{u.name}</p>
                                      {u.isVerified && <UserCheck className="w-3 h-3 text-green-500 shrink-0" />}
                                      {isAdmin && <ShieldCheck className="w-3 h-3 text-primary shrink-0" />}
                                      {banned && <span className="text-[9px] font-bold bg-error-container text-error px-1.5 py-0.5 rounded-full shrink-0">Banned</span>}
                                    </div>
                                    <p className="text-[11px] text-on-surface-variant truncate">@{u.username} · {u.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 hidden md:table-cell text-xs text-on-surface-variant">{new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</td>
                              <td className="px-5 py-3.5 hidden lg:table-cell">
                                <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                                  u.emailVerified ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400")}>
                                  {u.emailVerified ? "Verified" : "Unverified"}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 hidden lg:table-cell">
                                <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                                  isAdmin ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant")}>
                                  {u.role === "STUDENT" ? "Reader" : u.role === "PROFESSOR" ? "Professor" : "Admin"}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center justify-end gap-1 flex-wrap">
                                  <Link href={`/profile/${u.username}`} className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" title="View profile">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Link>
                                  <button onClick={() => userAction(u, "verify")} disabled={busy === `u-verify-${u.id}`}
                                    className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors disabled:opacity-40" title="Toggle verified">
                                    {busy === `u-verify-${u.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                                  </button>
                                  {!isAdmin && (u.role === "STUDENT" ? (
                                    <button onClick={() => userAction(u, "promote")} disabled={busy === `u-promote-${u.id}`}
                                      className="px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-outline-variant/25 text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-40" title="Promote to professor">
                                      {busy === `u-promote-${u.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : "Promote"}
                                    </button>
                                  ) : (
                                    <button onClick={() => userAction(u, "demote")} disabled={busy === `u-demote-${u.id}`}
                                      className="px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-outline-variant/25 text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-40" title="Demote to reader">
                                      {busy === `u-demote-${u.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : "Demote"}
                                    </button>
                                  ))}
                                  {banned ? (
                                    <button onClick={() => userAction(u, "unban")} disabled={busy === `u-unban-${u.id}`}
                                      className="px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-green-500/25 text-green-600 dark:text-green-400 hover:bg-green-500/5 transition-all disabled:opacity-40">
                                      {busy === `u-unban-${u.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : "Unban"}
                                    </button>
                                  ) : (
                                    <button onClick={() => setBanTarget(u)} disabled={isAdmin}
                                      className="p-2 rounded-lg text-on-surface-variant hover:bg-error-container/20 hover:text-error transition-colors disabled:opacity-30" title="Ban">
                                      <UserX className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {!isAdmin && (
                                    <button onClick={() => setConfirmDelete({ kind: "user", id: u.id, name: u.name })}
                                      className="p-2 rounded-lg text-on-surface-variant hover:bg-error-container/20 hover:text-error transition-colors" title="Delete account">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </main>
      </div>

      {/* ═══════════ MODALS ═══════════ */}
      <AnimatePresence>
        {showCourseForm !== null && (
          <CourseFormModal
            key="course-form"
            course={showCourseForm === "create" ? null : showCourseForm}
            onClose={() => setShowCourseForm(null)}
            onSaved={async (slug) => {
              const wasCreate = showCourseForm === "create";
              setShowCourseForm(null);
              showToast("Course saved");
              loadStats();
              await loadCourses();
              if (wasCreate && slug) {
                // Open the materials manager so materials can be added right away.
                const res = await fetch("/api/admin/courses?limit=8");
                const d = await res.json();
                const created = (d.courses ?? []).find((c: any) => c.slug === slug);
                if (created) setManageCourse(created);
              }
            }}
          />
        )}

        {manageCourse && (
          <CourseMaterialsModal
            key={`manage-${manageCourse.id}`}
            course={manageCourse}
            onClose={() => setManageCourse(null)}
            onChanged={() => { loadCourses(); loadMaterials(); loadStats(); }}
            showToast={showToast}
          />
        )}

        {showCoursePicker && (
          <CoursePickerModal
            onClose={() => setShowCoursePicker(false)}
            onPick={(slug) => {
              setShowCoursePicker(false);
              // refresh course list then open its materials manager
              loadCourses();
              window.setTimeout(() => {
                setCourses((prev) => {
                  const c = prev.find((x) => x.slug === slug);
                  if (c) setManageCourse(c);
                  return prev;
                });
              }, 150);
            }}
          />
        )}

        {showArticleForm !== null && (
          <ArticleFormModal
            key="article-form"
            article={showArticleForm === "create" ? null : showArticleForm}
            onClose={() => setShowArticleForm(null)}
            onSaved={() => { setShowArticleForm(null); loadArticles(); loadStats(); showToast("Article saved"); }}
          />
        )}

        {confirmDelete && (
          <ConfirmDialog
            title={`Delete ${confirmDelete.kind}`}
            confirmLabel="Delete permanently"
            message={
              <>
                This will permanently delete <strong className="text-on-surface">{confirmDelete.name}</strong>.
                {confirmDelete.kind === "course" && " Its materials and modules will also be removed from the library."}
                {confirmDelete.kind === "user" && " Their account and activity will be removed."}
                {" "}This cannot be undone.
              </>
            }
            loading={busy === `del-${confirmDelete.kind}-${confirmDelete.id}`}
            onCancel={() => setConfirmDelete(null)}
            onConfirm={performDelete}
          />
        )}

        {banTarget && (
          <BanModal
            user={banTarget}
            onClose={() => setBanTarget(null)}
            onBan={(reason) => { userAction(banTarget, "ban", reason); setBanTarget(null); }}
            busy={!!busy}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Recent activity block
   ──────────────────────────────────────────────────────────── */

function RecentBlock({ title, items, empty, icon: Icon }: {
  title: string; items: { id: string; title: string; sub: string; href: string; meta?: string }[];
  empty: string; icon: any;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-surface-container-high rounded-lg flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-secondary" />
        </div>
        <h3 className="font-manrope font-semibold text-sm text-on-surface">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-on-surface-variant py-3 text-center">{empty}</p>
      ) : (
        <div className="space-y-0.5">
          {items.map((item) => (
            <Link key={item.id} href={item.href}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-container transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-on-surface truncate group-hover:text-primary transition-colors">{item.title}</p>
                <p className="text-[10px] text-on-surface-variant truncate mt-0.5">{item.sub}</p>
              </div>
              {item.meta && (
                <span className="text-[10px] font-semibold text-secondary bg-secondary-container/40 px-2 py-0.5 rounded-full shrink-0">{item.meta}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Course create / edit form
   ──────────────────────────────────────────────────────────── */

function CourseFormModal({ course, onClose, onSaved }: {
  course: CourseRow | null;
  onClose: () => void;
  onSaved: (slug?: string) => void;
}) {
  const isEdit = !!course;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [form, setForm] = useState({
    title: course?.title ?? "",
    description: course?.description ?? "",
    department: course?.department ?? "",
    courseCode: course?.courseCode ?? "",
    university: course?.university ?? "",
    semester: course?.semester ?? "",
    banner: course?.banner ?? "",
    tags: (course?.tags ?? []).join(", "),
    isPublic: course ? course.isPublic : true,
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadCover = async (file: File) => {
    setUploadingCover(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (d.url) setForm((p) => ({ ...p, banner: d.url }));
      else setError(d.error ?? "Cover upload failed");
    } catch {
      setError("Cover upload failed. Try again.");
    } finally {
      setUploadingCover(false);
    }
  };

  const save = async () => {
    setError("");
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setSaving(true);
    try {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const payload = {
        ...form,
        tags,
        department: form.department || null,
        courseCode: form.courseCode || null,
        university: form.university || null,
        semester: form.semester || null,
        banner: form.banner || null,
      };
      let res: Response;
      if (isEdit && course) {
        res = await fetch(`/api/admin/courses/${course.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Could not save the course.");
        return;
      }
      onSaved(d.slug);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit course" : "Create a new course"}
      subtitle={isEdit ? `Update details for “${course!.title}”.` : "Describe the course first — materials can be added next."}
      onClose={onClose} wide>
      <div className="space-y-4">
        {error && <div className="p-3 bg-error-container/40 border border-error/20 rounded-lg text-sm text-error">{error}</div>}

        {/* Cover */}
        <div>
          <label className="block text-sm font-medium text-on-surface mb-1.5">Cover image <span className="text-on-surface-variant font-normal">(optional)</span></label>
          <div className="flex items-center gap-4">
            <button onClick={() => fileRef.current?.click()} disabled={uploadingCover}
              className="relative w-36 h-20 rounded-xl overflow-hidden border border-dashed border-outline-variant/60 bg-surface-container-low flex items-center justify-center group disabled:opacity-60 shrink-0">
              {form.banner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.banner} alt="" className="w-full h-full object-cover" />
              ) : uploadingCover ? (
                <Loader2 className="w-5 h-5 text-secondary animate-spin" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-on-surface-variant">
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Upload cover</span>
                </span>
              )}
            </button>
            {form.banner && (
              <button onClick={() => setForm((p) => ({ ...p, banner: "" }))} className="text-xs text-on-surface-variant hover:text-error flex items-center gap-1">
                <X className="w-3 h-3" /> Remove
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface mb-1.5">Title *</label>
          <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Family Law — Matrimonial Causes" className="input-field" autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-on-surface mb-1.5">Description *</label>
          <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} placeholder="What will readers learn from this course?" className="input-field resize-none" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Area of law</label>
            <select value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} className="input-field">
              <option value="">Select an area…</option>
              {DEPARTMENT_OPTIONS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Course code <span className="text-on-surface-variant font-normal">(optional)</span></label>
            <input value={form.courseCode} onChange={(e) => setForm((p) => ({ ...p, courseCode: e.target.value }))} placeholder="e.g. LAW 301" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Semester <span className="text-on-surface-variant font-normal">(optional)</span></label>
            <input value={form.semester} onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))} placeholder="e.g. Second semester" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Tags <span className="text-on-surface-variant font-normal">(comma separated)</span></label>
            <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} placeholder="e.g. family-law, divorce" className="input-field" />
          </div>
        </div>

        <label className="flex items-center gap-3 p-3.5 rounded-xl border border-outline-variant/25 bg-surface-container-low cursor-pointer select-none">
          <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))} className="w-4 h-4 accent-[rgb(var(--c-primary))]" />
          <span className="text-sm text-on-surface font-medium">
            Publish to the library
            <span className="block text-xs text-on-surface-variant font-normal">Unchecked = draft, hidden from readers until published.</span>
          </span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container transition-colors">Cancel</button>
          <button onClick={save} disabled={saving || uploadingCover} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? "Save changes" : "Create course"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ────────────────────────────────────────────────────────────
   Course materials manager (add / reorder / remove)
   ──────────────────────────────────────────────────────────── */

function CourseMaterialsModal({ course, onClose, onChanged, showToast }: {
  course: CourseRow;
  onClose: () => void;
  onChanged: () => void;
  showToast: (m: string) => void;
}) {
  const [data, setData] = useState<any>(null); // { modules, files }
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmFile, setConfirmFile] = useState<any>(null);
  const [confirmModule, setConfirmModule] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [course.id]);

  useEffect(() => { refresh(); }, [refresh]);

  // GET /api/admin/courses/[id] returns { materials, modules }.
  const files = data?.materials ?? data?.files ?? [];
  const modules = data?.modules ?? [];
  const generalFiles = files.filter((f: any) => !f.moduleId);
  const filesOf = (moduleId: string) => files.filter((f: any) => f.moduleId === moduleId);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadName(file.name);
    const ok = (msg: string) => { showToast(msg); onChanged(); refresh(); };
    const fail = (msg: string) => { showToast(msg); };
    try {
      const name = file.name;
      const mimeType = file.type || "application/octet-stream";

      // Small files keep using the server proxy (works everywhere).
      if (file.size <= 3 * 1024 * 1024) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/courses/${course.slug}/files`, { method: "POST", body: fd });
        const d = await res.json();
        if (!res.ok) { fail(d.error ?? "Upload failed"); return; }
        ok(`“${name}” added to the course`);
        return;
      }

      // Larger files upload directly to R2 via a presigned URL so they are
      // not limited by the serverless request-body cap (~4.5 MB on Vercel).
      const presignRes = await fetch(`/api/courses/${course.slug}/files/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mimeType, size: file.size }),
      });
      const presigned = await presignRes.json();
      if (!presignRes.ok) { fail(presigned.error ?? "Upload failed"); return; }

      const putRes = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: file,
      });
      if (!putRes.ok) {
        console.error("[upload] presigned PUT failed", putRes.status);
        fail(
          putRes.status === 403
            ? "Upload blocked — the R2 bucket CORS policy must allow direct uploads from this domain."
            : "Upload failed — please try again"
        );
        return;
      }

      const recordRes = await fetch(`/api/courses/${course.slug}/files/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mimeType, size: file.size, key: presigned.key }),
      });
      const recorded = await recordRes.json();
      if (!recordRes.ok) { fail(recorded.error ?? "Upload failed"); return; }
      ok(`“${name}” added to the course`);
    } catch (err) {
      console.error("[upload]", err);
      fail("Upload failed — please try again");
    } finally {
      setUploading(false);
      setUploadName("");
    }
  };

  const addModule = async () => {
    const title = newModuleTitle.trim();
    if (!title) return;
    setBusyId("new-module");
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleAction: { action: "create", title } }),
      });
      if (res.ok) { setNewModuleTitle(""); onChanged(); refresh(); }
    } finally { setBusyId(null); }
  };

  const renameModule = async (id: string, currentTitle: string) => {
    const title = window.prompt("Rename this section", currentTitle);
    if (!title?.trim() || title.trim() === currentTitle) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleAction: { action: "rename", id, title: title.trim() } }),
      });
      if (res.ok) refresh();
    } finally { setBusyId(null); }
  };

  const moveFile = async (file: any, moduleId: string) => {
    setBusyId(file.id);
    try {
      const res = await fetch(`/api/admin/materials/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId }),
      });
      if (res.ok) refresh();
    } finally { setBusyId(null); }
  };

  const reorder = async (orderedIds: string[]) => {
    if (orderedIds.length < 2) return;
    setBusyId("reorder");
    try {
      const res = await fetch("/api/admin/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (res.ok) refresh();
    } finally { setBusyId(null); }
  };

  const moveUp = (list: any[], index: number) => {
    if (index <= 0) return;
    const arr = [...list];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    reorder(arr.map((f) => f.id));
  };

  const deleteModule = async () => {
    if (!confirmModule) return;
    setBusyId(confirmModule.id);
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleAction: { action: "delete", id: confirmModule.id } }),
      });
      if (res.ok) { onChanged(); refresh(); }
    } finally {
      setBusyId(null);
      setConfirmModule(null);
    }
  };

  const FileRow = ({ f, index, total }: { f: any; index: number; total: number }) => {
    const kind = fileKind(f.mimeType, f.name);
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-container/60 transition-colors group/row">
        <div className="flex flex-col items-center">
          <button onClick={() => moveUp(filesOf(f.moduleId ?? "__gen"), index)} disabled={index === 0 || busyId === "reorder" || busyId === f.id}
            className="p-0.5 text-on-surface-variant/50 hover:text-primary disabled:opacity-20 transition-colors">
            <ArrowUp className="w-3 h-3" />
          </button>
          <button disabled={index >= total - 1 || busyId === "reorder" || busyId === f.id}
            className="p-0.5 text-on-surface-variant/50 hover:text-primary disabled:opacity-20 transition-colors">
            <ArrowDown className="w-3 h-3" />
          </button>
        </div>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", kind.color)}>{kind.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-on-surface truncate">{f.name}</p>
          <p className="text-[10px] text-on-surface-variant">{kind.label}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <select value={f.moduleId ?? ""} onChange={(e) => moveFile(f, e.target.value)}
            className="text-[10px] bg-surface-container-high border border-outline-variant/30 rounded-lg px-1.5 py-1 text-on-surface focus:outline-none max-w-[110px]">
            <option value="">General</option>
            {modules.map((m: any) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <button onClick={() => setConfirmFile(f)} className="p-1.5 rounded-lg text-on-surface-variant hover:text-error transition-colors" title="Remove material">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <Modal title={<span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-secondary" />Manage course materials</span>}
      subtitle={`${course.title} — arrange the materials readers will study.`}
      onClose={onClose} wide>
      <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1 -mr-1">
        {/* Upload */}
        <div>
          <input ref={fileRef} type="file" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full border-2 border-dashed border-outline-variant/50 hover:border-primary/50 hover:bg-primary/5 rounded-2xl px-6 py-7 flex flex-col items-center justify-center gap-2 text-on-surface-variant transition-all disabled:opacity-60 group">
            {uploading ? (
              <Loader2 className="w-6 h-6 text-secondary animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-secondary group-hover:text-primary transition-colors" />
            )}
            <span className="text-sm font-semibold text-on-surface">
              {uploading ? `Adding ${uploadName}…` : "Add a material to this course"}
            </span>
            <span className="text-xs text-on-surface-variant">PDFs, videos, audio, images, documents — up to 50 MB each</span>
          </button>
        </div>

        {/* Modules & files */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <div key={i} className="h-24 bg-surface-container rounded-xl animate-pulse" />)}
          </div>
        ) : files.length === 0 && modules.length === 0 ? (
          <div className="text-center py-6 text-on-surface-variant">
            <FileText className="w-8 h-8 text-outline-variant mx-auto mb-3" />
            <p className="text-sm">No materials yet. Upload the first material above — you can group them into sections afterwards.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sections */}
            {modules.map((m: any) => (
              <div key={m.id}>
                <div className="flex items-center gap-2 mb-2">
                  <FolderPlus className="w-3.5 h-3.5 text-secondary" />
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex-1">{m.title}</p>
                  <span className="text-[10px] text-on-surface-variant">{filesOf(m.id).length} file{filesOf(m.id).length === 1 ? "" : "s"}</span>
                  <button onClick={() => renameModule(m.id, m.title)} className="p-1 rounded text-on-surface-variant hover:text-primary transition-colors" title="Rename section">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => setConfirmModule(m)} className="p-1 rounded text-on-surface-variant hover:text-error transition-colors" title="Delete section (materials move to General)">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-1 border border-outline-variant/15 rounded-xl p-1.5 bg-surface-container-low/60">
                  {filesOf(m.id).length === 0 ? (
                    <p className="text-[11px] text-on-surface-variant/70 px-3 py-2">No materials in this section yet.</p>
                  ) : (
                    filesOf(m.id).map((f: any, i: number) => <FileRow key={f.id} f={f} index={i} total={filesOf(m.id).length} />)
                  )}
                </div>
              </div>
            ))}

            {/* General / ungrouped */}
            {generalFiles.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">General materials</p>
                <div className="space-y-1 border border-outline-variant/15 rounded-xl p-1.5 bg-surface-container-low/60">
                  {generalFiles.map((f: any, i: number) => <FileRow key={f.id} f={f} index={i} total={generalFiles.length} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* New section */}
        <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/10">
          <input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addModule()}
            placeholder="New section title, e.g. Week 1 — Introduction"
            className="input-field flex-1" />
          <button onClick={addModule} disabled={busyId === "new-module" || !newModuleTitle.trim()} className="btn-secondary shrink-0 disabled:opacity-50">
            {busyId === "new-module" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />} Add section
          </button>
        </div>
        <p className="text-[11px] text-on-surface-variant -mt-2">Sections help readers navigate — e.g. weeks, topics or lecture groups.</p>
      </div>

      <div className="flex justify-between items-center pt-4 mt-4 border-t border-outline-variant/10">
        <Link href={`/courses/${course.slug}`} className="inline-flex items-center gap-1.5 text-xs text-secondary hover:underline shrink-0">
          <ExternalLink className="w-3 h-3" /> View course page
        </Link>
        <button onClick={onClose} className="btn-primary">Done</button>
      </div>

      <AnimatePresence>
        {confirmFile && (
          <ConfirmDialog title="Remove material" confirmLabel="Remove"
            message={<>Remove <strong className="text-on-surface">{confirmFile.name}</strong> from this course? This cannot be undone.</>}
            loading={busyId === confirmFile.id}
            onCancel={() => setConfirmFile(null)}
            onConfirm={async () => {
              setBusyId(confirmFile.id);
              try {
                const res = await fetch(`/api/admin/materials/${confirmFile.id}`, { method: "DELETE" });
                if (res.ok) { onChanged(); refresh(); }
              } finally { setBusyId(null); setConfirmFile(null); }
            }} />
        )}
        {confirmModule && (
          <ConfirmDialog title="Delete section" confirmLabel="Delete section"
            message={<>Delete the section <strong className="text-on-surface">{confirmModule.title}</strong>? Its materials move to <strong className="text-on-surface">General</strong> — nothing is removed from the course.</>}
            loading={busyId === confirmModule.id}
            onCancel={() => setConfirmModule(null)}
            onConfirm={deleteModule} />
        )}
      </AnimatePresence>
    </Modal>
  );
}

/* ────────────────────────────────────────────────────────────
   Course picker (for adding a material)
   ──────────────────────────────────────────────────────────── */

function CoursePickerModal({ onClose, onPick }: { onClose: () => void; onPick: (slug: string) => void }) {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/admin/courses?limit=100")
      .then((r) => r.json())
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Modal title="Choose a course" subtitle="Materials belong to a course — pick the course to add it to." onClose={onClose}>
      <div className="space-y-1.5 max-h-[55vh] overflow-y-auto -mr-2 pr-2">
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-surface-container rounded-xl animate-pulse" />)}</div>
        ) : courses.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-8">No courses yet. Create a course first.</p>
        ) : (
          courses.map((c) => (
            <button key={c.id} onClick={() => onPick(c.slug)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-outline-variant/15 hover:border-secondary/40 hover:bg-surface-container-low transition-all text-left group">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-container-high flex items-center justify-center">
                {c.banner ? <img src={c.banner} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-4 h-4 text-on-surface-variant" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface truncate group-hover:text-primary transition-colors">{c.title}</p>
                <p className="text-[11px] text-on-surface-variant truncate">{c.department || c.courseCode || "Legal studies"} · {c.materialCount} materials</p>
              </div>
              <ChevronRight className="w-4 h-4 text-on-surface-variant/50 shrink-0" />
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}

/* ────────────────────────────────────────────────────────────
   Article form (create draft / edit meta & publish)
   ──────────────────────────────────────────────────────────── */

function ArticleFormModal({ article, onClose, onSaved }: {
  article: ArticleRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!article;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: article?.title ?? "",
    summary: article?.summary ?? "",
    tags: (article?.tags ?? []).join(", "),
    isPublished: article ? article.isPublished : false,
  });

  const save = async () => {
    setError("");
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    try {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      let res: Response;
      if (isEdit && article) {
        res = await fetch(`/api/admin/articles/${article.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.title.trim(), summary: form.summary || null, tags, isPublished: form.isPublished }),
        });
      } else {
        res = await fetch("/api/admin/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.title.trim(), summary: form.summary || null, tags, isPublished: form.isPublished }),
        });
      }
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Could not save the article."); return; }
      onSaved();
      if (!isEdit && d.slug) window.location.href = `/editor?article=${d.slug}`;
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Article details" : "Start a new article"}
      subtitle={isEdit ? `Manage “${article!.title}”.` : "Create a draft — write the content in the editor, then publish."}
      onClose={onClose}>
      <div className="space-y-4">
        {error && <div className="p-3 bg-error-container/40 border border-error/20 rounded-lg text-sm text-error">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-on-surface mb-1.5">Title *</label>
          <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="input-field" placeholder="e.g. Understanding Burden of Proof" autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-on-surface mb-1.5">Summary <span className="text-on-surface-variant font-normal">(shown on the article card)</span></label>
          <textarea value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} rows={3} className="input-field resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-on-surface mb-1.5">Tags <span className="text-on-surface-variant font-normal">(comma separated)</span></label>
          <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} className="input-field" placeholder="e.g. evidence, burden-of-proof" />
        </div>
        <label className="flex items-center gap-3 p-3.5 rounded-xl border border-outline-variant/25 bg-surface-container-low cursor-pointer select-none">
          <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))} className="w-4 h-4 accent-[rgb(var(--c-primary))]" />
          <span className="text-sm text-on-surface font-medium">
            Publish now
            <span className="block text-xs text-on-surface-variant font-normal">Unchecked = saved as a draft, hidden from readers.</span>
          </span>
        </label>
        <div className="pt-1 flex items-center justify-between gap-3 flex-wrap">
          {isEdit && (
            <Link href={`/editor?article=${article!.slug}`} className="inline-flex items-center gap-1.5 text-xs text-secondary hover:underline">
              <Pencil className="w-3 h-3" /> Open in the editor
            </Link>
          )}
          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container transition-colors">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? "Save changes" : "Create draft"}
            </button>
          </div>
        </div>
        {!isEdit && (
          <p className="text-[11px] text-on-surface-variant">Creating the draft opens the article editor so you can write the content.</p>
        )}
      </div>
    </Modal>
  );
}

/* ────────────────────────────────────────────────────────────
   Ban modal
   ──────────────────────────────────────────────────────────── */

function BanModal({ user, onClose, onBan, busy }: {
  user: AdminUser; onClose: () => void; onBan: (reason: string) => void; busy: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal title="Ban reader" subtitle={`Restrict @${user.username} from signing in.`} onClose={onClose}>
      <p className="text-sm text-on-surface-variant mb-3">Reason <span className="text-on-surface-variant/60">(optional, stored on the account)</span></p>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Repeated spam or abuse"
        className="input-field mb-5" autoFocus />
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container transition-colors">Cancel</button>
        <button onClick={() => onBan(reason.trim() || "Violation of terms")} disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-error text-on-error hover:opacity-90 disabled:opacity-60 transition-all">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}Ban reader
        </button>
      </div>
    </Modal>
  );
}
