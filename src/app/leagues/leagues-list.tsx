import { LeagueCard } from "@/components/league-card";
import { getUserLeagues } from "@/services/leagues";
import { Trophy } from "lucide-react";

export async function LeaguesList({ userId }: { userId: string }) {
  const result = await getUserLeagues(userId);
  if (result.error || !result.data) {
    return (
      <div className="border-destructive rounded-lg border p-4 text-center">
        <p className="text-destructive">Failed to load leagues</p>
      </div>
    );
  }

  if (result.data.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-6">
      {result.data.map((league) => (
        <LeagueCard
          key={league.id}
          id={league.id}
          name={league.name}
          description={league.description}
          memberCount={league.memberCount}
          role={league.role}
          logo={league.logo}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <Trophy className="text-muted-foreground mx-auto h-12 w-12" />
      <h3 className="mt-4 text-lg font-semibold">No leagues yet</h3>
      <p className="text-muted-foreground mt-2 text-sm">
        Create your first league or join an existing one using the buttons
        above.
      </p>
    </div>
  );
}
