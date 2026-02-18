/* eslint-disable react-hooks/incompatible-library */
"use client";

import { ParticipantSelector } from "@/components/participant-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EventGameType } from "@/db/schema";
import {
  GameCategory,
  MatchParticipantType,
  ParticipantType,
  ScoringType,
} from "@/lib/shared/constants";
import {
  getScoreDescription,
  parseGameConfig,
} from "@/lib/shared/game-config-parser";
import { H2HConfig } from "@/lib/shared/game-templates";
import { ParticipantOption } from "@/lib/shared/participant-options";
import {
  type RecordEventFFAMatchInput,
  type RecordEventH2HMatchInput,
  recordEventFFAMatchSchema,
  recordEventH2HMatchSchema,
} from "@/validators/events";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  recordEventFFAMatchAction,
  recordEventH2HMatchAction,
} from "../../../actions";

type RecordEventMatchFormProps = {
  eventId: string;
  gameTypes: EventGameType[];
  participantOptions: ParticipantOption[];
  teamOptions: ParticipantOption[];
};

export function RecordEventMatchForm({
  eventId,
  gameTypes,
  participantOptions,
  teamOptions,
}: RecordEventMatchFormProps) {
  const [selectedGameTypeId, setSelectedGameTypeId] = useState<string>(
    gameTypes.length === 1 ? gameTypes[0].id : "",
  );

  const selectedGameType = gameTypes.find((gt) => gt.id === selectedGameTypeId);

  const isTeamParticipant =
    selectedGameType &&
    (() => {
      const config = parseGameConfig(
        selectedGameType.config,
        selectedGameType.category as GameCategory,
      );
      return (
        "participantType" in config &&
        config.participantType === ParticipantType.TEAM
      );
    })();

  const activeOptions = isTeamParticipant ? teamOptions : participantOptions;

  const scoreLabel = selectedGameType
    ? getScoreDescription(selectedGameType.config, selectedGameType.category) ||
      "Score"
    : "Score";

  const hasScoring =
    selectedGameType &&
    (() => {
      const config = parseGameConfig(
        selectedGameType.config,
        selectedGameType.category as GameCategory,
      );
      if ("scoringType" in config) {
        return config.scoringType === ScoringType.SCORE_BASED;
      }
      return true;
    })();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Match</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Game Type</label>
          <Select
            value={selectedGameTypeId}
            onValueChange={setSelectedGameTypeId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a game type" />
            </SelectTrigger>
            <SelectContent>
              {gameTypes.map((gt) => (
                <SelectItem key={gt.id} value={gt.id}>
                  {gt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedGameType && (
          <>
            {selectedGameType.category === GameCategory.HEAD_TO_HEAD ? (
              <H2HMatchForm
                key={selectedGameType.id}
                eventId={eventId}
                gameTypeId={selectedGameType.id}
                h2hConfig={
                  parseGameConfig(
                    selectedGameType.config,
                    GameCategory.HEAD_TO_HEAD,
                  ) as H2HConfig
                }
                participantOptions={activeOptions}
                scoreLabel={scoreLabel}
                hasScoring={!!hasScoring}
              />
            ) : (
              <FFAMatchForm
                eventId={eventId}
                gameTypeId={selectedGameType.id}
                participantOptions={activeOptions}
                scoreLabel={scoreLabel}
                hasScoring={!!hasScoring}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function participantToFormValue(
  value: { id: string; type: MatchParticipantType } | undefined,
): {
  userId?: string;
  eventPlaceholderParticipantId?: string;
  eventTeamId?: string;
} {
  if (!value) return {};
  if (value.type === MatchParticipantType.USER) {
    return { userId: value.id };
  }
  if (value.type === MatchParticipantType.TEAM) {
    return { eventTeamId: value.id };
  }
  return { eventPlaceholderParticipantId: value.id };
}

function formValueToSelector(formValue: {
  userId?: string;
  eventPlaceholderParticipantId?: string;
  eventTeamId?: string;
}): { id: string; type: MatchParticipantType } | undefined {
  if (formValue.userId) {
    return { id: formValue.userId, type: MatchParticipantType.USER };
  }
  if (formValue.eventTeamId) {
    return { id: formValue.eventTeamId, type: MatchParticipantType.TEAM };
  }
  if (formValue.eventPlaceholderParticipantId) {
    return {
      id: formValue.eventPlaceholderParticipantId,
      type: MatchParticipantType.PLACEHOLDER,
    };
  }
  return undefined;
}

type H2HFormValues = z.input<typeof recordEventH2HMatchSchema>;

function H2HMatchForm({
  eventId,
  gameTypeId,
  h2hConfig,
  participantOptions,
  scoreLabel,
  hasScoring,
}: {
  eventId: string;
  gameTypeId: string;
  h2hConfig: H2HConfig;
  participantOptions: ParticipantOption[];
  scoreLabel: string;
  hasScoring: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<H2HFormValues>({
    resolver: zodResolver(recordEventH2HMatchSchema),
    defaultValues: {
      eventId,
      gameTypeId,
      playedAt: formatLocalDateTime(new Date()),
      side1Participants: Array.from(
        { length: h2hConfig.minPlayersPerSide },
        () => ({}),
      ),
      side2Participants: Array.from(
        { length: h2hConfig.minPlayersPerSide },
        () => ({}),
      ),
      winningSide: "side1",
      side1Score: undefined,
      side2Score: undefined,
      winPoints: undefined,
      lossPoints: undefined,
      drawPoints: undefined,
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

  // Track selected participant IDs to prevent duplicates
  const allParticipants = [
    ...form.watch("side1Participants"),
    ...form.watch("side2Participants"),
  ];
  const selectedIds = new Set(
    allParticipants
      .map((p) => p.userId || p.eventPlaceholderParticipantId)
      .filter(Boolean),
  );

  const getAvailableOptions = (currentValue?: {
    id: string;
    type: MatchParticipantType;
  }) =>
    participantOptions.filter(
      (o) => o.id === currentValue?.id || !selectedIds.has(o.id),
    );

  const onSubmit = (values: H2HFormValues) => {
    startTransition(async () => {
      const result = await recordEventH2HMatchAction(values);
      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof RecordEventH2HMatchInput, {
              message,
            });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Match recorded successfully!");
        router.push(`/events/${eventId}/matches`);
      }
    });
  };

  const winningSide = form.watch("winningSide");

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

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base">Side 1 Participants</FormLabel>
            {side1Array.fields.length < h2hConfig.maxPlayersPerSide && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => side1Array.append({})}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            )}
          </div>
          {side1Array.fields.map((field, index) => {
            const currentFormValue = form.watch(`side1Participants.${index}`);
            const selectorValue = formValueToSelector(currentFormValue);
            return (
              <div key={field.id} className="space-y-1">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <ParticipantSelector
                      options={getAvailableOptions(selectorValue)}
                      value={selectorValue}
                      onChange={(val) => {
                        const formVal = participantToFormValue(val);
                        form.setValue(`side1Participants.${index}`, formVal, {
                          shouldValidate: true,
                        });
                      }}
                      placeholder="Select participant"
                    />
                  </div>
                  {side1Array.fields.length > h2hConfig.minPlayersPerSide && (
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
                  <p className="text-destructive text-sm font-medium">
                    Please select a participant
                  </p>
                )}
              </div>
            );
          })}
          {form.formState.errors.side1Participants?.root?.message && (
            <p className="text-destructive text-sm font-medium">
              {form.formState.errors.side1Participants.root.message}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base">Side 2 Participants</FormLabel>
            {side2Array.fields.length < h2hConfig.maxPlayersPerSide && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => side2Array.append({})}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            )}
          </div>
          {side2Array.fields.map((field, index) => {
            const currentFormValue = form.watch(`side2Participants.${index}`);
            const selectorValue = formValueToSelector(currentFormValue);
            return (
              <div key={field.id} className="space-y-1">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <ParticipantSelector
                      options={getAvailableOptions(selectorValue)}
                      value={selectorValue}
                      onChange={(val) => {
                        const formVal = participantToFormValue(val);
                        form.setValue(`side2Participants.${index}`, formVal, {
                          shouldValidate: true,
                        });
                      }}
                      placeholder="Select participant"
                    />
                  </div>
                  {side2Array.fields.length > h2hConfig.minPlayersPerSide && (
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
                  <p className="text-destructive text-sm font-medium">
                    Please select a participant
                  </p>
                )}
              </div>
            );
          })}
          {form.formState.errors.side2Participants?.root?.message && (
            <p className="text-destructive text-sm font-medium">
              {form.formState.errors.side2Participants.root.message}
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="winningSide"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Result</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select result" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="side1">Side 1 Wins</SelectItem>
                  <SelectItem value="side2">Side 2 Wins</SelectItem>
                  <SelectItem value="draw">Draw</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {hasScoring && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="side1Score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Side 1 {scoreLabel} (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder={scoreLabel}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(
                          value === "" ? undefined : parseFloat(value),
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="side2Score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Side 2 {scoreLabel} (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder={scoreLabel}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(
                          value === "" ? undefined : parseFloat(value),
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="winPoints"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Win Points (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 3"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(
                        value === "" ? undefined : parseFloat(value),
                      );
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lossPoints"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loss Points (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 0"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(
                        value === "" ? undefined : parseFloat(value),
                      );
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {winningSide === "draw" && (
          <FormField
            control={form.control}
            name="drawPoints"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Draw Points (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 1"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(
                        value === "" ? undefined : parseFloat(value),
                      );
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
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

type FFAFormValues = z.input<typeof recordEventFFAMatchSchema>;

function FFAMatchForm({
  eventId,
  gameTypeId,
  participantOptions,
  scoreLabel,
  hasScoring,
}: {
  eventId: string;
  gameTypeId: string;
  participantOptions: ParticipantOption[];
  scoreLabel: string;
  hasScoring: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FFAFormValues>({
    resolver: zodResolver(recordEventFFAMatchSchema),
    defaultValues: {
      eventId,
      gameTypeId,
      playedAt: formatLocalDateTime(new Date()),
      participants: [
        { rank: 1, score: undefined, points: undefined },
        { rank: 2, score: undefined, points: undefined },
      ],
    },
    mode: "onChange",
  });

  const participantsArray = useFieldArray({
    control: form.control,
    name: "participants",
  });

  // Track selected participant IDs to prevent duplicates
  const watchedParticipants = form.watch("participants");
  const selectedIds = new Set(
    watchedParticipants
      .map((p) => p.userId || p.eventPlaceholderParticipantId)
      .filter(Boolean),
  );

  const getAvailableOptions = (currentValue?: {
    id: string;
    type: MatchParticipantType;
  }) =>
    participantOptions.filter(
      (o) => o.id === currentValue?.id || !selectedIds.has(o.id),
    );

  const onSubmit = (values: FFAFormValues) => {
    startTransition(async () => {
      const result = await recordEventFFAMatchAction(values);
      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof RecordEventFFAMatchInput, {
              message,
            });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Match recorded successfully!");
        router.push(`/events/${eventId}/matches`);
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

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base">Participants</FormLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                participantsArray.append({
                  rank: participantsArray.fields.length + 1,
                  score: undefined,
                  points: undefined,
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
          {participantsArray.fields.map((field, index) => {
            const currentFormValue = form.watch(`participants.${index}`);
            const selectorValue = formValueToSelector(currentFormValue);
            return (
              <div key={field.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <ParticipantSelector
                      options={getAvailableOptions(selectorValue)}
                      value={selectorValue}
                      onChange={(val) => {
                        const formVal = participantToFormValue(val);
                        form.setValue(
                          `participants.${index}.userId`,
                          formVal.userId,
                          { shouldValidate: true },
                        );
                        form.setValue(
                          `participants.${index}.eventPlaceholderParticipantId`,
                          formVal.eventPlaceholderParticipantId,
                          { shouldValidate: true },
                        );
                        form.setValue(
                          `participants.${index}.eventTeamId`,
                          formVal.eventTeamId,
                          { shouldValidate: true },
                        );
                      }}
                      placeholder="Select participant"
                    />
                  </div>
                  {participantsArray.fields.length > 2 && (
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
                {!!form.formState.errors.participants?.[index] && (
                  <p className="text-destructive text-sm font-medium">
                    Please select a participant
                  </p>
                )}
                <div
                  className={`grid gap-2 ${hasScoring ? "grid-cols-3" : "grid-cols-2"}`}
                >
                  <FormField
                    control={form.control}
                    name={`participants.${index}.rank`}
                    render={({ field: rankField }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Rank</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            min="1"
                            placeholder="Rank"
                            {...rankField}
                            onChange={(e) => {
                              const value = e.target.value;
                              rankField.onChange(
                                value === "" ? "" : parseInt(value),
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {hasScoring && (
                    <FormField
                      control={form.control}
                      name={`participants.${index}.score`}
                      render={({ field: scoreField }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {scoreLabel}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder={scoreLabel}
                              value={scoreField.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                scoreField.onChange(
                                  value === "" ? undefined : parseFloat(value),
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name={`participants.${index}.points`}
                    render={({ field: pointsField }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Points (optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Points"
                            value={pointsField.value ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              pointsField.onChange(
                                value === "" ? undefined : parseFloat(value),
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            );
          })}
          {form.formState.errors.participants?.message && (
            <p className="text-destructive text-sm font-medium">
              {form.formState.errors.participants.message}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
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
