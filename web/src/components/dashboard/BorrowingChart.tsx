import { useReducedMotion } from "motion/react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { BorrowingDay } from "@/types/dashboard"

export function BorrowingChart({ data, isLoading }: { data: BorrowingDay[]; isLoading: boolean }) {
  const shouldReduceMotion = useReducedMotion() ?? false

  return (
    <Card className="min-w-0 border border-border/80 py-0 shadow-none ring-0">
      <CardHeader className="flex flex-row items-start justify-between gap-4 px-5 pt-5 pb-0 sm:px-6 sm:pt-6">
        <div>
          <CardTitle className="text-sm font-semibold">Borrowing activity</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Books issued and returned over the last 7 days</p>
        </div>
        <span className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground">
          Last 7 days
        </span>
      </CardHeader>
      <CardContent className="min-w-0 px-2 pt-4 pb-3 sm:px-4">
        {isLoading ? <div className="h-[260px] w-full p-4 sm:h-[286px]"><Skeleton className="size-full" /></div> : (
        <div className="h-[260px] w-full min-w-0 sm:h-[286px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={5}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickMargin={10}
                minTickGap={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickMargin={8}
                width={36}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.65 }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--foreground)", fontWeight: 600, marginBottom: 4 }}
              />
              <Legend
                verticalAlign="bottom"
                height={34}
                iconType="circle"
                iconSize={7}
                formatter={(value: string) => <span className="px-1 text-xs text-muted-foreground">{value}</span>}
              />
              <Bar
                dataKey="issued"
                name="Issued"
                fill="var(--primary)"
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
                isAnimationActive={!shouldReduceMotion}
                animationDuration={320}
              />
              <Bar
                dataKey="returned"
                name="Returned"
                fill="var(--chart-3)"
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
                isAnimationActive={!shouldReduceMotion}
                animationDuration={320}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        )}
      </CardContent>
    </Card>
  )
}