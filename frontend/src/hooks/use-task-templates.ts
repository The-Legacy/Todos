import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type CreateTaskTemplateInput, type UpdateTaskTemplateInput } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function invalidateTemplates(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["taskTemplates"] });
}

export function useTaskTemplates() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["taskTemplates"],
    queryFn: () => api.taskTemplates.list(token!).then((r) => r.taskTemplates),
    enabled: !!token,
  });
}

export function useCreateTaskTemplate() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskTemplateInput) => api.taskTemplates.create(token!, input),
    meta: { silent: true },
    onSuccess: () => invalidateTemplates(queryClient),
  });
}

export function useUpdateTaskTemplate() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskTemplateInput }) =>
      api.taskTemplates.update(token!, id, input),
    onSuccess: () => invalidateTemplates(queryClient),
  });
}

export function useDeleteTaskTemplate() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.taskTemplates.remove(token!, id),
    onSuccess: () => invalidateTemplates(queryClient),
  });
}
