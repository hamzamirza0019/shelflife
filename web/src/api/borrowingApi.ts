import { apiClient } from "@/api/client"
import { fetchAllPages } from "@/api/pagination"
import type { ApiResponse, PaginationParams } from "@/types/api"
import type { BorrowRecord } from "@/types/borrowing"

export async function listCurrentBorrowing(params: Omit<PaginationParams, "page" | "limit" | "genre"> = {}) {
  return fetchAllPages<BorrowRecord>(apiClient, "/api/borrow", params)
}

export async function listBorrowingHistory(params: Omit<PaginationParams, "page" | "limit" | "genre"> = {}) {
  return fetchAllPages<BorrowRecord>(apiClient, "/api/borrow/history", params)
}

export async function issueBook(input: { bookId: string; memberId: string }) {
  const response = await apiClient.post<ApiResponse<BorrowRecord>>("/api/borrow", input)
  if (!response.data.success) throw new Error(response.data.message)
  return response.data.data
}

export async function returnBook(borrowId: string) {
  const response = await apiClient.post<ApiResponse<BorrowRecord>>(`/api/borrow/return/${borrowId}`)
  if (!response.data.success) throw new Error(response.data.message)
  return response.data.data
}