"use client";

import { useEffect, useMemo, useState } from "react";

const BET_DURATION = 60;
const BACKEND_INTERVAL = 60;

export type CountdownPhase = "idle" | "waiting" | "evaluating";

/**
 * Calculate when the bet will actually be resolved.
 *
 * The backend runs every 60s (last run = lastUpdated).
 * A bet placed at bet_at becomes eligible at bet_at + 60s.
 * It gets resolved on the first backend run >= bet_at + 60s.
 */
function computeResolutionTime(betAtMs: number, lastUpdatedMs: number): number {
  const eligible = betAtMs + BET_DURATION * 1000;
  if (lastUpdatedMs >= eligible) {
    // Backend already ran after eligible — should resolve any moment
    return lastUpdatedMs + BACKEND_INTERVAL * 1000;
  }
  const gap = eligible - lastUpdatedMs;
  const cycles = Math.ceil(gap / (BACKEND_INTERVAL * 1000));
  return lastUpdatedMs + cycles * BACKEND_INTERVAL * 1000;
}

function calculateSecondsLeft(
  betAt: string | null | undefined,
  lastUpdated: string | null | undefined,
): number {
  if (!betAt) return 0;
  const betAtMs = new Date(betAt).getTime();
  if (lastUpdated) {
    const lastUpdatedMs = new Date(lastUpdated).getTime();
    const resolution = computeResolutionTime(betAtMs, lastUpdatedMs);
    return Math.ceil(Math.max(0, (resolution - Date.now()) / 1000));
  }
  const elapsed = (Date.now() - betAtMs) / 1000;
  return Math.ceil(Math.max(0, BET_DURATION - elapsed));
}

export function useCountdown(
  betAt: string | null | undefined,
  betExists: boolean = !!betAt,
  lastUpdated: string | null | undefined = undefined,
) {
  const secondsLeft = calculateSecondsLeft(betAt, lastUpdated);
  const [, forceUpdate] = useState(0);

  // Tick on interval to keep countdown fresh
  useEffect(() => {
    if (!betAt) return;
    const interval = setInterval(() => forceUpdate((n) => n + 1), 200);
    return () => clearInterval(interval);
  }, [betAt, lastUpdated]);

  // Total duration from bet placement to expected resolution (stable per bet)
  const totalDuration = useMemo(() => {
    if (!betAt) return BET_DURATION;
    const betAtMs = new Date(betAt).getTime();
    if (lastUpdated) {
      const lastUpdatedMs = new Date(lastUpdated).getTime();
      const resolution = computeResolutionTime(betAtMs, lastUpdatedMs);
      return (resolution - betAtMs) / 1000;
    }
    return BET_DURATION;
  }, [betAt, lastUpdated]);

  const phase: CountdownPhase = !betAt
    ? "idle"
    : secondsLeft > 0
      ? "waiting"
      : betExists
        ? "evaluating"
        : "idle";

  return {
    secondsLeft,
    totalDuration,
    progress: betAt ? secondsLeft / totalDuration : 0,
    isComplete: betAt ? secondsLeft === 0 : false,
    phase,
  };
}
