import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import {
  EventParticipantRole,
  EventStatus,
  GameCategory,
} from "@/lib/shared/constants";
import { getEventGameTypes } from "@/services/event-game-types";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { OpenHighScoreSessionForm } from "./open-high-score-session-form";

interface OpenHighScoreSessionPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: OpenHighScoreSessionPageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Open Best Score Session" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Open Best Score Session" };
  }

  return {
    title: `Open Best Score Session - ${result.data.name}`,
    description: `Open a new best score session for ${result.data.name}`,
  };
}

export default async function OpenHighScoreSessionPage({
  params,
}: OpenHighScoreSessionPageProps) {
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
      <Suspense fallback={<OpenSessionSkeleton />}>
        <OpenSessionContent eventId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function OpenSessionContent({
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

  if (event.role !== EventParticipantRole.ORGANIZER) {
    redirect(`/events/${eventId}`);
  }

  if (event.status !== EventStatus.ACTIVE) {
    redirect(`/events/${eventId}/high-scores`);
  }

  const gameTypesResult = await getEventGameTypes(userId, eventId);
  const gameTypes = (gameTypesResult.data ?? []).filter(
    (gt) => gt.category === GameCategory.HIGH_SCORE && !gt.isArchived,
  );

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Best Scores", href: `/events/${eventId}/high-scores` },
          { label: "Open Session" },
        ]}
      />

      {gameTypes.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No best score game types available.
        </p>
      ) : (
        <OpenHighScoreSessionForm
          eventId={eventId}
          gameTypes={gameTypes.map((gt) => ({ id: gt.id, name: gt.name }))}
        />
      )}
    </>
  );
}

function OpenSessionSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-64" />
      <div className="space-y-4 rounded-lg border p-4 md:p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </>
  );
}
