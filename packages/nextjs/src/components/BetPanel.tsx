"use client";

import { ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCountdown } from "@/hooks/useCountdown";

interface BetPanelProps {
  bet?: {
    direction: "up" | "down";
    price: string;
    bet_at: string;
  } | null;
  onBet: (direction: "up" | "down") => void;
  isPending: boolean;
  disabled: boolean;
  lastUpdated?: string | null;
}

function CountdownCircle({
  secondsLeft,
  progress,
}: {
  secondsLeft: number;
  progress: number;
}) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="72" height="72" className="-rotate-90">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="#f7931a"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-200"
        />
      </svg>
      <span className="absolute text-lg font-bold font-mono">
        {secondsLeft}s
      </span>
    </div>
  );
}

function EvaluatingSpinner() {
  return (
    <div className="relative flex items-center justify-center w-[72px] h-[72px]">
      <Loader2 className="w-10 h-10 text-[#f7931a] animate-spin" />
    </div>
  );
}

export function BetPanel({
  bet,
  onBet,
  isPending,
  disabled,
  lastUpdated,
}: BetPanelProps) {
  const { secondsLeft, progress, phase } = useCountdown(
    bet?.bet_at,
    !!bet,
    lastUpdated,
  );

  if (bet) {
    const isUp = bet.direction === "up";
    const betPrice = parseFloat(bet.price).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return (
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-30">
        <div className="bg-card/90 backdrop-blur-md border border-border rounded-2xl px-8 py-5 flex flex-col items-center gap-3 shadow-2xl">
          <div className="flex items-center gap-6">
            <Badge
              variant="outline"
              className={`text-base px-4 py-1.5 ${
                isUp
                  ? "border-green-500 text-green-400"
                  : "border-red-500 text-red-400"
              }`}
            >
              {isUp ? (
                <ArrowUp className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDown className="w-4 h-4 mr-1" />
              )}
              {bet.direction.toUpperCase()}
            </Badge>

            <div className="text-sm text-muted-foreground">at ${betPrice}</div>

            {phase === "evaluating" ? (
              <EvaluatingSpinner />
            ) : (
              <CountdownCircle secondsLeft={secondsLeft} progress={progress} />
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {phase === "evaluating" ? (
              <span className="animate-pulse">
                Waiting for next price update…
              </span>
            ) : (
              <>Your prediction is locked in</>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
      <div className="bg-card/90 backdrop-blur-md border border-border rounded-2xl px-6 py-4 flex flex-col items-center gap-3 shadow-2xl">
        <div className="text-sm font-medium text-foreground">
          Where is BTC heading?
        </div>
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            disabled={disabled || isPending}
            onClick={() => onBet("up")}
            className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-6 text-lg rounded-xl animate-pulse-glow"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ArrowUp className="w-5 h-5 mr-2" />
                UP
              </>
            )}
          </Button>

          <Button
            size="lg"
            disabled={disabled || isPending}
            onClick={() => onBet("down")}
            className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-6 text-lg rounded-xl animate-pulse-glow"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ArrowDown className="w-5 h-5 mr-2" />
                DOWN
              </>
            )}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Checked after two price updates · +1 if correct, −1 if wrong
        </div>
      </div>
    </div>
  );
}
