import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@todos/shared";
import { api, type CreateTaskInput, type TaskFilters, type UpdateTaskInput } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function tasksKey(filters?: TaskFilters) {
  return ["tasks", filters ?? {}] as const;
}

function invalidatePlanning(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
  queryClient.invalidateQueries({ queryKey: ["week"] });
  queryClient.invalidateQueries({ queryKey: ["today"] });
}

export function useTasks(filters?: TaskFilters) {
  const { token } = useAuth();

  return useQuery({
    queryKey: tasksKey(filters),
    queryFn: () => api.tasks.list(token!, filters).then((r) => r.tasks),
    enabled: !!token,
  });
}

export function useCreateTask(filters?: TaskFilters) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.tasks.create(token!, input),
    onSuccess: ({ task }) => {
      queryClient.setQueryData<Task[]>(tasksKey(filters), (prev) => [...(prev ?? []), task]);
      invalidatePlanning(queryClient);
    },
  });
}

export function useUpdateTask(filters?: TaskFilters) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = tasksKey(filters);

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) => api.tasks.update(token!, id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key);
      queryClient.setQueryData<Task[]>(key, (prev) =>
        prev?.map((t) => (t.id === id ? { ...t, ...input } : t)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => invalidatePlanning(queryClient),
  });
}

export function useDeleteTask(filters?: TaskFilters) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = tasksKey(filters);

  return useMutation({
    mutationFn: (id: string) => api.tasks.remove(token!, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key);
      queryClient.setQueryData<Task[]>(key, (prev) => prev?.filter((t) => t.id !== id));
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => invalidatePlanning(queryClient),
  });
}
