import { useMemo, useState } from "react"
import { ArrowLeftRight, BookOpen, CalendarClock, CircleAlert, RotateCcw, Search, UserRound } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmDialog, EmptyState, FeedbackToast, FormField, formatDate, PageHeading, SearchField, SelectFilter, StatusBadge } from "@/components/management/ManagementUI"
import { getApiErrorMessage } from "@/api/errors"
import { useBooks } from "@/hooks/useBooks"
import { useMembers } from "@/hooks/useMembers"
import { useCurrentBorrowing, useIssueBook, useReturnBook } from "@/hooks/useBorrowing"
import { toActiveLoan, type ActiveLoan, type LoanStatus } from "@/types/borrowing"
import type { LibraryBook } from "@/types/book"
import type { MemberRecord } from "@/types/member"

type LoanDraft = { bookId: string; memberId: string }

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
}

function defaultDueDate() {
  const date = new Date()
  date.setDate(date.getDate() + 14)
  return date.toISOString().slice(0, 10)
}

function IssueLoanDialog({
  open,
  books,
  members,
  isLoading,
  isIssuing,
  lookupError,
  onOpenChange,
  onIssue,
}: {
  open: boolean
  books: LibraryBook[]
  members: MemberRecord[]
  isLoading: boolean
  isIssuing: boolean
  lookupError?: string
  onOpenChange: (open: boolean) => void
  onIssue: (draft: LoanDraft) => Promise<string | null>
}) {
  const [memberId, setMemberId] = useState("")
  const [bookId, setBookId] = useState("")
  const [memberSearch, setMemberSearch] = useState("")
  const [bookSearch, setBookSearch] = useState("")
  const [issueDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate] = useState(defaultDueDate())
  const [error, setError] = useState("")

  const visibleMembers = members.filter((member) => `${member.name} ${member.membershipId}`.toLowerCase().includes(memberSearch.toLowerCase()))
  const availableBooks = books.filter((book) => book.availableCopies > 0 && `${book.title} ${book.author} ${book.isbn}`.toLowerCase().includes(bookSearch.toLowerCase()))

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const member = members.find((item) => item._id === memberId)
    const book = books.find((item) => item.id === bookId)
    if (!member || !book) {
      setError("Choose an active member and an available book.")
      return
    }
    if (book.availableCopies < 1) {
      setError("This title has no available copies right now.")
      return
    }
    if (dueDate < issueDate) {
      setError("The due date must be after the issue date.")
      return
    }
    const message = await onIssue({ memberId, bookId })
    if (message) setError(message)
    else onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Issue a book</DialogTitle>
            <DialogDescription>Select a member and an available title to start a loan.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Find a member" className="sm:col-span-2">
              <span className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search name or member ID" className="pl-9" />
              </span>
              <select required value={memberId} onChange={(event) => setMemberId(event.target.value)} disabled={isLoading} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60">
                <option value="">Select member</option>
                {visibleMembers.map((member) => <option key={member._id} value={member._id}>{member.name} · {member.membershipId}</option>)}
              </select>
            </FormField>
            <FormField label="Find an available book" className="sm:col-span-2">
              <span className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={bookSearch} onChange={(event) => setBookSearch(event.target.value)} placeholder="Search title, author, or ISBN" className="pl-9" />
              </span>
              <select required value={bookId} onChange={(event) => setBookId(event.target.value)} disabled={isLoading} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60">
                <option value="">Select book</option>
                {availableBooks.map((book) => <option key={book.id} value={book.id}>{book.title} · {book.availableCopies} available</option>)}
              </select>
            </FormField>
            <FormField label="Issue date">
              <Input type="date" value={issueDate} readOnly />
            </FormField>
            <FormField label="Due date">
              <Input type="date" value={dueDate} readOnly />
            </FormField>
          </div>
          <p className="text-[11px] text-muted-foreground">Issue and due dates are assigned by the library server.</p>
          {lookupError ? <p role="alert" className="text-xs text-destructive">{lookupError}</p> : null}
          {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading || isIssuing || members.length === 0 || availableBooks.length === 0}>{isIssuing ? "Issuing..." : <><ArrowLeftRight />Issue book</>}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BorrowingPage() {
  const loansQuery = useCurrentBorrowing()
  const booksQuery = useBooks()
  const membersQuery = useMembers()
  const issueMutation = useIssueBook()
  const returnMutation = useReturnBook()
  const loans = useMemo(() => (loansQuery.data ?? []).map(toActiveLoan), [loansQuery.data])
  const books = booksQuery.data ?? []
  const members = membersQuery.data ?? []
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [issueOpen, setIssueOpen] = useState(false)
  const [returningLoan, setReturningLoan] = useState<ActiveLoan | null>(null)
  const [feedback, setFeedback] = useState("")
  const [returnError, setReturnError] = useState("")
  const shouldReduceMotion = useReducedMotion() ?? false

  const visibleLoans = useMemo(() => {
    const query = search.trim().toLowerCase()
    return loans.filter((loan) => {
      const matchesSearch = !query || [loan.member, loan.memberId, loan.book, loan.id].some((value) => value.toLowerCase().includes(query))
      return matchesSearch && (filter === "all" || loan.status === filter)
    })
  }, [loans, search, filter])

  async function issueBook(draft: LoanDraft) {
    try {
      await issueMutation.mutateAsync(draft)
      const book = books.find((item) => item.id === draft.bookId)
      const member = members.find((item) => item._id === draft.memberId)
      setFeedback(book && member ? `“${book.title}” issued to ${member.name}` : "Book issued successfully")
      return null
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to issue this book.")
      return message
    }
  }

  async function confirmReturn() {
    if (!returningLoan) return
    try {
      await returnMutation.mutateAsync(returningLoan.id)
      setFeedback(`“${returningLoan.book}” returned by ${returningLoan.member}`)
      setReturnError("")
      setReturningLoan(null)
    } catch (error) {
      setReturnError(getApiErrorMessage(error, "Unable to return this book."))
    }
  }

  const counts: Record<LoanStatus, number> = {
    Active: loans.filter((loan) => loan.status === "Active").length,
    "Due soon": loans.filter((loan) => loan.status === "Due soon").length,
    Overdue: loans.filter((loan) => loan.status === "Overdue").length,
  }

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <PageHeading
        title="Borrowing"
        description="Keep current loans moving and make due dates easy to act on."
        action={<Button type="button" onClick={() => setIssueOpen(true)}><ArrowLeftRight />Issue book</Button>}
      />

      <section aria-label="Loan status summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([
          { label: "Active loans", value: counts.Active, icon: BookOpen, tone: "text-primary" },
          { label: "Due soon", value: counts["Due soon"], icon: CalendarClock, tone: "text-amber-700" },
          { label: "Overdue", value: counts.Overdue, icon: CircleAlert, tone: "text-rose-700" },
        ]).map(({ label, value, icon: Icon, tone }, index) => (
          <motion.div key={label} initial={shouldReduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.18, delay: shouldReduceMotion ? 0 : index * 0.04 }}>
            <Card className="border border-border/80 py-4 shadow-none ring-0">
              <CardContent className="flex items-center gap-3 px-4 sm:px-5">
                <span className={`flex size-9 items-center justify-center rounded-lg bg-muted ${tone}`}><Icon className="size-4" /></span>
                <div><p className="text-lg font-semibold tabular-nums text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      <Card className="border border-border/80 py-0 shadow-none ring-0">
        <CardHeader className="gap-4 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <SearchField value={search} onChange={setSearch} placeholder="Search member, book, loan ID..." label="Search loans" />
              <SelectFilter label="Filter by loan status" value={filter} onChange={setFilter} options={[
                { value: "all", label: "All current loans" },
                { value: "Active", label: "Active" },
                { value: "Due soon", label: "Due soon" },
                { value: "Overdue", label: "Overdue" },
              ]} />
            </div>
            <span className="text-xs text-muted-foreground">{visibleLoans.length} current loans</span>
          </div>
        </CardHeader>

        {loansQuery.isPending ? <CardContent role="status" className="space-y-4 border-t border-border/70 p-5">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}</CardContent> : null}
        {loansQuery.isError ? <CardContent role="alert" className="border-t border-border/70 px-5 py-8 text-sm text-destructive"><p>{getApiErrorMessage(loansQuery.error, "Unable to load current loans.")}</p><Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void loansQuery.refetch()}>Retry</Button></CardContent> : null}
        {!loansQuery.isPending && !loansQuery.isError && visibleLoans.length === 0 ? (
          <CardContent className="border-t border-border/70 px-0 py-0">
            <EmptyState icon={ArrowLeftRight} title="No loans found" description="Try a different search or status filter." />
          </CardContent>
        ) : !loansQuery.isPending && !loansQuery.isError ? (
          <>
            <div className="hidden border-t border-border/70 xl:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/45 hover:bg-muted/45">
                    <TableHead className="pl-5 text-[11px] uppercase tracking-wide text-muted-foreground">Member</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Book</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Issued</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Due date</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</TableHead>
                    <TableHead className="pr-5 text-right text-[11px] uppercase tracking-wide text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="py-3 pl-5"><span className="flex items-center gap-2.5"><Avatar size="sm" className="rounded-md"><AvatarFallback className="rounded-md bg-muted text-[10px]">{initials(loan.member)}</AvatarFallback></Avatar><span className="grid"><span className="text-xs font-medium text-foreground">{loan.member}</span><span className="mt-1 text-[11px] text-muted-foreground">{loan.memberId}</span></span></span></TableCell>
                      <TableCell className="max-w-[250px] truncate text-xs text-foreground">{loan.book}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(loan.issueDate)}</TableCell>
                      <TableCell className={`whitespace-nowrap text-xs ${loan.status === "Overdue" ? "font-medium text-rose-700" : "text-muted-foreground"}`}>{formatDate(loan.dueDate)}</TableCell>
                      <TableCell><StatusBadge status={loan.status} /></TableCell>
                      <TableCell className="pr-5 text-right"><Button type="button" size="sm" variant="outline" onClick={() => setReturningLoan(loan)}><RotateCcw />Return</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="divide-y divide-border border-t border-border/70 xl:hidden">
              {visibleLoans.map((loan, index) => (
                <motion.article key={loan.id} initial={shouldReduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.18, delay: shouldReduceMotion ? 0 : Math.min(index * 0.025, 0.15) }} className="flex min-w-0 items-start gap-3 px-4 py-4 sm:px-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><BookOpen className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{loan.book}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground"><UserRound className="mr-1 inline size-3.5" />{loan.member} · {loan.memberId}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge status={loan.status} /><span className="text-[11px] text-muted-foreground">Due {formatDate(loan.dueDate)}</span></div>
                    <p className="mt-2 text-[11px] text-muted-foreground">Issued {formatDate(loan.issueDate)}</p>
                  </div>
                  <Button type="button" size="icon-sm" variant="ghost" aria-label={`Return ${loan.book}`} title="Return book" onClick={() => setReturningLoan(loan)}><RotateCcw /></Button>
                </motion.article>
              ))}
            </div>
          </>
        ) : null}
      </Card>

      <IssueLoanDialog open={issueOpen} books={books} members={members} isLoading={booksQuery.isPending || membersQuery.isPending} isIssuing={issueMutation.isPending} lookupError={booksQuery.isError || membersQuery.isError ? getApiErrorMessage(booksQuery.error ?? membersQuery.error, "Unable to load book or member choices.") : undefined} onOpenChange={setIssueOpen} onIssue={issueBook} />
      <ConfirmDialog
        open={Boolean(returningLoan)}
        onOpenChange={(open) => { if (!open) setReturningLoan(null) }}
        title="Return this book?"
        description={`Confirm that “${returningLoan?.book ?? "this title"}” has been returned by ${returningLoan?.member ?? "the member"}.`}
        confirmLabel="Confirm return"
        onConfirm={confirmReturn}
        isLoading={returnMutation.isPending}
        error={returnError}
      />
      <FeedbackToast message={feedback} onDismiss={() => setFeedback("")} />
    </div>
  )
}