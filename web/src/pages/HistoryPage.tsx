import { useMemo, useState } from "react"
import { Archive, BookOpen, RotateCcw } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, PageHeading, SearchField, SelectFilter, StatusBadge, formatDate } from "@/components/management/ManagementUI"
import { getApiErrorMessage } from "@/api/errors"
import { useBorrowingHistory } from "@/hooks/useBorrowing"
import { toHistoryRecord } from "@/types/borrowing"

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
}

export function HistoryPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const shouldReduceMotion = useReducedMotion() ?? false
  const filters = useMemo(() => ({
    ...(status === "all" ? {} : { status: status === "borrowed" ? "issued" : status }),
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  }), [status, search, fromDate, toDate])
  const recordsQuery = useBorrowingHistory(filters)
  const records = (recordsQuery.data ?? []).map(toHistoryRecord)

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <PageHeading
        title="History"
        description="A searchable record of loans and returns across your library."
      />

      <Card className="border border-border/80 py-0 shadow-none ring-0">
        <CardHeader className="gap-4 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <SearchField value={search} onChange={setSearch} placeholder="Search member, book, loan ID..." label="Search history" />
              <SelectFilter label="Filter by record status" value={status} onChange={setStatus} options={[
                { value: "all", label: "All activity" },
                { value: "borrowed", label: "Borrowed" },
                { value: "returned", label: "Returned" },
                { value: "overdue", label: "Overdue" },
              ]} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <label className="grid gap-1 text-[10px] font-medium text-muted-foreground">
                From issue date
                <Input type="date" aria-label="From issue date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-9 text-xs" />
              </label>
              <label className="grid gap-1 text-[10px] font-medium text-muted-foreground">
                Through issue date
                <Input type="date" aria-label="Through issue date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-9 text-xs" />
              </label>
              {fromDate || toDate ? <Button type="button" variant="ghost" size="sm" className="self-end text-xs" onClick={() => { setFromDate(""); setToDate("") }}>Clear dates</Button> : null}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{records.length} {records.length === 1 ? "record" : "records"}</p>
        </CardHeader>

        {recordsQuery.isPending ? (
          <CardContent role="status" className="space-y-4 border-t border-border/70 p-5">
            {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
          </CardContent>
        ) : recordsQuery.isError ? (
          <CardContent role="alert" className="border-t border-border/70 px-5 py-8 text-sm text-destructive">
            <p>{getApiErrorMessage(recordsQuery.error, "Unable to load borrowing history.")}</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void recordsQuery.refetch()}>Retry</Button>
          </CardContent>
        ) : records.length === 0 ? (
          <CardContent className="border-t border-border/70 px-0 py-0">
            <EmptyState icon={Archive} title="No activity found" description="Try another search, date range, or status filter." />
          </CardContent>
        ) : (
          <>
            <div className="hidden border-t border-border/70 xl:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/45 hover:bg-muted/45">
                    <TableHead className="pl-5 text-[11px] uppercase tracking-wide text-muted-foreground">Member</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Book</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Issued</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Due</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Returned</TableHead>
                    <TableHead className="pr-5 text-[11px] uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="py-3 pl-5">
                        <span className="flex items-center gap-2.5">
                          <Avatar size="sm" className="rounded-md"><AvatarFallback className="rounded-md bg-muted text-[10px]">{initials(record.member)}</AvatarFallback></Avatar>
                          <span className="grid"><span className="text-xs font-medium text-foreground">{record.member}</span><span className="mt-1 text-[11px] text-muted-foreground">{record.memberId}</span></span>
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-xs text-foreground">{record.book}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(record.issueDate)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(record.dueDate)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(record.returnedDate)}</TableCell>
                      <TableCell className="pr-5"><StatusBadge status={record.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="divide-y divide-border border-t border-border/70 xl:hidden">
              {records.map((record, index) => (
                <motion.article key={record.id} initial={shouldReduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.18, delay: shouldReduceMotion ? 0 : Math.min(index * 0.025, 0.15) }} className="flex min-w-0 items-start gap-3 px-4 py-4 sm:px-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><BookOpen className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{record.book}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{record.member} · {record.memberId}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge status={record.status} /><span className="text-[11px] text-muted-foreground">Issued {formatDate(record.issueDate)}</span></div>
                    <p className="mt-2 text-[11px] text-muted-foreground">Due {formatDate(record.dueDate)}{record.returnedDate ? ` · Returned ${formatDate(record.returnedDate)}` : ""}</p>
                  </div>
                  {record.status === "Returned" ? <RotateCcw className="mt-1 size-4 shrink-0 text-muted-foreground" aria-label="Returned" /> : null}
                </motion.article>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}