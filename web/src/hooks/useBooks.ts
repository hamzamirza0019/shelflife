import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createBook, deleteBook, getBook, listBooks, updateBook } from "@/api/booksApi"
import type { BookInput } from "@/types/book"

export function useBooks(genre?: string) {
  return useQuery({
    queryKey: ["books", { genre: genre || undefined }],
    queryFn: () => listBooks(genre ? { genre } : {}),
  })
}

export function useBook(id: string | null) {
  return useQuery({
    queryKey: ["books", "detail", id],
    queryFn: () => getBook(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BookInput) => createBook(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
  })
}

export function useUpdateBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: { id: string; input: BookInput }) => updateBook(variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
  })
}

export function useDeleteBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBook(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
  })
}