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

import { reopenHighScoreSessionAction } from "../../actions";

interface ReopenSessionDialogProps {
  sessionId: string;
  hasPointConfig: boolean;
}

export function ReopenSessionDialog({
  sessionId,
  hasPointConfig,
}: ReopenSessionDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleReopen = () => {
    startTransition(async () => {
      const result = await reopenHighScoreSessionAction({ sessionId });

      if (result.error) {
        toast.error(result.error);
      } else if (result.data) {
        toast.success("Session reopened.");
        router.refresh();
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          Reopen
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reopen Best Score Session</AlertDialogTitle>
          <AlertDialogDescription>
            {hasPointConfig
              ? "Are you sure you want to reopen this session? Any points awarded when it was closed will be reverted. Score entries will be preserved."
              : "Are you sure you want to reopen this session? It will accept new score submissions again."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleReopen} disabled={isPending}>
            {isPending ? "Reopening..." : "Reopen Session"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
