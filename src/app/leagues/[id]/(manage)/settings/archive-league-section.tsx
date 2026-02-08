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
import { Archive } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { archiveLeagueAction } from "./actions";

interface ArchiveLeagueSectionProps {
  leagueId: string;
}

export function ArchiveLeagueSection({ leagueId }: ArchiveLeagueSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleArchive = () => {
    setError(null);

    startTransition(async () => {
      const result = await archiveLeagueAction({ leagueId });

      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.push("/leagues");
      }
    });
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Archive League</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Hide this league from all members. Data will be preserved and can be
            restored later.
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive this league?</DialogTitle>
              <DialogDescription>
                The league will be hidden from all members. All data will be
                preserved and only executives will be able to view or restore
                it.
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
              <Button onClick={handleArchive} disabled={isPending}>
                {isPending ? "Archiving..." : "Archive League"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
