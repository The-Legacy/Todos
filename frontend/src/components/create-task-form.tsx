"use client";

import { useState, type FormEvent } from "react";
import type { Category, TaskPriority } from "@todos/shared";
import type { CreateTaskInput } from "@/lib/api";
import { useSettings } from "@/lib/settings-context";
import { PlusIcon } from "@/components/icons";

interface CreateTaskFormProps {
  categories: Category[];
  onCreate: (input: CreateTaskInput) => Promise<void>;
}

export function CreateTaskForm({ categories, onCreate }: CreateTaskFormProps) {
  const { defaultDurationMinutes } = useSettings();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      const minutes = estimatedMinutes === "" ? defaultDurationMinutes : Number(estimatedMinutes);
      await onCreate({
        title: trimmed,
        categoryId: categoryId || null,
        priority,
        dueDate: dueDate || null,
        estimatedMinutes: minutes,
      });
      setTitle("");
      setDueDate("");
      setEstimatedMinutes("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-2 p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        className="field min-w-40 flex-1"
      />
      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field">
        <option value="">No category</option>
        {categories.map((c) => (
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
      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field" />
      <input
        type="number"
        min={0}
        step={5}
        value={estimatedMinutes}
        onChange={(e) => setEstimatedMinutes(e.target.value)}
        placeholder={defaultDurationMinutes ? `${defaultDurationMinutes}m` : "Minutes"}
        title="Estimated duration in minutes"
        className="field w-24"
      />
      <button type="submit" disabled={isSubmitting || !title.trim()} className="btn-primary">
        <PlusIcon size={15} strokeWidth={2.4} />
        Add
      </button>
    </form>
  );
}
