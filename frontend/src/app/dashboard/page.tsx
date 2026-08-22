"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";
import { useCategories } from "@/hooks/use-categories";
import { useUpdateTask } from "@/hooks/use-tasks";
import { useToday } from "@/hooks/use-today";
import { CategoryBadge } from "@/components/category-badge";
import { formatDayLabel } from "@/lib/dates";
import { addDays } from "@todos/shared";

function DashboardContent() {
  const { user } = useAuth();
  const { data } = useToday();
  const { data: categories } = useCategories();
  const updateTask = useUpdateTask();

  const categoryById = (id: string | null) => categories?.find((c) => c.id === id) ?? null;
  const weekDays = data ? Array.from({ length: 7 }, (_, i) => addDays(data.weekStart, i)) : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-500">Signed in as {user?.email}</p>
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Today</h2>
          <Link href="/today" className="text-xs font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
            Open Today →
          </Link>
        </div>
        {data && data.today.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-400 dark:border-zinc-700">
            Nothing scheduled yet. <Link href="/today" className="underline">Pull something in</Link>.
          </p>
        )}
        <div className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {data?.today.map((task) => (
            <label key={task.id} className="flex items-center gap-3 p-3">
              <input
                type="checkbox"
                checked={task.status === "completed"}
                onChange={() =>
                  updateTask.mutate({ id: task.id, input: { status: task.status === "completed" ? "scheduled" : "completed" } })
                }
                className="h-4 w-4 accent-zinc-900 dark:accent-white"
              />
              <span className={`flex-1 text-sm ${task.status === "completed" ? "text-zinc-400 line-through" : ""}`}>
                {task.title}
              </span>
              <CategoryBadge category={categoryById(task.categoryId)} />
            </label>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">This week</h2>
          <Link href="/week" className="text-xs font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
            Open Week →
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((date, i) => (
            <Link
              key={date}
              href="/week"
              className={`flex flex-col items-center gap-1 rounded-md border p-2 text-center transition hover:border-zinc-400 dark:hover:border-zinc-600 ${
                date === (data?.date ?? "") ? "border-zinc-900 dark:border-white" : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <span className="text-xs text-zinc-500">{formatDayLabel(date, i)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Weekly backlog</h2>
          <Link href="/backlog" className="text-xs font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
            Open Backlog →
          </Link>
        </div>
        {data && data.backlog.length === 0 && <p className="text-sm text-zinc-400">Nothing in the backlog.</p>}
        <div className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {data?.backlog.slice(0, 5).map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-3">
              <span className="flex-1 text-sm">{task.title}</span>
              <CategoryBadge category={categoryById(task.categoryId)} />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Active projects</h2>
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400 dark:border-zinc-700">
          Projects land in the next phase.
        </div>
      </section>
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
