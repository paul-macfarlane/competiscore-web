"use client";

import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { TeamColorBadge } from "@/components/team-color-badge";
import type { EventIndividualHighScoreEntry } from "@/db/events";
import { cn } from "@/lib/shared/utils";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type ReactNode, useState } from "react";

type ScoreEntryRowProps = {
  entry: EventIndividualHighScoreEntry;
  isPairEntry: boolean;
  teamPoints?: number;
  showPoints?: boolean;
  historyActions?: (ReactNode | null)[];
};

export function ScoreEntryRow({
  entry,
  isPairEntry,
  teamPoints,
  showPoints,
  historyActions,
}: ScoreEntryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasHistory = entry.submissionCount > 1;
  const singleAction = !hasHistory ? historyActions?.[0] : null;

  return (
    <div>
      <div
        className={cn(
          "flex items-center justify-between rounded-md border px-3 py-2",
          hasHistory && "cursor-pointer hover:bg-muted/50",
        )}
        onClick={hasHistory ? () => setExpanded(!expanded) : undefined}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold shrink-0",
              entry.rank === 1 && "bg-rank-gold-bg text-rank-gold-text",
              entry.rank === 2 && "bg-rank-silver-bg text-rank-silver-text",
              entry.rank === 3 && "bg-rank-bronze-bg text-rank-bronze-text",
              entry.rank > 3 && "bg-muted text-muted-foreground",
            )}
          >
            {entry.rank}
          </span>
          <div className="min-w-0">
            {isPairEntry ? (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-sm font-medium truncate">
                  {entry
                    .members!.map(
                      (m) =>
                        m.user?.name ??
                        m.placeholderParticipant?.displayName ??
                        "?",
                    )
                    .join(" & ")}
                </span>
                {entry.teamName &&
                  (entry.teamColor ? (
                    <TeamColorBadge
                      name={entry.teamName}
                      color={entry.teamColor}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      ({entry.teamName})
                    </span>
                  ))}
              </div>
            ) : (
              <ParticipantDisplay
                participant={
                  {
                    user: entry.user,
                    placeholderMember: entry.placeholderParticipant,
                  } as ParticipantData
                }
                showAvatar
                showUsername
                teamName={entry.teamName ?? undefined}
                teamColor={entry.teamColor}
                size="sm"
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showPoints && teamPoints !== undefined && (
            <span className="text-xs text-muted-foreground">
              +{teamPoints} pts
            </span>
          )}
          {hasHistory && (
            <span className="text-xs text-muted-foreground">
              {entry.submissionCount} scores
            </span>
          )}
          <span className="text-sm font-bold tabular-nums">
            {entry.bestScore}
          </span>
          {singleAction}
          {hasHistory &&
            (expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ))}
        </div>
      </div>
      {expanded && hasHistory && (
        <div className="ml-11 mt-1 space-y-1 mb-2">
          {entry.scoreHistory.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded border border-dashed px-3 py-1 text-sm text-muted-foreground"
            >
              <span className="tabular-nums font-medium">{item.score}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs">
                  {formatDistanceToNow(new Date(item.achievedAt), {
                    addSuffix: true,
                  })}
                </span>
                {historyActions?.[i]}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
