/* eslint-disable react-hooks/incompatible-library */
"use client";

import { ParticipantSelector } from "@/components/participant-selector";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MatchParticipantType } from "@/lib/shared/constants";
import { ParticipantOption } from "@/lib/shared/participant-options";
import { submitEventHighScoreBaseSchema } from "@/validators/events";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { submitEventHighScoreAction } from "../../../../actions";

type SubmitHighScoreFormValues = z.input<typeof submitEventHighScoreBaseSchema>;

function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

interface SubmitHighScoreFormProps {
  sessionId: string;
  eventId: string;
  gameTypeName: string;
  participantOptions: ParticipantOption[];
  scoreDescription: string;
}

export function SubmitHighScoreForm({
  sessionId,
  eventId,
  gameTypeName,
  participantOptions,
  scoreDescription,
}: SubmitHighScoreFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SubmitHighScoreFormValues>({
    resolver: zodResolver(submitEventHighScoreBaseSchema),
    defaultValues: {
      sessionId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      score: "" as any,
      achievedAt: formatLocalDateTime(new Date()),
    },
    mode: "onChange",
  });

  const selectedParticipant = (() => {
    const userId = form.watch("userId");
    const placeholderId = form.watch("eventPlaceholderParticipantId");
    const teamId = form.watch("eventTeamId");
    if (userId) {
      return { id: userId, type: MatchParticipantType.USER };
    }
    if (teamId) {
      return { id: teamId, type: MatchParticipantType.TEAM };
    }
    if (placeholderId) {
      return { id: placeholderId, type: MatchParticipantType.PLACEHOLDER };
    }
    return undefined;
  })();

  const onSubmit = (values: SubmitHighScoreFormValues) => {
    if (
      !values.userId &&
      !values.eventPlaceholderParticipantId &&
      !values.eventTeamId
    ) {
      toast.error("Please select a participant");
      return;
    }

    startTransition(async () => {
      const result = await submitEventHighScoreAction(values);

      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof SubmitHighScoreFormValues, {
              message,
            });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Score submitted!");
        router.push(`/events/${eventId}/high-scores`);
      }
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 rounded-lg border p-4 md:p-6"
      >
        <div>
          <h3 className="text-lg font-semibold">Submit Score</h3>
          <p className="text-sm text-muted-foreground">
            Game Type: {gameTypeName}
          </p>
        </div>

        <div className="space-y-2">
          <FormLabel>Participant</FormLabel>
          <ParticipantSelector
            options={participantOptions}
            value={selectedParticipant}
            onChange={(val) => {
              form.setValue("userId", undefined, { shouldValidate: true });
              form.setValue("eventPlaceholderParticipantId", undefined, {
                shouldValidate: true,
              });
              form.setValue("eventTeamId", undefined, {
                shouldValidate: true,
              });

              if (val) {
                if (val.type === MatchParticipantType.USER) {
                  form.setValue("userId", val.id, { shouldValidate: true });
                } else if (val.type === MatchParticipantType.TEAM) {
                  form.setValue("eventTeamId", val.id, {
                    shouldValidate: true,
                  });
                } else {
                  form.setValue("eventPlaceholderParticipantId", val.id, {
                    shouldValidate: true,
                  });
                }
              }
            }}
            placeholder="Select who scored"
          />
          {!selectedParticipant && form.formState.isSubmitted && (
            <p className="text-destructive text-sm font-medium">
              Please select a participant
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="score"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{scoreDescription}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  placeholder={`Enter the ${scoreDescription.toLowerCase()}`}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? "" : parseFloat(value));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="achievedAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Achieved At</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  value={field.value as string}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Submitting..." : "Submit Score"}
        </Button>
      </form>
    </Form>
  );
}
