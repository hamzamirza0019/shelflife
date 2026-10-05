import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Outlet } from "react-router-dom"
import { useLocation } from "react-router-dom"
import { AppHeader } from "@/components/layout/AppHeader"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function AppShell() {
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion() ?? false

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="min-h-svh min-w-0 bg-background">
        <AppHeader />
        <AnimatePresence mode="wait" initial={!shouldReduceMotion}>
          <motion.div
            key={location.pathname}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -3 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
            className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-7 sm:px-6 md:px-8 md:py-9"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </SidebarInset>
    </SidebarProvider>
  )
}