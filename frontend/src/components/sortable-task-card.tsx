"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Category, Task } from "@todos/shared";
import { PlannerTaskCard } from "@/components/planner-task-card";

interface SortableTaskCardProps {
  task: Task;
  category: Category | null | undefined;
  onToggleComplete: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  moveOptions?: Array<{ label: string; value: string }>;
  onMove?: (value: string) => void;
}

export function SortableTaskCard(props: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <PlannerTaskCard {...props} dragHandleProps={{ ...attributes, ...listeners }} isDragging={isDragging} />
    </div>
  );
}
