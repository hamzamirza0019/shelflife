export type DashboardStatId = "books" | "available" | "members" | "borrowed"

export type DashboardStat = {
  id: DashboardStatId
  label: string
  value: string
  context: string
  tone: "positive" | "neutral" | "attention"
}

export type BorrowingDay = {
  day: string
  issued: number
  returned: number
}

export type DashboardActivity = {
  id: string
  member: string
  initials: string
  book: string
  date: string
  status: "Borrowed" | "Returned" | "Overdue"
}

export type DashboardOverdue = {
  id: string
  book: string
  member: string
  dueDate: string
  daysOverdue: number
}