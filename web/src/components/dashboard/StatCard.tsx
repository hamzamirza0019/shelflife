import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react"
import { useEffect } from "react"
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react"
import type { DashboardStat } from "@/types/dashboard"
import { Card, CardContent } from "@/components/ui/card"

type StatCardProps = {
  stat: DashboardStat
  icon: LucideIcon
}

export function StatCard({ stat, icon: Icon }: StatCardProps) {
  const shouldReduceMotion = useReducedMotion() ?? false
  const numericValue = Number(stat.value.replaceAll(",", ""))
  const hasNumericValue = Number.isFinite(numericValue)
  const count = useMotionValue(hasNumericValue && shouldReduceMotion ? numericValue : 0)
  const displayValue = useTransform(count, (value) => Math.round(value).toLocaleString())
  const TrendIcon = stat.tone === "attention" ? ArrowDownRight : ArrowUpRight
  const trendClass = stat.tone === "attention"
    ? "text-amber-700"
    : stat.tone === "positive"
      ? "text-primary"
      : "text-muted-foreground"

  useEffect(() => {
    if (!hasNumericValue) return
    const controls = animate(count, numericValue, {
      duration: shouldReduceMotion ? 0 : 0.38,
      ease: "easeOut",
    })
    return () => controls.stop()
  }, [count, hasNumericValue, numericValue, shouldReduceMotion])

  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.16, ease: "easeOut" }}
    >
      <Card className="h-full border border-border/80 py-4 shadow-none ring-0 transition-shadow hover:shadow-sm">
        <CardContent className="px-4 sm:px-5">
          <div className="mb-5 flex items-center justify-between">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground/75">
              <Icon className="size-[17px]" strokeWidth={1.8} />
            </span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${trendClass}`}>
              {stat.tone !== "neutral" ? <TrendIcon className="size-3.5" /> : null}
              {stat.context}
            </span>
          </div>
          <p className="text-[27px] font-semibold leading-none tracking-normal text-foreground tabular-nums">
            {hasNumericValue ? <motion.span aria-label={stat.value}>{displayValue}</motion.span> : stat.value}
          </p>
          <p className="mt-2.5 text-xs font-medium text-muted-foreground">{stat.label}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}