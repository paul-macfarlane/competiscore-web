import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { PaginationNav } from "@/components/pagination-nav";
import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { auth } from "@/lib/server/auth";
import { GameCategory } from "@/lib/shared/constants";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getLeagueGameTypes } from "@/services/game-types";
import { getLeagueWithRole } from "@/services/leagues";
import {
  HighScoreActivityItem,
  getLeagueActivityPaginated,
} from "@/services/matches";
import { formatDistanceToNow } from "date-fns";
import { Plus, Trophy } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BestScoreFilters } from "./best-score-filters";

const ITEMS_PER_PAGE = 10;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; gameTypeId?: string }>;
};

export default async function LeagueBestScoresPage({
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
      activityType: "high_scores",
    }),
    getLeagueGameTypes(session.user.id, leagueId),
    getLeagueWithRole(leagueId, session.user.id),
  ]);

  if (activityResult.error) {
    notFound();
  }

  const { items, highScoreCount } = activityResult.data!;
  const gameTypes = gameTypesResult.data || [];
  const totalPages = Math.ceil(highScoreCount / ITEMS_PER_PAGE);

  const activeGameTypes = gameTypes.filter((gt) => !gt.isArchived);
  const bestScoreGameTypes = activeGameTypes.filter(
    (gt) => gt.category === GameCategory.HIGH_SCORE,
  );
  const canPlay =
    leagueResult.data &&
    canPerformAction(leagueResult.data.role, LeagueAction.PLAY_GAMES);
  const isSuspended =
    leagueResult.data?.suspendedUntil &&
    leagueResult.data.suspendedUntil > new Date();
  const showSubmitButton =
    canPlay && !isSuspended && bestScoreGameTypes.length > 0;

  return (
    <div className="space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Best Scores" },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Best Scores</h1>
          <p className="text-muted-foreground mt-1">
            All best scores submitted in this league
          </p>
        </div>
        {showSubmitButton && (
          <Button asChild>
            <Link href={`/leagues/${leagueId}/matches/new?category=high_score`}>
              <Plus className="mr-2 h-4 w-4" />
              Submit Score
            </Link>
          </Button>
        )}
      </div>

      <BestScoreFilters
        leagueId={leagueId}
        gameTypes={bestScoreGameTypes}
        selectedGameTypeId={gameTypeId}
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {bestScoreGameTypes.length === 0 ? (
              <>
                <p>No best score game types available yet.</p>
                <p className="text-sm mt-2">
                  A league manager needs to create a Best Score game type first.
                </p>
              </>
            ) : gameTypeId ? (
              <>
                <p>No scores found.</p>
                <p className="text-sm mt-2">
                  Try clearing the filter or selecting a different game type.
                </p>
              </>
            ) : (
              <>
                <p>No scores submitted yet.</p>
                <p className="text-sm mt-2">Submit a score to get started.</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {items.map((item) =>
              item.type === "high_score" ? (
                <BestScoreCard
                  key={item.id}
                  highScore={item}
                  leagueId={leagueId}
                />
              ) : null,
            )}
          </div>

          <PaginationNav
            currentPage={page}
            totalPages={totalPages}
            total={highScoreCount}
            offset={offset}
            limit={ITEMS_PER_PAGE}
            buildHref={(p) =>
              `/leagues/${leagueId}/best-scores?page=${p}${gameTypeId ? `&gameTypeId=${gameTypeId}` : ""}`
            }
          />
        </>
      )}
    </div>
  );
}

function BestScoreCard({
  highScore,
  leagueId,
}: {
  highScore: HighScoreActivityItem;
  leagueId: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">
                {highScore.gameType?.name || "Best Score"}
              </span>
              <Badge variant="secondary" className="shrink-0 text-xs">
                <Trophy className="h-3 w-3 mr-1" />
                Score
              </Badge>
            </div>
            <ParticipantDisplay
              participant={highScore.participant as ParticipantData}
              showAvatar
              showUsername
              size="sm"
            />
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(highScore.achievedAt), {
                addSuffix: true,
              })}
            </p>
          </div>
          <span className="text-2xl font-bold tabular-nums shrink-0">
            {highScore.score.toLocaleString()}
          </span>
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-4">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link
            href={`/leagues/${leagueId}/leaderboards/${highScore.gameTypeId}`}
          >
            View Leaderboard
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
