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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { League } from "@/db/schema";
import { LEAGUE_LOGOS } from "@/lib/shared/constants";
import {
  LEAGUE_DESCRIPTION_MAX_LENGTH,
  LEAGUE_NAME_MAX_LENGTH,
} from "@/services/constants";
import {
  CreateLeagueFormValues,
  createLeagueFormSchema,
} from "@/validators/leagues";
import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, ImageIcon, Lock } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateLeagueAction } from "./actions";

const LEAGUE_LOGO_OPTIONS = LEAGUE_LOGOS.map((logo) => ({
  name: logo
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" "),
  src: `/league-logos/${logo}.svg`,
}));

interface LeagueSettingsFormProps {
  league: League;
}

export function LeagueSettingsForm({ league }: LeagueSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateLeagueFormValues>({
    resolver: zodResolver(createLeagueFormSchema),
    defaultValues: {
      name: league.name,
      description: league.description,
      visibility: league.visibility,
      logo: league.logo ?? undefined,
    },
    mode: "onChange",
  });

  const onSubmit = (values: CreateLeagueFormValues) => {
    startTransition(async () => {
      const result = await updateLeagueAction(league.id, values);

      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof CreateLeagueFormValues, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else {
        toast.success("Settings saved successfully!");
        router.refresh();
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
              <FormLabel>League Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="League name"
                  maxLength={LEAGUE_NAME_MAX_LENGTH}
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
              <FormLabel>League Logo (Optional)</FormLabel>
              <div className="flex items-center gap-3">
                {field.value ? (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={field.value}
                      alt="League logo"
                      fill
                      className="object-cover p-1"
                    />
                  </div>
                ) : (
                  <div className="bg-muted flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border">
                    <ImageIcon className="text-muted-foreground h-8 w-8" />
                  </div>
                )}
                <SimpleIconSelector
                  options={LEAGUE_LOGO_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  trigger={
                    <Button variant="outline" type="button" size="sm">
                      {field.value ? "Change Logo" : "Select Logo"}
                    </Button>
                  }
                  title="Select a League Logo"
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your league..."
                  rows={3}
                  maxLength={LEAGUE_DESCRIPTION_MAX_LENGTH}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {field.value.length}/{LEAGUE_DESCRIPTION_MAX_LENGTH} characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="visibility"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Visibility</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid gap-3"
                >
                  <Label
                    htmlFor="visibility-private"
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
                  >
                    <RadioGroupItem
                      value="private"
                      id="visibility-private"
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        <span className="font-medium">Private</span>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Invite-only. Members must be invited to join.
                      </p>
                    </div>
                  </Label>
                  <Label
                    htmlFor="visibility-public"
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
                  >
                    <RadioGroupItem
                      value="public"
                      id="visibility-public"
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span className="font-medium">Public</span>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Discoverable. Anyone can find and join this league.
                      </p>
                    </div>
                  </Label>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isPending || !form.formState.isValid}
        >
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}
