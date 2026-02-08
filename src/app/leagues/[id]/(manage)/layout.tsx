import { SectionNavigation } from "@/components/section-navigation";
import { auth } from "@/lib/server/auth";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getLeagueWithRole } from "@/services/leagues";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

interface ManageLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ManageLayout({
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

  const result = await getLeagueWithRole(id, session.user.id);
  const canManage =
    result.data != null &&
    canPerformAction(result.data.role, LeagueAction.CREATE_GAME_TYPES);

  if (!canManage) {
    redirect(`/leagues/${id}`);
  }

  const canEditSettings =
    result.data != null &&
    canPerformAction(result.data.role, LeagueAction.EDIT_SETTINGS);

  const tabs = [
    { label: "Game Types", href: `/leagues/${id}/game-types` },
    { label: "Moderation", href: `/leagues/${id}/moderation` },
    ...(canEditSettings
      ? [{ label: "Settings", href: `/leagues/${id}/settings` }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <SectionNavigation tabs={tabs} />
      {children}
    </div>
  );
}
