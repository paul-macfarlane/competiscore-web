"use client";

import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { TournamentRoundMatchWithDetails } from "@/db/tournaments";
import { cn } from "@/lib/shared/utils";
import { CheckCircle2, Eye, Pencil, Trophy } from "lucide-react";

type TournamentBracketProps = {
  bracket: TournamentRoundMatchWithDetails[];
  totalRounds: number;
  onMatchClick?: (match: TournamentRoundMatchWithDetails) => void;
  onViewMatch?: (matchId: string) => void;
  canManage?: boolean;
};

function getRoundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Semifinals";
  if (round === totalRounds - 2) return "Quarterfinals";
  return `Round ${round}`;
}

export function TournamentBracket({
  bracket,
  totalRounds,
  onMatchClick,
  onViewMatch,
  canManage,
}: TournamentBracketProps) {
  const rounds: TournamentRoundMatchWithDetails[][] = [];
  for (let r = 1; r <= totalRounds; r++) {
    rounds.push(
      bracket
        .filter((m) => m.round === r)
        .sort((a, b) => a.position - b.position),
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4 md:-mx-6 md:px-6">
      <div
        className="flex gap-6 min-w-max py-4"
        style={{ minWidth: `${totalRounds * 260}px` }}
      >
        {rounds.map((roundMatches, roundIndex) => {
          const round = roundIndex + 1;
          return (
            <div key={round} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground text-center mb-2">
                {getRoundLabel(round, totalRounds)}
              </h3>
              <div
                className="flex flex-col justify-around flex-1 gap-4"
                style={{
                  paddingTop:
                    round > 1 ? `${Math.pow(2, round - 1) * 12}px` : 0,
                }}
              >
                {roundMatches.map((match) => {
                  const isReadyToPlay =
                    !match.winnerId &&
                    !match.isBye &&
                    !!match.participant1Id &&
                    !!match.participant2Id;

                  const canRecord = canManage && isReadyToPlay;

                  const isCompleted = !!match.winnerId && !match.isBye;

                  const canView = isCompleted && !!match.matchId;

                  const isClickable = canRecord || canView;

                  const handleClick = () => {
                    if (canRecord) {
                      onMatchClick?.(match);
                    } else if (canView && match.matchId) {
                      onViewMatch?.(match.matchId);
                    }
                  };

                  return (
                    <div
                      key={match.id}
                      className={cn(
                        "w-[240px] rounded-lg border bg-card text-card-foreground shadow-sm",
                        isClickable &&
                          "cursor-pointer hover:border-primary hover:shadow-md transition-all",
                        match.isBye && "opacity-60",
                      )}
                      onClick={handleClick}
                      style={{
                        marginBottom:
                          round > 1
                            ? `${Math.pow(2, round - 1) * 24}px`
                            : undefined,
                      }}
                    >
                      <MatchSlot
                        participant={match.participant1}
                        isWinner={match.winnerId === match.participant1Id}
                        isSet={!!match.participant1Id}
                        score={match.participant1Score}
                        showScore={isCompleted}
                      />
                      <div className="border-t" />
                      <MatchSlot
                        participant={match.isBye ? null : match.participant2}
                        isWinner={
                          !match.isBye &&
                          match.winnerId === match.participant2Id
                        }
                        isSet={!!match.participant2Id}
                        isBye={match.isBye}
                        score={match.participant2Score}
                        showScore={isCompleted}
                      />
                      {match.winnerId && round === totalRounds && (
                        <div className="border-t px-3 py-1 flex items-center justify-center gap-1 text-xs font-medium text-rank-gold-text bg-rank-gold-bg">
                          <Trophy className="h-3 w-3" />
                          Champion
                        </div>
                      )}
                      {match.isForfeit && match.winnerId && (
                        <div className="border-t px-3 py-1 text-center text-xs text-muted-foreground">
                          Forfeit
                        </div>
                      )}
                      {canRecord && (
                        <div className="border-t px-3 py-1 flex items-center justify-center gap-1 text-xs font-medium text-primary">
                          <Pencil className="h-3 w-3" />
                          Record Result
                        </div>
                      )}
                      {isCompleted && !match.isForfeit && canView && (
                        <div className="border-t px-3 py-1 flex items-center justify-center gap-1 text-xs font-medium text-primary">
                          <Eye className="h-3 w-3" />
                          View Details
                        </div>
                      )}
                      {isCompleted && !match.isForfeit && !canView && (
                        <div className="border-t px-3 py-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type MatchSlotParticipant = ParticipantData & { seed?: number | null };

function MatchSlot({
  participant,
  isWinner,
  isSet,
  isBye,
  score,
  showScore,
}: {
  participant: MatchSlotParticipant | null;
  isWinner: boolean;
  isSet: boolean;
  isBye?: boolean;
  score?: number | null;
  showScore?: boolean;
}) {
  if (isBye) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground italic">BYE</div>
    );
  }

  if (!participant || !isSet) {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground italic">TBD</div>
    );
  }

  return (
    <div
      className={cn(
        "px-3 py-2 flex items-center gap-2",
        isWinner && "bg-primary/10",
      )}
    >
      {participant.seed && (
        <span className="text-xs font-mono text-muted-foreground shrink-0">
          #{participant.seed}
        </span>
      )}
      <ParticipantDisplay
        participant={participant}
        showAvatar
        showUsername
        size="sm"
        className={cn("min-w-0 flex-1", isWinner && "font-semibold")}
      />
      {showScore && score != null && (
        <span
          className={cn(
            "text-sm font-mono tabular-nums shrink-0",
            isWinner
              ? "font-semibold text-foreground"
              : "text-muted-foreground",
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}
