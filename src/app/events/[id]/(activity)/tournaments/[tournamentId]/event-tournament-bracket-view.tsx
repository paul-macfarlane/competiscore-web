"use client";

import {
  RecordH2HMatchForm,
  TournamentMatchProps,
} from "@/components/record-h2h-match-form";
import { TeamColorBadge } from "@/components/team-color-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { H2HConfig } from "@/lib/shared/game-templates";
import { ParticipantOption } from "@/lib/shared/participant-options";
import { cn } from "@/lib/shared/utils";
import { Pencil, Trophy, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  recordEventTournamentMatchResultAction,
  undoEventTournamentMatchResultAction,
} from "../../../actions";

type PartnershipMember = {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  } | null;
  placeholderParticipant: { id: string; displayName: string } | null;
};

type BracketParticipant = {
  id: string;
  team: { id: string; name: string; logo: string | null; color: string | null };
  user: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  } | null;
  placeholderParticipant: { id: string; displayName: string } | null;
  members?: PartnershipMember[];
};

type BracketMatch = {
  id: string;
  round: number;
  position: number;
  participant1?: BracketParticipant | null;
  participant2?: BracketParticipant | null;
  participant1Score: number | null;
  participant2Score: number | null;
  participant1Wins: number;
  participant2Wins: number;
  winnerId: string | null;
  eventMatchId: string | null;
};

type Props = {
  bracket: BracketMatch[];
  totalRounds: number;
  canManage: boolean;
  canRecordMatches?: boolean;
  eventId: string;
  tournamentId: string;
  isTeamTournament?: boolean;
  config?: H2HConfig;
  bestOf: number;
  roundBestOf: string | null;
};

function getRoundBestOf(
  round: number,
  bestOf: number,
  roundBestOf: string | null,
): number {
  if (roundBestOf) {
    try {
      const config = JSON.parse(roundBestOf) as Record<string, number>;
      const value = config[String(round)];
      if (typeof value === "number" && value >= 1) return value;
    } catch {
      // fall through
    }
  }
  return bestOf;
}

function getRoundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Semifinal";
  if (round === totalRounds - 2) return "Quarterfinal";
  return `Round ${round}`;
}

function getParticipantName(
  participant: BracketParticipant | null | undefined,
): string {
  if (!participant) return "TBD";
  if (participant.members && participant.members.length > 0) {
    return participant.members
      .map((m) => {
        if (m.user?.id) return m.user.name;
        if (m.placeholderParticipant?.id)
          return m.placeholderParticipant.displayName;
        return "Unknown";
      })
      .join(" & ");
  }
  if (participant.user?.id) return participant.user.name;
  if (participant.placeholderParticipant?.id)
    return participant.placeholderParticipant.displayName;
  return participant.team.name;
}

export function EventTournamentBracketView({
  bracket,
  totalRounds,
  canManage,
  canRecordMatches,
  isTeamTournament,
  config,
  bestOf: defaultBestOf,
  roundBestOf,
}: Props) {
  const router = useRouter();
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const rounds: Map<number, BracketMatch[]> = new Map();
  for (const match of bracket) {
    const existing = rounds.get(match.round) ?? [];
    existing.push(match);
    rounds.set(match.round, existing);
  }

  for (const [, matches] of rounds) {
    matches.sort((a, b) => a.position - b.position);
  }

  const handleMatchClick = (match: BracketMatch) => {
    if (!canRecordMatches || !config) return;
    if (match.winnerId != null) return;
    if (!match.participant1 || !match.participant2) return;
    setSelectedMatch(match);
    setDialogOpen(true);
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
        side1Participant:
          selectedMatch.participant1 &&
          !selectedMatch.participant1.members?.length
            ? {
                user: selectedMatch.participant1.user,
                team: isTeamTournament
                  ? selectedMatch.participant1.team
                  : undefined,
                placeholderMember:
                  selectedMatch.participant1.placeholderParticipant,
              }
            : undefined,
        side2Participant:
          selectedMatch.participant2 &&
          !selectedMatch.participant2.members?.length
            ? {
                user: selectedMatch.participant2.user,
                team: isTeamTournament
                  ? selectedMatch.participant2.team
                  : undefined,
                placeholderMember:
                  selectedMatch.participant2.placeholderParticipant,
              }
            : undefined,
        side1TeamName: !isTeamTournament
          ? selectedMatch.participant1?.team.name
          : undefined,
        side2TeamName: !isTeamTournament
          ? selectedMatch.participant2?.team.name
          : undefined,
        side1TeamColor: !isTeamTournament
          ? selectedMatch.participant1?.team.color
          : undefined,
        side2TeamColor: !isTeamTournament
          ? selectedMatch.participant2?.team.color
          : undefined,
        onSubmitAction: recordEventTournamentMatchResultAction,
      }
    : undefined;

  const isClickable = (match: BracketMatch) =>
    canRecordMatches &&
    config &&
    match.winnerId == null &&
    match.participant1 != null &&
    match.participant2 != null;

  return (
    <>
      <div className="flex gap-6 overflow-x-auto pb-4">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
          const matches = rounds.get(round) ?? [];
          return (
            <div key={round} className="flex min-w-[220px] flex-col gap-4">
              <h3 className="text-center text-sm font-semibold">
                {getRoundLabel(round, totalRounds)}
              </h3>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    canManage={canManage}
                    isTeamTournament={isTeamTournament}
                    clickable={isClickable(match)}
                    onClick={() => handleMatchClick(match)}
                    round={round}
                    totalRounds={totalRounds}
                    roundBestOf={getRoundBestOf(
                      round,
                      defaultBestOf,
                      roundBestOf,
                    )}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {config && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedMatch
                  ? (() => {
                      const bo = getRoundBestOf(
                        selectedMatch.round,
                        defaultBestOf,
                        roundBestOf,
                      );
                      if (bo <= 1) return "Record Match Result";
                      const gameNum =
                        selectedMatch.participant1Wins +
                        selectedMatch.participant2Wins +
                        1;
                      return `Record Game ${gameNum} of Best of ${bo} (${selectedMatch.participant1Wins}-${selectedMatch.participant2Wins})`;
                    })()
                  : "Record Match Result"}
              </DialogTitle>
            </DialogHeader>
            {selectedMatch && tournamentMatch && (
              <RecordH2HMatchForm
                leagueId=""
                gameTypeId=""
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
      )}
    </>
  );
}

function MatchCard({
  match,
  canManage,
  isTeamTournament,
  clickable,
  onClick,
  round,
  totalRounds,
  roundBestOf,
}: {
  match: BracketMatch;
  canManage: boolean;
  isTeamTournament?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  round: number;
  totalRounds: number;
  roundBestOf: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isSeriesDecided = match.winnerId != null;
  const hasGames = match.participant1Wins > 0 || match.participant2Wins > 0;
  const isMultiGame = roundBestOf > 1;

  const handleUndo = () => {
    startTransition(async () => {
      const result = await undoEventTournamentMatchResultAction({
        tournamentMatchId: match.id,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Match result undone");
        router.refresh();
      }
    });
  };

  return (
    <Card
      className={cn(
        "w-[220px]",
        clickable && "cursor-pointer hover:border-primary/50 transition-colors",
      )}
      onClick={clickable ? onClick : undefined}
    >
      <CardContent className="space-y-1 p-3">
        <ParticipantRow
          participant={match.participant1}
          score={isMultiGame ? match.participant1Wins : match.participant1Score}
          isWinner={
            match.winnerId != null && match.participant1?.id === match.winnerId
          }
          isTeamTournament={isTeamTournament}
        />
        <div className="border-muted border-t" />
        <ParticipantRow
          participant={match.participant2}
          score={isMultiGame ? match.participant2Wins : match.participant2Score}
          isWinner={
            match.winnerId != null && match.participant2?.id === match.winnerId
          }
          isTeamTournament={isTeamTournament}
        />
      </CardContent>
      {isSeriesDecided && round === totalRounds && (
        <div className="border-t px-3 py-1 flex items-center justify-center gap-1 text-xs font-medium text-rank-gold-text bg-rank-gold-bg">
          <Trophy className="h-3 w-3" />
          Champion
        </div>
      )}
      {isSeriesDecided && (
        <div className="border-t px-3 py-1 flex items-center justify-center gap-2">
          <Badge variant="outline" className="text-xs">
            Complete
          </Badge>
          {canManage && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleUndo();
              }}
              disabled={isPending}
              title="Undo result"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
      {!isSeriesDecided && hasGames && isMultiGame && (
        <div className="border-t px-3 py-1 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>
            Series: {match.participant1Wins}-{match.participant2Wins} (Bo
            {roundBestOf})
          </span>
          {canManage && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleUndo();
              }}
              disabled={isPending}
              title="Undo last game"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
      {clickable && (
        <div className="border-t px-3 py-1 flex items-center justify-center gap-1 text-xs font-medium text-primary">
          <Pencil className="h-3 w-3" />
          {hasGames && isMultiGame ? "Record Next Game" : "Record Result"}
        </div>
      )}
    </Card>
  );
}

function ParticipantRow({
  participant,
  score,
  isWinner,
  isTeamTournament,
}: {
  participant?: BracketParticipant | null;
  score: number | null;
  isWinner: boolean;
  isTeamTournament?: boolean;
}) {
  if (!participant) {
    return (
      <div className="text-muted-foreground flex items-center justify-between py-1 text-sm italic">
        <span>TBD</span>
      </div>
    );
  }

  const name = getParticipantName(participant);

  return (
    <div
      className={cn(
        "flex items-center justify-between py-1 px-1 text-sm rounded",
        isWinner && "font-semibold bg-primary/10",
      )}
    >
      <div className="flex min-w-0 flex-col">
        <span className="truncate">{name}</span>
        {!isTeamTournament &&
          (participant.team.color ? (
            <TeamColorBadge
              name={participant.team.name}
              color={participant.team.color}
            />
          ) : (
            <span className="text-muted-foreground truncate text-xs">
              {participant.team.name}
            </span>
          ))}
      </div>
      {score != null && (
        <span className={cn("ml-2 shrink-0", isWinner && "text-primary")}>
          {score}
        </span>
      )}
    </div>
  );
}
