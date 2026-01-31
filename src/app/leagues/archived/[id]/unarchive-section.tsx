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
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { unarchiveLeagueAction } from "../actions";

interface UnarchiveSectionProps {
  leagueId: string;
}

export function UnarchiveSection({ leagueId }: UnarchiveSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleUnarchive = () => {
    setError(null);

    startTransition(async () => {
      const result = await unarchiveLeagueAction({ leagueId });

      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.push(`/leagues/${leagueId}`);
      }
    });
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Restore League</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Unarchive this league to make it visible to all members again.
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restore this league?</DialogTitle>
              <DialogDescription>
                The league will become visible to all members again. All data
                has been preserved.
              </DialogDescription>
            </DialogHeader>
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
              <Button onClick={handleUnarchive} disabled={isPending}>
                {isPending ? "Restoring..." : "Restore League"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
