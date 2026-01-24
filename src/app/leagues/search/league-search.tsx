"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchResultLeague } from "@/services/leagues";
import { Check, Search, Users } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { joinLeagueAction, searchLeaguesAction } from "../actions";

export function LeagueSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultLeague[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 1) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    const result = await searchLeaguesAction(searchQuery);

    if (result.error) {
      setError(result.error);
      setResults([]);
    } else if (result.data) {
      setResults(result.data);
    }

    setHasSearched(true);
    setIsSearching(false);
  }, []);

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        performSearch(newQuery);
      }, 300);
    },
    [performSearch],
  );

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by league name or description..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {error && (
        <div className="bg-destructive/10 rounded-md p-3">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {isSearching && (
        <p className="text-muted-foreground text-center text-sm">
          Searching...
        </p>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Search className="text-muted-foreground mx-auto h-12 w-12" />
          <h3 className="mt-4 text-lg font-semibold">No leagues found</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Try a different search term or create your own league.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((league) => (
            <SearchResultCard
              key={league.id}
              league={league}
              onJoined={() => router.push(`/leagues/${league.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SearchResultCard({
  league,
  onJoined,
}: {
  league: SearchResultLeague;
  onJoined: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleJoin = () => {
    setError(null);

    startTransition(async () => {
      const result = await joinLeagueAction(league.id);

      if (result.error) {
        setError(result.error);
      } else {
        toast.success("Successfully joined league!");
        onJoined();
      }
    });
  };

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-1 items-start gap-4 min-w-0">
            {league.logo && (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                <Image
                  src={league.logo}
                  alt={league.name}
                  fill
                  className="object-cover p-1"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="truncate text-base md:text-lg">
                  {league.name}
                </CardTitle>
                {league.isMember && (
                  <Badge variant="secondary" className="shrink-0">
                    <Check className="mr-1 h-3 w-3" />
                    Member
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1 line-clamp-2 text-sm">
                {league.description}
              </CardDescription>
              <div className="text-muted-foreground mt-2 flex items-center gap-1 text-sm">
                <Users className="h-4 w-4" />
                <span>
                  {league.memberCount}{" "}
                  {league.memberCount === 1 ? "member" : "members"}
                </span>
              </div>
              {error && (
                <p className="text-destructive mt-2 text-sm">{error}</p>
              )}
            </div>
          </div>
          <div className="shrink-0">
            {league.isMember ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/leagues/${league.id}`)}
              >
                View
              </Button>
            ) : (
              <Button size="sm" onClick={handleJoin} disabled={isPending}>
                {isPending ? "Joining..." : "Join"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
