import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import {
  EventParticipantRole,
  EventStatus,
  TOURNAMENT_STATUS_LABELS,
  TournamentStatus,
} from "@/lib/shared/constants";
import { getEventTournaments } from "@/services/event-tournaments";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

interface TournamentsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: TournamentsPageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Tournaments" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Tournaments" };
  }

  return {
    title: `Tournaments - ${result.data.name}`,
    description: `Tournaments for ${result.data.name}`,
  };
}

export default async function EventTournamentsPage({
  params,
}: TournamentsPageProps) {
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
      <Suspense fallback={<TournamentsSkeleton />}>
        <TournamentsContent eventId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

const STATUS_VARIANTS: Record<string, "secondary" | "default" | "outline"> = {
  [TournamentStatus.DRAFT]: "outline",
  [TournamentStatus.IN_PROGRESS]: "default",
  [TournamentStatus.COMPLETED]: "secondary",
};

async function TournamentsContent({
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

  const tournamentsResult = await getEventTournaments(userId, eventId);
  const tournaments = tournamentsResult.data ?? [];

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Tournaments" },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        {isOrganizer && event.status === EventStatus.ACTIVE && (
          <Button asChild>
            <Link href={`/events/${eventId}/tournaments/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tournament
            </Link>
          </Button>
        )}
      </div>

      {event.status !== EventStatus.ACTIVE ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              This event hasn&apos;t started yet.
              {isOrganizer && " Start the event to begin creating tournaments."}
            </p>
          </CardContent>
        </Card>
      ) : tournaments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No tournaments yet.
              {isOrganizer && " Create a tournament to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tournaments.map((tournament) => (
            <Card key={tournament.id}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  {tournament.logo && (
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted">
                      <Image
                        src={tournament.logo}
                        alt={tournament.name}
                        fill
                        className="object-cover p-1"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">
                      {tournament.name}
                    </CardTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          STATUS_VARIANTS[tournament.status] ?? "outline"
                        }
                      >
                        {TOURNAMENT_STATUS_LABELS[
                          tournament.status as TournamentStatus
                        ] ?? tournament.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {tournament.gameType.name}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              {(tournament.description || tournament.placementPointConfig) && (
                <CardContent className="space-y-2">
                  {tournament.description && (
                    <CardDescription className="line-clamp-2">
                      {tournament.description}
                    </CardDescription>
                  )}
                  {(() => {
                    if (!tournament.placementPointConfig) return null;
                    let config: Array<{ placement: number; points: number }>;
                    try {
                      config = JSON.parse(tournament.placementPointConfig);
                    } catch {
                      return null;
                    }
                    if (!Array.isArray(config) || config.length === 0)
                      return null;
                    const sorted = [...config].sort(
                      (a, b) => a.placement - b.placement,
                    );
                    return (
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">
                          Scoring
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {sorted.map((entry) => (
                            <span
                              key={entry.placement}
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
                            >
                              <span className="text-muted-foreground">
                                {getOrdinal(entry.placement)}
                              </span>
                              <span className="font-medium">
                                {entry.points}pt
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              )}
              <CardFooter className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{tournament.participantCount} teams</span>
                  </div>
                  {tournament.status === TournamentStatus.COMPLETED &&
                    tournament.placementPointConfig && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Points awarded</span>
                      </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(tournament.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/events/${eventId}/tournaments/${tournament.id}`}
                    >
                      View
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function TournamentsSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-48" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-4 w-20" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
