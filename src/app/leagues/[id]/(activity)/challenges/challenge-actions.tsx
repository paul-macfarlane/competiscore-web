"use client";

import { Button } from "@/components/ui/button";
import { ChallengeType, MatchStatus } from "@/lib/shared/constants";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  acceptChallengeAction,
  cancelChallengeAction,
  declineChallengeAction,
} from "./actions";

type ChallengeActionsProps = {
  challengeId: string;
  status: string;
  type: ChallengeType;
  leagueId: string;
  gameTypeId?: string;
};

export function ChallengeActions({
  challengeId,
  status,
  type,
  leagueId,
  gameTypeId,
}: ChallengeActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
      const result = await acceptChallengeAction({ matchId: challengeId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Challenge accepted!");
        router.refresh();
      }
    });
  };

  const handleDecline = () => {
    startTransition(async () => {
      const result = await declineChallengeAction({ matchId: challengeId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Challenge declined");
        router.refresh();
      }
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelChallengeAction({ matchId: challengeId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Challenge cancelled");
        router.refresh();
      }
    });
  };

  if (type === ChallengeType.RECEIVED && status === MatchStatus.PENDING) {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDecline}
          disabled={isPending}
        >
          Decline
        </Button>
        <Button size="sm" onClick={handleAccept} disabled={isPending}>
          Accept
        </Button>
      </div>
    );
  }

  if (
    type === ChallengeType.RECEIVED &&
    status === MatchStatus.ACCEPTED &&
    gameTypeId
  ) {
    return (
      <Button size="sm" asChild>
        <Link href={`/leagues/${leagueId}/challenges/${challengeId}/record`}>
          Record Result
        </Link>
      </Button>
    );
  }

  if (type === ChallengeType.SENT && status === MatchStatus.PENDING) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleCancel}
        disabled={isPending}
      >
        Cancel Challenge
      </Button>
    );
  }

  if (
    type === ChallengeType.SENT &&
    status === MatchStatus.ACCEPTED &&
    gameTypeId
  ) {
    return (
      <Button size="sm" asChild>
        <Link href={`/leagues/${leagueId}/challenges/${challengeId}/record`}>
          Record Result
        </Link>
      </Button>
    );
  }

  return null;
}
