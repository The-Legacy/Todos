"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Category, Task, TaskStatus } from "@todos/shared";
import { addDays, getWeekStart } from "@todos/shared";
import { RequireAuth } from "@/components/require-auth";
import { PlannerColumn } from "@/components/planner-column";
import { SortableTaskCard } from "@/components/sortable-task-card";
import { PlannerTaskCard } from "@/components/planner-task-card";
import { CreateTaskForm } from "@/components/create-task-form";
import { useCategories } from "@/hooks/use-categories";
import { useReorderTasks, useWeek } from "@/hooks/use-week";
import { useCreateTask, useDeleteTask, useUpdateTask } from "@/hooks/use-tasks";
import type { WeekResponse } from "@/lib/api";
import { formatDayLabel, formatWeekRange, todayISO } from "@/lib/dates";
import { useSettings } from "@/lib/settings-context";

function columnFields(columnId: string, weekStart: string): Partial<Task> & { status?: TaskStatus } {
  if (columnId === "backlog") {
    return { status: "backlog", scheduledDate: null, weekStart };
  }
  return { status: "scheduled", scheduledDate: columnId, weekStart: null };
}

interface WeekBoardProps {
  data: WeekResponse;
  categories: Category[];
}

function WeekBoard({ data, categories }: WeekBoardProps) {
  const { weekStart } = data;
  const reorderTasks = useReorderTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [columns, setColumns] = useState<Record<string, Task[]>>(() => ({ backlog: data.backlog, ...data.days }));
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const dates = useMemo(() => Object.keys(data.days), [data]);
  const columnIds = useMemo(() => ["backlog", ...dates], [dates]);

  function findColumnOfTask(taskId: string): string | undefined {
    return columnIds.find((id) => columns[id]?.some((t) => t.id === taskId));
  }

  function handleDragStart(event: DragStartEvent) {
    const task = columnIds.flatMap((id) => columns[id] ?? []).find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function moveTaskToColumn(activeId: string, destColumn: string, overTaskId?: string) {
    const sourceColumn = findColumnOfTask(activeId);
    if (!sourceColumn) return;

    setColumns((prev) => {
      const sourceTasks = [...(prev[sourceColumn] ?? [])];
      const sourceIndex = sourceTasks.findIndex((t) => t.id === activeId);
      if (sourceIndex === -1) return prev;
      const [moved] = sourceTasks.splice(sourceIndex, 1);

      const destTasks = sourceColumn === destColumn ? sourceTasks : [...(prev[destColumn] ?? [])];
      let destIndex = destTasks.length;
      if (overTaskId) {
        const overIndex = destTasks.findIndex((t) => t.id === overTaskId);
        if (overIndex >= 0) destIndex = overIndex;
      }
      destTasks.splice(destIndex, 0, moved);

      const fields = columnFields(destColumn, weekStart);
      reorderTasks.mutate(
        destTasks.map((t, i) => ({
          id: t.id,
          position: i,
          ...(t.id === activeId ? fields : {}),
        })),
      );

      return { ...prev, [sourceColumn]: sourceTasks, [destColumn]: destTasks };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const isOverColumn = columnIds.includes(overId);
    const destColumn = isOverColumn ? overId : (findColumnOfTask(overId) ?? findColumnOfTask(activeId));
    if (!destColumn) return;

    moveTaskToColumn(activeId, destColumn, isOverColumn ? undefined : overId);
  }

  const categoryById = (id: string | null) => categories.find((c) => c.id === id) ?? null;

  return (
    <>
      <CreateTaskForm
        categories={categories}
        onCreate={async (input) => {
          await createTask.mutateAsync({ ...input, weekStart });
        }}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          <PlannerColumn id="backlog" title="Backlog" subtitle={`${columns.backlog?.length ?? 0}`} tasks={columns.backlog ?? []} highlight>
            {(columns.backlog ?? []).map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                category={categoryById(task.categoryId)}
                onToggleComplete={() =>
                  updateTask.mutate({ id: task.id, input: { status: task.status === "completed" ? "backlog" : "completed" } })
                }
                onDelete={() => deleteTask.mutate(task.id)}
                moveOptions={dates.map((d, i) => ({ value: d, label: formatDayLabel(d, i) }))}
                onMove={(dest) => moveTaskToColumn(task.id, dest)}
              />
            ))}
          </PlannerColumn>

          {dates.map((date, index) => (
            <PlannerColumn key={date} id={date} title={formatDayLabel(date, index)} subtitle={`${columns[date]?.length ?? 0}`} tasks={columns[date] ?? []}>
              {(columns[date] ?? []).map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  category={categoryById(task.categoryId)}
                  onToggleComplete={() =>
                    updateTask.mutate({ id: task.id, input: { status: task.status === "completed" ? "scheduled" : "completed" } })
                  }
                  onDelete={() => deleteTask.mutate(task.id)}
                  moveOptions={[
                    { value: "backlog", label: "Backlog" },
                    ...dates.filter((d) => d !== date).map((d) => ({ value: d, label: formatDayLabel(d, dates.indexOf(d)) })),
                  ]}
                  onMove={(dest) => moveTaskToColumn(task.id, dest)}
                />
              ))}
            </PlannerColumn>
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <PlannerTaskCard task={activeTask} category={categoryById(activeTask.categoryId)} onToggleComplete={() => {}} onDelete={() => {}} />
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}

function WeekContent() {
  const { weekStartsOn } = useSettings();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(todayISO(), weekStartsOn));
  const { data, isLoading } = useWeek(weekStart);
  const { data: categories } = useCategories();

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Week</h1>
          {data && <p className="text-sm text-zinc-500">{formatWeekRange(data.weekStart, data.weekEnd)}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ← Prev
          </button>
          <button
            onClick={() => setWeekStart(getWeekStart(todayISO(), weekStartsOn))}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            This week
          </button>
          <button
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Next →
          </button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-zinc-400">Loading…</p>}
      {data && <WeekBoard key={data.weekStart} data={data} categories={categories ?? []} />}
    </div>
  );
}

export default function WeekPage() {
  return (
    <RequireAuth>
      <WeekContent />
    </RequireAuth>
  );
}
