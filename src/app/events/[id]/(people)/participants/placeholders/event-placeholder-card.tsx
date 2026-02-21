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
import { EventParticipantWithUser } from "@/db/events";
import { EventPlaceholderParticipant } from "@/db/schema";
import { displayNameSchema } from "@/validators/members";
import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, Edit, Link2, RotateCcw, Trash, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  deleteEventPlaceholderAction,
  restoreEventPlaceholderAction,
  retireEventPlaceholderAction,
  updateEventPlaceholderAction,
} from "./actions";
import { LinkPlaceholderDialog } from "./link-placeholder-dialog";

interface EventPlaceholderCardProps {
  placeholder: EventPlaceholderParticipant;
  eventId: string;
  isRetired?: boolean;
  hasActivity?: boolean;
  linkableParticipants?: EventParticipantWithUser[];
}

const editFormSchema = z.object({
  displayName: displayNameSchema,
});

type EditFormValues = z.infer<typeof editFormSchema>;

export function EventPlaceholderCard({
  placeholder,
  eventId,
  isRetired = false,
  hasActivity = false,
  linkableParticipants,
}: EventPlaceholderCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [retireDialogOpen, setRetireDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      displayName: placeholder.displayName,
    },
  });

  const handleEdit = async (values: EditFormValues) => {
    setIsSubmitting(true);
    const result = await updateEventPlaceholderAction({
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
    const result = await deleteEventPlaceholderAction({
      placeholderId: placeholder.id,
      eventId,
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
    const result = await retireEventPlaceholderAction({
      placeholderId: placeholder.id,
      eventId,
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
    const result = await restoreEventPlaceholderAction({
      placeholderId: placeholder.id,
      eventId,
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
        <CardContent className="flex items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{placeholder.displayName}</p>
              <div className="flex gap-1 mt-1">
                {isRetired && <Badge variant="secondary">Retired</Badge>}
                {placeholder.linkedUserId && (
                  <Badge variant="outline">Linked</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-2 shrink-0">
            {isRetired ? (
              !placeholder.linkedUserId && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleRestore}
                  disabled={isSubmitting}
                  className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                >
                  <RotateCcw className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Restore</span>
                </Button>
              )
            ) : (
              <>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setEditDialogOpen(true)}
                  className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                >
                  <Edit className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                {linkableParticipants && linkableParticipants.length > 0 && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setLinkDialogOpen(true)}
                    className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                  >
                    <Link2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Link</span>
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setRetireDialogOpen(true)}
                  className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                >
                  <Archive className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Retire</span>
                </Button>
                {!hasActivity && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 text-destructive hover:text-destructive"
                  >
                    <Trash className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Delete</span>
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
              Update the display name for this placeholder participant
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
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
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

      {linkableParticipants && linkableParticipants.length > 0 && (
        <LinkPlaceholderDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          placeholder={placeholder}
          eventId={eventId}
          linkableParticipants={linkableParticipants}
        />
      )}
    </>
  );
}
