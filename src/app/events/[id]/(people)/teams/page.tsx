import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { TeamColorBadge } from "@/components/team-color-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole } from "@/lib/shared/constants";
import { getEventTeams } from "@/services/event-teams";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import { Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

interface EventTeamsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EventTeamsPageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Event Teams" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Event Not Found" };
  }

  return {
    title: `Teams - ${result.data.name}`,
    description: `Teams competing in ${result.data.name}`,
  };
}

export default async function EventTeamsPage({ params }: EventTeamsPageProps) {
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
      <Suspense fallback={<EventTeamsSkeleton />}>
        <EventTeamsContent eventId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function EventTeamsContent({
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

  const teamsResult = await getEventTeams(userId, eventId);
  const teams = teamsResult.data ?? [];

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Teams" },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams</h1>
        {isOrganizer && (
          <Button size="sm" asChild>
            <a href={`/events/${eventId}/teams/new`}>
              <Plus className="mr-1 h-4 w-4" />
              Create Team
            </a>
          </Button>
        )}
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground text-sm">
              No teams have been created yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {team.logo ? (
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted">
                      <Image
                        src={team.logo}
                        alt={team.name}
                        fill
                        className="object-cover p-0.5"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="truncate text-base">
                        {team.name}
                      </CardTitle>
                      {team.color && (
                        <TeamColorBadge
                          name={team.name}
                          color={team.color}
                          className="shrink-0"
                        />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {team.memberCount}{" "}
                      {team.memberCount === 1 ? "participant" : "participants"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="pt-0">
                <Button size="sm" asChild className="ml-auto">
                  <Link href={`/events/${eventId}/teams/${team.id}`}>
                    View Team
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function EventTeamsSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-48" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </>
  );
}
