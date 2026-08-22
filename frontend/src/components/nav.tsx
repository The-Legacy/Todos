"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/today", label: "Today" },
  { href: "/week", label: "Week" },
  { href: "/backlog", label: "Backlog" },
  { href: "/tasks", label: "Tasks" },
  { href: "/categories", label: "Categories" },
] as const;

export function Nav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  return (
    <nav className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
      <div className="flex min-w-0 items-center gap-6">
        <span className="shrink-0 text-sm font-semibold">Todos</span>
        <div className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
      <button
        onClick={async () => {
          await logout();
          router.replace("/login");
        }}
        className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
      >
        Log out
      </button>
    </nav>
  );
}
