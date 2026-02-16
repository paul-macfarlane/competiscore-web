import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { TeamColorBadge } from "@/components/team-color-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import { getEventTeam, getEventTeamMembers } from "@/services/event-teams";
import { getEvent } from "@/services/events";
import { Settings, Users } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

interface EventTeamDetailPageProps {
  params: Promise<{ id: string; teamId: string }>;
}

export async function generateMetadata({
  params,
}: EventTeamDetailPageProps): Promise<Metadata> {
  const { id: eventId, teamId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Team" };
  }

  const teamResult = await getEventTeam(session.user.id, teamId);
  if (teamResult.error || !teamResult.data) {
    return { title: "Team Not Found" };
  }

  const eventResult = await getEvent(session.user.id, eventId);
  const eventName = eventResult.data?.name ?? "Event";

  return {
    title: `${teamResult.data.name} - ${eventName}`,
    description: `Team details for ${teamResult.data.name}`,
  };
}

export default async function EventTeamDetailPage({
  params,
}: EventTeamDetailPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const { id: eventId, teamId } = await params;

  return (
    <div className="space-y-6">
      <Suspense fallback={<EventTeamDetailSkeleton />}>
        <EventTeamDetailContent
          eventId={eventId}
          teamId={teamId}
          userId={session.user.id}
        />
      </Suspense>
    </div>
  );
}

async function EventTeamDetailContent({
  eventId,
  teamId,
  userId,
}: {
  eventId: string;
  teamId: string;
  userId: string;
}) {
  const [eventResult, teamResult, membersResult] = await Promise.all([
    getEvent(userId, eventId),
    getEventTeam(userId, teamId),
    getEventTeamMembers(userId, teamId),
  ]);

  if (eventResult.error || !eventResult.data) {
    notFound();
  }
  if (teamResult.error || !teamResult.data) {
    notFound();
  }

  const event = eventResult.data;
  const team = teamResult.data;
  const members = membersResult.data ?? [];
  const isOrganizer = canPerformEventAction(
    event.role,
    EventAction.MANAGE_TEAMS,
  );

  const userMembers = members.filter((m) => m.user);
  const placeholderParticipants = members.filter(
    (m) => m.placeholderParticipant,
  );

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Teams", href: `/events/${eventId}/teams` },
          { label: team.name },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 items-start gap-3 sm:gap-4 min-w-0">
          {team.logo ? (
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center bg-muted rounded-lg shrink-0 overflow-hidden">
              <Image
                src={team.logo}
                alt={team.name}
                fill
                className="object-cover p-2"
              />
            </div>
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center bg-muted rounded-lg shrink-0">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold sm:text-2xl md:text-3xl wrap-break-word">
              {team.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {team.color && (
                <TeamColorBadge name={team.name} color={team.color} />
              )}
              <Badge variant="secondary">
                {team.memberCount}{" "}
                {team.memberCount === 1 ? "participant" : "participants"}
              </Badge>
            </div>
          </div>
        </div>
        {isOrganizer && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/events/${eventId}/teams/${teamId}/settings`}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants ({userMembers.length})
          </CardTitle>
          {isOrganizer && (
            <Button size="sm" asChild>
              <Link href={`/events/${eventId}/teams/${teamId}/members`}>
                Manage Participants
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {userMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No participants yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-start gap-3 rounded-lg border p-3 sm:items-center"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage
                      src={member.user!.image || undefined}
                      alt={member.user!.name}
                    />
                    <AvatarFallback>
                      {member.user!.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium wrap-break-word">
                      {member.user!.name}
                    </span>
                    <p className="text-sm text-muted-foreground truncate">
                      @{member.user!.username}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(placeholderParticipants.length > 0 || isOrganizer) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              Placeholder Participants ({placeholderParticipants.length})
            </CardTitle>
            {isOrganizer && (
              <Button size="sm" asChild>
                <Link href={`/events/${eventId}/teams/${teamId}/placeholders`}>
                  Manage
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {placeholderParticipants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No placeholder participants</p>
              </div>
            ) : (
              <div className="space-y-3">
                {placeholderParticipants.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-start gap-3 rounded-lg border p-3 sm:items-center"
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

function EventTeamDetailSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-64" />
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
