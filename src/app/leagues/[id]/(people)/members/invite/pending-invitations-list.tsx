"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvitationWithDetails } from "@/db/invitations";
import { ROLE_LABELS } from "@/lib/shared/roles";
import { Check, Copy, Link, Trash2, User } from "lucide-react";
import { useState, useTransition } from "react";

import { cancelInvitationAction } from "./actions";

interface PendingInvitationsListProps {
  invitations: InvitationWithDetails[];
  leagueId: string;
}

export function PendingInvitationsList({
  invitations,
  leagueId,
}: PendingInvitationsListProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCancel = (invitationId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await cancelInvitationAction({ invitationId, leagueId });
      if (result.error) {
        setError(result.error);
      }
    });
  };

  const handleCopyLink = async (token: string, invitationId: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedId(invitationId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (invitations.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No pending invitations.</p>
    );
  }

  const hasPlaceholderInvites = invitations.some((inv) => inv.placeholder);

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {hasPlaceholderInvites && (
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="text-muted-foreground">
            <strong>Note:</strong> Placeholders with pending invitations cannot
            be selected for new invites. Cancel an existing invitation to make
            the placeholder available again.
          </p>
        </div>
      )}
      {invitations.map((invitation) => {
        const isLinkInvite = !!invitation.token;
        const expiresAt = invitation.expiresAt
          ? new Date(invitation.expiresAt).toLocaleDateString()
          : null;

        return (
          <div
            key={invitation.id}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              {isLinkInvite ? (
                <Link className="h-5 w-5 text-muted-foreground" />
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">
                  {isLinkInvite
                    ? "Invite Link"
                    : (invitation.invitee?.name ?? "Unknown User")}
                </span>
                <Badge variant="secondary">
                  {ROLE_LABELS[invitation.role]}
                </Badge>
              </div>
              <div className="text-muted-foreground text-sm">
                {isLinkInvite ? (
                  <>
                    {invitation.useCount} uses
                    {invitation.maxUses && ` / ${invitation.maxUses} max`}
                    {expiresAt && ` • Expires ${expiresAt}`}
                    {invitation.placeholder &&
                      ` • For ${invitation.placeholder.displayName}`}
                  </>
                ) : (
                  <>
                    @{invitation.invitee?.username ?? "unknown"}
                    {expiresAt && ` • Expires ${expiresAt}`}
                    {invitation.placeholder &&
                      ` • For ${invitation.placeholder.displayName}`}
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              {isLinkInvite && invitation.token && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() =>
                    handleCopyLink(invitation.token!, invitation.id)
                  }
                >
                  {copiedId === invitation.id ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleCancel(invitation.id)}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
