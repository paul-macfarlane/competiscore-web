"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { removeEventParticipantAction } from "./actions";

interface LeaveEventButtonProps {
  eventId: string;
  isOrganizer: boolean;
}

export function LeaveEventButton({
  eventId,
  isOrganizer,
}: LeaveEventButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLeave = () => {
    startTransition(async () => {
      const result = await removeEventParticipantAction({
        eventId,
        userId: "self",
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Left the event");
        router.push("/events");
      }
    });
  };

  if (isOrganizer) {
    return null;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isPending}>
          <LogOut className="mr-1 h-4 w-4" />
          Leave
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave this event?</AlertDialogTitle>
          <AlertDialogDescription>
            You will need a new invitation to rejoin this event.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleLeave}
            disabled={isPending}
          >
            {isPending ? "Leaving..." : "Leave Event"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
