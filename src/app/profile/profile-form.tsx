"use client";

import { IconSelector } from "@/components/icon-selector";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { User } from "@/db/schema";
import { USER_AVATAR_OPTIONS } from "@/lib/shared/constants";
import {
  BIO_MAX_LENGTH,
  NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/services/constants";
import { ProfileFormValues, profileFormSchema } from "@/validators/users";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { checkUsernameAction, updateProfileAction } from "./actions";

interface ProfileFormProps {
  user: User;
}

type AsyncCheckResult = { username: string; available: boolean } | null;

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [asyncCheckResult, setAsyncCheckResult] =
    useState<AsyncCheckResult>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name || "",
      username: user.username || "",
      bio: user.bio || "",
      image: user.image || "",
    },
    mode: "onChange",
  });

  const watchedUsername = useWatch({
    control: form.control,
    name: "username",
  });

  const normalizedUsername = useMemo(
    () => watchedUsername?.toLowerCase() ?? "",
    [watchedUsername],
  );

  const needsAsyncCheck = useMemo(() => {
    return (
      normalizedUsername.length >= USERNAME_MIN_LENGTH &&
      normalizedUsername !== user.username
    );
  }, [normalizedUsername, user.username]);

  const usernameStatus = useMemo(() => {
    if (normalizedUsername.length < USERNAME_MIN_LENGTH) {
      return "idle";
    }
    if (normalizedUsername === user.username) {
      return "available";
    }
    if (asyncCheckResult && asyncCheckResult.username === normalizedUsername) {
      return asyncCheckResult.available ? "available" : "taken";
    }
    return "checking";
  }, [normalizedUsername, user.username, asyncCheckResult]);

  useEffect(() => {
    if (!needsAsyncCheck) {
      return;
    }

    if (asyncCheckResult && asyncCheckResult.username === normalizedUsername) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      const result = await checkUsernameAction(normalizedUsername);
      if (!result.error && result.data) {
        setAsyncCheckResult({
          username: normalizedUsername,
          available: result.data.available,
        });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [normalizedUsername, needsAsyncCheck, asyncCheckResult]);

  const onSubmit = (values: ProfileFormValues) => {
    startTransition(async () => {
      const result = await updateProfileAction({
        ...values,
        username: values.username.toLowerCase(),
      });

      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof ProfileFormValues, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else {
        toast.success("Profile updated successfully!");
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
          name="image"
          render={({ field }) => (
            <FormItem className="flex flex-col items-center gap-3 md:gap-4">
              <Avatar className="border-muted h-24 w-24 border-4 md:h-32 md:w-32">
                <AvatarImage src={field.value || ""} alt={user.name} />
                <AvatarFallback className="text-3xl md:text-4xl">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <IconSelector
                options={USER_AVATAR_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                trigger={
                  <Button variant="outline" type="button" size="sm">
                    Change Avatar
                  </Button>
                }
                title="Select an Avatar"
                renderIcon={(option) => (
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14">
                    <AvatarImage src={option.src} alt={option.name} />
                    <AvatarFallback>{option.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your display name"
                  maxLength={NAME_MAX_LENGTH}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  placeholder="your_username"
                  maxLength={USERNAME_MAX_LENGTH}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                />
              </FormControl>
              {usernameStatus === "checking" && (
                <p className="text-muted-foreground text-sm">
                  Checking availability...
                </p>
              )}
              {usernameStatus === "available" && field.value && (
                <p className="text-success text-sm">Username is available</p>
              )}
              {usernameStatus === "taken" && (
                <p className="text-destructive text-sm">
                  Username is already taken
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about yourself..."
                  rows={3}
                  maxLength={BIO_MAX_LENGTH}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {field.value.length}/{BIO_MAX_LENGTH} characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={
            isPending || usernameStatus === "taken" || !form.formState.isValid
          }
        >
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}
