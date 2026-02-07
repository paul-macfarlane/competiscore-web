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

import { deleteLeagueAction } from "./actions";

interface DeleteLeagueSectionProps {
  leagueId: string;
  leagueName: string;
}

export function DeleteLeagueSection({
  leagueId,
  leagueName,
}: DeleteLeagueSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const canDelete = confirmText === leagueName;

  const handleDelete = () => {
    if (!canDelete) return;
    setError(null);

    startTransition(async () => {
      const result = await deleteLeagueAction({ leagueId });

      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.push("/leagues");
      }
    });
  };

  return (
    <div className="border-destructive/50 rounded-lg border bg-card text-card-foreground p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-destructive font-semibold">Delete League</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Permanently delete this league and all its data. This action cannot
            be undone.
          </p>
        </div>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setConfirmText("");
          }}
        >
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this league permanently?</DialogTitle>
              <DialogDescription>
                This will permanently delete the league, all members, match
                history, and data. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="confirm">
                Type <span className="font-semibold">{leagueName}</span> to
                confirm
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={leagueName}
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
      </div>
    </div>
  );
}
