"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  BacklogIcon,
  CategoriesIcon,
  CheckIcon,
  DashboardIcon,
  LogoutIcon,
  ProjectsIcon,
  RecurringIcon,
  SettingsIcon,
  TasksIcon,
  TodayIcon,
  WeekIcon,
} from "@/components/icons";

const PLAN_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/today", label: "Today", icon: TodayIcon },
  { href: "/week", label: "Week", icon: WeekIcon },
  { href: "/backlog", label: "Backlog", icon: BacklogIcon },
] as const;

const ORGANIZE_LINKS = [
  { href: "/projects", label: "Projects", icon: ProjectsIcon },
  { href: "/recurring", label: "Recurring", icon: RecurringIcon },
  { href: "/tasks", label: "Tasks", icon: TasksIcon },
  { href: "/categories", label: "Categories", icon: CategoriesIcon },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: (props: { size?: number }) => React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] transition ${
        active ? "bg-accent-tint font-semibold text-accent" : "font-medium text-text-2 hover:bg-surface-2"
      }`}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Primary"
      className="hidden w-[248px] shrink-0 flex-col gap-1 border-r border-border bg-surface px-3.5 py-5 md:flex"
    >
      <div className="flex items-center gap-2.5 px-1.5 pb-5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-ink">
          <CheckIcon size={16} />
        </div>
        <span className="font-display text-base font-bold tracking-tight">Todos</span>
      </div>

      <div className="mb-4 flex flex-col gap-px">
        <span className="px-2.5 pb-1.5 pt-2 text-[11px] font-bold tracking-wide text-text-3 uppercase">Plan</span>
        {PLAN_LINKS.map((link) => (
          <NavLink key={link.href} {...link} active={isActive(link.href)} />
        ))}
      </div>

      <div className="flex flex-col gap-px">
        <span className="px-2.5 pb-1.5 pt-2 text-[11px] font-bold tracking-wide text-text-3 uppercase">Organize</span>
        {ORGANIZE_LINKS.map((link) => (
          <NavLink key={link.href} {...link} active={isActive(link.href)} />
        ))}
      </div>

      <div className="flex-1" />

      <NavLink href="/settings" label="Settings" icon={SettingsIcon} active={isActive("/settings")} />

      <div className="mt-2 flex items-center gap-2 rounded-xl bg-surface-2 p-2.5">
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-accent text-[12.5px] font-bold text-accent-ink">
          {user.email[0]?.toUpperCase()}
        </div>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{user.email}</span>
        <button
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          aria-label="Log out"
          className="shrink-0 text-text-3 transition hover:text-text"
        >
          <LogoutIcon size={16} />
        </button>
      </div>
    </nav>
  );
}
