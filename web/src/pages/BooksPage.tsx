import { useMemo, useState } from "react"
import { BookOpen, BookPlus } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmDialog, DetailValue, EmptyState, FeedbackToast, FormField, PageHeading, RecordActions, SearchField, SelectFilter, StatusBadge } from "@/components/management/ManagementUI"
import { getApiErrorMessage } from "@/api/errors"
import { useBook, useBooks, useCreateBook, useDeleteBook, useUpdateBook } from "@/hooks/useBooks"
import { getBookAvailability, type BookInput, type LibraryBook } from "@/types/book"

type BookDraft = BookInput & { id?: string }
const emptyBooks: LibraryBook[] = []

function BookEditor({
  book,
  categories,
  isSaving,
  onSave,
  onClose,
}: {
  book: LibraryBook | null
  categories: string[]
  isSaving: boolean
  onSave: (draft: BookDraft) => Promise<string | null>
  onClose: () => void
}) {
  const [title, setTitle] = useState(book?.title ?? "")
  const [author, setAuthor] = useState(book?.author ?? "")
  const [isbn, setIsbn] = useState(book?.isbn ?? "")
  const [category, setCategory] = useState(book?.category ?? "Fiction")
  const [totalCopies, setTotalCopies] = useState(String(book?.totalCopies ?? 1))
  const [error, setError] = useState("")

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = await onSave({
      id: book?.id,
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim(),
      category,
      totalCopies: Number(totalCopies),
    })
    if (message) setError(message)
    else onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{book ? "Edit book" : "Add a book"}</DialogTitle>
        <DialogDescription>Keep the catalog and copy counts up to date.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Book title" className="sm:col-span-2">
          <Input autoFocus required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. The Midnight Library" />
        </FormField>
        <FormField label="Author">
          <Input required maxLength={100} value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Author name" />
        </FormField>
        <FormField label="ISBN">
          <Input required maxLength={20} value={isbn} onChange={(event) => setIsbn(event.target.value)} placeholder="978..." />
        </FormField>
        <FormField label="Category">
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
            {[...new Set([...categories, category])].map((item) => <option key={item}>{item}</option>)}
          </select>
        </FormField>
        <FormField label="Total copies">
          <Input type="number" required min={1} value={totalCopies} onChange={(event) => setTotalCopies(event.target.value)} />
        </FormField>
      </div>
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : book ? "Save changes" : "Add book"}</Button>
      </DialogFooter>
    </form>
  )
}

export function BooksPage() {
  const [viewingBook, setViewingBook] = useState<LibraryBook | null>(null)
  const booksQuery = useBooks()
  const bookDetailQuery = useBook(viewingBook?.id ?? null)
  const createMutation = useCreateBook()
  const updateMutation = useUpdateBook()
  const deleteMutation = useDeleteBook()
  const books = booksQuery.data ?? emptyBooks
  const categories = useMemo(() => [...new Set(books.map((book) => book.category))].sort(), [books])
  const [search, setSearch] = useState("")
  const [availability, setAvailability] = useState("all")
  const [category, setCategory] = useState("all")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null)
  const [deletingBook, setDeletingBook] = useState<LibraryBook | null>(null)
  const [feedback, setFeedback] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const shouldReduceMotion = useReducedMotion() ?? false

  const filteredBooks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return books.filter((book) => {
      const matchesSearch = !query || [book.title, book.author, book.isbn].some((value) => value.toLowerCase().includes(query))
      const matchesCategory = category === "all" || book.category === category
      const matchesAvailability = availability === "all" || getBookAvailability(book) === availability
      return matchesSearch && matchesCategory && matchesAvailability
    })
  }, [books, search, availability, category])

  async function saveBook(draft: BookDraft) {
    try {
      if (draft.id) {
        await updateMutation.mutateAsync({ id: draft.id, input: draft })
        setFeedback("Book details updated")
      } else {
        await createMutation.mutateAsync(draft)
        setFeedback("Book added to the catalog")
      }
      return null
    } catch (error) {
      return getApiErrorMessage(error, "Unable to save this book.")
    }
  }

  function openEditor(book: LibraryBook | null = null) {
    setEditingBook(book)
    setEditorOpen(true)
  }

  function editFromView(book: LibraryBook) {
    setViewingBook(null)
    openEditor(book)
  }

  async function confirmDelete() {
    if (!deletingBook) return
    try {
      await deleteMutation.mutateAsync(deletingBook.id)
      setFeedback("Book removed from the catalog")
      setDeletingBook(null)
    } catch (error) {
      setDeleteError(getApiErrorMessage(error, "Unable to delete this book."))
    }
  }

  const actions = (book: LibraryBook) => ({
    onView: () => setViewingBook(book),
    onEdit: () => openEditor(book),
    onDelete: () => setDeletingBook(book),
  })

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <PageHeading
        title="Books"
        description="Browse the collection, track copy availability, and keep catalog details current."
        action={<Button type="button" onClick={() => openEditor()}><BookPlus />Add book</Button>}
      />

      <Card className="border border-border/80 py-0 shadow-none ring-0">
        <CardHeader className="gap-4 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchField value={search} onChange={setSearch} placeholder="Search title, author, ISBN..." label="Search books" />
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <SelectFilter label="Filter by availability" value={availability} onChange={setAvailability} options={[
                { value: "all", label: "All availability" },
                { value: "Available", label: "Available" },
                { value: "Low stock", label: "Low stock" },
                { value: "Out of stock", label: "Out of stock" },
              ]} />
              <SelectFilter label="Filter by category" value={category} onChange={setCategory} options={[
                { value: "all", label: "All categories" },
                ...categories.map((item) => ({ value: item, label: item })),
              ]} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Showing <span className="font-medium text-foreground">{filteredBooks.length}</span> of {books.length} titles</p>
        </CardHeader>

        {booksQuery.isPending ? (
          <CardContent role="status" className="space-y-4 border-t border-border/70 p-5">
            {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
          </CardContent>
        ) : booksQuery.isError ? (
          <CardContent className="border-t border-border/70 px-5 py-8 text-sm text-destructive" role="alert">
            <p>{getApiErrorMessage(booksQuery.error, "Unable to load books.")}</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void booksQuery.refetch()}>Retry</Button>
          </CardContent>
        ) : filteredBooks.length === 0 ? (
          <CardContent className="border-t border-border/70 px-0 py-0">
            <EmptyState icon={BookOpen} title="No books found" description="Try another search or adjust your filters to find a title." />
          </CardContent>
        ) : (
          <>
            <div className="hidden border-t border-border/70 xl:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/45 hover:bg-muted/45">
                    <TableHead className="pl-5 text-[11px] uppercase tracking-wide text-muted-foreground">Title</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">ISBN</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Category</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Copies</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Availability</TableHead>
                    <TableHead className="w-14 pr-4" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell className="py-3 pl-5">
                        <button type="button" onClick={() => setViewingBook(book)} className="grid max-w-[310px] text-left">
                          <span className="truncate text-xs font-semibold text-foreground hover:text-primary">{book.title}</span>
                          <span className="mt-1 truncate text-[11px] text-muted-foreground">{book.author}</span>
                        </button>
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground">{book.isbn}</TableCell>
                      <TableCell><span className="text-xs text-foreground">{book.category}</span></TableCell>
                      <TableCell className="text-xs tabular-nums text-foreground">{book.availableCopies}<span className="text-muted-foreground"> / {book.totalCopies}</span></TableCell>
                      <TableCell><StatusBadge status={getBookAvailability(book)} /></TableCell>
                      <TableCell className="pr-4"><RecordActions label={book.title} {...actions(book)} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="divide-y divide-border border-t border-border/70 xl:hidden">
              {filteredBooks.map((book, index) => (
                <motion.article
                  key={book.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.18, delay: shouldReduceMotion ? 0 : Math.min(index * 0.025, 0.15) }}
                  className="flex min-w-0 items-start gap-3 px-4 py-4 sm:px-5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/[0.07] text-primary"><BookOpen className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <button type="button" onClick={() => setViewingBook(book)} className="min-w-0 text-left">
                        <span className="block truncate text-sm font-semibold text-foreground">{book.title}</span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">{book.author}</span>
                      </button>
                      <RecordActions label={book.title} {...actions(book)} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <StatusBadge status={getBookAvailability(book)} />
                      <span className="text-[11px] text-muted-foreground">{book.availableCopies} of {book.totalCopies} available</span>
                      <span className="text-[11px] text-muted-foreground">{book.category}</span>
                    </div>
                    <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground">ISBN {book.isbn}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </>
        )}
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          {editorOpen ? <BookEditor key={editingBook?.id ?? "new-book"} book={editingBook} categories={categories} isSaving={createMutation.isPending || updateMutation.isPending} onSave={saveBook} onClose={() => setEditorOpen(false)} /> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingBook)} onOpenChange={(open) => { if (!open) setViewingBook(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{bookDetailQuery.data?.title ?? viewingBook?.title}</DialogTitle>
            <DialogDescription>Book record and current inventory.</DialogDescription>
          </DialogHeader>
          {bookDetailQuery.isPending ? <div role="status" className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : null}
          {bookDetailQuery.isError ? <p role="alert" className="text-xs text-destructive">{getApiErrorMessage(bookDetailQuery.error, "Unable to load book details.")}</p> : null}
          {bookDetailQuery.data ? (
            <dl className="divide-y divide-border/70">
              <DetailValue label="Author" value={bookDetailQuery.data.author} />
              <DetailValue label="ISBN" value={bookDetailQuery.data.isbn} />
              <DetailValue label="Category" value={bookDetailQuery.data.category} />
              <DetailValue label="Copies" value={`${bookDetailQuery.data.availableCopies} available of ${bookDetailQuery.data.totalCopies}`} />
              <DetailValue label="Status" value={<StatusBadge status={getBookAvailability(bookDetailQuery.data)} />} />
            </dl>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewingBook(null)}>Close</Button>
            {viewingBook ? <Button type="button" disabled={!bookDetailQuery.data} onClick={() => editFromView(bookDetailQuery.data ?? viewingBook)}>Edit book</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deletingBook)}
        onOpenChange={(open) => { if (!open) setDeletingBook(null) }}
        title="Delete this book?"
        description={`“${deletingBook?.title ?? "This book"}” will be removed from this local catalog view.`}
        confirmLabel="Delete book"
        destructive
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
        error={deleteError}
      />
      <FeedbackToast message={feedback} onDismiss={() => setFeedback("")} />
    </div>
  )
}