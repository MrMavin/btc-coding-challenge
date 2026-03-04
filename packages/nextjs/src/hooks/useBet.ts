"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeBet, type BetResponse } from "@/lib/api";

export function useBet(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<BetResponse, Error, "up" | "down">({
    mutationFn: (direction) => placeBet(userId!, direction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
    },
  });
}
