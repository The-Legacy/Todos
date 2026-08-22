"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";
import { ProgressBar } from "@/components/progress-bar";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_STYLES } from "@/lib/project-status";
import { useCreateProject, useProjects } from "@/hooks/use-projects";
import { ApiError } from "@/lib/api";

function CreateProjectForm() {
  const createProject = useCreateProject();
  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await createProject.mutateAsync({ name: trimmed, targetDate: targetDate || null });
      setName("");
      setTargetDate("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create project");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 sm:flex-row sm:items-center">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New project or goal…"
        className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        type="date"
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={createProject.isPending || !name.trim()}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
      >
        Add
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}

function ProjectsContent() {
  const { data: projects, isLoading } = useProjects();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">Projects</h1>
        <p className="text-sm text-zinc-500">
          Longer-term goals, separate from weekly planning. Break them into tasks and pull those into a
          week whenever you&apos;re ready to work on them.
        </p>
      </div>

      <CreateProjectForm />

      {isLoading && <p className="text-sm text-zinc-400">Loading…</p>}
      {!isLoading && projects?.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400 dark:border-zinc-700">
          No projects yet — add one above.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {projects?.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{project.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PROJECT_STATUS_STYLES[project.status]}`}>
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
            </div>
            {project.targetDate && <p className="text-xs text-zinc-400">Target: {project.targetDate}</p>}
            <ProgressBar progress={project.progress} />
            <p className="text-xs text-zinc-400">
              {project.taskCounts.completed}/{project.taskCounts.total} tasks complete
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <RequireAuth>
      <ProjectsContent />
    </RequireAuth>
  );
}
