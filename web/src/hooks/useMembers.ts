import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createMember, deleteMember, getMember, listMembers, updateMember } from "@/api/membersApi"
import type { MemberInput } from "@/types/member"

export function useMembers(search?: string) {
  return useQuery({
    queryKey: ["members", { search: search || undefined }],
    queryFn: () => listMembers(search ? { search } : {}),
  })
}

export function useMember(id: string | null) {
  return useQuery({
    queryKey: ["members", "detail", id],
    queryFn: () => getMember(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MemberInput) => createMember(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  })
}

export function useUpdateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: { id: string; input: MemberInput }) => updateMember(variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  })
}

export function useDeleteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMember(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  })
}