"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { getUser, type User } from "@/lib/api";
import { useUserStore } from "@/stores/userStore";

export type BetResult = "win" | "lose" | "tie" | null;

export function useUser() {
  const userId = useUserStore((s) => s.userId);
  const betResult = useUserStore((s) => s.betResult);
  const prevScoreRef = useRef<number | null>(null);
  const hadBetRef = useRef(false);

  const query = useQuery<User>({
    queryKey: ["user", userId],
    queryFn: () => getUser(userId!),
    enabled: !!userId,
    refetchInterval: 60_000,
  });

  // Detect bet resolution via score change
  useEffect(() => {
    const user = query.data;
    if (!user) return;

    if (hadBetRef.current && !user.bet) {
      const prevScore = prevScoreRef.current;
      if (prevScore !== null && !useUserStore.getState().betResult) {
        const diff = user.score - prevScore;
        const result = diff > 0 ? "win" : diff < 0 ? "lose" : "tie";
        queueMicrotask(() => useUserStore.getState().setBetResult(result));
      }
      hadBetRef.current = false; // reset immediately to prevent re-triggering
    } else {
      hadBetRef.current = !!user.bet;
    }

    if (!user.bet) {
      prevScoreRef.current = user.score;
    }
  }, [query.data]);

  const login = useCallback((id: string) => {
    localStorage.setItem("btc_user_id", id);
    useUserStore.getState().setUserId(id);
  }, []);

  const updateUserId = useCallback((newId: string) => {
    localStorage.setItem("btc_user_id", newId);
    useUserStore.getState().setUserId(newId);
  }, []);

  const dismissResult = useCallback(() => {
    useUserStore.getState().setBetResult(null);
  }, []);

  return {
    userId,
    user: query.data ?? null,
    isLoading: query.isLoading,
    login,
    updateUserId,
    betResult,
    dismissResult,
    refetch: query.refetch,
  };
}
