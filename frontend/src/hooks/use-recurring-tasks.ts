import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type CreateRecurringTaskInput, type UpdateRecurringTaskInput } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function invalidateRecurring(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["recurringTasks"] });
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
  queryClient.invalidateQueries({ queryKey: ["week"] });
  queryClient.invalidateQueries({ queryKey: ["today"] });
}

export function useRecurringTasks() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["recurringTasks"],
    queryFn: () => api.recurringTasks.list(token!).then((r) => r.recurringTasks),
    enabled: !!token,
  });
}

export function useCreateRecurringTask() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRecurringTaskInput) => api.recurringTasks.create(token!, input),
    meta: { silent: true }, // the create form shows its own inline error
    onSuccess: () => invalidateRecurring(queryClient),
  });
}

export function useUpdateRecurringTask() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRecurringTaskInput }) =>
      api.recurringTasks.update(token!, id, input),
    onSuccess: () => invalidateRecurring(queryClient),
  });
}

export function useDeleteRecurringTask() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.recurringTasks.remove(token!, id),
    onSuccess: () => invalidateRecurring(queryClient),
  });
}
