import { useMemo, useState } from "react"
import { Mail, UserRound, UserRoundPlus, UsersRound } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmDialog, DetailValue, EmptyState, FeedbackToast, FormField, formatDate, PageHeading, RecordActions, SearchField, SelectFilter, StatusBadge } from "@/components/management/ManagementUI"
import { getApiErrorMessage } from "@/api/errors"
import { useCreateMember, useDeleteMember, useMember, useMembers, useUpdateMember } from "@/hooks/useMembers"
import { useCurrentBorrowing } from "@/hooks/useBorrowing"
import type { MemberInput, MemberRecord } from "@/types/member"
import type { BorrowRecord } from "@/types/borrowing"

type MemberDraft = MemberInput
type MemberWithLoans = MemberRecord & { borrowedBooks: number }
const emptyMembers: MemberRecord[] = []
const emptyBorrowing: BorrowRecord[] = []

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
}

function MemberEditor({
  member,
  isSaving,
  onSave,
  onClose,
}: {
  member: MemberRecord | null
  isSaving: boolean
  onSave: (draft: MemberDraft) => Promise<string | null>
  onClose: () => void
}) {
  const [name, setName] = useState(member?.name ?? "")
  const [email, setEmail] = useState(member?.email ?? "")
  const [membershipId, setMembershipId] = useState(member?.membershipId ?? "")
  const [error, setError] = useState("")

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = await onSave({ name: name.trim(), email: email.trim(), membershipId: membershipId.trim() })
    if (message) setError(message)
    else onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{member ? "Edit member" : "Add a member"}</DialogTitle>
        <DialogDescription>Maintain a current record for your library community.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name" className="sm:col-span-2">
          <Input autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Member name" />
        </FormField>
        <FormField label="Email address">
          <Input type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@university.edu" />
        </FormField>
        <FormField label="Membership ID">
          <Input required maxLength={64} value={membershipId} onChange={(event) => setMembershipId(event.target.value)} placeholder="SL-240428" />
        </FormField>
      </div>
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : member ? "Save changes" : "Add member"}</Button>
      </DialogFooter>
    </form>
  )
}

export function MembersPage() {
  const [search, setSearch] = useState("")
  const [loanFilter, setLoanFilter] = useState("all")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<MemberRecord | null>(null)
  const [viewingMember, setViewingMember] = useState<MemberRecord | null>(null)
  const [deletingMember, setDeletingMember] = useState<MemberRecord | null>(null)
  const [feedback, setFeedback] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const shouldReduceMotion = useReducedMotion() ?? false
  const membersQuery = useMembers(search.trim() || undefined)
  const borrowingQuery = useCurrentBorrowing()
  const memberDetailQuery = useMember(viewingMember?._id ?? null)
  const createMutation = useCreateMember()
  const updateMutation = useUpdateMember()
  const deleteMutation = useDeleteMember()
  const members = membersQuery.data ?? emptyMembers
  const borrowings = borrowingQuery.data ?? emptyBorrowing

  const membersWithLoans = useMemo<MemberWithLoans[]>(() => members.map((member) => ({
    ...member,
    borrowedBooks: borrowings.filter((loan) => loan.member?._id === member._id).length,
  })), [members, borrowings])
  const filteredMembers = membersWithLoans.filter((member) => loanFilter === "all"
    || (loanFilter === "on-loan" ? member.borrowedBooks > 0 : member.borrowedBooks === 0))

  async function saveMember(draft: MemberDraft) {
    try {
      if (editingMember) {
        await updateMutation.mutateAsync({ id: editingMember._id, input: draft })
        setFeedback("Member details updated")
      } else {
        await createMutation.mutateAsync(draft)
        setFeedback("Member added to the directory")
      }
      return null
    } catch (error) {
      return getApiErrorMessage(error, "Unable to save this member.")
    }
  }

  function openEditor(member: MemberRecord | null = null) {
    setEditingMember(member)
    setEditorOpen(true)
  }

  async function confirmDelete() {
    if (!deletingMember) return
    try {
      await deleteMutation.mutateAsync(deletingMember._id)
      setFeedback("Member removed from the directory")
      setDeletingMember(null)
    } catch (error) {
      setDeleteError(getApiErrorMessage(error, "Unable to remove this member."))
    }
  }

  const actions = (member: MemberRecord) => ({
    onView: () => setViewingMember(member),
    onEdit: () => openEditor(member),
    onDelete: () => setDeletingMember(member),
  })

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <PageHeading
        title="Members"
        description="Manage member records and keep contact details close at hand."
        action={<Button type="button" onClick={() => openEditor()}><UserRoundPlus />Add member</Button>}
      />

      <Card className="border border-border/80 py-0 shadow-none ring-0">
        <CardHeader className="gap-4 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchField value={search} onChange={setSearch} placeholder="Search name, ID, email..." label="Search members" />
            <SelectFilter label="Filter by current loans" value={loanFilter} onChange={setLoanFilter} options={[
              { value: "all", label: "All members" },
              { value: "on-loan", label: "With current loans" },
              { value: "no-loans", label: "No current loans" },
            ]} />
          </div>
          <p className="text-xs text-muted-foreground">Showing <span className="font-medium text-foreground">{filteredMembers.length}</span> of {members.length} members</p>
        </CardHeader>

        {membersQuery.isPending || borrowingQuery.isPending ? (
          <CardContent role="status" className="space-y-4 border-t border-border/70 p-5">
            {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
          </CardContent>
        ) : membersQuery.isError || borrowingQuery.isError ? (
          <CardContent role="alert" className="border-t border-border/70 px-5 py-8 text-sm text-destructive">
            <p>{getApiErrorMessage(membersQuery.error ?? borrowingQuery.error, "Unable to load members.")}</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => { void membersQuery.refetch(); void borrowingQuery.refetch() }}>Retry</Button>
          </CardContent>
        ) : filteredMembers.length === 0 ? (
          <CardContent className="border-t border-border/70 px-0 py-0">
            <EmptyState icon={UsersRound} title="No members found" description="Try another search or adjust the status filter." />
          </CardContent>
        ) : (
          <>
            <div className="hidden border-t border-border/70 xl:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/45 hover:bg-muted/45">
                    <TableHead className="pl-5 text-[11px] uppercase tracking-wide text-muted-foreground">Member</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Email</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Joined</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">On loan</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Loan activity</TableHead>
                    <TableHead className="w-14 pr-4" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member._id}>
                      <TableCell className="py-3 pl-5">
                        <button type="button" onClick={() => setViewingMember(member)} className="flex min-w-0 items-center gap-2.5 text-left">
                          <Avatar size="sm" className="rounded-md"><AvatarFallback className="rounded-md bg-muted text-[10px] font-medium">{initials(member.name)}</AvatarFallback></Avatar>
                          <span className="grid min-w-0">
                            <span className="truncate text-xs font-semibold text-foreground">{member.name}</span>
                            <span className="mt-1 truncate text-[11px] text-muted-foreground">{member.membershipId}</span>
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <span className="truncate text-xs text-foreground">{member.email}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(member.joinedDate)}</TableCell>
                      <TableCell className="text-xs tabular-nums text-foreground">{member.borrowedBooks}</TableCell>
                      <TableCell><StatusBadge status={member.borrowedBooks > 0 ? "On loan" : "No current loans"} /></TableCell>
                      <TableCell className="pr-4"><RecordActions label={member.name} {...actions(member)} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="divide-y divide-border border-t border-border/70 xl:hidden">
              {filteredMembers.map((member, index) => (
                <motion.article
                  key={member._id}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.18, delay: shouldReduceMotion ? 0 : Math.min(index * 0.025, 0.15) }}
                  className="flex min-w-0 items-start gap-3 px-4 py-4 sm:px-5"
                >
                  <Avatar className="rounded-md"><AvatarFallback className="rounded-md bg-muted text-xs font-medium">{initials(member.name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <button type="button" onClick={() => setViewingMember(member)} className="min-w-0 text-left">
                        <span className="block truncate text-sm font-semibold text-foreground">{member.name}</span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">{member.membershipId}</span>
                      </button>
                      <RecordActions label={member.name} {...actions(member)} />
                    </div>
                    <p className="mt-3 truncate text-xs text-muted-foreground"><Mail className="mr-1.5 inline size-3.5" />{member.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <StatusBadge status={member.borrowedBooks > 0 ? "On loan" : "No current loans"} />
                      <span className="text-[11px] text-muted-foreground">{member.borrowedBooks} on loan</span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </>
        )}
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          {editorOpen ? <MemberEditor key={editingMember?._id ?? "new-member"} member={editingMember} isSaving={createMutation.isPending || updateMutation.isPending} onSave={saveMember} onClose={() => setEditorOpen(false)} /> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingMember)} onOpenChange={(open) => { if (!open) setViewingMember(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{memberDetailQuery.data?.name ?? viewingMember?.name}</DialogTitle>
            <DialogDescription>Member profile and borrowing summary.</DialogDescription>
          </DialogHeader>
          {memberDetailQuery.isPending ? <div role="status" className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : null}
          {memberDetailQuery.isError ? <p role="alert" className="text-xs text-destructive">{getApiErrorMessage(memberDetailQuery.error, "Unable to load member details.")}</p> : null}
          {memberDetailQuery.data ? (
            <dl className="divide-y divide-border/70">
              <DetailValue label="Membership ID" value={memberDetailQuery.data.membershipId} />
              <DetailValue label="Email" value={memberDetailQuery.data.email} />
              <DetailValue label="Joined" value={formatDate(memberDetailQuery.data.joinedDate)} />
              <DetailValue label="Books currently borrowed" value={borrowings.filter((loan) => loan.member?._id === memberDetailQuery.data._id).length} />
              <DetailValue label="Loan activity" value={<StatusBadge status={borrowings.some((loan) => loan.member?._id === memberDetailQuery.data?._id) ? "On loan" : "No current loans"} />} />
            </dl>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewingMember(null)}>Close</Button>
            {memberDetailQuery.data ? <Button type="button" onClick={() => { const member = memberDetailQuery.data; setViewingMember(null); openEditor(member) }}>Edit member</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deletingMember)}
        onOpenChange={(open) => { if (!open) setDeletingMember(null) }}
        title="Remove this member?"
        description={`“${deletingMember?.name ?? "This member"}” will be removed from this local directory.`}
        confirmLabel="Remove member"
        destructive
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
        error={deleteError}
      />
      <FeedbackToast message={feedback} onDismiss={() => setFeedback("")} />
      <span className="sr-only"><UserRound aria-hidden="true" />Member directory</span>
    </div>
  )
}