import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { MatchCard } from "@/components/match-card";
import { PaginationNav } from "@/components/pagination-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/server/auth";
import { GameCategory } from "@/lib/shared/constants";
import { getScoreDescription } from "@/lib/shared/game-config-parser";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getLeagueGameTypes } from "@/services/game-types";
import { getLeagueWithRole } from "@/services/leagues";
import { getLeagueActivityPaginated } from "@/services/matches";
import { Plus } from "lucide-react";
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
      activityType: "matches",
    }),
    getLeagueGameTypes(session.user.id, leagueId),
    getLeagueWithRole(leagueId, session.user.id),
  ]);

  if (activityResult.error) {
    notFound();
  }

  const { items, matchCount } = activityResult.data!;
  const gameTypes = gameTypesResult.data || [];
  const total = matchCount;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const activeGameTypes = gameTypes.filter(
    (gt) => !gt.isArchived && gt.category !== GameCategory.HIGH_SCORE,
  );
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
          <h1 className="text-2xl font-bold md:text-3xl">Match History</h1>
          <p className="text-muted-foreground mt-1">
            All matches recorded in this league
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
                <p>No matches found.</p>
                <p className="text-sm mt-2">
                  Try clearing the filter or selecting a different game type.
                </p>
              </>
            ) : (
              <>
                <p>No matches found.</p>
                <p className="text-sm mt-2">Record a match to get started.</p>
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
                  scoreLabel={
                    item.gameType?.config
                      ? getScoreDescription(
                          item.gameType.config,
                          item.gameType.category,
                        )
                      : undefined
                  }
                  playedAt={item.playedAt}
                  status={item.status}
                  participants={item.participants}
                  tournament={item.tournament}
                  variant="full"
                />
              ) : null,
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
