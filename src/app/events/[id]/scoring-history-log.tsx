"use client";

import { TeamColorBadge } from "@/components/team-color-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EnrichedPointEntry } from "@/db/events";
import {
  EVENT_POINT_CATEGORY_LABELS,
  EVENT_POINT_OUTCOME_LABELS,
  EventPointCategory,
  EventPointOutcome,
} from "@/lib/shared/constants";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type ScoringHistoryLogProps = {
  log: EnrichedPointEntry[];
};

const PAGE_SIZE = 10;

function getEntryHref(entry: EnrichedPointEntry): string | null {
  if (entry.eventMatchId) {
    return `/events/${entry.eventId}/matches/${entry.eventMatchId}`;
  }
  if (entry.eventTournamentId) {
    return `/events/${entry.eventId}/tournaments/${entry.eventTournamentId}`;
  }
  if (entry.eventDiscretionaryAwardId) {
    return `/events/${entry.eventId}/discretionary`;
  }
  return null;
}

export function ScoringHistoryLog({ log }: ScoringHistoryLogProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = log.slice(0, visibleCount);
  const hasMore = visibleCount < log.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scoring History</CardTitle>
      </CardHeader>
      <CardContent>
        {log.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No scoring events recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {visible.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <Badge variant="outline" className="text-xs">
                  {EVENT_POINT_CATEGORY_LABELS[
                    entry.category as EventPointCategory
                  ] ?? entry.category}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {EVENT_POINT_OUTCOME_LABELS[
                    entry.outcome as EventPointOutcome
                  ] ?? entry.outcome}
                </Badge>
                {entry.teamName && (
                  <TeamColorBadge
                    name={entry.teamName}
                    color={entry.teamColor}
                  />
                )}
                {(() => {
                  const names = entry.participants
                    .map((p) => p.userName ?? p.placeholderDisplayName)
                    .filter(Boolean);
                  return names.length > 0 ? (
                    <span className="text-muted-foreground truncate">
                      {names.join(" & ")}
                    </span>
                  ) : null;
                })()}
                <span
                  className={`ml-auto font-mono font-bold tabular-nums ${
                    entry.points > 0
                      ? "text-green-600 dark:text-green-400"
                      : entry.points < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                  }`}
                >
                  {entry.points > 0 ? "+" : ""}
                  {entry.points}
                </span>
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                  {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
                </span>
                {getEntryHref(entry) && (
                  <Link
                    href={getEntryHref(entry)!}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            ))}
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                <ChevronDown className="mr-1 h-4 w-4" />
                Show more
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
