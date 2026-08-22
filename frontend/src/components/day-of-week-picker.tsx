"use client";

import { WEEKDAY_SHORT_LABELS } from "@todos/shared";

interface DayOfWeekPickerProps {
  value: number[];
  onChange: (days: number[]) => void;
}

export function DayOfWeekPicker({ value, onChange }: DayOfWeekPickerProps) {
  function toggle(day: number) {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort());
  }

  return (
    <div className="flex gap-1">
      {WEEKDAY_SHORT_LABELS.map((label, day) => {
        const active = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => toggle(day)}
            aria-pressed={active}
            className={`h-8 w-8 rounded-full text-xs font-medium transition ${
              active
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "border border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            }`}
          >
            {label[0]}
          </button>
        );
      })}
    </div>
  );
}
