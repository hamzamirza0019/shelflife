import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { BookOpen, Eye, EyeOff, LibraryBig } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getApiErrorMessage } from "@/api/errors"
import { useAuth } from "@/hooks/useAuth"

export function LoginPage() {
  const shouldReduceMotion = useReducedMotion() ?? false
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid university email address.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setIsLoading(true)
    try {
      await signIn({ email: email.trim(), password }, rememberMe)
    } catch (error) {
      setError(getApiErrorMessage(error, "Unable to sign in. Check your credentials and try again."))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.main
      initial={shouldReduceMotion ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
      className="flex min-h-svh flex-col bg-background px-5 py-6 sm:px-8"
    >
      <Link to="/" className="flex w-fit items-center gap-2.5" aria-label="ShelfLife home">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BookOpen className="size-[18px]" />
        </span>
        <span className="text-[15px] font-semibold text-foreground">ShelfLife</span>
      </Link>

      <div className="flex flex-1 items-center justify-center py-12">
        <section className="w-full max-w-[390px]">
          <div className="mb-8">
            <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/[0.08] text-primary"><LibraryBig className="size-5" /></div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.13em] text-primary/80">Librarian workspace</p>
            <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Sign in to continue to your library workspace.
            </p>
          </div>

          <form noValidate onSubmit={submit} className="space-y-5">
            <label className="block space-y-2 text-sm font-medium">
              Email address
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@university.edu"
                autoComplete="email"
                aria-invalid={Boolean(error && !email)}
                required
              />
            </label>
            <div className="space-y-2 text-sm font-medium">
              <label htmlFor="login-password" className="block">Password</label>
              <span className="relative block">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="pr-11"
                  required
                  aria-invalid={Boolean(error.startsWith("Password"))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-1.5 -translate-y-1/2"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="size-4 rounded border-input accent-primary" />
                Remember me
              </label>
              <a href="mailto:library@northbridge.edu" className="text-xs font-medium text-primary hover:underline">Need help signing in?</a>
            </div>
            {error ? <p id="login-error" role="alert" className="text-xs text-destructive">{error}</p> : null}
            <Button type="submit" disabled={isLoading} className="h-10 w-full">
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 border-t border-border pt-5 text-center text-xs leading-5 text-muted-foreground">
            Sign in with your librarian account.
          </p>
        </section>
      </div>
    </motion.main>
  )
}