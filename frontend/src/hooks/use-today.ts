import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { todayISO } from "@/lib/dates";
import { useSettings } from "@/lib/settings-context";

export function useToday(date?: string) {
  const { token } = useAuth();
  const { weekStartsOn, timezone } = useSettings();
  const resolvedDate = date ?? todayISO(timezone);

  return useQuery({
    queryKey: ["today", resolvedDate, weekStartsOn],
    queryFn: () => api.today(token!, resolvedDate, weekStartsOn),
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
