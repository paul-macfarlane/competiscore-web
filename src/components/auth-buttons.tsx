"use client"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'

type SocialProvider = "discord" | "google" 

interface SignInButtonProps {
  provider: SocialProvider
}

export function SignInButton({ provider }: SignInButtonProps) {
  const handleSignIn = async () => {
    await authClient.signIn.social({
      provider,
    })
  }

  const providerNames: Record<SocialProvider, string> = {
    discord: "Discord",
    google: "Google",
  }

  return (
    <Button onClick={handleSignIn}>
      Sign in with {providerNames[provider]}
    </Button>
  )
}

export function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    await authClient.signOut()
    router.refresh()
  }

  return (
    <Button onClick={handleSignOut} className="w-full" variant="destructive">
      Sign Out
    </Button>
  )
}
