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
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { leaveTeamAction } from "../actions";

type LeaveTeamButtonProps = {
  teamId: string;
};

export function LeaveTeamButton({ teamId }: LeaveTeamButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLeave = () => {
    startTransition(async () => {
      const result = await leaveTeamAction(teamId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("You have left the team");
        router.refresh();
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LogOut className="mr-2 h-4 w-4" />
          Leave Team
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave Team?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to leave this team? You can be added back by
            the team creator or a manager.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLeave} disabled={isPending}>
            {isPending ? "Leaving..." : "Leave Team"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
