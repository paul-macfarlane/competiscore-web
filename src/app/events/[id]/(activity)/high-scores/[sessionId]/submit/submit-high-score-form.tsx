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
import {
  submitEventHighScoreBaseSchema,
  submitEventHighScorePairSchema,
} from "@/validators/events";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { submitEventHighScoreAction } from "../../../../actions";

type IndividualFormValues = z.input<typeof submitEventHighScoreBaseSchema>;
type PairFormValues = z.input<typeof submitEventHighScorePairSchema>;

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
  isPairMode?: boolean;
  groupSize?: number;
}

export function SubmitHighScoreForm({
  sessionId,
  eventId,
  gameTypeName,
  participantOptions,
  scoreDescription,
  isPairMode = false,
  groupSize = 1,
}: SubmitHighScoreFormProps) {
  if (isPairMode) {
    return (
      <PairHighScoreForm
        sessionId={sessionId}
        eventId={eventId}
        gameTypeName={gameTypeName}
        participantOptions={participantOptions}
        scoreDescription={scoreDescription}
        groupSize={groupSize}
      />
    );
  }

  return (
    <IndividualHighScoreForm
      sessionId={sessionId}
      eventId={eventId}
      gameTypeName={gameTypeName}
      participantOptions={participantOptions}
      scoreDescription={scoreDescription}
    />
  );
}

function IndividualHighScoreForm({
  sessionId,
  eventId,
  gameTypeName,
  participantOptions,
  scoreDescription,
}: Omit<SubmitHighScoreFormProps, "isPairMode" | "groupSize">) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<IndividualFormValues>({
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

  const onSubmit = (values: IndividualFormValues) => {
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
            form.setError(field as keyof IndividualFormValues, {
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

function PairHighScoreForm({
  sessionId,
  eventId,
  gameTypeName,
  participantOptions,
  scoreDescription,
  groupSize,
}: Omit<SubmitHighScoreFormProps, "isPairMode"> & { groupSize: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const defaultMembers = Array.from({ length: groupSize }, () => ({
    userId: undefined as string | undefined,
    eventPlaceholderParticipantId: undefined as string | undefined,
  }));

  const form = useForm<PairFormValues>({
    resolver: zodResolver(submitEventHighScorePairSchema),
    defaultValues: {
      sessionId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      score: "" as any,
      achievedAt: formatLocalDateTime(new Date()),
      members: defaultMembers,
    },
    mode: "onChange",
  });

  const members = form.watch("members");

  const getSelectedForMember = (
    index: number,
  ): { id: string; type: MatchParticipantType } | undefined => {
    const m = members[index];
    if (!m) return undefined;
    if (m.userId) return { id: m.userId, type: MatchParticipantType.USER };
    if (m.eventPlaceholderParticipantId)
      return {
        id: m.eventPlaceholderParticipantId,
        type: MatchParticipantType.PLACEHOLDER,
      };
    return undefined;
  };

  const getOptionsForMember = (index: number): ParticipantOption[] => {
    const firstSelected = getSelectedForMember(0);

    // Exclude already-selected members from other slots
    const otherSelectedIds = new Set(
      members
        .filter((_, i) => i !== index)
        .flatMap((m) => [
          m.userId ? `user:${m.userId}` : null,
          m.eventPlaceholderParticipantId
            ? `placeholder:${m.eventPlaceholderParticipantId}`
            : null,
        ])
        .filter(Boolean) as string[],
    );

    let opts = participantOptions.filter((o) => {
      const key =
        o.type === MatchParticipantType.USER
          ? `user:${o.id}`
          : `placeholder:${o.id}`;
      return !otherSelectedIds.has(key);
    });

    // For member 2+, restrict to same team as first member
    if (index > 0 && firstSelected) {
      const firstOption = participantOptions.find(
        (o) => o.id === firstSelected.id && o.type === firstSelected.type,
      );
      if (firstOption?.teamName) {
        opts = opts.filter((o) => o.teamName === firstOption.teamName);
      }
    }

    return opts;
  };

  const setMember = (
    index: number,
    val: { id: string; type: MatchParticipantType } | undefined,
  ) => {
    const updated = [...members];
    updated[index] = {
      userId: val?.type === MatchParticipantType.USER ? val.id : undefined,
      eventPlaceholderParticipantId:
        val?.type === MatchParticipantType.PLACEHOLDER ? val.id : undefined,
    };
    // When first member changes, clear all subsequent selections
    if (index === 0) {
      for (let i = 1; i < updated.length; i++) {
        updated[i] = {
          userId: undefined,
          eventPlaceholderParticipantId: undefined,
        };
      }
    }
    form.setValue("members", updated, { shouldValidate: true });
  };

  const allSelected = members.every(
    (m) => m.userId || m.eventPlaceholderParticipantId,
  );

  const onSubmit = (values: PairFormValues) => {
    if (!allSelected) {
      toast.error("Please select all group members");
      return;
    }

    startTransition(async () => {
      const result = await submitEventHighScoreAction(values);

      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof PairFormValues, { message });
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
          <h3 className="text-lg font-semibold">Submit Group Score</h3>
          <p className="text-sm text-muted-foreground">
            Game Type: {gameTypeName} &middot; {groupSize} players per entry
          </p>
        </div>

        {Array.from({ length: groupSize }, (_, i) => (
          <div key={i} className="space-y-2">
            <FormLabel>Member {i + 1}</FormLabel>
            <ParticipantSelector
              options={getOptionsForMember(i)}
              value={getSelectedForMember(i)}
              onChange={(val) => setMember(i, val)}
              placeholder={`Select member ${i + 1}`}
            />
            {!getSelectedForMember(i) && form.formState.isSubmitted && (
              <p className="text-destructive text-sm font-medium">
                Please select member {i + 1}
              </p>
            )}
          </div>
        ))}

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
