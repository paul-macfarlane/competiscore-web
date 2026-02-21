import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole, EventStatus } from "@/lib/shared/constants";
import { getDiscretionaryAwards } from "@/services/event-discretionary";
import { getEventTeams } from "@/services/event-teams";
import { getEvent } from "@/services/events";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { EditDiscretionaryForm } from "./edit-discretionary-form";

const editParamsSchema = z.object({
  id: z.string(),
  awardId: z.string(),
});

interface EditDiscretionaryPageProps {
  params: Promise<{ id: string; awardId: string }>;
}

export async function generateMetadata({
  params,
}: EditDiscretionaryPageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = editParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Award Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Edit Award" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Edit Award" };
  }

  return {
    title: `Edit Award - ${result.data.name}`,
    description: `Edit discretionary award for ${result.data.name}`,
  };
}

export default async function EditDiscretionaryPage({
  params,
}: EditDiscretionaryPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const rawParams = await params;
  const parsed = editParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    notFound();
  }

  const { id, awardId } = parsed.data;

  return (
    <div className="space-y-6">
      <Suspense fallback={<EditDiscretionarySkeleton />}>
        <EditDiscretionaryContent
          eventId={id}
          awardId={awardId}
          userId={session.user.id}
        />
      </Suspense>
    </div>
  );
}

async function EditDiscretionaryContent({
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

  if (event.role !== EventParticipantRole.ORGANIZER) {
    redirect(`/events/${eventId}/discretionary`);
  }

  if (event.status !== EventStatus.ACTIVE) {
    redirect(`/events/${eventId}/discretionary`);
  }

  const [awardsResult, teamsResult] = await Promise.all([
    getDiscretionaryAwards(userId, eventId),
    getEventTeams(userId, eventId),
  ]);

  const awards = awardsResult.data ?? [];
  const award = awards.find((a) => a.id === awardId);
  if (!award) {
    notFound();
  }

  const teams = (teamsResult.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }));

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Discretionary", href: `/events/${eventId}/discretionary` },
          { label: "Edit Award" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold">Edit Award</h1>
        <p className="text-muted-foreground">
          Update this discretionary point award
        </p>
      </div>

      <EditDiscretionaryForm
        awardId={awardId}
        eventId={eventId}
        teams={teams}
        defaultValues={{
          name: award.name,
          description: award.description,
          points: award.points,
          awardedAt: award.awardedAt,
          recipientTeamIds: award.recipientTeams.map((t) => t.id),
        }}
      />
    </>
  );
}

function EditDiscretionarySkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-64" />
      <div className="space-y-4 rounded-lg border p-4 md:p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </>
  );
}
