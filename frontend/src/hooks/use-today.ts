import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";

export function useToday(date?: string) {
  const { token } = useAuth();
  const { weekStartsOn } = useSettings();

  return useQuery({
    queryKey: ["today", date ?? "current", weekStartsOn],
    queryFn: () => api.today(token!, date, weekStartsOn),
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
