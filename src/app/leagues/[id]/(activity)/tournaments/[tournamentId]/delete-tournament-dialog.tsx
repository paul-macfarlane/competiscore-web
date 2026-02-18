"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteTournamentAction } from "../actions";

interface DeleteTournamentDialogProps {
  tournamentId: string;
  leagueId: string;
  tournamentName: string;
}

export function DeleteTournamentDialog({
  tournamentId,
  leagueId,
  tournamentName,
}: DeleteTournamentDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const canDelete = confirmText === tournamentName;

  const handleDelete = () => {
    if (!canDelete) return;
    setError(null);

    startTransition(async () => {
      const result = await deleteTournamentAction({ tournamentId });
      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        toast.success("Tournament deleted");
        router.push(`/leagues/${leagueId}/tournaments`);
      }
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setConfirmText("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size="icon" disabled={isPending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this tournament permanently?</DialogTitle>
          <DialogDescription>
            This will permanently delete this tournament and all its data. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="confirm-league-tournament">
            Type <span className="font-semibold">{tournamentName}</span> to
            confirm
          </Label>
          <Input
            id="confirm-league-tournament"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={tournamentName}
          />
        </div>
        {error && (
          <div className="bg-destructive/10 rounded-md p-3">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || !canDelete}
          >
            {isPending ? "Deleting..." : "Delete Forever"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
