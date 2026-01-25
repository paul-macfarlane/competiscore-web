import { auth } from "@/lib/server/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CreateTeamForm } from "./create-team-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewTeamPage({ params }: PageProps) {
  const { id: leagueId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-md space-y-4 md:space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold md:text-2xl">Create a Team</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Create a team to compete together
        </p>
      </div>
      <CreateTeamForm leagueId={leagueId} />
    </div>
  );
}
