import axios, { type InternalAxiosRequestConfig } from "axios"
import type { ApiResponse } from "@/types/api"
import type { TokenPair } from "@/types/auth"
import { clearAuthSession, dispatchAuthExpired, getAccessToken, getRefreshToken, updateAccessTokens } from "@/api/tokenStore"

const baseURL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "")

export const apiClient = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
})

const refreshClient = axios.create({ baseURL, timeout: 15_000 })

type RetryConfig = InternalAxiosRequestConfig & { _shelflifeRetried?: boolean }
let refreshInFlight: Promise<string> | null = null

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.set("Authorization", `Bearer ${token}`)
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)
    const config = error.config as RetryConfig | undefined
    const isAuthRequest = config?.url?.startsWith("/api/auth/") ?? false
    if (error.response?.status !== 401 || !config || config._shelflifeRetried || isAuthRequest) {
      return Promise.reject(error)
    }

    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearAuthSession()
      dispatchAuthExpired()
      return Promise.reject(error)
    }

    config._shelflifeRetried = true
    try {
      refreshInFlight ??= refreshClient
        .post<ApiResponse<TokenPair>>("/api/auth/refresh", { refreshToken })
        .then(({ data }) => {
          if (!data.success) throw new Error(data.message)
          updateAccessTokens(data.data)
          return data.data.accessToken
        })
        .catch((refreshError: unknown) => {
          clearAuthSession()
          dispatchAuthExpired()
          return Promise.reject(refreshError)
        })
        .finally(() => {
          refreshInFlight = null
        })

      const nextAccessToken = await refreshInFlight
      config.headers.set("Authorization", `Bearer ${nextAccessToken}`)
      return await apiClient.request(config)
    } catch (refreshError) {
      return Promise.reject(refreshError)
    }
  },
)