"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { renameUser } from "@/lib/api";
import { Loader2 } from "lucide-react";
import type { User } from "@/lib/api";

interface UserBadgeProps {
  user: User;
  onRenamed: (newId: string) => void;
}

export function UserBadge({ user, onRenamed }: UserBadgeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || trimmed === user.user_id) return;

    setLoading(true);
    setError("");
    try {
      await renameUser(user.user_id, trimmed);
      onRenamed(trimmed);
      setDialogOpen(false);
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename");
    } finally {
      setLoading(false);
    }
  };

  const initial = user.user_id.charAt(0).toUpperCase();

  return (
    <>
      <button
        onClick={() => {
          setNewName(user.user_id);
          setDialogOpen(true);
        }}
        className="fixed top-4 right-4 z-30 flex items-center gap-3 bg-card/80 backdrop-blur-md border border-border rounded-full px-4 py-2 hover:bg-card/95 transition-colors cursor-pointer"
      >
        <div className="w-8 h-8 rounded-full bg-btc flex items-center justify-center text-sm font-bold text-black">
          {initial}
        </div>
        <span className="text-sm font-medium">{user.user_id}</span>
        <span className="text-sm font-mono text-muted-foreground">
          {user.score}pts
        </span>
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Username</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4 mt-2">
            <Input
              placeholder="New username"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              maxLength={20}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={
                !newName.trim() || newName.trim() === user.user_id || loading
              }
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Rename
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
