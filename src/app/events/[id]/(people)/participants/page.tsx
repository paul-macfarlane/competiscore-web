import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole } from "@/lib/shared/constants";
import { getEventParticipants } from "@/services/event-participants";
import { getEventPlaceholders } from "@/services/event-placeholder-participants";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import { User, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { EventParticipantsList } from "./event-participants-list";

interface EventParticipantsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EventParticipantsPageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Event Participants" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Event Not Found" };
  }

  return {
    title: `Participants - ${result.data.name}`,
    description: `Participants of ${result.data.name}`,
  };
}

export default async function EventParticipantsPage({
  params,
}: EventParticipantsPageProps) {
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
      <Suspense fallback={<EventParticipantsSkeleton />}>
        <EventParticipantsContent eventId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function EventParticipantsContent({
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

  const [membersResult, placeholdersResult] = await Promise.all([
    getEventParticipants(userId, eventId),
    getEventPlaceholders(userId, eventId),
  ]);
  const members = membersResult.data ?? [];
  const placeholders = placeholdersResult.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <LeagueBreadcrumb
            items={[
              { label: event.name, href: `/events/${eventId}` },
              { label: "Participants" },
            ]}
          />
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">Participants</h1>
          <p className="text-muted-foreground text-sm">
            View and manage event participants
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants ({members.length})
          </CardTitle>
          {isOrganizer && (
            <Button asChild size="sm">
              <Link href={`/events/${eventId}/participants/invite`}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Participants
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                No participants yet. Invite someone to get started.
              </p>
            </div>
          ) : (
            <EventParticipantsList
              members={members}
              currentUserId={userId}
              currentUserRole={event.role}
              eventId={eventId}
            />
          )}
        </CardContent>
      </Card>

      {(placeholders.length > 0 || isOrganizer) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Placeholder Participants ({placeholders.length})
            </CardTitle>
            {isOrganizer && (
              <Button asChild size="sm">
                <Link href={`/events/${eventId}/participants/placeholders`}>
                  Manage
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {placeholders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <User className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">
                  No placeholder participants yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {placeholders.map((placeholder) => (
                  <div
                    key={placeholder.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="truncate text-sm font-medium">
                      {placeholder.displayName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EventParticipantsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-2 h-8 w-28" />
        <Skeleton className="mt-1 h-4 w-52" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
