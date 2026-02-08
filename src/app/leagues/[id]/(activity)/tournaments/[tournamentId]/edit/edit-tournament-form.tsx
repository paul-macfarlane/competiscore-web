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
import { updateTournamentSchema } from "@/validators/tournaments";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trophy } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { updateTournamentAction } from "../../actions";

const editTournamentFormSchema = updateTournamentSchema.pick({
  name: true,
  description: true,
  logo: true,
});

type EditTournamentFormValues = z.input<typeof editTournamentFormSchema>;

type EditTournamentFormProps = {
  tournamentId: string;
  leagueId: string;
  name: string;
  description: string | null;
  logo: string | null;
};

export function EditTournamentForm({
  tournamentId,
  leagueId,
  name,
  description,
  logo,
}: EditTournamentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<EditTournamentFormValues>({
    resolver: zodResolver(editTournamentFormSchema),
    defaultValues: {
      name,
      description: description || "",
      logo: logo || undefined,
    },
    mode: "onChange",
  });

  const onSubmit = (values: EditTournamentFormValues) => {
    startTransition(async () => {
      const result = await updateTournamentAction({ tournamentId }, values);
      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof EditTournamentFormValues, {
              message,
            });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Tournament updated!");
        router.push(`/leagues/${leagueId}/tournaments/${tournamentId}`);
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
                  <div className="bg-muted flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border">
                    <Trophy className="text-muted-foreground h-8 w-8" />
                  </div>
                )}
                <SimpleIconSelector
                  options={TOURNAMENT_ICON_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
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

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
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
