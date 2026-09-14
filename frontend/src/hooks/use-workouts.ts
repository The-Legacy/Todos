import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type CreateWorkoutInput, type UpdateWorkoutInput, type WorkoutFilters } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function workoutsKey(filters?: WorkoutFilters) {
  return ["workouts", filters ?? {}] as const;
}

function invalidateWorkouts(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["workouts"] });
}

export function useWorkouts(filters?: WorkoutFilters, options?: { enabled?: boolean }) {
  const { token } = useAuth();

  return useQuery({
    queryKey: workoutsKey(filters),
    queryFn: () => api.workouts.list(token!, filters).then((r) => r.workouts),
    enabled: !!token && (options?.enabled ?? true),
  });
}

export function useCreateWorkout() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorkoutInput) => api.workouts.create(token!, input),
    onSuccess: () => invalidateWorkouts(queryClient),
  });
}

export function useUpdateWorkout() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWorkoutInput }) => api.workouts.update(token!, id, input),
    onSuccess: () => invalidateWorkouts(queryClient),
  });
}

export function useDeleteWorkout() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.workouts.remove(token!, id),
    onSuccess: () => invalidateWorkouts(queryClient),
  });
}
