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
import { EventStatus } from "@/lib/shared/constants";
import { CheckCircle, Play, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  completeEventAction,
  reopenEventAction,
  startEventAction,
} from "../../actions";

interface EventLifecycleActionsProps {
  eventId: string;
  eventStatus: string;
}

export function EventLifecycleActions({
  eventId,
  eventStatus,
}: EventLifecycleActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleStart = () => {
    setError(null);
    startTransition(async () => {
      const result = await startEventAction({ eventId });
      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  const handleComplete = () => {
    setError(null);
    startTransition(async () => {
      const result = await completeEventAction({ eventId });
      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  const handleReopen = () => {
    setError(null);
    startTransition(async () => {
      const result = await reopenEventAction({ eventId });
      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  if (eventStatus === EventStatus.DRAFT) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">Start Event</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Start the event to begin recording matches and scores.
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start this event?</DialogTitle>
                <DialogDescription>
                  Participants will be able to begin recording matches and
                  scores. You can still add game types after starting.
                  <br />
                  <br />
                  Participants can be ADDED to teams after starting, but cannot
                  be REMOVED.
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
                <Button onClick={handleStart} disabled={isPending}>
                  {isPending ? "Starting..." : "Start Event"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  if (eventStatus === EventStatus.ACTIVE) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">Complete Event</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Mark the event as completed. No more matches or scores can be
              recorded after completion.
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Complete this event?</DialogTitle>
                <DialogDescription>
                  Once completed, no more matches or scores can be recorded.
                  Final standings will be locked in. You can reopen the event
                  later if needed.
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
                <Button onClick={handleComplete} disabled={isPending}>
                  {isPending ? "Completing..." : "Complete Event"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  if (eventStatus === EventStatus.COMPLETED) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">Reopen Event</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Reopen the event to allow recording more matches and scores.
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reopen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reopen this event?</DialogTitle>
                <DialogDescription>
                  The event will return to active status and participants will
                  be able to record matches and scores again.
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
                <Button onClick={handleReopen} disabled={isPending}>
                  {isPending ? "Reopening..." : "Reopen Event"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  return null;
}
