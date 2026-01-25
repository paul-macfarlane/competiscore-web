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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Team } from "@/db/schema";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  archiveTeamAction,
  deleteTeamAction,
  leaveTeamAction,
  unarchiveTeamAction,
} from "../../actions";

type TeamDangerZoneProps = {
  team: Team;
  leagueId: string;
  showLeaveTeam?: boolean;
  teamId: string;
};

export function TeamDangerZone({
  team,
  leagueId,
  showLeaveTeam = false,
  teamId,
}: TeamDangerZoneProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveTeamAction(team.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Team archived");
        router.push(`/leagues/${leagueId}/teams`);
      }
    });
  };

  const handleUnarchive = () => {
    startTransition(async () => {
      const result = await unarchiveTeamAction(team.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Team restored");
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTeamAction(team.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Team deleted");
        router.push(`/leagues/${leagueId}/teams`);
      }
    });
  };

  const handleLeave = () => {
    startTransition(async () => {
      const result = await leaveTeamAction(teamId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("You have left the team");
        router.push(`/leagues/${leagueId}/teams`);
      }
    });
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showLeaveTeam && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Leave Team</p>
                <p className="text-sm text-muted-foreground">
                  Remove yourself from this team. You can be added back by a
                  manager.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={isPending}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Leave
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave Team?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to leave this team? You can be added
                      back by a manager.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLeave}>
                      Leave Team
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="border-t" />
          </>
        )}
        {team.isArchived ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Restore Team</p>
              <p className="text-sm text-muted-foreground">
                Unarchive this team to make it active again.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleUnarchive}
              disabled={isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {isPending ? "Restoring..." : "Restore"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Archive Team</p>
              <p className="text-sm text-muted-foreground">
                Hide this team from the list. Can be restored later.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isPending}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive Team?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will hide the team from the teams list. You can restore
                    it later from the archived section.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchive}>
                    Archive
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className="font-medium">Delete Team</p>
            <p className="text-sm text-muted-foreground">
              Permanently delete this team. This action cannot be undone.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isPending}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Team?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the team and all its members.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
