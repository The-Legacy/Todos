"use client";

import type { HTMLAttributes } from "react";
import type { Category, Task } from "@todos/shared";
import { CategoryBadge } from "@/components/category-badge";
import { isOverdue } from "@/lib/priority";

const PRIORITY_DOT: Record<Task["priority"], string> = {
  low: "bg-zinc-300 dark:bg-zinc-600",
  medium: "bg-amber-400",
  high: "bg-red-500",
};

interface PlannerTaskCardProps {
  task: Task;
  category: Category | null | undefined;
  onToggleComplete: () => void;
  onDelete: () => void;
  moveOptions?: Array<{ label: string; value: string }>;
  onMove?: (value: string) => void;
  primaryAction?: { label: string; onClick: () => void };
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
}

export function PlannerTaskCard({
  task,
  category,
  onToggleComplete,
  onDelete,
  moveOptions,
  onMove,
  primaryAction,
  dragHandleProps,
  isDragging,
}: PlannerTaskCardProps) {
  const completed = task.status === "completed";
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-md border border-zinc-200 bg-white p-2.5 text-sm shadow-sm transition dark:border-zinc-800 dark:bg-zinc-900 ${
        completed ? "opacity-50" : ""
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start gap-2">
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            aria-label="Drag to reorder or move"
            className="mt-0.5 shrink-0 cursor-grab touch-none text-zinc-300 hover:text-zinc-500 active:cursor-grabbing dark:text-zinc-700"
          >
            ⠿
          </button>
        )}
        <input
          type="checkbox"
          checked={completed}
          onChange={onToggleComplete}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-zinc-900 dark:accent-white"
        />
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
            <span className={`font-medium ${completed ? "line-through" : ""}`}>{task.title}</span>
            {task.recurringTaskId && (
              <span aria-label="Recurring task" title="Recurring task" className="text-zinc-300 dark:text-zinc-600">
                ↻
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={category} />
            {task.dueDate && (
              <span className={`text-[11px] ${overdue ? "font-medium text-red-600 dark:text-red-400" : "text-zinc-400"}`}>
                {overdue ? "Overdue" : `Due ${task.dueDate}`}
              </span>
            )}
            {task.estimatedMinutes != null && <span className="text-[11px] text-zinc-400">~{task.estimatedMinutes}m</span>}
          </div>
        </div>
        <button
          onClick={onDelete}
          aria-label="Delete task"
          className="shrink-0 text-xs text-zinc-300 hover:text-red-600 dark:text-zinc-700 dark:hover:text-red-400"
        >
          ✕
        </button>
      </div>
      {(primaryAction || (moveOptions && onMove)) && (
        <div className="flex items-center gap-2">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
            >
              {primaryAction.label}
            </button>
          )}
          {moveOptions && onMove && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) onMove(e.target.value);
              }}
              className="rounded border border-zinc-200 bg-transparent px-1.5 py-1 text-xs text-zinc-500 dark:border-zinc-800"
            >
              <option value="">Move to…</option>
              {moveOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
