"use client";

import type { HTMLAttributes } from "react";
import type { Category, Task } from "@todos/shared";
import { CategoryBadge } from "@/components/category-badge";
import { isOverdue, PRIORITY_DOT } from "@/lib/priority";
import { CheckIcon, DragHandleIcon, EditIcon, RecurringIcon, XIcon } from "@/components/icons";

interface PlannerTaskCardProps {
  task: Task;
  category: Category | null | undefined;
  onToggleComplete: () => void;
  onDelete: () => void;
  onEdit?: () => void;
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
  onEdit,
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
      className={`flex flex-col gap-1.5 rounded-[10px] border border-border-soft bg-surface p-2.5 text-sm shadow-xs transition ${
        completed ? "opacity-50" : ""
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start gap-2">
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            aria-label="Drag to reorder or move"
            className="mt-0.5 shrink-0 cursor-grab touch-none text-text-3/60 transition hover:text-text-3 active:cursor-grabbing"
          >
            <DragHandleIcon />
          </button>
        )}
        <button
          onClick={onToggleComplete}
          aria-label={completed ? "Mark incomplete" : "Mark complete"}
          className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[6px] border transition ${
            completed ? "border-accent bg-accent text-accent-ink" : "border-border hover:border-text-3"
          }`}
        >
          {completed && <CheckIcon size={12} strokeWidth={3} />}
        </button>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
            <span className={`font-medium ${completed ? "line-through" : ""}`}>{task.title}</span>
            {task.recurringTaskId && (
              <span aria-label="Recurring task" title="Recurring task" className="text-text-3/70">
                <RecurringIcon size={11} strokeWidth={2.2} />
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={category} compact />
            {task.dueDate && (
              <span className={`text-[11px] ${overdue ? "font-semibold text-red" : "text-text-3"}`}>
                {overdue ? "Overdue" : `Due ${task.dueDate}`}
              </span>
            )}
            {task.estimatedMinutes != null && <span className="text-[11px] text-text-3">~{task.estimatedMinutes}m</span>}
          </div>
        </div>
        <div className="-mr-2 flex shrink-0 items-center gap-4">
          {onEdit && (
            <button
              onClick={onEdit}
              aria-label="Edit task"
              className="-m-2 p-2 text-text-3/60 transition hover:text-accent"
            >
              <EditIcon size={13} strokeWidth={2.2} />
            </button>
          )}
          <button
            onClick={onDelete}
            aria-label="Delete task"
            className="-m-2 p-2 text-text-3/60 transition hover:text-red"
          >
            <XIcon size={13} strokeWidth={2.2} />
          </button>
        </div>
      </div>
      {(primaryAction || (moveOptions && onMove)) && (
        <div className="flex items-center gap-2 pl-[27px]">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="rounded-[7px] bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink"
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
              className="rounded-md border border-border-soft bg-transparent px-1.5 py-1 text-xs text-text-3"
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
