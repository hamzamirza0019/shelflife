import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { login, logout, refreshSession } from "@/api/authApi"
import { clearAuthSession, dispatchAuthExpired, getRefreshToken, getStoredUser, setAuthSession, updateAccessTokens } from "@/api/tokenStore"
import type { AuthUser, LoginCredentials } from "@/types/auth"

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (credentials: LoginCredentials, rememberMe: boolean) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [isLoading, setIsLoading] = useState(() => Boolean(getRefreshToken() && getStoredUser()))

  useEffect(() => {
    const handleExpired = () => {
      clearAuthSession()
      setUser(null)
      setIsLoading(false)
      queryClient.clear()
      navigate("/login", { replace: true })
    }
    window.addEventListener("shelflife:auth-expired", handleExpired)
    return () => window.removeEventListener("shelflife:auth-expired", handleExpired)
  }, [navigate, queryClient])

  useEffect(() => {
    const refreshToken = getRefreshToken()
    const storedUser = getStoredUser()
    if (!refreshToken || !storedUser) {
      clearAuthSession()
      return
    }

    let active = true
    refreshSession(refreshToken)
      .then((tokens) => {
        if (!active) return
        updateAccessTokens(tokens)
        setUser(storedUser)
      })
      .catch(() => {
        if (!active) return
        clearAuthSession()
        queryClient.clear()
        setUser(null)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [queryClient])

  const signIn = useCallback(async (credentials: LoginCredentials, rememberMe: boolean) => {
    const session = await login(credentials)
    setAuthSession(session, session.user, rememberMe)
    setUser(session.user)
    await queryClient.clear()
    navigate("/", { replace: true })
  }, [navigate, queryClient])

  const signOut = useCallback(async () => {
    const refreshToken = getRefreshToken()
    try {
      if (refreshToken) await logout(refreshToken)
    } catch {
      console.warn("Remote logout failed; clearing the local session")
    } finally {
      clearAuthSession()
      setUser(null)
      queryClient.clear()
      navigate("/login", { replace: true })
    }
  }, [navigate, queryClient])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    signIn,
    signOut,
  }), [user, isLoading, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}

export function expireAuthSession() {
  clearAuthSession()
  dispatchAuthExpired()
}