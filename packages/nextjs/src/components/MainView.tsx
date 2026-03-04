import { PriceChart } from "@/components/PriceChart";
import { BetPanel } from "@/components/BetPanel";
import { BetOverlay } from "@/components/BetOverlay";
import { UserSetup } from "@/components/UserSetup";
import { UserBadge } from "@/components/UserBadge";
import { Leaderboard } from "@/components/Leaderboard";
import { useUser } from "@/hooks/useUser";
import { usePrice } from "@/hooks/usePrice";
import { useBet } from "@/hooks/useBet";

export function MainView() {
  const {
    userId,
    user,
    login,
    updateUserId,
    betResult,
    dismissResult,
    refetch,
  } = useUser();
  const { currentPrice, lastUpdated, chartData, livePrice, isLoading: priceLoading } = usePrice();
  const betMutation = useBet(userId);

  const handleBet = (direction: "up" | "down") => {
    betMutation.mutate(direction);
  };

  const handleRenamed = (newId: string) => {
    updateUserId(newId);
    refetch();
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background relative">
      {/* Chart fills background */}
      <PriceChart
        chartData={chartData}
        livePrice={livePrice}
        bet={user?.bet ?? null}
      />

      {/* Price display - top left */}
      <div className="fixed top-4 left-4 z-30">
        <div className="bg-card/80 backdrop-blur-md border border-border rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground mb-0.5">BTC/USD</div>
          <div className="text-2xl font-bold font-mono tracking-tight">
            {priceLoading ? (
              <span className="text-muted-foreground">Loading...</span>
            ) : currentPrice !== null ? (
              `$${Number(currentPrice).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            ) : (
              <span className="text-muted-foreground">--</span>
            )}
          </div>
        </div>
      </div>

      {/* User badge - top right */}
      {user && <UserBadge user={user} onRenamed={handleRenamed} />}

      {/* Leaderboard toggle */}
      <Leaderboard currentUserId={userId} />

      {/* Bet panel - bottom center */}
      {userId && (
        <BetPanel
          bet={user?.bet}
          onBet={handleBet}
          isPending={betMutation.isPending}
          disabled={!user || !!user.bet}
          lastUpdated={lastUpdated}
        />
      )}

      {/* Result overlay */}
      <BetOverlay result={betResult} onDismiss={dismissResult} />

      {/* First-time user setup */}
      <UserSetup open={!userId} onComplete={login} />
    </div>
  );
}
