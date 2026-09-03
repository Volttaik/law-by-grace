"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Compass, BookOpen, Search, LayoutDashboard, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function MobileNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (status !== "authenticated") return null;
  if (pathname?.startsWith("/pdf-view")) return null;
  if (pathname?.match(/^\/courses\/[^/]+\/studio/)) return null;

  const username = (session?.user as { username?: string })?.username;

  const items = [
    { href: "/explore", icon: Compass, label: "Discover" },
    { href: "/articles", icon: BookOpen, label: "Articles" },
    { href: "/search", icon: Search, label: "Search", special: true },
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: username ? `/profile/${username}` : "/dashboard", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/20 pb-safe">
      <div className="grid grid-cols-5 items-center px-2 py-2 justify-items-center">
        {items.map(({ href, icon: Icon, label, special }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname?.startsWith(href) && href !== "/search");
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all",
                special
                  ? "bg-primary text-on-primary px-2.5 py-1.5 -mt-2.5 rounded-md"
                  : isActive
                  ? "text-primary"
                  : "text-on-surface-variant"
              )}
            >
              <Icon className={special ? "w-4 h-4" : "w-5 h-5"} />
              {!special && <span className="text-[10px] font-medium">{label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
