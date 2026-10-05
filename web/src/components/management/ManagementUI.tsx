import { useEffect, type ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { MoreHorizontal, Search, Trash2, Pencil, Eye, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  const shouldReduceMotion = useReducedMotion() ?? false

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: "easeOut" }}
      className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
          Library workspace
        </p>
        <h2 className="text-2xl font-semibold text-foreground sm:text-[28px]">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </motion.div>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
}) {
  return (
    <label className="relative block w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-9 pl-9 text-sm"
      />
    </label>
  )
}

export function SelectFilter({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  className?: string
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-auto sm:min-w-36"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

const statusStyles: Record<string, string> = {
  Available: "border-primary/15 bg-primary/[0.07] text-primary",
  Active: "border-primary/15 bg-primary/[0.07] text-primary",
  Borrowed: "border-primary/15 bg-primary/[0.07] text-primary",
  Returned: "border-border bg-muted text-muted-foreground",
  "Low stock": "border-amber-200 bg-amber-50 text-amber-800",
  "Due soon": "border-amber-200 bg-amber-50 text-amber-800",
  "On loan": "border-primary/15 bg-primary/[0.07] text-primary",
  "No current loans": "border-border bg-muted text-muted-foreground",
  Overdue: "border-rose-200 bg-rose-50 text-rose-700",
  "Out of stock": "border-rose-200 bg-rose-50 text-rose-700",
  Inactive: "border-border bg-muted text-muted-foreground",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-medium ${statusStyles[status] ?? statusStyles.Inactive}`}>
      {status}
    </span>
  )
}

export function RecordActions({
  label,
  onView,
  onEdit,
  onDelete,
}: {
  label: string
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${label}`} />}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={onView}><Eye />View details</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}><Pencil />Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2 />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  destructive = false,
  isLoading = false,
  error,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
  destructive?: boolean
  isLoading?: boolean
  error?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isLoading} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant={destructive ? "destructive" : "default"} disabled={isLoading} onClick={() => void onConfirm()}>
            {isLoading ? "Working..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Search
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-5 py-10 text-center">
      <span className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  )
}

export function FeedbackToast({
  message,
  onDismiss,
}: {
  message: string
  onDismiss: () => void
}) {
  useEffect(() => {
    if (!message) return
    const timeoutId = window.setTimeout(onDismiss, 3200)
    return () => window.clearTimeout(timeoutId)
  }, [message, onDismiss])

  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.18 }}
          className="fixed right-4 bottom-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg border border-border bg-popover px-4 py-3 text-sm text-foreground shadow-lg"
        >
          <Check className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">{message}</span>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Dismiss notification" onClick={onDismiss}>
            <X />
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function FormField({
  label,
  children,
  className = "",
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`grid min-w-0 gap-1.5 text-xs font-medium text-foreground ${className}`}>
      {label}
      {children}
    </label>
  )
}

export function DetailValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border/70 py-3 last:border-0">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm text-foreground">{value}</dd>
    </div>
  )
}

export function formatDate(value: string) {
  if (!value) return "—"
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date)
}