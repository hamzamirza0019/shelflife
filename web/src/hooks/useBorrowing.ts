import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { issueBook, listBorrowingHistory, listCurrentBorrowing, returnBook } from "@/api/borrowingApi"
import type { PaginationParams } from "@/types/api"

export function useCurrentBorrowing(params: Omit<PaginationParams, "page" | "limit" | "genre"> = {}) {
  return useQuery({
    queryKey: ["borrowing", "current", params],
    queryFn: () => listCurrentBorrowing(params),
  })
}

export function useBorrowingHistory(params: Omit<PaginationParams, "page" | "limit" | "genre"> = {}) {
  return useQuery({
    queryKey: ["borrowing", "history", params],
    queryFn: () => listBorrowingHistory(params),
  })
}

export function useIssueBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { bookId: string; memberId: string }) => issueBook(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["borrowing"] }),
        queryClient.invalidateQueries({ queryKey: ["books"] }),
        queryClient.invalidateQueries({ queryKey: ["members"] }),
      ])
    },
  })
}

export function useReturnBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (borrowId: string) => returnBook(borrowId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["borrowing"] }),
        queryClient.invalidateQueries({ queryKey: ["books"] }),
        queryClient.invalidateQueries({ queryKey: ["members"] }),
      ])
    },
  })
}