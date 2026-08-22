"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProjectStatus } from "@todos/shared";
import { getWeekStart } from "@todos/shared";
import { RequireAuth } from "@/components/require-auth";
import { ProgressBar } from "@/components/progress-bar";
import { CategoryBadge } from "@/components/category-badge";
import { PROJECT_STATUS_LABELS } from "@/lib/project-status";
import { useCategories } from "@/hooks/use-categories";
import { useCreateTask, useDeleteTask, useUpdateTask } from "@/hooks/use-tasks";
import { useDeleteProject, useProject, useUpdateProject } from "@/hooks/use-projects";
import { todayISO } from "@/lib/dates";
import { ApiError } from "@/lib/api";

function ProjectDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading } = useProject(id);
  const { data: categories } = useCategories();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const categoryById = (categoryId: string | null) => categories?.find((c) => c.id === categoryId) ?? null;

  async function handleAddTask(e: FormEvent) {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    setError(null);
    try {
      await createTask.mutateAsync({ title, projectId: id });
      setNewTaskTitle("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add task");
    }
  }

  if (isLoading) {
    return <p className="mx-auto w-full max-w-2xl px-6 py-10 text-sm text-zinc-400">Loading…</p>;
  }
  if (!data) {
    return <p className="mx-auto w-full max-w-2xl px-6 py-10 text-sm text-zinc-400">Project not found.</p>;
  }

  const { project, tasks } = data;
  const remaining = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const completed = tasks.filter((t) => t.status === "completed");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-3">
        <Link href="/projects" className="text-xs font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
          ← Projects
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{project.name}</h1>
            {project.targetDate && <p className="text-sm text-zinc-500">Target: {project.targetDate}</p>}
          </div>
          <select
            value={project.status}
            onChange={(e) => updateProject.mutate({ id, input: { status: e.target.value as ProjectStatus } })}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {project.description && <p className="text-sm text-zinc-600 dark:text-zinc-300">{project.description}</p>}
        <ProgressBar progress={project.progress} />
        <p className="text-xs text-zinc-400">
          {project.taskCounts.completed}/{project.taskCounts.total} tasks complete
        </p>
        <button
          onClick={async () => {
            if (!confirm(`Delete "${project.name}"? Its tasks will be kept, just unassigned from the project.`)) return;
            await deleteProject.mutateAsync(id);
            router.replace("/projects");
          }}
          className="self-start text-xs font-medium text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
        >
          Delete project
        </button>
      </div>

      <form onSubmit={handleAddTask} className="flex gap-2">
        <input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a task to this project…"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={!newTaskTitle.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          Add
        </button>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Remaining ({remaining.length})</h2>
        {remaining.length === 0 && <p className="text-sm text-zinc-400">Nothing left — nice work.</p>}
        <div className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {remaining.map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-3">
              <input
                type="checkbox"
                checked={false}
                onChange={() => updateTask.mutate({ id: task.id, input: { status: "completed" } })}
                className="h-4 w-4 accent-zinc-900 dark:accent-white"
              />
              <span className="flex-1 text-sm">{task.title}</span>
              <CategoryBadge category={categoryById(task.categoryId)} />
              {task.status === "backlog" ? (
                <button
                  onClick={() =>
                    updateTask.mutate({
                      id: task.id,
                      input: { status: "scheduled", scheduledDate: todayISO(), weekStart: null },
                    })
                  }
                  className="text-xs font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  Add to today
                </button>
              ) : (
                <button
                  onClick={() =>
                    updateTask.mutate({
                      id: task.id,
                      input: { status: "backlog", scheduledDate: null, weekStart: getWeekStart(todayISO()) },
                    })
                  }
                  className="text-xs font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  Add to this week&apos;s backlog
                </button>
              )}
              <button
                onClick={() => deleteTask.mutate(task.id)}
                className="text-xs font-medium text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Completed ({completed.length})</h2>
        {completed.length === 0 && <p className="text-sm text-zinc-400">Nothing completed yet.</p>}
        <div className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 opacity-60 dark:divide-zinc-800 dark:border-zinc-800">
          {completed.map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-3">
              <input
                type="checkbox"
                checked
                onChange={() => updateTask.mutate({ id: task.id, input: { status: "backlog" } })}
                className="h-4 w-4 accent-zinc-900 dark:accent-white"
              />
              <span className="flex-1 text-sm line-through">{task.title}</span>
              <CategoryBadge category={categoryById(task.categoryId)} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ProjectDetail({ id }: { id: string }) {
  return (
    <RequireAuth>
      <ProjectDetailContent id={id} />
    </RequireAuth>
  );
}
