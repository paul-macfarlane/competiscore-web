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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Team } from "@/db/schema";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const canDelete = deleteConfirmText === team.name;

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveTeamAction({ teamId: team.id });
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
      const result = await unarchiveTeamAction({ teamId: team.id });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Team restored");
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!canDelete) return;

    startTransition(async () => {
      const result = await deleteTeamAction({ teamId: team.id });
      if (result.error) {
        toast.error(result.error);
      } else {
        setIsDeleteDialogOpen(false);
        toast.success("Team deleted");
        router.push(`/leagues/${leagueId}/teams`);
      }
    });
  };

  const handleLeave = () => {
    startTransition(async () => {
      const result = await leaveTeamAction({ teamId });
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
          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={(open) => {
              setIsDeleteDialogOpen(open);
              if (!open) setDeleteConfirmText("");
            }}
          >
            <DialogTrigger asChild>
              <Button variant="destructive" disabled={isPending}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this team permanently?</DialogTitle>
                <DialogDescription>
                  This will permanently delete the team and all its members.
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                <Label htmlFor="confirm-delete">
                  Type <span className="font-semibold">{team.name}</span> to
                  confirm
                </Label>
                <Input
                  id="confirm-delete"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={team.name}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending || !canDelete}
                >
                  {isPending ? "Deleting..." : "Delete Forever"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
