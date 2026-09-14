"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { Category, Project, RecurringTask, TaskPriority } from "@todos/shared";
import { describeDaysOfWeekMask, daysOfWeekToMask } from "@todos/shared";
import { RequireAuth } from "@/components/require-auth";
import { DayOfWeekPicker } from "@/components/day-of-week-picker";
import { CategoryBadge } from "@/components/category-badge";
import { EditIcon, PlusIcon } from "@/components/icons";
import { useCategories } from "@/hooks/use-categories";
import { useProjects } from "@/hooks/use-projects";
import {
  useCreateRecurringTask,
  useDeleteRecurringTask,
  useRecurringTasks,
  useUpdateRecurringTask,
} from "@/hooks/use-recurring-tasks";
import { ApiError } from "@/lib/api";
import { todayISO } from "@/lib/dates";
import { useSettings } from "@/lib/settings-context";

function ProjectSelect({
  projects,
  value,
  onChange,
}: {
  projects: Project[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="field">
      <option value="">No project</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

function CreateRecurringForm() {
  const createRecurringTask = useCreateRecurringTask();
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const { timezone } = useSettings();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [days, setDays] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = title.trim();
    if (!trimmed || days.length === 0) return;
    try {
      await createRecurringTask.mutateAsync({
        title: trimmed,
        categoryId: categoryId || null,
        projectId: projectId || null,
        priority,
        daysOfWeek: days,
        startDate: todayISO(timezone),
      });
      setTitle("");
      setDays([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create recurring task");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3.5 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Gym, Take out trash, Weekly planning…"
          className="field min-w-40 flex-1"
        />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field">
          <option value="">No category</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <ProjectSelect projects={projects ?? []} value={projectId} onChange={setProjectId} />
        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="field">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <DayOfWeekPicker value={days} onChange={setDays} />
        <button type="submit" disabled={createRecurringTask.isPending || !title.trim() || days.length === 0} className="btn-primary">
          <PlusIcon size={15} strokeWidth={2.4} />
          Add
        </button>
      </div>
      {error && <p className="text-sm text-red">{error}</p>}
    </form>
  );
}

function RuleEditForm({
  rule,
  categories,
  projects,
  onCancel,
}: {
  rule: RecurringTask;
  categories: Category[];
  projects: Project[];
  onCancel: () => void;
}) {
  const updateRecurringTask = useUpdateRecurringTask();
  const [title, setTitle] = useState(rule.title);
  const [categoryId, setCategoryId] = useState(rule.categoryId ?? "");
  const [projectId, setProjectId] = useState(rule.projectId ?? "");
  const [priority, setPriority] = useState<TaskPriority>(rule.priority);
  const [days, setDays] = useState<number[]>(rule.daysOfWeek);
  const [startDate, setStartDate] = useState(rule.startDate);
  const [endDate, setEndDate] = useState(rule.endDate ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const trimmed = title.trim();
    if (!trimmed || days.length === 0) return;
    try {
      await updateRecurringTask.mutateAsync({
        id: rule.id,
        input: {
          title: trimmed,
          categoryId: categoryId || null,
          projectId: projectId || null,
          priority,
          daysOfWeek: days,
          startDate,
          endDate: endDate || null,
        },
      });
      onCancel();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save changes");
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="field min-w-40 flex-1" />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field">
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <ProjectSelect projects={projects} value={projectId} onChange={setProjectId} />
        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="field">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <DayOfWeekPicker value={days} onChange={setDays} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <label htmlFor={`start-${rule.id}`} className="text-xs font-semibold text-text-2">
            Starts
          </label>
          <input
            id={`start-${rule.id}`}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="field"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label htmlFor={`end-${rule.id}`} className="text-xs font-semibold text-text-2">
            Ends
          </label>
          <input
            id={`end-${rule.id}`}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="field"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={updateRecurringTask.isPending || !title.trim() || days.length === 0}
          className="btn-primary"
        >
          Save
        </button>
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}

function RecurringTasksContent() {
  const { data: recurringTasks, isLoading } = useRecurringTasks();
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const updateRecurringTask = useUpdateRecurringTask();
  const deleteRecurringTask = useDeleteRecurringTask();
  const [editingId, setEditingId] = useState<string | null>(null);

  const categoryById = (id: string | null) => categories?.find((c) => c.id === id) ?? null;
  const projectById = (id: string | null) => projects?.find((p) => p.id === id) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-9 sm:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Recurring tasks</h1>
        <p className="text-[13.5px] text-text-2">
          These generate a real task automatically on each matching day — edit, pause, or delete a
          rule any time without losing what&apos;s already been generated.
        </p>
      </div>

      <CreateRecurringForm />

      {isLoading && <p className="text-sm text-text-3">Loading…</p>}
      {!isLoading && recurringTasks?.length === 0 && (
        <p className="card border-dashed p-6 text-center text-sm text-text-3">
          No recurring tasks yet — add one above, e.g. &quot;Gym&quot; on Mon/Wed/Fri.
        </p>
      )}

      <div className="card flex flex-col divide-y divide-border-soft">
        {recurringTasks?.map((rule) =>
          editingId === rule.id ? (
            <RuleEditForm
              key={rule.id}
              rule={rule}
              categories={categories ?? []}
              projects={projects ?? []}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={rule.id} className={`flex items-center justify-between gap-3 p-3.5 ${rule.active ? "" : "opacity-50"}`}>
              <div className="flex flex-col gap-1">
                <span className="text-[13.5px] font-medium">{rule.title}</span>
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-3">
                  <span>{describeDaysOfWeekMask(daysOfWeekToMask(rule.daysOfWeek))}</span>
                  <CategoryBadge category={categoryById(rule.categoryId)} />
                  {projectById(rule.projectId) && (
                    <Link href={`/projects/${rule.projectId}`} className="underline hover:text-text">
                      {projectById(rule.projectId)!.name}
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => setEditingId(rule.id)}
                  aria-label="Edit rule"
                  className="-m-2 p-2 text-text-3 transition hover:text-accent"
                >
                  <EditIcon size={14} />
                </button>
                <button
                  onClick={() => updateRecurringTask.mutate({ id: rule.id, input: { active: !rule.active } })}
                  className="text-xs font-semibold text-text-3 hover:text-text"
                >
                  {rule.active ? "Pause" : "Resume"}
                </button>
                <button onClick={() => deleteRecurringTask.mutate(rule.id)} className="text-xs font-semibold text-text-3 hover:text-red">
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export default function RecurringTasksPage() {
  return (
    <RequireAuth>
      <RecurringTasksContent />
    </RequireAuth>
  );
}
