"use client";

import { useState, type FormEvent } from "react";
import type { Workout, WorkoutType } from "@todos/shared";
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUPS } from "@todos/shared";
import { ApiError } from "@/lib/api";
import { todayISO } from "@/lib/dates";
import { useSettings } from "@/lib/settings-context";

const CARDIO_TYPES: WorkoutType[] = ["walk", "run", "bike"];

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  walk: "Walk",
  run: "Run",
  bike: "Bike",
  weights: "Weights",
  other: "Other",
};

export function summarizeWorkout(workout: Workout): string {
  const parts: string[] = [];
  if (workout.type === "weights" && workout.muscleGroup) {
    parts.push(MUSCLE_GROUP_LABELS[workout.muscleGroup]);
  }
  if (workout.durationMinutes != null) parts.push(`${workout.durationMinutes} min`);
  if (workout.distanceMiles != null) parts.push(`${workout.distanceMiles} mi`);
  return parts.join(" · ");
}

export interface WorkoutFormValues {
  type: WorkoutType;
  date: string;
  durationMinutes: number | null;
  distanceMiles: number | null;
  muscleGroup: Workout["muscleGroup"];
  notes: string | null;
}

export function WorkoutForm({
  initial,
  defaultDate,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
  compact,
}: {
  initial?: Partial<Workout>;
  defaultDate?: string;
  onSubmit: (input: WorkoutFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
  pending: boolean;
  compact?: boolean;
}) {
  const { timezone } = useSettings();
  const [type, setType] = useState<WorkoutType>(initial?.type ?? "walk");
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? todayISO(timezone));
  const [duration, setDuration] = useState(initial?.durationMinutes?.toString() ?? "");
  const [distance, setDistance] = useState(initial?.distanceMiles?.toString() ?? "");
  const [muscleGroup, setMuscleGroup] = useState(initial?.muscleGroup ?? MUSCLE_GROUPS[0]);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const isCardio = CARDIO_TYPES.includes(type);
  const isWeights = type === "weights";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({
        type,
        date,
        durationMinutes: duration.trim() ? Number(duration) : null,
        distanceMiles: isCardio && distance.trim() ? Number(distance) : null,
        muscleGroup: isWeights ? muscleGroup : null,
        notes: notes.trim() || null,
      });
      if (!initial) {
        setDuration("");
        setDistance("");
        setNotes("");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save workout");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <select value={type} onChange={(e) => setType(e.target.value as WorkoutType)} className="field">
          {(Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[]).map((t) => (
            <option key={t} value={t}>
              {WORKOUT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        {!compact && <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />}
        <input
          type="number"
          min={0}
          step={1}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Duration (min)"
          className="field w-36"
        />
        {isCardio && (
          <input
            type="number"
            min={0}
            step={0.1}
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="Distance (mi)"
            className="field w-36"
          />
        )}
        {isWeights && (
          <select
            value={muscleGroup ?? MUSCLE_GROUPS[0]}
            onChange={(e) => setMuscleGroup(e.target.value as (typeof MUSCLE_GROUPS)[number])}
            className="field"
          >
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {MUSCLE_GROUP_LABELS[g]}
              </option>
            ))}
          </select>
        )}
      </div>
      {!compact && (
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="field"
        />
      )}
      {error && <p className="text-sm text-red">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={compact ? "btn-secondary" : "btn-primary"}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
