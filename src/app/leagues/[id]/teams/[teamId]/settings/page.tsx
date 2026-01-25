import { auth } from "@/lib/server/auth";
import {
  LeagueAction,
  TeamAction,
  canPerformAction,
  canPerformTeamAction,
} from "@/lib/shared/permissions";
import { getLeagueWithRole } from "@/services/leagues";
import { getTeam } from "@/services/teams";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EditTeamForm } from "./edit-team-form";
import { TeamDangerZone } from "./team-danger-zone";

type PageProps = {
  params: Promise<{ id: string; teamId: string }>;
};

export default async function TeamSettingsPage({ params }: PageProps) {
  const { id: leagueId, teamId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const [teamResult, leagueResult] = await Promise.all([
    getTeam(session.user.id, teamId),
    getLeagueWithRole(leagueId, session.user.id),
  ]);

  if (teamResult.error || !teamResult.data) {
    notFound();
  }

  if (leagueResult.error || !leagueResult.data) {
    notFound();
  }

  const team = teamResult.data;
  const league = leagueResult.data;

  const userTeamMember = team.members.find(
    (m) => m.userId === session.user.id && !m.leftAt,
  );
  const hasTeamPermission =
    userTeamMember &&
    canPerformTeamAction(userTeamMember.role, TeamAction.EDIT_TEAM);
  const hasLeaguePermission = canPerformAction(
    league.role,
    LeagueAction.MANAGE_TEAMS,
  );
  const canManage = hasTeamPermission || hasLeaguePermission;

  if (!canManage) {
    redirect(`/leagues/${leagueId}/teams/${teamId}`);
  }

  const isTeamManager = hasTeamPermission;
  const isMember = !!userTeamMember;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/leagues/${leagueId}/teams/${teamId}`}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Back to team
        </Link>
        <h1 className="text-2xl font-bold mt-2">Team Settings</h1>
        <p className="text-muted-foreground">Manage {team.name} settings</p>
      </div>

      <EditTeamForm team={team} />

      <TeamDangerZone
        team={team}
        leagueId={leagueId}
        teamId={teamId}
        showLeaveTeam={isTeamManager && isMember}
      />
    </div>
  );
}
