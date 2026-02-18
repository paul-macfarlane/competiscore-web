import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import {
  EventStatus,
  GameCategory,
  ParticipantType,
} from "@/lib/shared/constants";
import {
  getHighScoreGroupSize,
  getScoreDescription,
  isHighScorePartnership,
  parseGameConfig,
  parseHighScoreConfig,
} from "@/lib/shared/game-config-parser";
import {
  buildEventParticipantOptions,
  buildEventTeamOptions,
} from "@/lib/shared/participant-options";
import { getEventGameTypes } from "@/services/event-game-types";
import { getOpenSessions } from "@/services/event-high-scores";
import { getEventTeamMembersForParticipants } from "@/services/event-leaderboards";
import { getEventTeams } from "@/services/event-teams";
import { getEvent } from "@/services/events";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { SubmitHighScoreForm } from "./submit-high-score-form";

const paramsSchema = z.object({
  id: z.uuid(),
  sessionId: z.uuid(),
});

interface SubmitHighScorePageProps {
  params: Promise<{ id: string; sessionId: string }>;
}

export async function generateMetadata({
  params,
}: SubmitHighScorePageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = paramsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Submit Score" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Submit Score" };
  }

  return {
    title: `Submit Score - ${result.data.name}`,
    description: `Submit a best score for ${result.data.name}`,
  };
}

export default async function SubmitHighScorePage({
  params,
}: SubmitHighScorePageProps) {
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

  const { id, sessionId } = parsed.data;

  return (
    <div className="space-y-6">
      <Suspense fallback={<SubmitScoreSkeleton />}>
        <SubmitScoreContent
          eventId={id}
          sessionId={sessionId}
          userId={session.user.id}
        />
      </Suspense>
    </div>
  );
}

async function SubmitScoreContent({
  eventId,
  sessionId,
  userId,
}: {
  eventId: string;
  sessionId: string;
  userId: string;
}) {
  const [
    eventResult,
    teamMembersResult,
    sessionsResult,
    gameTypesResult,
    teamsResult,
  ] = await Promise.all([
    getEvent(userId, eventId),
    getEventTeamMembersForParticipants(userId, eventId),
    getOpenSessions(userId, eventId),
    getEventGameTypes(userId, eventId),
    getEventTeams(userId, eventId),
  ]);

  if (eventResult.error || !eventResult.data) {
    notFound();
  }

  const event = eventResult.data;

  if (event.status !== EventStatus.ACTIVE) {
    redirect(`/events/${eventId}/high-scores`);
  }

  const sessions = sessionsResult.data ?? [];
  const currentSession = sessions.find((s) => s.id === sessionId);
  if (!currentSession) {
    notFound();
  }

  const gameTypes = gameTypesResult.data ?? [];
  const gameType = gameTypes.find(
    (gt) => gt.id === currentSession.eventGameTypeId,
  );

  const config = gameType
    ? parseGameConfig(gameType.config, gameType.category as GameCategory)
    : null;
  const hsConfig =
    gameType?.category === GameCategory.HIGH_SCORE
      ? parseHighScoreConfig(gameType.config)
      : null;
  const isTeamParticipant =
    config && "participantType" in config
      ? config.participantType === ParticipantType.TEAM
      : false;
  const isPairMode = hsConfig ? isHighScorePartnership(hsConfig) : false;
  const groupSize = hsConfig ? getHighScoreGroupSize(hsConfig) : 1;

  const participantOptions = isTeamParticipant
    ? buildEventTeamOptions(teamsResult.data ?? [])
    : buildEventParticipantOptions(teamMembersResult.data ?? []);

  return (
    <>
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Best Scores", href: `/events/${eventId}/high-scores` },
          { label: "Submit Score" },
        ]}
      />

      <SubmitHighScoreForm
        sessionId={sessionId}
        eventId={eventId}
        gameTypeName={gameType?.name ?? "Unknown Game Type"}
        participantOptions={participantOptions}
        scoreDescription={
          gameType
            ? getScoreDescription(gameType.config, gameType.category) || "Score"
            : "Score"
        }
        isPairMode={isPairMode}
        groupSize={groupSize}
      />
    </>
  );
}

function SubmitScoreSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-64" />
      <div className="space-y-4 rounded-lg border p-4 md:p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </>
  );
}
