import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useIsAdmin() {
  const { user } = useAuth();

  const { data: isAdmin = false, isLoading } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-admin");
      if (error) return false;
      return data?.is_admin === true;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return { isAdmin, isLoading };
}
