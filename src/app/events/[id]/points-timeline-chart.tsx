"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { EventLeaderboardEntry } from "@/db/events";
import { getTeamColorHex } from "@/services/constants";
import type {
  CumulativeTimelinePoint,
  TimelineEntryDetail,
} from "@/services/event-metrics";
import Link from "next/link";
import { useCallback, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

type PointsTimelineChartProps = {
  timeline: CumulativeTimelinePoint[];
  teams: EventLeaderboardEntry[];
};

type SelectedPoint = {
  detail: TimelineEntryDetail;
  x: number;
  y: number;
  teamTotals: { teamId: string; label: string; color: string; value: number }[];
};

export function PointsTimelineChart({
  timeline,
  teams,
}: PointsTimelineChartProps) {
  const [selected, setSelected] = useState<SelectedPoint | null>(null);

  const config: ChartConfig = Object.fromEntries(
    teams.map((team) => [
      team.eventTeamId,
      {
        label: team.teamName,
        color: getTeamColorHex(team.teamColor),
      },
    ]),
  );

  const handleDotClick = useCallback(
    (dataPoint: CumulativeTimelinePoint, cx: number, cy: number) => {
      const detail = dataPoint.detail as TimelineEntryDetail;
      const teamTotals = teams.map((team) => ({
        teamId: team.eventTeamId,
        label: team.teamName,
        color: getTeamColorHex(team.teamColor),
        value: (dataPoint[team.eventTeamId] as number) ?? 0,
      }));
      setSelected({ detail, x: cx, y: cy, teamTotals });
    },
    [teams],
  );

  const dismissPopover = useCallback(() => setSelected(null), []);

  // Render dots for the first team's line only (one dot per data point)
  const firstTeamId = teams[0]?.eventTeamId;

  const maxValue = Math.max(
    ...timeline.flatMap((point) =>
      teams.map((t) => (point[t.eventTeamId] as number) ?? 0),
    ),
    0,
  );
  const yMax = Math.ceil(maxValue * 1.1) || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Points Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ChartContainer
            config={config}
            className="aspect-video max-h-[300px]"
          >
            <LineChart
              data={timeline}
              margin={{ left: 8, right: 8 }}
              onClick={dismissPopover}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} domain={[0, yMax]} />
              <ChartLegend content={<ChartLegendContent />} />
              {teams.map((team) => (
                <Line
                  key={team.eventTeamId}
                  type="monotone"
                  dataKey={team.eventTeamId}
                  stroke={getTeamColorHex(team.teamColor)}
                  strokeWidth={2}
                  dot={
                    team.eventTeamId === firstTeamId
                      ? (props: {
                          cx?: number;
                          cy?: number;
                          index?: number;
                          payload?: CumulativeTimelinePoint;
                        }) => (
                          <ClickableDot
                            {...props}
                            key={props.index}
                            onDotClick={handleDotClick}
                          />
                        )
                      : false
                  }
                  activeDot={false}
                  name={team.eventTeamId}
                />
              ))}
            </LineChart>
          </ChartContainer>

          {selected && (
            <PointDetailPopover
              selected={selected}
              config={config}
              onClose={dismissPopover}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ClickableDot({
  cx,
  cy,
  payload,
  onDotClick,
}: {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: CumulativeTimelinePoint;
  onDotClick: (
    dataPoint: CumulativeTimelinePoint,
    cx: number,
    cy: number,
  ) => void;
}) {
  if (cx === undefined || cy === undefined || !payload) return null;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="var(--background)"
      stroke="var(--muted-foreground)"
      strokeWidth={2}
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onDotClick(payload, cx, cy);
      }}
    />
  );
}

function PointDetailPopover({
  selected,
  config,
  onClose,
}: {
  selected: SelectedPoint;
  config: ChartConfig;
  onClose: () => void;
}) {
  const { detail, x, y, teamTotals } = selected;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="border-border/50 bg-background absolute z-50 min-w-52 rounded-lg border px-3 py-2 text-xs shadow-xl"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          transform: "translate(-50%, calc(-100% - 12px))",
        }}
      >
        <div className="mb-1.5 font-medium">
          {detail.teamName}: {detail.category} ({detail.outcome})
          <span className="ml-1 font-mono">
            {detail.points > 0 ? "+" : ""}
            {detail.points} pts
          </span>
        </div>
        {detail.href && (
          <Link
            href={detail.href}
            className="text-primary mb-1.5 block text-xs underline"
          >
            View details
          </Link>
        )}
        <div className="border-border/50 space-y-1 border-t pt-1.5">
          {teamTotals.map((item) => (
            <div key={item.teamId} className="flex items-center gap-2">
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">
                {config[item.teamId]?.label ?? item.teamId}
              </span>
              <span className="ml-auto font-mono font-medium tabular-nums">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
