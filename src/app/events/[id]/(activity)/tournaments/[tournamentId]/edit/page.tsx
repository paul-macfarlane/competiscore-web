import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole } from "@/lib/shared/constants";
import { getEventTournament } from "@/services/event-tournaments";
import { getEvent } from "@/services/events";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { EditEventTournamentForm } from "./edit-event-tournament-form";

type PageProps = {
  params: Promise<{ id: string; tournamentId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { tournamentId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { title: "Edit Tournament" };

  const result = await getEventTournament(session.user.id, tournamentId);
  if (!result.data) return { title: "Edit Tournament" };

  return {
    title: `Edit ${result.data.name} | Tournament`,
  };
}

export default async function EditEventTournamentPage({ params }: PageProps) {
  const { id: eventId, tournamentId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const [eventResult, tournamentResult] = await Promise.all([
    getEvent(session.user.id, eventId),
    getEventTournament(session.user.id, tournamentId),
  ]);

  if (eventResult.error || !eventResult.data) notFound();
  if (tournamentResult.error || !tournamentResult.data) notFound();

  const event = eventResult.data;
  const tournament = tournamentResult.data;

  if (event.role !== EventParticipantRole.ORGANIZER) notFound();

  return (
    <div className="space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Tournaments", href: `/events/${eventId}/tournaments` },
          {
            label: tournament.name,
            href: `/events/${eventId}/tournaments/${tournamentId}`,
          },
          { label: "Edit" },
        ]}
      />
      <div className="max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">Edit Tournament</h1>
        <EditEventTournamentForm
          tournamentId={tournamentId}
          eventId={eventId}
          name={tournament.name}
          description={tournament.description}
          logo={tournament.logo}
          status={tournament.status}
          tournamentType={tournament.tournamentType}
          bestOf={tournament.bestOf}
          roundBestOf={tournament.roundBestOf}
        />
      </div>
    </div>
  );
}
