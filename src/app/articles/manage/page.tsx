"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, BookOpen, CalendarDays, Check, Clock, Eye, FileText,
  Image as ImageIcon, Layers, Loader2, PenLine, Plus, Search, Trash2,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { BottomSheet } from "@/components/editor/BottomSheet";
import { cn } from "@/lib/utils";

interface ManageArticle {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  banner: string;
  isPublished: boolean;
  hasDraft: boolean;
  status: "published" | "draft";
  views: number;
  likes: number;
  tags: string[];
  imageCount: number;
  sectionCount: number;
  referenceCourse: {
    id: string; title: string; slug: string; banner: string | null;
    courseCode: string | null; department: string | null; university: string | null;
  } | null;
  editions: { id: string; number: number; publishedAt: string }[];
  _count: { editions: number };
  createdAt: string;
  updatedAt: string;
}

type Filter = "all" | "draft" | "published";
type Sort = "updated" | "created";

function StatusBadge({ status, hasDraft }: { status: ManageArticle["status"]; hasDraft: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
          status === "published"
            ? "text-secondary bg-secondary-container/60 border-secondary/25"
            : "text-on-surface-variant bg-surface-container border-outline-variant/40"
        )}
      >
        {status === "published" ? <><Check className="h-3 w-3" /> Published</> : <><FileText className="h-3 w-3" /> Draft</>}
      </span>
      {status === "published" && hasDraft && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-primary bg-primary/10 border-primary/25">
          <PenLine className="h-3 w-3" /> Unpublished edits
        </span>
      )}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function ManageArticlesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [articles, setArticles] = useState<ManageArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("updated");
  const [selected, setSelected] = useState<ManageArticle | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/articles/manage");
      return;
    }
    if (status !== "authenticated") return;
    fetch("/api/articles?mine=true")
      .then(r => r.json())
      .then(d => { setArticles(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status, router]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 3000);
  };

  const filtered = useMemo(() => {
    let list = [...articles];
    if (filter === "draft") list = list.filter(a => a.status === "draft" || a.hasDraft);
    if (filter === "published") list = list.filter(a => a.status === "published");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.summary ?? "").toLowerCase().includes(q) ||
        a.referenceCourse?.title.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => new Date(sort === "updated" ? b.updatedAt : b.createdAt).getTime() - new Date(sort === "updated" ? a.updatedAt : a.createdAt).getTime());
    return list;
  }, [articles, filter, search, sort]);

  const openArticle = (a: ManageArticle) => {
    setSelected(a);
    setConfirmingDelete(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/articles/${selected.slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setArticles(list => list.filter(x => x.id !== selected.id));
      setSelected(null);
      setConfirmingDelete(false);
      showToast("Article deleted");
    } catch {
      showToast("Couldn't delete the article — try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen app-ambient-bg">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 pt-10 pb-24 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="elevated-surface rounded-2xl p-4 flex items-center gap-4">
              <div className="shimmer w-24 h-16 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="shimmer rounded-lg h-4 w-1/2" />
                <div className="shimmer rounded-lg h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-ambient-bg">
      <Navbar />

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] bg-surface-container-lowest border border-outline-variant/30 text-on-surface text-sm font-medium px-5 py-2.5 rounded-2xl shadow-modal"
        >
          {toast}
        </motion.div>
      )}

      <div className="max-w-3xl mx-auto px-4 pt-8 pb-24">
        {/* Header */}
        <div className="mb-6">
          <Link href="/articles" className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> Articles
          </Link>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-lg font-bold font-manrope text-on-surface">Manage Articles</h1>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {articles.length} article{articles.length === 1 ? "" : "s"} · drafts and published work
              </p>
            </div>
            <Link href="/editor" className="btn-primary inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> New article
            </Link>
          </div>
        </div>

        {/* Search + filter + sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search your articles…"
              className="input-field pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl overflow-hidden border border-outline-variant/20 shrink-0">
              {(["all", "draft", "published"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3.5 py-2.5 text-sm font-medium capitalize transition-colors",
                    filter === f ? "bg-secondary-container/60 text-on-secondary-container" : "text-on-surface-variant hover:bg-surface-container"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as Sort)}
              aria-label="Sort articles"
              className="input-field !w-auto !py-2.5 !pr-8 text-sm cursor-pointer"
            >
              <option value="updated">Updated</option>
              <option value="created">Created</option>
            </select>
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-2xl bg-secondary-container/20 flex items-center justify-center mx-auto mb-5">
              <FileText className="h-10 w-10 text-secondary" />
            </div>
            <h2 className="text-lg font-bold font-manrope text-on-surface mb-2">
              {articles.length === 0 ? "No articles yet" : "Nothing matches"}
            </h2>
            <p className="text-sm text-on-surface-variant mb-6 max-w-xs mx-auto">
              {articles.length === 0
                ? "Write your first article and manage it from here."
                : "Try a different search or filter."}
            </p>
            {articles.length === 0 && (
              <Link href="/editor" className="btn-primary inline-flex items-center">
                <PenLine className="h-4 w-4" /> Write an Article
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a, i) => (
              <motion.button
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                onClick={() => openArticle(a)}
                className="w-full text-left elevated-surface rounded-2xl p-3.5 flex items-center gap-4 hover:shadow-elevation-lg hover:-translate-y-0.5 transition-all group"
              >
                {/* Banner thumb */}
                <div className="w-24 h-16 rounded-xl overflow-hidden shrink-0 bg-surface-container-high border border-outline-variant/15">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.banner} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold font-manrope text-on-surface text-sm leading-snug group-hover:text-secondary transition-colors truncate">
                      {a.title || "Untitled"}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={a.status} hasDraft={a.hasDraft} />
                    {a.referenceCourse && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-on-surface-variant truncate max-w-[180px]">
                        <BookOpen className="h-3 w-3 shrink-0" />
                        <span className="truncate">{a.referenceCourse.title}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant/80 mt-1.5 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDate(a.updatedAt)}</span>
                    {a.sectionCount > 0 && <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" /> {a.sectionCount} section{a.sectionCount === 1 ? "" : "s"}</span>}
                    {a.imageCount > 0 && <span className="inline-flex items-center gap-1"><ImageIcon className="h-3 w-3" /> {a.imageCount}</span>}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Article detail */}
      <BottomSheet
        open={!!selected}
        onClose={() => { setSelected(null); setConfirmingDelete(false); }}
        title={selected ? (selected.title || "Untitled") : ""}
        centered
      >
        {selected && (
          <div>
            {/* Banner */}
            <div className="rounded-xl overflow-hidden h-32 mb-4 bg-surface-container-high border border-outline-variant/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.banner} alt="" className="w-full h-full object-cover" />
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <StatusBadge status={selected.status} hasDraft={selected.hasDraft} />
            </div>

            {selected.summary && (
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{selected.summary}</p>
            )}

            {/* Facts */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-5">
              {selected.referenceCourse && (
                <div className="col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 mb-1">Referenced course</dt>
                  <dd className="flex items-center gap-2 min-w-0">
                    <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    <Link href={`/courses/${selected.referenceCourse.slug}`} className="text-on-surface font-semibold hover:text-primary transition-colors truncate">
                      {selected.referenceCourse.title}
                    </Link>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 mb-1">Created</dt>
                <dd className="flex items-center gap-1.5 text-on-surface"><CalendarDays className="h-3.5 w-3.5 text-on-surface-variant" /> {fmtDate(selected.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 mb-1">Updated</dt>
                <dd className="flex items-center gap-1.5 text-on-surface"><CalendarDays className="h-3.5 w-3.5 text-on-surface-variant" /> {fmtDate(selected.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 mb-1">Sections</dt>
                <dd className="flex items-center gap-1.5 text-on-surface"><Layers className="h-3.5 w-3.5 text-on-surface-variant" /> {selected.sectionCount}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 mb-1">Images</dt>
                <dd className="flex items-center gap-1.5 text-on-surface"><ImageIcon className="h-3.5 w-3.5 text-on-surface-variant" /> {selected.imageCount}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 mb-1">Reads</dt>
                <dd className="flex items-center gap-1.5 text-on-surface"><Eye className="h-3.5 w-3.5 text-on-surface-variant" /> {selected.views}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 mb-1">Editions</dt>
                <dd className="flex items-center gap-1.5 text-on-surface"><FileText className="h-3.5 w-3.5 text-on-surface-variant" /> {selected._count.editions}</dd>
              </div>
            </dl>

            {/* Delete confirmation */}
            {confirmingDelete ? (
              <div className="rounded-xl border border-error/30 bg-error-container/15 p-4 mb-4">
                <p className="text-sm font-semibold text-on-surface mb-1">Delete this article?</p>
                <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                  “{selected.title || "Untitled"}” and all of its drafts and editions will be removed. This can't be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-outline-variant/30 text-on-surface hover:bg-surface-container transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-error text-on-error hover:brightness-110 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href={`/editor?article=${selected.slug}`}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:brightness-110 transition-all inline-flex items-center justify-center gap-1.5"
                >
                  <PenLine className="h-4 w-4" /> Edit
                </Link>
                <Link
                  href={`/articles/${selected.slug}`}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-outline-variant/30 text-on-surface hover:bg-surface-container transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Eye className="h-4 w-4" /> View
                </Link>
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold border border-error/30 text-error hover:bg-error-container/20 transition-colors inline-flex items-center justify-center gap-1.5"
                  aria-label="Delete article"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}