"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { CreateTaskForm } from "@/components/create-task-form";
import { TaskItem } from "@/components/task-item";
import { SearchIcon } from "@/components/icons";
import { useCategories } from "@/hooks/use-categories";
import { useProjects } from "@/hooks/use-projects";
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from "@/hooks/use-tasks";
import type { TaskStatus } from "@todos/shared";

const STATUS_TABS: Array<{ label: string; value: TaskStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Backlog", value: "backlog" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

function TasksContent() {
  const [statusTab, setStatusTab] = useState<TaskStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const { data: tasks, isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && target === searchInputRef.current) {
        setSearch("");
        searchInputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (tasks ?? []).filter((task) => {
      if (statusTab !== "all" && task.status !== statusTab) return false;
      if (categoryFilter && task.categoryId !== categoryFilter) return false;
      if (projectFilter && task.projectId !== projectFilter) return false;
      if (query && !task.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [tasks, statusTab, categoryFilter, projectFilter, search]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-9 sm:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-[13.5px] text-text-2">Search and manage every task you&apos;ve ever created.</p>
      </div>

      <CreateTaskForm
        categories={categories ?? []}
        onCreate={async (input) => {
          await createTask.mutateAsync(input);
        }}
      />

      <div className="flex flex-col gap-3">
        <div className="relative">
          <SearchIcon size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-3" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="field w-full pl-9"
          />
          {!search && (
            <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-text-3">
              /
            </kbd>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusTab(tab.value)}
                className={`rounded-[9px] px-3 py-1.5 text-[13px] font-semibold transition ${
                  statusTab === tab.value ? "bg-accent-tint text-accent" : "text-text-2 hover:bg-surface-2"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="field py-1.5">
              <option value="">All categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="field py-1.5">
              <option value="">All projects</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card flex flex-col divide-y divide-border-soft">
        {isLoading && <p className="p-4 text-sm text-text-3">Loading…</p>}
        {!isLoading && filteredTasks.length === 0 && (
          <p className="p-4 text-sm text-text-3">
            {search || categoryFilter || projectFilter || statusTab !== "all"
              ? "Nothing matches those filters."
              : "Nothing here yet."}
          </p>
        )}
        {filteredTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            categories={categories ?? []}
            projects={projects ?? []}
            onUpdate={(input) => updateTask.mutate({ id: task.id, input })}
            onDelete={() => deleteTask.mutate(task.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <RequireAuth>
      <TasksContent />
    </RequireAuth>
  );
}
