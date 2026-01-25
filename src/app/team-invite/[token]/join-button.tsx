"use client";

import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { joinTeamViaInviteLinkAction } from "./actions";

interface JoinButtonProps {
  token: string;
  teamId: string;
  leagueId: string;
  userIsLeagueMember: boolean;
}

export function JoinButton({
  token,
  teamId,
  leagueId,
  userIsLeagueMember,
}: JoinButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleJoin = () => {
    setError(null);
    startTransition(async () => {
      const result = await joinTeamViaInviteLinkAction(token);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        if (result.data.joinedLeague) {
          toast.success("Successfully joined league and team!");
        } else {
          toast.success("Successfully joined team!");
        }
        router.push(`/leagues/${leagueId}/teams/${teamId}`);
      }
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
          {error}
        </div>
      )}
      <Button onClick={handleJoin} disabled={isPending} className="w-full">
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Check className="mr-2 h-4 w-4" />
        )}
        {userIsLeagueMember ? "Join Team" : "Join League & Team"}
      </Button>
    </div>
  );
}
