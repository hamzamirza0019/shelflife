import { AlertCircle, ArrowRight } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/management/ManagementUI"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardOverdue } from "@/types/dashboard"

export function OverdueBooks({ items, isLoading }: { items: DashboardOverdue[]; isLoading: boolean }) {
  const shouldReduceMotion = useReducedMotion() ?? false

  return (
    <Card className="min-w-0 border border-border/80 py-0 shadow-none ring-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="size-4 text-amber-700" strokeWidth={1.8} />
            Overdue books
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Items needing a follow-up</p>
        </div>
        <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium tabular-nums text-amber-800">
          {isLoading ? "Loading" : `${items.length} overdue`}
        </span>
      </CardHeader>
      <CardContent className="px-5 pb-4 sm:px-6">
        {isLoading ? <div role="status" className="space-y-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div> : items.length === 0 ? <EmptyState icon={AlertCircle} title="No overdue books" description="Everything is currently within its return window." /> : (
        <ul className="divide-y divide-border">
          {items.map((item, index) => (
            <motion.li
              key={item.id}
              initial={shouldReduceMotion ? false : { opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.18, delay: shouldReduceMotion ? 0 : index * 0.04, ease: "easeOut" }}
              className="min-w-0 py-3 first:pt-0 last:pb-1"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{item.book}</p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">{item.member}</p>
                </div>
                <span className="shrink-0 rounded-md bg-rose-50 px-1.5 py-1 text-[10px] font-medium text-rose-700">
                  {item.daysOverdue} days
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Due {item.dueDate}</p>
            </motion.li>
          ))}
        </ul>
        )}
        <Link
          to="/borrowing"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          View borrowing
          <ArrowRight className="size-3.5" />
        </Link>
      </CardContent>
    </Card>
  )
}