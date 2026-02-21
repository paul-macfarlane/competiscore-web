import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { PaginationNav } from "@/components/pagination-nav";
import { ScoreEntryRow } from "@/components/score-entry-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole, GameCategory } from "@/lib/shared/constants";
import {
  isHighScorePartnership,
  parseHighScoreConfig,
} from "@/lib/shared/game-config-parser";
import { getEventGameType } from "@/services/event-game-types";
import { getGameTypePointEntries } from "@/services/event-high-scores";
import { getEventHighScoreLeaderboard } from "@/services/event-leaderboards";
import { getEvent } from "@/services/events";
import { Plus, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { DeleteHighScoreEntryButton } from "../../delete-high-score-entry-button";

const ITEMS_PER_PAGE = 10;

const paramsSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
});

interface PageProps {
  params: Promise<{ id: string; sessionId: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = paramsSchema.safeParse(rawParams);
  if (!parsed.success) return { title: "Leaderboard" };

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { title: "Leaderboard" };

  const leaderboardResult = await getEventHighScoreLeaderboard(
    session.user.id,
    parsed.data.sessionId,
  );

  if (!leaderboardResult.data) return { title: "Leaderboard" };

  const [eventResult, gameTypeResult] = await Promise.all([
    getEvent(session.user.id, leaderboardResult.data.eventId),
    getEventGameType(session.user.id, leaderboardResult.data.gameTypeId),
  ]);

  const eventName = eventResult.data?.name ?? "Event";
  const gameTypeName = gameTypeResult.data?.name ?? "Game Type";

  return {
    title: `${gameTypeName} Leaderboard - ${eventName}`,
    description: `${gameTypeName} individual rankings for ${eventName}`,
  };
}

export default async function EventSessionLeaderboardPage({
  params,
  searchParams,
}: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const rawParams = await params;
  const parsed = paramsSchema.safeParse(rawParams);
  if (!parsed.success) notFound();

  const { sessionId } = parsed.data;
  const rawSearchParams = await searchParams;
  const page = Math.max(1, parseInt(rawSearchParams.page || "1", 10) || 1);

  return (
    <div className="space-y-6">
      <Suspense fallback={<LeaderboardSkeleton />}>
        <LeaderboardContent
          sessionId={sessionId}
          userId={session.user.id}
          page={page}
        />
      </Suspense>
    </div>
  );
}

async function LeaderboardContent({
  sessionId,
  userId,
  page,
}: {
  sessionId: string;
  userId: string;
  page: number;
}) {
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const leaderboardResult = await getEventHighScoreLeaderboard(
    userId,
    sessionId,
    {
      limit: ITEMS_PER_PAGE,
      offset,
    },
  );

  if (!leaderboardResult.data) notFound();

  const { eventId, gameTypeId, isOpen } = leaderboardResult.data;

  const [eventResult, gameTypeResult, pointEntriesResult] = await Promise.all([
    getEvent(userId, eventId),
    getEventGameType(userId, gameTypeId),
    getGameTypePointEntries(userId, eventId, gameTypeId),
  ]);

  if (eventResult.error || !eventResult.data) notFound();
  if (gameTypeResult.error || !gameTypeResult.data) notFound();

  const event = eventResult.data;
  const gameType = gameTypeResult.data;

  if (gameType.category !== GameCategory.HIGH_SCORE) notFound();

  const entries = leaderboardResult.data.entries;
  const total = leaderboardResult.data.total;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const hsConfig = parseHighScoreConfig(gameType.config);
  const isPairMode = isHighScorePartnership(hsConfig);
  const pointEntries = pointEntriesResult.data ?? [];
  const isOrganizer = event.role === EventParticipantRole.ORGANIZER;

  // Build a map of teamName → total points for inline display
  const teamPointsMap = new Map<string, number>();
  for (const pe of pointEntries) {
    if (pe.teamName) {
      teamPointsMap.set(
        pe.teamName,
        (teamPointsMap.get(pe.teamName) ?? 0) + pe.points,
      );
    }
  }

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/events/${eventId}/best-scores/leaderboard/${sessionId}${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          {
            label: "Best Scores",
            href: `/events/${eventId}/best-scores`,
          },
          { label: gameType.name },
        ]}
      />

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{gameType.name}</h2>
          <p className="text-sm text-muted-foreground">
            {isPairMode ? "Pair Leaderboard" : "Individual Leaderboard"}{" "}
            &middot; {hsConfig.scoreDescription}
          </p>
        </div>
        {isOpen && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/events/${eventId}/best-scores/${sessionId}/submit`}>
              <Plus className="mr-1 h-4 w-4" />
              Submit Score
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isPairMode ? "Pair Standings" : "Individual Standings"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Trophy className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="text-muted-foreground">
                No scores recorded yet for this session.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, index) => {
                const teamPoints = entry.teamName
                  ? teamPointsMap.get(entry.teamName)
                  : undefined;
                const showPoints =
                  teamPoints !== undefined &&
                  entries.findIndex((e) => e.teamName === entry.teamName) ===
                    index;
                const isPairEntry = entry.members && entry.members.length > 0;
                const entryKey =
                  entry.entryId ??
                  `${entry.user?.id ?? entry.placeholderParticipant?.id}-${index}`;
                const canDeleteAny = isOrganizer;
                const isOwnEntry = entry.user?.id === userId;
                return (
                  <ScoreEntryRow
                    key={entryKey}
                    entry={entry}
                    isPairEntry={!!isPairEntry}
                    teamPoints={teamPoints}
                    showPoints={showPoints}
                    historyActions={entry.scoreHistory.map((item) => {
                      if (!item.entryId || !item.sessionOpen) return null;
                      if (!canDeleteAny && !isOwnEntry) return null;
                      return (
                        <DeleteHighScoreEntryButton
                          key={item.entryId}
                          entryId={item.entryId}
                        />
                      );
                    })}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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

function LeaderboardSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-64" />
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-1 h-4 w-24" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
