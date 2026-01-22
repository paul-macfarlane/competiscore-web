import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CreateLeagueForm } from "./create-league-form";

export default async function NewLeaguePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-md space-y-4 md:space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold md:text-2xl">Create a League</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Set up a new league to start tracking competitions
        </p>
      </div>
      <CreateLeagueForm />
    </div>
  );
}
