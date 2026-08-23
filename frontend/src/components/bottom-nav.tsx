"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { BacklogIcon, DashboardIcon, ProjectsIcon, TodayIcon, WeekIcon } from "@/components/icons";

const LINKS = [
  { href: "/dashboard", label: "Home", icon: DashboardIcon },
  { href: "/today", label: "Today", icon: TodayIcon },
  { href: "/week", label: "Week", icon: WeekIcon },
  { href: "/backlog", label: "Backlog", icon: BacklogIcon },
  { href: "/projects", label: "Projects", icon: ProjectsIcon },
] as const;

export function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <nav
      aria-label="Primary"
      className="transform-gpu fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      style={{ willChange: "transform" }}
    >
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
              active ? "text-accent" : "text-text-3"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.9} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
