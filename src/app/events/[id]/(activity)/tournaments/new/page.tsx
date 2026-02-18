import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { auth } from "@/lib/server/auth";
import { EventStatus, GameCategory } from "@/lib/shared/constants";
import { getEventGameTypes } from "@/services/event-game-types";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { CreateEventTournamentForm } from "./create-event-tournament-form";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) return { title: "New Tournament" };

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { title: "New Tournament" };

  const result = await getEvent(session.user.id, parsed.data.id);
  if (!result.data) return { title: "New Tournament" };

  return {
    title: `New Tournament - ${result.data.name}`,
    description: `Create a new tournament for ${result.data.name}`,
  };
}

export default async function NewEventTournamentPage({ params }: Props) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) notFound();

  const eventId = parsed.data.id;
  const eventResult = await getEvent(session.user.id, eventId);
  if (!eventResult.data) notFound();

  const event = eventResult.data;

  if (event.role !== "organizer") redirect(`/events/${eventId}/tournaments`);
  if (event.status !== EventStatus.ACTIVE)
    redirect(`/events/${eventId}/tournaments`);

  const gameTypesResult = await getEventGameTypes(session.user.id, eventId);
  const allGameTypes = gameTypesResult.data ?? [];
  const h2hGameTypes = allGameTypes.filter(
    (gt) => gt.category === GameCategory.HEAD_TO_HEAD && !gt.isArchived,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Tournaments", href: `/events/${eventId}/tournaments` },
          { label: "New Tournament" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold">Create Tournament</h1>
        <p className="text-muted-foreground">
          Create a new tournament for {event.name}
        </p>
      </div>
      <CreateEventTournamentForm
        eventId={eventId}
        gameTypes={h2hGameTypes.map((gt) => ({
          id: gt.id,
          name: gt.name,
          category: gt.category,
          config: gt.config,
        }))}
      />
    </div>
  );
}
