import {
  EnrichedPointEntry,
  EventLeaderboardEntry,
  getEnrichedEventPointEntries as dbGetEnrichedEventPointEntries,
  getEventLeaderboard as dbGetEventLeaderboard,
  getEventParticipant as dbGetEventParticipant,
} from "@/db/events";
import {
  EVENT_POINT_CATEGORY_LABELS,
  EVENT_POINT_OUTCOME_LABELS,
  EventPointCategory,
  EventPointOutcome,
} from "@/lib/shared/constants";

import { ServiceResult } from "./shared";

export type TimelineEntryDetail = {
  teamName: string | null;
  category: string;
  outcome: string;
  points: number;
  href: string | null;
};

export type CumulativeTimelinePoint = {
  index: number;
  label: string;
  detail: TimelineEntryDetail;
  [teamId: string]: number | string | TimelineEntryDetail;
};

export type TeamContributionData = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  totalPoints: number;
};

export type CategoryBreakdownEntry = {
  category: string;
  categoryLabel: string;
  points: number;
};

export type TeamCategoryBreakdown = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  categories: CategoryBreakdownEntry[];
};

export type IndividualContributionData = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  contributors: { name: string; points: number }[];
};

export type EventMetricsData = {
  log: EnrichedPointEntry[];
  cumulativeTimeline: CumulativeTimelinePoint[];
  teamContributions: TeamContributionData[];
  individualContributions: IndividualContributionData[];
  categoryBreakdowns: TeamCategoryBreakdown[];
  leaderboard: EventLeaderboardEntry[];
};

export async function getEventMetrics(
  userId: string,
  eventId: string,
): Promise<ServiceResult<EventMetricsData>> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const [entries, leaderboard] = await Promise.all([
    dbGetEnrichedEventPointEntries(eventId),
    dbGetEventLeaderboard(eventId),
  ]);

  const nonZeroEntries = entries.filter((e) => e.points !== 0);
  const log = [...nonZeroEntries].reverse();

  const cumulativeTimeline = buildCumulativeTimeline(
    nonZeroEntries,
    leaderboard,
    eventId,
  );
  const teamContributions = buildTeamContributions(nonZeroEntries);
  const individualContributions = buildIndividualContributions(nonZeroEntries);
  const categoryBreakdowns = buildCategoryBreakdowns(nonZeroEntries);

  return {
    data: {
      log,
      cumulativeTimeline,
      teamContributions,
      individualContributions,
      categoryBreakdowns,
      leaderboard,
    },
  };
}

function getEntryHref(
  entry: EnrichedPointEntry,
  eventId: string,
): string | null {
  if (entry.eventMatchId) {
    return `/events/${eventId}/matches/${entry.eventMatchId}`;
  }
  if (entry.eventHighScoreSessionId && entry.eventHighScoreGameTypeId) {
    return `/events/${eventId}/high-scores/leaderboard/${entry.eventHighScoreGameTypeId}`;
  }
  if (entry.eventTournamentId) {
    return `/events/${eventId}/tournaments/${entry.eventTournamentId}`;
  }
  if (entry.eventDiscretionaryAwardId) {
    return `/events/${eventId}/discretionary`;
  }
  return null;
}

function buildCumulativeTimeline(
  entries: EnrichedPointEntry[],
  leaderboard: EventLeaderboardEntry[],
  eventId: string,
): CumulativeTimelinePoint[] {
  if (entries.length === 0) return [];

  const teamIds = leaderboard.map((t) => t.eventTeamId);
  const runningTotals = new Map<string, number>();
  for (const id of teamIds) {
    runningTotals.set(id, 0);
  }

  const timeline: CumulativeTimelinePoint[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.eventTeamId) {
      const current = runningTotals.get(entry.eventTeamId) ?? 0;
      runningTotals.set(entry.eventTeamId, current + entry.points);
    }

    const categoryLabel =
      EVENT_POINT_CATEGORY_LABELS[entry.category as EventPointCategory] ??
      entry.category;
    const outcomeLabel =
      EVENT_POINT_OUTCOME_LABELS[entry.outcome as EventPointOutcome] ??
      entry.outcome;

    const point: CumulativeTimelinePoint = {
      index: i + 1,
      label: `#${i + 1}`,
      detail: {
        teamName: entry.teamName,
        category: categoryLabel,
        outcome: outcomeLabel,
        points: entry.points,
        href: getEntryHref(entry, eventId),
      },
    };

    for (const [teamId, total] of runningTotals) {
      point[teamId] = total;
    }

    timeline.push(point);
  }

  return timeline;
}

function buildTeamContributions(
  entries: EnrichedPointEntry[],
): TeamContributionData[] {
  const teamMap = new Map<
    string,
    { teamName: string; teamColor: string | null; totalPoints: number }
  >();

  for (const entry of entries) {
    if (!entry.eventTeamId) continue;
    const existing = teamMap.get(entry.eventTeamId);
    if (existing) {
      existing.totalPoints += entry.points;
    } else {
      teamMap.set(entry.eventTeamId, {
        teamName: entry.teamName ?? "Unknown",
        teamColor: entry.teamColor,
        totalPoints: entry.points,
      });
    }
  }

  return Array.from(teamMap.entries()).map(([teamId, data]) => ({
    teamId,
    ...data,
  }));
}

function buildIndividualContributions(
  entries: EnrichedPointEntry[],
): IndividualContributionData[] {
  const teamMap = new Map<
    string,
    {
      teamName: string;
      teamColor: string | null;
      contributors: Map<string, number>;
    }
  >();

  for (const entry of entries) {
    if (!entry.eventTeamId) continue;

    for (const p of entry.participants) {
      const name = p.userName ?? p.placeholderDisplayName;
      if (!name) continue;

      let team = teamMap.get(entry.eventTeamId);
      if (!team) {
        team = {
          teamName: entry.teamName ?? "Unknown",
          teamColor: entry.teamColor,
          contributors: new Map(),
        };
        teamMap.set(entry.eventTeamId, team);
      }

      const current = team.contributors.get(name) ?? 0;
      team.contributors.set(name, current + entry.points);
    }
  }

  return Array.from(teamMap.entries()).map(([teamId, data]) => ({
    teamId,
    teamName: data.teamName,
    teamColor: data.teamColor,
    contributors: Array.from(data.contributors.entries())
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points),
  }));
}

function buildCategoryBreakdowns(
  entries: EnrichedPointEntry[],
): TeamCategoryBreakdown[] {
  const teamMap = new Map<
    string,
    {
      teamName: string;
      teamColor: string | null;
      categories: Map<string, number>;
    }
  >();

  for (const entry of entries) {
    if (!entry.eventTeamId) continue;

    let team = teamMap.get(entry.eventTeamId);
    if (!team) {
      team = {
        teamName: entry.teamName ?? "Unknown",
        teamColor: entry.teamColor,
        categories: new Map(),
      };
      teamMap.set(entry.eventTeamId, team);
    }

    const current = team.categories.get(entry.category) ?? 0;
    team.categories.set(entry.category, current + entry.points);
  }

  return Array.from(teamMap.entries()).map(([teamId, data]) => ({
    teamId,
    teamName: data.teamName,
    teamColor: data.teamColor,
    categories: Array.from(data.categories.entries())
      .map(([category, points]) => ({
        category,
        categoryLabel:
          EVENT_POINT_CATEGORY_LABELS[category as EventPointCategory] ??
          category,
        points,
      }))
      .sort((a, b) => b.points - a.points),
  }));
}
