"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, Loader2, PenLine, ChevronDown, ArrowLeft, Sparkles, Heart, Share2, Check, BookOpen, FileText, ExternalLink } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Edition { id: string; number: number; label: string; content: string; publishedAt: string; }
interface ReferenceCourse {
  id: string; title: string; slug: string; description: string | null;
  courseCode: string | null; university: string | null; department: string | null; banner: string | null;
  isPublic: boolean;
}
interface ArticleData {
  id: string; slug: string; title: string; summary: string | null;
  views: number; likes: number; tags: string[];
  isOwner: boolean;
  referenceCourse: ReferenceCourse | null;
  author: { name: string; username: string; image: string | null; bio: string | null };
  editions: Edition[];
  _count: { editions: number };
}

function ArticleContent({ content }: { content: string }) {
  let parsed: { type: string; content?: unknown[] } | null = null;
  try { parsed = JSON.parse(content); } catch { /* plain text */ }

  if (!parsed) {
    return <div className="prose prose-stone dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />;
  }

  const renderNode = (node: { type: string; text?: string; attrs?: Record<string, unknown>; marks?: { type: string; attrs?: Record<string, unknown> }[]; content?: unknown[] }): React.ReactNode => {
    if (!node) return null;
    const children = node.content?.map((c, i) => <span key={i}>{renderNode(c as { type: string; text?: string; attrs?: Record<string, unknown>; marks?: { type: string; attrs?: Record<string, unknown> }[]; content?: unknown[] })}</span>);

    switch (node.type) {
      case "doc": return <>{children}</>;
      case "paragraph": return <p className="mb-4 leading-relaxed">{children}</p>;
      case "heading": return (() => {
        const level = (node.attrs?.level as number) || 1;
        const Tag = `h${level}` as keyof JSX.IntrinsicElements;
        return <Tag className={cn("font-manrope font-bold", level === 1 && "text-3xl mt-8 mb-4", level === 2 && "text-2xl mt-6 mb-3", level === 3 && "text-xl mt-5 mb-2.5", level === 4 && "text-lg mt-4 mb-2")}>{children}</Tag>;
      })();
      case "text": {
        let el: React.ReactNode = node.text || "";
        node.marks?.forEach(m => {
          if (m.type === "bold") el = <strong>{el}</strong>;
          if (m.type === "italic") el = <em>{el}</em>;
          if (m.type === "underline") el = <u>{el}</u>;
          if (m.type === "strike") el = <s>{el}</s>;
          if (m.type === "code") el = <code className="bg-surface-container-high px-1.5 py-0.5 rounded text-sm font-mono text-secondary">{el}</code>;
          if (m.type === "textStyle" && m.attrs?.color) el = <span style={{ color: m.attrs.color as string }}>{el}</span>;
          if (m.type === "textStyle" && m.attrs?.fontSize) el = <span style={{ fontSize: m.attrs.fontSize as string }}>{el}</span>;
          if (m.type === "link" && m.attrs?.href) el = <a href={m.attrs.href as string} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80 break-words">{el}</a>;
          if (m.type === "highlight" && m.attrs?.color) el = <mark style={{ background: m.attrs.color as string }} className="rounded px-0.5">{el}</mark>;
        });
        return <>{el}</>;
      }
      case "bulletList": return <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>;
      case "orderedList": return <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>;
      case "listItem": return <li>{children}</li>;
      case "blockquote": return <blockquote className="border-l-4 border-secondary pl-4 italic text-on-surface-variant my-4">{children}</blockquote>;
      case "codeBlock": return <pre className="bg-surface-container-highest border border-outline-variant/30 rounded-xl p-4 overflow-x-auto my-4"><code className="text-sm font-mono">{children}</code></pre>;
      case "image": return <img src={node.attrs?.src as string} alt={node.attrs?.alt as string || ""} className="max-w-full rounded-xl my-4" data-image={node.attrs?.["data-image"] as string || ""} />;
      case "articleAttachment": {
        const a = (node.attrs ?? {}) as {
          type?: string; id?: string; slug?: string; title?: string; subtitle?: string; url?: string;
        };
        if (!a.url || !a.id) return null;
        const isCourse = a.type !== "material";
        return (
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3.5 my-5 hover:bg-primary/10 transition-colors no-underline"
          >
            <span className="w-10 h-10 rounded-lg shrink-0 bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-primary">
              {isCourse ? <BookOpen className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-primary/80">
                {isCourse ? "Related course" : "Related material"}
              </span>
              <span className="block text-sm font-semibold font-manrope text-on-surface truncate">{a.title || "Library content"}</span>
              {a.subtitle && <span className="block text-xs text-on-surface-variant truncate">{a.subtitle}</span>}
            </span>
            <ExternalLink className="h-4 w-4 text-primary shrink-0" />
          </a>
        );
      }
      case "horizontalRule": return <hr className="border-outline-variant/30 my-6" />;
      case "hardBreak": return <br />;
      default: return <span>{children}</span>;
    }
  };

  return (
    <div className="text-on-surface text-[17px] leading-relaxed">
      {parsed && renderNode(parsed as { type: string; text?: string; attrs?: Record<string, unknown>; marks?: { type: string; attrs?: Record<string, unknown> }[]; content?: unknown[] })}
    </div>
  );
}

export default function ArticlePage() {
  const { data: session, status } = useSession();
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeEditionIdx, setActiveEditionIdx] = useState(0);
  const [showEditions, setShowEditions] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/articles/${slug}`).then(r => r.json()).then(data => {
      if (data.error) router.push("/articles");
      else {
        setArticle(data);
        setLikeCount(data.likes ?? 0);
        setLoading(false);
      }
    });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const key = `article-liked-${slug}`;
    setLiked(localStorage.getItem(key) === "1");
  }, [slug]);

  const handleLike = async () => {
    if (!session?.user) { router.push("/login"); return; }
    if (liked) return;
    const key = `article-liked-${slug}`;
    setLiked(true);
    setLikeCount(c => c + 1);
    localStorage.setItem(key, "1");
    await fetch(`/api/articles/${slug}/like`, { method: "POST" });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return <div className="min-h-screen app-ambient-bg flex items-center justify-center"><Navbar /><div className="spinner spinner-lg" /></div>;
  if (!article) return null;

  const activeEdition = article.editions[activeEditionIdx];

  return (
    <div className="min-h-screen app-ambient-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-20">
        <div className="mb-8">
          <Link href="/articles" className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> All Articles
          </Link>

          {/* Header */}
          <div className="mb-6">
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {article.tags.map(tag => <span key={tag} className="tag-accent text-[11px]">{tag}</span>)}
              </div>
            )}
            <h1 className="text-3xl font-bold font-manrope text-on-surface leading-tight mb-4">{article.title}</h1>
            {article.summary && <p className="text-lg text-on-surface-variant leading-relaxed mb-4">{article.summary}</p>}

            {/* Reference course — the article is about this course */}
            {article.referenceCourse && (
              <div className="mb-6 rounded-2xl border border-primary/25 bg-primary/5 p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-surface-container-high border border-outline-variant/20 flex items-center justify-center">
                  {article.referenceCourse.banner ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={article.referenceCourse.banner} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80 mb-0.5">About this article · course</p>
                  <p className="text-base font-bold font-manrope text-on-surface truncate">{article.referenceCourse.title}</p>
                  <p className="text-xs text-on-surface-variant truncate mt-0.5">
                    {[article.referenceCourse.courseCode, article.referenceCourse.department, article.referenceCourse.university].filter(Boolean).join(" · ") || "Course in the library"}
                  </p>
                </div>
                <Link
                  href={`/courses/${article.referenceCourse.slug}`}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:brightness-110 transition-all"
                >
                  View course <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-4 text-sm text-on-surface-variant flex-wrap">
              <div className="flex items-center gap-2">
                {article.author.image ? <img src={article.author.image} alt={article.author.name} className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center text-xs font-bold text-secondary">{article.author.name[0]}</div>}
                <Link href={`/profile/${article.author.username}`} className="hover:text-on-surface transition-colors">{article.author.name}</Link>
              </div>
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{article.views} reads</span>
              {article.isOwner && (
                <Link href={`/editor?article=${slug}`} className="flex items-center gap-1.5 text-secondary hover:underline">
                  <PenLine className="h-3.5 w-3.5" /> Edit
                </Link>
              )}
            </div>

            {/* Action bar — like & share */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-outline-variant/20">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border",
                  liked
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                    : "border-outline-variant/25 text-on-surface-variant hover:border-rose-400/40 hover:text-rose-500 hover:bg-rose-500/5"
                )}
              >
                <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                <span>{likeCount > 0 ? likeCount : ""}</span>
                {liked ? "Liked" : "Like"}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={handleShare}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border",
                  copied
                    ? "bg-secondary-container/50 border-secondary/30 text-secondary"
                    : "border-outline-variant/25 text-on-surface-variant hover:border-secondary/40 hover:text-on-surface hover:bg-surface-container-high"
                )}
              >
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {copied ? "Copied!" : "Share"}
              </motion.button>
            </div>
          </div>

          {/* Edition selector */}
          {article.editions.length > 1 && (
            <div className="relative mb-6">
              <button onClick={() => setShowEditions(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary-container/30 border border-secondary/20 text-xs font-medium text-on-secondary-container hover:bg-secondary-container/50 transition-colors">
                <Sparkles className="h-3.5 w-3.5" />
                {activeEdition?.label || "Edition 1"}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showEditions && (
                <div className="absolute top-12 left-0 z-20 elevated-surface-strong rounded-xl overflow-hidden min-w-[200px] py-1">
                  {article.editions.map((ed, i) => (
                    <button key={ed.id} onClick={() => { setActiveEditionIdx(i); setShowEditions(false); }}
                      className={cn("w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-high transition-colors flex items-center justify-between", i === activeEditionIdx ? "text-secondary font-medium" : "text-on-surface")}>
                      {ed.label}
                      <span className="text-[11px] text-on-surface-variant">{new Date(ed.publishedAt).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Article content */}
          {activeEdition ? (
            <div className="relative" ref={contentRef}>
              <ArticleContent content={activeEdition.content} />
            </div>
          ) : (
            <div className="text-center py-16 text-on-surface-variant">
              <p>No content published yet.</p>
              {article.isOwner && <Link href={`/editor?article=${slug}`} className="btn-primary mt-4 inline-flex">Start writing</Link>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
