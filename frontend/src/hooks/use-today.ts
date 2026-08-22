import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function useToday(date?: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["today", date ?? "current"],
    queryFn: () => api.today(token!, date),
    enabled: !!token,
  });
}

export function useInvalidatePlanning() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["today"] });
    queryClient.invalidateQueries({ queryKey: ["week"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };
}
