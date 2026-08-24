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
import type { Category, Project, Task, TaskStatus, TaskTemplate } from "@todos/shared";
import { addDays, getWeekStart } from "@todos/shared";
import { RequireAuth } from "@/components/require-auth";
import { PlannerColumn } from "@/components/planner-column";
import { SortableTaskCard } from "@/components/sortable-task-card";
import { PlannerTaskCard } from "@/components/planner-task-card";
import { CreateTaskForm } from "@/components/create-task-form";
import { TaskEditModal } from "@/components/task-edit-modal";
import { TemplateQuickAdd } from "@/components/template-quick-add";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { useCategories } from "@/hooks/use-categories";
import { useProjects } from "@/hooks/use-projects";
import { useReorderTasks, useWeek } from "@/hooks/use-week";
import { useCreateTask, useDeleteTask, useUpdateTask } from "@/hooks/use-tasks";
import type { UpdateTaskInput, WeekResponse } from "@/lib/api";
import { formatDayLabel, formatWeekRange, todayISO } from "@/lib/dates";
import { useSettings } from "@/lib/settings-context";

function columnFields(columnId: string): Partial<Task> & { status?: TaskStatus } {
  if (columnId === "backlog") {
    // The backlog is global, not week-scoped — dropping a task back here just clears its
    // schedule; it'll keep showing up in the backlog every week until it's scheduled again.
    return { status: "backlog", scheduledDate: null };
  }
  return { status: "scheduled", scheduledDate: columnId };
}

interface WeekBoardProps {
  data: WeekResponse;
  categories: Category[];
  projects: Project[];
}

function WeekBoard({ data, categories, projects }: WeekBoardProps) {
  const today = todayISO();
  const reorderTasks = useReorderTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [columns, setColumns] = useState<Record<string, Task[]>>(() => ({ backlog: data.backlog, ...data.days }));
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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

      const fields = columnFields(destColumn);
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

  function patchTaskInPlace(taskId: string, patch: Partial<Task>) {
    setColumns((prev) => {
      const column = findColumnOfTask(taskId);
      if (!column) return prev;
      return {
        ...prev,
        [column]: prev[column].map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      };
    });
  }

  function removeTaskFromBoard(taskId: string) {
    setColumns((prev) => {
      const column = findColumnOfTask(taskId);
      if (!column) return prev;
      return { ...prev, [column]: prev[column].filter((t) => t.id !== taskId) };
    });
  }

  function handleToggleComplete(task: Task) {
    const nextStatus = task.status === "completed" ? (task.scheduledDate ? "scheduled" : "backlog") : "completed";
    updateTask.mutate({ id: task.id, input: { status: nextStatus } });
    patchTaskInPlace(task.id, { status: nextStatus, completedAt: nextStatus === "completed" ? new Date().toISOString() : null });
  }

  function handleDelete(taskId: string) {
    deleteTask.mutate(taskId);
    removeTaskFromBoard(taskId);
  }

  function handleEditSave(task: Task, input: UpdateTaskInput) {
    updateTask.mutate({ id: task.id, input });

    if (input.scheduledDate !== undefined && input.scheduledDate !== task.scheduledDate) {
      if (input.scheduledDate && dates.includes(input.scheduledDate)) {
        moveTaskToColumn(task.id, input.scheduledDate);
      } else if (task.status === "backlog") {
        // Still unscheduled and staying in the backlog column — patch fields in place below.
      } else {
        removeTaskFromBoard(task.id);
        return;
      }
    }
    patchTaskInPlace(task.id, input as Partial<Task>);
  }

  const categoryById = (id: string | null) => categories.find((c) => c.id === id) ?? null;

  async function applyTemplate(template: TaskTemplate, destColumn: string) {
    const { task } = await createTask.mutateAsync({
      title: template.title,
      categoryId: template.categoryId,
      projectId: template.projectId,
      priority: template.priority,
      estimatedMinutes: template.estimatedMinutes,
      ...columnFields(destColumn),
    });
    setColumns((prev) => ({ ...prev, [destColumn]: [...(prev[destColumn] ?? []), task] }));
  }

  return (
    <>
      <CreateTaskForm
        categories={categories}
        onCreate={async (input) => {
          const { task } = await createTask.mutateAsync(input);
          const destColumn = task.scheduledDate && dates.includes(task.scheduledDate) ? task.scheduledDate : "backlog";
          setColumns((prev) => ({ ...prev, [destColumn]: [...(prev[destColumn] ?? []), task] }));
        }}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 [&>*]:snap-start">
          <PlannerColumn
            id="backlog"
            title="Backlog"
            subtitle={`${columns.backlog?.length ?? 0}`}
            tasks={columns.backlog ?? []}
            highlight
            headerAction={<TemplateQuickAdd onApply={(t) => applyTemplate(t, "backlog")} />}
          >
            {(columns.backlog ?? []).map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                category={categoryById(task.categoryId)}
                onToggleComplete={() => handleToggleComplete(task)}
                onDelete={() => handleDelete(task.id)}
                onEdit={() => setEditingTask(task)}
                moveOptions={dates.map((d) => ({ value: d, label: formatDayLabel(d) }))}
                onMove={(dest) => moveTaskToColumn(task.id, dest)}
              />
            ))}
          </PlannerColumn>

          {dates.map((date) => (
            <PlannerColumn
              key={date}
              id={date}
              title={formatDayLabel(date)}
              subtitle={`${columns[date]?.length ?? 0}`}
              tasks={columns[date] ?? []}
              isToday={date === today}
              headerAction={<TemplateQuickAdd onApply={(t) => applyTemplate(t, date)} />}
            >
              {(columns[date] ?? []).map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  category={categoryById(task.categoryId)}
                  onToggleComplete={() => handleToggleComplete(task)}
                  onDelete={() => handleDelete(task.id)}
                  onEdit={() => setEditingTask(task)}
                  moveOptions={[
                    { value: "backlog", label: "Backlog" },
                    ...dates.filter((d) => d !== date).map((d) => ({ value: d, label: formatDayLabel(d) })),
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

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          categories={categories}
          projects={projects}
          onSave={(input) => handleEditSave(editingTask, input)}
          onDelete={() => handleDelete(editingTask.id)}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  );
}

function WeekContent() {
  const { weekStartsOn } = useSettings();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(todayISO(), weekStartsOn));
  const { data, isLoading } = useWeek(weekStart);
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-7 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-bold tracking-tight">Week</h1>
          {data && <p className="text-[13px] text-text-2">{formatWeekRange(data.weekStart, data.weekEnd)}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="card flex items-center gap-0.5 p-1">
            <button
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              aria-label="Previous week"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-text-2 transition hover:bg-surface-2"
            >
              <ChevronLeftIcon size={15} />
            </button>
            <button
              onClick={() => setWeekStart(getWeekStart(todayISO(), weekStartsOn))}
              className="rounded-lg bg-surface-2 px-3.5 py-1.5 text-[12.5px] font-semibold"
            >
              This week
            </button>
            <button
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              aria-label="Next week"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-text-2 transition hover:bg-surface-2"
            >
              <ChevronRightIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      {isLoading && <p className="text-sm text-text-3">Loading…</p>}
      {data && <WeekBoard key={data.weekStart} data={data} categories={categories ?? []} projects={projects ?? []} />}
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
