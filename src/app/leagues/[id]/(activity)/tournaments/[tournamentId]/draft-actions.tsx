"use client";

import { Button } from "@/components/ui/button";
import { MIN_TOURNAMENT_PARTICIPANTS } from "@/services/constants";
import { Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { generateBracketAction } from "../actions";
import { DeleteTournamentDialog } from "./delete-tournament-dialog";

type DraftActionsProps = {
  tournamentId: string;
  leagueId: string;
  tournamentName: string;
  participantCount: number;
};

export function DraftActions({
  tournamentId,
  leagueId,
  tournamentName,
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
      <DeleteTournamentDialog
        tournamentId={tournamentId}
        leagueId={leagueId}
        tournamentName={tournamentName}
      />
    </div>
  );
}
