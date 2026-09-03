"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Search, TrendingUp, Bookmark, Clock, BookOpen, Loader2,
  Shield, Eye, Filter, Scale, FileText, PlayCircle, Library,
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { cn, formatNumber } from "@/lib/utils";

const AREAS_OF_LAW = [
  "All", "Constitutional Law", "Criminal Law", "Contract Law", "Family Law",
  "Tort Law", "Property Law", "Company Law", "Evidence", "Legal Research",
  "Human Rights", "Jurisprudence", "Law of Evidence", "Public International Law",
];

const SORT_OPTIONS = [
  { label: "Newest", value: "recent", icon: Clock },
  { label: "Most Viewed", value: "views", icon: TrendingUp },
  { label: "Most Saved", value: "saves", icon: Bookmark },
];

const TYPE_CHIP =
  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/10";

function typeIcon(type: string) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("video") || t.includes("mp4") || t.includes("mov")) return PlayCircle;
  if (t.includes("audio") || t.includes("mp3")) return PlayCircle;
  return FileText;
}

interface Course {
  id: string; title: string; slug: string; description: string; courseCode: string;
  university: string; department: string; semester: string; language: string;
  isVerified: boolean; views: number; saves: number;
  materialCount: number; tags: string[];
  owner: { name: string; username: string; image: string | null };
  modules: { id: string }[]; updatedDaysAgo: number; lastUpdated: string;
  banner?: string | null;
}

function FeedCard({ course, index }: { course: Course; index: number }) {
  const timeStr = course.updatedDaysAgo === 0 ? "Updated today"
    : course.updatedDaysAgo === 1 ? "Updated yesterday"
    : `Updated ${course.updatedDaysAgo}d ago`;
  const TypeIcon = typeIcon(course.language);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.35 }}
    >
      <Link href={`/courses/${course.slug}`} className="block group h-full">
        <article className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden hover:border-outline-variant/50 hover:-translate-y-0.5 transition-all duration-200 shadow-card h-full flex flex-col">
          {course.banner ? (
            <div className="h-36 relative overflow-hidden shrink-0 bg-surface-container">
              <img src={course.banner} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              <span className="absolute top-3 right-3 text-[10px] font-semibold text-white bg-black/35 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded-full">
                {course.courseCode || course.department || "Law"}
              </span>
            </div>
          ) : (
            <div className="h-36 relative shrink-0 bg-gradient-to-br from-surface-container-high to-surface-container border-b border-outline-variant/10 flex items-center justify-center overflow-hidden">
              <Scale className="w-10 h-10 text-outline-variant/50" />
              <span className="absolute bottom-3 right-3 text-[10px] font-semibold text-on-surface-variant/80 bg-surface-container-lowest/90 px-2 py-0.5 rounded-full border border-outline-variant/20">
                {course.courseCode || course.department || "Law"}
              </span>
            </div>
          )}

          <div className="p-5 flex flex-col flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              {course.department && (
                <span className="text-[10px] font-medium text-on-surface-variant bg-surface-container-high border border-outline-variant/40 px-2 py-0.5 rounded-full">
                  {course.department}
                </span>
              )}
              {course.isVerified && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary-container/60 px-2 py-0.5 rounded-full">
                  <Shield className="w-2.5 h-2.5" />Library verified
                </span>
              )}
            </div>
            <h3 className="font-serif font-bold text-[15px] text-on-surface group-hover:text-primary transition-colors leading-snug line-clamp-2 mb-1.5">
              {course.title}
            </h3>

            <p className="text-xs text-on-surface-variant leading-relaxed mb-4 line-clamp-2">
              {course.description || "Course materials from THE LAW With Gracious library."}
            </p>

            {course.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {course.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/20">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10 mt-auto">
              <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                <span className={TYPE_CHIP}>
                  <TypeIcon className="w-3 h-3" />
                  {course.language}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />{formatNumber(course.materialCount)} materials
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-on-surface-variant/70">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />{formatNumber(course.views)}
                </span>
                <span className="flex items-center gap-1">
                  <Bookmark className="w-3 h-3" />{formatNumber(course.saves)}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant/50 mt-2">
              {timeStr}
            </p>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-36 bg-surface-container" />
      <div className="p-5 space-y-3">
        <div className="h-2.5 bg-surface-container rounded w-1/3" />
        <div className="h-4 bg-surface-container rounded w-4/5" />
        <div className="space-y-1.5">
          <div className="h-2.5 bg-surface-container rounded" />
          <div className="h-2.5 bg-surface-container rounded w-5/6" />
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState("All");
  const [sortBy, setSortBy] = useState("recent");
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  const fetchCourses = useCallback(async (resetPage = true, pageOverride?: number) => {
    if (resetPage) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    const currentPage = resetPage ? 1 : (pageOverride ?? page);
    const params = new URLSearchParams({
      ...(query && { q: query }),
      ...(selectedArea !== "All" && { department: selectedArea }),
      sort: sortBy,
      page: String(currentPage),
    });
    try {
      const res = await fetch(`/api/courses?${params}`);
      const data = await res.json();
      if (resetPage) {
        setCourses(data.courses ?? []);
        setPage(1);
      } else {
        setCourses(prev => [...prev, ...(data.courses ?? [])]);
        setPage(currentPage);
      }
      setTotal(data.total ?? 0);
      setHasMore((data.page ?? 1) < (data.pages ?? 1));
    } catch {}
    if (resetPage) {
      setLoading(false);
    } else {
      setLoadingMore(false);
    }
    loadingMoreRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedArea, sortBy]);

  // Read initial query from the URL (?q=…), e.g. landing page area chips.
  useEffect(() => {
    const urlQuery = new URLSearchParams(window.location.search).get("q");
    if (urlQuery) setQuery(urlQuery);
    const urlArea = new URLSearchParams(window.location.search).get("area");
    if (urlArea && AREAS_OF_LAW.includes(urlArea)) setSelectedArea(urlArea);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchCourses(true), query ? 350 : 0);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedArea, sortBy]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loadingMoreRef.current && !loading) {
          loadingMoreRef.current = true;
          setPage(prev => {
            const next = prev + 1;
            fetchCourses(false, next);
            return prev;
          });
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, fetchCourses]);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Navbar />

      <section className="border-b border-outline-variant/10 py-10 bg-gradient-to-b from-primary-container/20 to-transparent">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto text-center mb-7">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary bg-secondary-container/60 px-3 py-1 rounded-full border border-secondary/15 mb-4">
              <Library className="w-3.5 h-3.5" /> THE LAW With Gracious library
            </span>
            <h1 className="font-serif font-bold text-2xl md:text-3xl text-on-surface mb-2">
              Discover legal courses &amp; resources
            </h1>
            <p className="text-on-surface-variant text-sm md:text-base">
              Browse the collection by area of law. Every course gathers its materials — PDFs,
              videos, documents and more — in one organised place.
            </p>
          </div>

          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/60" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by course, area of law, topic or material…"
              className="w-full pl-12 pr-12 py-3.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary/60 text-sm transition-all shadow-elevation-sm"
            />
            {loading && query && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
            )}
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-[1200px] mx-auto px-4 md:px-6 py-8 w-full">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <p className="text-xs text-on-surface-variant">
            {loading ? "Loading the library…" : `${total.toLocaleString()} ${total === 1 ? "course" : "courses"}`}
          </p>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 bg-surface-container rounded-xl p-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    sortBy === opt.value
                      ? "bg-surface-container-lowest text-primary shadow-card"
                      : "text-on-surface-variant hover:text-primary"
                  )}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFilters(s => !s)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                showFilters || selectedArea !== "All"
                  ? "bg-primary/10 text-primary border-primary/25"
                  : "border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60 hover:text-on-surface"
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              {selectedArea !== "All" ? selectedArea : "Area of law"}
            </button>
          </div>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/15">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Area of law</p>
              <div className="flex flex-wrap gap-2">
                {AREAS_OF_LAW.map(area => (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                      selectedArea === area
                        ? "bg-primary/10 text-primary border-primary/25"
                        : "border-outline-variant/20 text-on-surface-variant hover:border-outline-variant/50 hover:text-on-surface"
                    )}
                  >
                    {area}
                  </button>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-outline-variant/10 flex gap-2 sm:hidden">
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider self-center mr-1">Sort</p>
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      sortBy === opt.value
                        ? "bg-primary/10 text-primary border-primary/25"
                        : "border-outline-variant/20 text-on-surface-variant hover:text-on-surface"
                    )}
                  >
                    <opt.icon className="w-3 h-3" />{opt.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {loading && courses.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-14 h-14 bg-surface-container rounded-xl flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-outline-variant" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-lg text-on-surface mb-1">No courses found</h3>
              <p className="text-sm text-on-surface-variant max-w-sm">
                {query || selectedArea !== "All"
                  ? "Try different keywords or clear the area-of-law filter."
                  : "The library is growing — new legal materials are added regularly."}
              </p>
            </div>
            <Link href="/articles" className="btn-primary mt-2">
              Browse legal articles
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course, i) => (
                <FeedCard key={course.id} course={course} index={i} />
              ))}
              {loadingMore && Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={`skel-${i}`} />
              ))}
            </div>

            <div ref={sentinelRef} className="h-10 mt-4" />

            {!hasMore && courses.length > 0 && (
              <p className="text-center text-xs text-on-surface-variant/40 mt-2 pb-4">
                You&apos;ve reached the end of the library
              </p>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
