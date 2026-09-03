"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  ArrowRight, BookOpen, FileText, PlayCircle, Download,
  Search, Library, ChevronDown, Scale, GraduationCap, BookMarked, Feather,              Eye,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const AREAS_OF_LAW = [
  "Constitutional Law",
  "Criminal Law",
  "Contract Law",
  "Family Law",
  "Tort Law",
  "Property Law",
  "Company Law",
  "Evidence",
  "Legal Research",
  "Human Rights",
];

const FEATURES = [
  {
    icon: Library,
    title: "Courses by area of law",
    description: "Family Law, Criminal Law, Constitutional Law and more — each course gathers its materials in one calm, organised place.",
  },
  {
    icon: FileText,
    title: "Read PDFs in the app",
    description: "Open a judgement, textbook chapter or lecture note and read it directly inside the library — no downloads required.",
  },
  {
    icon: PlayCircle,
    title: "Watch lectures",
    description: "Educational videos stream with proper playback controls, so you can study a lecture the same way you would attend it.",
  },
  {
    icon: Download,
    title: "Study offline",
    description: "Download supported materials when you want them, and keep them on your device for study away from the library.",
  },
  {
    icon: Search,
    title: "Search the library",
    description: "Find courses, books, PDFs, articles and videos across the whole collection with one fast, clean search.",
  },
  {
    icon: Feather,
    title: "Read & write articles",
    description: "Explain a legal concept, discuss a recent development, or contribute your own educational writing.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Discover",
    description: "Browse the library by area of law. Beautiful cards show you what each course contains at a glance.",
    icon: Search,
  },
  {
    step: "02",
    title: "Study",
    description: "Open any material — read PDFs in the built-in reader or stream lectures — at your own pace.",
    icon: BookOpen,
  },
  {
    step: "03",
    title: "Keep learning",
    description: "Your dashboard remembers what you are studying so you can always pick up where you left off.",
    icon: GraduationCap,
  },
];

type CourseBrief = {
  slug: string;
  title: string;
  description?: string | null;
  department?: string | null;
  courseCode?: string | null;
  banner?: string | null;
  materialCount: number;
  views: number;
};

function DotGrid({ id, className = "" }: { id: string; className?: string }) {
  return (
    <svg className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <pattern id={id} x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

const SLIDE_GAP = 16;
const SLIDE_DURATION = 600;

function FeaturedCourses() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);
  const posRef = useRef(0);
  const [courses, setCourses] = useState<CourseBrief[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");
  const [layout, setLayout] = useState<{ step: number; visible: number } | null>(null);
  const [pos, setPos] = useState(0);
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/courses?sort=views&page=1")
      .then(r => r.json())
      .then(d => {
        if (!active) return;
        const list: CourseBrief[] = ((d?.courses ?? []) as any[]).slice(0, 8).map(s => ({
          slug: s.slug,
          title: s.title,
          description: s.description ?? null,
          department: s.department ?? null,
          courseCode: s.courseCode ?? null,
          banner: s.banner ?? null,
          materialCount: Number(s.materialCount ?? 0),
          views: Number(s.views ?? 0),
        }));
        setCourses(list);
        setStatus(list.length > 0 ? "ready" : "empty");
      })
      .catch(() => { if (active) setStatus("empty"); });
    return () => { active = false; };
  }, []);

  // Measure card size + how many fit per viewport.
  useEffect(() => {
    if (status !== "ready") return;
    const measure = () => {
      const vp = viewportRef.current;
      const track = trackRef.current;
      if (!vp || !track) return;
      const first = track.firstElementChild as HTMLElement | null;
      const step = (first?.offsetWidth ?? 320) + SLIDE_GAP;
      const visible = Math.max(1, Math.floor((vp.clientWidth + SLIDE_GAP) / step));
      setLayout({ step, visible });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (viewportRef.current) ro.observe(viewportRef.current);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [status]);

  const n = courses.length;
  const canSlide = layout !== null && n > 0 && layout.visible < n;
  const maxPos = layout ? 3 * n - layout.visible : 0;

  // Reset position whenever the layout changes (cards are tripled, so windows
  // at pos + n are visually identical — resets are invisible).
  useEffect(() => {
    if (canSlide) {
      posRef.current = Math.min(Math.max(posRef.current, 0), maxPos);
    } else {
      posRef.current = 0;
    }
    setAnimating(false);
    setPos(posRef.current);
  }, [canSlide, maxPos]);

  const animateTo = useCallback((target: number) => {
    posRef.current = target;
    setPos(target);
    setAnimating(true);
  }, []);

  const jumpTo = useCallback((target: number) => {
    posRef.current = target;
    setPos(target);
    setAnimating(false);
  }, []);

  const raf2 = useCallback((fn: () => void) => {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }, []);

  const slide = useCallback((dir: 1 | -1) => {
    const p = posRef.current;
    if (dir > 0) {
      if (p >= maxPos) {
        // Reached the end — jump to the identical window, then keep sliding.
        jumpTo(maxPos - n);
        raf2(() => animateTo(maxPos - n + 1));
      } else {
        animateTo(p + 1);
      }
    } else {
      if (p <= 0) {
        // At the start — jump to the identical window, then slide back.
        jumpTo(n);
        raf2(() => animateTo(n - 1));
      } else {
        animateTo(p - 1);
      }
    }
  }, [animateTo, jumpTo, maxPos, n, raf2]);

  const slideRef = useRef(slide);
  slideRef.current = slide;

  // Auto-advance (pauses on hover/touch).
  useEffect(() => {
    if (!canSlide) return;
    const id = setInterval(() => {
      if (!pausedRef.current && !document.hidden) slideRef.current(1);
    }, 3600);
    return () => clearInterval(id);
  }, [canSlide]);

  // Touch swipe support (left/right = next/previous).
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    pausedRef.current = true;
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) > 36) slideRef.current(dx < 0 ? 1 : -1);
    }
    touchStartX.current = null;
    pausedRef.current = false;
  };

  if (status === "empty") return null;

  const items = canSlide ? [...courses, ...courses, ...courses] : courses;
  const activeDot = canSlide ? pos % n : 0;

  return (
    <div className="py-14 md:py-20 px-4 md:px-6">
      <div className="max-w-[1200px] mx-auto">
        {status === "loading" ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-72 sm:w-80 shrink-0">
                <div className="h-32 bg-surface-container rounded-xl" />
                <div className="mt-3 space-y-2">
                  <div className="h-3 bg-surface-container rounded w-1/3" />
                  <div className="h-4 bg-surface-container rounded w-4/5" />
                  <div className="h-3 bg-surface-container rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={viewportRef}
            onMouseEnter={() => { pausedRef.current = true; }}
            onMouseLeave={() => { pausedRef.current = false; }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => { touchStartX.current = null; }}
            className="relative overflow-hidden touch-pan-y"
          >
            <div
              ref={trackRef}
              style={{
                transform: `translate3d(${-pos * (layout?.step ?? 0)}px, 0, 0)`,
                transition: animating ? `transform ${SLIDE_DURATION}ms cubic-bezier(0.25, 1, 0.5, 1)` : "none",
              }}
              className="flex gap-4 w-max"
            >
              {items.map((c, i) => (
                <CourseSlideCard key={`${c.slug}-${i}`} course={c} />
              ))}
            </div>

          </div>
        )}

        {canSlide && (
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {courses.map((c, i) => (
              <button
                key={c.slug}
                onClick={() => {
                  animateTo(i);
                  pausedRef.current = true;
                  setTimeout(() => { pausedRef.current = false; }, SLIDE_DURATION + 800);
                }}
                aria-label={`Go to course ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  activeDot === i ? "w-5 bg-primary" : "w-2 bg-outline-variant/70 hover:bg-outline"
                )}
              />
            ))}
          </div>
        )}

        <div className="flex justify-center mt-5">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors"
          >
            Browse all courses <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function CourseSlideCard({ course: c }: { course: CourseBrief }) {
  return (
    <Link href={`/courses/${c.slug}`} className="group snap-start shrink-0 w-72 sm:w-80 block">
      <article className="h-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden shadow-card flex flex-col transition-all group-hover:border-outline-variant/50 group-hover:-translate-y-0.5">
        {c.banner ? (
          <div className="h-32 relative overflow-hidden shrink-0 bg-surface-container">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.banner} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        ) : (
          <div className="h-32 shrink-0 bg-gradient-to-br from-surface-container-high to-surface-container border-b border-outline-variant/10 flex items-center justify-center">
            <Scale className="w-9 h-9 text-outline-variant/50" />
          </div>
        )}
        <div className="p-4 flex flex-col flex-1">
          <span className="w-fit text-[10px] font-semibold text-on-surface-variant bg-surface-container-high border border-outline-variant/40 px-2 py-0.5 rounded-full mb-2">
            {c.department || c.courseCode || "Legal studies"}
          </span>
          <h3 className="font-serif font-semibold text-[15px] text-on-surface leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
            {c.title}
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 mb-3">
            {c.description}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-on-surface-variant/80 pt-3 border-t border-outline-variant/10 mt-auto">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />{c.materialCount} material{c.materialCount === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />{formatNumber(c.views)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-[94vh] flex items-center overflow-hidden">
        {/* Top-half background image */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-[56%] overflow-hidden pointer-events-none select-none">
          <Image
            src="/home/hero-top-bg.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[72%_50%]"
          />
          {/* Left-to-right fade so the intro copy stays crisp in light mode */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/50 to-background/5" />
          {/* Bottom fade into the page background */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent" />
        </div>
        <div className="absolute inset-0 text-primary/[0.035]">
          <DotGrid id="hero-dots" />
        </div>
        <div
          className="absolute top-0 left-0 w-full h-[500px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(var(--c-primary-container), 0.35) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 md:px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left copy */}
          <motion.div initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-surface-container-lowest/80 backdrop-blur-sm text-on-surface-variant px-4 py-2 rounded-full text-xs font-semibold mb-8 border border-outline-variant/40 shadow-sm"
            >
              <Scale className="w-3.5 h-3.5 text-secondary" />
              Welcome to the Law by Grace e-library
            </motion.div>

            <h1 className="font-serif font-bold text-4xl md:text-[3rem] text-on-surface leading-[1.1] tracking-tight mb-5">
              Understand the law.
              <br />
              <span className="text-brand-gradient">Study with clarity.</span>
            </h1>

            <p className="text-on-surface-variant text-base md:text-[1.0625rem] leading-relaxed mb-8 max-w-[480px]">
              A collection of legal resources designed to help you understand law, study
              effectively, and discover useful legal materials — courses, books, PDFs,
              videos and articles, all in one calm place.
            </p>

            <div className="mb-10">
              <Link
                href="/explore"
                className="inline-flex items-center justify-center gap-2 bg-surface-container-lowest border border-outline-variant/40 text-on-surface px-5 py-3 rounded-xl font-semibold font-manrope text-sm hover:bg-surface-container transition-colors active:scale-[0.98]"
              >
                <Library className="w-4 h-4" /> Explore the library
              </Link>
            </div>

            {/* Quick areas */}
            <div className="flex flex-wrap gap-2 max-w-[520px]">
              {AREAS_OF_LAW.slice(0, 5).map(a => (
                <Link
                  key={a}
                  href={`/explore?q=${encodeURIComponent(a)}`}
                  className="text-xs px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/25 hover:border-secondary/40 hover:text-primary transition-colors"
                >
                  {a}
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Right image mosaic */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:grid grid-cols-2 grid-rows-2 gap-3 h-[520px]"
          >
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="row-span-2 relative rounded-2xl overflow-hidden shadow-card"
            >
              <Image src="/home/study-desk.png" alt="Studying law" fill sizes="280px" priority className="object-cover hover:scale-[1.03] transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-2xl overflow-hidden shadow-card"
            >
              <Image src="/home/books-course.png" alt="Law books" fill sizes="200px" className="object-cover hover:scale-[1.03] transition-transform duration-700" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-2xl overflow-hidden shadow-card"
            >
              <Image src="/home/online-study.png" alt="Study online" fill sizes="200px" className="object-cover hover:scale-[1.03] transition-transform duration-700" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="absolute -bottom-5 -left-6 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl px-4 py-3 shadow-modal z-10"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-surface-container-high border border-outline-variant/40 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-secondary" />
                </div>
                <div>
                  <p className="font-manrope font-semibold text-xs text-on-surface">Read in the app</p>
                  <p className="text-[10px] text-on-surface-variant">No download required</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="absolute -top-5 -right-4 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl px-4 py-3 shadow-modal z-10"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                  <BookMarked className="w-3.5 h-3.5 text-on-primary" />
                </div>
                <p className="font-manrope font-semibold text-xs text-on-surface">A calmer way to study law</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          animate={{ opacity: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-on-surface-variant/40"
        >
          <span className="text-[11px] font-medium tracking-wider uppercase">Scroll</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </motion.div>
      </section>

      {/* Featured courses slideshow */}
      <div className="h-16 bg-gradient-to-b from-background to-surface-container-low pointer-events-none -mt-px" />
      <section className="bg-surface-container-low overflow-hidden">
        <FeaturedCourses />
      </section>
      <div className="h-16 bg-gradient-to-b from-surface-container-low to-background pointer-events-none" />

      {/* ── WHY ─────────────────────────────────────────────── */}
      <section id="library" className="py-20 md:py-28 px-4 md:px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-5 bg-surface-container-high border border-outline-variant/40 px-3 py-1 rounded-full">The library</span>
              <h2 className="font-serif font-bold text-3xl md:text-4xl text-on-surface leading-tight mb-6">
                A calm e-library, curated for students of the law
              </h2>
              <p className="text-on-surface-variant leading-relaxed mb-5 text-base">
                Law by Grace brings legal educational materials together in one place — courses, books,
                PDFs, judgements, lectures and study guides — organised clearly and easy to reach.
              </p>
              <p className="text-on-surface-variant leading-relaxed text-base mb-8">
                The library is curated by Grace, our administrator. Every course is carefully
                assembled and kept up to date so you can trust what you find here.
              </p>

              <div className="mt-4 flex flex-col gap-3">
                {[
                  "Read PDFs and documents directly in the built-in reader",
                  "Stream educational videos with proper playback controls",
                  "Download materials to study offline, wherever you are",
                  "Light and dark themes designed for comfortable reading",
                ].map((point, i) => (
                  <motion.div
                    key={point}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-5 h-5 bg-surface-container-high border border-outline-variant/50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-secondary/70 rounded-full" />
                    </div>
                    <span className="text-sm text-on-surface-variant">{point}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="relative h-[420px] rounded-2xl overflow-hidden shadow-elevation-md">
                <Image src="/home/library-grand.png" alt="The reading room" fill sizes="560px" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-4 md:px-6 bg-surface-container-low relative overflow-hidden">
        <div className="absolute inset-0 text-primary/[0.028]">
          <DotGrid id="how-dots" />
        </div>

        <div className="max-w-[1200px] mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-xl mx-auto mb-16"
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-4 bg-surface-container-high border border-outline-variant/40 px-3 py-1 rounded-full">How it works</span>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-on-surface mt-3 mb-4">
              From curiosity to understanding
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              Open the library, pick a course, and start studying — whether you are preparing for exams
              or simply learning about the law.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+2.5rem)] right-[calc(16.67%+2.5rem)] h-px border-t border-dashed border-outline-variant/40 z-0" />

            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-8 flex flex-col items-center text-center relative z-10 shadow-card hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="w-14 h-14 bg-surface-container-high border border-outline-variant/40 rounded-xl flex items-center justify-center mb-5 shadow-sm">
                  <step.icon className="w-7 h-7 text-secondary" />
                </div>
                <span className="font-manrope font-bold text-5xl text-outline-variant/30 mb-2 leading-none tabular-nums select-none">
                  {step.step}
                </span>
                <h3 className="font-serif font-semibold text-base text-on-surface mb-3">{step.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-4 md:px-6">
        <div className="max-w-[1200px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-4 bg-surface-container-high border border-outline-variant/40 px-3 py-1 rounded-full">Everything you need</span>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-on-surface mt-3 mb-4">
              Built for focused legal study
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              No paywalls, no clutter — just a calm, beautiful library designed to help you learn the law.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-6 group hover:-translate-y-1 transition-all duration-300 shadow-card"
              >
                <div className="w-11 h-11 bg-surface-container-high border border-outline-variant/40 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors duration-300">
                  <feature.icon className="w-5 h-5 text-secondary group-hover:text-primary transition-colors duration-300" />
                </div>
                <h3 className="font-manrope font-semibold text-sm text-on-surface mb-2">{feature.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AREAS OF LAW ────────────────────────────────────── */}
      <section className="py-16 px-4 md:px-6 bg-ink-panel relative overflow-hidden">
        <div className="absolute inset-0 text-white/[0.05]">
          <DotGrid id="areas-dots" />
        </div>
        <div className="max-w-[1200px] mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-xl mx-auto mb-10"
          >
            <h2 className="font-serif font-bold text-3xl text-white mb-3">Areas of law in the library</h2>
            <p className="text-white/75">
              From constitutional principles to the law of contract — find the area you want to study.
            </p>
          </motion.div>
          <div className="flex flex-wrap justify-center gap-2.5">
            {AREAS_OF_LAW.map((area, i) => (
              <motion.div
                key={area}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <Link
                  href={`/explore?q=${encodeURIComponent(area)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white hover:text-[#1d4ed8] transition-colors"
                >
                  <Scale className="w-3.5 h-3.5" />
                  {area}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section className="py-28 px-4 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 text-primary/[0.03]">
          <DotGrid id="cta-dots" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-secondary-container/25 via-transparent to-primary-container/15 pointer-events-none" />

        <div className="max-w-[1200px] mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl mx-auto"
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden mx-auto mb-8 shadow-elevation-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon.svg" alt="Law by Grace" className="w-full h-full object-cover" />
            </div>

            <h2 className="font-serif font-bold text-4xl md:text-5xl text-on-surface leading-tight mb-5">
              Start studying law
              <br />
              the calm way.
            </h2>
            <p className="text-on-surface-variant text-lg mb-10 leading-relaxed">
              Join Law by Grace and step into a beautiful library built for understanding the law —
              free to browse, free to read.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 btn-primary py-2.5 px-5"
              >
                Create your free account <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 text-secondary font-semibold text-sm hover:underline underline-offset-4 transition-all"
              >
                Browse the library first
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
