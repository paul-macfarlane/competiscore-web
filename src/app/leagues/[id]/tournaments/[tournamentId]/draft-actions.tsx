"use client";

import { Button } from "@/components/ui/button";
import { MIN_TOURNAMENT_PARTICIPANTS } from "@/services/constants";
import { Loader2, Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { deleteTournamentAction, generateBracketAction } from "../actions";

type DraftActionsProps = {
  tournamentId: string;
  leagueId: string;
  participantCount: number;
};

export function DraftActions({
  tournamentId,
  leagueId,
  participantCount,
}: DraftActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const canGenerate = participantCount >= MIN_TOURNAMENT_PARTICIPANTS;

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateBracketAction({ tournamentId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Bracket generated! Tournament is now in progress.");
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this tournament?")) return;
    startTransition(async () => {
      const result = await deleteTournamentAction({ tournamentId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Tournament deleted");
        router.push(`/leagues/${leagueId}/tournaments`);
      }
    });
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleGenerate}
        disabled={!canGenerate || isPending}
        title={
          !canGenerate
            ? `Need at least ${MIN_TOURNAMENT_PARTICIPANTS} participants`
            : undefined
        }
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Play className="mr-2 h-4 w-4" />
        )}
        Start Tournament
      </Button>
      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={isPending}
        size="icon"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
