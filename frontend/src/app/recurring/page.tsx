"use client";

import { useState, type FormEvent } from "react";
import type { TaskPriority } from "@todos/shared";
import { describeDaysOfWeekMask, daysOfWeekToMask } from "@todos/shared";
import { RequireAuth } from "@/components/require-auth";
import { DayOfWeekPicker } from "@/components/day-of-week-picker";
import { CategoryBadge } from "@/components/category-badge";
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Gym, Take out trash, Weekly planning…"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">No category</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <DayOfWeekPicker value={days} onChange={setDays} />
        <button
          type="submit"
          disabled={createRecurringTask.isPending || !title.trim() || days.length === 0}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          Add
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">Recurring tasks</h1>
        <p className="text-sm text-zinc-500">
          These generate a real task automatically on each matching day — pause or delete a rule
          any time without losing what&apos;s already been generated.
        </p>
      </div>

      <CreateRecurringForm />

      {isLoading && <p className="text-sm text-zinc-400">Loading…</p>}
      {!isLoading && recurringTasks?.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400 dark:border-zinc-700">
          No recurring tasks yet — add one above, e.g. &quot;Gym&quot; on Mon/Wed/Fri.
        </p>
      )}

      <div className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {recurringTasks?.map((rule) => (
          <div key={rule.id} className={`flex items-center justify-between gap-3 p-3 ${rule.active ? "" : "opacity-50"}`}>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{rule.title}</span>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span>{describeDaysOfWeekMask(daysOfWeekToMask(rule.daysOfWeek))}</span>
                <CategoryBadge category={categoryById(rule.categoryId)} />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={() => updateRecurringTask.mutate({ id: rule.id, input: { active: !rule.active } })}
                className="text-xs font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                {rule.active ? "Pause" : "Resume"}
              </button>
              <button
                onClick={() => deleteRecurringTask.mutate(rule.id)}
                className="text-xs font-medium text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
              >
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
