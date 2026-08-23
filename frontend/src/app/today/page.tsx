"use client";

import { useState } from "react";
import type { Task } from "@todos/shared";
import { RequireAuth } from "@/components/require-auth";
import { PlannerTaskCard } from "@/components/planner-task-card";
import { CreateTaskForm } from "@/components/create-task-form";
import { TaskEditModal } from "@/components/task-edit-modal";
import { PlusIcon } from "@/components/icons";
import { useCategories } from "@/hooks/use-categories";
import { useProjects } from "@/hooks/use-projects";
import { useToday } from "@/hooks/use-today";
import { useCreateTask, useDeleteTask, useUpdateTask } from "@/hooks/use-tasks";
import { todayISO } from "@/lib/dates";

function TodayContent() {
  const date = todayISO();
  const { data, isLoading } = useToday(date);
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const categoryById = (id: string | null) => categories?.find((c) => c.id === id) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-9 sm:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Today</h1>
        <p className="text-[13.5px] text-text-2">{date}</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:max-w-2xl">
          <CreateTaskForm
            categories={categories ?? []}
            onCreate={async (input) => {
              await createTask.mutateAsync({ ...input, status: "scheduled", scheduledDate: date });
            }}
          />

          {isLoading && <p className="text-sm text-text-3">Loading…</p>}

          {data && data.overdue.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h2 className="text-[12px] font-bold tracking-wide text-red uppercase">Overdue</h2>
              <div className="flex flex-col gap-2">
                {data.overdue.map((task) => (
                  <PlannerTaskCard
                    key={task.id}
                    task={task}
                    category={categoryById(task.categoryId)}
                    onToggleComplete={() => updateTask.mutate({ id: task.id, input: { status: "completed" } })}
                    onDelete={() => deleteTask.mutate(task.id)}
                    onEdit={() => setEditingTask(task)}
                    primaryAction={{
                      label: "Reschedule to today",
                      onClick: () => updateTask.mutate({ id: task.id, input: { scheduledDate: date } }),
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {data && (
            <section className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[12px] font-bold tracking-wide text-text-3 uppercase">Today&apos;s plan</h2>
                <span className="text-xs text-text-3">
                  {data.today.filter((t) => t.status === "completed").length} of {data.today.length} done
                </span>
              </div>
              {data.today.length === 0 && (
                <p className="card border-dashed p-6 text-center text-sm text-text-3">
                  Nothing scheduled yet — pull something from your backlog.
                </p>
              )}
              <div className="flex flex-col gap-2">
                {data.today.map((task) => (
                  <PlannerTaskCard
                    key={task.id}
                    task={task}
                    category={categoryById(task.categoryId)}
                    onToggleComplete={() =>
                      updateTask.mutate({
                        id: task.id,
                        input: { status: task.status === "completed" ? "scheduled" : "completed" },
                      })
                    }
                    onDelete={() => deleteTask.mutate(task.id)}
                    onEdit={() => setEditingTask(task)}
                    primaryAction={{
                      label: "Move to backlog",
                      onClick: () =>
                        updateTask.mutate({
                          id: task.id,
                          input: { status: "backlog", scheduledDate: null },
                        }),
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {data && (
          <div className="card flex w-full flex-col gap-3 p-4 lg:sticky lg:top-6 lg:w-[340px] lg:shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold">Backlog</span>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-text-3">
                {data.backlog.length}
              </span>
            </div>
            {data.backlog.length === 0 && <p className="text-sm text-text-3">Nothing left in the backlog.</p>}
            <div className="flex flex-col gap-2">
              {data.backlog.map((task) => (
                <div key={task.id} className="flex items-center gap-2.5 rounded-[11px] border border-border-soft p-2.5">
                  <button
                    onClick={() => setEditingTask(task)}
                    className="min-w-0 flex-1 truncate text-left text-[12.5px] font-medium hover:underline"
                  >
                    {task.title}
                  </button>
                  <button
                    onClick={() =>
                      updateTask.mutate({
                        id: task.id,
                        input: { status: "scheduled", scheduledDate: date },
                      })
                    }
                    aria-label="Add to today"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-accent-tint text-accent"
                  >
                    <PlusIcon size={13} strokeWidth={2.4} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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

export default function TodayPage() {
  return (
    <RequireAuth>
      <TodayContent />
    </RequireAuth>
  );
}
