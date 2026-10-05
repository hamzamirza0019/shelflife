import { lazy, Suspense, type ReactNode } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { MotionConfig } from "motion/react"
import { AuthProvider } from "@/auth/AuthProvider"
import { useAuth } from "@/hooks/useAuth"
import { AppShell } from "@/components/layout/AppShell"
import { navigationItems } from "@/components/layout/navigation"

const LoginPage = lazy(() => import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage })))
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })))
const BooksPage = lazy(() => import("@/pages/BooksPage").then((module) => ({ default: module.BooksPage })))
const MembersPage = lazy(() => import("@/pages/MembersPage").then((module) => ({ default: module.MembersPage })))
const BorrowingPage = lazy(() => import("@/pages/BorrowingPage").then((module) => ({ default: module.BorrowingPage })))
const HistoryPage = lazy(() => import("@/pages/HistoryPage").then((module) => ({ default: module.HistoryPage })))

function PageLoading({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <div role="status" className="mx-auto flex min-h-40 max-w-[1320px] items-center justify-center text-sm text-muted-foreground">
        Loading workspace...
      </div>
    }>
      {children}
    </Suspense>
  )
}

function SessionLoading() {
  return <main role="status" className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">Checking your library session...</main>
}

function LoginRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <SessionLoading />
  if (isAuthenticated) return <Navigate to="/" replace />
  return <PageLoading><LoginPage /></PageLoading>
}

function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <SessionLoading />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <AppShell />
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route element={<ProtectedLayout />}>
              {navigationItems.map((item) => (
                <Route
                  key={item.to}
                  path={item.to}
                  element={<PageLoading>
                    {
                    item.to === "/" ? <DashboardPage />
                      : item.to === "/books" ? <BooksPage />
                        : item.to === "/members" ? <MembersPage />
                          : item.to === "/borrowing" ? <BorrowingPage />
                            : <HistoryPage />
                    }
                  </PageLoading>}
                />
              ))}
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  )
}

export default App
