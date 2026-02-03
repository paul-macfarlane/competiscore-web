import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { Badge } from "@/components/ui/badge";
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
import { auth } from "@/lib/server/auth";
import { ELO_CONSTANTS } from "@/lib/shared/constants";
import { cn } from "@/lib/shared/utils";
import {
  getGameTypeEloStandings,
  getParticipantEloRating,
} from "@/services/elo-ratings";
import { getGameType } from "@/services/game-types";
import { Award, TrendingUp } from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

const ITEMS_PER_PAGE = 25;

type PageProps = {
  params: Promise<{ id: string; gameTypeId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function StandingsPage({
  params,
  searchParams,
}: PageProps) {
  const { id: leagueId, gameTypeId } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const [gameTypeResult, standingsResult, userRatingResult] = await Promise.all(
    [
      getGameType(session.user.id, gameTypeId),
      getGameTypeEloStandings(session.user.id, {
        gameTypeId,
        limit: ITEMS_PER_PAGE,
        offset,
      }),
      getParticipantEloRating(
        session.user.id,
        gameTypeId,
        session.user.id,
        undefined,
        undefined,
      ),
    ],
  );

  if (gameTypeResult.error || standingsResult.error) {
    notFound();
  }

  const gameType = gameTypeResult.data!;
  const standings = standingsResult.data!;
  const userRating = userRatingResult.data;

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
          { label: "Standings" },
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
                            "flex h-8 w-8 items-center justify-center rounded-full font-bold",
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
                        <p className="text-lg font-bold">
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

      {standings.length > 0 && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">Page {page}</p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={
                    page > 1
                      ? `/leagues/${leagueId}/game-types/${gameTypeId}/standings?page=${page - 1}`
                      : "#"
                  }
                  aria-disabled={page <= 1}
                  className={cn(page <= 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>

              {page > 2 && (
                <PaginationItem>
                  <PaginationLink
                    href={`/leagues/${leagueId}/game-types/${gameTypeId}/standings?page=1`}
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
                    href={`/leagues/${leagueId}/game-types/${gameTypeId}/standings?page=${page - 1}`}
                  >
                    {page - 1}
                  </PaginationLink>
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationLink
                  href={`/leagues/${leagueId}/game-types/${gameTypeId}/standings?page=${page}`}
                  isActive
                >
                  {page}
                </PaginationLink>
              </PaginationItem>

              {standings.length === ITEMS_PER_PAGE && (
                <>
                  <PaginationItem>
                    <PaginationLink
                      href={`/leagues/${leagueId}/game-types/${gameTypeId}/standings?page=${page + 1}`}
                    >
                      {page + 1}
                    </PaginationLink>
                  </PaginationItem>

                  <PaginationItem>
                    <PaginationNext
                      href={`/leagues/${leagueId}/game-types/${gameTypeId}/standings?page=${page + 1}`}
                    />
                  </PaginationItem>
                </>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
