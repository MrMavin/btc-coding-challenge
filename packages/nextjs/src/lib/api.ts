import { create } from "apisauce";

const api = create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
});

async function unwrap<T>(response: Awaited<ReturnType<typeof api.get>>): Promise<T> {
  if (!response.ok) {
    const err = response.data as Record<string, string> | null;
    throw new Error(err?.error ?? `API error ${response.status}`);
  }
  return response.data as T;
}

export interface PriceData {
  symbol: string;
  price: number;
  last_updated: string;
  chart: [number, number][];
}

export interface User {
  user_id: string;
  score: number;
  bet?: {
    direction: "up" | "down";
    price: string;
    bet_at: string;
  };
}

export interface LeaderboardEntry {
  user_id: string;
  score: number;
}

export interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  last_updated?: string;
}

export interface BetResponse {
  user_id: string;
  bet: {
    direction: "up" | "down";
    price: string;
    bet_at: string;
  };
}

export function fetchPrice(): Promise<PriceData> {
  return api.get("/price").then((r) => unwrap<PriceData>(r));
}

export function createUser(user_id: string): Promise<User> {
  return api.post("/user", { user_id }).then((r) => unwrap<User>(r));
}

export function getUser(user_id: string): Promise<User> {
  return api.get("/user", { user_id }).then((r) => unwrap<User>(r));
}

export function placeBet(
  user_id: string,
  direction: "up" | "down"
): Promise<BetResponse> {
  return api.post("/bet", { user_id, direction }).then((r) => unwrap<BetResponse>(r));
}

export function renameUser(
  old_user_id: string,
  new_user_id: string
): Promise<User> {
  return api
    .post("/user/rename", { old_user_id, new_user_id })
    .then((r) => unwrap<User>(r));
}

export function fetchLeaderboard(): Promise<LeaderboardData> {
  return api.get("/leaderboard").then((r) => unwrap<LeaderboardData>(r));
}
