import { LeagueNavigation } from "@/components/league-navigation";
import { auth } from "@/lib/server/auth";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getLeagueWithRole } from "@/services/leagues";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

interface LeagueLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function LeagueLayout({
  children,
  params,
}: LeagueLayoutProps) {
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

  return (
    <>
      <div className="mx-auto max-w-4xl">
        <LeagueNavigation leagueId={id} canManage={canManage} />
      </div>
      <div className="mx-auto max-w-4xl pt-4">{children}</div>
    </>
  );
}
