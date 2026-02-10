import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole, EventStatus } from "@/lib/shared/constants";
import { getEvent } from "@/services/events";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { CloseHighScoreSessionButton } from "./close-session-button";

const paramsSchema = z.object({
  id: z.uuid(),
  sessionId: z.uuid(),
});

interface CloseHighScoreSessionPageProps {
  params: Promise<{ id: string; sessionId: string }>;
}

export async function generateMetadata({
  params,
}: CloseHighScoreSessionPageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = paramsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Close Session" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Close Session" };
  }

  return {
    title: `Close Session - ${result.data.name}`,
    description: `Close a best score session for ${result.data.name}`,
  };
}

export default async function CloseHighScoreSessionPage({
  params,
}: CloseHighScoreSessionPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const rawParams = await params;
  const parsed = paramsSchema.safeParse(rawParams);
  if (!parsed.success) {
    notFound();
  }

  const { id, sessionId } = parsed.data;

  return (
    <div className="space-y-6">
      <Suspense fallback={<CloseSessionSkeleton />}>
        <CloseSessionContent
          eventId={id}
          sessionId={sessionId}
          userId={session.user.id}
        />
      </Suspense>
    </div>
  );
}

async function CloseSessionContent({
  eventId,
  sessionId,
  userId,
}: {
  eventId: string;
  sessionId: string;
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

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Best Scores", href: `/events/${eventId}/high-scores` },
          { label: "Close Session" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Close Best Score Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Are you sure you want to close this session? Points will be awarded
            based on the placement point configuration.
          </p>
          <CloseHighScoreSessionButton
            sessionId={sessionId}
            eventId={eventId}
          />
        </CardContent>
      </Card>
    </>
  );
}

function CloseSessionSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-64" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-48" />
        </CardContent>
      </Card>
    </>
  );
}
