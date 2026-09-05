"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { BookOpen, Search, Eye, Sparkles, PenLine, Image as ImageIcon } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Article {
  id: string; slug: string; title: string; summary: string | null;
  isPublished: boolean; views: number; tags: string[];
  isOwner?: boolean;
  banner: string;
  images: string[];
  imageCount: number;
  author: { name: string; username: string; image: string | null };
  editions: { id: string; number: number; publishedAt: string }[];
  _count: { editions: number };
}

/* Stacked circular image previews — communicates "this article has N images". */
function ImagePreviews({ images, count }: { images: string[]; count: number }) {
  if (count === 0) return null;
  const visible = images.slice(0, 3);
  const extra = count - visible.length;
  return (
    <div className="flex items-center" aria-label={`${count} image${count === 1 ? "" : "s"} in this article`}>
      {visible.map((src, i) => (
        <div
          key={i}
          className="w-8 h-8 rounded-full overflow-hidden border-2 border-surface-container-lowest shadow-md shrink-0 -ml-2 first:ml-0"
          style={{ zIndex: visible.length - i }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      ))}
      {extra > 0 && (
        <div className="w-8 h-8 rounded-full -ml-2 border-2 border-surface-container-lowest bg-secondary-container text-secondary shadow-md shrink-0 flex items-center justify-center text-[10px] font-bold tabular-nums">
          +{extra}
        </div>
      )}
    </div>
  );
}

function ArticleCard({ article, index }: { article: Article; index: number }) {
  const latestEdition = article.editions[0];
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
      <Link href={`/articles/${article.slug}`}
        className="block glow-border elevated-surface rounded-2xl overflow-hidden hover:shadow-elevation-lg transition-all hover:-translate-y-0.5 group">
        {/* Banner */}
        <div className="relative aspect-[16/9] overflow-hidden bg-surface-container-high">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.banner} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
          {/* Stacked image previews — top-right corner, never competing with the banner */}
          <div className="absolute top-3 right-3">
            <ImagePreviews images={article.images} count={article.imageCount} />
          </div>
          {article.imageCount > 0 && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 text-[10px] font-semibold text-on-surface-variant bg-surface-container-lowest/90 backdrop-blur-sm px-2 py-1 rounded-full border border-outline-variant/20">
              <ImageIcon className="h-3 w-3" /> {article.imageCount}
            </span>
          )}
          {article.isOwner && (
            <span className="absolute top-3 left-3 text-[10px] font-semibold text-secondary bg-secondary-container/90 backdrop-blur-sm px-2.5 py-1 rounded-full border border-secondary/20">
              Yours
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-5">
          <h3 className="font-bold font-manrope text-on-surface text-base leading-snug mb-1.5 group-hover:text-secondary transition-colors line-clamp-2">
            {article.title}
          </h3>
          {article.summary && (
            <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2 mb-3">{article.summary}</p>
          )}

          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {article.tags.slice(0, 3).map(tag => (
                <span key={tag} className="tag text-[10px] py-0.5">{tag}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 text-[11px] text-on-surface-variant">
            <div className="flex items-center gap-1.5 min-w-0">
              {article.author.image
                ? <img src={article.author.image} alt={article.author.name} className="w-4 h-4 rounded-full object-cover" />
                : <div className="w-4 h-4 rounded-full bg-secondary-container flex items-center justify-center text-[8px] font-bold text-secondary">{article.author.name[0]}</div>
              }
              <span className="truncate">{article.author.name}</span>
            </div>
            <span className="flex items-center gap-1 shrink-0"><Eye className="h-3 w-3" />{article.views}</span>
            {article._count.editions > 0 && (
              <span className="flex items-center gap-1 shrink-0"><Sparkles className="h-3 w-3" />Ed. {article.editions[0]?.number}</span>
            )}
            {latestEdition && (
              <span className="ml-auto shrink-0">{new Date(latestEdition.publishedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function ArticlesPage() {
  const { status } = useSession();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "mine">("all");

  useEffect(() => {
    setLoading(true);
    const mine = tab === "mine" && status === "authenticated";
    fetch(`/api/articles?mine=${mine}`).then(r => r.json()).then(d => { setArticles(Array.isArray(d) ? d : []); setLoading(false); });
  }, [tab, status]);

  const filtered = articles.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.summary?.toLowerCase().includes(search.toLowerCase()) || a.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen app-ambient-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-lg font-bold font-manrope text-on-surface">Articles</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">Legal writing and ideas — contributed by members of the library</p>
        </div>

        {/* Search + tabs */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles…" className="input-field pl-10" />
          </div>
          {status === "authenticated" && (
            <div className="flex rounded-xl overflow-hidden border border-outline-variant/20">
              {(["all", "mine"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} className={cn("px-4 py-2.5 text-sm font-medium capitalize transition-colors", tab === t ? "bg-secondary-container/60 text-on-secondary-container" : "text-on-surface-variant hover:bg-surface-container")}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="elevated-surface rounded-2xl overflow-hidden">
                <div className="shimmer aspect-[16/9]" />
                <div className="p-5 space-y-2.5">
                  <div className="shimmer rounded-lg h-5 w-2/3" />
                  <div className="shimmer rounded-lg h-3 w-full" />
                  <div className="shimmer rounded-lg h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-2xl bg-secondary-container/20 flex items-center justify-center mx-auto mb-5">
              <BookOpen className="h-10 w-10 text-secondary" />
            </div>
            <h2 className="text-lg font-bold font-manrope text-on-surface mb-2">{tab === "mine" ? "No articles yet" : "No articles found"}</h2>
            <p className="text-sm text-on-surface-variant mb-6 max-w-xs mx-auto">
              {tab === "mine" ? "Draft your first article in the editor on THE LAW With Gracious." : "Articles from THE LAW With Gracious community will appear here."}
            </p>
            <Link href="/editor" className="btn-primary inline-flex items-center">
              <PenLine className="h-4 w-4" /> Write an Article
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((article, i) => <ArticleCard key={article.id} article={article} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}