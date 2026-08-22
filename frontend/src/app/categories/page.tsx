"use client";

import { useState, type FormEvent } from "react";
import { RequireAuth } from "@/components/require-auth";
import { PlusIcon } from "@/components/icons";
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-6 py-9 sm:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-[13.5px] text-text-2">
          Organize tasks by category. Deleting a category keeps its tasks — they just lose the tag.
        </p>
      </div>

      <form onSubmit={handleCreate} className="card flex flex-col gap-3.5 p-4">
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="field flex-1" />
          <button type="submit" disabled={createCategory.isPending || !name.trim()} className="btn-primary">
            <PlusIcon size={15} strokeWidth={2.4} />
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
              className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-surface transition ${
                color === swatch ? "ring-2 ring-text" : ""
              }`}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
        {error && <p className="text-sm text-red">{error}</p>}
      </form>

      <div className="card flex flex-col divide-y divide-border-soft">
        {isLoading && <p className="p-4 text-sm text-text-3">Loading…</p>}
        {!isLoading && categories?.length === 0 && <p className="p-4 text-sm text-text-3">No categories yet — add one above.</p>}
        {categories?.map((category) => (
          <div key={category.id} className="flex items-center justify-between gap-3 p-3.5">
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
                  className="field py-1"
                />
              ) : (
                <button onClick={() => startEditing(category.id, category.name)} className="text-[13.5px] font-medium hover:underline">
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
                    className={`h-4 w-4 rounded-full transition ${category.color === swatch ? "ring-2 ring-text" : ""}`}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
              <button onClick={() => deleteCategory.mutate(category.id)} className="text-sm font-medium text-text-3 hover:text-red">
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
