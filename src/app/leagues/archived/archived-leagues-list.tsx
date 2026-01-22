import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getArchivedLeagues } from "@/services/leagues";
import { Archive, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export async function ArchivedLeaguesList({ userId }: { userId: string }) {
  const result = await getArchivedLeagues(userId);
  if (result.error || !result.data) {
    return (
      <div className="border-destructive rounded-lg border p-4 text-center">
        <p className="text-destructive">Failed to load archived leagues</p>
      </div>
    );
  }

  if (result.data.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-6">
      {result.data.map((league) => (
        <ArchivedLeagueCard
          key={league.id}
          id={league.id}
          name={league.name}
          description={league.description}
          memberCount={league.memberCount}
          logo={league.logo}
        />
      ))}
    </div>
  );
}

interface ArchivedLeagueCardProps {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  logo?: string | null;
}

function ArchivedLeagueCard({
  id,
  name,
  description,
  memberCount,
  logo,
}: ArchivedLeagueCardProps) {
  return (
    <Link href={`/leagues/archived/${id}`} className="block">
      <Card className="hover:bg-accent/50 transition-colors">
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-start gap-4">
            {logo && (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                <Image
                  src={logo}
                  alt={name}
                  fill
                  className="object-cover p-1"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="truncate text-base md:text-lg">
                  {name}
                </CardTitle>
                <Badge variant="secondary" className="shrink-0">
                  <Archive className="mr-1 h-3 w-3" />
                  Archived
                </Badge>
              </div>
              <CardDescription className="mt-1 line-clamp-2 text-sm">
                {description}
              </CardDescription>
              <div className="text-muted-foreground mt-3 flex items-center gap-1 text-sm">
                <Users className="h-4 w-4" />
                <span>
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <Archive className="text-muted-foreground mx-auto h-12 w-12" />
      <h3 className="mt-4 text-lg font-semibold">No archived leagues</h3>
      <p className="text-muted-foreground mt-2 text-sm">
        You don&apos;t have any archived leagues. Archived leagues that you were
        an executive of will appear here.
      </p>
    </div>
  );
}
