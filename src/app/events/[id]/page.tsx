import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { TeamColorBadge } from "@/components/team-color-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole, EventStatus } from "@/lib/shared/constants";
import { EVENT_ROLE_LABELS } from "@/lib/shared/roles";
import { getEventLeaderboard } from "@/services/event-leaderboards";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { LeaveEventButton } from "./leave-event-button";

interface EventHomePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EventHomePageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Event" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Event Not Found" };
  }

  return {
    title: result.data.name,
    description: result.data.description,
  };
}

const STATUS_LABELS: Record<string, string> = {
  [EventStatus.DRAFT]: "Draft",
  [EventStatus.ACTIVE]: "Active",
  [EventStatus.COMPLETED]: "Completed",
};

const STATUS_VARIANTS: Record<string, "secondary" | "default" | "outline"> = {
  [EventStatus.DRAFT]: "outline",
  [EventStatus.ACTIVE]: "default",
  [EventStatus.COMPLETED]: "secondary",
};

export default async function EventHomePage({ params }: EventHomePageProps) {
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
      <Suspense fallback={<EventHomeSkeleton />}>
        <EventHomeContent eventId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function EventHomeContent({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  const result = await getEvent(userId, eventId);
  if (result.error || !result.data) {
    notFound();
  }

  const event = result.data;
  const isOrganizer = event.role === EventParticipantRole.ORGANIZER;

  return (
    <>
      <LeagueBreadcrumb items={[{ label: event.name }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 items-start gap-4 min-w-0">
          {event.logo && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
              <Image
                src={event.logo}
                alt={event.name}
                fill
                className="object-cover p-1"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold md:text-3xl">
                {event.name}
              </h1>
              <Badge variant={STATUS_VARIANTS[event.status] ?? "outline"}>
                {STATUS_LABELS[event.status] ?? event.status}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                Role: {EVENT_ROLE_LABELS[event.role]}
              </Badge>
            </div>
            {event.description && (
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                {event.description}
              </p>
            )}
          </div>
        </div>
        <LeaveEventButton eventId={eventId} isOrganizer={isOrganizer} />
      </div>

      <Suspense
        fallback={
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            </CardContent>
          </Card>
        }
      >
        <LeaderboardPreview eventId={eventId} userId={userId} />
      </Suspense>
    </>
  );
}

async function LeaderboardPreview({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  const result = await getEventLeaderboard(userId, eventId);
  const entries = result.data ?? [];

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No points recorded yet. Start by recording matches!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.eventTeamId}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-sm font-medium w-6 text-center">
                  #{entry.rank}
                </span>
                {entry.teamLogo && (
                  <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded border bg-muted">
                    <Image
                      src={entry.teamLogo}
                      alt={entry.teamName}
                      fill
                      className="object-cover p-0.5"
                    />
                  </div>
                )}
                {entry.teamColor ? (
                  <TeamColorBadge
                    name={entry.teamName}
                    color={entry.teamColor}
                  />
                ) : (
                  <span className="text-sm font-medium truncate">
                    {entry.teamName}
                  </span>
                )}
              </div>
              <span className="text-sm font-bold tabular-nums">
                {entry.totalPoints} pts
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EventHomeSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </CardContent>
      </Card>
    </>
  );
}
