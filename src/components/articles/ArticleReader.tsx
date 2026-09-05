"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, Check, ChevronDown, ChevronRight, ExternalLink,
  Eye, Heart, Image as ImageIcon, ListTree, PenLine, Quote, Share2,
  Sparkles, TextQuote, X,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";
import { parseSections, type SectionNode } from "@/lib/article-content";
import { SectionConnector, SectionFlowSpacer } from "@/components/articles/SectionConnector";
import { SectionReferenceCard, sectionRefData } from "@/components/articles/SectionReferenceCard";

interface Edition { id: string; number: number; label: string; content: string; publishedAt: string; }
interface ReferenceCourse {
  id: string; title: string; slug: string; description: string | null;
  courseCode: string | null; university: string | null; department: string | null; banner: string | null;
}
export interface ArticleReaderData {
  id: string; slug: string; title: string; summary: string | null;
  tags: string[]; views: number; likes: number; isOwner: boolean; banner: string;
  author: { name: string; username: string; image: string | null };
  referenceCourse: ReferenceCourse | null;
  editions: Edition[];
}

interface TipTapNode {
  type: string; text?: string; attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: TipTapNode[];
}

/* ─── Node renderer (TipTap JSON → styled article HTML) ─────────────────── */

function RenderNode({ node }: { node: TipTapNode }): React.ReactNode {
  if (!node) return null;
  const children = node.content?.map((c, i) => <RenderNode key={i} node={c} />);

  switch (node.type) {
    case "doc": return <>{children}</>;
    case "paragraph": return <p className="mb-4 leading-relaxed">{children}</p>;
    case "heading": {
      const level = (node.attrs?.level as number) || 1;
      const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
      return (
        <Tag className={cn(
          "font-manrope font-bold",
          level === 1 && "text-3xl mt-8 mb-4",
          level === 2 && "text-2xl mt-6 mb-3",
          level === 3 && "text-xl mt-5 mb-2.5",
          level === 4 && "text-lg mt-4 mb-2"
        )}>{children}</Tag>
      );
    }
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
    case "image": return (
      <figure className="my-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={node.attrs?.src as string} alt={(node.attrs?.alt as string) || ""} className="w-full max-h-[480px] object-contain rounded-xl bg-surface-container-low" />
      </figure>
    );
    case "articleAttachment": {
      const a = (node.attrs ?? {}) as { type?: string; id?: string; slug?: string; title?: string; subtitle?: string; url?: string };
      if (!a.url || !a.id) return null;
      const isCourse = a.type !== "material";
      return (
        <a href={a.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3.5 my-5 hover:bg-primary/10 transition-colors no-underline">
          <span className="w-10 h-10 rounded-lg shrink-0 bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-primary">
            {isCourse ? <BookOpen className="h-5 w-5" /> : <TextQuote className="h-5 w-5" />}
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
    case "sectionReference": return null; // rendered as the flow reference card
    default: return <span>{children}</span>;
  }
}

/* ─── Structure map (discovery mode) ─────────────────────────────────────── */

function RefTypeIcon({ type }: { type: string | null }) {
  if (type === "image") return <ImageIcon className="h-3.5 w-3.5" />;
  if (type === "quote") return <Quote className="h-3 w-3" />;
  return <TextQuote className="h-3.5 w-3.5" />;
}

/* ─── Main reader ────────────────────────────────────────────────────────── */

export default function ArticleReader({ article }: { article: ArticleReaderData }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeEditionIdx, setActiveEditionIdx] = useState(0);
  const [showEditions, setShowEditions] = useState(false);
  const [showStructure, setShowStructure] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(article.likes);
  const [copied, setCopied] = useState(false);

  const activeEdition = article.editions[activeEditionIdx];
  const { sections, legacyHtml } = useMemo(() => {
    if (!activeEdition) return { sections: [], legacyHtml: null };
    let parsed: unknown = null;
    try { parsed = JSON.parse(activeEdition.content); } catch { /* legacy HTML */ }
    const isJson = !!parsed && typeof parsed === "object" && Array.isArray((parsed as { content?: unknown }).content);
    if (!isJson) return { sections: [], legacyHtml: activeEdition.content };
    return { sections: parseSections(activeEdition.content), legacyHtml: null };
  }, [activeEdition]);
  const likesKey = `article-liked-${article.slug}`;

  useEffect(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      setLiked(localStorage.getItem(likesKey) === "1");
    }
  }, [likesKey]);

  const jumpTo = (id: string) => {
    setShowStructure(false);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleLike = async () => {
    if (!session?.user) { router.push("/login"); return; }
    if (liked) return;
    setLiked(true);
    setLikeCount(c => c + 1);
    localStorage.setItem(likesKey, "1");
    await fetch(`/api/articles/${article.slug}/like`, { method: "POST" }).catch(() => {});
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = { title: article.title, text: article.summary || undefined, url };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch { /* cancelled */ }
    }
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const course = article.referenceCourse;
  const editionLabel = activeEdition?.label || "Edition 1";

  return (
    <div className="min-h-screen app-ambient-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        {/* Banner */}
        <div className="relative -mx-4 md:mx-0 md:rounded-2xl overflow-hidden h-44 md:h-64 mb-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.banner} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent md:bg-gradient-to-t md:from-background/70" />
        </div>

        <Link href="/articles" className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> All Articles
        </Link>

        {/* Header */}
        <header className="mb-8">
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {article.tags.map(tag => <span key={tag} className="tag-accent text-[11px]">{tag}</span>)}
            </div>
          )}
          <h1 className="text-[1.75rem] md:text-4xl font-bold font-manrope text-on-surface leading-tight mb-4">
            {article.title}
          </h1>
          {article.summary && (
            <p className="text-lg text-on-surface-variant leading-relaxed mb-5">{article.summary}</p>
          )}

          {/* Compact reference course */}
          {course && (
            <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-surface-container-high border border-outline-variant/20 flex items-center justify-center">
                {course.banner ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.banner} alt="" className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80 mb-0.5">This article is about</p>
                <Link href={`/courses/${course.slug}`} className="block text-sm font-bold font-manrope text-on-surface truncate hover:text-primary transition-colors">
                  {course.title}
                </Link>
                <p className="text-xs text-on-surface-variant truncate mt-0.5">
                  {[course.courseCode, course.department, course.university].filter(Boolean).join(" · ") || "Course in the library"}
                </p>
              </div>
              <Link
                href={`/courses/${course.slug}`}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:brightness-110 transition-all"
              >
                View course <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-4 text-sm text-on-surface-variant flex-wrap">
            <div className="flex items-center gap-2">
              {article.author.image
                ? <img src={article.author.image} alt={article.author.name} className="w-6 h-6 rounded-full object-cover" />
                : <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center text-xs font-bold text-secondary">{article.author.name[0]}</div>}
              <Link href={`/profile/${article.author.username}`} className="hover:text-on-surface transition-colors">{article.author.name}</Link>
            </div>
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{article.views} reads</span>
            {activeEdition && (
              <span>{new Date(activeEdition.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
            )}
            {article.isOwner && (
              <Link href={`/editor?article=${article.slug}`} className="flex items-center gap-1.5 text-secondary hover:underline">
                <PenLine className="h-3.5 w-3.5" /> Edit
              </Link>
            )}
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-outline-variant/20">
            <motion.button whileTap={{ scale: 0.88 }} onClick={handleLike}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border",
                liked ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                  : "border-outline-variant/25 text-on-surface-variant hover:border-rose-400/40 hover:text-rose-500 hover:bg-rose-500/5"
              )}>
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
              <span>{likeCount > 0 ? likeCount : ""}</span>
              {liked ? "Liked" : "Like"}
            </motion.button>

            <motion.button whileTap={{ scale: 0.88 }} onClick={handleShare}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border",
                copied ? "bg-secondary-container/50 border-secondary/30 text-secondary"
                  : "border-outline-variant/25 text-on-surface-variant hover:border-secondary/40 hover:text-on-surface hover:bg-surface-container-high"
              )}>
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {copied ? "Copied!" : "Share"}
            </motion.button>

            {sections.length > 1 && (
              <button onClick={() => setShowStructure(v => !v)}
                className={cn(
                  "ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border",
                  showStructure
                    ? "bg-secondary-container/50 border-secondary/30 text-secondary"
                    : "border-outline-variant/25 text-on-surface-variant hover:border-secondary/40 hover:text-on-surface hover:bg-surface-container-high"
                )}>
                <ListTree className="h-4 w-4" />
                Sections
                <span className="text-[10px] font-bold tabular-nums bg-surface-container-high rounded-full px-1.5 py-0.5">{sections.length}</span>
              </button>
            )}
          </div>
        </header>

        {/* Edition selector */}
        {article.editions.length > 1 && (
          <div className="relative mb-6">
            <button onClick={() => setShowEditions(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary-container/30 border border-secondary/20 text-xs font-medium text-on-secondary-container hover:bg-secondary-container/50 transition-colors">
              <Sparkles className="h-3.5 w-3.5" />
              {editionLabel}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showEditions && (
              <div className="absolute top-12 left-0 z-20 elevated-surface-strong rounded-xl overflow-hidden min-w-[200px] py-1">
                {article.editions.map((ed, i) => (
                  <button key={ed.id} onClick={() => { setActiveEditionIdx(i); setShowEditions(false); }}
                    className={cn("w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-high transition-colors flex items-center justify-between",
                      i === activeEditionIdx ? "text-secondary font-medium" : "text-on-surface")}>
                    {ed.label}
                    <span className="text-[11px] text-on-surface-variant">{new Date(ed.publishedAt).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {!activeEdition ? (
          <div className="text-center py-16 text-on-surface-variant">
            <p>No content published yet.</p>
            {article.isOwner && <Link href={`/editor?article=${article.slug}`} className="btn-primary mt-4 inline-flex">Start writing</Link>}
          </div>
        ) : legacyHtml ? (
          // Legacy plain-HTML article — render as-is, keeping the old reading style.
          <div className="text-on-surface text-[17px] leading-relaxed" dangerouslySetInnerHTML={{ __html: legacyHtml }} />
        ) : sections.length === 0 ? (
          <div className="text-on-surface text-[17px] leading-relaxed">
            <p className="text-on-surface-variant/70 italic">This article has no content yet.</p>
          </div>
        ) : (
          <div className="article-flow">
            {/* Structure / discovery map */}
            {showStructure && (
              <div className="article-structure-panel mb-10">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Article structure</p>
                  <button onClick={() => setShowStructure(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors" aria-label="Close structure">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-col">
                  {sections.map((s, i) => (
                    <Fragment key={s.id}>
                      {i > 0 && <SectionFlowSpacer />}
                      <button onClick={() => jumpTo(s.id)}
                        className="structure-node group">
                        <span className="structure-node-dot">{i + 1}</span>
                        <span className="flex-1 min-w-0 text-left">
                          <span className="block text-sm font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                            {s.title || `Section ${i + 1}`}
                          </span>
                          <span className="block text-[10px] text-on-surface-variant uppercase tracking-wider">
                            {s.reference ? "With supporting material" : "Reading"}
                          </span>
                        </span>
                        <span className="w-6 h-6 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0 group-hover:text-primary transition-colors">
                          <RefTypeIcon type={s.reference?.type === "sectionReference" ? ((s.reference.attrs?.type as string) ?? null) : null} />
                        </span>
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Section flow */}
            {sections.map((section, i) => {
              const refData = sectionRefData(section);
              const bodyNodes = section.nodes.filter(n => n.type !== "sectionReference");
              return (
                <section key={section.id} id={section.id} className="article-section scroll-mt-32">
                  {section.heading && <RenderNode node={section.heading} />}

                  <div className="text-on-surface text-[17px] leading-relaxed">
                    {bodyNodes.length === 0
                      ? <p className="text-on-surface-variant/70 italic">This section is being written.</p>
                      : bodyNodes.map((n, ni) => <RenderNode key={ni} node={n} />)}
                  </div>

                  {refData && (
                    <>
                      <div className="section-connector-wrap">
                        <SectionConnector flip={i % 2 === 1} />
                      </div>
                      <SectionReferenceCard refData={refData} sectionIndex={section.index} />
                    </>
                  )}

                  {i < sections.length - 1 && (
                    <button onClick={() => jumpTo(sections[i + 1].id)}
                      className="next-section-link group">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant group-hover:text-primary transition-colors">
                        Next section · {i + 2}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                        {sections[i + 1].title || `Section ${i + 2}`}
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </button>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}