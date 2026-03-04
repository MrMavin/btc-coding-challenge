import {
  createContext,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WebSocketManager, type PriceUpdate } from "@/lib/websocket";
import { useUserStore } from "@/stores/userStore";
import type { User } from "@/lib/api";

const WebSocketContext = createContext<WebSocketManager | null>(null);

export function useWebSocket() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const userId = useUserStore((s) => s.userId);

  const manager = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL ?? "";
    if (!url) return null;
    return new WebSocketManager(url);
  }, []);

  useEffect(() => {
    if (!manager) return;

    const unsub = manager.subscribe((data: PriceUpdate) => {
      queryClient.setQueryData(["price-live"], data);

      // Backend sequence: broadcast price → settle bets → rebuild leaderboard.
      // If user has an active bet, delay refetch 5s so settlement completes.
      const user = userId
        ? queryClient.getQueryData<User>(["user", userId])
        : null;
      const delay = user?.bet ? 5_000 : 0;

      setTimeout(() => {
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ["user", userId] });
        }
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      }, delay);
    });

    return () => {
      unsub();
    };
  }, [manager, queryClient, userId]);

  useEffect(() => {
    if (!manager) return;
    return () => {
      manager.disconnect();
    };
  }, [manager]);

  return (
    <WebSocketContext.Provider value={manager}>
      {children}
    </WebSocketContext.Provider>
  );
}
