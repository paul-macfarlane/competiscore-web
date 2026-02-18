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
  teamName?: string;
  teamColor?: string | null;
  points?: number | null;
};

type MatchCardTournament = {
  tournamentId: string;
  tournamentName: string;
  tournamentLogo?: string | null;
  leagueId?: string;
  eventId?: string;
  round: number;
  totalRounds: number | null;
};

type MatchCardProps = {
  matchId: string;
  leagueId?: string;
  detailHref?: string;
  gameTypeName?: string | null;
  scoreLabel?: string | null;
  playedAt: Date | string;
  status?: string;
  participants: MatchParticipant[];
  tournament?: MatchCardTournament | null;
  variant?: "compact" | "full";
};

export function MatchCard({
  matchId,
  leagueId,
  detailHref,
  gameTypeName,
  scoreLabel,
  playedAt,
  status = MatchStatus.COMPLETED,
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

  const hasScores =
    status === MatchStatus.COMPLETED &&
    side1[0]?.score !== null &&
    side2[0]?.score !== null;

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
          <div className="flex items-center gap-1 shrink-0">
            {tournament && (
              <Link
                href={
                  tournament.eventId
                    ? `/events/${tournament.eventId}/tournaments/${tournament.tournamentId}`
                    : `/leagues/${tournament.leagueId}/tournaments/${tournament.tournamentId}`
                }
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
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(playedAt), {
            addSuffix: true,
          })}
        </p>
      </CardHeader>

      <CardContent className="pb-4">
        {isH2H && (
          <>
            {/* Desktop: horizontal layout */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex-1 min-w-0">
                {side1.map((p) => (
                  <ParticipantDisplay
                    key={p.id}
                    participant={p as ParticipantData}
                    showAvatar
                    showUsername
                    teamName={p.teamName}
                    teamColor={p.teamColor}
                    size="md"
                  />
                ))}
                {side1[0]?.points != null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    +{side1[0].points} pts
                  </p>
                )}
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
              <div className="text-center shrink-0 px-2">
                {hasScores ? (
                  <div>
                    <span className="text-2xl font-extrabold tabular-nums">
                      {side1[0]?.score} - {side2[0]?.score}
                    </span>
                    {scoreLabel && (
                      <p className="text-xs text-muted-foreground">
                        {scoreLabel}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    vs
                  </span>
                )}
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
              <div className="flex-1 min-w-0 text-right">
                {side2.map((p) => (
                  <ParticipantDisplay
                    key={p.id}
                    participant={p as ParticipantData}
                    showAvatar
                    showUsername
                    teamName={p.teamName}
                    teamColor={p.teamColor}
                    size="md"
                    align="right"
                  />
                ))}
                {side2[0]?.points != null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    +{side2[0].points} pts
                  </p>
                )}
              </div>
            </div>

            {/* Mobile: vertical with inline scores */}
            <div className="sm:hidden space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  {side1.map((p) => (
                    <ParticipantDisplay
                      key={p.id}
                      participant={p as ParticipantData}
                      showAvatar
                      showUsername
                      teamName={p.teamName}
                      teamColor={p.teamColor}
                      size="md"
                    />
                  ))}
                  {side1[0]?.points != null && (
                    <p className="text-sm text-muted-foreground mt-1">
                      +{side1[0].points} pts
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasScores && (
                    <span className="text-lg font-bold tabular-nums">
                      {side1[0]?.score}
                      {scoreLabel && (
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          {scoreLabel}
                        </span>
                      )}
                    </span>
                  )}
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
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  {side2.map((p) => (
                    <ParticipantDisplay
                      key={p.id}
                      participant={p as ParticipantData}
                      showAvatar
                      showUsername
                      teamName={p.teamName}
                      teamColor={p.teamColor}
                      size="md"
                    />
                  ))}
                  {side2[0]?.points != null && (
                    <p className="text-sm text-muted-foreground mt-1">
                      +{side2[0].points} pts
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasScores && (
                    <span className="text-lg font-bold tabular-nums">
                      {side2[0]?.score}
                      {scoreLabel && (
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          {scoreLabel}
                        </span>
                      )}
                    </span>
                  )}
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
            </div>
          </>
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
                      teamName={p.teamName}
                      teamColor={p.teamColor}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.score !== null && (
                      <span className="font-semibold tabular-nums">
                        {p.score}
                        {scoreLabel && (
                          <span className="text-xs text-muted-foreground font-normal ml-1">
                            {scoreLabel}
                          </span>
                        )}
                      </span>
                    )}
                    {p.points != null && (
                      <span className="text-sm text-muted-foreground tabular-nums">
                        +{p.points} pts
                      </span>
                    )}
                  </div>
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

      {(detailHref || leagueId) && (
        <CardFooter className="pt-0 pb-4">
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link
              href={detailHref ?? `/leagues/${leagueId}/matches/${matchId}`}
            >
              View Details
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
