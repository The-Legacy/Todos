"use client";

import Link from "next/link";
import { useMemo } from "react";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth-context";
import { useTheme, type Theme } from "@/lib/theme-context";
import { useSettings } from "@/lib/settings-context";

const TIMEZONES = Intl.supportedValuesOf("timeZone");

const THEME_OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function SegmentedButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-[10px] border px-3 py-2 text-sm font-semibold transition ${
        active ? "border-accent bg-accent-tint text-accent" : "border-border text-text-2 hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { weekStartsOn, setWeekStartsOn, defaultDurationMinutes, setDefaultDurationMinutes, timezone, setTimezone } =
    useSettings();

  const currentTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date());
    } catch {
      return null;
    }
  }, [timezone]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-7 px-6 py-9 sm:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-[13.5px] text-text-2">Preferences are saved to this browser.</p>
      </div>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-bold">Account</h2>
        <div className="card p-4 text-sm">
          <p className="text-text-2">Signed in as</p>
          <p className="font-semibold">{user?.email}</p>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-bold">Appearance</h2>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((opt) => (
            <SegmentedButton key={opt.value} active={theme === opt.value} onClick={() => setTheme(opt.value)}>
              {opt.label}
            </SegmentedButton>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-bold">Timezone</h2>
        <p className="text-xs text-text-3">
          Determines what &quot;today&quot; means for Today, Week, and Backlog — and when a recurring
          task&apos;s day rolls over.
        </p>
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="field">
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        {currentTime && <p className="text-xs text-text-3">Current time there: {currentTime}</p>}
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-bold">Week start day</h2>
        <p className="text-xs text-text-3">Controls how Today, Week, and Backlog group your weeks.</p>
        <div className="flex gap-2">
          <SegmentedButton active={weekStartsOn === 1} onClick={() => setWeekStartsOn(1)}>
            Monday
          </SegmentedButton>
          <SegmentedButton active={weekStartsOn === 0} onClick={() => setWeekStartsOn(0)}>
            Sunday
          </SegmentedButton>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-bold">Default task duration</h2>
        <p className="text-xs text-text-3">Pre-fills the estimated duration when you add a new task.</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={5}
            value={defaultDurationMinutes ?? ""}
            onChange={(e) => setDefaultDurationMinutes(e.target.value === "" ? null : Number(e.target.value))}
            placeholder="None"
            className="field w-32"
          />
          <span className="text-sm text-text-2">minutes</span>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-bold">Categories &amp; recurring tasks</h2>
        <div className="flex gap-2">
          <Link href="/categories" className="btn-secondary">
            Manage categories →
          </Link>
          <Link href="/recurring" className="btn-secondary">
            Manage recurring tasks →
          </Link>
        </div>
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
