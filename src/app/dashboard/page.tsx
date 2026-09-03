"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  BookOpen, Bookmark, Bell, ChevronRight, Eye,
  Loader2, BookMarked,
  Compass, Search, Library, ShieldCheck, ArrowRight, PenLine, FileText,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { formatNumber, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Course {
  id: string; title: string; slug: string; courseCode: string; department: string;
  university: string; saves: number; views: number; modules: { id: string }[];
  updatedDaysAgo: number; tags: string[]; banner?: string | null;
}
interface SavedCourseCard {
  id: string; title: string; slug: string; saves: number; department: string;
  banner?: string | null;
  modules: { id: string }[]; updatedDaysAgo: number;
}
interface Notification {
  id: string; type: string; title: string; body: string; read: boolean; createdAt: string; link?: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role ?? "";
  const isAdmin = userRole === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [savedCourses, setSavedCourses] = useState<SavedCourseCard[]>([]);
  const [stats, setStats] = useState({ courseCount: 0, totalViews: 0 });

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => {
        if (d.error) return;
        setMyCourses(d.myCourses ?? []);
        setNotifications(d.notifications ?? []);
        setSavedCourses(d.savedCourses ?? []);
        setStats(d.stats ?? { courseCount: 0, totalViews: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (ids?: string[]) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : {}),
    });
    setNotifications(prev => prev.map(n => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const displayName = session?.user?.name?.split(" ")[0] ?? "reader";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const hasContent = savedCourses.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="flex-1 max-w-[1200px] mx-auto px-4 md:px-6 py-10 w-full">
        {/* Welcome — top background artwork */}
        <section className="relative overflow-hidden rounded-2xl border border-outline-variant/15 bg-background mb-8 animate-fade-in">
          {/* Background artwork (top, right-weighted) */}
          <div className="absolute inset-0">
            <Image
              src="/dashboard/top-bg.png"
              alt=""
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover object-[74%_30%]"
            />
          </div>
          {/* Readability overlays */}
          <div className="absolute inset-y-0 left-0 w-[68%] bg-gradient-to-r from-background via-background/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/25" />

          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap px-5 md:px-8 py-8 md:py-9 min-h-[210px] md:min-h-[240px]">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-elevation-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/icon.svg" alt="" className="w-full h-full object-cover" />
                </div>
                <h1 className="font-serif font-bold text-xl md:text-2xl text-on-surface">
                  {greeting}, {displayName}
                </h1>
              </div>
              <p className="text-on-surface-variant text-sm">
                Your personal study area in the Law by Grace library.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link href="/admin" className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-manrope bg-surface-container-high border border-outline-variant/40 text-on-surface hover:bg-surface-container transition-all">
                  <ShieldCheck className="w-3.5 h-3.5 text-secondary" />Library Admin
                </Link>
              )}
              <Link href="/explore" className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-manrope bg-primary text-on-primary hover:brightness-110 transition-all">
                <Compass className="w-3.5 h-3.5" />Discover the library
              </Link>
            </div>
          </div>
        </section>

        {/* Admin / curator banner */}
        {isAdmin && (
          <div className="card p-5 mb-8 bg-gradient-to-r from-primary-container/40 via-secondary-container/30 to-transparent border-primary/10 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shrink-0">
                <Library className="w-5 h-5 text-on-primary" />
              </div>
              <div>
                <p className="font-manrope font-semibold text-sm text-on-surface">You&apos;re the library administrator</p>
                <p className="text-xs text-on-surface-variant">Create and manage the courses, materials and articles that make up the Law by Grace library.</p>
              </div>
            </div>
            <Link href="/admin" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline shrink-0">
              Open Library Admin <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className={cn("grid grid-cols-2 gap-4 mb-10", isAdmin ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
          {[
            { label: "Saved courses", value: savedCourses.length, icon: Bookmark, sub: "for later study" },
            ...(isAdmin
              ? [{ label: "Courses in the library", value: myCourses.length, icon: BookOpen, sub: "you curate" }]
              : [{ label: "Unread activity", value: unreadCount, icon: Bell, sub: "notifications" }]),
            ...(isAdmin ? [{ label: "Material views", value: stats.totalViews, icon: Eye, sub: "across the library" }] : []),
          ].map((stat, i) => (
            <div key={stat.label} className="card p-5 animate-slide-up" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}>
              <div className="w-9 h-9 bg-surface-container-high border border-outline-variant/30 rounded-lg flex items-center justify-center mb-3">
                <stat.icon className="w-[18px] h-[18px] text-secondary" />
              </div>
              {loading ? (
                <div className="h-7 w-16 bg-surface-container rounded animate-pulse mb-1" />
              ) : (
                <p className="font-manrope font-bold text-2xl text-on-surface">{formatNumber(stat.value)}</p>
              )}
              <p className="text-xs text-on-surface-variant mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="space-y-10 lg:col-span-2">
            {/* Fresh reader state */}
            {!loading && !hasContent && (
              <div className="card p-10 text-center bg-gradient-to-br from-primary-container/25 to-secondary-container/20 border-primary/10">
                <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-5">
                  <Library className="w-8 h-8 text-on-primary" />
                </div>
                <h2 className="font-serif font-semibold text-xl text-on-surface mb-2">Start exploring the library</h2>
                <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-6">
                  Courses on Family Law, Criminal Law, Constitutional Law and more are waiting.
                  Save what you study here so it&apos;s always easy to pick back up.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/explore" className="inline-flex items-center gap-2 btn-primary px-5 py-2.5">
                    <Compass className="w-4 h-4" />Discover courses
                  </Link>
                  <Link href="/articles" className="inline-flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/40 text-on-surface px-5 py-2.5 rounded-xl font-semibold font-manrope text-sm hover:bg-surface-container transition-all">
                    <FileText className="w-4 h-4" />Read articles
                  </Link>
                </div>
              </div>
            )}

            {/* Saved courses */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-manrope font-semibold text-lg text-on-surface flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-secondary" />Saved courses
                </h2>
                <Link href="/explore" className="text-xs text-secondary font-medium hover:underline flex items-center gap-1">
                  Discover more <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map(i => <div key={i} className="h-28 bg-surface-container rounded-2xl animate-pulse" />)}
                </div>
              ) : savedCourses.length === 0 ? (
                <div className="card-sm p-6 text-center">
                  <Bookmark className="w-7 h-7 text-outline-variant mx-auto mb-2" />
                  <p className="text-sm text-on-surface-variant">
                    Courses you save appear here so you can return to them anytime.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedCourses.slice(0, 6).map(course => (
                    <Link key={course.id} href={`/courses/${course.slug}`}>
                      <div className="card-sm p-5 cursor-pointer group hover:-translate-y-1 transition-transform duration-150 h-full">
                        <div className="flex items-start gap-3 mb-3">
                          {course.banner ? (
                            <img src={course.banner} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-outline-variant/20" />
                          ) : (
                            <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center shrink-0">
                              <BookOpen className="w-5 h-5 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            {course.department && (
                              <span className="text-[10px] font-medium text-on-surface-variant bg-surface-container-high border border-outline-variant/30 px-2 py-0.5 rounded-full">{course.department}</span>
                            )}
                            <p className="font-manrope font-semibold text-sm text-on-surface group-hover:text-primary transition-colors leading-snug mt-1 line-clamp-2">
                              {course.title}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{course.modules.length} modules</span>
                          <span className="ml-auto">{course.updatedDaysAgo === 0 ? "updated today" : `updated ${course.updatedDaysAgo}d ago`}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right rail */}
          <div className="space-y-6">
            {/* Study shortcuts */}
            <div className="card p-5">
              <h3 className="font-manrope font-semibold text-base text-on-surface mb-4">Study shortcuts</h3>
              <div className="space-y-1.5">
                {[
                  { href: "/explore", icon: Compass, label: "Discover courses", sub: "Browse the whole library" },
                  { href: "/search", icon: Search, label: "Search materials", sub: "Find any resource quickly" },
                  { href: "/articles", icon: PenLine, label: "Read articles", sub: "Legal writing & ideas" },
                  { href: "/settings", icon: BookMarked, label: "Account settings", sub: "Profile & preferences" },
                ].map(item => (
                  <Link key={item.href} href={item.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container transition-colors group">
                    <div className="w-8 h-8 bg-secondary-container rounded-lg flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-on-secondary-container" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors">{item.label}</p>
                      <p className="text-xs text-on-surface-variant">{item.sub}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Areas of law */}
            <div className="card p-5">
              <h3 className="font-manrope font-semibold text-base text-on-surface mb-4">Areas of law</h3>
              <div className="flex flex-wrap gap-1.5">
                {["Constitutional Law", "Criminal Law", "Contract Law", "Family Law", "Tort Law", "Property Law", "Human Rights", "Evidence"].map(area => (
                  <Link
                    key={area}
                    href={`/explore?q=${encodeURIComponent(area)}`}
                    className="text-[11px] px-2.5 py-1.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/20 hover:border-secondary/40 hover:text-primary transition-colors"
                  >
                    {area}
                  </Link>
                ))}
              </div>
            </div>

            {/* Activity */}
            {notifications.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-manrope font-semibold text-base text-on-surface">Recent activity</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={() => markRead()} className="text-xs text-secondary hover:underline">Mark all read</button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {notifications.slice(0, 5).map(notif => {
                    const cls = cn(
                      "flex items-start gap-3 p-2.5 rounded-xl transition-colors cursor-pointer",
                      !notif.read ? "bg-secondary-container/30" : "hover:bg-surface-container"
                    );
                    const inner = (
                      <>
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", !notif.read ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-on-surface-variant")}>
                          <Bell className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-on-surface leading-relaxed line-clamp-2">{notif.body}</p>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">{timeAgo(notif.createdAt)}</p>
                        </div>
                        {!notif.read && <div className="w-2 h-2 bg-secondary rounded-full mt-1 shrink-0" />}
                      </>
                    );
                    return notif.link ? (
                      <Link key={notif.id} href={notif.link} onClick={() => !notif.read && markRead([notif.id])} className={cls}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={notif.id} onClick={() => !notif.read && markRead([notif.id])} className={cls}>
                        {inner}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reading tip */}
            <div className="card p-5 bg-ink-panel text-white border-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-manrope font-semibold text-sm text-white">Reading tip</h3>
              </div>
              <p className="text-xs text-white/80 leading-relaxed mb-3">
                Documents open in the built-in reader — no downloads needed. Use it for a calm, focused study session in light or dark mode.
              </p>
              <Link href="/explore" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 px-3 py-1.5 rounded-lg hover:bg-white/25 transition-colors">
                Find something to read <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}