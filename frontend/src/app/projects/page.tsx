"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";
import { ProgressBar } from "@/components/progress-bar";
import { PlusIcon } from "@/components/icons";
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
    <form onSubmit={handleSubmit} className="card flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New project or goal…"
        className="field flex-1"
      />
      <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="field" />
      <button type="submit" disabled={createProject.isPending || !name.trim()} className="btn-primary">
        <PlusIcon size={15} strokeWidth={2.4} />
        Add
      </button>
      {error && <p className="text-sm text-red">{error}</p>}
    </form>
  );
}

function ProjectsContent() {
  const { data: projects, isLoading } = useProjects();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-9 sm:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Projects</h1>
        <p className="text-[13.5px] text-text-2">
          Longer-term goals, separate from weekly planning. Break them into tasks and pull those into a
          week whenever you&apos;re ready to work on them.
        </p>
      </div>

      <CreateProjectForm />

      {isLoading && <p className="text-sm text-text-3">Loading…</p>}
      {!isLoading && projects?.length === 0 && (
        <p className="card border-dashed p-6 text-center text-sm text-text-3">No projects yet — add one above.</p>
      )}

      <div className="flex flex-col gap-3">
        {projects?.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="card flex flex-col gap-2.5 p-4 hover:border-text-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13.5px] font-semibold">{project.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PROJECT_STATUS_STYLES[project.status]}`}>
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
            </div>
            {project.targetDate && <p className="text-xs text-text-3">Target: {project.targetDate}</p>}
            <ProgressBar progress={project.progress} />
            <p className="text-xs text-text-3">
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
