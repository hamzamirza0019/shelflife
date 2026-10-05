export type ApiSuccess<T> = {
  success: true
  data: T
}

export type ApiFailure = {
  success: false
  message: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type PaginatedResponse<T> = {
  success: true
  data: T[]
  pagination: Pagination
}

export type PaginationParams = {
  page?: number
  limit?: number
  search?: string
  genre?: string
  status?: string
  fromDate?: string
  toDate?: string
}