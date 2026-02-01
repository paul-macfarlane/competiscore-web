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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  H2HWinningSide,
  MatchParticipantType,
  ScoringType,
} from "@/lib/shared/constants";
import { H2HConfig } from "@/lib/shared/game-templates";
import {
  recordH2HScoreMatchSchema,
  recordH2HWinLossMatchSchema,
} from "@/validators/matches";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  recordH2HScoreMatchAction,
  recordH2HWinLossMatchAction,
} from "./actions";
import { ParticipantOption } from "./page";
import { ParticipantSelector } from "./participant-selector";

type RecordH2HMatchFormProps = {
  leagueId: string;
  gameTypeId: string;
  config: H2HConfig;
  participantOptions: ParticipantOption[];
  currentUserId: string;
};

type WinLossFormValues = z.input<typeof recordH2HWinLossMatchSchema>;
type ScoreFormValues = z.input<typeof recordH2HScoreMatchSchema>;

export function RecordH2HMatchForm({
  leagueId,
  gameTypeId,
  config,
  participantOptions,
  currentUserId,
}: RecordH2HMatchFormProps) {
  if (config.scoringType === ScoringType.WIN_LOSS) {
    return (
      <WinLossForm
        leagueId={leagueId}
        gameTypeId={gameTypeId}
        config={config}
        participantOptions={participantOptions}
        currentUserId={currentUserId}
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
    />
  );
}

function WinLossForm({
  leagueId,
  gameTypeId,
  config,
  participantOptions,
  currentUserId,
}: RecordH2HMatchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentUser = participantOptions.find(
    (p) => p.type === MatchParticipantType.USER && p.id === currentUserId,
  );

  const form = useForm<WinLossFormValues>({
    resolver: zodResolver(recordH2HWinLossMatchSchema),
    defaultValues: {
      leagueId,
      gameTypeId,
      playedAt: formatLocalDateTime(new Date()),
      winningSide: H2HWinningSide.SIDE1,
      side1Participants: currentUser
        ? [{ userId: currentUser.id }]
        : [{ userId: undefined }],
      side2Participants: [{ userId: undefined }],
    },
    mode: "onChange",
  });

  const side1Array = useFieldArray({
    control: form.control,
    name: "side1Participants",
  });

  const side2Array = useFieldArray({
    control: form.control,
    name: "side2Participants",
  });

  const onSubmit = (values: WinLossFormValues) => {
    startTransition(async () => {
      const result = await recordH2HWinLossMatchAction(values);
      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof WinLossFormValues, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Match recorded successfully!");
        router.push(`/leagues/${leagueId}/game-types/${gameTypeId}`);
      }
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 rounded-lg border p-4 md:p-6"
      >
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
            <FormLabel className="text-base">Side 1</FormLabel>
            {side1Array.fields.length < config.maxPlayersPerSide && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => side1Array.append({ userId: undefined })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
          {side1Array.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <div className="flex-1">
                <ParticipantSelector
                  options={participantOptions}
                  value={getParticipantValue(
                    // eslint-disable-next-line react-hooks/incompatible-library
                    form.watch(`side1Participants.${index}`),
                  )}
                  onChange={(participant) => {
                    form.setValue(
                      `side1Participants.${index}`,
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
                      },
                      { shouldValidate: true },
                    );
                  }}
                />
              </div>
              {side1Array.fields.length > config.minPlayersPerSide && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => side1Array.remove(index)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base">Side 2</FormLabel>
            {side2Array.fields.length < config.maxPlayersPerSide && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => side2Array.append({ userId: undefined })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
          {side2Array.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <div className="flex-1">
                <ParticipantSelector
                  options={participantOptions}
                  value={getParticipantValue(
                    form.watch(`side2Participants.${index}`),
                  )}
                  onChange={(participant) => {
                    form.setValue(
                      `side2Participants.${index}`,
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
                      },
                      { shouldValidate: true },
                    );
                  }}
                />
              </div>
              {side2Array.fields.length > config.minPlayersPerSide && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => side2Array.remove(index)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {form.formState.errors.side2Participants?.message && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.side2Participants.message}
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="winningSide"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Result</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="grid gap-2"
                >
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem
                      value={H2HWinningSide.SIDE1}
                      id="side1_wins"
                    />
                    <label
                      htmlFor="side1_wins"
                      className="flex-1 cursor-pointer"
                    >
                      Side 1 Wins
                    </label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem
                      value={H2HWinningSide.SIDE2}
                      id="side2_wins"
                    />
                    <label
                      htmlFor="side2_wins"
                      className="flex-1 cursor-pointer"
                    >
                      Side 2 Wins
                    </label>
                  </div>
                  {config.drawsAllowed && (
                    <div className="flex items-center space-x-2 rounded-lg border p-3">
                      <RadioGroupItem value={H2HWinningSide.DRAW} id="draw" />
                      <label htmlFor="draw" className="flex-1 cursor-pointer">
                        Draw
                      </label>
                    </div>
                  )}
                </RadioGroup>
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
}: RecordH2HMatchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentUser = participantOptions.find(
    (p) => p.type === MatchParticipantType.USER && p.id === currentUserId,
  );

  const form = useForm<ScoreFormValues>({
    resolver: zodResolver(recordH2HScoreMatchSchema),
    defaultValues: {
      leagueId,
      gameTypeId,
      playedAt: formatLocalDateTime(new Date()),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      side1Score: "" as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      side2Score: "" as any,
      side1Participants: currentUser
        ? [{ userId: currentUser.id }]
        : [{ userId: undefined }],
      side2Participants: [{ userId: undefined }],
    },
    mode: "onChange",
  });

  const side1Array = useFieldArray({
    control: form.control,
    name: "side1Participants",
  });

  const side2Array = useFieldArray({
    control: form.control,
    name: "side2Participants",
  });

  const onSubmit = (values: ScoreFormValues) => {
    startTransition(async () => {
      const result = await recordH2HScoreMatchAction(values);

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
        router.push(`/leagues/${leagueId}/game-types/${gameTypeId}`);
      }
    });
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
            <FormLabel className="text-base">Side 1</FormLabel>
            {side1Array.fields.length < config.maxPlayersPerSide && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => side1Array.append({ userId: undefined })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
          {side1Array.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <div className="flex-1">
                <ParticipantSelector
                  options={participantOptions}
                  value={getParticipantValue(
                    // eslint-disable-next-line react-hooks/incompatible-library
                    form.watch(`side1Participants.${index}`),
                  )}
                  onChange={(participant) => {
                    form.setValue(
                      `side1Participants.${index}`,
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
                      },
                      { shouldValidate: true },
                    );
                  }}
                />
              </div>
              {side1Array.fields.length > config.minPlayersPerSide && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => side1Array.remove(index)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <FormField
            control={form.control}
            name="side1Score"
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
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base">Side 2</FormLabel>
            {side2Array.fields.length < config.maxPlayersPerSide && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => side2Array.append({ userId: undefined })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
          {side2Array.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <div className="flex-1">
                <ParticipantSelector
                  options={participantOptions}
                  value={getParticipantValue(
                    form.watch(`side2Participants.${index}`),
                  )}
                  onChange={(participant) => {
                    form.setValue(
                      `side2Participants.${index}`,
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
                      },
                      { shouldValidate: true },
                    );
                  }}
                />
              </div>
              {side2Array.fields.length > config.minPlayersPerSide && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => side2Array.remove(index)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {form.formState.errors.side2Participants?.message && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.side2Participants.message}
            </p>
          )}
          <FormField
            control={form.control}
            name="side2Score"
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
        </div>

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
