import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { MatchCard } from "@/components/match-card";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { auth } from "@/lib/server/auth";
import { cn } from "@/lib/shared/utils";
import { getLeagueGameTypes } from "@/services/game-types";
import {
  HighScoreActivityItem,
  getLeagueActivityPaginated,
} from "@/services/matches";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Trophy } from "lucide-react";
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
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Matches" },
        ]}
      />
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
                <MatchCard
                  key={item.id}
                  matchId={item.id}
                  leagueId={leagueId}
                  gameTypeName={item.gameType?.name}
                  playedAt={item.playedAt}
                  status={item.status}
                  participants={item.participants}
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

          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {offset + 1}-{Math.min(offset + ITEMS_PER_PAGE, total)} of{" "}
              {total} items
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={
                      page > 1
                        ? `/leagues/${leagueId}/matches?page=${page - 1}${gameTypeId ? `&gameTypeId=${gameTypeId}` : ""}`
                        : "#"
                    }
                    aria-disabled={page <= 1}
                    className={cn(
                      page <= 1 && "pointer-events-none opacity-50",
                    )}
                  />
                </PaginationItem>

                {page > 2 && (
                  <PaginationItem>
                    <PaginationLink
                      href={`/leagues/${leagueId}/matches?page=1${gameTypeId ? `&gameTypeId=${gameTypeId}` : ""}`}
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
                      href={`/leagues/${leagueId}/matches?page=${page - 1}${gameTypeId ? `&gameTypeId=${gameTypeId}` : ""}`}
                    >
                      {page - 1}
                    </PaginationLink>
                  </PaginationItem>
                )}

                <PaginationItem>
                  <PaginationLink
                    href={`/leagues/${leagueId}/matches?page=${page}${gameTypeId ? `&gameTypeId=${gameTypeId}` : ""}`}
                    isActive
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>

                {page < totalPages && (
                  <PaginationItem>
                    <PaginationLink
                      href={`/leagues/${leagueId}/matches?page=${page + 1}${gameTypeId ? `&gameTypeId=${gameTypeId}` : ""}`}
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
                      href={`/leagues/${leagueId}/matches?page=${totalPages}${gameTypeId ? `&gameTypeId=${gameTypeId}` : ""}`}
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}

                <PaginationItem>
                  <PaginationNext
                    href={
                      page < totalPages
                        ? `/leagues/${leagueId}/matches?page=${page + 1}${gameTypeId ? `&gameTypeId=${gameTypeId}` : ""}`
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
            href={`/leagues/${leagueId}/game-types/${highScore.gameTypeId}/leaderboard`}
          >
            View Leaderboard
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
