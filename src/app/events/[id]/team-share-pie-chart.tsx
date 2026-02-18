"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getTeamColorHex } from "@/services/constants";
import type { TeamContributionData } from "@/services/event-metrics";
import { Cell, Pie, PieChart } from "recharts";

type TeamSharePieChartProps = {
  teamContributions: TeamContributionData[];
};

export function TeamSharePieChart({
  teamContributions,
}: TeamSharePieChartProps) {
  const totalPoints = teamContributions.reduce(
    (sum, t) => sum + t.totalPoints,
    0,
  );

  const data = teamContributions.map((team) => ({
    name: team.teamName,
    value: team.totalPoints,
    fill: getTeamColorHex(team.teamColor),
    percentage:
      totalPoints > 0
        ? ((team.totalPoints / totalPoints) * 100).toFixed(1)
        : "0",
  }));

  const config: ChartConfig = Object.fromEntries(
    teamContributions.map((team) => [
      team.teamName,
      {
        label: team.teamName,
        color: getTeamColorHex(team.teamColor),
      },
    ]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Share</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={config}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartLegend
              content={<ChartLegendContent className="flex-wrap" />}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideIndicator
                  formatter={(value, _name, item) => (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-[2px]"
                        style={{ backgroundColor: item.payload.fill }}
                      />
                      <span>{item.payload.name}</span>
                      <span className="font-mono font-bold tabular-nums">
                        {value} pts ({item.payload.percentage}%)
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
