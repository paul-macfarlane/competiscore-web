import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/server/auth";
import { TimeRange } from "@/lib/shared/constants";
import { parseHighScoreConfig } from "@/lib/shared/game-config-parser";
import { getGameType } from "@/services/game-types";
import {
  getHighScoreLeaderboard,
  getPersonalBest,
  getUserRank,
} from "@/services/leaderboards";
import { Trophy, User, Users } from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string; gameTypeId: string }>;
  searchParams: Promise<{ timeRange?: string }>;
};

export default async function LeaderboardPage({
  params,
  searchParams,
}: PageProps) {
  const { id: leagueId, gameTypeId } = await params;
  const { timeRange = TimeRange.ALL } = await searchParams;

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
      }),
      getPersonalBest(session.user.id, gameTypeId),
      getUserRank(session.user.id, gameTypeId),
    ]);

  if (gameTypeResult.error || leaderboardResult.error) {
    notFound();
  }

  const gameType = gameTypeResult.data!;
  const leaderboard = leaderboardResult.data!;
  const personalBest = personalBestResult.data;
  const userRank = rankResult.data;

  const config = parseHighScoreConfig(gameType.config);
  const scoreDescription = config.scoreDescription || "Points";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
                  key={`${entry.participantType}-${entry.participantId}`}
                  className="flex items-center gap-4 p-4"
                >
                  <div className="flex w-12 items-center justify-center">
                    {entry.rank <= 3 ? (
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                          entry.rank === 1
                            ? "bg-primary text-primary-foreground"
                            : entry.rank === 2
                              ? "bg-muted text-foreground"
                              : "bg-accent text-accent-foreground"
                        }`}
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

                  {entry.participantId === session.user.id &&
                    entry.participantType === "user" && (
                      <Badge variant="secondary">You</Badge>
                    )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
