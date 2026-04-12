"use client";

import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity } from "lucide-react";
import { mockChartData } from "@/lib/mock-data";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CHART_COLORS = {
  primary: "oklch(0.44 0.1 190)",
  green: "oklch(0.52 0.1 150)",
  violet: "oklch(0.5 0.13 280)",
  amber: "oklch(0.56 0.12 55)",
};

const PIE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.violet,
  CHART_COLORS.green,
  CHART_COLORS.amber,
];

const CustomTooltip = ({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string; dataKey?: string }>;
  label?: string;
  suffix?: string;
}) => {
  if (active && payload?.length) {
    const displayLabel = label ?? payload[0]?.name;
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
        {displayLabel && (
          <p className="mb-1 font-medium text-muted-foreground">
            {displayLabel}
          </p>
        )}
        {payload.map((p) => (
          <p
            key={p.dataKey ?? p.name ?? String(p.value)}
            className="font-semibold text-foreground"
          >
            {p.value}
            {suffix}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const TICK_STYLE = { fill: "oklch(0.44 0.014 55)", fontSize: 11 };
const GRID_STROKE = "oklch(0.92 0.004 60)";

export default function DashboardCharts() {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Hội thoại theo ngày</CardTitle>
            <CardDescription>7 ngày gần nhất</CardDescription>
            <CardAction>
              <Badge variant="outline">
                <Activity /> Live
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={mockChartData.conversations}
                margin={{ top: 5, right: 5, bottom: 0, left: -20 }}
              >
                <defs>
                  <linearGradient
                    id="colorConv"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={CHART_COLORS.primary}
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART_COLORS.primary}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={GRID_STROKE}
                />
                <XAxis
                  dataKey="date"
                  tick={TICK_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={TICK_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  fill="url(#colorConv)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>Tỷ lệ sử dụng</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={mockChartData.knowledgeBaseUsage}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {mockChartData.knowledgeBaseUsage.map((item, i) => (
                    <Cell
                      key={item.name}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip suffix="%" />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5">
              {mockChartData.knowledgeBaseUsage.map((item, i) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="size-2.5 rounded-full"
                      style={{
                        backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                      }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium tabular-nums text-foreground">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tỷ lệ hài lòng</CardTitle>
          <CardDescription>% khách hàng rating 4-5 sao</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={mockChartData.satisfaction}
              margin={{ top: 5, right: 5, bottom: 0, left: -20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID_STROKE}
              />
              <XAxis
                dataKey="date"
                tick={TICK_STYLE}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[80, 100]}
                tick={TICK_STYLE}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="rate"
                stroke={CHART_COLORS.green}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS.green, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}
