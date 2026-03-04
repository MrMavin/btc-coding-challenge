import {
  createContext,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WebSocketManager, type PriceUpdate } from "@/lib/websocket";
import { useUserStore } from "@/stores/userStore";

const WebSocketContext = createContext<WebSocketManager | null>(null);

export function useWebSocket() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const userId = useUserStore((s) => s.userId);
  const setBetResult = useUserStore((s) => s.setBetResult);

  const manager = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL ?? "";
    if (!url) return null;
    return new WebSocketManager(url);
  }, []);

  // Register user_id with the WebSocket connection
  useEffect(() => {
    if (!manager || !userId) return;
    manager.registerUser(userId);
  }, [manager, userId]);

  // Handle price updates
  useEffect(() => {
    if (!manager) return;

    const unsub = manager.subscribe((data: PriceUpdate) => {
      queryClient.setQueryData(["price-live"], data);
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    });

    return () => {
      unsub();
    };
  }, [manager, queryClient]);

  // Handle bet settlements
  useEffect(() => {
    if (!manager || !userId) return;

    const unsub = manager.subscribeSettlement((data) => {
      const result = data.delta > 0 ? "win" : data.delta < 0 ? "lose" : "tie";
      setBetResult(result);
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    });

    return () => {
      unsub();
    };
  }, [manager, userId, setBetResult, queryClient]);

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
