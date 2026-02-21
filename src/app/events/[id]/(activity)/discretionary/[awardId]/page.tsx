import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { TeamColorBadge } from "@/components/team-color-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole, EventStatus } from "@/lib/shared/constants";
import { getDiscretionaryAwards } from "@/services/event-discretionary";
import { getEvent } from "@/services/events";
import { format, formatDistanceToNow } from "date-fns";
import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { DeleteDiscretionaryDialog } from "../delete-discretionary-dialog";

const paramsSchema = z.object({
  id: z.string(),
  awardId: z.string(),
});

interface DiscretionaryDetailPageProps {
  params: Promise<{ id: string; awardId: string }>;
}

export async function generateMetadata({
  params,
}: DiscretionaryDetailPageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = paramsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Award Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Discretionary Award" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Discretionary Award" };
  }

  return {
    title: `Discretionary Award - ${result.data.name}`,
    description: `Discretionary award details for ${result.data.name}`,
  };
}

export default async function DiscretionaryDetailPage({
  params,
}: DiscretionaryDetailPageProps) {
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

  const { id, awardId } = parsed.data;

  return (
    <div className="space-y-6">
      <Suspense fallback={<DetailSkeleton />}>
        <DetailContent
          eventId={id}
          awardId={awardId}
          userId={session.user.id}
        />
      </Suspense>
    </div>
  );
}

async function DetailContent({
  eventId,
  awardId,
  userId,
}: {
  eventId: string;
  awardId: string;
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
  const award = awards.find((a) => a.id === awardId);
  if (!award) {
    notFound();
  }

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          {
            label: "Discretionary",
            href: `/events/${eventId}/discretionary`,
          },
          { label: award.name },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{award.name}</h1>
        <span className="text-xl font-bold">
          {award.points > 0 ? "+" : ""}
          {award.points} pts
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
          {award.description && (
            <CardDescription>{award.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Recipient Teams
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {award.recipientTeams.map((team) => (
                <TeamColorBadge
                  key={team.id}
                  name={team.name}
                  color={team.color}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <div>
              Awarded by {award.createdBy.name}{" "}
              {formatDistanceToNow(new Date(award.awardedAt), {
                addSuffix: true,
              })}
            </div>
            <div>{format(new Date(award.awardedAt), "PPP 'at' p")}</div>
          </div>
        </CardContent>
      </Card>

      {isOrganizer && event.status === EventStatus.ACTIVE && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/events/${eventId}/discretionary/${award.id}/edit`}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
          <DeleteDiscretionaryDialog
            awardId={award.id}
            awardName={award.name}
            redirectTo={`/events/${eventId}/discretionary`}
          />
        </div>
      )}
    </>
  );
}

function DetailSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-64" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-7 w-20" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-40" />
        </CardContent>
      </Card>
    </>
  );
}
