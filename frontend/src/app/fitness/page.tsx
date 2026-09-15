"use client";

import { useMemo, useState } from "react";
import type { Workout, WorkoutType } from "@todos/shared";
import { RequireAuth } from "@/components/require-auth";
import { EditIcon } from "@/components/icons";
import { summarizeWorkout, WORKOUT_TYPE_LABELS, WorkoutForm } from "@/components/workout-form";
import { useCreateWorkout, useDeleteWorkout, useUpdateWorkout, useWorkouts } from "@/hooks/use-workouts";
import { ApiError } from "@/lib/api";
import { formatDayLabel } from "@/lib/dates";
import { useToast } from "@/lib/toast-context";
import { useConfirm } from "@/lib/confirm-context";

function WorkoutRow({ workout }: { workout: Workout }) {
  const [editing, setEditing] = useState(false);
  const updateWorkout = useUpdateWorkout();
  const deleteWorkout = useDeleteWorkout();
  const { showToast } = useToast();
  const confirm = useConfirm();

  if (editing) {
    return (
      <div className="p-3.5">
        <WorkoutForm
          initial={workout}
          submitLabel="Save"
          pending={updateWorkout.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={async (input) => {
            await updateWorkout.mutateAsync({ id: workout.id, input });
            setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 p-3.5">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-medium">{WORKOUT_TYPE_LABELS[workout.type]}</span>
          <span className="text-xs text-text-3">{formatDayLabel(workout.date)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-3">
          <span>{summarizeWorkout(workout) || "—"}</span>
          {workout.notes && <span className="text-text-2">{workout.notes}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit workout"
          className="-m-2 p-2 text-text-3 transition hover:text-accent"
        >
          <EditIcon size={14} />
        </button>
        <button
          onClick={async () => {
            if (!(await confirm({ message: "Delete this workout?", confirmLabel: "Delete", danger: true }))) return;
            try {
              await deleteWorkout.mutateAsync(workout.id);
            } catch (err) {
              showToast(err instanceof ApiError ? err.message : "Could not delete workout");
            }
          }}
          className="text-xs font-semibold text-text-3 hover:text-red"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function FitnessContent() {
  const { data: workouts, isLoading } = useWorkouts();
  const createWorkout = useCreateWorkout();
  const [typeFilter, setTypeFilter] = useState<WorkoutType | "all">("all");

  const filtered = useMemo(
    () => (workouts ?? []).filter((w) => typeFilter === "all" || w.type === typeFilter),
    [workouts, typeFilter],
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-9 sm:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Fitness</h1>
        <p className="text-[13.5px] text-text-2">
          Log a workout for any day — cardio tracks time and distance, weights tracks a muscle
          group.
        </p>
      </div>

      <div className="card p-4">
        <WorkoutForm
          submitLabel="Log workout"
          pending={createWorkout.isPending}
          onSubmit={(input) => createWorkout.mutateAsync(input).then(() => undefined)}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-text-3">Filter</span>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as WorkoutType | "all")} className="field">
          <option value="all">All types</option>
          {(Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[]).map((t) => (
            <option key={t} value={t}>
              {WORKOUT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-text-3">Loading…</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="card border-dashed p-6 text-center text-sm text-text-3">
          No workouts logged yet — add one above.
        </p>
      )}

      <div className="card flex flex-col divide-y divide-border-soft">
        {filtered.map((workout) => (
          <WorkoutRow key={workout.id} workout={workout} />
        ))}
      </div>
    </div>
  );
}

export default function FitnessPage() {
  return (
    <RequireAuth>
      <FitnessContent />
    </RequireAuth>
  );
}
