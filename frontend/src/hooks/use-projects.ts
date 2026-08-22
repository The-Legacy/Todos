import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type CreateProjectInput, type UpdateProjectInput } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function invalidateProjects(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["projects"] });
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
  queryClient.invalidateQueries({ queryKey: ["week"] });
  queryClient.invalidateQueries({ queryKey: ["today"] });
}

export function useProjects() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.projects.list(token!).then((r) => r.projects),
    enabled: !!token,
  });
}

export function useProject(id: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => api.projects.get(token!, id),
    enabled: !!token && !!id,
  });
}

export function useCreateProject() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.projects.create(token!, input),
    onSuccess: () => invalidateProjects(queryClient),
  });
}

export function useUpdateProject() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) => api.projects.update(token!, id, input),
    onSuccess: () => invalidateProjects(queryClient),
  });
}

export function useDeleteProject() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.projects.remove(token!, id),
    onSuccess: () => invalidateProjects(queryClient),
  });
}
