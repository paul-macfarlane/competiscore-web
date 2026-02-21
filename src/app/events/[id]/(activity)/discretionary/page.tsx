import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { TeamColorBadge } from "@/components/team-color-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole, EventStatus } from "@/lib/shared/constants";
import { getDiscretionaryAwards } from "@/services/event-discretionary";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import { formatDistanceToNow } from "date-fns";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

interface DiscretionaryPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: DiscretionaryPageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Discretionary" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Discretionary" };
  }

  return {
    title: `Discretionary - ${result.data.name}`,
    description: `Discretionary point awards for ${result.data.name}`,
  };
}

export default async function DiscretionaryPage({
  params,
}: DiscretionaryPageProps) {
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
      <Suspense fallback={<DiscretionarySkeleton />}>
        <DiscretionaryContent eventId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function DiscretionaryContent({
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

  const awardsResult = await getDiscretionaryAwards(userId, eventId);
  const awards = awardsResult.data ?? [];

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Discretionary" },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Discretionary</h1>
        {isOrganizer && event.status === EventStatus.ACTIVE && (
          <Button asChild>
            <Link href={`/events/${eventId}/discretionary/create`}>
              <Plus className="mr-2 h-4 w-4" />
              Award Points
            </Link>
          </Button>
        )}
      </div>

      {event.status !== EventStatus.ACTIVE ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              This event hasn&apos;t started yet.
              {isOrganizer &&
                " Start the event to begin awarding discretionary points."}
            </p>
          </CardContent>
        </Card>
      ) : awards.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No discretionary awards yet.
              {isOrganizer &&
                " Award points for special achievements or bonus activities."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {awards.map((award) => (
            <Card key={award.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{award.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {award.description}
                    </CardDescription>
                  </div>
                  <span className="shrink-0 text-lg font-bold">
                    {award.points > 0 ? "+" : ""}
                    {award.points} pts
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {award.recipientTeams.map((team) => (
                    <TeamColorBadge
                      key={team.id}
                      name={team.name}
                      color={team.color}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awarded{" "}
                  {formatDistanceToNow(new Date(award.awardedAt), {
                    addSuffix: true,
                  })}
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/events/${eventId}/discretionary/${award.id}`}>
                    View
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

function DiscretionarySkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-48" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-24" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-4 w-32" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
