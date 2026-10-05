import { ArrowLeftRight, BookPlus, CornerUpLeft, UserRoundPlus } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button"

const actions = [
  { label: "Add book", icon: BookPlus, to: "/books", primary: true },
  { label: "Add member", icon: UserRoundPlus, to: "/members", primary: false },
  { label: "Issue book", icon: ArrowLeftRight, to: "/borrowing", primary: false },
  { label: "Return book", icon: CornerUpLeft, to: "/borrowing", primary: false },
]

export function QuickActions() {
  const shouldReduceMotion = useReducedMotion() ?? false

  return (
    <nav aria-label="Quick actions" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
      {actions.map(({ label, icon: Icon, to, primary }) => (
        <motion.div
          key={label}
          className="w-full sm:w-auto"
          whileHover={shouldReduceMotion ? undefined : { y: -1 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.16, ease: "easeOut" }}
        >
          <Link
            to={to}
            className={buttonVariants({
              variant: primary ? "default" : "outline",
              className: "h-9 w-full justify-start gap-2 px-3 text-xs sm:justify-center",
            })}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        </motion.div>
      ))}
    </nav>
  )
}