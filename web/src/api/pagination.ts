import type { AxiosInstance } from "axios"
import type { PaginatedResponse, PaginationParams } from "@/types/api"

export async function fetchAllPages<T>(
  client: AxiosInstance,
  path: string,
  params: Omit<PaginationParams, "page" | "limit"> = {},
) {
  const limit = 100
  const first = await client.get<PaginatedResponse<T>>(path, { params: { ...params, page: 1, limit } })
  if (!first.data.success) throw new Error("The server returned an invalid list response.")

  const records = [...first.data.data]
  for (let page = 2; page <= first.data.pagination.totalPages; page += 1) {
    const response = await client.get<PaginatedResponse<T>>(path, { params: { ...params, page, limit } })
    if (!response.data.success) throw new Error("The server returned an invalid list response.")
    records.push(...response.data.data)
  }
  return records
}