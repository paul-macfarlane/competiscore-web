"use client";

import {
  RecordH2HMatchForm,
  TournamentMatchProps,
} from "@/components/record-h2h-match-form";
import { TournamentBracket } from "@/components/tournament-bracket";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TournamentRoundMatchWithDetails } from "@/db/tournaments";
import { H2HConfig } from "@/lib/shared/game-templates";
import { ParticipantOption } from "@/lib/shared/participant-options";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { recordTournamentMatchResultAction } from "../actions";

type TournamentBracketViewProps = {
  bracket: TournamentRoundMatchWithDetails[];
  totalRounds: number;
  canManage: boolean;
  config: H2HConfig;
  leagueId: string;
  gameTypeId: string;
};

function getParticipantName(
  participant: TournamentRoundMatchWithDetails["participant1"],
): string {
  if (!participant) return "TBD";
  if (participant.user) return participant.user.name;
  if (participant.team) return participant.team.name;
  if (participant.placeholderMember)
    return participant.placeholderMember.displayName;
  return "TBD";
}

export function TournamentBracketView({
  bracket,
  totalRounds,
  canManage,
  config,
  leagueId,
  gameTypeId,
}: TournamentBracketViewProps) {
  const router = useRouter();
  const [selectedMatch, setSelectedMatch] =
    useState<TournamentRoundMatchWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleMatchClick = (match: TournamentRoundMatchWithDetails) => {
    setSelectedMatch(match);
    setDialogOpen(true);
  };

  const handleViewMatch = (matchId: string) => {
    router.push(`/leagues/${leagueId}/matches/${matchId}`);
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    router.refresh();
  };

  const handleCancel = () => {
    setDialogOpen(false);
  };

  const tournamentMatch: TournamentMatchProps | undefined = selectedMatch
    ? {
        tournamentMatchId: selectedMatch.id,
        side1Name: getParticipantName(selectedMatch.participant1),
        side2Name: getParticipantName(selectedMatch.participant2),
        side1Participant: selectedMatch.participant1
          ? {
              user: selectedMatch.participant1.user,
              team: selectedMatch.participant1.team,
              placeholderMember: selectedMatch.participant1.placeholderMember,
            }
          : undefined,
        side2Participant: selectedMatch.participant2
          ? {
              user: selectedMatch.participant2.user,
              team: selectedMatch.participant2.team,
              placeholderMember: selectedMatch.participant2.placeholderMember,
            }
          : undefined,
        onSubmitAction: recordTournamentMatchResultAction,
      }
    : undefined;

  return (
    <>
      <TournamentBracket
        bracket={bracket}
        totalRounds={totalRounds}
        onMatchClick={handleMatchClick}
        onViewMatch={handleViewMatch}
        canManage={canManage}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Match Result</DialogTitle>
          </DialogHeader>
          {selectedMatch && tournamentMatch && (
            <RecordH2HMatchForm
              leagueId={leagueId}
              gameTypeId={gameTypeId}
              config={config}
              participantOptions={[] as ParticipantOption[]}
              currentUserId=""
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              tournamentMatch={tournamentMatch}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
