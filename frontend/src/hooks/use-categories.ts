import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Category } from "@todos/shared";
import { api, type CreateCategoryInput, type UpdateCategoryInput } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const CATEGORIES_KEY = ["categories"] as const;

export function useCategories() {
  const { token } = useAuth();

  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: () => api.categories.list(token!).then((r) => r.categories),
    enabled: !!token,
  });
}

export function useCreateCategory() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => api.categories.create(token!, input),
    onSuccess: ({ category }) => {
      queryClient.setQueryData<Category[]>(CATEGORIES_KEY, (prev) => [...(prev ?? []), category]);
    },
  });
}

export function useUpdateCategory() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      api.categories.update(token!, id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: CATEGORIES_KEY });
      const previous = queryClient.getQueryData<Category[]>(CATEGORIES_KEY);
      queryClient.setQueryData<Category[]>(CATEGORIES_KEY, (prev) =>
        prev?.map((c) => (c.id === id ? { ...c, ...input } : c)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(CATEGORIES_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useDeleteCategory() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.categories.remove(token!, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: CATEGORIES_KEY });
      const previous = queryClient.getQueryData<Category[]>(CATEGORIES_KEY);
      queryClient.setQueryData<Category[]>(CATEGORIES_KEY, (prev) => prev?.filter((c) => c.id !== id));
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(CATEGORIES_KEY, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
