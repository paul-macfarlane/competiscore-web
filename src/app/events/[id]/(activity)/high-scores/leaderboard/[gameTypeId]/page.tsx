import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { PaginationNav } from "@/components/pagination-nav";
import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { TeamColorBadge } from "@/components/team-color-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { GameCategory } from "@/lib/shared/constants";
import {
  isHighScorePartnership,
  parseHighScoreConfig,
} from "@/lib/shared/game-config-parser";
import { cn } from "@/lib/shared/utils";
import { getEventGameType } from "@/services/event-game-types";
import { getGameTypePointEntries } from "@/services/event-high-scores";
import { getEventHighScoreLeaderboard } from "@/services/event-leaderboards";
import { getEvent } from "@/services/events";
import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

const ITEMS_PER_PAGE = 10;

const paramsSchema = z.object({
  id: z.string().uuid(),
  gameTypeId: z.string().uuid(),
});

interface PageProps {
  params: Promise<{ id: string; gameTypeId: string }>;
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

  const [eventResult, gameTypeResult] = await Promise.all([
    getEvent(session.user.id, parsed.data.id),
    getEventGameType(session.user.id, parsed.data.gameTypeId),
  ]);

  const eventName = eventResult.data?.name ?? "Event";
  const gameTypeName = gameTypeResult.data?.name ?? "Game Type";

  return {
    title: `${gameTypeName} Leaderboard - ${eventName}`,
    description: `${gameTypeName} individual rankings for ${eventName}`,
  };
}

export default async function EventGameTypeLeaderboardPage({
  params,
  searchParams,
}: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const rawParams = await params;
  const parsed = paramsSchema.safeParse(rawParams);
  if (!parsed.success) notFound();

  const { id: eventId, gameTypeId } = parsed.data;
  const rawSearchParams = await searchParams;
  const page = Math.max(1, parseInt(rawSearchParams.page || "1", 10) || 1);

  return (
    <div className="space-y-6">
      <Suspense fallback={<LeaderboardSkeleton />}>
        <LeaderboardContent
          eventId={eventId}
          gameTypeId={gameTypeId}
          userId={session.user.id}
          page={page}
        />
      </Suspense>
    </div>
  );
}

async function LeaderboardContent({
  eventId,
  gameTypeId,
  userId,
  page,
}: {
  eventId: string;
  gameTypeId: string;
  userId: string;
  page: number;
}) {
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const [eventResult, gameTypeResult, leaderboardResult, pointEntriesResult] =
    await Promise.all([
      getEvent(userId, eventId),
      getEventGameType(userId, gameTypeId),
      getEventHighScoreLeaderboard(userId, eventId, gameTypeId, {
        limit: ITEMS_PER_PAGE,
        offset,
      }),
      getGameTypePointEntries(userId, eventId, gameTypeId),
    ]);

  if (eventResult.error || !eventResult.data) notFound();
  if (gameTypeResult.error || !gameTypeResult.data) notFound();

  const event = eventResult.data;
  const gameType = gameTypeResult.data;

  if (gameType.category !== GameCategory.HIGH_SCORE) notFound();

  const entries = leaderboardResult.data?.entries ?? [];
  const total = leaderboardResult.data?.total ?? 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const hsConfig = parseHighScoreConfig(gameType.config);
  const isPairMode = isHighScorePartnership(hsConfig);
  const pointEntries = pointEntriesResult.data ?? [];

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
    return `/events/${eventId}/high-scores/leaderboard/${gameTypeId}${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          {
            label: "Best Scores",
            href: `/events/${eventId}/high-scores`,
          },
          { label: gameType.name },
        ]}
      />

      <div>
        <h2 className="text-2xl font-bold">{gameType.name}</h2>
        <p className="text-sm text-muted-foreground">
          {isPairMode ? "Pair Leaderboard" : "Individual Leaderboard"} &middot;{" "}
          {hsConfig.scoreDescription}
        </p>
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
                No scores recorded yet for this game type.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, index) => {
                const teamPoints = entry.teamName
                  ? teamPointsMap.get(entry.teamName)
                  : undefined;
                // Only show points for the first (best) entry per team
                const showPoints =
                  teamPoints !== undefined &&
                  entries.findIndex((e) => e.teamName === entry.teamName) ===
                    index;
                const isPairEntry = entry.members && entry.members.length > 0;
                const entryKey =
                  entry.entryId ??
                  `${entry.user?.id ?? entry.placeholderParticipant?.id}-${index}`;
                return (
                  <div
                    key={entryKey}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold shrink-0",
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
                      <div className="min-w-0">
                        {isPairEntry ? (
                          <p className="text-sm font-medium truncate">
                            {entry
                              .members!.map(
                                (m) =>
                                  m.user?.name ??
                                  m.placeholderParticipant?.displayName ??
                                  "?",
                              )
                              .join(" & ")}
                          </p>
                        ) : (
                          <ParticipantDisplay
                            participant={
                              {
                                user: entry.user,
                                placeholderMember: entry.placeholderParticipant,
                              } as ParticipantData
                            }
                            showAvatar
                            showUsername
                            size="sm"
                          />
                        )}
                        {entry.teamName &&
                          (entry.teamColor ? (
                            <TeamColorBadge
                              name={entry.teamName}
                              color={entry.teamColor}
                            />
                          ) : (
                            <p className="text-xs text-muted-foreground truncate">
                              {entry.teamName}
                            </p>
                          ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {showPoints && (
                        <span className="text-xs text-muted-foreground">
                          +{teamPoints} pts
                        </span>
                      )}
                      <span className="text-sm font-bold tabular-nums">
                        {entry.bestScore}
                      </span>
                    </div>
                  </div>
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
