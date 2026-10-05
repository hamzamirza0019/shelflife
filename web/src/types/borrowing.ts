export type BorrowBookSummary = {
  _id: string
  title: string
  author: string
  ISBN: string
  genre: string
  totalCopies?: number
  availableCopies?: number
} | null

export type BorrowMemberSummary = {
  _id: string
  name: string
  email: string
  membershipId: string
} | null

export type BorrowRecord = {
  _id: string
  book: BorrowBookSummary
  member: BorrowMemberSummary
  issueDate: string
  dueDate: string
  returnDate: string | null
  status: "issued" | "returned" | "overdue"
  createdAt?: string
  updatedAt?: string
}

export type LoanStatus = "Active" | "Due soon" | "Overdue"

export type ActiveLoan = {
  id: string
  memberId: string
  member: string
  bookId: string
  book: string
  issueDate: string
  dueDate: string
  returnDate: string | null
  status: LoanStatus
  daysOverdue: number
}

export type HistoryStatus = "Borrowed" | "Returned" | "Overdue"

export type HistoryRecord = {
  id: string
  member: string
  memberId: string
  book: string
  issueDate: string
  dueDate: string
  returnedDate: string
  status: HistoryStatus
}

export function toActiveLoan(record: BorrowRecord): ActiveLoan {
  const dueDate = new Date(record.dueDate)
  const now = new Date()
  const daysUntilDue = (dueDate.getTime() - now.getTime()) / 86_400_000
  const daysOverdue = !record.returnDate && daysUntilDue < 0
    ? Math.max(1, Math.floor(Math.abs(daysUntilDue)))
    : 0
  let status: LoanStatus = "Active"

  if (record.status === "overdue" || (!record.returnDate && daysUntilDue < 0)) {
    status = "Overdue"
  } else if (!record.returnDate && daysUntilDue <= 3) {
    status = "Due soon"
  }

  return {
    id: record._id,
    memberId: record.member?.membershipId ?? "",
    member: record.member?.name ?? "Unknown member",
    bookId: record.book?._id ?? "",
    book: record.book?.title ?? "Unknown book",
    issueDate: record.issueDate,
    dueDate: record.dueDate,
    returnDate: record.returnDate,
    status,
    daysOverdue,
  }
}

export function toHistoryRecord(record: BorrowRecord): HistoryRecord {
  const loan = toActiveLoan(record)
  const status: HistoryStatus = record.status === "returned"
    ? "Returned"
    : loan.status === "Overdue"
      ? "Overdue"
      : "Borrowed"

  return {
    id: record._id,
    member: loan.member,
    memberId: loan.memberId,
    book: loan.book,
    issueDate: loan.issueDate,
    dueDate: loan.dueDate,
    returnedDate: record.returnDate ?? "",
    status,
  }
}