import { auth } from "@/lib/server/auth";
import { getUserById } from "@/services/users";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ProfileForm } from "./profile-form";
import { ProfileSkeleton } from "./profile-skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return {
      title: "Profile",
    };
  }

  const result = await getUserById(session.user.id);
  if (result.error || !result.data) {
    return {
      title: "Profile",
    };
  }

  return {
    title: `${result.data.name} (@${result.data.username})`,
    description: result.data.bio || "Competiscore user profile",
  };
}

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold md:text-2xl">Your Profile</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Manage your Competiscore profile settings
        </p>
      </div>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function ProfileContent({ userId }: { userId: string }) {
  const result = await getUserById(userId);
  if (result.error || !result.data) {
    return (
      <div className="border-destructive rounded-lg border p-4 text-center">
        <p className="text-destructive">Failed to load profile</p>
      </div>
    );
  }

  return <ProfileForm user={result.data} />;
}
