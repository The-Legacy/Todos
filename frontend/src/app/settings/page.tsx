"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth-context";
import { useTheme, type Theme } from "@/lib/theme-context";
import { useSettings } from "@/lib/settings-context";
import { useResetTasks } from "@/hooks/use-tasks";
import { ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";

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

function ResetTasksSection() {
  const resetTasks = useResetTasks();
  const { showToast } = useToast();
  const [confirmText, setConfirmText] = useState("");

  async function handleReset(scope: "upcoming" | "overdue" | "all", confirmMessage: string) {
    if (!confirm(confirmMessage)) return;
    try {
      await resetTasks.mutateAsync(scope);
      const message =
        scope === "all" ? "All tasks deleted." : scope === "overdue" ? "Overdue tasks cleared." : "Upcoming tasks cleared.";
      showToast(message, "info");
      setConfirmText("");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not reset tasks");
    }
  }

  const wipeConfirmed = confirmText.trim().toUpperCase() === "DELETE";

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[13px] font-bold text-red">Danger zone</h2>
      <div className="card flex flex-col gap-4 border-red/30 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Reset upcoming tasks</p>
            <p className="text-xs text-text-3">
              Deletes your backlog and everything scheduled today or later that isn&apos;t completed. Past
              and completed tasks are kept. Recurring rules aren&apos;t touched — pause or delete those
              separately.
            </p>
          </div>
          <button
            onClick={() =>
              handleReset(
                "upcoming",
                "Delete your backlog and everything scheduled today or later that isn't completed? This can't be undone.",
              )
            }
            disabled={resetTasks.isPending}
            className="btn-secondary shrink-0 border-red/40 text-red hover:bg-red/10"
          >
            Reset upcoming
          </button>
        </div>

        <div className="flex flex-col gap-2 border-t border-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Clear overdue tasks</p>
            <p className="text-xs text-text-3">
              Deletes tasks still sitting in Overdue — scheduled for a day before today and never
              completed or rescheduled. Everything else is left alone.
            </p>
          </div>
          <button
            onClick={() =>
              handleReset("overdue", "Delete every task that's still overdue? This can't be undone.")
            }
            disabled={resetTasks.isPending}
            className="btn-secondary shrink-0 border-red/40 text-red hover:bg-red/10"
          >
            Clear overdue
          </button>
        </div>

        <div className="flex flex-col gap-2 border-t border-border-soft pt-4">
          <div>
            <p className="text-sm font-semibold">Delete all tasks</p>
            <p className="text-xs text-text-3">
              Permanently deletes every task you have, including history. Type DELETE to confirm.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="field sm:w-56"
            />
            <button
              onClick={() =>
                handleReset("all", "Permanently delete every task you have, including history? This can't be undone.")
              }
              disabled={!wipeConfirmed || resetTasks.isPending}
              className="btn-secondary shrink-0 border-red/40 text-red hover:bg-red/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete all tasks
            </button>
          </div>
        </div>
      </div>
    </section>
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

      <ResetTasksSection />
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
