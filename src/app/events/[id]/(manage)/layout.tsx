import { SectionNavigation } from "@/components/section-navigation";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole } from "@/lib/shared/constants";
import { getEvent } from "@/services/events";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

interface ManageLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function EventManageLayout({
  children,
  params,
}: ManageLayoutProps) {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const result = await getEvent(session.user.id, id);
  if (!result.data || result.data.role !== EventParticipantRole.ORGANIZER) {
    redirect(`/events/${id}`);
  }

  const tabs = [
    { label: "Game Types", href: `/events/${id}/game-types` },
    { label: "Settings", href: `/events/${id}/settings` },
  ];

  return (
    <div className="space-y-4">
      <SectionNavigation tabs={tabs} />
      {children}
    </div>
  );
}
