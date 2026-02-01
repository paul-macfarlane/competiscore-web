import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/server/auth";
import { TimeRange } from "@/lib/shared/constants";
import { parseHighScoreConfig } from "@/lib/shared/game-config-parser";
import { cn } from "@/lib/shared/utils";
import { getGameType } from "@/services/game-types";
import {
  getHighScoreLeaderboard,
  getPersonalBest,
  getUserRank,
} from "@/services/leaderboards";
import { Trophy, User, Users } from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

const ITEMS_PER_PAGE = 10;

type PageProps = {
  params: Promise<{ id: string; gameTypeId: string }>;
  searchParams: Promise<{ timeRange?: string; page?: string }>;
};

export default async function LeaderboardPage({
  params,
  searchParams,
}: PageProps) {
  const { id: leagueId, gameTypeId } = await params;
  const { timeRange = TimeRange.ALL, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const [gameTypeResult, leaderboardResult, personalBestResult, rankResult] =
    await Promise.all([
      getGameType(session.user.id, gameTypeId),
      getHighScoreLeaderboard(session.user.id, gameTypeId, {
        timeRange: timeRange as TimeRange,
        limit: ITEMS_PER_PAGE,
        offset,
      }),
      getPersonalBest(session.user.id, gameTypeId),
      getUserRank(session.user.id, gameTypeId),
    ]);

  if (gameTypeResult.error || leaderboardResult.error) {
    notFound();
  }

  const gameType = gameTypeResult.data!;
  const { leaderboard, total } = leaderboardResult.data!;
  const personalBest = personalBestResult.data;
  const userRank = rankResult.data;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const config = parseHighScoreConfig(gameType.config);
  const scoreDescription = config.scoreDescription || "Points";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Game Types", href: `/leagues/${leagueId}/game-types` },
          {
            label: gameType.name,
            href: `/leagues/${leagueId}/game-types/${gameTypeId}`,
          },
          { label: "Leaderboard" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{gameType.name}</h1>
        <p className="text-muted-foreground mt-1">Leaderboard</p>
      </div>

      {(personalBest || userRank) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Performance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {userRank && (
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                  <Trophy className="text-primary h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Rank</p>
                  <p className="text-2xl font-bold">#{userRank.rank}</p>
                </div>
              </div>
            )}
            {personalBest && (
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                  <Trophy className="text-primary h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Personal Best</p>
                  <p className="text-2xl font-bold">
                    {personalBest.score.toLocaleString()} {scoreDescription}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={timeRange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value={TimeRange.WEEK} asChild>
            <a
              href={`/leagues/${leagueId}/game-types/${gameTypeId}/leaderboard?timeRange=${TimeRange.WEEK}`}
            >
              Week
            </a>
          </TabsTrigger>
          <TabsTrigger value={TimeRange.MONTH} asChild>
            <a
              href={`/leagues/${leagueId}/game-types/${gameTypeId}/leaderboard?timeRange=${TimeRange.MONTH}`}
            >
              Month
            </a>
          </TabsTrigger>
          <TabsTrigger value={TimeRange.YEAR} asChild>
            <a
              href={`/leagues/${leagueId}/game-types/${gameTypeId}/leaderboard?timeRange=${TimeRange.YEAR}`}
            >
              Year
            </a>
          </TabsTrigger>
          <TabsTrigger value={TimeRange.ALL} asChild>
            <a
              href={`/leagues/${leagueId}/game-types/${gameTypeId}/leaderboard?timeRange=${TimeRange.ALL}`}
            >
              All Time
            </a>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {leaderboard.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Trophy className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No scores yet.</p>
              <p className="text-sm mt-2">Be the first to submit a score!</p>
            </div>
          ) : (
            <div className="divide-y">
              {leaderboard.map((entry) => (
                <div
                  key={entry.entryId}
                  className="flex items-center gap-4 p-4"
                >
                  <div className="flex w-12 items-center justify-center">
                    {entry.rank <= 3 ? (
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full font-bold",
                          entry.rank === 1 &&
                            "bg-rank-gold-bg text-rank-gold-text",
                          entry.rank === 2 &&
                            "bg-rank-silver-bg text-rank-silver-text",
                          entry.rank === 3 &&
                            "bg-rank-bronze-bg text-rank-bronze-text",
                        )}
                      >
                        {entry.rank}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-lg font-semibold">
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  <Avatar className="h-10 w-10">
                    {entry.participantImage && (
                      <AvatarImage
                        src={entry.participantImage}
                        alt={entry.participantName}
                      />
                    )}
                    <AvatarFallback>
                      {entry.participantType === "team" ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <p className="font-medium">{entry.participantName}</p>
                    {entry.participantType === "user" &&
                      entry.participantUsername && (
                        <p className="text-sm text-muted-foreground">
                          @{entry.participantUsername}
                        </p>
                      )}
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {entry.bestScore.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {scoreDescription}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, total)}-
          {Math.min(page * ITEMS_PER_PAGE, total)} of {total} entries
        </p>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={
                  page > 1
                    ? `/leagues/${leagueId}/game-types/${gameTypeId}/leaderboard?timeRange=${timeRange}&page=${page - 1}`
                    : "#"
                }
                aria-disabled={page <= 1}
                className={cn(page <= 1 && "pointer-events-none opacity-50")}
              />
            </PaginationItem>

            {page > 2 && (
              <PaginationItem>
                <PaginationLink
                  href={`/leagues/${leagueId}/game-types/${gameTypeId}/leaderboard?timeRange=${timeRange}&page=1`}
                >
                  1
                </PaginationLink>
              </PaginationItem>
            )}

            {page > 3 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {page > 1 && (
              <PaginationItem>
                <PaginationLink
                  href={`/leagues/${leagueId}/game-types/${gameTypeId}/leaderboard?timeRange=${timeRange}&page=${page - 1}`}
                >
                  {page - 1}
                </PaginationLink>
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationLink
                href={`/leagues/${leagueId}/game-types/${gameTypeId}/leaderboard?timeRange=${timeRange}&page=${page}`}
                isActive
              >
                {page}
              </PaginationLink>
            </PaginationItem>

            {page < totalPages && (
              <PaginationItem>
                <PaginationLink
                  href={`/leagues/${leagueId}/game-types/${gameTypeId}/leaderboard?timeRange=${timeRange}&page=${page + 1}`}
                >
                  {page + 1}
                </PaginationLink>
              </PaginationItem>
            )}

            {page < totalPages - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {page < totalPages - 1 && (
              <PaginationItem>
                <PaginationLink
                  href={`/leagues/${leagueId}/game-types/${gameTypeId}/leaderboard?timeRange=${timeRange}&page=${totalPages}`}
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext
                href={
                  page < totalPages
                    ? `/leagues/${leagueId}/game-types/${gameTypeId}/leaderboard?timeRange=${timeRange}&page=${page + 1}`
                    : "#"
                }
                aria-disabled={page >= totalPages}
                className={cn(
                  page >= totalPages && "pointer-events-none opacity-50",
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
