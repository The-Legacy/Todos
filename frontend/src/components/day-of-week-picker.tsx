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
            className={`h-8 w-8 rounded-full text-xs font-semibold transition ${
              active ? "bg-accent text-accent-ink" : "border border-border text-text-2 hover:bg-surface-2"
            }`}
          >
            {label[0]}
          </button>
        );
      })}
    </div>
  );
}
