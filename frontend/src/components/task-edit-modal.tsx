"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Category, Project, Task, TaskPriority } from "@todos/shared";
import type { UpdateTaskInput } from "@/lib/api";
import { XIcon } from "@/components/icons";

interface TaskEditModalProps {
  task: Task;
  categories: Category[];
  projects: Project[];
  onSave: (input: UpdateTaskInput) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function TaskEditModal({ task, categories, projects, onSave, onDelete, onClose }: TaskEditModalProps) {
  const [draft, setDraft] = useState({
    title: task.title,
    description: task.description ?? "",
    categoryId: task.categoryId ?? "",
    projectId: task.projectId ?? "",
    priority: task.priority,
    dueDate: task.dueDate ?? "",
    scheduledDate: task.scheduledDate ?? "",
    estimatedMinutes: task.estimatedMinutes != null ? String(task.estimatedMinutes) : "",
  });
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handleSave() {
    const title = draft.title.trim();
    if (!title) return;
    onSave({
      title,
      description: draft.description.trim() || null,
      categoryId: draft.categoryId || null,
      projectId: draft.projectId || null,
      priority: draft.priority,
      dueDate: draft.dueDate || null,
      scheduledDate: draft.scheduledDate || null,
      estimatedMinutes: draft.estimatedMinutes === "" ? null : Number(draft.estimatedMinutes),
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-edit-title"
        className="card flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto p-5"
      >
        <div className="flex items-center justify-between">
          <h2 id="task-edit-title" className="text-[15px] font-bold">
            Edit task
          </h2>
          <button onClick={onClose} aria-label="Close" className="-m-2 p-2 text-text-3 transition hover:text-text">
            <XIcon size={16} />
          </button>
        </div>

        {task.recurringTaskId && (
          <p className="rounded-[10px] bg-accent-tint px-3 py-2 text-xs text-accent">
            Generated from a recurring rule — changes here only affect this occurrence.{" "}
            <Link href="/recurring" className="underline" onClick={onClose}>
              Edit the rule
            </Link>
          </p>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-title" className="text-xs font-semibold text-text-2">
              Title
            </label>
            <input
              id="edit-title"
              ref={titleRef}
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="field"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-description" className="text-xs font-semibold text-text-2">
              Notes
            </label>
            <textarea
              id="edit-description"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              rows={2}
              className="field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-category" className="text-xs font-semibold text-text-2">
                Category
              </label>
              <select
                id="edit-category"
                value={draft.categoryId}
                onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value }))}
                className="field"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-priority" className="text-xs font-semibold text-text-2">
                Priority
              </label>
              <select
                id="edit-priority"
                value={draft.priority}
                onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value as TaskPriority }))}
                className="field"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-scheduled" className="text-xs font-semibold text-text-2">
                Scheduled date
              </label>
              <input
                id="edit-scheduled"
                type="date"
                value={draft.scheduledDate}
                onChange={(e) => setDraft((d) => ({ ...d, scheduledDate: e.target.value }))}
                className="field"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-due" className="text-xs font-semibold text-text-2">
                Due date
              </label>
              <input
                id="edit-due"
                type="date"
                value={draft.dueDate}
                onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                className="field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-project" className="text-xs font-semibold text-text-2">
                Project
              </label>
              <select
                id="edit-project"
                value={draft.projectId}
                onChange={(e) => setDraft((d) => ({ ...d, projectId: e.target.value }))}
                className="field"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-minutes" className="text-xs font-semibold text-text-2">
                Duration (min)
              </label>
              <input
                id="edit-minutes"
                type="number"
                min={0}
                step={5}
                value={draft.estimatedMinutes}
                onChange={(e) => setDraft((d) => ({ ...d, estimatedMinutes: e.target.value }))}
                className="field"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="text-xs font-semibold text-text-3 hover:text-red"
          >
            Delete task
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!draft.title.trim()} className="btn-primary">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
