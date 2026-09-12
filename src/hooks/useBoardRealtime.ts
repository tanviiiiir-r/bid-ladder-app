import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Keeps the public board fresh: any change to rankings or listings
 * invalidates the cached board so new approvals and rank movement appear live.
 */
export function useBoardRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("board-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "rankings" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["board"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["board"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
