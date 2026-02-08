import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { MatchCard } from "@/components/match-card";
import { PaginationNav } from "@/components/pagination-nav";
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
import { auth } from "@/lib/server/auth";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getLeagueGameTypes } from "@/services/game-types";
import { getLeagueWithRole } from "@/services/leagues";
import {
  HighScoreActivityItem,
  getLeagueActivityPaginated,
} from "@/services/matches";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Plus, Trophy } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MatchFilters } from "./match-filters";

const ITEMS_PER_PAGE = 10;

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

  const [activityResult, gameTypesResult, leagueResult] = await Promise.all([
    getLeagueActivityPaginated(session.user.id, leagueId, {
      limit: ITEMS_PER_PAGE,
      offset,
      gameTypeId: gameTypeId || undefined,
    }),
    getLeagueGameTypes(session.user.id, leagueId),
    getLeagueWithRole(leagueId, session.user.id),
  ]);

  if (activityResult.error) {
    notFound();
  }

  const { items, matchCount, highScoreCount } = activityResult.data!;
  const gameTypes = gameTypesResult.data || [];
  const total = matchCount + highScoreCount;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const activeGameTypes = gameTypes.filter((gt) => !gt.isArchived);
  const canPlay =
    leagueResult.data &&
    canPerformAction(leagueResult.data.role, LeagueAction.PLAY_GAMES);
  const isSuspended =
    leagueResult.data?.suspendedUntil &&
    leagueResult.data.suspendedUntil > new Date();
  const showRecordButton =
    canPlay && !isSuspended && activeGameTypes.length > 0;

  return (
    <div className="space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Matches" },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Activity History</h1>
          <p className="text-muted-foreground mt-1">
            All matches and scores recorded in this league
          </p>
        </div>
        {showRecordButton && (
          <Button asChild>
            <Link href={`/leagues/${leagueId}/matches/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Record Match
            </Link>
          </Button>
        )}
      </div>

      <MatchFilters
        leagueId={leagueId}
        gameTypes={activeGameTypes}
        selectedGameTypeId={gameTypeId}
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {activeGameTypes.length === 0 ? (
              <>
                <p>No game types available yet.</p>
                <p className="text-sm mt-2">
                  A league manager needs to create a game type before matches
                  can be recorded.
                </p>
              </>
            ) : gameTypeId ? (
              <>
                <p>No activity found.</p>
                <p className="text-sm mt-2">
                  Try clearing the filter or selecting a different game type.
                </p>
              </>
            ) : (
              <>
                <p>No activity found.</p>
                <p className="text-sm mt-2">
                  Record a match or score to get started.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {items.map((item) =>
              item.type === "match" ? (
                <MatchCard
                  key={item.id}
                  matchId={item.id}
                  leagueId={leagueId}
                  gameTypeName={item.gameType?.name}
                  playedAt={item.playedAt}
                  status={item.status}
                  participants={item.participants}
                  tournament={item.tournament}
                  variant="full"
                />
              ) : (
                <HighScoreCard
                  key={item.id}
                  highScore={item}
                  leagueId={leagueId}
                />
              ),
            )}
          </div>

          <PaginationNav
            currentPage={page}
            totalPages={totalPages}
            total={total}
            offset={offset}
            limit={ITEMS_PER_PAGE}
            buildHref={(p) =>
              `/leagues/${leagueId}/matches?page=${p}${gameTypeId ? `&gameTypeId=${gameTypeId}` : ""}`
            }
          />
        </>
      )}
    </div>
  );
}

type HighScoreCardProps = {
  highScore: HighScoreActivityItem;
  leagueId: string;
};

function HighScoreCard({ highScore, leagueId }: HighScoreCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-semibold text-base truncate">
              {highScore.gameType?.name || "High Score"}
            </span>
            <Badge variant="secondary" className="shrink-0">
              <Trophy className="h-3 w-3 mr-1" />
              Score
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(highScore.achievedAt), {
            addSuffix: true,
          })}
        </p>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <ParticipantDisplay
              participant={highScore.participant as ParticipantData}
              showAvatar
              showUsername
              size="md"
            />
          </div>
          <span className="text-2xl font-bold tabular-nums shrink-0">
            {highScore.score.toLocaleString()}
          </span>
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-4">
        <Button asChild size="sm" className="w-full">
          <Link
            href={`/leagues/${leagueId}/leaderboards/${highScore.gameTypeId}`}
          >
            View Leaderboard
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
