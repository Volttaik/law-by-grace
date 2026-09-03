"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { BookOpen, Search, Eye, Sparkles, PenLine } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Article {
  id: string; slug: string; title: string; summary: string | null;
  isPublished: boolean; views: number; tags: string[];
  isOwner?: boolean;
  author: { name: string; username: string; image: string | null };
  editions: { id: string; number: number; publishedAt: string }[];
  _count: { editions: number };
}

function ArticleCard({ article, index }: { article: Article; index: number }) {
  const latestEdition = article.editions[0];
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
      <Link href={`/articles/${article.slug}`}
        style={{ "--shimmer-delay": `${index * 0.7}s` } as React.CSSProperties}
        className="block glow-border elevated-surface rounded-2xl p-5 hover:shadow-elevation-lg transition-all hover:-translate-y-0.5 group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-bold font-manrope text-on-surface text-base leading-snug mb-1.5 group-hover:text-secondary transition-colors line-clamp-2">
              {article.title}
            </h3>
            {article.summary && (
              <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2">{article.summary}</p>
            )}
          </div>
          {article.isOwner && (
            <div className="shrink-0">
              <span className="text-xs font-medium text-secondary bg-secondary-container/40 px-2.5 py-1 rounded-full">Yours</span>
            </div>
          )}
        </div>

        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {article.tags.slice(0, 4).map(tag => (
              <span key={tag} className="tag text-[10px] py-0.5">{tag}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-[11px] text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            {article.author.image
              ? <img src={article.author.image} alt={article.author.name} className="w-4 h-4 rounded-full object-cover" />
              : <div className="w-4 h-4 rounded-full bg-secondary-container flex items-center justify-center text-[8px] font-bold text-secondary">{article.author.name[0]}</div>
            }
            <span>{article.author.name}</span>
          </div>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{article.views} reads</span>
          {article._count.editions > 0 && (
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />Ed. {article.editions[0]?.number}</span>
          )}
          {latestEdition && (
            <span className="ml-auto">{new Date(latestEdition.publishedAt).toLocaleDateString()}</span>
          )}
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
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-20">
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
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="elevated-surface rounded-2xl p-5 h-32">
                <div className="shimmer rounded-lg h-5 w-2/3 mb-3" />
                <div className="shimmer rounded-lg h-3 w-full mb-2" />
                <div className="shimmer rounded-lg h-3 w-4/5" />
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
              {tab === "mine" ? "Draft your first article in the Law by Grace editor." : "Articles from the Law by Grace community will appear here."}
            </p>
            <Link href="/editor" className="btn-primary inline-flex items-center">
              <PenLine className="h-4 w-4" /> Write an Article
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((article, i) => <ArticleCard key={article.id} article={article} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}
