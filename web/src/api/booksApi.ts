import { apiClient } from "@/api/client"
import { fetchAllPages } from "@/api/pagination"
import type { ApiResponse, PaginationParams } from "@/types/api"
import { toLibraryBook, type BookInput, type BookRecord, type LibraryBook } from "@/types/book"

export async function listBooks(params: Omit<PaginationParams, "page" | "limit" | "search"> = {}) {
  const records = await fetchAllPages<BookRecord>(apiClient, "/api/books", params)
  return records.map(toLibraryBook)
}

export async function getBook(id: string) {
  const response = await apiClient.get<ApiResponse<BookRecord>>(`/api/books/${id}`)
  if (!response.data.success) throw new Error(response.data.message)
  return toLibraryBook(response.data.data)
}

function toPayload(input: BookInput) {
  return {
    title: input.title,
    author: input.author,
    ISBN: input.isbn,
    genre: input.category,
    totalCopies: input.totalCopies,
  }
}

export async function createBook(input: BookInput): Promise<LibraryBook> {
  const response = await apiClient.post<ApiResponse<BookRecord>>("/api/books", toPayload(input))
  if (!response.data.success) throw new Error(response.data.message)
  return toLibraryBook(response.data.data)
}

export async function updateBook({ id, input }: { id: string; input: BookInput }): Promise<LibraryBook> {
  const response = await apiClient.patch<ApiResponse<BookRecord>>(`/api/books/${id}`, toPayload(input))
  if (!response.data.success) throw new Error(response.data.message)
  return toLibraryBook(response.data.data)
}

export async function deleteBook(id: string) {
  await apiClient.delete<ApiResponse<{ message: string }>>(`/api/books/${id}`)
}