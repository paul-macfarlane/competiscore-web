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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ReportWithOutcome } from "@/db/reports";
import { getInitials } from "@/lib/client/utils";
import {
  MODERATION_ACTION_LABELS,
  ModerationActionType,
  REPORT_REASON_LABELS,
  ReportStatus,
} from "@/lib/shared/constants";
import { updateReportSchema } from "@/validators/moderation";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Clock, Edit, Trash } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { deleteReportAction, updateReportAction } from "./actions";

interface MyReportCardProps {
  report: ReportWithOutcome;
  leagueId: string;
}

const editReportFormSchema = updateReportSchema.pick({
  reason: true,
  description: true,
  evidence: true,
});

type EditReportFormValues = z.infer<typeof editReportFormSchema>;

export function MyReportCard({ report, leagueId }: MyReportCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditReportFormValues>({
    resolver: zodResolver(editReportFormSchema),
    defaultValues: {
      reason: report.reason,
      description: report.description,
      evidence: report.evidence ?? "",
    },
  });

  const handleEdit = async (values: EditReportFormValues) => {
    setIsSubmitting(true);
    const result = await updateReportAction({
      reportId: report.id,
      leagueId,
      ...values,
    });

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Report updated successfully");
      setEditDialogOpen(false);
      form.reset(values);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    const result = await deleteReportAction({
      reportId: report.id,
      leagueId,
    });

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Report deleted successfully");
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-start gap-3 rounded-lg border p-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={report.reportedUser.image ?? undefined} />
          <AvatarFallback>
            {getInitials(report.reportedUser.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {report.reportedUser.name}
            </p>
            {report.status === ReportStatus.PENDING ? (
              <Badge variant="secondary">Pending</Badge>
            ) : report.moderationAction ? (
              <Badge
                variant={
                  report.moderationAction.action ===
                  ModerationActionType.DISMISSED
                    ? "secondary"
                    : report.moderationAction.action ===
                        ModerationActionType.WARNED
                      ? "default"
                      : "destructive"
                }
              >
                {MODERATION_ACTION_LABELS[report.moderationAction.action]}
              </Badge>
            ) : (
              <Badge variant="outline">Resolved</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            @{report.reportedUser.username}
          </p>
          <p className="text-sm mt-2">
            <span className="font-medium">Reason:</span>{" "}
            {REPORT_REASON_LABELS[report.reason]}
          </p>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {report.description}
          </p>
          {report.status === ReportStatus.RESOLVED &&
            report.moderationAction && (
              <div className="mt-2 rounded-md bg-muted p-2">
                <p className="text-xs font-medium">Outcome:</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {report.moderationAction.reason}
                </p>
                {report.moderationAction.action ===
                  ModerationActionType.SUSPENDED &&
                  report.moderationAction.suspendedUntil && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Suspended until:{" "}
                      {format(
                        new Date(report.moderationAction.suspendedUntil),
                        "PPp",
                      )}
                    </p>
                  )}
              </div>
            )}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(new Date(report.createdAt), "PPp")}
            </div>
            {report.status === ReportStatus.PENDING && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditDialogOpen(true)}
                  className="h-6 px-2"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="h-6 px-2 text-destructive hover:text-destructive"
                >
                  <Trash className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Report</DialogTitle>
            <DialogDescription>
              Update your report against {report.reportedUser.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleEdit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(REPORT_REASON_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what happened..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="evidence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evidence (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Links, screenshots, or other evidence"
                        {...field}
                      />
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
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report against{" "}
              {report.reportedUser.name}? This action cannot be undone.
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
    </>
  );
}
