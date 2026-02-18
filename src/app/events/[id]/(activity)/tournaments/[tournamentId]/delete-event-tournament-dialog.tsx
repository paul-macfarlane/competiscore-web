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

import { deleteEventTournamentAction } from "../../../actions";

interface DeleteEventTournamentDialogProps {
  tournamentId: string;
  eventId: string;
  tournamentName: string;
  hasPlacementPoints: boolean;
}

export function DeleteEventTournamentDialog({
  tournamentId,
  eventId,
  tournamentName,
  hasPlacementPoints,
}: DeleteEventTournamentDialogProps) {
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
      const result = await deleteEventTournamentAction({
        eventTournamentId: tournamentId,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        toast.success("Tournament deleted");
        router.push(`/events/${eventId}/tournaments`);
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
        <Button variant="destructive" size="sm" disabled={isPending}>
          <Trash2 className="mr-1 h-3 w-3" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this tournament permanently?</DialogTitle>
          <DialogDescription>
            {hasPlacementPoints
              ? "This will permanently delete this tournament, all matches, participants, and revert any awarded placement points. This action cannot be undone."
              : "This will permanently delete this tournament, all matches, and participants. This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="confirm-event-tournament">
            Type <span className="font-semibold">{tournamentName}</span> to
            confirm
          </Label>
          <Input
            id="confirm-event-tournament"
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
