import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { auth } from "@/lib/server/auth";
import { TeamAction, canPerformTeamAction } from "@/lib/shared/permissions";
import { getTeam } from "@/services/teams";
import { headers } from "next/headers";
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

  const teamResult = await getTeam(session.user.id, teamId);

  if (teamResult.error || !teamResult.data) {
    notFound();
  }

  const team = teamResult.data;

  const userTeamMember = team.members.find(
    (m) => m.userId === session.user.id && !m.leftAt,
  );
  const isTeamManager =
    userTeamMember &&
    canPerformTeamAction(userTeamMember.role, TeamAction.EDIT_TEAM);

  if (!isTeamManager) {
    redirect(`/leagues/${leagueId}/teams/${teamId}`);
  }

  const isMember = !!userTeamMember;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <LeagueBreadcrumb
          items={[
            { label: "League", href: `/leagues/${leagueId}` },
            { label: "Teams", href: `/leagues/${leagueId}/teams` },
            { label: team.name, href: `/leagues/${leagueId}/teams/${teamId}` },
            { label: "Settings" },
          ]}
        />
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
