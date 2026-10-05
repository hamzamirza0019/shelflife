import { BookOpen } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DashboardActivity } from "@/types/dashboard"
import { EmptyState } from "@/components/management/ManagementUI"
import { Skeleton } from "@/components/ui/skeleton"

function statusClass(status: DashboardActivity["status"]) {
  if (status === "Overdue") return "border-rose-200 bg-rose-50 text-rose-700"
  if (status === "Borrowed") return "border-primary/15 bg-primary/[0.07] text-primary"
  return "border-border bg-muted/70 text-muted-foreground"
}

export function RecentActivity({ items, isLoading }: { items: DashboardActivity[]; isLoading: boolean }) {
  return (
    <Card className="min-w-0 border border-border/80 py-0 shadow-none ring-0">
      <CardHeader className="flex flex-row items-center justify-between gap-4 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
        <div>
          <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Latest borrowing activity across your library</p>
        </div>
          <span className="shrink-0 text-xs text-muted-foreground">{isLoading ? "Loading..." : `Last ${items.length} records`}</span>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {isLoading ? <div role="status" className="space-y-3 px-5 pb-5">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div> : items.length === 0 ? <EmptyState icon={BookOpen} title="No borrowing activity yet" description="Recent issues and returns will appear here." /> : (
        <>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/45 hover:bg-muted/45">
                <TableHead className="pl-6 text-[11px] uppercase tracking-wide text-muted-foreground">Member</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Book</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Date</TableHead>
                <TableHead className="pr-6 text-[11px] uppercase tracking-wide text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="py-3 pl-6">
                    <span className="flex items-center gap-2.5">
                      <Avatar size="sm" className="rounded-md">
                        <AvatarFallback className="rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
                          {activity.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-foreground">{activity.member}</span>
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">{activity.book}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{activity.date}</TableCell>
                  <TableCell className="pr-6">
                    <Badge variant="outline" className={statusClass(activity.status)}>{activity.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <ul className="divide-y divide-border md:hidden">
          {items.map((activity) => (
            <li key={activity.id} className="flex min-w-0 items-center gap-3 px-5 py-3.5">
              <Avatar size="sm" className="rounded-md">
                <AvatarFallback className="rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
                  {activity.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{activity.member}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{activity.book}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{activity.date}</p>
              </div>
              <Badge variant="outline" className={statusClass(activity.status)}>{activity.status}</Badge>
            </li>
          ))}
        </ul>
        </>
        )}
      </CardContent>
    </Card>
  )
}