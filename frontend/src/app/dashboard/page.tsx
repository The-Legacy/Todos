"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";
import { useCategories } from "@/hooks/use-categories";
import { useUpdateTask } from "@/hooks/use-tasks";
import { useToday } from "@/hooks/use-today";
import { useWeek } from "@/hooks/use-week";
import { useProjects } from "@/hooks/use-projects";
import { useWorkouts } from "@/hooks/use-workouts";
import { CategoryBadge } from "@/components/category-badge";
import { ProgressBar } from "@/components/progress-bar";
import { OnboardingBanner } from "@/components/onboarding-banner";
import { CheckIcon, TodayIcon, WeekIcon, BacklogIcon, ProjectsIcon, FitnessIcon } from "@/components/icons";
import { formatDayLabel } from "@/lib/dates";
import { useSettings } from "@/lib/settings-context";

function DashboardContent() {
  const { user } = useAuth();
  const { timezone } = useSettings();
  const { data } = useToday();
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const { data: week } = useWeek(data?.weekStart ?? "");
  const updateTask = useUpdateTask();
  const { data: weekWorkouts } = useWorkouts(
    { from: week?.weekStart ?? "", to: week?.weekEnd ?? "" },
    { enabled: !!week },
  );

  const activeProjects = projects?.filter((p) => p.status === "active") ?? [];
  const categoryById = (id: string | null) => categories?.find((c) => c.id === id) ?? null;

  const todayDone = data?.today.filter((t) => t.status === "completed").length ?? 0;
  const todayTotal = data?.today.length ?? 0;
  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  const weekDates = week ? Object.keys(week.days) : [];
  const weekScheduled = weekDates.reduce((sum, d) => sum + (week?.days[d]?.length ?? 0), 0);
  const weekCompleted = weekDates.reduce(
    (sum, d) => sum + (week?.days[d]?.filter((t) => t.status === "completed").length ?? 0),
    0,
  );

  const workoutCount = weekWorkouts?.length ?? 0;
  const workoutDistance = (weekWorkouts ?? []).reduce((sum, w) => sum + (w.distanceMiles ?? 0), 0);

  const avgProgress = activeProjects.length
    ? Math.round((activeProjects.reduce((sum, p) => sum + p.progress, 0) / activeProjects.length) * 100)
    : 0;

  const greeting = useMemo(() => {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(new Date()),
    );
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, [timezone]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-6 py-9 sm:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {greeting}, {user?.email.split("@")[0]}
          </h1>
          <p className="text-[13.5px] text-text-2">
            {data && `${todayDone} of ${todayTotal} today's tasks done`}
          </p>
        </div>
        <Link href="/today" className="btn-primary">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add task
        </Link>
      </div>

      <OnboardingBanner />

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
        <div className="card flex flex-col gap-3.5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-text-2">Today</span>
            <TodayIcon size={15} className="text-accent" />
          </div>
          <div className="flex items-baseline gap-1.5 font-display">
            <span className="text-[28px] font-bold">{todayDone}</span>
            <span className="text-[15px] font-semibold text-text-3">/{todayTotal}</span>
          </div>
          <div className="h-[5px] overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${todayPct}%` }} />
          </div>
        </div>

        <div className="card flex flex-col gap-3.5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-text-2">This week</span>
            <WeekIcon size={15} className="text-teal" />
          </div>
          <div className="flex items-baseline gap-1.5 font-display">
            <span className="text-[28px] font-bold">{weekScheduled}</span>
            <span className="text-[12.5px] font-medium text-text-3">scheduled</span>
          </div>
          <span className="text-xs text-text-3">{weekCompleted} completed so far</span>
        </div>

        <div className="card flex flex-col gap-3.5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-text-2">Backlog</span>
            <BacklogIcon size={15} className="text-amber" />
          </div>
          <div className="flex items-baseline gap-1.5 font-display">
            <span className="text-[28px] font-bold">{data?.backlog.length ?? 0}</span>
            <span className="text-[12.5px] font-medium text-text-3">waiting</span>
          </div>
          <span className="text-xs text-text-3">Ready to schedule</span>
        </div>

        <div className="card flex flex-col gap-3.5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-text-2">Active projects</span>
            <ProjectsIcon size={15} className="text-[#8a5cf0]" />
          </div>
          <div className="flex items-baseline gap-1.5 font-display">
            <span className="text-[28px] font-bold">{activeProjects.length}</span>
            <span className="text-[12.5px] font-medium text-text-3">in progress</span>
          </div>
          <span className="text-xs text-text-3">{avgProgress}% average progress</span>
        </div>

        <div className="card flex flex-col gap-3.5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-text-2">This week</span>
            <FitnessIcon size={15} className="text-teal" />
          </div>
          <div className="flex items-baseline gap-1.5 font-display">
            <span className="text-[28px] font-bold">{workoutCount}</span>
            <span className="text-[12.5px] font-medium text-text-3">workout{workoutCount === 1 ? "" : "s"}</span>
          </div>
          <span className="text-xs text-text-3">
            {workoutDistance > 0 ? `${workoutDistance.toFixed(1)} mi logged` : "Log one on Fitness"}
          </span>
        </div>
      </div>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-bold">Today</h2>
          <Link href="/today" className="text-[12.5px] font-semibold text-text-3 hover:text-text">
            Open Today →
          </Link>
        </div>
        {data && data.today.length === 0 && (
          <p className="card border-dashed p-4 text-sm text-text-3">
            Nothing scheduled yet.{" "}
            <Link href="/today" className="underline">
              Pull something in
            </Link>
            .
          </p>
        )}
        <div className="card flex flex-col divide-y divide-border-soft overflow-hidden">
          {data?.today.map((task) => {
            const completed = task.status === "completed";
            return (
              <div key={task.id} className="flex items-center gap-3 p-3.5">
                <button
                  onClick={() =>
                    updateTask.mutate({ id: task.id, input: { status: completed ? "scheduled" : "completed" } })
                  }
                  aria-label={completed ? "Mark incomplete" : "Mark complete"}
                  className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[6px] border transition ${
                    completed ? "border-accent bg-accent text-accent-ink" : "border-border hover:border-text-3"
                  }`}
                >
                  {completed && <CheckIcon size={12} strokeWidth={3} />}
                </button>
                <span className={`flex-1 text-[13.5px] ${completed ? "text-text-3 line-through" : "font-medium"}`}>
                  {task.title}
                </span>
                <CategoryBadge category={categoryById(task.categoryId)} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-bold">This week</h2>
          <Link href="/week" className="text-[12.5px] font-semibold text-text-3 hover:text-text">
            Open Week →
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-2.5">
          {weekDates.map((date) => {
            const isToday = date === data?.date;
            const hasTasks = (week?.days[date]?.length ?? 0) > 0;
            return (
              <Link
                key={date}
                href="/week"
                className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition ${
                  isToday ? "bg-accent shadow-sm" : "card hover:border-text-3"
                }`}
              >
                <span className={`text-[11px] font-semibold ${isToday ? "text-accent-ink/70" : "text-text-3"}`}>
                  {formatDayLabel(date).split(" ")[0]}
                </span>
                <span className={`text-sm font-semibold ${isToday ? "text-accent-ink" : ""}`}>
                  {formatDayLabel(date).split(" ")[1]}
                </span>
                <span
                  className={`h-1 w-1 rounded-full ${
                    isToday ? "bg-accent-ink" : hasTasks ? "bg-teal" : "bg-border"
                  }`}
                />
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-bold">Backlog</h2>
            <Link href="/backlog" className="text-[12.5px] font-semibold text-text-3 hover:text-text">
              Open Backlog →
            </Link>
          </div>
          {data && data.backlog.length === 0 && <p className="text-sm text-text-3">Nothing in the backlog.</p>}
          <div className="card flex flex-col divide-y divide-border-soft overflow-hidden">
            {data?.backlog.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3.5">
                <span className="flex-1 text-[13px] font-medium">{task.title}</span>
                <CategoryBadge category={categoryById(task.categoryId)} />
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-bold">Active projects</h2>
            <Link href="/projects" className="text-[12.5px] font-semibold text-text-3 hover:text-text">
              Open Projects →
            </Link>
          </div>
          {activeProjects.length === 0 && (
            <p className="card border-dashed p-4 text-sm text-text-3">
              No active projects yet.{" "}
              <Link href="/projects" className="underline">
                Start one
              </Link>
              .
            </p>
          )}
          <div className="flex flex-col gap-2.5">
            {activeProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="card flex flex-col gap-2.5 p-3.5 hover:border-text-3">
                <span className="text-[13.5px] font-semibold">{project.name}</span>
                <ProgressBar progress={project.progress} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
