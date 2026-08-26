import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useIsAdmin() {
  const { user } = useAuth();

  const { data: isAdmin = false, isLoading } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-admin");
      // Throw on transport/function errors so the query retries instead of
      // caching a false "no access" result for 5 minutes.
      if (error) throw error;
      return data?.is_admin === true;
    },
    enabled: !!user,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    staleTime: 5 * 60 * 1000,
  });

  return { isAdmin, isLoading };
}
