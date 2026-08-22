"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task } from "@todos/shared";

interface PlannerColumnProps {
  id: string;
  title: string;
  subtitle?: string;
  tasks: Task[];
  highlight?: boolean;
  children: React.ReactNode;
}

export function PlannerColumn({ id, title, subtitle, tasks, highlight, children }: PlannerColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col gap-2 rounded-lg border p-2.5 transition ${
        isOver
          ? "border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-900"
          : highlight
            ? "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40"
            : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      }`}
    >
      <div className="flex items-baseline justify-between px-1">
        <span className="text-sm font-semibold">{title}</span>
        {subtitle && <span className="text-xs text-zinc-400">{subtitle}</span>}
      </div>
      <SortableContext id={id} items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-[3rem] flex-col gap-1.5">
          {children}
          {tasks.length === 0 && (
            <div className="rounded-md border border-dashed border-zinc-200 p-3 text-center text-xs text-zinc-300 dark:border-zinc-800 dark:text-zinc-700">
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
