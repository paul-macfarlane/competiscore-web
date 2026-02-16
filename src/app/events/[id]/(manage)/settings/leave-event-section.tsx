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
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { leaveEventAction } from "../../actions";

interface LeaveEventSectionProps {
  eventId: string;
  isSoleOrganizer: boolean;
}

export function LeaveEventSection({
  eventId,
  isSoleOrganizer,
}: LeaveEventSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleLeave = () => {
    setError(null);

    startTransition(async () => {
      const result = await leaveEventAction({ eventId });

      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.push("/events");
      }
    });
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Leave Event</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {isSoleOrganizer
              ? "You cannot leave as the only organizer. Promote another participant first."
              : "Remove yourself from this event. Your activity history will be preserved."}
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isSoleOrganizer}>
              <LogOut className="mr-2 h-4 w-4" />
              Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave this event?</DialogTitle>
              <DialogDescription>
                You will no longer be able to access this event unless you are
                re-invited. Your activity history will be preserved.
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
              <Button
                variant="destructive"
                onClick={handleLeave}
                disabled={isPending}
              >
                {isPending ? "Leaving..." : "Leave Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
