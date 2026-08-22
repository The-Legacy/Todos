"use client";

import { useState, type FormEvent } from "react";
import type { TaskPriority } from "@todos/shared";
import { describeDaysOfWeekMask, daysOfWeekToMask } from "@todos/shared";
import { RequireAuth } from "@/components/require-auth";
import { DayOfWeekPicker } from "@/components/day-of-week-picker";
import { CategoryBadge } from "@/components/category-badge";
import { PlusIcon } from "@/components/icons";
import { useCategories } from "@/hooks/use-categories";
import {
  useCreateRecurringTask,
  useDeleteRecurringTask,
  useRecurringTasks,
  useUpdateRecurringTask,
} from "@/hooks/use-recurring-tasks";
import { ApiError } from "@/lib/api";
import { todayISO } from "@/lib/dates";

function CreateRecurringForm() {
  const createRecurringTask = useCreateRecurringTask();
  const { data: categories } = useCategories();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
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
        priority,
        daysOfWeek: days,
        startDate: todayISO(),
      });
      setTitle("");
      setDays([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create recurring task");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3.5 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Gym, Take out trash, Weekly planning…"
          className="field flex-1"
        />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field">
          <option value="">No category</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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

function RecurringTasksContent() {
  const { data: recurringTasks, isLoading } = useRecurringTasks();
  const { data: categories } = useCategories();
  const updateRecurringTask = useUpdateRecurringTask();
  const deleteRecurringTask = useDeleteRecurringTask();

  const categoryById = (id: string | null) => categories?.find((c) => c.id === id) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-9 sm:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Recurring tasks</h1>
        <p className="text-[13.5px] text-text-2">
          These generate a real task automatically on each matching day — pause or delete a rule
          any time without losing what&apos;s already been generated.
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
        {recurringTasks?.map((rule) => (
          <div key={rule.id} className={`flex items-center justify-between gap-3 p-3.5 ${rule.active ? "" : "opacity-50"}`}>
            <div className="flex flex-col gap-1">
              <span className="text-[13.5px] font-medium">{rule.title}</span>
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-3">
                <span>{describeDaysOfWeekMask(daysOfWeekToMask(rule.daysOfWeek))}</span>
                <CategoryBadge category={categoryById(rule.categoryId)} />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
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
        ))}
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
