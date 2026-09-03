"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, BookOpen, Users, Tag, X, Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CourseCard from "@/components/ui/CourseCard";
import UserCard from "@/components/ui/UserCard";
import { cn } from "@/lib/utils";

const FILTER_TYPES = ["All", "Courses", "Authors", "Topics"];

interface Course {
  id: string; title: string; slug: string; description: string; courseCode: string;
  university: string; department: string; semester: string; language: string;
  isVerified: boolean; views: number; saves: number;
  tags: string[]; owner: { name: string; username: string; image: string | null };
  modules: { id: string }[]; updatedDaysAgo: number; lastUpdated: string;
  isSaved: boolean;
}
interface User {
  id: string; name: string; username: string; university: string; department: string;
  bio?: string; repositories: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState("All");
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/search?type=trending_tags")
      .then(r => r.json())
      .then(d => setTrendingTags(d.tags ?? []))
      .catch(() => {});
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setCourses([]); setUsers([]); setTags([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=24`);
      const data = await res.json();
      setCourses(data.courses ?? []);
      setUsers(data.users ?? []);
      setTags(data.tags ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), query ? 350 : 0);
    return () => clearTimeout(t);
  }, [query, search]);

  const hasResults = courses.length > 0 || users.length > 0 || tags.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Navbar />

      <main className="flex-1 max-w-[1200px] mx-auto px-4 md:px-6 py-10 w-full">
        {/* Search bar */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              placeholder="Search courses, authors, areas of law, topics…"
              className="w-full pl-12 pr-12 py-4 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary shadow-card text-base transition-all"
            />
            {loading ? (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary animate-spin" />
            ) : query ? (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>

          {/* Type filters */}
          {query && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {FILTER_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    activeType === type
                      ? "bg-secondary-container text-on-secondary-container font-semibold"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  )}
                >
                  {type === "Courses" && <BookOpen className="w-3.5 h-3.5" />}
                  {type === "Authors" && <Users className="w-3.5 h-3.5" />}
                  {type === "Topics" && <Tag className="w-3.5 h-3.5" />}
                  {type}
                  {type === "Courses" && courses.length > 0 && (
                    <span className="bg-outline-variant/20 text-on-surface-variant text-xs px-1.5 py-0.5 rounded-full">
                      {courses.length}
                    </span>
                  )}
                  {type === "Authors" && users.length > 0 && (
                    <span className="bg-outline-variant/20 text-on-surface-variant text-xs px-1.5 py-0.5 rounded-full">
                      {users.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* No query state */}
        {!query && (
          <div className="max-w-3xl mx-auto">
            {trendingTags.length > 0 && (
              <div>
                <h3 className="font-manrope font-semibold text-sm text-primary mb-3">Trending topics</h3>
                <div className="flex flex-wrap gap-2">
                  {trendingTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setQuery(tag)}
                      className="tag hover:bg-secondary-container hover:text-on-secondary-container transition-all"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {trendingTags.length === 0 && (
              <div className="text-center py-20 text-on-surface-variant">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Start typing to search courses, authors, and topics.</p>
              </div>
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {query && loading && !hasResults && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card p-6 animate-pulse space-y-4">
                  <div className="space-y-2">
                    <div className="h-3 bg-surface-container rounded w-1/3" />
                    <div className="h-5 bg-surface-container rounded w-3/4" />
                  </div>
                  <div className="h-3 bg-surface-container rounded w-full" />
                  <div className="flex gap-2">
                    <div className="h-5 bg-surface-container rounded-full w-16" />
                    <div className="h-5 bg-surface-container rounded-full w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {query && !loading && (
          <div className="space-y-10">
            {!hasResults && (
              <div className="text-center py-20">
                <Search className="w-12 h-12 text-outline-variant mx-auto mb-4" />
                <h3 className="font-manrope font-semibold text-lg text-primary mb-2">No results found</h3>
                <p className="text-on-surface-variant text-sm">
                  Try searching for a course code, university name, or topic.
                </p>
              </div>
            )}

            {/* Course results */}
            {(activeType === "All" || activeType === "Courses") && courses.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <BookOpen className="w-5 h-5 text-on-surface-variant" />
                  <h2 className="font-manrope font-semibold text-base text-primary">Courses</h2>
                  <span className="tag text-xs">{courses.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.map((course, i) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <CourseCard course={course} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Author results */}
            {(activeType === "All" || activeType === "Authors") && users.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <Users className="w-5 h-5 text-on-surface-variant" />
                  <h2 className="font-manrope font-semibold text-base text-primary">Authors</h2>
                  <span className="tag text-xs">{users.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {users.map((user, i) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <UserCard user={user} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Topic results */}
            {(activeType === "All" || activeType === "Topics") && tags.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <Tag className="w-5 h-5 text-on-surface-variant" />
                  <h2 className="font-manrope font-semibold text-base text-primary">Topics</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setQuery(tag)}
                      className="tag-accent text-sm px-4 py-2 hover:shadow-glow transition-all"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
