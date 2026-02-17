import { auth } from "@/lib/server/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LeagueSearch } from "./league-search";

export default async function SearchLeaguesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/leagues"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Back to leagues
        </Link>
        <h1 className="mt-2 text-xl font-bold md:text-2xl">Find a League</h1>
        <p className="text-muted-foreground text-sm">
          Search for public leagues to join
        </p>
      </div>
      <LeagueSearch />
    </div>
  );
}
