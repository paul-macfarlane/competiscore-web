import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { TeamColorBadge } from "@/components/team-color-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PointEntryWithTeam } from "@/db/events";
import { EventGameType, EventHighScoreSession } from "@/db/schema";
import { auth } from "@/lib/server/auth";
import {
  EventParticipantRole,
  EventStatus,
  GAME_CATEGORY_LABELS,
  GameCategory,
  ParticipantType,
  ScoreOrder,
} from "@/lib/shared/constants";
import { parseHighScoreConfig } from "@/lib/shared/game-config-parser";
import { getEventGameTypes } from "@/services/event-game-types";
import {
  SessionEntryWithTeam,
  getClosedSessions,
  getOpenSessions,
  getSessionEntries,
  getSessionPointEntries,
} from "@/services/event-high-scores";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import { formatDistanceToNow } from "date-fns";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { CloseSessionDialog } from "./close-session-dialog";
import { DeleteHighScoreEntryButton } from "./delete-high-score-entry-button";
import { DeleteSessionDialog } from "./delete-session-dialog";
import { ReopenSessionDialog } from "./reopen-session-dialog";

interface HighScoresPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: HighScoresPageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Best Scores" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Best Scores" };
  }

  return {
    title: `Best Scores - ${result.data.name}`,
    description: `Best score sessions for ${result.data.name}`,
  };
}

export default async function EventHighScoresPage({
  params,
}: HighScoresPageProps) {
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

  return (
    <div className="space-y-6">
      <Suspense fallback={<HighScoresSkeleton />}>
        <HighScoresContent eventId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function HighScoresContent({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  const eventResult = await getEvent(userId, eventId);
  if (eventResult.error || !eventResult.data) {
    notFound();
  }

  const event = eventResult.data;
  const isOrganizer = event.role === EventParticipantRole.ORGANIZER;

  const [sessionsResult, closedSessionsResult, gameTypesResult] =
    await Promise.all([
      getOpenSessions(userId, eventId),
      getClosedSessions(userId, eventId),
      getEventGameTypes(userId, eventId),
    ]);

  const openSessions = sessionsResult.data ?? [];
  const closedSessions = closedSessionsResult.data ?? [];
  const gameTypes = gameTypesResult.data ?? [];
  const gameTypeMap = new Map<string, EventGameType>(
    gameTypes.map((gt) => [gt.id, gt]),
  );
  const highScoreGameTypes = gameTypes.filter(
    (gt) => !gt.isArchived && gt.category === GameCategory.HIGH_SCORE,
  );

  const allSessions = [...openSessions, ...closedSessions];
  const sessionEntriesMap = new Map<string, SessionEntryWithTeam[]>();
  await Promise.all(
    allSessions.map(async (s) => {
      const result = await getSessionEntries(userId, s.id);
      if (result.data) {
        sessionEntriesMap.set(s.id, result.data);
      }
    }),
  );

  const closedSessionIds = closedSessions.map((s) => s.id);
  const pointEntriesResult = await getSessionPointEntries(
    userId,
    eventId,
    closedSessionIds,
  );
  const pointEntries = pointEntriesResult.data ?? [];
  const sessionPointsMap = new Map<string, PointEntryWithTeam[]>();
  for (const entry of pointEntries) {
    if (!entry.eventHighScoreSessionId) continue;
    const existing = sessionPointsMap.get(entry.eventHighScoreSessionId) ?? [];
    existing.push(entry);
    sessionPointsMap.set(entry.eventHighScoreSessionId, existing);
  }

  const hasSessions = openSessions.length > 0 || closedSessions.length > 0;

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Best Scores" },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Best Score Sessions</h1>
        {isOrganizer && event.status === EventStatus.ACTIVE && (
          <Button asChild>
            <a href={`/events/${eventId}/high-scores/open`}>
              <Plus className="mr-2 h-4 w-4" />
              Open Session
            </a>
          </Button>
        )}
      </div>

      {event.status !== EventStatus.ACTIVE ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              This event hasn&apos;t started yet.
              {isOrganizer &&
                " Start the event to begin collecting best scores."}
            </p>
          </CardContent>
        </Card>
      ) : highScoreGameTypes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No best score game types available.
              {isOrganizer && " Create a Best Score game type first."}
            </p>
          </CardContent>
        </Card>
      ) : !hasSessions ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No best score sessions.
              {isOrganizer && " Open a session to start collecting scores."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {openSessions.length > 0 && (
            <div className="space-y-4">
              {openSessions.map((session) => (
                <OpenSessionCard
                  key={session.id}
                  session={session}
                  eventId={eventId}
                  userId={userId}
                  isOrganizer={isOrganizer}
                  gameTypeMap={gameTypeMap}
                  sessionEntriesMap={sessionEntriesMap}
                />
              ))}
            </div>
          )}

          {closedSessions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-muted-foreground">
                Closed Sessions ({closedSessions.length})
              </h2>
              {closedSessions.map((session) => (
                <ClosedSessionCard
                  key={session.id}
                  session={session}
                  eventId={eventId}
                  isOrganizer={isOrganizer}
                  gameTypeMap={gameTypeMap}
                  sessionEntriesMap={sessionEntriesMap}
                  pointEntries={sessionPointsMap.get(session.id) ?? []}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function OpenSessionCard({
  session,
  eventId,
  userId,
  isOrganizer,
  gameTypeMap,
  sessionEntriesMap,
}: {
  session: EventHighScoreSession;
  eventId: string;
  userId: string;
  isOrganizer: boolean;
  gameTypeMap: Map<string, EventGameType>;
  sessionEntriesMap: Map<string, SessionEntryWithTeam[]>;
}) {
  const gameType = gameTypeMap.get(session.eventGameTypeId);
  const hsConfig = gameType ? parseHighScoreConfig(gameType.config) : null;
  const entries = sessionEntriesMap.get(session.id) ?? [];
  const displayEntries = entries.slice(0, 5);
  const hasMore = entries.length > 5;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {session.name || gameType?.name || "Unknown Game Type"}
            </CardTitle>
            {session.name && gameType && (
              <span className="text-xs text-muted-foreground">
                {gameType.name}
              </span>
            )}
            {gameType && (
              <Badge variant="secondary" className="mt-1">
                {GAME_CATEGORY_LABELS[gameType.category as GameCategory] ??
                  gameType.category}
              </Badge>
            )}
          </div>
          <Badge variant="default">Open</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {session.description && (
          <p className="text-sm text-muted-foreground">{session.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Opened{" "}
            {formatDistanceToNow(new Date(session.openedAt), {
              addSuffix: true,
            })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`/events/${eventId}/high-scores/${session.id}/submit`}>
                Submit Score
              </a>
            </Button>
            {isOrganizer && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/events/${eventId}/high-scores/${session.id}/edit`}>
                    Edit
                  </a>
                </Button>
                <CloseSessionDialog
                  sessionId={session.id}
                  hasPointConfig={!!session.placementPointConfig}
                />
                <DeleteSessionDialog
                  sessionId={session.id}
                  isClosed={false}
                  hasPointConfig={!!session.placementPointConfig}
                />
              </>
            )}
          </div>
        </div>

        {displayEntries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Submitted Scores ({entries.length})
              {hsConfig && (
                <span className="ml-1 font-normal">
                  &middot; {hsConfig.scoreDescription}
                </span>
              )}
            </h4>
            {displayEntries.map((entry) => {
              const canDelete = isOrganizer || entry.userId === userId;
              const isPairEntry = entry.members && entry.members.length > 0;
              const pairLabel = isPairEntry
                ? entry
                    .members!.map(
                      (m) =>
                        m.user?.name ??
                        m.placeholderParticipant?.displayName ??
                        "?",
                    )
                    .join(" & ")
                : null;
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isPairEntry ? (
                      <span className="text-sm font-medium truncate">
                        {pairLabel}
                      </span>
                    ) : (
                      <ParticipantDisplay
                        participant={
                          {
                            user: entry.user,
                            placeholderMember: entry.placeholderParticipant,
                          } as ParticipantData
                        }
                        showAvatar
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
                        <span className="text-xs text-muted-foreground">
                          ({entry.teamName})
                        </span>
                      ))}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold tabular-nums">
                      {entry.score}
                      {hsConfig && (
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          {hsConfig.scoreDescription}
                        </span>
                      )}
                    </span>
                    {canDelete && (
                      <DeleteHighScoreEntryButton entryId={entry.id} />
                    )}
                  </div>
                </div>
              );
            })}
            {hasMore && (
              <p className="text-xs text-muted-foreground text-center">
                +{entries.length - 5} more scores
              </p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link
            href={`/events/${eventId}/high-scores/leaderboard/${session.eventGameTypeId}`}
          >
            View Leaderboard
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function ClosedSessionCard({
  session,
  eventId,
  isOrganizer,
  gameTypeMap,
  sessionEntriesMap,
  pointEntries,
}: {
  session: EventHighScoreSession;
  eventId: string;
  isOrganizer: boolean;
  gameTypeMap: Map<string, EventGameType>;
  sessionEntriesMap: Map<string, SessionEntryWithTeam[]>;
  pointEntries: PointEntryWithTeam[];
}) {
  const gameType = gameTypeMap.get(session.eventGameTypeId);
  const entries = sessionEntriesMap.get(session.id) ?? [];
  const totalPoints = pointEntries.reduce((sum, pe) => sum + pe.points, 0);

  const hsConfig = gameType ? parseHighScoreConfig(gameType.config) : null;
  const isTeamParticipant = hsConfig?.participantType === ParticipantType.TEAM;

  // Find the best-scoring individual per team to show who earned the placement
  // Match by team name since individual entries don't have eventTeamId set directly
  const bestEntryByTeamName = new Map<string, SessionEntryWithTeam>();
  if (!isTeamParticipant && hsConfig) {
    const sortedEntries = [...entries].sort((a, b) =>
      hsConfig.scoreOrder === ScoreOrder.HIGHEST_WINS
        ? b.score - a.score
        : a.score - b.score,
    );
    for (const entry of sortedEntries) {
      const teamName = entry.teamName;
      if (teamName && !bestEntryByTeamName.has(teamName)) {
        bestEntryByTeamName.set(teamName, entry);
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {session.name || gameType?.name || "Unknown Game Type"}
            </CardTitle>
            {session.name && gameType && (
              <span className="text-xs text-muted-foreground">
                {gameType.name}
              </span>
            )}
            {gameType && (
              <Badge variant="secondary" className="mt-1">
                {GAME_CATEGORY_LABELS[gameType.category as GameCategory] ??
                  gameType.category}
              </Badge>
            )}
          </div>
          <Badge variant="outline">Closed</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {session.description && (
          <p className="text-sm text-muted-foreground">{session.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="space-y-1 text-sm text-muted-foreground">
            {session.closedAt && (
              <span>
                Closed{" "}
                {formatDistanceToNow(new Date(session.closedAt), {
                  addSuffix: true,
                })}
              </span>
            )}
            <span className="ml-2">&middot; {entries.length} scores</span>
          </div>
          {isOrganizer && (
            <div className="flex gap-2">
              <ReopenSessionDialog
                sessionId={session.id}
                hasPointConfig={!!session.placementPointConfig}
              />
              <DeleteSessionDialog
                sessionId={session.id}
                isClosed={true}
                hasPointConfig={!!session.placementPointConfig}
              />
            </div>
          )}
        </div>

        {pointEntries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Points Awarded ({totalPoints} total)
            </h4>
            {pointEntries.map((pe, index) => {
              const bestEntry = pe.teamName
                ? bestEntryByTeamName.get(pe.teamName)
                : undefined;
              return (
                <div
                  key={pe.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </div>
                    {!isTeamParticipant &&
                      bestEntry &&
                      (bestEntry.members && bestEntry.members.length > 0 ? (
                        <span className="text-sm font-medium truncate">
                          {bestEntry.members
                            .map(
                              (m) =>
                                m.user?.name ??
                                m.placeholderParticipant?.displayName ??
                                "?",
                            )
                            .join(" & ")}
                        </span>
                      ) : (
                        <ParticipantDisplay
                          participant={
                            {
                              user: bestEntry.user,
                              placeholderMember:
                                bestEntry.placeholderParticipant,
                            } as ParticipantData
                          }
                          showAvatar
                          size="sm"
                        />
                      ))}
                    {pe.teamColor ? (
                      <TeamColorBadge
                        name={pe.teamName ?? "Unknown Team"}
                        color={pe.teamColor}
                      />
                    ) : (
                      <span className="text-sm">
                        {pe.teamName ?? "Unknown Team"}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold tabular-nums text-sm">
                    +{pe.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link
            href={`/events/${eventId}/high-scores/leaderboard/${session.eventGameTypeId}`}
          >
            View Leaderboard
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function HighScoresSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-48" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
