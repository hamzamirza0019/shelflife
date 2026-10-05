export type BookRecord = {
  _id: string
  title: string
  author: string
  ISBN: string
  genre: string
  totalCopies: number
  availableCopies: number
  createdAt: string
  updatedAt: string
}

export type BookInput = {
  title: string
  author: string
  isbn: string
  category: string
  totalCopies: number
}

export type LibraryBook = {
  id: string
  title: string
  author: string
  isbn: string
  category: string
  totalCopies: number
  availableCopies: number
  createdAt: string
  updatedAt: string
}

export function toLibraryBook(book: BookRecord): LibraryBook {
  return {
    id: book._id,
    title: book.title,
    author: book.author,
    isbn: book.ISBN,
    category: book.genre,
    totalCopies: book.totalCopies,
    availableCopies: book.availableCopies,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  }
}

export function getBookAvailability(book: Pick<LibraryBook, "availableCopies">) {
  if (book.availableCopies === 0) return "Out of stock"
  if (book.availableCopies <= 2) return "Low stock"
  return "Available"
}