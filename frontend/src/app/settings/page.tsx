"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth-context";
import { useTheme, type Theme } from "@/lib/theme-context";
import { useSettings } from "@/lib/settings-context";

const THEME_OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function SettingsContent() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { weekStartsOn, setWeekStartsOn, defaultDurationMinutes, setDefaultDurationMinutes } = useSettings();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-zinc-500">Preferences are saved to this browser.</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Account</h2>
        <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <p className="text-zinc-500">Signed in as</p>
          <p className="font-medium">{user?.email}</p>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
                theme === opt.value
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Week start day</h2>
        <p className="text-xs text-zinc-500">Controls how Today, Week, and Backlog group your weeks.</p>
        <div className="flex gap-2">
          <button
            onClick={() => setWeekStartsOn(1)}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
              weekStartsOn === 1
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            Monday
          </button>
          <button
            onClick={() => setWeekStartsOn(0)}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
              weekStartsOn === 0
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            Sunday
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Default task duration</h2>
        <p className="text-xs text-zinc-500">Pre-fills the estimated duration when you add a new task.</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={5}
            value={defaultDurationMinutes ?? ""}
            onChange={(e) => setDefaultDurationMinutes(e.target.value === "" ? null : Number(e.target.value))}
            placeholder="None"
            className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span className="text-sm text-zinc-500">minutes</span>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Categories</h2>
        <Link
          href="/categories"
          className="self-start rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Manage categories →
        </Link>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsContent />
    </RequireAuth>
  );
}
