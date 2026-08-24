"use client";

import { useState, type FormEvent } from "react";
import type { Category, Project, TaskPriority, TaskTemplate } from "@todos/shared";
import { ApiError } from "@/lib/api";
import { EditIcon, PlusIcon, XIcon } from "@/components/icons";
import {
  useCreateTaskTemplate,
  useDeleteTaskTemplate,
  useTaskTemplates,
  useUpdateTaskTemplate,
} from "@/hooks/use-task-templates";

interface CommonTasksPanelProps {
  categories: Category[];
  projects: Project[];
  onApply: (template: TaskTemplate) => void;
  applyLabel?: string;
}

function TemplateForm({
  categories,
  projects,
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  categories: Category[];
  projects: Project[];
  initial?: TaskTemplate;
  onSubmit: (input: {
    title: string;
    categoryId: string | null;
    projectId: string | null;
    priority: TaskPriority;
    estimatedMinutes: number | null;
  }) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [projectId, setProjectId] = useState(initial?.projectId ?? "");
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? "medium");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    initial?.estimatedMinutes != null ? String(initial.estimatedMinutes) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: trimmed,
        categoryId: categoryId || null,
        projectId: projectId || null,
        priority,
        estimatedMinutes: estimatedMinutes === "" ? null : Number(estimatedMinutes),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save common task");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-[11px] border border-border-soft p-2.5">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Work block, Read, Meal prep…"
        className="field text-[12.5px]"
        autoFocus
      />
      <div className="flex flex-wrap gap-1.5">
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field flex-1 text-[12px]">
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="field flex-1 text-[12px]">
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-1.5">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          className="field flex-1 text-[12px]"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input
          type="number"
          min={0}
          step={5}
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value)}
          placeholder="Minutes"
          className="field w-24 text-[12px]"
        />
      </div>
      {error && <p className="text-xs text-red">{error}</p>}
      <div className="flex gap-1.5">
        <button type="submit" disabled={isSubmitting || !title.trim()} className="btn-primary flex-1 justify-center py-1.5 text-[12px]">
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary py-1.5 text-[12px]">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function CommonTasksPanel({ categories, projects, onApply, applyLabel = "Add" }: CommonTasksPanelProps) {
  const { data: templates, isLoading } = useTaskTemplates();
  const createTemplate = useCreateTaskTemplate();
  const updateTemplate = useUpdateTaskTemplate();
  const deleteTemplate = useDeleteTaskTemplate();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const categoryById = (id: string | null) => categories.find((c) => c.id === id) ?? null;

  return (
    <div className="card flex flex-col gap-2.5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold">Common tasks</span>
        <button
          onClick={() => setIsCreating((v) => !v)}
          aria-label={isCreating ? "Cancel" : "New common task"}
          className="-m-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] p-2 text-text-3 transition hover:bg-surface-2 hover:text-accent"
        >
          {isCreating ? <XIcon size={13} /> : <PlusIcon size={13} strokeWidth={2.4} />}
        </button>
      </div>
      <p className="text-[12px] text-text-2">
        Save a task you do often — like a 2-hour work block — and drop it onto any day without
        recreating it, no fixed schedule required.
      </p>

      {isCreating && (
        <TemplateForm
          categories={categories}
          projects={projects}
          submitLabel="Save"
          onSubmit={async (input) => {
            await createTemplate.mutateAsync(input);
            setIsCreating(false);
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {isLoading && <p className="text-sm text-text-3">Loading…</p>}
      {!isLoading && templates?.length === 0 && !isCreating && (
        <p className="text-sm text-text-3">No common tasks saved yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {templates?.map((template) =>
          editingId === template.id ? (
            <TemplateForm
              key={template.id}
              categories={categories}
              projects={projects}
              initial={template}
              submitLabel="Save changes"
              onSubmit={async (input) => {
                await updateTemplate.mutateAsync({ id: template.id, input });
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={template.id} className="flex items-center gap-2.5 rounded-[11px] border border-border-soft p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium">{template.title}</p>
                {categoryById(template.categoryId) && (
                  <p className="truncate text-[11px]" style={{ color: categoryById(template.categoryId)!.color }}>
                    {categoryById(template.categoryId)!.name}
                  </p>
                )}
              </div>
              <div className="-mx-2 flex shrink-0 items-center gap-4">
                <button
                  onClick={() => setEditingId(template.id)}
                  aria-label="Edit common task"
                  className="flex h-7 w-7 items-center justify-center rounded-[7px] p-2 text-text-3 transition hover:text-accent"
                >
                  <EditIcon size={13} />
                </button>
                <button
                  onClick={() => deleteTemplate.mutate(template.id)}
                  aria-label="Delete common task"
                  className="flex h-7 w-7 items-center justify-center rounded-[7px] p-2 text-text-3 transition hover:text-red"
                >
                  <XIcon size={13} />
                </button>
              </div>
              <button onClick={() => onApply(template)} className="btn-primary shrink-0 py-1.5 text-[12px]">
                {applyLabel}
              </button>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
