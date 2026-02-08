"use client";

import { createChallengeAction } from "@/app/leagues/[id]/(activity)/challenges/actions";
import { Button } from "@/components/ui/button";
import { Form, FormLabel } from "@/components/ui/form";
import { MatchParticipantType } from "@/lib/shared/constants";
import { H2HConfig } from "@/lib/shared/game-templates";
import { ParticipantOption } from "@/lib/shared/participant-options";
import { createChallengeSchema } from "@/validators/matches";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ParticipantSelector } from "./participant-selector";

type CreateChallengeFormProps = {
  leagueId: string;
  gameTypeId: string;
  config: H2HConfig;
  participantOptions: ParticipantOption[];
  currentUserId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

type FormValues = z.input<typeof createChallengeSchema>;

export function CreateChallengeForm({
  leagueId,
  gameTypeId,
  config,
  participantOptions,
  currentUserId,
  onSuccess,
  onCancel,
}: CreateChallengeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentUser = participantOptions.find((p) => p.id === currentUserId);

  const form = useForm<FormValues>({
    resolver: zodResolver(createChallengeSchema),
    defaultValues: {
      gameTypeId,
      challengerParticipants: currentUser
        ? [{ userId: currentUser.id }]
        : [{ userId: "" }],
      challengedParticipants: [{ userId: "" }],
    },
    mode: "onChange",
  });

  const challengerArray = useFieldArray({
    control: form.control,
    name: "challengerParticipants",
  });

  const challengedArray = useFieldArray({
    control: form.control,
    name: "challengedParticipants",
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await createChallengeAction(leagueId, values);

      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof FormValues, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Challenge created successfully!");
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/leagues/${leagueId}/challenges`);
        }
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base">Challenger (You)</FormLabel>
            {challengerArray.fields.length < config.maxPlayersPerSide && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => challengerArray.append({ userId: "" })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
          {challengerArray.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <div className="flex-1 min-w-0">
                <ParticipantSelector
                  options={participantOptions}
                  value={getParticipantValue(
                    // eslint-disable-next-line react-hooks/incompatible-library
                    form.watch(`challengerParticipants.${index}`),
                  )}
                  onChange={(participant) => {
                    form.setValue(
                      `challengerParticipants.${index}`,
                      { userId: participant?.id ?? "" },
                      { shouldValidate: true },
                    );
                  }}
                />
              </div>
              {challengerArray.fields.length > config.minPlayersPerSide && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => challengerArray.remove(index)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base">Challenged</FormLabel>
            {challengedArray.fields.length < config.maxPlayersPerSide && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => challengedArray.append({ userId: "" })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
          {challengedArray.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <div className="flex-1 min-w-0">
                <ParticipantSelector
                  options={participantOptions}
                  value={getParticipantValue(
                    form.watch(`challengedParticipants.${index}`),
                  )}
                  onChange={(participant) => {
                    form.setValue(
                      `challengedParticipants.${index}`,
                      { userId: participant?.id ?? "" },
                      { shouldValidate: true },
                    );
                  }}
                />
              </div>
              {challengedArray.fields.length > config.minPlayersPerSide && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => challengedArray.remove(index)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {form.formState.errors.challengedParticipants?.message && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.challengedParticipants.message}
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
            {isPending ? "Creating..." : "Create Challenge"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function getParticipantValue(
  participant: { userId?: string } | undefined,
): { id: string; type: MatchParticipantType } | undefined {
  if (!participant?.userId) return undefined;
  return { id: participant.userId, type: MatchParticipantType.USER };
}
