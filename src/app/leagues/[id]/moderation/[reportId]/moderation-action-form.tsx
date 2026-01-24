"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ModerationActionType } from "@/lib/shared/constants";
import {
  MAX_SUSPENSION_DAYS,
  MODERATION_REASON_MAX_LENGTH,
} from "@/services/constants";
import {
  ModerationActionFormValues,
  moderationActionFormSchema,
} from "@/validators/moderation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Gavel, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { takeModerationActionAction } from "../actions";

interface ModerationActionFormProps {
  reportId: string;
  leagueId: string;
}

const REPORT_ACTION_LABELS: Record<
  Exclude<ModerationActionType, "suspension_lifted">,
  string
> = {
  [ModerationActionType.DISMISSED]: "Report Dismissed",
  [ModerationActionType.WARNED]: "Warning Issued",
  [ModerationActionType.SUSPENDED]: "Member Suspended",
  [ModerationActionType.REMOVED]: "Member Removed",
};

export function ModerationActionForm({
  reportId,
  leagueId,
}: ModerationActionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ModerationActionFormValues>({
    resolver: zodResolver(moderationActionFormSchema),
    defaultValues: {
      action: ModerationActionType.DISMISSED,
      reason: "",
      suspensionDays: undefined,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const action = watch("action");
  const reason = watch("reason") || "";

  const onSubmit = (data: ModerationActionFormValues) => {
    setError(null);
    startTransition(async () => {
      const result = await takeModerationActionAction(leagueId, {
        ...data,
        reportId,
      });
      if (result.error) {
        setError(result.error);
      } else {
        toast.success("Moderation action taken successfully");
        router.push(`/leagues/${leagueId}/moderation`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="action">Action</Label>
        <Select
          value={action}
          onValueChange={(v) =>
            setValue("action", v as ModerationActionFormValues["action"])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(REPORT_ACTION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.action && (
          <p className="text-sm text-destructive">{errors.action.message}</p>
        )}
      </div>

      {action === ModerationActionType.SUSPENDED && (
        <div className="space-y-2">
          <Label htmlFor="suspensionDays">Suspension Duration (days)</Label>
          <Input
            id="suspensionDays"
            type="number"
            min={1}
            max={MAX_SUSPENSION_DAYS}
            placeholder="Enter number of days"
            {...register("suspensionDays", { valueAsNumber: true })}
          />
          {errors.suspensionDays && (
            <p className="text-sm text-destructive">
              {errors.suspensionDays.message}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="reason">Reason</Label>
          <span className="text-xs text-muted-foreground">
            {reason.length}/{MODERATION_REASON_MAX_LENGTH}
          </span>
        </div>
        <Textarea
          id="reason"
          placeholder="Explain the reason for this action..."
          rows={3}
          {...register("reason")}
        />
        {errors.reason && (
          <p className="text-sm text-destructive">{errors.reason.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Gavel className="mr-2 h-4 w-4" />
        )}
        Take Action
      </Button>
    </form>
  );
}
