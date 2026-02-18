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
import type {
  IndividualContributionData,
  TeamCategoryBreakdown,
} from "@/services/event-metrics";
import { Cell, Pie, PieChart } from "recharts";

type ContributorsPieChartProps = {
  individualContributions: IndividualContributionData[];
};

const MAX_CONTRIBUTORS = 10;
const OTHER_COLOR = "#94a3b8";

const CONTRIBUTOR_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
  "#84cc16",
];

export function ContributorsPieChart({
  individualContributions,
}: ContributorsPieChartProps) {
  const allContributors = individualContributions.flatMap((team) =>
    team.contributors.map((c) => ({
      name: c.name,
      value: c.points,
      teamName: team.teamName,
    })),
  );

  allContributors.sort(
    (a, b) => b.value - a.value || a.name.localeCompare(b.name),
  );

  const top = allContributors.slice(0, MAX_CONTRIBUTORS);
  const rest = allContributors.slice(MAX_CONTRIBUTORS);

  const data = top.map((c, i) => ({
    ...c,
    fill: CONTRIBUTOR_COLORS[i % CONTRIBUTOR_COLORS.length],
  }));

  if (rest.length > 0) {
    data.push({
      name: "Other",
      value: rest.reduce((sum, c) => sum + c.value, 0),
      teamName: "",
      fill: OTHER_COLOR,
    });
  }

  if (data.length === 0) return null;

  const config: ChartConfig = Object.fromEntries(
    data.map((entry) => [entry.name, { label: entry.name, color: entry.fill }]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Contributors</CardTitle>
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
                      <span>
                        {item.payload.name}
                        {item.payload.teamName && (
                          <span className="text-muted-foreground">
                            {" "}
                            ({item.payload.teamName})
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-bold tabular-nums">
                        {value} pts
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

type CategoryBreakdownChartProps = {
  categoryBreakdowns: TeamCategoryBreakdown[];
};

const CATEGORY_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export function CategoryBreakdownChart({
  categoryBreakdowns,
}: CategoryBreakdownChartProps) {
  const allCategories = new Map<string, { label: string; points: number }>();
  for (const team of categoryBreakdowns) {
    for (const cat of team.categories) {
      const existing = allCategories.get(cat.category);
      if (existing) {
        existing.points += cat.points;
      } else {
        allCategories.set(cat.category, {
          label: cat.categoryLabel,
          points: cat.points,
        });
      }
    }
  }

  const data = Array.from(allCategories.entries()).map(
    ([category, { label, points }], i) => ({
      name: label,
      value: points,
      fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      category,
    }),
  );

  if (data.length <= 1) {
    const teamData = categoryBreakdowns.map((team) => ({
      name: team.teamName,
      value: team.categories.reduce((sum, c) => sum + c.points, 0),
      fill: getTeamColorHex(team.teamColor),
    }));

    const teamConfig: ChartConfig = Object.fromEntries(
      teamData.map((t) => [t.name, { label: t.name, color: t.fill }]),
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle>Points by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={teamConfig}
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
                          {value} pts
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={teamData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                strokeWidth={2}
              >
                {teamData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  }

  const config: ChartConfig = Object.fromEntries(
    data.map((entry) => [entry.name, { label: entry.name, color: entry.fill }]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Points by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={config}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartLegend content={<ChartLegendContent />} />
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
                        {value} pts
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
