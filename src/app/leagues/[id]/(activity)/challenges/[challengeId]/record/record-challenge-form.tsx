"use client";

import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
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
import { MatchParticipantWithDetails } from "@/db/matches";
import { ChallengeWinningSide, ScoringType } from "@/lib/shared/constants";
import { H2HConfig } from "@/lib/shared/game-templates";
import {
  recordChallengeH2HScoreResultSchema,
  recordChallengeH2HWinLossResultSchema,
} from "@/validators/matches";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  recordChallengeScoreResultAction,
  recordChallengeWinLossResultAction,
} from "./actions";

type RecordChallengeFormProps = {
  leagueId: string;
  challengeId: string;
  config: H2HConfig;
  scoringType: ScoringType;
  challengerParticipants: MatchParticipantWithDetails[];
  challengedParticipants: MatchParticipantWithDetails[];
};

type WinLossFormValues = z.input<typeof recordChallengeH2HWinLossResultSchema>;
type ScoreFormValues = z.input<typeof recordChallengeH2HScoreResultSchema>;

export function RecordChallengeForm({
  leagueId,
  challengeId,
  config,
  scoringType,
  challengerParticipants,
  challengedParticipants,
}: RecordChallengeFormProps) {
  if (scoringType === ScoringType.WIN_LOSS) {
    return (
      <WinLossForm
        leagueId={leagueId}
        challengeId={challengeId}
        config={config}
        challengerParticipants={challengerParticipants}
        challengedParticipants={challengedParticipants}
      />
    );
  }

  return (
    <ScoreBasedForm
      leagueId={leagueId}
      challengeId={challengeId}
      config={config}
      challengerParticipants={challengerParticipants}
      challengedParticipants={challengedParticipants}
    />
  );
}

type FormProps = {
  leagueId: string;
  challengeId: string;
  config: H2HConfig;
  challengerParticipants: MatchParticipantWithDetails[];
  challengedParticipants: MatchParticipantWithDetails[];
};

function WinLossForm({
  leagueId,
  challengeId,
  config,
  challengerParticipants,
  challengedParticipants,
}: FormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<WinLossFormValues>({
    resolver: zodResolver(recordChallengeH2HWinLossResultSchema),
    defaultValues: {
      playedAt: formatLocalDateTime(new Date()),
      winningSide: undefined,
    },
    mode: "onChange",
  });

  const onSubmit = (values: WinLossFormValues) => {
    startTransition(async () => {
      const result = await recordChallengeWinLossResultAction(
        challengeId,
        values,
      );

      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof WinLossFormValues, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Challenge result recorded successfully!");
        router.push(`/leagues/${leagueId}/challenges`);
      }
    });
  };

  const challengerParticipant: ParticipantData = {
    user: challengerParticipants[0]?.user ?? null,
    team: challengerParticipants[0]?.team ?? null,
    placeholderMember: challengerParticipants[0]?.placeholderMember ?? null,
  };

  const challengedParticipant: ParticipantData = {
    user: challengedParticipants[0]?.user ?? null,
    team: challengedParticipants[0]?.team ?? null,
    placeholderMember: challengedParticipants[0]?.placeholderMember ?? null,
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
          <div>
            <FormLabel className="text-base">Challenger</FormLabel>
            <div className="mt-2 rounded-lg border p-3">
              <ParticipantDisplay
                participant={challengerParticipant}
                showAvatar
                size="sm"
              />
            </div>
          </div>

          <div>
            <FormLabel className="text-base">Challenged</FormLabel>
            <div className="mt-2 rounded-lg border p-3">
              <ParticipantDisplay
                participant={challengedParticipant}
                showAvatar
                size="sm"
              />
            </div>
          </div>
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
                      value={ChallengeWinningSide.CHALLENGER}
                      id="challenger_wins"
                    />
                    <label
                      htmlFor="challenger_wins"
                      className="flex-1 cursor-pointer"
                    >
                      Challenger Wins
                    </label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem
                      value={ChallengeWinningSide.CHALLENGED}
                      id="challenged_wins"
                    />
                    <label
                      htmlFor="challenged_wins"
                      className="flex-1 cursor-pointer"
                    >
                      Challenged Wins
                    </label>
                  </div>
                  {config.drawsAllowed && (
                    <div className="flex items-center space-x-2 rounded-lg border p-3">
                      <RadioGroupItem
                        value={ChallengeWinningSide.DRAW}
                        id="draw"
                      />
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
            {isPending ? "Recording..." : "Record Result"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ScoreBasedForm({
  leagueId,
  challengeId,
  config,
  challengerParticipants,
  challengedParticipants,
}: FormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ScoreFormValues>({
    resolver: zodResolver(recordChallengeH2HScoreResultSchema),
    defaultValues: {
      playedAt: formatLocalDateTime(new Date()),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      challengerScore: "" as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      challengedScore: "" as any,
    },
    mode: "onChange",
  });

  const onSubmit = (values: ScoreFormValues) => {
    startTransition(async () => {
      const result = await recordChallengeScoreResultAction(
        challengeId,
        values,
      );

      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof ScoreFormValues, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Challenge result recorded successfully!");
        router.push(`/leagues/${leagueId}/challenges`);
      }
    });
  };

  const challengerParticipant: ParticipantData = {
    user: challengerParticipants[0]?.user ?? null,
    team: challengerParticipants[0]?.team ?? null,
    placeholderMember: challengerParticipants[0]?.placeholderMember ?? null,
  };

  const challengedParticipant: ParticipantData = {
    user: challengedParticipants[0]?.user ?? null,
    team: challengedParticipants[0]?.team ?? null,
    placeholderMember: challengedParticipants[0]?.placeholderMember ?? null,
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
          <div>
            <FormLabel className="text-base">Challenger</FormLabel>
            <div className="mt-2 rounded-lg border p-3">
              <ParticipantDisplay
                participant={challengerParticipant}
                showAvatar
                size="sm"
              />
            </div>
            <FormField
              control={form.control}
              name="challengerScore"
              render={({ field }) => (
                <FormItem className="mt-2">
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

          <div>
            <FormLabel className="text-base">Challenged</FormLabel>
            <div className="mt-2 rounded-lg border p-3">
              <ParticipantDisplay
                participant={challengedParticipant}
                showAvatar
                size="sm"
              />
            </div>
            <FormField
              control={form.control}
              name="challengedScore"
              render={({ field }) => (
                <FormItem className="mt-2">
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
            {isPending ? "Recording..." : "Record Result"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
