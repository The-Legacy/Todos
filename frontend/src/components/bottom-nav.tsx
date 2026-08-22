"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/today", label: "Today" },
  { href: "/week", label: "Week" },
  { href: "/backlog", label: "Backlog" },
  { href: "/projects", label: "Projects" },
] as const;

export function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
              active ? "text-zinc-900 dark:text-white" : "text-zinc-400"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-zinc-900 dark:bg-white" : "bg-transparent"}`} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
