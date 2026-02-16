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
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { deleteHighScoreSessionAction } from "../../actions";

interface DeleteSessionDialogProps {
  sessionId: string;
  isClosed: boolean;
  hasPointConfig: boolean;
}

export function DeleteSessionDialog({
  sessionId,
  isClosed,
  hasPointConfig,
}: DeleteSessionDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteHighScoreSessionAction({ sessionId });

      if (result.error) {
        toast.error(result.error);
      } else if (result.data) {
        toast.success("Session deleted.");
        router.refresh();
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Best Score Session</AlertDialogTitle>
          <AlertDialogDescription>
            {isClosed && hasPointConfig
              ? "Are you sure you want to delete this session? All score entries will be permanently removed and any awarded points will be reverted. This cannot be undone."
              : "Are you sure you want to delete this session? All score entries will be permanently removed. This cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete Session"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
