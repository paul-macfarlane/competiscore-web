import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { MatchCard } from "@/components/match-card";
import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/server/auth";
import {
  GAME_CATEGORY_LABELS,
  GameCategory,
  MatchParticipantType,
  ParticipantType,
  ScoreOrder,
  ScoringType,
} from "@/lib/shared/constants";
import { parseGameConfig } from "@/lib/shared/game-config-parser";
import {
  FFAConfig,
  H2HConfig,
  HighScoreConfig,
} from "@/lib/shared/game-templates";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { cn } from "@/lib/shared/utils";
import { getGameType } from "@/services/game-types";
import {
  getHighScoreEntries,
  getHighScoreLeaderboard,
} from "@/services/leaderboards";
import { getLeagueWithRole } from "@/services/leagues";
import { getGameTypeMatches } from "@/services/matches";
import { formatDistanceToNow } from "date-fns";
import { Archive, Plus, Settings, Trophy } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string; gameTypeId: string }>;
};

export default async function GameTypeDetailPage({ params }: PageProps) {
  const { id: leagueId, gameTypeId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const [gameTypeResult, leagueResult] = await Promise.all([
    getGameType(session.user.id, gameTypeId),
    getLeagueWithRole(leagueId, session.user.id),
  ]);

  if (gameTypeResult.error || !gameTypeResult.data) {
    notFound();
  }

  if (leagueResult.error || !leagueResult.data) {
    notFound();
  }

  const gameType = gameTypeResult.data;
  const league = leagueResult.data;
  const canManage = canPerformAction(
    league.role,
    LeagueAction.CREATE_GAME_TYPES,
  );

  const config = parseGameConfig(gameType.config, gameType.category);
  const categoryLabel = GAME_CATEGORY_LABELS[gameType.category as GameCategory];

  const isHighScore = gameType.category === GameCategory.HIGH_SCORE;

  const [matchesResult, highScoresResult, leaderboardResult] =
    await Promise.all([
      !isHighScore
        ? getGameTypeMatches(session.user.id, gameTypeId, { limit: 5 })
        : Promise.resolve({ data: [] }),
      isHighScore
        ? getHighScoreEntries(session.user.id, gameTypeId, {
            limit: 5,
            sortBy: "date",
          })
        : Promise.resolve({ data: [] }),
      isHighScore
        ? getHighScoreLeaderboard(session.user.id, gameTypeId, { limit: 5 })
        : Promise.resolve({
            data: { leaderboard: [], total: 0, limit: 5, offset: 0 },
          }),
    ]);

  const matches = matchesResult.data || [];
  const highScores = highScoresResult.data || [];
  const leaderboard = leaderboardResult.data?.leaderboard || [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Game Types", href: `/leagues/${leagueId}/game-types` },
          { label: gameType.name },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {gameType.logo && (
            <div className="relative w-16 h-16 flex items-center justify-center bg-muted rounded-lg shrink-0 overflow-hidden">
              <Image
                src={gameType.logo}
                alt={gameType.name}
                fill
                className="object-cover p-2"
              />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1
                className={cn(
                  "text-2xl font-bold md:text-3xl",
                  gameType.isArchived && "text-muted-foreground",
                )}
              >
                {gameType.name}
              </h1>
              {gameType.isArchived && (
                <Badge variant="secondary">
                  <Archive className="mr-1 h-3 w-3" />
                  Archived
                </Badge>
              )}
            </div>
            {gameType.description && (
              <p className="text-muted-foreground mt-1">
                {gameType.description}
              </p>
            )}
            <Badge variant="secondary" className="mt-2">
              {categoryLabel}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {gameType.category === GameCategory.HIGH_SCORE && (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/leagues/${leagueId}/game-types/${gameTypeId}/leaderboard`}
              >
                <Trophy className="mr-2 h-4 w-4" />
                Leaderboard
              </Link>
            </Button>
          )}
          {canManage && (
            <Button size="sm" asChild>
              <Link
                href={`/leagues/${leagueId}/game-types/${gameTypeId}/settings`}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          )}
        </div>
      </div>

      {gameType.isArchived && (
        <Alert>
          <Archive className="h-4 w-4" />
          <AlertDescription>
            This game type is archived. No new matches or scores can be
            recorded.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {gameType.category === GameCategory.HEAD_TO_HEAD && (
            <H2HConfigDisplay config={config as H2HConfig} />
          )}
          {gameType.category === GameCategory.FREE_FOR_ALL && (
            <FFAConfigDisplay config={config as FFAConfig} />
          )}
          {gameType.category === GameCategory.HIGH_SCORE && (
            <HighScoreConfigDisplay config={config as HighScoreConfig} />
          )}
        </CardContent>
      </Card>

      {!isHighScore && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Match History</CardTitle>
            <div className="flex gap-2">
              {canPerformAction(league.role, LeagueAction.PLAY_GAMES) &&
                !gameType.isArchived && (
                  <Button size="sm" asChild>
                    <Link
                      href={`/leagues/${leagueId}/game-types/${gameTypeId}/record`}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Record
                    </Link>
                  </Button>
                )}

              <Button size="sm" asChild>
                <Link
                  href={`/leagues/${leagueId}/matches?gameTypeId=${gameTypeId}`}
                >
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {matches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No matches recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    matchId={match.id}
                    leagueId={leagueId}
                    playedAt={match.playedAt}
                    status={match.status}
                    participants={match.participants}
                    variant="compact"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isHighScore && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Scores</CardTitle>
              {canPerformAction(league.role, LeagueAction.PLAY_GAMES) &&
                !gameType.isArchived && (
                  <Button size="sm" asChild>
                    <Link
                      href={`/leagues/${leagueId}/game-types/${gameTypeId}/record`}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Submit
                    </Link>
                  </Button>
                )}
            </CardHeader>
            <CardContent>
              {highScores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No scores submitted yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {highScores.map((entry) => {
                    const participant: ParticipantData = {
                      user: entry.user,
                      team: entry.team,
                      placeholderMember: entry.placeholderMember,
                    };

                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <ParticipantDisplay
                            participant={participant}
                            showAvatar
                            showUsername
                            size="sm"
                          />
                          <span className="text-muted-foreground text-xs mt-1 block">
                            {formatDistanceToNow(new Date(entry.achievedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <span className="font-bold text-lg shrink-0">
                          {entry.score.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Leaderboard</CardTitle>
              <Button size="sm" asChild>
                <Link
                  href={`/leagues/${leagueId}/game-types/${gameTypeId}/leaderboard`}
                >
                  View All
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No scores submitted yet</p>
                </div>
              ) : (
                <div className="space-y-3">
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
                        entry.participantType ===
                        MatchParticipantType.PLACEHOLDER
                          ? {
                              id: entry.participantId,
                              displayName: entry.participantName,
                            }
                          : null,
                    };

                    return (
                      <div
                        key={entry.entryId}
                        className="flex items-center gap-3 py-2"
                      >
                        <span
                          className={cn(
                            "w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shrink-0",
                            entry.rank === 1 &&
                              "bg-rank-gold-bg text-rank-gold-text",
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
        </>
      )}
    </div>
  );
}

function H2HConfigDisplay({ config }: { config: H2HConfig }) {
  return (
    <>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Scoring Type:</span>
        <span className="font-medium">
          {config.scoringType === ScoringType.WIN_LOSS
            ? "Win/Loss Only"
            : "Score-Based"}
        </span>
      </div>
      {config.scoreDescription && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Score Label:</span>
          <span className="font-medium">{config.scoreDescription}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-muted-foreground">Draws Allowed:</span>
        <span className="font-medium">
          {config.drawsAllowed ? "Yes" : "No"}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Players Per Side:</span>
        <span className="font-medium">
          {config.minPlayersPerSide === config.maxPlayersPerSide
            ? config.minPlayersPerSide
            : `${config.minPlayersPerSide}-${config.maxPlayersPerSide}`}
        </span>
      </div>
      {config.rules && (
        <div className="space-y-2 pt-2 border-t">
          <span className="text-muted-foreground text-sm font-medium">
            Rules:
          </span>
          <div className="bg-muted/50 rounded-md p-3">
            <MarkdownViewer content={config.rules} />
          </div>
        </div>
      )}
    </>
  );
}

function FFAConfigDisplay({ config }: { config: FFAConfig }) {
  return (
    <>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Scoring Type:</span>
        <span className="font-medium">
          {config.scoringType === ScoringType.RANKED_FINISH
            ? "Ranked Finish"
            : "Score-Based Ranking"}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Score Order:</span>
        <span className="font-medium">
          {config.scoreOrder === ScoreOrder.HIGHEST_WINS
            ? "Highest Wins"
            : "Lowest Wins"}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Player Range:</span>
        <span className="font-medium">
          {config.minPlayers === config.maxPlayers
            ? config.minPlayers
            : `${config.minPlayers}-${config.maxPlayers}`}{" "}
          players
        </span>
      </div>
      {config.rules && (
        <div className="space-y-2 pt-2 border-t">
          <span className="text-muted-foreground text-sm font-medium">
            Rules:
          </span>
          <div className="bg-muted/50 rounded-md p-3">
            <MarkdownViewer content={config.rules} />
          </div>
        </div>
      )}
    </>
  );
}

function HighScoreConfigDisplay({ config }: { config: HighScoreConfig }) {
  return (
    <>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Score Order:</span>
        <span className="font-medium">
          {config.scoreOrder === ScoreOrder.HIGHEST_WINS
            ? "Highest Wins"
            : "Lowest Wins"}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Score Label:</span>
        <span className="font-medium">{config.scoreDescription}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Participant Type:</span>
        <span className="font-medium">
          {config.participantType === ParticipantType.INDIVIDUAL
            ? "Individual"
            : "Team"}
        </span>
      </div>
      {config.rules && (
        <div className="space-y-2 pt-2 border-t">
          <span className="text-muted-foreground text-sm font-medium">
            Rules:
          </span>
          <div className="bg-muted/50 rounded-md p-3">
            <MarkdownViewer content={config.rules} />
          </div>
        </div>
      )}
    </>
  );
}
