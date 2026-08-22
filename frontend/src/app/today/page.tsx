"use client";

import { RequireAuth } from "@/components/require-auth";
import { PlannerTaskCard } from "@/components/planner-task-card";
import { CreateTaskForm } from "@/components/create-task-form";
import { useCategories } from "@/hooks/use-categories";
import { useToday } from "@/hooks/use-today";
import { useCreateTask, useDeleteTask, useUpdateTask } from "@/hooks/use-tasks";
import { todayISO } from "@/lib/dates";

function TodayContent() {
  const date = todayISO();
  const { data, isLoading } = useToday(date);
  const { data: categories } = useCategories();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const categoryById = (id: string | null) => categories?.find((c) => c.id === id) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">Today</h1>
        <p className="text-sm text-zinc-500">{date}</p>
      </div>

      <CreateTaskForm
        categories={categories ?? []}
        onCreate={async (input) => {
          await createTask.mutateAsync({ ...input, status: "scheduled", scheduledDate: date });
        }}
      />

      {isLoading && <p className="text-sm text-zinc-400">Loading…</p>}

      {data && data.overdue.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">Overdue</h2>
          <div className="flex flex-col gap-2">
            {data.overdue.map((task) => (
              <PlannerTaskCard
                key={task.id}
                task={task}
                category={categoryById(task.categoryId)}
                onToggleComplete={() => updateTask.mutate({ id: task.id, input: { status: "completed" } })}
                onDelete={() => deleteTask.mutate(task.id)}
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
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Today&apos;s plan</h2>
          {data.today.length === 0 && (
            <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400 dark:border-zinc-700">
              Nothing scheduled yet — pull something from your backlog below.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {data.today.map((task) => (
              <PlannerTaskCard
                key={task.id}
                task={task}
                category={categoryById(task.categoryId)}
                onToggleComplete={() =>
                  updateTask.mutate({ id: task.id, input: { status: task.status === "completed" ? "scheduled" : "completed" } })
                }
                onDelete={() => deleteTask.mutate(task.id)}
                primaryAction={{
                  label: "Move to backlog",
                  onClick: () =>
                    updateTask.mutate({
                      id: task.id,
                      input: { status: "backlog", scheduledDate: null, weekStart: data.weekStart },
                    }),
                }}
              />
            ))}
          </div>
        </section>
      )}

      {data && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">This week&apos;s backlog</h2>
          {data.backlog.length === 0 && <p className="text-sm text-zinc-400">Nothing left in the backlog.</p>}
          <div className="flex flex-col gap-2">
            {data.backlog.map((task) => (
              <PlannerTaskCard
                key={task.id}
                task={task}
                category={categoryById(task.categoryId)}
                onToggleComplete={() => updateTask.mutate({ id: task.id, input: { status: "completed" } })}
                onDelete={() => deleteTask.mutate(task.id)}
                primaryAction={{
                  label: "Add to today",
                  onClick: () =>
                    updateTask.mutate({
                      id: task.id,
                      input: { status: "scheduled", scheduledDate: date, weekStart: null },
                    }),
                }}
              />
            ))}
          </div>
        </section>
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
