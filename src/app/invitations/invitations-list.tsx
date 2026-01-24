"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvitationWithDetails } from "@/db/invitations";
import { ROLE_LABELS } from "@/lib/shared/roles";
import { Check, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { acceptInvitationAction, declineInvitationAction } from "./actions";

interface InvitationsListProps {
  invitations: InvitationWithDetails[];
}

export function InvitationsList({ invitations }: InvitationsListProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();

  const handleAccept = (invitationId: string, leagueId: string) => {
    setError(null);
    setProcessingId(invitationId);
    startTransition(async () => {
      const result = await acceptInvitationAction(invitationId);
      setProcessingId(null);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success("Invitation accepted!", {});
        router.push(`/leagues/${leagueId}`);
      }
    });
  };

  const handleDecline = (invitationId: string) => {
    setError(null);
    setProcessingId(invitationId);
    startTransition(async () => {
      const result = await declineInvitationAction(invitationId);
      setProcessingId(null);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success("Invitation declined");
      }
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {invitation.league.logo ? (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
                <Image
                  src={invitation.league.logo}
                  alt={invitation.league.name}
                  fill
                  className="object-cover p-1"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted">
                <span className="text-lg font-bold text-muted-foreground">
                  {invitation.league.name[0]}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">
                  {invitation.league.name}
                </span>
                <Badge variant="secondary">
                  {ROLE_LABELS[invitation.role]}
                </Badge>
              </div>
              <div className="text-muted-foreground text-sm truncate">
                Invited by @{invitation.inviter.username}
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDecline(invitation.id)}
              disabled={isPending && processingId === invitation.id}
            >
              {isPending && processingId === invitation.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Decline
            </Button>
            <Button
              size="sm"
              onClick={() => handleAccept(invitation.id, invitation.leagueId)}
              disabled={isPending && processingId === invitation.id}
            >
              {isPending && processingId === invitation.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Accept
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
