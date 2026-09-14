"use client";

import { useState } from "react";
import type { Workout } from "@todos/shared";
import { PlusIcon } from "@/components/icons";
import { summarizeWorkout, WORKOUT_TYPE_LABELS, WorkoutForm } from "@/components/workout-form";
import { useCreateWorkout, useDeleteWorkout, useWorkouts } from "@/hooks/use-workouts";
import { ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";

export function DayWorkoutsCard({ date }: { date: string }) {
  const { data: workouts, isLoading } = useWorkouts({ date });
  const createWorkout = useCreateWorkout();
  const deleteWorkout = useDeleteWorkout();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="card flex w-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold">Workouts</span>
        <button
          onClick={() => setShowForm((s) => !s)}
          aria-label="Log a workout"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-accent-tint text-accent"
        >
          <PlusIcon size={13} strokeWidth={2.4} />
        </button>
      </div>

      {showForm && (
        <WorkoutForm
          compact
          defaultDate={date}
          submitLabel="Log"
          pending={createWorkout.isPending}
          onSubmit={(input) =>
            createWorkout.mutateAsync({ ...input, date }).then(() => {
              setShowForm(false);
            })
          }
          onCancel={() => setShowForm(false)}
        />
      )}

      {isLoading && <p className="text-sm text-text-3">Loading…</p>}
      {!isLoading && (workouts?.length ?? 0) === 0 && !showForm && (
        <p className="text-sm text-text-3">No workouts logged for this day.</p>
      )}
      <div className="flex flex-col gap-2">
        {workouts?.map((workout: Workout) => (
          <div key={workout.id} className="flex items-center justify-between gap-2.5 rounded-[11px] border border-border-soft p-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium">{WORKOUT_TYPE_LABELS[workout.type]}</p>
              <p className="truncate text-[11px] text-text-3">{summarizeWorkout(workout) || "—"}</p>
            </div>
            <button
              onClick={async () => {
                if (!confirm("Delete this workout?")) return;
                try {
                  await deleteWorkout.mutateAsync(workout.id);
                } catch (err) {
                  showToast(err instanceof ApiError ? err.message : "Could not delete workout");
                }
              }}
              className="shrink-0 text-xs font-semibold text-text-3 hover:text-red"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
