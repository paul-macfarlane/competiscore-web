import { MarkdownViewer } from "@/components/markdown-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/server/auth";
import {
  GAME_CATEGORY_LABELS,
  GameCategory,
  MATCH_RESULT_LABELS,
  MatchResult,
  MatchStatus,
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
import { Plus, Settings, Trophy } from "lucide-react";
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
        ? getHighScoreEntries(session.user.id, gameTypeId, { limit: 5 })
        : Promise.resolve({ data: [] }),
      isHighScore
        ? getHighScoreLeaderboard(session.user.id, gameTypeId, { limit: 5 })
        : Promise.resolve({ data: [] }),
    ]);

  const matches = matchesResult.data || [];
  const highScores = highScoresResult.data || [];
  const leaderboard = leaderboardResult.data || [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/leagues/${leagueId}/game-types`}
        className="text-muted-foreground hover:text-foreground text-sm inline-block"
      >
        ← Back to game types
      </Link>
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
            <h1 className="text-2xl font-bold md:text-3xl">{gameType.name}</h1>
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
          {canPerformAction(league.role, LeagueAction.PLAY_GAMES) && (
            <Button size="sm" asChild>
              <Link
                href={`/leagues/${leagueId}/game-types/${gameTypeId}/record`}
              >
                <Plus className="mr-2 h-4 w-4" />
                {gameType.category === GameCategory.HIGH_SCORE
                  ? "Submit Score"
                  : "Record Match"}
              </Link>
            </Button>
          )}
          {canManage && (
            <Button variant="outline" size="sm" asChild>
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
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href={`/leagues/${leagueId}/matches?gameTypeId=${gameTypeId}`}
                >
                  View All
                </Link>
              </Button>
              {canPerformAction(league.role, LeagueAction.PLAY_GAMES) && (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href={`/leagues/${leagueId}/game-types/${gameTypeId}/record`}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Record
                  </Link>
                </Button>
              )}
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
                  <MatchHistoryItem
                    key={match.id}
                    match={match}
                    leagueId={leagueId}
                    category={gameType.category as GameCategory}
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
              {canPerformAction(league.role, LeagueAction.PLAY_GAMES) && (
                <Button variant="ghost" size="sm" asChild>
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
                <div className="space-y-2">
                  {highScores.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <span className="font-medium">
                          {entry.user?.name ||
                            entry.team?.name ||
                            entry.placeholderMember?.displayName ||
                            "Unknown"}
                        </span>
                        <span className="text-muted-foreground text-sm ml-2">
                          {formatDistanceToNow(new Date(entry.achievedAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <span className="font-bold text-lg">
                        {entry.score.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Leaderboard</CardTitle>
              <Button variant="ghost" size="sm" asChild>
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
                <div className="space-y-2">
                  {leaderboard.map((entry) => (
                    <div
                      key={`${entry.participantType}-${entry.participantId}`}
                      className="flex items-center gap-3 py-2"
                    >
                      <span
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold",
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
                      <span className="font-medium flex-1">
                        {entry.participantName}
                      </span>
                      <span className="font-bold">
                        {entry.bestScore.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

type MatchHistoryItemProps = {
  match: {
    id: string;
    status: string;
    playedAt: Date;
    participants: Array<{
      id: string;
      side: number | null;
      result: string | null;
      score: number | null;
      rank: number | null;
      user?: { id: string; name: string } | null;
      team?: { id: string; name: string } | null;
      placeholderMember?: { id: string; displayName: string } | null;
    }>;
  };
  leagueId: string;
  category: GameCategory;
};

function MatchHistoryItem({
  match,
  leagueId,
  category,
}: MatchHistoryItemProps) {
  const getParticipantName = (
    p: MatchHistoryItemProps["match"]["participants"][0],
  ) => {
    if (p.user) return p.user.name;
    if (p.team) return p.team.name;
    if (p.placeholderMember) return p.placeholderMember.displayName;
    return "Unknown";
  };

  const side1 = match.participants.filter((p) => p.side === 1);
  const side2 = match.participants.filter((p) => p.side === 2);
  const isH2H = category === GameCategory.HEAD_TO_HEAD;

  return (
    <Link
      href={`/leagues/${leagueId}/matches/${match.id}`}
      className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(match.playedAt), { addSuffix: true })}
        </span>
        {match.status === MatchStatus.COMPLETED && (
          <Badge variant="secondary" className="text-xs">
            Completed
          </Badge>
        )}
      </div>
      {isH2H && (
        <div className="flex items-center gap-4">
          <div className="flex-1">
            {side1.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
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
                    className="text-xs"
                  >
                    {MATCH_RESULT_LABELS[p.result as MatchResult]}
                  </Badge>
                )}
              </div>
            ))}
          </div>
          <span className="text-muted-foreground">vs</span>
          <div className="flex-1 text-right">
            {side2.map((p) => (
              <div key={p.id} className="flex items-center gap-2 justify-end">
                {p.result && (
                  <Badge
                    variant={
                      p.result === MatchResult.WIN
                        ? "default"
                        : p.result === MatchResult.LOSS
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-xs"
                  >
                    {MATCH_RESULT_LABELS[p.result as MatchResult]}
                  </Badge>
                )}
                <span className="font-medium">{getParticipantName(p)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!isH2H && (
        <div className="space-y-1">
          {match.participants
            .sort((a, b) => (a.rank || 999) - (b.rank || 999))
            .slice(0, 3)
            .map((p, index) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium",
                    index === 0 && "bg-rank-gold-bg text-rank-gold-text",
                    index === 1 && "bg-rank-silver-bg text-rank-silver-text",
                    index === 2 && "bg-rank-bronze-bg text-rank-bronze-text",
                  )}
                >
                  {p.rank || index + 1}
                </span>
                <span>{getParticipantName(p)}</span>
                {p.score !== null && (
                  <span className="text-muted-foreground ml-auto">
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
    </Link>
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
