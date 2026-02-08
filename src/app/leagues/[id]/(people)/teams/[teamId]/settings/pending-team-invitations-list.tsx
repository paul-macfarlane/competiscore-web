"use client";

import { cancelTeamInvitationAction } from "@/app/leagues/[id]/(people)/teams/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamInvitationWithDetails } from "@/db/team-invitations";
import { getInitials } from "@/lib/client/utils";
import { TEAM_ROLE_LABELS } from "@/lib/shared/roles";
import { formatDistanceToNow } from "date-fns";
import { Check, Copy, Link, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface PendingTeamInvitationsListProps {
  invitations: TeamInvitationWithDetails[];
}

export function PendingTeamInvitationsList({
  invitations,
}: PendingTeamInvitationsListProps) {
  return (
    <div className="divide-y">
      {invitations.map((invitation) => (
        <InvitationItem key={invitation.id} invitation={invitation} />
      ))}
    </div>
  );
}

function InvitationItem({
  invitation,
}: {
  invitation: TeamInvitationWithDetails;
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelTeamInvitationAction({
        invitationId: invitation.id,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Invitation cancelled");
      }
    });
  };

  const handleCopyLink = async () => {
    if (!invitation.token) return;

    const inviteUrl = `${window.location.origin}/team-invite/${invitation.token}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const isLinkInvitation = !!invitation.token;

  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      {isLinkInvitation ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-muted">
          <Link className="h-4 w-4 text-muted-foreground" />
        </div>
      ) : invitation.invitee ? (
        <Avatar className="h-10 w-10">
          <AvatarFallback>
            {getInitials(invitation.invitee.name)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-muted">
          <span className="text-sm text-muted-foreground">?</span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isLinkInvitation ? (
            <span className="truncate font-medium">Invite Link</span>
          ) : invitation.invitee ? (
            <span className="truncate font-medium">
              {invitation.invitee.name}
            </span>
          ) : (
            <span className="truncate font-medium text-muted-foreground">
              Unknown user
            </span>
          )}
          <Badge variant="secondary" className="text-xs">
            {TEAM_ROLE_LABELS[invitation.role]}
          </Badge>
        </div>
        <div className="text-muted-foreground text-xs">
          {isLinkInvitation ? (
            <>
              {invitation.useCount} use{invitation.useCount !== 1 ? "s" : ""}
              {invitation.maxUses && ` of ${invitation.maxUses}`}
              {" · "}
            </>
          ) : invitation.invitee ? (
            <>@{invitation.invitee.username} · </>
          ) : null}
          Invited by {invitation.inviter.name}{" "}
          {formatDistanceToNow(invitation.createdAt, { addSuffix: true })}
          {invitation.expiresAt && (
            <>
              {" · "}
              Expires{" "}
              {formatDistanceToNow(invitation.expiresAt, { addSuffix: true })}
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        {isLinkInvitation && invitation.token && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopyLink}
            disabled={isPending}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="sr-only">Copy invite link</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCancel}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          <span className="sr-only">Cancel invitation</span>
        </Button>
      </div>
    </div>
  );
}
