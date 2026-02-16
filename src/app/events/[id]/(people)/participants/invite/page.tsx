import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole } from "@/lib/shared/constants";
import { getEventPendingInvitations } from "@/services/event-invitations";
import { getEventPlaceholders } from "@/services/event-placeholder-participants";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { EventInviteLinkGenerator } from "./event-invite-link-generator";
import { EventPendingInvitationsList } from "./event-pending-invitations-list";
import { EventUserInviteForm } from "./event-user-invite-form";

interface InvitePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: InvitePageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Invite Participants" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Event Not Found" };
  }

  return {
    title: `Invite Participants - ${result.data.name}`,
    description: `Invite participants to ${result.data.name}`,
  };
}

export default async function EventInvitePage({ params }: InvitePageProps) {
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
      <Suspense fallback={<InviteSkeleton />}>
        <InviteContent eventId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function InviteContent({
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
    redirect(`/events/${eventId}/participants`);
  }

  const [pendingResult, placeholdersResult] = await Promise.all([
    getEventPendingInvitations(eventId, userId),
    getEventPlaceholders(userId, eventId),
  ]);
  const pendingInvitations = pendingResult.data ?? [];
  const placeholders = placeholdersResult.data ?? [];

  const placeholderIdsWithPendingInvites = new Set(
    pendingInvitations
      .map((inv) => inv.placeholder?.id)
      .filter((id): id is string => id != null),
  );
  const availablePlaceholders = placeholders.filter(
    (p) => !p.linkedUserId && !placeholderIdsWithPendingInvites.has(p.id),
  );

  return (
    <>
      <div>
        <LeagueBreadcrumb
          items={[
            { label: event.name, href: `/events/${eventId}` },
            { label: "Participants", href: `/events/${eventId}/participants` },
            { label: "Invite" },
          ]}
        />
        <h1 className="mt-2 text-xl font-bold md:text-2xl">
          Invite Participants
        </h1>
        <p className="text-muted-foreground text-sm">
          Invite users to join this event
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite by Username</CardTitle>
          <CardDescription>
            Search for a user by their name or username to send them an
            invitation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventUserInviteForm
            eventId={eventId}
            placeholders={availablePlaceholders}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate Invite Link</CardTitle>
          <CardDescription>
            Create a shareable link that anyone can use to join the event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventInviteLinkGenerator
            eventId={eventId}
            placeholders={availablePlaceholders}
          />
        </CardContent>
      </Card>

      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Pending Invitations ({pendingInvitations.length})
            </CardTitle>
            <CardDescription>
              Invitations that haven&apos;t been accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventPendingInvitationsList
              invitations={pendingInvitations}
              eventId={eventId}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}

function InviteSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-2 h-7 w-36" />
        <Skeleton className="mt-1 h-4 w-52" />
      </div>
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
