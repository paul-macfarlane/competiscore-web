"use client";

import { DiscordIcon } from "@/components/icons/discord";
import { GoogleIcon } from "@/components/icons/google";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type SocialProvider = "discord" | "google";

interface SignInButtonProps {
  provider: SocialProvider;
  className?: string;
}

export function SignInButton({ provider, className }: SignInButtonProps) {
  const handleSignIn = async () => {
    await authClient.signIn.social({
      provider,
    });
  };

  if (provider === "discord") {
    return (
      <Button
        onClick={handleSignIn}
        className={cn("bg-[#5865F2] hover:bg-[#4752C4] text-white", className)}
      >
        <DiscordIcon className="mr-2 h-4 w-4" />
        Sign in with Discord
      </Button>
    );
  }

  if (provider === "google") {
    return (
      <Button
        onClick={handleSignIn}
        variant="outline"
        className={cn(
          "bg-white text-black hover:bg-gray-100 border-gray-200 dark:bg-white dark:text-black dark:hover:bg-gray-200",
          className,
        )}
      >
        <GoogleIcon className="mr-2 h-4 w-4" />
        Sign in with Google
      </Button>
    );
  }

  return null;
}

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.refresh();
  };

  return (
    <Button onClick={handleSignOut} variant="ghost">
      Sign Out
    </Button>
  );
}
