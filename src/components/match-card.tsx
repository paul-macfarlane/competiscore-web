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
import { cn } from "@/lib/shared/utils";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight } from "lucide-react";
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

type MatchCardProps = {
  matchId: string;
  leagueId: string;
  gameTypeName?: string | null;
  playedAt: Date | string;
  status: string;
  participants: MatchParticipant[];
  variant?: "compact" | "full";
};

export function MatchCard({
  matchId,
  leagueId,
  gameTypeName,
  playedAt,
  status,
  participants,
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
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {variant === "full" && gameTypeName && (
              <span className="font-semibold text-base truncate">
                {gameTypeName}
              </span>
            )}
            <Badge variant={statusBadgeVariant(status)} className="shrink-0">
              {MATCH_STATUS_LABELS[status as MatchStatus]}
            </Badge>
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
                  variant={
                    side1[0].result === MatchResult.WIN
                      ? "default"
                      : side1[0].result === MatchResult.LOSS
                        ? "destructive"
                        : "secondary"
                  }
                  className="shrink-0"
                >
                  {MATCH_RESULT_LABELS[side1[0].result as MatchResult]}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-center py-1">
              {status === MatchStatus.COMPLETED &&
              side1[0]?.score !== null &&
              side2[0]?.score !== null ? (
                <span className="text-2xl font-bold tabular-nums">
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
                  variant={
                    side2[0].result === MatchResult.WIN
                      ? "default"
                      : side2[0].result === MatchResult.LOSS
                        ? "destructive"
                        : "secondary"
                  }
                  className="shrink-0"
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
        <Button asChild size="sm" className="w-full">
          <Link href={`/leagues/${leagueId}/matches/${matchId}`}>
            View Details
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
