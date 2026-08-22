"use client";

import { useState } from "react";
import type { Category, Task, TaskPriority } from "@todos/shared";
import { CategoryBadge } from "@/components/category-badge";
import { PRIORITY_LABELS, PRIORITY_STYLES, isOverdue } from "@/lib/priority";
import type { UpdateTaskInput } from "@/lib/api";

interface TaskItemProps {
  task: Task;
  categories: Category[];
  onUpdate: (input: UpdateTaskInput) => void;
  onDelete: () => void;
}

export function TaskItem({ task, categories, onUpdate, onDelete }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: task.title,
    description: task.description ?? "",
    categoryId: task.categoryId ?? "",
    priority: task.priority,
    dueDate: task.dueDate ?? "",
  });

  const category = categories.find((c) => c.id === task.categoryId) ?? null;
  const completed = task.status === "completed";
  const overdue = isOverdue(task.dueDate, task.status);

  function saveEdit() {
    onUpdate({
      title: draft.title.trim() || task.title,
      description: draft.description.trim() || null,
      categoryId: draft.categoryId || null,
      priority: draft.priority,
      dueDate: draft.dueDate || null,
    });
    setIsEditing(false);
  }

  return (
    <div className={`flex flex-col gap-2 p-3 ${completed ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={completed}
          onChange={(e) => onUpdate({ status: e.target.checked ? "completed" : "backlog" })}
          className="mt-1 h-4 w-4 shrink-0 accent-zinc-900 dark:accent-white"
        />

        {isEditing ? (
          <div className="flex flex-1 flex-col gap-2">
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Notes"
              rows={2}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={draft.categoryId}
                onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value }))}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="low">Low priority</option>
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
              </select>
              <input
                type="date"
                value={draft.dueDate}
                onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium dark:border-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-sm font-medium ${completed ? "line-through" : ""}`}>{task.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_STYLES[task.priority]}`}>
                {PRIORITY_LABELS[task.priority]}
              </span>
              {task.dueDate && (
                <span className={`text-xs ${overdue ? "font-medium text-red-600 dark:text-red-400" : "text-zinc-400"}`}>
                  {overdue ? "Overdue " : "Due "}
                  {task.dueDate}
                </span>
              )}
            </div>
            {task.description && <p className="text-xs text-zinc-500">{task.description}</p>}
            <CategoryBadge category={category} />
          </div>
        )}

        {!isEditing && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="text-xs font-medium text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
