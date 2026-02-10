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
import { Brackets, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  deleteEventTournamentAction,
  generateEventBracketAction,
} from "../../../actions";

type Props = {
  tournamentId: string;
  eventId: string;
  participantCount: number;
};

export function DraftEventActions({
  tournamentId,
  eventId,
  participantCount,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleGenerateBracket = () => {
    startTransition(async () => {
      const result = await generateEventBracketAction({
        eventTournamentId: tournamentId,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Bracket generated!");
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteEventTournamentAction({
        eventTournamentId: tournamentId,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Tournament deleted");
        router.push(`/events/${eventId}/tournaments`);
      }
    });
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleGenerateBracket}
        disabled={isPending || participantCount < 2}
      >
        <Brackets className="mr-1 h-4 w-4" />
        {isPending ? "Generating..." : "Generate Bracket"}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isPending}>
            <Trash2 className="mr-1 h-4 w-4" />
            Delete Tournament
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tournament? This action
              cannot be undone. All participants will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
