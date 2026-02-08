import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  MATCH_RESULT_LABELS,
  MATCH_STATUS_LABELS,
  MatchResult,
  MatchStatus,
} from "@/lib/shared/constants";
import { getResultBadgeClasses } from "@/lib/shared/match-styles";
import { cn } from "@/lib/shared/utils";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type MatchParticipant = {
  id: string;
  side: number | null;
  rank: number | null;
  score: number | null;
  result: string | null;
  user?: { name: string } | null;
  team?: { name: string } | null;
  placeholderMember?: { displayName: string } | null;
};

type MatchCardTournament = {
  tournamentId: string;
  tournamentName: string;
  tournamentLogo?: string | null;
  leagueId: string;
  round: number;
  totalRounds: number | null;
};

type MatchCardProps = {
  matchId: string;
  leagueId: string;
  gameTypeName?: string | null;
  playedAt: Date | string;
  status: string;
  participants: MatchParticipant[];
  tournament?: MatchCardTournament | null;
  variant?: "compact" | "full";
};

export function MatchCard({
  matchId,
  leagueId,
  gameTypeName,
  playedAt,
  status,
  participants,
  tournament,
  variant = "full",
}: MatchCardProps) {
  const side1 = participants.filter((p) => p.side === 1);
  const side2 = participants.filter((p) => p.side === 2);
  const isH2H = side1.length > 0 && side2.length > 0;
  const isFFA = participants.some((p) => p.rank !== null);

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case MatchStatus.COMPLETED:
        return "default";
      case MatchStatus.PENDING:
      case MatchStatus.ACCEPTED:
        return "secondary";
      case MatchStatus.DECLINED:
      case MatchStatus.CANCELLED:
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {gameTypeName && (
              <span
                className={cn(
                  "font-semibold truncate",
                  variant === "full" ? "text-base" : "text-sm",
                )}
              >
                {gameTypeName}
              </span>
            )}
            <Badge variant={statusBadgeVariant(status)} className="shrink-0">
              {MATCH_STATUS_LABELS[status as MatchStatus]}
            </Badge>
          </div>
          {tournament && (
            <Link
              href={`/leagues/${tournament.leagueId}/tournaments/${tournament.tournamentId}`}
              className="shrink-0"
            >
              <Badge variant="outline" className="gap-1 hover:bg-accent">
                {tournament.tournamentLogo ? (
                  <div className="relative h-3 w-3 shrink-0">
                    <Image
                      src={tournament.tournamentLogo}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <Trophy className="h-3 w-3" />
                )}
                {tournament.tournamentName}
              </Badge>
            </Link>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(playedAt), {
            addSuffix: true,
          })}
        </p>
      </CardHeader>

      <CardContent className="pb-4">
        {isH2H && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                {side1.map((p) => (
                  <ParticipantDisplay
                    key={p.id}
                    participant={p as ParticipantData}
                    showAvatar
                    showUsername
                    size="md"
                  />
                ))}
              </div>
              {side1[0]?.result && (
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
                    getResultBadgeClasses(side1[0].result),
                  )}
                >
                  {MATCH_RESULT_LABELS[side1[0].result as MatchResult]}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-center py-1">
              {status === MatchStatus.COMPLETED &&
              side1[0]?.score !== null &&
              side2[0]?.score !== null ? (
                <span className="text-3xl font-extrabold tabular-nums">
                  {side1[0]?.score} - {side2[0]?.score}
                </span>
              ) : (
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  vs
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                {side2.map((p) => (
                  <ParticipantDisplay
                    key={p.id}
                    participant={p as ParticipantData}
                    showAvatar
                    showUsername
                    size="md"
                  />
                ))}
              </div>
              {side2[0]?.result && (
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
                    getResultBadgeClasses(side2[0].result),
                  )}
                >
                  {MATCH_RESULT_LABELS[side2[0].result as MatchResult]}
                </Badge>
              )}
            </div>
          </div>
        )}

        {isFFA && (
          <div className="space-y-2">
            {participants
              .sort((a, b) => (a.rank || 999) - (b.rank || 999))
              .slice(0, 3)
              .map((p, index) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 py-1.5 border-b last:border-0"
                >
                  <span
                    className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold shrink-0",
                      index === 0 && "bg-rank-gold-bg text-rank-gold-text",
                      index === 1 && "bg-rank-silver-bg text-rank-silver-text",
                      index === 2 && "bg-rank-bronze-bg text-rank-bronze-text",
                    )}
                  >
                    {p.rank || index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <ParticipantDisplay
                      participant={p as ParticipantData}
                      showAvatar
                      showUsername
                      size="sm"
                    />
                  </div>
                  {p.score !== null && (
                    <span className="font-semibold tabular-nums shrink-0">
                      {p.score}
                    </span>
                  )}
                </div>
              ))}
            {participants.length > 3 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{participants.length - 3} more participant
                {participants.length - 3 === 1 ? "" : "s"}
              </p>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 pb-4">
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href={`/leagues/${leagueId}/matches/${matchId}`}>
            View Details
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
