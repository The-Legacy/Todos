import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { Task } from "@todos/shared";
import { api, type CreateTaskInput, type TaskFilters, type TodayResponse, type UpdateTaskInput, type WeekResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function tasksKey(filters?: TaskFilters) {
  return ["tasks", filters ?? {}] as const;
}

function invalidatePlanning(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
  queryClient.invalidateQueries({ queryKey: ["week"] });
  queryClient.invalidateQueries({ queryKey: ["today"] });
}

/**
 * The Today/Week/Dashboard pages render directly from the "today"/"week" query caches, not the
 * flat "tasks" list — so an update/delete must also be reflected there, or the checkbox/edit has
 * no visible effect until the next background refetch lands.
 */
function snapshotAndPatchCaches(
  queryClient: QueryClient,
  patchTask: (task: Task) => Task | null, // null = remove
): { today: Array<[readonly unknown[], TodayResponse | undefined]>; week: Array<[readonly unknown[], WeekResponse | undefined]> } {
  const todaySnapshots = queryClient.getQueriesData<TodayResponse>({ queryKey: ["today"] });
  for (const [key, data] of todaySnapshots) {
    if (!data) continue;
    queryClient.setQueryData<TodayResponse>(key, {
      ...data,
      today: data.today.flatMap((t) => {
        const next = patchTask(t);
        return next ? [next] : [];
      }),
      overdue: data.overdue.flatMap((t) => {
        const next = patchTask(t);
        return next ? [next] : [];
      }),
      backlog: data.backlog.flatMap((t) => {
        const next = patchTask(t);
        return next ? [next] : [];
      }),
    });
  }

  const weekSnapshots = queryClient.getQueriesData<WeekResponse>({ queryKey: ["week"] });
  for (const [key, data] of weekSnapshots) {
    if (!data) continue;
    const days: Record<string, Task[]> = {};
    for (const [date, tasks] of Object.entries(data.days)) {
      days[date] = tasks.flatMap((t) => {
        const next = patchTask(t);
        return next ? [next] : [];
      });
    }
    queryClient.setQueryData<WeekResponse>(key, {
      ...data,
      days,
      backlog: data.backlog.flatMap((t) => {
        const next = patchTask(t);
        return next ? [next] : [];
      }),
    });
  }

  return { today: todaySnapshots, week: weekSnapshots };
}

function restoreCaches(
  queryClient: QueryClient,
  snapshots: { today: Array<[readonly unknown[], TodayResponse | undefined]>; week: Array<[readonly unknown[], WeekResponse | undefined]> },
) {
  for (const [key, data] of snapshots.today) if (data) queryClient.setQueryData(key, data);
  for (const [key, data] of snapshots.week) if (data) queryClient.setQueryData(key, data);
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
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      await queryClient.cancelQueries({ queryKey: ["today"] });
      await queryClient.cancelQueries({ queryKey: ["week"] });

      const previous = queryClient.getQueryData<Task[]>(key);
      queryClient.setQueryData<Task[]>(key, (prev) => prev?.map((t) => (t.id === id ? { ...t, ...input } : t)));

      const otherSnapshots = snapshotAndPatchCaches(queryClient, (t) => (t.id === id ? { ...t, ...input } : t));

      return { previous, otherSnapshots };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      if (context?.otherSnapshots) restoreCaches(queryClient, context.otherSnapshots);
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
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      await queryClient.cancelQueries({ queryKey: ["today"] });
      await queryClient.cancelQueries({ queryKey: ["week"] });

      const previous = queryClient.getQueryData<Task[]>(key);
      queryClient.setQueryData<Task[]>(key, (prev) => prev?.filter((t) => t.id !== id));

      const otherSnapshots = snapshotAndPatchCaches(queryClient, (t) => (t.id === id ? null : t));

      return { previous, otherSnapshots };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      if (context?.otherSnapshots) restoreCaches(queryClient, context.otherSnapshots);
    },
    onSettled: () => invalidatePlanning(queryClient),
  });
}
