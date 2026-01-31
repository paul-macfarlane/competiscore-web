import {
  ParticipantData,
  getParticipantName,
} from "@/components/participant-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/server/auth";
import {
  MATCH_RESULT_LABELS,
  MATCH_STATUS_LABELS,
  MatchResult,
  MatchStatus,
} from "@/lib/shared/constants";
import { cn } from "@/lib/shared/utils";
import { getLeagueGameTypes } from "@/services/game-types";
import {
  HighScoreActivityItem,
  MatchWithGameTypeAndParticipants,
  getLeagueActivityPaginated,
} from "@/services/matches";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MatchFilters } from "./match-filters";

const ITEMS_PER_PAGE = 20;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; gameTypeId?: string }>;
};

export default async function LeagueMatchesPage({
  params,
  searchParams,
}: PageProps) {
  const { id: leagueId } = await params;
  const { page: pageParam, gameTypeId } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const [activityResult, gameTypesResult] = await Promise.all([
    getLeagueActivityPaginated(session.user.id, leagueId, {
      limit: ITEMS_PER_PAGE,
      offset,
      gameTypeId: gameTypeId || undefined,
    }),
    getLeagueGameTypes(session.user.id, leagueId),
  ]);

  if (activityResult.error) {
    notFound();
  }

  const { items, matchCount, highScoreCount } = activityResult.data!;
  const gameTypes = gameTypesResult.data || [];
  const total = matchCount + highScoreCount;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Activity History</h1>
        <p className="text-muted-foreground mt-1">
          All matches and scores recorded in this league
        </p>
      </div>

      <MatchFilters
        leagueId={leagueId}
        gameTypes={gameTypes}
        selectedGameTypeId={gameTypeId}
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No activity found.</p>
            {gameTypeId ? (
              <p className="text-sm mt-2">
                Try clearing the filter or selecting a different game type.
              </p>
            ) : (
              <p className="text-sm mt-2">
                Go to a game type and record a match or score to get started.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {items.map((item) =>
              item.type === "match" ? (
                <MatchCard key={item.id} match={item} leagueId={leagueId} />
              ) : (
                <HighScoreCard
                  key={item.id}
                  highScore={item}
                  leagueId={leagueId}
                />
              ),
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1}-{Math.min(offset + ITEMS_PER_PAGE, total)}{" "}
                of {total} items
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={page <= 1}
                >
                  <Link
                    href={`/leagues/${leagueId}/matches?page=${page - 1}${gameTypeId ? `&gameTypeId=${gameTypeId}` : ""}`}
                    aria-disabled={page <= 1}
                    className={cn(
                      page <= 1 && "pointer-events-none opacity-50",
                    )}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Link>
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={page >= totalPages}
                >
                  <Link
                    href={`/leagues/${leagueId}/matches?page=${page + 1}${gameTypeId ? `&gameTypeId=${gameTypeId}` : ""}`}
                    aria-disabled={page >= totalPages}
                    className={cn(
                      page >= totalPages && "pointer-events-none opacity-50",
                    )}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type MatchCardProps = {
  match: { type: "match" } & MatchWithGameTypeAndParticipants;
  leagueId: string;
};

function MatchCard({ match, leagueId }: MatchCardProps) {
  const side1 = match.participants.filter((p) => p.side === 1);
  const side2 = match.participants.filter((p) => p.side === 2);
  const isH2H = side1.length > 0 && side2.length > 0;
  const isFFA = match.participants.some((p) => p.rank !== null);

  const getParticipantNameFromMatch = (
    p: MatchCardProps["match"]["participants"][0],
  ) => {
    return getParticipantName(p as ParticipantData);
  };

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
    <Link href={`/leagues/${leagueId}/matches/${match.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                {match.gameType?.name || "Match"}
              </CardTitle>
              <Badge variant={statusBadgeVariant(match.status)}>
                {MATCH_STATUS_LABELS[match.status as MatchStatus]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(match.playedAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isH2H && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <ParticipantList
                  participants={side1}
                  getParticipantName={getParticipantNameFromMatch}
                />
              </div>
              <div className="text-center px-3 shrink-0">
                {match.status === MatchStatus.COMPLETED ? (
                  side1[0]?.score !== null && side2[0]?.score !== null ? (
                    <span className="text-xl font-bold">
                      {side1[0]?.score} - {side2[0]?.score}
                    </span>
                  ) : (
                    <span className="text-xl font-bold">
                      {side1[0]?.result === MatchResult.WIN
                        ? "W"
                        : side1[0]?.result === MatchResult.LOSS
                          ? "L"
                          : "D"}{" "}
                      -{" "}
                      {side2[0]?.result === MatchResult.WIN
                        ? "W"
                        : side2[0]?.result === MatchResult.LOSS
                          ? "L"
                          : "D"}
                    </span>
                  )
                ) : (
                  <span className="text-lg font-medium text-muted-foreground">
                    vs
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <ParticipantList
                  participants={side2}
                  getParticipantName={getParticipantNameFromMatch}
                  align="right"
                />
              </div>
            </div>
          )}

          {isFFA && (
            <div className="space-y-1.5">
              {match.participants
                .sort((a, b) => (a.rank || 999) - (b.rank || 999))
                .slice(0, 3)
                .map((p, index) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium",
                        index === 0 && "bg-rank-gold-bg text-rank-gold-text",
                        index === 1 &&
                          "bg-rank-silver-bg text-rank-silver-text",
                        index === 2 &&
                          "bg-rank-bronze-bg text-rank-bronze-text",
                      )}
                    >
                      {p.rank || index + 1}
                    </span>
                    <span className="truncate">
                      {getParticipantNameFromMatch(p)}
                    </span>
                    {p.score !== null && (
                      <span className="text-muted-foreground ml-auto shrink-0">
                        {p.score}
                      </span>
                    )}
                  </div>
                ))}
              {match.participants.length > 3 && (
                <p className="text-xs text-muted-foreground pl-8">
                  +{match.participants.length - 3} more
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

type HighScoreCardProps = {
  highScore: HighScoreActivityItem;
  leagueId: string;
};

function HighScoreCard({ highScore, leagueId }: HighScoreCardProps) {
  const participantName = getParticipantName(highScore.participant);

  return (
    <Link
      href={`/leagues/${leagueId}/game-types/${highScore.gameTypeId}/leaderboard`}
    >
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                {highScore.gameType?.name || "High Score"}
              </CardTitle>
              <Badge variant="secondary">
                <Trophy className="h-3 w-3 mr-1" />
                Score
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(highScore.achievedAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <span className="font-medium">{participantName}</span>
            <span className="text-xl font-bold">
              {highScore.score.toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ParticipantList({
  participants,
  getParticipantName,
  align = "left",
}: {
  participants: MatchCardProps["match"]["participants"];
  getParticipantName: (p: MatchCardProps["match"]["participants"][0]) => string;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("space-y-0.5", align === "right" && "text-right")}>
      {participants.map((p) => (
        <div key={p.id} className="text-sm truncate">
          <span className="font-medium">{getParticipantName(p)}</span>
          {p.result && (
            <Badge
              variant={
                p.result === MatchResult.WIN
                  ? "default"
                  : p.result === MatchResult.LOSS
                    ? "destructive"
                    : "secondary"
              }
              className="ml-2 text-xs"
            >
              {MATCH_RESULT_LABELS[p.result as MatchResult]}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}
