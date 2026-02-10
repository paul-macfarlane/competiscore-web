import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole, GameCategory } from "@/lib/shared/constants";
import {
  buildEventParticipantOptions,
  buildEventTeamOptions,
} from "@/lib/shared/participant-options";
import { getEventGameTypes } from "@/services/event-game-types";
import { getEventTeamMembersForParticipants } from "@/services/event-leaderboards";
import { getEventTeams } from "@/services/event-teams";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { RecordEventMatchForm } from "./record-event-match-form";

interface RecordEventMatchPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: RecordEventMatchPageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Record Match" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Event Not Found" };
  }

  return {
    title: `Record Match - ${result.data.name}`,
    description: `Record a match for ${result.data.name}`,
  };
}

export default async function RecordEventMatchPage({
  params,
}: RecordEventMatchPageProps) {
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
      <Suspense fallback={<RecordMatchSkeleton />}>
        <RecordMatchContent eventId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function RecordMatchContent({
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
    redirect(`/events/${eventId}`);
  }

  const [gameTypesResult, teamMembersResult, teamsResult] = await Promise.all([
    getEventGameTypes(userId, eventId),
    getEventTeamMembersForParticipants(userId, eventId),
    getEventTeams(userId, eventId),
  ]);

  const gameTypes = (gameTypesResult.data ?? []).filter(
    (gt) =>
      !gt.isArchived &&
      (gt.category === GameCategory.HEAD_TO_HEAD ||
        gt.category === GameCategory.FREE_FOR_ALL),
  );
  const teamMembers = teamMembersResult.data ?? [];
  const participantOptions = buildEventParticipantOptions(teamMembers);
  const teamOptions = buildEventTeamOptions(teamsResult.data ?? []);

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Matches", href: `/events/${eventId}/matches` },
          { label: "Record Match" },
        ]}
      />

      {gameTypes.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No matchable game types available. Create a Head-to-Head or
          Free-for-All game type first.
        </p>
      ) : participantOptions.length < 2 && teamOptions.length < 2 ? (
        <p className="text-muted-foreground text-sm">
          At least 2 participants on teams are required to record a match.
        </p>
      ) : (
        <RecordEventMatchForm
          eventId={eventId}
          gameTypes={gameTypes}
          participantOptions={participantOptions}
          teamOptions={teamOptions}
        />
      )}
    </>
  );
}

function RecordMatchSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-64" />
      <div className="space-y-4 rounded-lg border p-4 md:p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </>
  );
}
