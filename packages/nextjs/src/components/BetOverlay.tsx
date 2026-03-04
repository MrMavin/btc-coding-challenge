"use client";

import { useEffect } from "react";
import type { BetResult } from "@/hooks/useUser";

interface BetOverlayProps {
  result: BetResult;
  onDismiss: () => void;
}

const config = {
  win: {
    label: "You Win!",
    score: "+1",
    bg: "from-green-900/80 to-transparent",
    text: "text-green-400",
    animation: "animate-scale-bounce",
  },
  lose: {
    label: "You Lose",
    score: "-1",
    bg: "from-red-900/80 to-transparent",
    text: "text-red-400",
    animation: "animate-shake",
  },
  tie: {
    label: "It's a Tie",
    score: "0",
    bg: "from-amber-900/80 to-transparent",
    text: "text-amber-400",
    animation: "animate-scale-bounce",
  },
};

export function BetOverlay({ result, onDismiss }: BetOverlayProps) {
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [result, onDismiss]);

  if (!result) return null;

  const c = config[result];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b ${c.bg} backdrop-blur-sm cursor-pointer`}
      onClick={onDismiss}
    >
      <div className={`text-center ${c.animation}`}>
        <div className={`text-7xl font-bold ${c.text} mb-4`}>{c.label}</div>
        <div className={`text-5xl font-mono font-bold ${c.text}`}>
          {c.score}
        </div>
      </div>
    </div>
  );
}
