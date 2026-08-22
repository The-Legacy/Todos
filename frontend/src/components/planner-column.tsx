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
  isToday?: boolean;
  children: React.ReactNode;
}

export function PlannerColumn({ id, title, subtitle, tasks, highlight, isToday, children }: PlannerColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col gap-2.5 rounded-2xl border p-3 transition ${
        isOver
          ? "border-accent bg-accent-tint"
          : isToday
            ? "border-accent bg-surface shadow-[0_0_0_3px_var(--accent-tint)]"
            : highlight
              ? "border-accent-tint-2 bg-accent-tint"
              : "border-border-soft bg-surface"
      }`}
    >
      <div className="flex items-baseline justify-between px-0.5">
        <span className={`text-[12.5px] font-bold ${isToday ? "text-accent" : highlight ? "text-accent" : ""}`}>
          {title}
        </span>
        {subtitle && (
          <span
            className={`rounded-full px-1.5 text-[11px] font-bold ${
              isToday ? "bg-accent text-accent-ink" : "text-text-3"
            }`}
          >
            {subtitle}
          </span>
        )}
      </div>
      <SortableContext id={id} items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-12 flex-col gap-1.5">
          {children}
          {tasks.length === 0 && (
            <div className="rounded-[10px] border border-dashed border-border p-3 text-center text-[11px] text-text-3">
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
