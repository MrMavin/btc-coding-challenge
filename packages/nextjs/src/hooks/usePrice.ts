"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPrice, type PriceData } from "@/lib/api";
import type { PriceUpdate } from "@/lib/websocket";

export function usePrice() {
  const initialQuery = useQuery<PriceData>({
    queryKey: ["price-initial"],
    queryFn: fetchPrice,
    staleTime: Infinity,
  });

  const liveQuery = useQuery<PriceUpdate>({
    queryKey: ["price-live"],
    queryFn: () => Promise.reject(new Error("no-op")),
    enabled: false,
  });

  const currentPrice = liveQuery.data?.price ?? initialQuery.data?.price ?? null;
  const lastUpdated =
    liveQuery.data?.last_updated ?? initialQuery.data?.last_updated ?? null;

  return {
    currentPrice,
    lastUpdated,
    chartData: initialQuery.data?.chart ?? [],
    livePrice: liveQuery.data ?? null,
    isLoading: initialQuery.isLoading,
  };
}
