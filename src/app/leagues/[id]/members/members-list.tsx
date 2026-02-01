"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeagueMemberWithUser } from "@/db/league-members";
import { getInitials } from "@/lib/client/utils";
import { LeagueMemberRole } from "@/lib/shared/constants";
import {
  ROLE_BADGE_VARIANTS,
  ROLE_LABELS,
  canActOnRole,
} from "@/lib/shared/roles";
import { MoreHorizontal, Shield, UserMinus, Users } from "lucide-react";
import { useState, useTransition } from "react";

import { removeMemberAction, updateMemberRoleAction } from "./actions";

interface MembersListProps {
  members: LeagueMemberWithUser[];
  currentUserId: string;
  currentUserRole: LeagueMemberRole;
  canManageRoles: boolean;
  canRemove: boolean;
  leagueId: string;
}

export function MembersList({
  members,
  currentUserId,
  currentUserRole,
  canManageRoles,
  canRemove,
  leagueId,
}: MembersListProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleRemove = (targetUserId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await removeMemberAction({ leagueId, targetUserId });
      if (result.error) {
        setError(result.error);
      }
    });
  };

  const handleRoleChange = (
    targetUserId: string,
    newRole: LeagueMemberRole,
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await updateMemberRoleAction({
        leagueId,
        targetUserId,
        role: newRole,
      });
      if (result.error) {
        setError(result.error);
      }
    });
  };

  if (members.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No members in this league.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {members.map((member) => {
        const isCurrentUser = member.userId === currentUserId;
        const canModify =
          !isCurrentUser && canActOnRole(currentUserRole, member.role);

        return (
          <div
            key={member.id}
            className="flex items-start gap-3 rounded-lg border p-3 sm:items-center"
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={member.user.image ?? undefined} />
              <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium wrap-break-word">
                  {member.user.name}
                </span>
                {isCurrentUser && (
                  <span className="text-muted-foreground text-xs shrink-0">
                    (you)
                  </span>
                )}
                <Badge
                  variant={ROLE_BADGE_VARIANTS[member.role]}
                  className="shrink-0 sm:hidden"
                >
                  {ROLE_LABELS[member.role]}
                </Badge>
              </div>
              <div className="text-muted-foreground text-sm truncate">
                @{member.user.username}
              </div>
            </div>
            <Badge
              variant={ROLE_BADGE_VARIANTS[member.role]}
              className="shrink-0 hidden sm:inline-flex"
            >
              {ROLE_LABELS[member.role]}
            </Badge>
            {(canManageRoles || canRemove) && canModify ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isPending}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canManageRoles && canModify && (
                    <>
                      {member.role !== LeagueMemberRole.MEMBER && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(
                              member.userId,
                              LeagueMemberRole.MEMBER,
                            )
                          }
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Set as Member
                        </DropdownMenuItem>
                      )}
                      {member.role !== LeagueMemberRole.MANAGER && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(
                              member.userId,
                              LeagueMemberRole.MANAGER,
                            )
                          }
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Set as Manager
                        </DropdownMenuItem>
                      )}
                      {member.role !== LeagueMemberRole.EXECUTIVE && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(
                              member.userId,
                              LeagueMemberRole.EXECUTIVE,
                            )
                          }
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Set as Executive
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  {canRemove && canModify && (
                    <DropdownMenuItem
                      onClick={() => handleRemove(member.userId)}
                      className="text-destructive focus:text-destructive"
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      Remove from League
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
