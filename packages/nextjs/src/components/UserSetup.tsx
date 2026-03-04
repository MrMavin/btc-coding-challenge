"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createUser } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface UserSetupProps {
  open: boolean;
  onComplete: (userId: string) => void;
}

export function UserSetup({ open, onComplete }: UserSetupProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    try {
      await createUser(trimmed);
      onComplete(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to BTC Betting</DialogTitle>
          <DialogDescription>
            Choose a username to start betting on Bitcoin price movements.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <Input
            placeholder="Enter your username"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={20}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={!name.trim() || loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Start Betting
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
