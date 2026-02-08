"use client";

import {
  recordFFARankedMatchAction,
  recordFFAScoreMatchAction,
} from "@/actions/match-recording";
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
import { MatchParticipantType, ScoringType } from "@/lib/shared/constants";
import { FFAConfig } from "@/lib/shared/game-templates";
import { ParticipantOption } from "@/lib/shared/participant-options";
import {
  recordFFARankedMatchSchema,
  recordFFAScoreMatchSchema,
} from "@/validators/matches";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ParticipantSelector } from "./participant-selector";

type RecordFFAMatchFormProps = {
  leagueId: string;
  gameTypeId: string;
  config: FFAConfig;
  participantOptions: ParticipantOption[];
  currentUserId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

type RankedFormValues = z.input<typeof recordFFARankedMatchSchema>;
type ScoreFormValues = z.input<typeof recordFFAScoreMatchSchema>;

export function RecordFFAMatchForm({
  leagueId,
  gameTypeId,
  config,
  participantOptions,
  currentUserId,
  onSuccess,
  onCancel,
}: RecordFFAMatchFormProps) {
  if (config.scoringType === ScoringType.RANKED_FINISH) {
    return (
      <RankedForm
        leagueId={leagueId}
        gameTypeId={gameTypeId}
        config={config}
        participantOptions={participantOptions}
        currentUserId={currentUserId}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    );
  }

  return (
    <ScoreBasedForm
      leagueId={leagueId}
      gameTypeId={gameTypeId}
      config={config}
      participantOptions={participantOptions}
      currentUserId={currentUserId}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}

function RankedForm({
  leagueId,
  gameTypeId,
  config,
  participantOptions,
  currentUserId,
  onSuccess,
  onCancel,
}: RecordFFAMatchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentUser = participantOptions.find(
    (p) => p.type === MatchParticipantType.USER && p.id === currentUserId,
  );

  const form = useForm<RankedFormValues>({
    resolver: zodResolver(recordFFARankedMatchSchema),
    defaultValues: {
      leagueId,
      gameTypeId,
      playedAt: formatLocalDateTime(new Date()),
      participants: currentUser
        ? [
            { userId: currentUser.id, rank: 1 },
            { userId: undefined, rank: 2 },
          ]
        : [
            { userId: undefined, rank: 1 },
            { userId: undefined, rank: 2 },
          ],
    },
    mode: "onChange",
  });

  const participantsArray = useFieldArray({
    control: form.control,
    name: "participants",
  });

  const onSubmit = (values: RankedFormValues) => {
    startTransition(async () => {
      const result = await recordFFARankedMatchAction(values);

      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof RankedFormValues, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Match recorded successfully!");
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/leagues/${leagueId}/game-types/${gameTypeId}`);
        }
      }
    });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const participants = form.getValues("participants");
    const newParticipants = [...participants];
    [newParticipants[index], newParticipants[index - 1]] = [
      newParticipants[index - 1],
      newParticipants[index],
    ];
    newParticipants.forEach((p, i) => (p.rank = i + 1));
    form.setValue("participants", newParticipants);
  };

  const moveDown = (index: number) => {
    const participants = form.getValues("participants");
    if (index >= participants.length - 1) return;
    const newParticipants = [...participants];
    [newParticipants[index], newParticipants[index + 1]] = [
      newParticipants[index + 1],
      newParticipants[index],
    ];
    newParticipants.forEach((p, i) => (p.rank = i + 1));
    form.setValue("participants", newParticipants);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="playedAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date & Time Played</FormLabel>
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base">
              Participants (in order of finish)
            </FormLabel>
            {participantsArray.fields.length < config.maxPlayers && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  participantsArray.append({
                    userId: undefined,
                    rank: participantsArray.fields.length + 1,
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Order from 1st place at the top to last place at the bottom
          </p>
          {participantsArray.fields.map((field, index) => (
            <div key={field.id} className="flex flex-wrap items-center gap-2">
              <div className="flex shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveDown(index)}
                  disabled={index === participantsArray.fields.length - 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium shrink-0">
                {index + 1}
              </div>
              {participantsArray.fields.length > config.minPlayers && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 ml-auto sm:ml-0 sm:order-last"
                  onClick={() => {
                    participantsArray.remove(index);
                    const participants = form.getValues("participants");
                    participants.forEach((p, i) => {
                      form.setValue(`participants.${i}.rank`, i + 1);
                    });
                  }}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
              <div className="min-w-0 w-full sm:w-auto sm:flex-1">
                <ParticipantSelector
                  options={participantOptions}
                  value={getParticipantValue(
                    // eslint-disable-next-line react-hooks/incompatible-library
                    form.watch(`participants.${index}`),
                  )}
                  onChange={(participant) => {
                    form.setValue(
                      `participants.${index}`,
                      {
                        userId:
                          participant?.type === MatchParticipantType.USER
                            ? participant.id
                            : undefined,
                        teamId:
                          participant?.type === MatchParticipantType.TEAM
                            ? participant.id
                            : undefined,
                        placeholderMemberId:
                          participant?.type === MatchParticipantType.PLACEHOLDER
                            ? participant.id
                            : undefined,
                        rank: index + 1,
                      },
                      { shouldValidate: true },
                    );
                  }}
                />
              </div>
            </div>
          ))}
          {form.formState.errors.participants?.message && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.participants.message}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => (onCancel ? onCancel() : router.back())}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? "Recording..." : "Record Match"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ScoreBasedForm({
  leagueId,
  gameTypeId,
  config,
  participantOptions,
  currentUserId,
  onSuccess,
  onCancel,
}: RecordFFAMatchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentUser = participantOptions.find(
    (p) => p.type === MatchParticipantType.USER && p.id === currentUserId,
  );

  const form = useForm<ScoreFormValues>({
    resolver: zodResolver(recordFFAScoreMatchSchema),
    defaultValues: {
      leagueId,
      gameTypeId,
      playedAt: formatLocalDateTime(new Date()),
      participants: currentUser
        ? [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { userId: currentUser.id, score: "" as any },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { userId: undefined, score: "" as any },
          ]
        : [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { userId: undefined, score: "" as any },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { userId: undefined, score: "" as any },
          ],
    },
    mode: "onChange",
  });

  const participantsArray = useFieldArray({
    control: form.control,
    name: "participants",
  });

  const onSubmit = (values: ScoreFormValues) => {
    startTransition(async () => {
      const result = await recordFFAScoreMatchAction(values);

      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof ScoreFormValues, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Match recorded successfully!");
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/leagues/${leagueId}/game-types/${gameTypeId}`);
        }
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="playedAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date & Time Played</FormLabel>
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base">Participants</FormLabel>
            {participantsArray.fields.length < config.maxPlayers && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  participantsArray.append({
                    userId: undefined,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    score: "" as any,
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
          {participantsArray.fields.map((field, index) => (
            <div key={field.id} className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 w-full sm:w-auto sm:flex-1">
                <ParticipantSelector
                  options={participantOptions}
                  value={getParticipantValue(
                    // eslint-disable-next-line react-hooks/incompatible-library
                    form.watch(`participants.${index}`),
                  )}
                  onChange={(participant) => {
                    const currentScore =
                      form.getValues(`participants.${index}.score`) || 0;
                    form.setValue(
                      `participants.${index}`,
                      {
                        userId:
                          participant?.type === MatchParticipantType.USER
                            ? participant.id
                            : undefined,
                        teamId:
                          participant?.type === MatchParticipantType.TEAM
                            ? participant.id
                            : undefined,
                        placeholderMemberId:
                          participant?.type === MatchParticipantType.PLACEHOLDER
                            ? participant.id
                            : undefined,
                        score: currentScore,
                      },
                      { shouldValidate: true },
                    );
                  }}
                />
              </div>
              <FormField
                control={form.control}
                name={`participants.${index}.score`}
                render={({ field: scoreField }) => (
                  <FormItem className="w-24 shrink-0">
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Score"
                        {...scoreField}
                        onChange={(e) => {
                          const value = e.target.value;
                          scoreField.onChange(
                            value === "" ? "" : parseFloat(value),
                          );
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {participantsArray.fields.length > config.minPlayers && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => participantsArray.remove(index)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {form.formState.errors.participants?.message && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.participants.message}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => (onCancel ? onCancel() : router.back())}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? "Recording..." : "Record Match"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function getParticipantValue(
  participant:
    | { userId?: string; teamId?: string; placeholderMemberId?: string }
    | undefined,
): { id: string; type: MatchParticipantType } | undefined {
  if (!participant) return undefined;
  if (participant.userId)
    return { id: participant.userId, type: MatchParticipantType.USER };
  if (participant.teamId)
    return { id: participant.teamId, type: MatchParticipantType.TEAM };
  if (participant.placeholderMemberId)
    return {
      id: participant.placeholderMemberId,
      type: MatchParticipantType.PLACEHOLDER,
    };
  return undefined;
}
