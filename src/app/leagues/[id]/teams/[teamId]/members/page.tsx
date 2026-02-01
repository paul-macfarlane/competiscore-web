import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLeagueMembers } from "@/db/league-members";
import { getActivePlaceholderMembersByLeague } from "@/db/placeholder-members";
import { getPendingTeamInvitationsForTeam } from "@/db/team-invitations";
import { auth } from "@/lib/server/auth";
import { TeamAction, canPerformTeamAction } from "@/lib/shared/permissions";
import { getTeam } from "@/services/teams";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { AddTeamMemberForm } from "../settings/add-team-member-form";
import { PendingTeamInvitationsList } from "../settings/pending-team-invitations-list";
import { TeamInviteForm } from "../settings/team-invite-form";
import { TeamInviteLinkGenerator } from "../settings/team-invite-link-generator";

type PageProps = {
  params: Promise<{ id: string; teamId: string }>;
};

export default async function TeamMembersPage({ params }: PageProps) {
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
  // Team member management requires being a team manager - no league-level fallback
  const canManageMembers =
    userTeamMember &&
    canPerformTeamAction(userTeamMember.role, TeamAction.ADD_MEMBERS);

  if (!canManageMembers) {
    redirect(`/leagues/${leagueId}/teams/${teamId}`);
  }

  const [leagueMembers, placeholderMembers, pendingInvitations] =
    await Promise.all([
      getLeagueMembers(leagueId),
      getActivePlaceholderMembersByLeague(leagueId),
      getPendingTeamInvitationsForTeam(teamId),
    ]);

  const existingUserIds = new Set(
    team.members.filter((m) => m.userId).map((m) => m.userId),
  );
  const existingPlaceholderIds = new Set(
    team.members
      .filter((m) => m.placeholderMemberId)
      .map((m) => m.placeholderMemberId),
  );

  const availablePlaceholders = placeholderMembers.filter(
    (p) => !existingPlaceholderIds.has(p.id) && !p.retiredAt,
  );

  const pendingInviteeIds = new Set(
    pendingInvitations
      .filter((inv) => inv.inviteeUserId)
      .map((inv) => inv.inviteeUserId),
  );
  const availableUsersForInvite = leagueMembers.filter(
    (m) => !existingUserIds.has(m.userId) && !pendingInviteeIds.has(m.userId),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Teams", href: `/leagues/${leagueId}/teams` },
          { label: team.name, href: `/leagues/${leagueId}/teams/${teamId}` },
          { label: "Members" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold">Invite Team Members</h1>
        <p className="text-muted-foreground">Invite members to {team.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite League Member</CardTitle>
          <CardDescription>
            Send an invitation to an existing league member to join this team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamInviteForm
            teamId={teamId}
            availableUsers={availableUsersForInvite}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate Invite Link</CardTitle>
          <CardDescription>
            Create a shareable link. If someone isn&apos;t in the league yet,
            they&apos;ll be added to both the league and team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamInviteLinkGenerator teamId={teamId} />
        </CardContent>
      </Card>

      <AddTeamMemberForm
        teamId={teamId}
        availablePlaceholders={availablePlaceholders}
      />

      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Pending Invitations ({pendingInvitations.length})
            </CardTitle>
            <CardDescription>
              Invitations that haven&apos;t been accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PendingTeamInvitationsList invitations={pendingInvitations} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
