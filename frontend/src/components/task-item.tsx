"use client";

import { useState } from "react";
import Link from "next/link";
import type { Category, Project, Task, TaskPriority } from "@todos/shared";
import { CategoryBadge } from "@/components/category-badge";
import { PRIORITY_LABELS, PRIORITY_STYLES, isOverdue } from "@/lib/priority";
import { CheckIcon, RecurringIcon } from "@/components/icons";
import type { UpdateTaskInput } from "@/lib/api";

interface TaskItemProps {
  task: Task;
  categories: Category[];
  projects: Project[];
  onUpdate: (input: UpdateTaskInput) => void;
  onDelete: () => void;
}

export function TaskItem({ task, categories, projects, onUpdate, onDelete }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
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

  const category = categories.find((c) => c.id === task.categoryId) ?? null;
  const project = projects.find((p) => p.id === task.projectId) ?? null;
  const completed = task.status === "completed";
  const overdue = isOverdue(task.dueDate, task.status);

  function saveEdit() {
    onUpdate({
      title: draft.title.trim() || task.title,
      description: draft.description.trim() || null,
      categoryId: draft.categoryId || null,
      projectId: draft.projectId || null,
      priority: draft.priority,
      dueDate: draft.dueDate || null,
      scheduledDate: draft.scheduledDate || null,
      estimatedMinutes: draft.estimatedMinutes === "" ? null : Number(draft.estimatedMinutes),
    });
    setIsEditing(false);
  }

  return (
    <div className={`flex flex-col gap-2 p-3.5 ${completed ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onUpdate({ status: completed ? "backlog" : "completed" })}
          aria-label={completed ? "Mark incomplete" : "Mark complete"}
          className={`mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[6px] border transition ${
            completed ? "border-accent bg-accent text-accent-ink" : "border-border hover:border-text-3"
          }`}
        >
          {completed && <CheckIcon size={12} strokeWidth={3} />}
        </button>

        {isEditing ? (
          <div className="flex flex-1 flex-col gap-2">
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="field"
            />
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Notes"
              rows={2}
              className="field"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
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
              <select
                value={draft.priority}
                onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value as TaskPriority }))}
                className="field"
              >
                <option value="low">Low priority</option>
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
              </select>
              <input
                type="date"
                value={draft.dueDate}
                onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                title="Due date"
                className="field"
              />
              <input
                type="date"
                value={draft.scheduledDate}
                onChange={(e) => setDraft((d) => ({ ...d, scheduledDate: e.target.value }))}
                title="Scheduled date"
                className="field"
              />
              <select
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
              <input
                type="number"
                min={0}
                step={5}
                value={draft.estimatedMinutes}
                onChange={(e) => setDraft((d) => ({ ...d, estimatedMinutes: e.target.value }))}
                placeholder="Minutes"
                title="Estimated duration in minutes"
                className="field w-24"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={saveEdit} className="btn-primary px-3 py-1 text-xs">
                Save
              </button>
              <button onClick={() => setIsEditing(false)} className="btn-secondary px-3 py-1 text-xs">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-sm font-medium ${completed ? "line-through" : ""}`}>{task.title}</span>
              {task.recurringTaskId && (
                <span aria-label="Recurring task" title="Recurring task" className="text-text-3/70">
                  <RecurringIcon size={12} strokeWidth={2.2} />
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_STYLES[task.priority]}`}>
                {PRIORITY_LABELS[task.priority]}
              </span>
              {task.dueDate && (
                <span className={`text-xs ${overdue ? "font-semibold text-red" : "text-text-3"}`}>
                  {overdue ? "Overdue " : "Due "}
                  {task.dueDate}
                </span>
              )}
              {task.scheduledDate && <span className="text-xs text-text-3">Scheduled {task.scheduledDate}</span>}
              {task.estimatedMinutes != null && <span className="text-xs text-text-3">~{task.estimatedMinutes}m</span>}
            </div>
            {task.description && <p className="text-xs text-text-2">{task.description}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={category} />
              {project && (
                <Link href={`/projects/${project.id}`} className="text-xs text-text-3 underline hover:text-text">
                  {project.name}
                </Link>
              )}
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="flex shrink-0 items-center gap-3">
            <button onClick={() => setIsEditing(true)} className="text-xs font-semibold text-text-3 hover:text-text">
              Edit
            </button>
            <button onClick={onDelete} className="text-xs font-semibold text-text-3 hover:text-red">
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
