"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Award, Bookmark, BookMarked, BookOpen, Calendar, Compass,
  GraduationCap, Loader2, Scale, Settings, Share2, ShieldCheck,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CourseCard from "@/components/ui/CourseCard";
import { cn, formatNumber } from "@/lib/utils";

type TabKey = "Courses" | "Saved";

interface ProfileUser {
  id: string; name: string; username: string; image: string | null; banner: string | null;
  bio: string | null; university: string | null; department: string | null;
  level: string | null; isVerified: boolean; role: string;
  createdAt: string; repositoryCount: number; savedCount: number;
}
interface Course {
  id: string; title: string; slug: string; description: string; courseCode: string;
  university: string; department: string; semester: string; language: string;
  isVerified: boolean; views: number; saves: number;
  tags: string[]; owner: { name: string; username: string; image: string | null };
  modules: { id: string }[]; updatedDaysAgo: number; lastUpdated: string;
  isSaved: boolean;
}

const EMPTY_STATE: Record<TabKey, { title: string; body: string }> = {
  Courses: {
    title: "No published courses yet",
    body: "Courses are curated by the Law by Grace administrator. New publications will appear here.",
  },
  Saved: {
    title: "No saved courses yet",
    body: "When you press “Save course” on anything in the library, it lands here for later study.",
  },
};

export default function ProfilePage({ params }: { params: { username: string } }) {
  const { username } = params;
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role ?? "";
  const isAdmin = userRole === "ADMIN";

  const [activeTab, setActiveTab] = useState<TabKey>("Saved");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [savedCourses, setSavedCourses] = useState<Course[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/profile/${username}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setUser(d.user);
        setCourses(d.courses ?? []);
        setSavedCourses(d.savedCourses ?? []);
        setIsOwnProfile(d.isOwnProfile ?? false);
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [username]);

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : username.slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <h2 className="font-serif font-bold text-2xl text-on-surface">Profile not found</h2>
          <p className="text-on-surface-variant">{error || `@${username} doesn't exist on Law by Grace.`}</p>
          <Link href="/explore" className="btn-primary">Explore the library</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const publishes = user.repositoryCount > 0 || user.role === "ADMIN";
  const firstName = user.name?.split(" ")[0] ?? user.username;

  // Public content tabs only ever show real content; the private “Saved”
  // shelf appears on the reader's own profile.
  const visibleTabs: TabKey[] = [
    ...(publishes ? ["Courses" as TabKey] : []),
    ...(isOwnProfile ? ["Saved" as TabKey] : []),
  ];
  const tab = visibleTabs.includes(activeTab) ? activeTab : (visibleTabs[0] ?? "Saved");
  const tabCounts: Record<TabKey, number> = {
    Courses: courses.length,
    Saved: savedCourses.length,
  };
  const activeList = tab === "Courses" ? courses : savedCourses;

  const statItems = [
    ...(publishes ? [{ label: "published courses", value: formatNumber(user.repositoryCount) }] : []),
    ...(isOwnProfile && user.savedCount > 0 ? [{ label: "saved courses", value: formatNumber(user.savedCount) }] : []),
  ];

  const memberRows = [
    ...(publishes ? [{ label: "Courses published", value: formatNumber(user.repositoryCount) }] : []),
    ...(isOwnProfile && user.savedCount > 0 ? [{ label: "Saved courses", value: formatNumber(user.savedCount) }] : []),
  ];

  const listTitle = tab === "Saved" ? "Saved courses" : "Published courses";

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Navbar />

      {/* Banner */}
      <div className="h-40 md:h-52 relative overflow-hidden">
        {user.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.banner} alt="Profile banner" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-ink-panel">
            <div className="absolute -top-24 -right-20 w-[480px] h-[480px] rounded-full bg-[#1d4ed8]/20 blur-[110px]" />
          </div>
        )}
      </div>

      <main className="flex-1 max-w-[1200px] mx-auto px-4 md:px-6 w-full">
        {/* Profile header */}
        <div className="relative -mt-16 md:-mt-20 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-5">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-28 h-28 md:w-36 md:h-36 bg-surface-container-high border-4 border-background shadow-elevation-md rounded-2xl flex items-center justify-center font-semibold font-manrope text-4xl text-on-surface-variant shrink-0 overflow-hidden"
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
              ) : initials}
            </motion.div>

            <div className="flex-1 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-serif font-bold text-xl md:text-2xl text-on-surface leading-tight">{user.name}</h1>
                  {user.role === "ADMIN" && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-2.5 h-2.5" />Library administrator
                    </span>
                  )}
                </div>
                <p className="text-on-surface-variant text-sm mt-1">@{user.username}</p>
              </motion.div>

              <div className="flex items-center gap-3">
                {isOwnProfile && (
                  <Link href="/settings" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-manrope bg-surface-container border border-outline-variant/30 text-on-surface hover:bg-surface-container-high transition-all">
                    <Settings className="w-4 h-4" />Edit profile
                  </Link>
                )}
                <button
                  onClick={() => navigator.clipboard?.writeText(window.location.href)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container transition-all"
                  title="Copy profile link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bio + meta */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6">
            {user.bio && <p className="text-on-surface-variant leading-relaxed max-w-2xl mb-4">{user.bio}</p>}

            <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
              {user.university && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />{user.university}
                </span>
              )}
              {user.department && (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />{user.department}
                </span>
              )}
              {user.level && (
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4" />{user.level}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
            </div>

            {/* Library stats row (real data only — hidden when there is nothing to report) */}
            {statItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-6 mt-5 pt-5 border-t border-outline-variant/10">
                {statItems.map(stat => (
                  <div key={stat.label} className="flex items-baseline gap-1.5">
                    <span className="font-manrope font-bold text-base text-on-surface">{stat.value}</span>
                    <span className="text-sm text-on-surface-variant">{stat.label}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Tabs (only when more than one real section exists) */}
        {visibleTabs.length > 1 && (
          <div className="w-full overflow-x-auto no-scrollbar mb-8">
            <div className="flex gap-1 bg-surface-container rounded-2xl p-1 w-fit min-w-full sm:min-w-0 sm:w-fit">
              {visibleTabs.map(key => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                    tab === key
                      ? "bg-surface-container-lowest text-primary shadow-card font-semibold"
                      : "text-on-surface-variant hover:text-primary"
                  )}
                >
                  {key}
                  <span className="ml-1.5 text-xs text-on-surface-variant/60">{tabCounts[key]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-16">
          <div className="lg:col-span-2 space-y-6">
            {visibleTabs.length === 0 ? (
              /* A public profile with no public content yet — an honest, friendly state. */
              <div className="card p-12 text-center">
                <BookOpen className="w-10 h-10 text-outline-variant mx-auto mb-3" />
                <p className="font-serif font-semibold text-on-surface mb-1">A quiet shelf, for now</p>
                <p className="text-sm text-on-surface-variant max-w-sm mx-auto mb-6">
                  {firstName} keeps a private study shelf. Published courses will appear here when there is something to share.
                </p>
                <Link href="/explore" className="btn-primary inline-flex items-center gap-2">
                  <Compass className="w-4 h-4" />Explore the library
                </Link>
              </div>
            ) : activeList.length === 0 ? (
              <div className="card p-12 text-center">
                <Bookmark className="w-10 h-10 text-outline-variant mx-auto mb-3" />
                <p className="font-serif font-semibold text-on-surface mb-1">{EMPTY_STATE[tab].title}</p>
                <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
                  {tab === "Saved" && isOwnProfile
                    ? EMPTY_STATE.Saved.body
                    : tab === "Courses"
                      ? isOwnProfile && isAdmin
                        ? "Courses you curate for the library will appear here once published. Publish one from the admin area."
                        : user.role === "ADMIN"
                          ? `Courses curated by ${firstName} for the library will appear here as they are published.`
                          : EMPTY_STATE[tab].body
                      : EMPTY_STATE.Saved.body}
                </p>
                {tab === "Saved" && isOwnProfile && (
                  <Link href="/explore" className="mt-6 inline-flex items-center gap-2 btn-primary">
                    <Compass className="w-4 h-4" />Discover courses
                  </Link>
                )}
                {tab === "Courses" && isOwnProfile && isAdmin && (
                  <Link href="/admin" className="mt-6 inline-flex items-center gap-2 btn-primary">
                    <Scale className="w-4 h-4" />Open library admin
                  </Link>
                )}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {visibleTabs.length === 1 && (
                  <h2 className="font-serif font-bold text-lg text-on-surface mb-4">{listTitle}</h2>
                )}
                <div className="space-y-4">
                  {activeList.map((course, i) => (
                    <motion.div key={course.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                      <CourseCard course={course} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                  <Scale className="w-4 h-4 text-on-primary" />
                </div>
                <h3 className="font-manrope font-semibold text-sm text-on-surface">
                  {user.role === "ADMIN" ? "Library curator" : "Member of the library"}
                </h3>
              </div>
              <div className="space-y-3">
                {memberRows.length === 0 && (
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {isOwnProfile
                      ? "Start exploring the library — saved courses will appear here."
                      : `${firstName} is a member of the Law by Grace library.`}
                  </p>
                )}
                {memberRows.map(stat => (
                  <div key={stat.label} className="flex justify-between items-center">
                    <span className="text-sm text-on-surface-variant">{stat.label}</span>
                    <span className="font-manrope font-semibold text-sm text-on-surface">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {isOwnProfile && (
              <div className="card p-5 space-y-3">
                <h3 className="font-manrope font-semibold text-sm text-on-surface">Your library</h3>
                <Link href="/dashboard" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors">
                  <BookMarked className="w-4 h-4" /> Dashboard
                </Link>
                <Link href="/explore" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors">
                  <Compass className="w-4 h-4" /> Discover courses
                </Link>
                <button
                  onClick={() => setActiveTab("Saved")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors text-left"
                >
                  <Bookmark className="w-4 h-4" /> Saved courses
                </button>
                {isAdmin && (
                  <Link href="/admin" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors">
                    <ShieldCheck className="w-4 h-4" /> Library Admin
                  </Link>
                )}
                <Link href="/settings" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors">
                  <Settings className="w-4 h-4" /> Account settings
                </Link>
              </div>
            )}
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}