"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { closeHighScoreSessionAction } from "../../actions";

interface CloseSessionDialogProps {
  sessionId: string;
  hasPointConfig: boolean;
}

export function CloseSessionDialog({
  sessionId,
  hasPointConfig,
}: CloseSessionDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    startTransition(async () => {
      const result = await closeHighScoreSessionAction({ sessionId });

      if (result.error) {
        toast.error(result.error);
      } else if (result.data) {
        toast.success(
          hasPointConfig
            ? "Session closed and points awarded!"
            : "Session closed.",
        );
        router.refresh();
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Close Session
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close Best Score Session</AlertDialogTitle>
          <AlertDialogDescription>
            {hasPointConfig
              ? "Are you sure you want to close this session? Points will be awarded based on the placement point configuration."
              : "Are you sure you want to close this session? No points will be awarded."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClose}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending
              ? "Closing..."
              : hasPointConfig
                ? "Close Session & Award Points"
                : "Close Session"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
