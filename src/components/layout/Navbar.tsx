"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search, Menu, X, ChevronDown,
  Settings, LogOut, User, LayoutDashboard, Moon, Sun,
  Compass, BookOpen, Scale, Palette, PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/ThemeProvider";
import { AnimatePresence, motion } from "framer-motion";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { theme, toggle } = useTheme();
  const isAuth = status === "authenticated";
  const isLoading = status === "loading";

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSidebarOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const initials = session?.user?.name
    ? session.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    setSidebarOpen(false);
    await signOut({ callbackUrl: "/" });
  };

  const username = (session?.user as any)?.username ?? "";
  const userRole = (session?.user as any)?.role ?? "";

  const Brand = ({ small = false }: { small?: boolean }) => (
    <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
      <div className={cn(
        "rounded-lg overflow-hidden shrink-0 shadow-sm group-hover:opacity-90 transition-opacity",
        small ? "w-7 h-7" : "w-9 h-9"
      )}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon.svg" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="leading-none">
        <span className={cn("font-serif font-bold tracking-tight", small ? "text-[11px]" : "text-xs", "text-on-surface")}>
          THE LAW With Gracious
        </span>
      </div>
    </Link>
  );

  const sections: NavSection[] = [
    {
      label: "Library",
      items: [
        { href: "/explore", label: "Discover", icon: Compass, desc: "Browse legal courses & resources" },
        { href: "/articles", label: "Articles", icon: BookOpen, desc: "Read legal articles" },
        { href: "/search", label: "Search", icon: Search, desc: "Search the whole library" },
      ],
    },
    {
      label: "Learning",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Your personal study area" },
      ],
    },
    {
      label: "Account",
      items: [
        { href: username ? `/profile/${username}` : "/dashboard", label: "Profile", icon: User, desc: "Your public page" },
        { href: "/settings", label: "Settings", icon: Settings, desc: "Account & preferences" },
        { href: "/settings?tab=Appearance", label: "Appearance", icon: Palette, desc: "Theme & display" },
      ],
    },
  ];

  const UserAvatar = ({ size = "sm" }: { size?: "sm" | "md" }) => {
    const cls = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
    return (
      <div className={cn(cls, "rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center overflow-hidden shrink-0")}>
        {session?.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt={session.user.name ?? ""} className="w-full h-full object-cover" />
        ) : (
          <span className="font-semibold text-on-surface-variant font-manrope">{initials}</span>
        )}
      </div>
    );
  };

  const SideMenu = ({ onNavigate }: { onNavigate: () => void }) => (
    <>
      <div className="px-4 py-3 border-b border-outline-variant/15">
        <div className="flex items-center gap-2.5">
          <UserAvatar size="md" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-on-surface font-manrope truncate">{session?.user?.name}</p>
            <p className="text-xs text-on-surface-variant truncate">@{username}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {isAuth && (
          <Link
            href="/editor"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all mb-4 border",
              pathname?.startsWith("/editor")
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-primary text-on-primary hover:brightness-110 border-primary"
            )}
          >
            <PenLine className="w-4 h-4 shrink-0" />
            Create Article
          </Link>
        )}
        {sections.map((section, si) => (
          <div key={section.label} className={si > 0 ? "mt-5" : ""}>
            <p className="px-3 pb-1.5 text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">
              {section.label}
            </p>
            {section.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5 border border-transparent",
                  pathname === item.href
                    ? "bg-primary/10 text-primary border-primary/10 font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-outline-variant/10 px-3 py-3 space-y-1">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-error hover:bg-error-container/20 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 w-full z-50 parchment-blur border-b border-outline-variant/20">
        <nav className="max-w-[1200px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isAuth && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <Brand />
          </div>

          <div className="hidden lg:flex items-center gap-6 flex-1 ml-8">
            <Link
              href="/explore"
              className={cn(
                "text-sm font-medium transition-colors flex items-center gap-1.5",
                pathname === "/explore" ? "text-primary font-semibold" : "text-on-surface-variant hover:text-primary"
              )}
            >
              <Compass className="w-4 h-4" />Discover
            </Link>
            <Link
              href="/articles"
              className={cn(
                "text-sm font-medium transition-colors flex items-center gap-1.5",
                pathname?.startsWith("/articles") ? "text-primary font-semibold" : "text-on-surface-variant hover:text-primary"
              )}
            >
              <BookOpen className="w-4 h-4" />Articles
            </Link>
            {isAuth && (
              <Link
                href="/dashboard"
                className={cn(
                  "text-sm font-medium transition-colors flex items-center gap-1.5",
                  pathname === "/dashboard" ? "text-primary font-semibold" : "text-on-surface-variant hover:text-primary"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />Dashboard
              </Link>
            )}
            {!isAuth && !isLoading && (
              <Link href="/#library" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
                The Library
              </Link>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href="/search"
              className="hidden md:flex items-center gap-2 bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-2 text-sm text-on-surface-variant hover:border-outline/50 transition-all w-52 xl:w-64"
            >
              <Search className="w-4 h-4" />
              <span>Search the library...</span>
            </Link>

            <button
              onClick={toggle}
              className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isLoading ? (
              <div className="w-8 h-8 bg-surface-container rounded-full animate-pulse" />
            ) : isAuth ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <UserAvatar />
                  <ChevronDown className={cn("w-4 h-4 text-on-surface-variant transition-transform hidden sm:block", userMenuOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-12 w-64 bg-surface-container-lowest rounded-2xl shadow-modal border border-outline-variant/20 py-2 z-50"
                    >
                      <div className="px-4 py-2.5 border-b border-outline-variant/10 mb-1">
                        <p className="text-sm font-semibold text-on-surface font-manrope truncate">{session?.user?.name}</p>
                        <p className="text-xs text-on-surface-variant">@{username}</p>
                      </div>
                      {[
                        { href: "/editor", label: "Create Article", icon: PenLine },
                        { href: "/explore", label: "Discover", icon: Compass },
                        { href: "/articles", label: "Articles", icon: BookOpen },
                        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
                        { href: username ? `/profile/${username}` : "/dashboard", label: "Profile", icon: User },
                        { href: "/settings", label: "Settings", icon: Settings },
                        { href: "/settings?tab=Appearance", label: "Appearance", icon: Palette },

                      ].map(item => (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      ))}
                      <div className="border-t border-outline-variant/10 mt-1 pt-1">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-error hover:bg-error-container/20 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  aria-label="Sign in"
                  title="Sign in"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all active:scale-[0.95]"
                >
                  <User className="w-[18px] h-[18px]" />
                </Link>
              </div>
            )}

            <button
              className="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-xl"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence initial={false}>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.995 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="lg:hidden origin-top border-t border-outline-variant/20 bg-surface-container-lowest/98 backdrop-blur-md px-4 py-4 max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <div className="space-y-1">
              {isAuth && (
                <MobileLink href="/editor" label="Create Article" icon={PenLine} onClick={() => setMobileOpen(false)} active={pathname?.startsWith("/editor")} highlighted />
              )}
              <MobileLink href="/explore" label="Discover" icon={Compass} onClick={() => setMobileOpen(false)} active={pathname === "/explore"} />
              <MobileLink href="/articles" label="Articles" icon={BookOpen} onClick={() => setMobileOpen(false)} active={pathname?.startsWith("/articles")} />
              <MobileLink href="/search" label="Search" icon={Search} onClick={() => setMobileOpen(false)} active={pathname === "/search"} />
              {isAuth ? (
                <>
                  <MobileLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} onClick={() => setMobileOpen(false)} active={pathname === "/dashboard"} />
                  <MobileLink href={username ? `/profile/${username}` : "/dashboard"} label="Profile" icon={User} onClick={() => setMobileOpen(false)} />
                  <MobileLink href="/settings" label="Settings" icon={Settings} onClick={() => setMobileOpen(false)} />
                  <MobileLink href="/settings?tab=Appearance" label="Appearance" icon={Palette} onClick={() => setMobileOpen(false)} />
                  <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-error hover:bg-error-container/20 transition-colors">
                    <LogOut className="w-4 h-4" />Sign out
                  </button>
                </>
              ) : (
                <>
                  <MobileLink href="/login" label="Sign in" icon={User} onClick={() => setMobileOpen(false)} />
                  <MobileLink href="/register" label="Get started" icon={BookOpen} onClick={() => setMobileOpen(false)} />
                </>
              )}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </header>

      {/* Universal side menu */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-[70] flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ opacity: 0, x: -280 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -280 }}
              transition={{ type: "tween", duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="relative z-10 w-72 max-w-[85vw] h-full bg-surface-container-lowest shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-outline-variant/15">
                <Brand small />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <SideMenu onNavigate={() => setSidebarOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function MobileLink({
  href, label, icon: Icon, onClick, active, highlighted,
}: {
  href: string; label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void; active?: boolean; highlighted?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
        highlighted
          ? "bg-primary text-on-primary font-semibold"
          : active ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-surface-container"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}
