"use client";

import { SimpleIconSelector } from "@/components/icon-selector";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TOURNAMENT_ICON_OPTIONS } from "@/lib/shared/constants";
import {
  TOURNAMENT_DESCRIPTION_MAX_LENGTH,
  TOURNAMENT_NAME_MAX_LENGTH,
} from "@/services/constants";
import { updateEventTournamentSchema } from "@/validators/events";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trophy } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { updateEventTournamentAction } from "../../../../actions";

const editFormSchema = updateEventTournamentSchema.pick({
  name: true,
  description: true,
  logo: true,
});

type EditFormValues = z.input<typeof editFormSchema>;

type EditEventTournamentFormProps = {
  tournamentId: string;
  eventId: string;
  name: string;
  description: string | null;
  logo: string | null;
};

export function EditEventTournamentForm({
  tournamentId,
  eventId,
  name,
  description,
  logo,
}: EditEventTournamentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name,
      description: description || "",
      logo: logo || undefined,
    },
    mode: "onChange",
  });

  const onSubmit = (values: EditFormValues) => {
    startTransition(async () => {
      const result = await updateEventTournamentAction(
        { eventTournamentId: tournamentId },
        values,
      );
      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof EditFormValues, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Tournament updated!");
        router.push(`/events/${eventId}/tournaments/${tournamentId}`);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tournament Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="March Madness"
                  maxLength={TOURNAMENT_NAME_MAX_LENGTH}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the tournament..."
                  rows={3}
                  maxLength={TOURNAMENT_DESCRIPTION_MAX_LENGTH}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {(field.value || "").length}/{TOURNAMENT_DESCRIPTION_MAX_LENGTH}{" "}
                characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icon (Optional)</FormLabel>
              <div className="flex items-center gap-3">
                {field.value ? (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={field.value}
                      alt="Tournament icon"
                      fill
                      className="object-cover p-1"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-muted">
                    <Trophy className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <SimpleIconSelector
                  options={TOURNAMENT_ICON_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  onClear={() => field.onChange("")}
                  trigger={
                    <Button variant="outline" type="button" size="sm">
                      {field.value ? "Change Icon" : "Select Icon"}
                    </Button>
                  }
                  title="Select a Tournament Icon"
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
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
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
