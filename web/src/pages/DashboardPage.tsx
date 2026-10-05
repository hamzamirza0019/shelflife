import { motion, useReducedMotion, type Variants } from "motion/react"
import { ArrowDownRight, BookCopy, BookOpenCheck, UsersRound } from "lucide-react"
import { BorrowingChart } from "@/components/dashboard/BorrowingChart"
import { OverdueBooks } from "@/components/dashboard/OverdueBooks"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { RecentActivity } from "@/components/dashboard/RecentActivity"
import { StatCard } from "@/components/dashboard/StatCard"
import { useDashboardData } from "@/hooks/useDashboard"
import { getApiErrorMessage } from "@/api/errors"
import { Button } from "@/components/ui/button"

const statIcons = {
  books: BookCopy,
  available: BookOpenCheck,
  members: UsersRound,
  borrowed: ArrowDownRight,
}

const statContainerVariants: Variants = {
  hidden: {},
  visible: (reduced: boolean) => ({
    transition: { staggerChildren: reduced ? 0 : 0.055 },
  }),
}

const statItemVariants: Variants = {
  hidden: { opacity: 0, y: 7 },
  visible: (reduced: boolean) => ({
    opacity: 1,
    y: 0,
    transition: { duration: reduced ? 0 : 0.22, ease: "easeOut" },
  }),
}

export function DashboardPage() {
  const shouldReduceMotion = useReducedMotion() ?? false
  const { stats, activity, overdue, borrowingActivity, isLoading, error, refetch } = useDashboardData()

  return (
    <div className="mx-auto max-w-[1320px] space-y-7">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
            Monday, October 5
          </p>
          <h2 className="text-2xl font-semibold text-foreground sm:text-[28px]">Good morning, Hamza</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Here&apos;s what&apos;s happening in your library today.
          </p>
        </div>
        <QuickActions />
      </section>

      {error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{getApiErrorMessage(error, "Some dashboard data could not be loaded.")}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>Retry</Button>
        </div>
      ) : null}

      <motion.section
        aria-label="Library statistics"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        variants={statContainerVariants}
        custom={shouldReduceMotion}
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
      >
        {stats.map((stat) => {
          const Icon = statIcons[stat.id]
          return (
            <motion.div
              key={stat.id}
              variants={statItemVariants}
              custom={shouldReduceMotion}
            >
              <StatCard stat={stat} icon={Icon} />
            </motion.div>
          )
        })}
      </motion.section>

      <section aria-label="Library activity" className="grid min-w-0 gap-4 lg:grid-cols-12 lg:gap-5">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.22, delay: shouldReduceMotion ? 0 : 0.08, ease: "easeOut" }}
          className="min-w-0 lg:col-span-7"
        >
          <BorrowingChart data={borrowingActivity} isLoading={isLoading} />
        </motion.div>
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.22, delay: shouldReduceMotion ? 0 : 0.12, ease: "easeOut" }}
          className="min-w-0 lg:col-span-5"
        >
          <OverdueBooks items={overdue} isLoading={isLoading} />
        </motion.div>
      </section>

      <motion.section
        aria-label="Recent borrowing activity"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 7 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.22, delay: shouldReduceMotion ? 0 : 0.16, ease: "easeOut" }}
      >
        <RecentActivity items={activity} isLoading={isLoading} />
      </motion.section>
    </div>
  )
}