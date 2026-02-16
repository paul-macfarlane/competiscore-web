"use client";

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
import type { EventTeam } from "@/db/schema";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteEventTeamAction } from "../../../../actions";

interface EventTeamDangerZoneProps {
  team: EventTeam & { memberCount: number; eventId: string };
  eventId: string;
}

export function EventTeamDangerZone({
  team,
  eventId,
}: EventTeamDangerZoneProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const canDelete = deleteConfirmText === team.name;

  const handleDelete = () => {
    if (!canDelete) return;

    startTransition(async () => {
      const result = await deleteEventTeamAction({ eventTeamId: team.id });
      if (result.error) {
        toast.error(result.error);
      } else {
        setIsDeleteDialogOpen(false);
        toast.success("Team deleted");
        router.push(`/events/${eventId}/teams`);
      }
    });
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
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
                  This will permanently delete the team and all its
                  participants. This action cannot be undone.
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
