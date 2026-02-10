import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import { getEventTeam } from "@/services/event-teams";
import { getEvent } from "@/services/events";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { EditEventTeamForm } from "./edit-event-team-form";
import { EventTeamDangerZone } from "./event-team-danger-zone";

interface EventTeamSettingsPageProps {
  params: Promise<{ id: string; teamId: string }>;
}

export async function generateMetadata({
  params,
}: EventTeamSettingsPageProps): Promise<Metadata> {
  const { teamId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Team Settings" };
  }

  const teamResult = await getEventTeam(session.user.id, teamId);
  if (teamResult.error || !teamResult.data) {
    return { title: "Team Not Found" };
  }

  return {
    title: `Settings - ${teamResult.data.name}`,
    description: `Manage settings for ${teamResult.data.name}`,
  };
}

export default async function EventTeamSettingsPage({
  params,
}: EventTeamSettingsPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const { id: eventId, teamId } = await params;

  return (
    <div className="space-y-6">
      <Suspense fallback={<EventTeamSettingsSkeleton />}>
        <EventTeamSettingsContent
          eventId={eventId}
          teamId={teamId}
          userId={session.user.id}
        />
      </Suspense>
    </div>
  );
}

async function EventTeamSettingsContent({
  eventId,
  teamId,
  userId,
}: {
  eventId: string;
  teamId: string;
  userId: string;
}) {
  const [eventResult, teamResult] = await Promise.all([
    getEvent(userId, eventId),
    getEventTeam(userId, teamId),
  ]);

  if (eventResult.error || !eventResult.data) {
    notFound();
  }
  if (teamResult.error || !teamResult.data) {
    notFound();
  }

  const event = eventResult.data;
  const team = teamResult.data;
  const isOrganizer = canPerformEventAction(
    event.role,
    EventAction.MANAGE_TEAMS,
  );

  if (!isOrganizer) {
    redirect(`/events/${eventId}/teams/${teamId}`);
  }

  return (
    <>
      <div>
        <LeagueBreadcrumb
          items={[
            { label: event.name, href: `/events/${eventId}` },
            { label: "Teams", href: `/events/${eventId}/teams` },
            {
              label: team.name,
              href: `/events/${eventId}/teams/${teamId}`,
            },
            { label: "Settings" },
          ]}
        />
        <h1 className="text-2xl font-bold mt-2">Team Settings</h1>
        <p className="text-muted-foreground">Manage {team.name} settings</p>
      </div>

      <EditEventTeamForm team={team} eventId={eventId} />

      <EventTeamDangerZone team={team} eventId={eventId} />
    </>
  );
}

function EventTeamSettingsSkeleton() {
  return (
    <>
      <div className="space-y-2">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-56" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </>
  );
}
