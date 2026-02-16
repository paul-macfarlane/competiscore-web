"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { closeHighScoreSessionAction } from "../../../../actions";

interface CloseHighScoreSessionButtonProps {
  sessionId: string;
  eventId: string;
}

export function CloseHighScoreSessionButton({
  sessionId,
  eventId,
}: CloseHighScoreSessionButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    startTransition(async () => {
      const result = await closeHighScoreSessionAction({ sessionId });

      if (result.error) {
        toast.error(result.error);
      } else if (result.data) {
        toast.success("Session closed and points awarded!");
        router.push(`/events/${eventId}/high-scores`);
      }
    });
  };

  return (
    <Button onClick={handleClose} disabled={isPending} variant="destructive">
      {isPending ? "Closing..." : "Close Session & Award Points"}
    </Button>
  );
}
