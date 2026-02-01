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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PlaceholderMember } from "@/db/schema";
import { displayNameSchema } from "@/validators/members";
import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, Edit, RotateCcw, Trash, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  deletePlaceholderAction,
  restorePlaceholderAction,
  retirePlaceholderAction,
  updatePlaceholderAction,
} from "./actions";

interface PlaceholderCardProps {
  placeholder: PlaceholderMember;
  leagueId: string;
  isRetired?: boolean;
  hasActivity?: boolean;
}

const editFormSchema = z.object({
  displayName: displayNameSchema,
});

type EditFormValues = z.infer<typeof editFormSchema>;

export function PlaceholderCard({
  placeholder,
  leagueId,
  isRetired = false,
  hasActivity = false,
}: PlaceholderCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [retireDialogOpen, setRetireDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      displayName: placeholder.displayName,
    },
  });

  const handleEdit = async (values: EditFormValues) => {
    setIsSubmitting(true);
    const result = await updatePlaceholderAction({
      placeholderId: placeholder.id,
      ...values,
    });

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Placeholder updated successfully");
      setEditDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    const result = await deletePlaceholderAction({
      placeholderId: placeholder.id,
      leagueId,
    });

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Placeholder deleted successfully");
      setDeleteDialogOpen(false);
    }
  };

  const handleRetire = async () => {
    setIsSubmitting(true);
    const result = await retirePlaceholderAction({
      placeholderId: placeholder.id,
      leagueId,
    });

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Placeholder retired successfully");
      setRetireDialogOpen(false);
    }
  };

  const handleRestore = async () => {
    setIsSubmitting(true);
    const result = await restorePlaceholderAction({
      placeholderId: placeholder.id,
      leagueId,
    });

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Placeholder restored successfully");
    }
  };

  return (
    <>
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{placeholder.displayName}</p>
              {isRetired && (
                <Badge variant="secondary" className="mt-1">
                  Retired
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isRetired ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRestore}
                disabled={isSubmitting}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRetireDialogOpen(true)}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Retire
                </Button>
                {!hasActivity && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Placeholder</DialogTitle>
            <DialogDescription>
              Update the display name for this placeholder member
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleEdit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Guest Player 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Placeholder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {placeholder.displayName}? This
              action cannot be undone. Placeholders with activity history cannot
              be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={retireDialogOpen} onOpenChange={setRetireDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retire Placeholder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to retire {placeholder.displayName}? Retired
              placeholders will no longer be available for match recording but
              their history will be preserved. You can restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRetire} disabled={isSubmitting}>
              {isSubmitting ? "Retiring..." : "Retire"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
