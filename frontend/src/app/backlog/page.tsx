"use client";

import { useMemo, useState } from "react";
import type { Task } from "@todos/shared";
import { addDays, getWeekStart } from "@todos/shared";
import { RequireAuth } from "@/components/require-auth";
import { PlannerTaskCard } from "@/components/planner-task-card";
import { CreateTaskForm } from "@/components/create-task-form";
import { useCategories } from "@/hooks/use-categories";
import { useWeek } from "@/hooks/use-week";
import { useCreateTask, useDeleteTask, useUpdateTask } from "@/hooks/use-tasks";
import { formatDayLabel, formatWeekRange, todayISO } from "@/lib/dates";

function BacklogContent() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(todayISO()));
  const { data, isLoading } = useWeek(weekStart);
  const { data: categories } = useCategories();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const dates = useMemo(() => (data ? Object.keys(data.days) : []), [data]);
  const categoryById = (id: string | null) => categories?.find((c) => c.id === id) ?? null;

  const grouped = useMemo(() => {
    const groups = new Map<string, Task[]>();
    for (const task of data?.backlog ?? []) {
      const key = task.categoryId ?? "__none__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(task);
    }
    return groups;
  }, [data]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Backlog</h1>
          {data && <p className="text-sm text-zinc-500">Week of {formatWeekRange(data.weekStart, data.weekEnd)}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ← Prev
          </button>
          <button
            onClick={() => setWeekStart(getWeekStart(todayISO()))}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            This week
          </button>
          <button
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Next →
          </button>
        </div>
      </div>

      <p className="text-sm text-zinc-500">
        Dump everything you might want to do this week here — you don&apos;t need to pick a day yet.
      </p>

      <CreateTaskForm
        categories={categories ?? []}
        onCreate={async (input) => {
          await createTask.mutateAsync({ ...input, weekStart });
        }}
      />

      {isLoading && <p className="text-sm text-zinc-400">Loading…</p>}

      {data && data.backlog.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400 dark:border-zinc-700">
          Backlog is empty — add tasks above, or pull them in from Week.
        </p>
      )}

      {[...grouped.entries()].map(([key, tasks]) => {
        const category = key === "__none__" ? null : categoryById(key);
        return (
          <section key={key} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">{category?.name ?? "No category"}</h2>
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <PlannerTaskCard
                  key={task.id}
                  task={task}
                  category={category}
                  onToggleComplete={() => updateTask.mutate({ id: task.id, input: { status: "completed" } })}
                  onDelete={() => deleteTask.mutate(task.id)}
                  primaryAction={{
                    label: "Add to today",
                    onClick: () =>
                      updateTask.mutate({
                        id: task.id,
                        input: { status: "scheduled", scheduledDate: todayISO(), weekStart: null },
                      }),
                  }}
                  moveOptions={dates.map((d, i) => ({ value: d, label: formatDayLabel(d, i) }))}
                  onMove={(dest) =>
                    updateTask.mutate({ id: task.id, input: { status: "scheduled", scheduledDate: dest, weekStart: null } })
                  }
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function BacklogPage() {
  return (
    <RequireAuth>
      <BacklogContent />
    </RequireAuth>
  );
}
