import { AtLimitMessage } from "@/components/at-limit-message";
import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole, EventStatus } from "@/lib/shared/constants";
import { MAX_EVENT_GAME_TYPES } from "@/services/constants";
import { getEventGameTypes } from "@/services/event-game-types";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { CreateEventGameTypeForm } from "./create-event-game-type-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "New Game Type" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "New Game Type" };
  }

  return {
    title: `New Game Type - ${result.data.name}`,
    description: `Add a game type to ${result.data.name}`,
  };
}

function CreateGameTypeSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="text-center">
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto mt-2 h-5 w-64" />
      </div>
      <div className="space-y-4 rounded-lg border p-4 md:p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

async function CreateGameTypeContent({
  eventId,
  userId,
  eventName,
}: {
  eventId: string;
  userId: string;
  eventName: string;
}) {
  const result = await getEventGameTypes(userId, eventId);
  const gameTypes = result.data ?? [];

  if (gameTypes.length >= MAX_EVENT_GAME_TYPES) {
    return (
      <div className="space-y-4 md:space-y-6">
        <LeagueBreadcrumb
          items={[
            { label: eventName, href: `/events/${eventId}` },
            { label: "Game Types", href: `/events/${eventId}/game-types` },
            { label: "New Game Type" },
          ]}
        />
        <div className="text-center">
          <h1 className="text-xl font-bold md:text-2xl">Create a Game Type</h1>
        </div>
        <AtLimitMessage
          title="Game type limit reached"
          description={`This event has reached the maximum of ${MAX_EVENT_GAME_TYPES} game types.`}
        />
        <Button variant="outline" asChild className="w-full">
          <Link href={`/events/${eventId}/game-types`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to game types
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: eventName, href: `/events/${eventId}` },
          { label: "Game Types", href: `/events/${eventId}/game-types` },
          { label: "New Game Type" },
        ]}
      />
      <div className="text-center">
        <h1 className="text-xl font-bold md:text-2xl">Create a Game Type</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Set up a new game type for your event
        </p>
      </div>
      <CreateEventGameTypeForm eventId={eventId} />
    </div>
  );
}

export default async function NewEventGameTypePage({ params }: PageProps) {
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

  if (eventResult.data.status === EventStatus.COMPLETED) {
    redirect(`/events/${id}/game-types`);
  }

  return (
    <Suspense fallback={<CreateGameTypeSkeleton />}>
      <CreateGameTypeContent
        eventId={id}
        userId={session.user.id}
        eventName={eventResult.data.name}
      />
    </Suspense>
  );
}
