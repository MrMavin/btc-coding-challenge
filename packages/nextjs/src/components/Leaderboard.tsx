import { useState } from "react";
import { Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useLeaderboard } from "@/hooks/useLeaderboard";

const medals = ["🥇", "🥈", "🥉"];

interface LeaderboardProps {
  currentUserId: string | null;
}

function LeaderboardList({ currentUserId }: LeaderboardProps) {
  const { data, isLoading } = useLeaderboard();
  const entries = data?.leaderboard ?? [];

  if (isLoading) {
    return (
      <div className="text-muted-foreground text-sm p-4">Loading...</div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground text-sm p-4">
        No players yet. Be the first!
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry, i) => {
        const isCurrentUser = entry.user_id === currentUserId;
        return (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
              isCurrentUser
                ? "bg-btc/10 border border-btc/30"
                : "hover:bg-muted/50"
            }`}
          >
            <span className="w-8 text-center text-sm font-mono">
              {i < 3 ? medals[i] : `#${i + 1}`}
            </span>
            <span
              className={`flex-1 text-sm truncate ${
                isCurrentUser ? "font-bold text-btc" : ""
              }`}
            >
              {entry.user_id}
            </span>
            <span className="text-sm font-mono text-muted-foreground">
              {entry.score}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Leaderboard({ currentUserId }: LeaderboardProps) {
  const [desktopOpen, setDesktopOpen] = useState(false);

  return (
    <>
      {/* Desktop: side panel */}
      <div className="hidden md:block">
        {!desktopOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDesktopOpen(true)}
            className="fixed top-5 right-48 z-30 bg-card/80 backdrop-blur-md border border-border rounded-full"
          >
            <Trophy className="w-4 h-4 text-btc" />
          </Button>
        )}

        {desktopOpen && (
          <div className="fixed top-0 right-0 h-full w-72 bg-card/95 backdrop-blur-md border-l border-border z-40 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <Trophy className="w-5 h-5 text-btc" />
                  Leaderboard
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDesktopOpen(false)}
                  className="h-8 w-8 rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Separator className="my-3" />
              <LeaderboardList currentUserId={currentUserId} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Sheet */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-16 right-4 z-30 bg-card/80 backdrop-blur-md border border-border rounded-full"
            >
              <Trophy className="w-4 h-4 text-btc" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-btc" />
                Leaderboard
              </SheetTitle>
            </SheetHeader>
            <Separator className="my-3" />
            <LeaderboardList currentUserId={currentUserId} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
