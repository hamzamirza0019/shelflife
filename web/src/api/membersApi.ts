import { apiClient } from "@/api/client"
import { fetchAllPages } from "@/api/pagination"
import type { ApiResponse, PaginationParams } from "@/types/api"
import type { MemberInput, MemberRecord } from "@/types/member"

export async function listMembers(params: Omit<PaginationParams, "page" | "limit" | "genre"> = {}) {
  return fetchAllPages<MemberRecord>(apiClient, "/api/members", params)
}

export async function getMember(id: string) {
  const response = await apiClient.get<ApiResponse<MemberRecord>>(`/api/members/${id}`)
  if (!response.data.success) throw new Error(response.data.message)
  return response.data.data
}

export async function createMember(input: MemberInput) {
  const response = await apiClient.post<ApiResponse<MemberRecord>>("/api/members", input)
  if (!response.data.success) throw new Error(response.data.message)
  return response.data.data
}

export async function updateMember({ id, input }: { id: string; input: MemberInput }) {
  const response = await apiClient.patch<ApiResponse<MemberRecord>>(`/api/members/${id}`, input)
  if (!response.data.success) throw new Error(response.data.message)
  return response.data.data
}

export async function deleteMember(id: string) {
  await apiClient.delete<ApiResponse<{ message: string }>>(`/api/members/${id}`)
}