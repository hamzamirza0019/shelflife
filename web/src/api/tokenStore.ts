import type { AuthUser, TokenPair } from "@/types/auth"

const REFRESH_TOKEN_KEY = "shelflife.refresh-token"
const USER_KEY = "shelflife.user"

let accessToken: string | null = null

function canUseStorage() {
  return typeof window !== "undefined"
}

function readRefreshStorage(): Storage | null {
  if (!canUseStorage()) return null
  if (window.localStorage.getItem(REFRESH_TOKEN_KEY)) return window.localStorage
  if (window.sessionStorage.getItem(REFRESH_TOKEN_KEY)) return window.sessionStorage
  return null
}

export function getAccessToken() {
  return accessToken
}

export function getRefreshToken() {
  return readRefreshStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null
}

export function getStoredUser(): AuthUser | null {
  try {
    const value = readRefreshStorage()?.getItem(USER_KEY)
    return value ? JSON.parse(value) as AuthUser : null
  } catch {
    return null
  }
}

export function setAuthSession(tokens: TokenPair, user: AuthUser, rememberMe: boolean) {
  accessToken = tokens.accessToken
  if (!canUseStorage()) return

  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  window.sessionStorage.removeItem(USER_KEY)
  const storage = rememberMe ? window.localStorage : window.sessionStorage
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  storage.setItem(USER_KEY, JSON.stringify(user))
}

export function updateAccessTokens(tokens: TokenPair) {
  accessToken = tokens.accessToken
  readRefreshStorage()?.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
}

export function clearAuthSession() {
  accessToken = null
  if (!canUseStorage()) return
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  window.sessionStorage.removeItem(USER_KEY)
}

export function dispatchAuthExpired() {
  if (canUseStorage()) window.dispatchEvent(new Event("shelflife:auth-expired"))
}