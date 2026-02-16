import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { auth } from "@/lib/server/auth";
import {
  EventParticipantRole,
  HighScoreSessionStatus,
} from "@/lib/shared/constants";
import { getHighScoreSession } from "@/services/event-high-scores";
import { getEvent } from "@/services/events";
import { PlacementPointConfig } from "@/validators/events";
import { idParamSchema } from "@/validators/shared";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { EditHighScoreSessionForm } from "./edit-high-score-session-form";

type Props = {
  params: Promise<{ id: string; sessionId: string }>;
};

export default async function EditHighScoreSessionPage({ params }: Props) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) notFound();

  const eventId = parsed.data.id;
  const { sessionId } = rawParams;

  const [eventResult, sessionResult] = await Promise.all([
    getEvent(session.user.id, eventId),
    getHighScoreSession(session.user.id, sessionId),
  ]);

  if (!eventResult.data) notFound();
  if (!sessionResult.data) notFound();

  const event = eventResult.data;
  const hsSession = sessionResult.data;

  if (event.role !== EventParticipantRole.ORGANIZER) {
    redirect(`/events/${eventId}/high-scores`);
  }

  if (hsSession.status !== HighScoreSessionStatus.OPEN) {
    redirect(`/events/${eventId}/high-scores`);
  }

  const placementPointConfig: PlacementPointConfig =
    hsSession.placementPointConfig
      ? JSON.parse(hsSession.placementPointConfig)
      : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Best Scores", href: `/events/${eventId}/high-scores` },
          { label: "Edit Session" },
        ]}
      />
      <h1 className="text-2xl font-bold">Edit Best Score Session</h1>
      <EditHighScoreSessionForm
        sessionId={sessionId}
        eventId={eventId}
        defaultValues={{
          name: hsSession.name ?? "",
          description: hsSession.description ?? "",
          placementPointConfig,
        }}
      />
    </div>
  );
}
