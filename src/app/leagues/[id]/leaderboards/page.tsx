import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import {
  ELO_CONSTANTS,
  GAME_CATEGORY_LABELS,
  GameCategory,
  MatchParticipantType,
} from "@/lib/shared/constants";
import { cn } from "@/lib/shared/utils";
import { getGameTypeEloStandings } from "@/services/elo-ratings";
import { getLeagueGameTypes } from "@/services/game-types";
import { getHighScoreLeaderboard } from "@/services/leaderboards";
import { Award, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Leaderboards",
    description: "View standings and leaderboards for all game types",
  };
}

export default async function LeagueLeaderboardsPage({ params }: PageProps) {
  const { id: leagueId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const gameTypesResult = await getLeagueGameTypes(session.user.id, leagueId);

  if (gameTypesResult.error) {
    notFound();
  }

  const gameTypes = (gameTypesResult.data ?? []).filter((gt) => !gt.isArchived);

  return (
    <div className="space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Leaderboards" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Leaderboards</h1>
        <p className="text-muted-foreground mt-1">
          Standings and rankings across all game types
        </p>
      </div>

      {gameTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No game types yet.</p>
            <p className="text-sm mt-2">
              Create a game type to start tracking scores and rankings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {gameTypes.map((gameType) => (
            <Suspense
              key={gameType.id}
              fallback={<GameTypeLeaderboardSkeleton name={gameType.name} />}
            >
              <GameTypeLeaderboardCard
                gameType={gameType}
                leagueId={leagueId}
                userId={session.user.id}
              />
            </Suspense>
          ))}
        </div>
      )}
    </div>
  );
}

async function GameTypeLeaderboardCard({
  gameType,
  leagueId,
  userId,
}: {
  gameType: { id: string; name: string; category: string };
  leagueId: string;
  userId: string;
}) {
  const isHighScore = gameType.category === GameCategory.HIGH_SCORE;
  const categoryLabel = GAME_CATEGORY_LABELS[gameType.category as GameCategory];

  if (isHighScore) {
    return (
      <HighScoreLeaderboardCard
        gameType={gameType}
        leagueId={leagueId}
        userId={userId}
        categoryLabel={categoryLabel}
      />
    );
  }

  return (
    <EloStandingsCard
      gameType={gameType}
      leagueId={leagueId}
      userId={userId}
      categoryLabel={categoryLabel}
    />
  );
}

async function EloStandingsCard({
  gameType,
  leagueId,
  userId,
  categoryLabel,
}: {
  gameType: { id: string; name: string; category: string };
  leagueId: string;
  userId: string;
  categoryLabel: string;
}) {
  const standingsResult = await getGameTypeEloStandings(userId, {
    gameTypeId: gameType.id,
    limit: 5,
  });

  const standings = standingsResult.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg">{gameType.name}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {categoryLabel}
          </Badge>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/leagues/${leagueId}/leaderboards/${gameType.id}`}>
            View Full Standings
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {standings.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Award className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">
              No standings yet. Play matches to get ranked!
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {standings.map((standing) => {
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
                  className="flex items-center gap-3 py-2.5"
                >
                  <div className="flex w-8 items-center justify-center">
                    {standing.rank <= 3 ? (
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
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
                      <span className="text-muted-foreground text-sm font-semibold">
                        {standing.rank}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <ParticipantDisplay
                      participant={participant}
                      showAvatar
                      showUsername
                      size="sm"
                    />
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="font-bold tabular-nums">
                        {Math.round(standing.rating)}
                      </span>
                      {isProvisional && (
                        <Badge variant="secondary" className="text-xs px-1">
                          P
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function HighScoreLeaderboardCard({
  gameType,
  leagueId,
  userId,
  categoryLabel,
}: {
  gameType: { id: string; name: string; category: string };
  leagueId: string;
  userId: string;
  categoryLabel: string;
}) {
  const leaderboardResult = await getHighScoreLeaderboard(userId, gameType.id, {
    limit: 5,
  });

  const leaderboard = leaderboardResult.data?.leaderboard ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg">{gameType.name}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {categoryLabel}
          </Badge>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/leagues/${leagueId}/leaderboards/${gameType.id}`}>
            View Full Leaderboard
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Trophy className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">
              No scores yet. Submit a score to get on the board!
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {leaderboard.map((entry) => {
              const participant: ParticipantData = {
                user:
                  entry.participantType === MatchParticipantType.USER
                    ? {
                        id: entry.participantId,
                        name: entry.participantName,
                        username: entry.participantUsername || undefined,
                        image: entry.participantImage,
                      }
                    : null,
                team:
                  entry.participantType === MatchParticipantType.TEAM
                    ? {
                        id: entry.participantId,
                        name: entry.participantName,
                        logo: entry.participantImage,
                      }
                    : null,
                placeholderMember:
                  entry.participantType === MatchParticipantType.PLACEHOLDER
                    ? {
                        id: entry.participantId,
                        displayName: entry.participantName,
                      }
                    : null,
              };

              return (
                <div
                  key={entry.entryId}
                  className="flex items-center gap-3 py-2.5"
                >
                  <span
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shrink-0",
                      entry.rank === 1 && "bg-rank-gold-bg text-rank-gold-text",
                      entry.rank === 2 &&
                        "bg-rank-silver-bg text-rank-silver-text",
                      entry.rank === 3 &&
                        "bg-rank-bronze-bg text-rank-bronze-text",
                      entry.rank > 3 && "bg-muted text-muted-foreground",
                    )}
                  >
                    {entry.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <ParticipantDisplay
                      participant={participant}
                      showAvatar
                      showUsername
                      size="sm"
                    />
                  </div>
                  <span className="font-bold shrink-0">
                    {entry.bestScore.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GameTypeLeaderboardSkeleton({ name }: { name: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg">{name}</CardTitle>
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-9 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
