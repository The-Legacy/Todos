"use client";

import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { CreateTaskForm } from "@/components/create-task-form";
import { TaskItem } from "@/components/task-item";
import { useCategories } from "@/hooks/use-categories";
import { useProjects } from "@/hooks/use-projects";
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from "@/hooks/use-tasks";
import type { TaskStatus } from "@todos/shared";

const STATUS_TABS: Array<{ label: string; value: TaskStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Backlog", value: "backlog" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

function TasksContent() {
  const [statusTab, setStatusTab] = useState<TaskStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const { data: tasks, isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const filteredTasks = useMemo(() => {
    return (tasks ?? []).filter((task) => {
      if (statusTab !== "all" && task.status !== statusTab) return false;
      if (categoryFilter && task.categoryId !== categoryFilter) return false;
      return true;
    });
  }, [tasks, statusTab, categoryFilter]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">Tasks</h1>
        <p className="text-sm text-zinc-500">
          Everything you&apos;ve captured. Weekly scheduling views land next — for now, manage
          everything here.
        </p>
      </div>

      <CreateTaskForm
        categories={categories ?? []}
        onCreate={async (input) => {
          await createTask.mutateAsync(input);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusTab(tab.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                statusTab === tab.value
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {isLoading && <p className="p-4 text-sm text-zinc-400">Loading…</p>}
        {!isLoading && filteredTasks.length === 0 && (
          <p className="p-4 text-sm text-zinc-400">Nothing here yet.</p>
        )}
        {filteredTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            categories={categories ?? []}
            projects={projects ?? []}
            onUpdate={(input) => updateTask.mutate({ id: task.id, input })}
            onDelete={() => deleteTask.mutate(task.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <RequireAuth>
      <TasksContent />
    </RequireAuth>
  );
}
