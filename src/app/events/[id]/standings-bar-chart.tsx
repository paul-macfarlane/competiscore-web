"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { EventLeaderboardEntry } from "@/db/events";
import { getTeamColorHex } from "@/services/constants";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

type StandingsBarChartProps = {
  leaderboard: EventLeaderboardEntry[];
};

export function StandingsBarChart({ leaderboard }: StandingsBarChartProps) {
  const data = leaderboard.map((entry) => ({
    name: entry.teamName,
    points: entry.totalPoints,
    rank: entry.rank,
    color: getTeamColorHex(entry.teamColor),
  }));

  const config: ChartConfig = Object.fromEntries(
    leaderboard.map((entry) => [
      entry.teamName,
      {
        label: entry.teamName,
        color: getTeamColorHex(entry.teamColor),
      },
    ]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Standings</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={config}
          className="aspect-auto"
          style={{ height: `${Math.max(leaderboard.length * 48, 100)}px` }}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 8, right: 60 }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={100}
              tick={{ fontSize: 12 }}
            />
            <XAxis type="number" hide />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideIndicator
                  formatter={(value, _name, item) => (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        #{item.payload.rank} {item.payload.name}
                      </span>
                      <span className="font-mono font-bold tabular-nums">
                        {value} pts
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="points" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
              <LabelList
                dataKey="points"
                position="right"
                className="fill-foreground"
                fontSize={12}
                formatter={(value: number) => `${value} pts`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
