import { apiClient } from "@/api/client"
import type { ApiResponse } from "@/types/api"
import type { AuthUser, LoginCredentials, LoginResponse, TokenPair } from "@/types/auth"

export async function login(credentials: LoginCredentials) {
  const response = await apiClient.post<ApiResponse<LoginResponse>>("/api/auth/login", credentials)
  if (!response.data.success) throw new Error(response.data.message)
  return response.data.data
}

export async function refreshSession(refreshToken: string) {
  const response = await apiClient.post<ApiResponse<TokenPair>>("/api/auth/refresh", { refreshToken })
  if (!response.data.success) throw new Error(response.data.message)
  return response.data.data
}

export async function logout(refreshToken: string) {
  await apiClient.post<ApiResponse<{ message: string }>>("/api/auth/logout", { refreshToken })
}

export type { AuthUser }