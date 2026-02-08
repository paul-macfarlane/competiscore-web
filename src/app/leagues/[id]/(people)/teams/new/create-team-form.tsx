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
import { TEAM_ICON_OPTIONS } from "@/lib/shared/constants";
import {
  TEAM_DESCRIPTION_MAX_LENGTH,
  TEAM_NAME_MAX_LENGTH,
} from "@/services/constants";
import { CreateTeamFormValues, createTeamFormSchema } from "@/validators/teams";
import { zodResolver } from "@hookform/resolvers/zod";
import { Users } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createTeamAction } from "../actions";

type CreateTeamFormProps = {
  leagueId: string;
};

export function CreateTeamForm({ leagueId }: CreateTeamFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateTeamFormValues>({
    resolver: zodResolver(createTeamFormSchema),
    defaultValues: {
      leagueId,
      name: "",
      description: "",
      logo: undefined,
    },
    mode: "onChange",
  });

  const onSubmit = (values: CreateTeamFormValues) => {
    startTransition(async () => {
      const result = await createTeamAction(values);
      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof CreateTeamFormValues, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Team created successfully!");
        router.push(`/leagues/${leagueId}/teams/${result.data.id}`);
      }
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 rounded-lg border p-4 md:p-6"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="The Champions"
                  maxLength={TEAM_NAME_MAX_LENGTH}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Logo (Optional)</FormLabel>
              <div className="flex items-center gap-3">
                {field.value ? (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={field.value}
                      alt="Team logo"
                      fill
                      className="object-cover p-1"
                    />
                  </div>
                ) : (
                  <div className="bg-muted flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border">
                    <Users className="text-muted-foreground h-8 w-8" />
                  </div>
                )}
                <SimpleIconSelector
                  options={TEAM_ICON_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  trigger={
                    <Button variant="outline" type="button" size="sm">
                      {field.value ? "Change Logo" : "Select Logo"}
                    </Button>
                  }
                  title="Select a Team Logo"
                />
              </div>
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
                  placeholder="Describe your team..."
                  rows={3}
                  maxLength={TEAM_DESCRIPTION_MAX_LENGTH}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {(field.value || "").length}/{TEAM_DESCRIPTION_MAX_LENGTH}{" "}
                characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isPending || !form.formState.isValid}
        >
          {isPending ? "Creating..." : "Create Team"}
        </Button>
      </form>
    </Form>
  );
}
