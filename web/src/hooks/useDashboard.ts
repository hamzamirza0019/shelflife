import { useMemo } from "react"
import { useBooks } from "@/hooks/useBooks"
import { useMembers } from "@/hooks/useMembers"
import { useBorrowingHistory, useCurrentBorrowing } from "@/hooks/useBorrowing"
import { toActiveLoan, toHistoryRecord } from "@/types/borrowing"
import type { BorrowingDay, DashboardActivity, DashboardOverdue, DashboardStat } from "@/types/dashboard"
import type { LibraryBook } from "@/types/book"
import type { MemberRecord } from "@/types/member"
import type { BorrowRecord } from "@/types/borrowing"

const emptyBooks: LibraryBook[] = []
const emptyMembers: MemberRecord[] = []
const emptyBorrowing: BorrowRecord[] = []

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(date)
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
}

export function useDashboardData() {
  const booksQuery = useBooks()
  const membersQuery = useMembers()
  const currentQuery = useCurrentBorrowing()
  const historyQuery = useBorrowingHistory()

  const books = booksQuery.data ?? emptyBooks
  const members = membersQuery.data ?? emptyMembers
  const currentLoans = useMemo(() => (currentQuery.data ?? emptyBorrowing).map(toActiveLoan), [currentQuery.data])
  const history = historyQuery.data ?? emptyBorrowing
  const historyView = useMemo(() => history.map(toHistoryRecord), [history])
  const overdue = useMemo<DashboardOverdue[]>(() => currentLoans
      .filter((loan) => loan.status === "Overdue")
      .map((loan) => ({
        id: loan.id,
        book: loan.book,
        member: loan.member,
        dueDate: displayDate(loan.dueDate),
        daysOverdue: loan.daysOverdue,
      }))
      .slice(0, 5), [currentLoans])

  const activity = useMemo<DashboardActivity[]>(() => historyView
    .slice()
    .sort((left, right) => new Date(right.issueDate).getTime() - new Date(left.issueDate).getTime())
    .slice(0, 5)
    .map((record) => ({
      id: record.id,
      member: record.member,
      initials: initials(record.member),
      book: record.book,
      date: displayDate(record.issueDate),
      status: record.status,
    })), [historyView])

  const borrowingActivity = useMemo<BorrowingDay[]>(() => {
    const now = new Date()
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (6 - index)))
      return { key: dateKey(date), day: dateLabel(date), issued: 0, returned: 0 }
    })
    const dayByKey = new Map(days.map((day) => [day.key, day]))

    for (const record of history) {
      const issued = dayByKey.get(dateKey(new Date(record.issueDate)))
      if (issued) issued.issued += 1
      if (record.returnDate) {
        const returned = dayByKey.get(dateKey(new Date(record.returnDate)))
        if (returned) returned.returned += 1
      }
    }
    return days.map(({ day, issued, returned }) => ({ day, issued, returned }))
  }, [history])

  const isLoading = booksQuery.isPending || membersQuery.isPending || currentQuery.isPending || historyQuery.isPending
  const error = booksQuery.error ?? membersQuery.error ?? currentQuery.error ?? historyQuery.error
  const stats: DashboardStat[] = [
    { id: "books", label: "Total books", value: booksQuery.isPending ? "—" : books.reduce((total, book) => total + book.totalCopies, 0).toLocaleString(), context: "Total copies in catalog", tone: "positive" },
    { id: "available", label: "Available books", value: booksQuery.isPending ? "—" : books.reduce((total, book) => total + book.availableCopies, 0).toLocaleString(), context: "Ready to borrow", tone: "neutral" },
    { id: "members", label: "Members", value: membersQuery.isPending ? "—" : members.length.toLocaleString(), context: "Registered members", tone: "positive" },
    { id: "borrowed", label: "Currently borrowed", value: currentQuery.isPending ? "—" : currentLoans.length.toLocaleString(), context: `${overdue.length} overdue`, tone: overdue.length ? "attention" : "neutral" },
  ]

  return {
    stats,
    activity,
    overdue,
    borrowingActivity,
    isLoading,
    error,
    refetch: () => Promise.all([booksQuery.refetch(), membersQuery.refetch(), currentQuery.refetch(), historyQuery.refetch()]),
  }
}