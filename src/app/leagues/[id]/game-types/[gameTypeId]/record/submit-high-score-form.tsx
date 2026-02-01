"use client";

import { Button } from "@/components/ui/button";
import {
  DateTimePicker,
  formatLocalDateTime,
} from "@/components/ui/datetime-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MatchParticipantType, ParticipantType } from "@/lib/shared/constants";
import { HighScoreConfig } from "@/lib/shared/game-templates";
import { submitHighScoreSchema } from "@/validators/matches";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { submitHighScoreAction } from "./actions";
import { ParticipantOption } from "./page";
import { ParticipantSelector } from "./participant-selector";

type SubmitHighScoreFormProps = {
  leagueId: string;
  gameTypeId: string;
  config: HighScoreConfig;
  participantOptions: ParticipantOption[];
  currentUserId: string;
};

type FormValues = z.input<typeof submitHighScoreSchema>;

export function SubmitHighScoreForm({
  leagueId,
  gameTypeId,
  config,
  participantOptions,
  currentUserId,
}: SubmitHighScoreFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentUser = participantOptions.find(
    (p) => p.type === MatchParticipantType.USER && p.id === currentUserId,
  );

  const filteredOptions =
    config.participantType === ParticipantType.TEAM
      ? participantOptions.filter((p) => p.type === MatchParticipantType.TEAM)
      : participantOptions.filter(
          (p) =>
            p.type === MatchParticipantType.USER ||
            p.type === MatchParticipantType.PLACEHOLDER,
        );

  const form = useForm<FormValues>({
    resolver: zodResolver(submitHighScoreSchema),
    defaultValues: {
      leagueId,
      gameTypeId,
      achievedAt: formatLocalDateTime(new Date()),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      score: "" as any,
      participant: {
        userId:
          config.participantType === ParticipantType.INDIVIDUAL
            ? currentUser?.id
            : undefined,
        teamId: undefined,
        placeholderMemberId: undefined,
      },
    },
    mode: "onChange",
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await submitHighScoreAction(values);

      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof FormValues, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Score submitted successfully!");
        router.push(`/leagues/${leagueId}/game-types/${gameTypeId}`);
      }
    });
  };

  const getParticipantValue = ():
    | {
        id: string;
        type: MatchParticipantType;
      }
    | undefined => {
    // eslint-disable-next-line react-hooks/incompatible-library
    const participant = form.watch("participant");
    const userId = participant?.userId;
    const teamId = participant?.teamId;
    const placeholderMemberId = participant?.placeholderMemberId;
    if (userId) return { id: userId, type: MatchParticipantType.USER };
    if (teamId) return { id: teamId, type: MatchParticipantType.TEAM };
    if (placeholderMemberId)
      return {
        id: placeholderMemberId,
        type: MatchParticipantType.PLACEHOLDER,
      };
    return undefined;
  };

  const scoreLabel = config.scoreDescription || "Score";

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 rounded-lg border p-4 md:p-6"
      >
        <FormField
          control={form.control}
          name="achievedAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date & Time Achieved</FormLabel>
              <FormControl>
                <DateTimePicker
                  date={field.value ? new Date(field.value) : undefined}
                  onDateChange={(date) =>
                    field.onChange(date ? formatLocalDateTime(date) : undefined)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>
            {config.participantType === ParticipantType.TEAM
              ? "Team"
              : "Participant"}
          </FormLabel>
          <ParticipantSelector
            options={filteredOptions}
            value={getParticipantValue()}
            onChange={(participant) => {
              form.setValue(
                "participant.userId",
                participant?.type === MatchParticipantType.USER
                  ? participant.id
                  : undefined,
                { shouldValidate: true },
              );
              form.setValue(
                "participant.teamId",
                participant?.type === MatchParticipantType.TEAM
                  ? participant.id
                  : undefined,
                { shouldValidate: true },
              );
              form.setValue(
                "participant.placeholderMemberId",
                participant?.type === MatchParticipantType.PLACEHOLDER
                  ? participant.id
                  : undefined,
                { shouldValidate: true },
              );
            }}
            placeholder={
              config.participantType === ParticipantType.TEAM
                ? "Select team..."
                : "Select participant..."
            }
          />
        </div>

        <FormField
          control={form.control}
          name="score"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{scoreLabel}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  {...field}
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

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? "Submitting..." : "Submit Score"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
