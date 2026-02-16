import { EventNavigation } from "@/components/event-navigation";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole } from "@/lib/shared/constants";
import { getEvent } from "@/services/events";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

interface EventLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function EventLayout({
  children,
  params,
}: EventLayoutProps) {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const result = await getEvent(session.user.id, id);
  const isOrganizer = result.data?.role === EventParticipantRole.ORGANIZER;

  return (
    <>
      <div className="mx-auto max-w-4xl">
        <EventNavigation eventId={id} isOrganizer={isOrganizer} />
      </div>
      <div className="mx-auto max-w-4xl pt-4">{children}</div>
    </>
  );
}
