"use client";

import { useEffect, useRef, useState } from "react";
import type { TaskTemplate } from "@todos/shared";
import { useTaskTemplates } from "@/hooks/use-task-templates";
import { PlusIcon } from "@/components/icons";

interface TemplateQuickAddProps {
  onApply: (template: TaskTemplate) => void;
}

export function TemplateQuickAdd({ onApply }: TemplateQuickAddProps) {
  const { data: templates } = useTaskTemplates();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!templates || templates.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Add a common task"
        aria-expanded={open}
        className="-m-1.5 flex h-6 w-6 items-center justify-center rounded-[6px] p-1.5 text-text-3 transition hover:bg-surface-2 hover:text-accent"
      >
        <PlusIcon size={12} strokeWidth={2.4} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 max-h-64 overflow-y-auto rounded-[10px] border border-border-soft bg-surface p-1 shadow-lg">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onApply(t);
                setOpen(false);
              }}
              className="block w-full truncate rounded-[7px] px-2.5 py-1.5 text-left text-[12px] font-medium hover:bg-surface-2"
            >
              {t.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
