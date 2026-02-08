import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { PaginationNav } from "@/components/pagination-nav";
import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/server/auth";
import { ELO_CONSTANTS, GameCategory, TimeRange } from "@/lib/shared/constants";
import { parseHighScoreConfig } from "@/lib/shared/game-config-parser";
import { cn } from "@/lib/shared/utils";
import {
  getGameTypeEloStandings,
  getParticipantEloRating,
} from "@/services/elo-ratings";
import { getGameType } from "@/services/game-types";
import {
  getHighScoreLeaderboard,
  getPersonalBest,
  getUserRank,
} from "@/services/leaderboards";
import { Award, TrendingUp, Trophy, User, Users } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string; gameTypeId: string }>;
  searchParams: Promise<{ timeRange?: string; page?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { gameTypeId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Leaderboard" };
  }

  const result = await getGameType(session.user.id, gameTypeId);
  if (result.error || !result.data) {
    return { title: "Leaderboard" };
  }

  return {
    title: `${result.data.name} - Leaderboard`,
    description: `Leaderboard and standings for ${result.data.name}`,
  };
}

export default async function GameTypeLeaderboardPage({
  params,
  searchParams,
}: PageProps) {
  const { id: leagueId, gameTypeId } = await params;
  const resolvedSearchParams = await searchParams;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const gameTypeResult = await getGameType(session.user.id, gameTypeId);
  if (gameTypeResult.error || !gameTypeResult.data) {
    notFound();
  }

  const gameType = gameTypeResult.data;
  if (gameType.category === GameCategory.HIGH_SCORE) {
    return (
      <HighScoreLeaderboardView
        leagueId={leagueId}
        gameTypeId={gameTypeId}
        gameType={gameType}
        userId={session.user.id}
        searchParams={resolvedSearchParams}
      />
    );
  }

  return (
    <EloStandingsView
      leagueId={leagueId}
      gameTypeId={gameTypeId}
      gameType={gameType}
      userId={session.user.id}
      searchParams={resolvedSearchParams}
    />
  );
}

const HIGH_SCORE_PER_PAGE = 10;

async function HighScoreLeaderboardView({
  leagueId,
  gameTypeId,
  gameType,
  userId,
  searchParams,
}: {
  leagueId: string;
  gameTypeId: string;
  gameType: { name: string; config: string };
  userId: string;
  searchParams: { timeRange?: string; page?: string };
}) {
  const timeRange = searchParams.timeRange || TimeRange.ALL;
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const offset = (page - 1) * HIGH_SCORE_PER_PAGE;

  const [leaderboardResult, personalBestResult, rankResult] = await Promise.all(
    [
      getHighScoreLeaderboard(userId, gameTypeId, {
        timeRange: timeRange as TimeRange,
        limit: HIGH_SCORE_PER_PAGE,
        offset,
      }),
      getPersonalBest(userId, gameTypeId),
      getUserRank(userId, gameTypeId),
    ],
  );

  if (leaderboardResult.error) {
    notFound();
  }

  const { leaderboard, total } = leaderboardResult.data!;
  const personalBest = personalBestResult.data;
  const userRank = rankResult.data;
  const totalPages = Math.ceil(total / HIGH_SCORE_PER_PAGE);

  const config = parseHighScoreConfig(gameType.config);
  const scoreDescription = config.scoreDescription || "Points";
  const basePath = `/leagues/${leagueId}/leaderboards/${gameTypeId}`;

  return (
    <div className="space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Leaderboards", href: `/leagues/${leagueId}/leaderboards` },
          { label: gameType.name },
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
            <a href={`${basePath}?timeRange=${TimeRange.WEEK}`}>Week</a>
          </TabsTrigger>
          <TabsTrigger value={TimeRange.MONTH} asChild>
            <a href={`${basePath}?timeRange=${TimeRange.MONTH}`}>Month</a>
          </TabsTrigger>
          <TabsTrigger value={TimeRange.YEAR} asChild>
            <a href={`${basePath}?timeRange=${TimeRange.YEAR}`}>Year</a>
          </TabsTrigger>
          <TabsTrigger value={TimeRange.ALL} asChild>
            <a href={`${basePath}?timeRange=${TimeRange.ALL}`}>All Time</a>
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
                          "flex h-9 w-9 items-center justify-center rounded-full font-bold",
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
                    <p className="text-lg font-bold tabular-nums">
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

      <PaginationNav
        currentPage={page}
        totalPages={totalPages}
        total={total}
        offset={offset}
        limit={HIGH_SCORE_PER_PAGE}
        buildHref={(p) => `${basePath}?timeRange=${timeRange}&page=${p}`}
      />
    </div>
  );
}

const ELO_PER_PAGE = 25;

async function EloStandingsView({
  leagueId,
  gameTypeId,
  gameType,
  userId,
  searchParams,
}: {
  leagueId: string;
  gameTypeId: string;
  gameType: { name: string };
  userId: string;
  searchParams: { page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const offset = (page - 1) * ELO_PER_PAGE;

  const [standingsResult, userRatingResult] = await Promise.all([
    getGameTypeEloStandings(userId, {
      gameTypeId,
      limit: ELO_PER_PAGE,
      offset,
    }),
    getParticipantEloRating(userId, gameTypeId, userId, undefined, undefined),
  ]);

  if (standingsResult.error) {
    notFound();
  }

  const standings = standingsResult.data!;
  const userRating = userRatingResult.data;
  const basePath = `/leagues/${leagueId}/leaderboards/${gameTypeId}`;

  return (
    <div className="space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Leaderboards", href: `/leagues/${leagueId}/leaderboards` },
          { label: gameType.name },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{gameType.name}</h1>
        <p className="text-muted-foreground mt-1">ELO Standings</p>
      </div>

      {userRating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Rating</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {userRating.rank && (
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                  <Award className="text-primary h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Rank</p>
                  <p className="text-2xl font-bold">#{userRating.rank}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                <TrendingUp className="text-primary h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ELO Rating</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {Math.round(userRating.rating)}
                  </p>
                  {userRating.isProvisional && (
                    <Badge variant="secondary" className="text-xs">
                      Provisional
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {userRating.matchesPlayed} matches played
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {standings.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Award className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No standings yet.</p>
              <p className="text-sm mt-2">Play matches to get ranked!</p>
            </div>
          ) : (
            <div className="divide-y">
              {standings.map((standing: (typeof standings)[0]) => {
                const participant: ParticipantData = {
                  user: standing.userId
                    ? {
                        id: standing.userId,
                        name: standing.userName!,
                        username: standing.userUsername!,
                        image: standing.userImage,
                      }
                    : null,
                  team: standing.teamId
                    ? {
                        id: standing.teamId,
                        name: standing.teamName!,
                        logo: standing.teamLogo,
                      }
                    : null,
                  placeholderMember: standing.placeholderMemberId
                    ? {
                        id: standing.placeholderMemberId,
                        displayName: standing.placeholderDisplayName!,
                      }
                    : null,
                };

                const isProvisional =
                  standing.matchesPlayed <
                  ELO_CONSTANTS.PROVISIONAL_MATCH_THRESHOLD;

                return (
                  <div
                    key={standing.eloRatingId}
                    className="flex items-center gap-4 p-4"
                  >
                    <div className="flex w-12 items-center justify-center">
                      {standing.rank <= 3 ? (
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full font-bold",
                            standing.rank === 1 &&
                              "bg-rank-gold-bg text-rank-gold-text",
                            standing.rank === 2 &&
                              "bg-rank-silver-bg text-rank-silver-text",
                            standing.rank === 3 &&
                              "bg-rank-bronze-bg text-rank-bronze-text",
                          )}
                        >
                          {standing.rank}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-lg font-semibold">
                          {standing.rank}
                        </span>
                      )}
                    </div>

                    <div className="flex-1">
                      <ParticipantDisplay
                        participant={participant}
                        showAvatar
                        showUsername
                        size="sm"
                      />
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <p className="text-lg font-bold tabular-nums">
                          {Math.round(standing.rating)}
                        </p>
                        {isProvisional && (
                          <Badge variant="secondary" className="text-xs">
                            P
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {standing.matchesPlayed} matches
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {(standings.length === ELO_PER_PAGE || page > 1) && (
        <PaginationNav
          currentPage={page}
          totalPages={standings.length === ELO_PER_PAGE ? page + 1 : page}
          total={offset + standings.length}
          offset={offset}
          limit={ELO_PER_PAGE}
          buildHref={(p) => `${basePath}?page=${p}`}
        />
      )}
    </div>
  );
}
