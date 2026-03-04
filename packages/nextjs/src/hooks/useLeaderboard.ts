"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLeaderboard, type LeaderboardData } from "@/lib/api";

export function useLeaderboard() {
  return useQuery<LeaderboardData>({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    refetchInterval: 60_000,
  });
}
