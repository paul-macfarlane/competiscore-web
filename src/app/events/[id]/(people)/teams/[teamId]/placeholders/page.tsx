import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventStatus } from "@/lib/shared/constants";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import { getEventPlaceholders } from "@/services/event-placeholder-participants";
import {
  getEventTeam,
  getEventTeamMembers,
  getEventTeams,
} from "@/services/event-teams";
import { getEvent } from "@/services/events";
import { User, Users } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { EventTeamMemberActions } from "../event-team-member-actions";
import { AddEventTeamPlaceholderForm } from "./add-event-team-placeholder-form";

interface EventTeamPlaceholdersPageProps {
  params: Promise<{ id: string; teamId: string }>;
}

export async function generateMetadata({
  params,
}: EventTeamPlaceholdersPageProps): Promise<Metadata> {
  const { teamId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Team Placeholders" };
  }

  const teamResult = await getEventTeam(session.user.id, teamId);
  if (teamResult.error || !teamResult.data) {
    return { title: "Team Not Found" };
  }

  return {
    title: `Placeholders - ${teamResult.data.name}`,
    description: `Manage placeholder participants for ${teamResult.data.name}`,
  };
}

export default async function EventTeamPlaceholdersPage({
  params,
}: EventTeamPlaceholdersPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const { id: eventId, teamId } = await params;

  return (
    <div className="space-y-6">
      <Suspense fallback={<EventTeamPlaceholdersSkeleton />}>
        <EventTeamPlaceholdersContent
          eventId={eventId}
          teamId={teamId}
          userId={session.user.id}
        />
      </Suspense>
    </div>
  );
}

async function EventTeamPlaceholdersContent({
  eventId,
  teamId,
  userId,
}: {
  eventId: string;
  teamId: string;
  userId: string;
}) {
  const [
    eventResult,
    teamResult,
    teamMembersResult,
    placeholdersResult,
    allTeamsResult,
  ] = await Promise.all([
    getEvent(userId, eventId),
    getEventTeam(userId, teamId),
    getEventTeamMembers(userId, teamId),
    getEventPlaceholders(userId, eventId),
    getEventTeams(userId, eventId),
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

  const teamMembers = teamMembersResult.data ?? [];
  const allPlaceholders = placeholdersResult.data ?? [];
  const allTeams = allTeamsResult.data ?? [];

  const allTeamMembersResults = await Promise.all(
    allTeams.map((t) => getEventTeamMembers(userId, t.id)),
  );

  const allTeamPlaceholderIds = new Set<string>();
  for (const result of allTeamMembersResults) {
    const members = result.data ?? [];
    for (const m of members) {
      if (m.eventPlaceholderParticipantId)
        allTeamPlaceholderIds.add(m.eventPlaceholderParticipantId);
    }
  }

  const availablePlaceholders = allPlaceholders.filter(
    (p) => !allTeamPlaceholderIds.has(p.id),
  );

  const placeholderParticipants = teamMembers.filter(
    (m) => m.placeholderParticipant,
  );
  const isDraft = event.status === EventStatus.DRAFT;

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Teams", href: `/events/${eventId}/teams` },
          {
            label: team.name,
            href: `/events/${eventId}/teams/${teamId}`,
          },
          { label: "Placeholders" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold">Manage Placeholders</h1>
        <p className="text-muted-foreground text-sm">
          Add or remove placeholder participants from {team.name}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Placeholders ({placeholderParticipants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {placeholderParticipants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">
                  No placeholder participants on this team yet
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {placeholderParticipants.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>
                        {member
                          .placeholderParticipant!.displayName.charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium wrap-break-word">
                        {member.placeholderParticipant!.displayName}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        Placeholder participant
                      </p>
                    </div>
                    {isDraft && <EventTeamMemberActions memberId={member.id} />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Available Placeholders ({availablePlaceholders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AddEventTeamPlaceholderForm
              eventTeamId={teamId}
              availablePlaceholders={availablePlaceholders}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function EventTeamPlaceholdersSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-64" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-56" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
