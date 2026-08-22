import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ReorderUpdate } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function useWeek(weekStart: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["week", weekStart],
    queryFn: () => api.week(token!, weekStart),
    enabled: !!token,
  });
}

export function useReorderTasks() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: ReorderUpdate[]) => api.tasks.reorder(token!, updates),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["week"] });
      queryClient.invalidateQueries({ queryKey: ["today"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
