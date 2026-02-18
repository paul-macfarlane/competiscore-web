/* eslint-disable react-hooks/incompatible-library */
"use client";

import {
  recordH2HScoreMatchAction,
  recordH2HWinLossMatchAction,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  H2HWinningSide,
  MatchParticipantType,
  ScoringType,
} from "@/lib/shared/constants";
import { H2HConfig } from "@/lib/shared/game-templates";
import { ParticipantOption } from "@/lib/shared/participant-options";
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

import { ParticipantData, ParticipantDisplay } from "./participant-display";
import { ParticipantSelector } from "./participant-selector";
import { TeamColorBadge } from "./team-color-badge";

function getSelectedParticipantIds(
  side1: Array<{
    userId?: string;
    teamId?: string;
    placeholderMemberId?: string;
  }>,
  side2: Array<{
    userId?: string;
    teamId?: string;
    placeholderMemberId?: string;
  }>,
  excludeSide: "side1" | "side2",
  excludeIndex: number,
): Set<string> {
  const ids = new Set<string>();
  side1.forEach((p, i) => {
    if (excludeSide === "side1" && i === excludeIndex) return;
    const id = p.userId || p.teamId || p.placeholderMemberId;
    if (id) ids.add(id);
  });
  side2.forEach((p, i) => {
    if (excludeSide === "side2" && i === excludeIndex) return;
    const id = p.userId || p.teamId || p.placeholderMemberId;
    if (id) ids.add(id);
  });
  return ids;
}

export type TournamentMatchProps = {
  tournamentMatchId: string;
  side1Name: string;
  side2Name: string;
  side1Participant?: ParticipantData;
  side2Participant?: ParticipantData;
  side1TeamName?: string;
  side2TeamName?: string;
  side1TeamColor?: string | null;
  side2TeamColor?: string | null;
  allowDraw?: boolean;
  onSubmitAction: (
    input: unknown,
  ) => Promise<{ error?: string; data?: unknown }>;
};

type RecordH2HMatchFormProps = {
  leagueId: string;
  gameTypeId: string;
  config: H2HConfig;
  participantOptions: ParticipantOption[];
  currentUserId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  tournamentMatch?: TournamentMatchProps;
};

type WinLossFormValues = z.input<typeof recordH2HWinLossMatchSchema>;
type ScoreFormValues = z.input<typeof recordH2HScoreMatchSchema>;

export function RecordH2HMatchForm({
  leagueId,
  gameTypeId,
  config,
  participantOptions,
  currentUserId,
  onSuccess,
  onCancel,
  tournamentMatch,
}: RecordH2HMatchFormProps) {
  if (tournamentMatch) {
    if (config.scoringType === ScoringType.WIN_LOSS) {
      return (
        <TournamentWinLossForm
          tournamentMatch={tournamentMatch}
          config={config}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );
    }
    return (
      <TournamentScoreForm
        tournamentMatch={tournamentMatch}
        config={config}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    );
  }

  if (config.scoringType === ScoringType.WIN_LOSS) {
    return (
      <WinLossForm
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

function WinLossForm({
  leagueId,
  gameTypeId,
  config,
  participantOptions,
  currentUserId,
  onSuccess,
  onCancel,
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
            <div key={field.id} className="space-y-1">
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <ParticipantSelector
                    options={participantOptions.filter((o) => {
                      const selected = getSelectedParticipantIds(
                        form.watch("side1Participants"),
                        form.watch("side2Participants"),
                        "side1",
                        index,
                      );
                      return !selected.has(o.id);
                    })}
                    value={getParticipantValue(
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
                            participant?.type ===
                            MatchParticipantType.PLACEHOLDER
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
              {!!form.formState.errors.side1Participants?.[index] && (
                <p className="text-sm font-medium text-destructive">
                  Please select a participant
                </p>
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
            <div key={field.id} className="space-y-1">
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <ParticipantSelector
                    options={participantOptions.filter((o) => {
                      const selected = getSelectedParticipantIds(
                        form.watch("side1Participants"),
                        form.watch("side2Participants"),
                        "side2",
                        index,
                      );
                      return !selected.has(o.id);
                    })}
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
                            participant?.type ===
                            MatchParticipantType.PLACEHOLDER
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
              {!!form.formState.errors.side2Participants?.[index] && (
                <p className="text-sm font-medium text-destructive">
                  Please select a participant
                </p>
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
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/leagues/${leagueId}/game-types/${gameTypeId}`);
        }
      }
    });
  };

  const scoreLabel = config.scoreDescription || "Score";

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
            <div key={field.id} className="space-y-1">
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <ParticipantSelector
                    options={participantOptions.filter((o) => {
                      const selected = getSelectedParticipantIds(
                        form.watch("side1Participants"),
                        form.watch("side2Participants"),
                        "side1",
                        index,
                      );
                      return !selected.has(o.id);
                    })}
                    value={getParticipantValue(
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
                            participant?.type ===
                            MatchParticipantType.PLACEHOLDER
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
              {!!form.formState.errors.side1Participants?.[index] && (
                <p className="text-sm font-medium text-destructive">
                  Please select a participant
                </p>
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
            <div key={field.id} className="space-y-1">
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <ParticipantSelector
                    options={participantOptions.filter((o) => {
                      const selected = getSelectedParticipantIds(
                        form.watch("side1Participants"),
                        form.watch("side2Participants"),
                        "side2",
                        index,
                      );
                      return !selected.has(o.id);
                    })}
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
                            participant?.type ===
                            MatchParticipantType.PLACEHOLDER
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
              {!!form.formState.errors.side2Participants?.[index] && (
                <p className="text-sm font-medium text-destructive">
                  Please select a participant
                </p>
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

// --- Tournament sub-forms ---

type TournamentFormProps = {
  tournamentMatch: TournamentMatchProps;
  config: H2HConfig;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const tournamentWinLossWithDrawSchema = z.object({
  playedAt: z
    .union([z.string(), z.date()])
    .pipe(z.coerce.date())
    .refine((date) => date <= new Date(), {
      message: "Match date cannot be in the future",
    }),
  winningSide: z.enum(["side1", "side2", "draw"]),
});

type TournamentWinLossValues = z.input<typeof tournamentWinLossWithDrawSchema>;

function TournamentWinLossForm({
  tournamentMatch,
  onSuccess,
  onCancel,
}: TournamentFormProps) {
  const allowDraw = tournamentMatch.allowDraw ?? false;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<TournamentWinLossValues>({
    resolver: zodResolver(tournamentWinLossWithDrawSchema),
    defaultValues: {
      playedAt: formatLocalDateTime(new Date()),
      winningSide: H2HWinningSide.SIDE1,
    },
  });

  const onSubmit = (values: TournamentWinLossValues) => {
    startTransition(async () => {
      const result = await tournamentMatch.onSubmitAction({
        tournamentMatchId: tournamentMatch.tournamentMatchId,
        winningSide: values.winningSide,
        playedAt: values.playedAt,
      });
      if (result.error) {
        toast.error(result.error as string);
      } else {
        toast.success("Match result recorded!");
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
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
                      id="t_side1_wins"
                    />
                    <label
                      htmlFor="t_side1_wins"
                      className="flex-1 cursor-pointer flex items-center gap-2"
                    >
                      {tournamentMatch.side1Participant ? (
                        <ParticipantDisplay
                          participant={tournamentMatch.side1Participant}
                          teamName={tournamentMatch.side1TeamName}
                          teamColor={tournamentMatch.side1TeamColor}
                          showAvatar
                          showUsername
                          size="sm"
                        />
                      ) : (
                        <span className="flex flex-col gap-0.5">
                          <span>{tournamentMatch.side1Name}</span>
                          {tournamentMatch.side1TeamName && (
                            <TeamColorBadge
                              name={tournamentMatch.side1TeamName}
                              color={tournamentMatch.side1TeamColor ?? null}
                            />
                          )}
                        </span>
                      )}
                      <span className="ml-auto shrink-0">Wins</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem
                      value={H2HWinningSide.SIDE2}
                      id="t_side2_wins"
                    />
                    <label
                      htmlFor="t_side2_wins"
                      className="flex-1 cursor-pointer flex items-center gap-2"
                    >
                      {tournamentMatch.side2Participant ? (
                        <ParticipantDisplay
                          participant={tournamentMatch.side2Participant}
                          teamName={tournamentMatch.side2TeamName}
                          teamColor={tournamentMatch.side2TeamColor}
                          showAvatar
                          showUsername
                          size="sm"
                        />
                      ) : (
                        <span className="flex flex-col gap-0.5">
                          <span>{tournamentMatch.side2Name}</span>
                          {tournamentMatch.side2TeamName && (
                            <TeamColorBadge
                              name={tournamentMatch.side2TeamName}
                              color={tournamentMatch.side2TeamColor ?? null}
                            />
                          )}
                        </span>
                      )}
                      <span className="ml-auto shrink-0">Wins</span>
                    </label>
                  </div>
                  {allowDraw && (
                    <div className="flex items-center space-x-2 rounded-lg border p-3">
                      <RadioGroupItem value={H2HWinningSide.DRAW} id="t_draw" />
                      <label htmlFor="t_draw" className="flex-1 cursor-pointer">
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
            {isPending ? "Recording..." : "Record Result"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

const tournamentScoreSchema = z.object({
  playedAt: z
    .union([z.string(), z.date()])
    .pipe(z.coerce.date())
    .refine((date) => date <= new Date(), {
      message: "Match date cannot be in the future",
    }),
  side1Score: z.number("A number is required"),
  side2Score: z.number("A number is required"),
});

type TournamentScoreValues = z.input<typeof tournamentScoreSchema>;

function TournamentScoreForm({
  tournamentMatch,
  config,
  onSuccess,
  onCancel,
}: TournamentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<TournamentScoreValues>({
    resolver: zodResolver(tournamentScoreSchema),
    defaultValues: {
      playedAt: formatLocalDateTime(new Date()),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      side1Score: "" as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      side2Score: "" as any,
    },
  });

  const onSubmit = (values: TournamentScoreValues) => {
    startTransition(async () => {
      const result = await tournamentMatch.onSubmitAction({
        tournamentMatchId: tournamentMatch.tournamentMatchId,
        side1Score: values.side1Score,
        side2Score: values.side2Score,
        playedAt: values.playedAt,
      });
      if (result.error) {
        toast.error(result.error as string);
      } else {
        toast.success("Match result recorded!");
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      }
    });
  };

  const scoreLabel = config.scoreDescription || "Score";

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
          <div className="flex items-center gap-2">
            {tournamentMatch.side1Participant ? (
              <ParticipantDisplay
                participant={tournamentMatch.side1Participant}
                teamName={tournamentMatch.side1TeamName}
                teamColor={tournamentMatch.side1TeamColor}
                showAvatar
                showUsername
                size="sm"
              />
            ) : (
              <div className="flex flex-col gap-0.5">
                <FormLabel className="text-base">
                  {tournamentMatch.side1Name}
                </FormLabel>
                {tournamentMatch.side1TeamName && (
                  <TeamColorBadge
                    name={tournamentMatch.side1TeamName}
                    color={tournamentMatch.side1TeamColor ?? null}
                  />
                )}
              </div>
            )}
          </div>
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
          <div className="flex items-center gap-2">
            {tournamentMatch.side2Participant ? (
              <ParticipantDisplay
                participant={tournamentMatch.side2Participant}
                teamName={tournamentMatch.side2TeamName}
                teamColor={tournamentMatch.side2TeamColor}
                showAvatar
                showUsername
                size="sm"
              />
            ) : (
              <div className="flex flex-col gap-0.5">
                <FormLabel className="text-base">
                  {tournamentMatch.side2Name}
                </FormLabel>
                {tournamentMatch.side2TeamName && (
                  <TeamColorBadge
                    name={tournamentMatch.side2TeamName}
                    color={tournamentMatch.side2TeamColor ?? null}
                  />
                )}
              </div>
            )}
          </div>
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
            {isPending ? "Recording..." : "Record Result"}
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
