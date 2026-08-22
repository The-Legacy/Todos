"use client";

import { useMemo, useState } from "react";
import type { Task } from "@todos/shared";
import { addDays, getWeekStart } from "@todos/shared";
import { RequireAuth } from "@/components/require-auth";
import { PlannerTaskCard } from "@/components/planner-task-card";
import { CreateTaskForm } from "@/components/create-task-form";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { useCategories } from "@/hooks/use-categories";
import { useWeek } from "@/hooks/use-week";
import { useCreateTask, useDeleteTask, useUpdateTask } from "@/hooks/use-tasks";
import { formatDayLabel, formatWeekRange, todayISO } from "@/lib/dates";
import { useSettings } from "@/lib/settings-context";

function BacklogContent() {
  const { weekStartsOn } = useSettings();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(todayISO(), weekStartsOn));
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-9 sm:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">Backlog</h1>
          {data && <p className="text-[13.5px] text-text-2">Week of {formatWeekRange(data.weekStart, data.weekEnd)}</p>}
        </div>
        <div className="card flex items-center gap-0.5 p-1">
          <button
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            aria-label="Previous week"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-text-2 transition hover:bg-surface-2"
          >
            <ChevronLeftIcon size={15} />
          </button>
          <button
            onClick={() => setWeekStart(getWeekStart(todayISO(), weekStartsOn))}
            className="rounded-lg bg-surface-2 px-3.5 py-1.5 text-[12.5px] font-semibold"
          >
            This week
          </button>
          <button
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            aria-label="Next week"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-text-2 transition hover:bg-surface-2"
          >
            <ChevronRightIcon size={15} />
          </button>
        </div>
      </div>

      <p className="text-sm text-text-2">
        Dump everything you might want to do this week here — you don&apos;t need to pick a day yet.
      </p>

      <CreateTaskForm
        categories={categories ?? []}
        onCreate={async (input) => {
          await createTask.mutateAsync({ ...input, weekStart });
        }}
      />

      {isLoading && <p className="text-sm text-text-3">Loading…</p>}

      {data && data.backlog.length === 0 && (
        <p className="card border-dashed p-6 text-center text-sm text-text-3">
          Backlog is empty — add tasks above, or pull them in from Week.
        </p>
      )}

      {[...grouped.entries()].map(([key, tasks]) => {
        const category = key === "__none__" ? null : categoryById(key);
        return (
          <section key={key} className="flex flex-col gap-2.5">
            <h2 className="text-[13px] font-bold">{category?.name ?? "No category"}</h2>
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
