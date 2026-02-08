import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/server/auth";
import { TeamMemberRole } from "@/lib/shared/constants";
import { TeamAction, canPerformTeamAction } from "@/lib/shared/permissions";
import { getTeam } from "@/services/teams";
import { Settings, Users } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LeaveTeamButton } from "./leave-team-button";
import { TeamMemberActions } from "./team-member-actions";

type PageProps = {
  params: Promise<{ id: string; teamId: string }>;
};

export default async function TeamDetailPage({ params }: PageProps) {
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
  const isMember = !!userTeamMember;
  const isTeamManager =
    userTeamMember &&
    canPerformTeamAction(userTeamMember.role, TeamAction.EDIT_TEAM);
  const canManage = isTeamManager;

  return (
    <div className="space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Teams", href: `/leagues/${leagueId}/teams` },
          { label: team.name },
        ]}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 items-start gap-3 sm:gap-4 min-w-0">
          {team.logo ? (
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center bg-muted rounded-lg shrink-0 overflow-hidden">
              <Image
                src={team.logo}
                alt={team.name}
                fill
                className="object-cover p-2"
              />
            </div>
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center bg-muted rounded-lg shrink-0">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold sm:text-2xl md:text-3xl wrap-break-word">
              {team.name}
            </h1>
            {team.description && (
              <p className="text-muted-foreground text-sm sm:text-base mt-1 wrap-break-word">
                {team.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary">
                {team.members.filter((m) => m.user).length}{" "}
                {team.members.filter((m) => m.user).length === 1
                  ? "member"
                  : "members"}
              </Badge>
              {isTeamManager && <Badge variant="outline">Manager</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {canManage && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/leagues/${leagueId}/teams/${teamId}/settings`}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          )}
          {isMember && !isTeamManager && <LeaveTeamButton teamId={team.id} />}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({team.members.filter((m) => m.user).length})
          </CardTitle>
          {canManage && (
            <Button size="sm" asChild>
              <Link href={`/leagues/${leagueId}/teams/${teamId}/members`}>
                Invite Members
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {team.members.filter((m) => m.user).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No members yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {team.members
                .filter((member) => member.user)
                .map((member) => (
                  <div
                    key={member.id}
                    className="flex items-start gap-3 rounded-lg border p-3 sm:items-center"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage
                        src={member.user!.image || undefined}
                        alt={member.user!.name}
                      />
                      <AvatarFallback>
                        {member.user!.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium wrap-break-word">
                          {member.user!.name}
                        </span>
                        {member.role === TeamMemberRole.MANAGER && (
                          <Badge
                            variant="outline"
                            className="shrink-0 sm:hidden"
                          >
                            Manager
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        @{member.user!.username}
                      </p>
                    </div>
                    {member.role === TeamMemberRole.MANAGER && (
                      <Badge
                        variant="outline"
                        className="shrink-0 hidden sm:inline-flex"
                      >
                        Manager
                      </Badge>
                    )}
                    {canManage &&
                      member.role !== TeamMemberRole.MANAGER &&
                      member.userId !== session.user.id && (
                        <TeamMemberActions memberId={member.id} />
                      )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(team.members.some((m) => m.placeholderMember) || canManage) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              Placeholder Members (
              {team.members.filter((m) => m.placeholderMember).length})
            </CardTitle>
            {canManage && (
              <Button size="sm" asChild>
                <Link
                  href={`/leagues/${leagueId}/teams/${teamId}/placeholders`}
                >
                  Manage
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {team.members.filter((m) => m.placeholderMember).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No placeholder members</p>
              </div>
            ) : (
              <div className="space-y-3">
                {team.members
                  .filter((member) => member.placeholderMember)
                  .map((member) => (
                    <div
                      key={member.id}
                      className="flex items-start gap-3 rounded-lg border p-3 sm:items-center"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback>
                          {member
                            .placeholderMember!.displayName.charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium wrap-break-word">
                            {member.placeholderMember!.displayName}
                          </span>
                          {member.role === TeamMemberRole.MANAGER && (
                            <Badge
                              variant="outline"
                              className="shrink-0 sm:hidden"
                            >
                              Manager
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Placeholder member
                        </p>
                      </div>
                      {member.role === TeamMemberRole.MANAGER && (
                        <Badge
                          variant="outline"
                          className="shrink-0 hidden sm:inline-flex"
                        >
                          Manager
                        </Badge>
                      )}
                      {canManage && member.role !== TeamMemberRole.MANAGER && (
                        <TeamMemberActions memberId={member.id} />
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Created By</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={team.createdBy.image || undefined}
                alt={team.createdBy.name}
              />
              <AvatarFallback>
                {team.createdBy.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{team.createdBy.name}</p>
              <p className="text-sm text-muted-foreground">
                @{team.createdBy.username}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
