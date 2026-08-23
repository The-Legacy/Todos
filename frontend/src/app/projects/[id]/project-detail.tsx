"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProjectStatus } from "@todos/shared";
import { RequireAuth } from "@/components/require-auth";
import { ProgressBar } from "@/components/progress-bar";
import { CategoryBadge } from "@/components/category-badge";
import { CheckIcon, ChevronLeftIcon, PlusIcon } from "@/components/icons";
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
    return <p className="mx-auto w-full max-w-2xl px-6 py-9 text-sm text-text-3">Loading…</p>;
  }
  if (!data) {
    return <p className="mx-auto w-full max-w-2xl px-6 py-9 text-sm text-text-3">Project not found.</p>;
  }

  const { project, tasks } = data;
  const remaining = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const completed = tasks.filter((t) => t.status === "completed");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-6 py-9 sm:px-10">
      <div className="flex flex-col gap-3.5">
        <Link href="/projects" className="inline-flex items-center gap-1 text-xs font-semibold text-text-3 hover:text-text">
          <ChevronLeftIcon size={13} />
          Projects
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-xl font-bold tracking-tight">{project.name}</h1>
            {project.targetDate && <p className="text-[13px] text-text-2">Target: {project.targetDate}</p>}
          </div>
          <select
            value={project.status}
            onChange={(e) => updateProject.mutate({ id, input: { status: e.target.value as ProjectStatus } })}
            className="field py-1.5"
          >
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {project.description && <p className="text-sm text-text-2">{project.description}</p>}
        <ProgressBar progress={project.progress} />
        <p className="text-xs text-text-3">
          {project.taskCounts.completed}/{project.taskCounts.total} tasks complete
        </p>
        <button
          onClick={async () => {
            if (!confirm(`Delete "${project.name}"? Its tasks will be kept, just unassigned from the project.`)) return;
            await deleteProject.mutateAsync(id);
            router.replace("/projects");
          }}
          className="self-start text-xs font-semibold text-text-3 hover:text-red"
        >
          Delete project
        </button>
      </div>

      <form onSubmit={handleAddTask} className="flex gap-2">
        <input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a task to this project…"
          className="field flex-1"
        />
        <button type="submit" disabled={!newTaskTitle.trim()} className="btn-primary">
          <PlusIcon size={15} strokeWidth={2.4} />
          Add
        </button>
      </form>
      {error && <p className="text-sm text-red">{error}</p>}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-bold">Remaining ({remaining.length})</h2>
        {remaining.length === 0 && <p className="text-sm text-text-3">Nothing left — nice work.</p>}
        <div className="card flex flex-col divide-y divide-border-soft">
          {remaining.map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-3.5">
              <button
                onClick={() => updateTask.mutate({ id: task.id, input: { status: "completed" } })}
                aria-label="Mark complete"
                className="flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[6px] border border-border transition hover:border-text-3"
              />
              <span className="flex-1 text-[13.5px] font-medium">{task.title}</span>
              <CategoryBadge category={categoryById(task.categoryId)} />
              {task.status === "backlog" ? (
                <button
                  onClick={() =>
                    updateTask.mutate({
                      id: task.id,
                      input: { status: "scheduled", scheduledDate: todayISO() },
                    })
                  }
                  className="text-xs font-semibold text-text-3 hover:text-text"
                >
                  Add to today
                </button>
              ) : (
                <button
                  onClick={() =>
                    updateTask.mutate({
                      id: task.id,
                      input: { status: "backlog", scheduledDate: null },
                    })
                  }
                  className="text-xs font-semibold text-text-3 hover:text-text"
                >
                  Add to backlog
                </button>
              )}
              <button onClick={() => deleteTask.mutate(task.id)} className="text-xs font-semibold text-text-3 hover:text-red">
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-bold">Completed ({completed.length})</h2>
        {completed.length === 0 && <p className="text-sm text-text-3">Nothing completed yet.</p>}
        <div className="card flex flex-col divide-y divide-border-soft opacity-60">
          {completed.map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-3.5">
              <button
                onClick={() => updateTask.mutate({ id: task.id, input: { status: "backlog" } })}
                aria-label="Mark incomplete"
                className="flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[6px] border border-accent bg-accent text-accent-ink"
              >
                <CheckIcon size={12} strokeWidth={3} />
              </button>
              <span className="flex-1 text-[13.5px] font-medium line-through">{task.title}</span>
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
