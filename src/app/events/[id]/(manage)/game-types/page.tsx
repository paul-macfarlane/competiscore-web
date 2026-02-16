import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import {
  EventParticipantRole,
  EventStatus,
  GAME_CATEGORY_LABELS,
  GameCategory,
  ParticipantType,
} from "@/lib/shared/constants";
import { parseGameConfig } from "@/lib/shared/game-config-parser";
import { getEventGameTypes } from "@/services/event-game-types";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import { Archive, ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ArchivedEventGameTypeCard } from "./archived-event-game-type-card";

interface GameTypesPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: GameTypesPageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Game Types" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Game Types" };
  }

  return {
    title: `Game Types - ${result.data.name}`,
    description: `Manage game types for ${result.data.name}`,
  };
}

export default async function EventGameTypesPage({
  params,
}: GameTypesPageProps) {
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

  const eventResult = await getEvent(session.user.id, id);
  if (eventResult.error || !eventResult.data) {
    notFound();
  }

  if (eventResult.data.role !== EventParticipantRole.ORGANIZER) {
    redirect(`/events/${id}`);
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={<GameTypesSkeleton />}>
        <GameTypesContent
          eventId={id}
          userId={session.user.id}
          eventName={eventResult.data.name}
          eventStatus={eventResult.data.status}
        />
      </Suspense>
    </div>
  );
}

async function GameTypesContent({
  eventId,
  userId,
  eventName,
  eventStatus,
}: {
  eventId: string;
  userId: string;
  eventName: string;
  eventStatus: string;
}) {
  const result = await getEventGameTypes(userId, eventId);
  const gameTypes = result.data ?? [];
  const activeGameTypes = gameTypes.filter((gt) => !gt.isArchived);
  const archivedGameTypes = gameTypes.filter((gt) => gt.isArchived);

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: eventName, href: `/events/${eventId}` },
          { label: "Game Types" },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Game Types</h1>
        {(eventStatus === EventStatus.DRAFT ||
          eventStatus === EventStatus.ACTIVE) && (
          <Button asChild>
            <Link href={`/events/${eventId}/game-types/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Game Type
            </Link>
          </Button>
        )}
      </div>

      {activeGameTypes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No game types yet. Add a game type to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {activeGameTypes.map((gt) => (
            <Card key={gt.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {gt.logo && (
                      <div className="relative h-12 w-12 flex items-center justify-center bg-muted rounded-lg overflow-hidden shrink-0">
                        <Image
                          src={gt.logo}
                          alt={gt.name}
                          fill
                          className="object-cover p-1"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg">{gt.name}</CardTitle>
                      {gt.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {gt.description}
                        </p>
                      )}
                      <div className="mt-2 flex gap-2">
                        <Badge variant="secondary" className="shrink-0">
                          {GAME_CATEGORY_LABELS[gt.category as GameCategory] ??
                            gt.category}
                        </Badge>
                        {parseGameConfig(gt.config, gt.category as GameCategory)
                          .participantType === ParticipantType.TEAM && (
                          <Badge variant="outline" className="shrink-0">
                            Team
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button asChild size="sm" className="shrink-0">
                    <Link href={`/events/${eventId}/game-types/${gt.id}`}>
                      View
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {archivedGameTypes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Archive className="h-5 w-5" />
              Archived Game Types
              <Badge variant="secondary">{archivedGameTypes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {archivedGameTypes.map((gameType) => (
                <ArchivedEventGameTypeCard
                  key={gameType.id}
                  gameType={gameType}
                  eventId={eventId}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function GameTypesSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-48" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-36" />
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
          </Card>
        ))}
      </div>
    </>
  );
}
