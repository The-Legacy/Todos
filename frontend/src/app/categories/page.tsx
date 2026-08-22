"use client";

import { useState, type FormEvent } from "react";
import { RequireAuth } from "@/components/require-auth";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/hooks/use-categories";
import { ApiError } from "@/lib/api";

const SWATCHES = [
  "#6366f1",
  "#0ea5e9",
  "#f97316",
  "#a855f7",
  "#22c55e",
  "#eab308",
  "#ec4899",
  "#64748b",
];

function CategoriesContent() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await createCategory.mutateAsync({ name: trimmed, color });
      setName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create category");
    }
  }

  function startEditing(id: string, currentName: string) {
    setEditingId(id);
    setEditingName(currentName);
  }

  async function commitEdit(id: string) {
    const trimmed = editingName.trim();
    setEditingId(null);
    if (!trimmed) return;
    await updateCategory.mutateAsync({ id, input: { name: trimmed } });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">Categories</h1>
        <p className="text-sm text-zinc-500">
          Organize tasks by category. Deleting a category keeps its tasks — they just lose the tag.
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New category name"
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={createCategory.isPending || !name.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          >
            Add
          </button>
        </div>
        <div className="flex items-center gap-2">
          {SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => setColor(swatch)}
              aria-label={`Use color ${swatch}`}
              className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-white transition dark:ring-offset-zinc-950 ${
                color === swatch ? "ring-2 ring-zinc-900 dark:ring-white" : ""
              }`}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>

      <div className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {isLoading && <p className="p-4 text-sm text-zinc-400">Loading…</p>}
        {!isLoading && categories?.length === 0 && (
          <p className="p-4 text-sm text-zinc-400">No categories yet — add one above.</p>
        )}
        {categories?.map((category) => (
          <div key={category.id} className="flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
              {editingId === category.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => commitEdit(category.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(category.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900"
                />
              ) : (
                <button
                  onClick={() => startEditing(category.id, category.name)}
                  className="text-sm font-medium hover:underline"
                >
                  {category.name}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => updateCategory.mutate({ id: category.id, input: { color: swatch } })}
                    aria-label={`Set ${category.name} to ${swatch}`}
                    className={`h-4 w-4 rounded-full transition ${
                      category.color === swatch ? "ring-2 ring-zinc-900 dark:ring-white" : ""
                    }`}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
              <button
                onClick={() => deleteCategory.mutate(category.id)}
                className="text-sm text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
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

export default function CategoriesPage() {
  return (
    <RequireAuth>
      <CategoriesContent />
    </RequireAuth>
  );
}
