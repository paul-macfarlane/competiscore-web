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
import { Archive, ArchiveRestore } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { archiveEventAction, unarchiveEventAction } from "../../actions";

interface ArchiveEventSectionProps {
  eventId: string;
  isArchived: boolean;
}

export function ArchiveEventSection({
  eventId,
  isArchived,
}: ArchiveEventSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = () => {
    setError(null);

    startTransition(async () => {
      const action = isArchived ? unarchiveEventAction : archiveEventAction;
      const result = await action({ eventId });

      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        if (isArchived) {
          router.refresh();
        } else {
          router.push("/events");
        }
      }
    });
  };

  if (isArchived) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">Restore Event</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              This event is archived. Restore it to make it visible to all
              members again.
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Restore
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Restore this event?</DialogTitle>
                <DialogDescription>
                  The event will be visible to all members again.
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
                <Button onClick={handleAction} disabled={isPending}>
                  {isPending ? "Restoring..." : "Restore Event"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Archive Event</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Hide this event from all members. Data will be preserved and can be
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
              <DialogTitle>Archive this event?</DialogTitle>
              <DialogDescription>
                The event will be hidden from all members. All data will be
                preserved and only organizers will be able to view or restore
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
              <Button onClick={handleAction} disabled={isPending}>
                {isPending ? "Archiving..." : "Archive Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
