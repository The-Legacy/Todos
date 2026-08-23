"use client";

import { useMemo, useState } from "react";
import type { Task } from "@todos/shared";
import { addDays, getWeekDates, getWeekStart } from "@todos/shared";
import { RequireAuth } from "@/components/require-auth";
import { PlannerTaskCard } from "@/components/planner-task-card";
import { CreateTaskForm } from "@/components/create-task-form";
import { TaskEditModal } from "@/components/task-edit-modal";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { useCategories } from "@/hooks/use-categories";
import { useProjects } from "@/hooks/use-projects";
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from "@/hooks/use-tasks";
import { formatDayLabel, formatWeekRange, todayISO } from "@/lib/dates";
import { useSettings } from "@/lib/settings-context";

function BacklogContent() {
  const { weekStartsOn } = useSettings();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(todayISO(), weekStartsOn));
  const { data: backlogTasks, isLoading } = useTasks({ status: "backlog" });
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const createTask = useCreateTask({ status: "backlog" });
  const updateTask = useUpdateTask({ status: "backlog" });
  const deleteTask = useDeleteTask({ status: "backlog" });
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const dates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const weekEnd = dates[dates.length - 1];
  const categoryById = (id: string | null) => categories?.find((c) => c.id === id) ?? null;

  const grouped = useMemo(() => {
    const groups = new Map<string, Task[]>();
    for (const task of backlogTasks ?? []) {
      const key = task.categoryId ?? "__none__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(task);
    }
    return groups;
  }, [backlogTasks]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-9 sm:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Backlog</h1>
        <p className="text-[13.5px] text-text-2">
          Everything you haven&apos;t scheduled yet — it stays here until you do, no matter how many
          weeks pass.
        </p>
      </div>

      <CreateTaskForm
        categories={categories ?? []}
        onCreate={async (input) => {
          await createTask.mutateAsync(input);
        }}
      />

      {isLoading && <p className="text-sm text-text-3">Loading…</p>}

      {backlogTasks && backlogTasks.length === 0 && (
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
                  onEdit={() => setEditingTask(task)}
                  primaryAction={{
                    label: "Add to today",
                    onClick: () =>
                      updateTask.mutate({ id: task.id, input: { status: "scheduled", scheduledDate: todayISO() } }),
                  }}
                  moveOptions={dates.map((d) => ({ value: d, label: formatDayLabel(d) }))}
                  onMove={(dest) => updateTask.mutate({ id: task.id, input: { status: "scheduled", scheduledDate: dest } })}
                />
              ))}
            </div>
          </section>
        );
      })}

      <div className="card flex flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-bold tracking-wide text-text-3 uppercase">Scheduling into</span>
            <span className="text-[13px] font-semibold">{formatWeekRange(weekStart, weekEnd)}</span>
          </div>
          <div className="flex items-center gap-0.5 rounded-lg bg-surface-2 p-1">
            <button
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              aria-label="Previous week"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-text-2 transition hover:bg-surface"
            >
              <ChevronLeftIcon size={15} />
            </button>
            <button
              onClick={() => setWeekStart(getWeekStart(todayISO(), weekStartsOn))}
              className="rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold hover:bg-surface"
            >
              This week
            </button>
            <button
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              aria-label="Next week"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-text-2 transition hover:bg-surface"
            >
              <ChevronRightIcon size={15} />
            </button>
          </div>
        </div>
        <p className="text-xs text-text-3">Controls which week&apos;s days show up in each task&apos;s &quot;Move to…&quot; picker above.</p>
      </div>

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          categories={categories ?? []}
          projects={projects ?? []}
          onSave={(input) => updateTask.mutate({ id: editingTask.id, input })}
          onDelete={() => deleteTask.mutate(editingTask.id)}
          onClose={() => setEditingTask(null)}
        />
      )}
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
