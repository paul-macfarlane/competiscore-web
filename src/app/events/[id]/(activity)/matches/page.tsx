import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { MatchCard } from "@/components/match-card";
import { PaginationNav } from "@/components/pagination-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import {
  EventParticipantRole,
  EventStatus,
  GameCategory,
} from "@/lib/shared/constants";
import { getScoreDescription } from "@/lib/shared/game-config-parser";
import { getEventGameTypes } from "@/services/event-game-types";
import { getEventMatches } from "@/services/event-leaderboards";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { MatchFilters } from "./match-filters";

const ITEMS_PER_PAGE = 10;

interface EventMatchesPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; gameTypeId?: string }>;
}

export async function generateMetadata({
  params,
}: EventMatchesPageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Matches" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Event Not Found" };
  }

  return {
    title: `Matches - ${result.data.name}`,
    description: `Match history for ${result.data.name}`,
  };
}

export default async function EventMatchesPage({
  params,
  searchParams,
}: EventMatchesPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    notFound();
  }

  const { id } = parsed.data;
  const rawSearchParams = await searchParams;
  const page = Math.max(1, parseInt(rawSearchParams.page || "1", 10) || 1);
  const gameTypeId = rawSearchParams.gameTypeId;

  return (
    <div className="space-y-6">
      <Suspense fallback={<MatchesSkeleton />}>
        <MatchesContent
          eventId={id}
          userId={session.user.id}
          page={page}
          gameTypeId={gameTypeId}
        />
      </Suspense>
    </div>
  );
}

async function MatchesContent({
  eventId,
  userId,
  page,
  gameTypeId,
}: {
  eventId: string;
  userId: string;
  page: number;
  gameTypeId?: string;
}) {
  const eventResult = await getEvent(userId, eventId);
  if (eventResult.error || !eventResult.data) {
    notFound();
  }

  const event = eventResult.data;
  const isOrganizer = event.role === EventParticipantRole.ORGANIZER;
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const [matchesResult, gameTypesResult] = await Promise.all([
    getEventMatches(userId, eventId, {
      limit: ITEMS_PER_PAGE,
      offset,
      gameTypeId,
    }),
    getEventGameTypes(userId, eventId),
  ]);

  const matches = matchesResult.data?.matches ?? [];
  const total = matchesResult.data?.total ?? 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const gameTypes = (gameTypesResult.data ?? []).filter(
    (gt) => !gt.isArchived && gt.category !== GameCategory.HIGH_SCORE,
  );

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (gameTypeId) params.set("gameTypeId", gameTypeId);
    const qs = params.toString();
    return `/events/${eventId}/matches${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Matches" },
        ]}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Matches</h2>
        {isOrganizer && event.status === EventStatus.ACTIVE && (
          <Button size="sm" asChild>
            <Link href={`/events/${eventId}/matches/record`}>Record Match</Link>
          </Button>
        )}
      </div>

      {gameTypes.length > 1 && (
        <MatchFilters
          eventId={eventId}
          gameTypes={gameTypes}
          selectedGameTypeId={gameTypeId}
        />
      )}

      {event.status !== EventStatus.ACTIVE ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              This event hasn&apos;t started yet.
              {isOrganizer && " Start the event to begin recording matches."}
            </p>
          </CardContent>
        </Card>
      ) : gameTypes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No Head-to-Head or Free-for-All game types available.
              {isOrganizer && " Create a game type to start recording matches."}
            </p>
          </CardContent>
        </Card>
      ) : matches.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {gameTypeId
            ? "No matches found for this game type."
            : "No matches recorded yet. Record a match to get started!"}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {matches.map((match) => {
            const pointsByTeam = new Map<string, number>();
            for (const pe of match.pointEntries) {
              if (pe.eventTeamId) {
                pointsByTeam.set(
                  pe.eventTeamId,
                  (pointsByTeam.get(pe.eventTeamId) ?? 0) + pe.points,
                );
              }
            }

            return (
              <MatchCard
                key={match.id}
                matchId={match.id}
                detailHref={`/events/${eventId}/matches/${match.id}`}
                gameTypeName={match.gameType?.name}
                scoreLabel={
                  match.gameType?.config
                    ? getScoreDescription(
                        match.gameType.config,
                        match.gameType.category,
                      )
                    : undefined
                }
                playedAt={match.playedAt}
                tournament={
                  match.tournament
                    ? {
                        tournamentId: match.tournament.tournamentId,
                        tournamentName: match.tournament.tournamentName,
                        tournamentLogo: match.tournament.tournamentLogo,
                        eventId: match.tournament.eventId,
                        round: match.tournament.round,
                        totalRounds: match.tournament.totalRounds,
                      }
                    : undefined
                }
                participants={match.participants.map((p) => ({
                  id: p.id,
                  side: p.side,
                  rank: p.rank,
                  score: p.score,
                  result: p.result,
                  user: p.user,
                  team: p.team,
                  placeholderMember: p.placeholderParticipant,
                  teamName:
                    p.user?.id || p.placeholderParticipant?.id
                      ? p.team?.name
                      : undefined,
                  teamColor:
                    p.user?.id || p.placeholderParticipant?.id
                      ? p.team?.color
                      : undefined,
                  points: p.eventTeamId
                    ? (pointsByTeam.get(p.eventTeamId) ?? null)
                    : null,
                }))}
              />
            );
          })}
        </div>
      )}

      <PaginationNav
        currentPage={page}
        totalPages={totalPages}
        total={total}
        offset={offset}
        limit={ITEMS_PER_PAGE}
        buildHref={buildHref}
      />
    </>
  );
}

function MatchesSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-48" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="flex flex-col gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </>
  );
}
