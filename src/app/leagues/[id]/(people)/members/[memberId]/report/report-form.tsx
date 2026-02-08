"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LeagueMemberWithUser } from "@/db/league-members";
import { getInitials } from "@/lib/client/utils";
import { REPORT_REASON_LABELS, ReportReason } from "@/lib/shared/constants";
import {
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_EVIDENCE_MAX_LENGTH,
} from "@/services/constants";
import { createReportSchema } from "@/validators/moderation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flag, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createReportAction } from "./actions";

const formSchema = createReportSchema.omit({
  reportedUserId: true,
  leagueId: true,
});
type FormValues = z.infer<typeof formSchema>;

interface ReportFormProps {
  leagueId: string;
  member: LeagueMemberWithUser;
}

export function ReportForm({ leagueId, member }: ReportFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: ReportReason.UNSPORTSMANLIKE,
      description: "",
      evidence: "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const reason = watch("reason");
  const description = watch("description") || "";
  const evidence = watch("evidence") || "";

  const onSubmit = (data: FormValues) => {
    setError(null);
    startTransition(async () => {
      const result = await createReportAction({
        ...data,
        reportedUserId: member.userId,
        leagueId,
      });
      if (result.error) {
        setError(result.error);
      } else {
        toast.success("Report submitted successfully");
        router.push(`/leagues/${leagueId}/members`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 rounded-lg border p-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.user.image ?? undefined} />
          <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{member.user.name}</div>
          <div className="text-muted-foreground text-sm">
            @{member.user.username}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason for Report</Label>
        <Select
          value={reason}
          onValueChange={(v) => setValue("reason", v as ReportReason)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.reason && (
          <p className="text-sm text-destructive">{errors.reason.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Description</Label>
          <span className="text-xs text-muted-foreground">
            {description.length}/{REPORT_DESCRIPTION_MAX_LENGTH}
          </span>
        </div>
        <Textarea
          id="description"
          placeholder="Describe the incident in detail..."
          rows={5}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="evidence">Evidence (Optional)</Label>
          <span className="text-xs text-muted-foreground">
            {evidence.length}/{REPORT_EVIDENCE_MAX_LENGTH}
          </span>
        </div>
        <Textarea
          id="evidence"
          placeholder="Add any relevant evidence, links, or additional context..."
          rows={3}
          {...register("evidence")}
        />
        {errors.evidence && (
          <p className="text-sm text-destructive">{errors.evidence.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Flag className="mr-2 h-4 w-4" />
        )}
        Submit Report
      </Button>
    </form>
  );
}
