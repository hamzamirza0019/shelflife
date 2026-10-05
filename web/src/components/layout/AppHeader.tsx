import { Bell, Search } from "lucide-react"
import { useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { UserMenu } from "@/components/layout/UserMenu"
import { navigationItems } from "@/components/layout/navigation"

export function AppHeader() {
  const { pathname } = useLocation()
  const currentPage = navigationItems.find((item) => item.to === pathname) ?? navigationItems[0]

  return (
    <header className="sticky top-0 z-20 flex h-[68px] shrink-0 items-center gap-3 border-b border-border/80 bg-background/95 px-4 backdrop-blur-sm md:px-7">
      <SidebarTrigger className="-ml-1" />
      <div className="min-w-0 flex-1">
        <p className="hidden text-[11px] leading-none text-muted-foreground sm:block">
          ShelfLife <span className="px-1.5 text-border">/</span> {currentPage.eyebrow}
        </p>
        <h1 className="mt-0 truncate text-sm font-semibold leading-tight text-foreground sm:mt-1.5">
          {currentPage.label}
        </h1>
      </div>

      <label className="relative hidden w-full max-w-[250px] md:block">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search books and members"
          placeholder="Search books, members..."
          className="h-9 border-transparent bg-muted/70 pl-9 text-xs shadow-none placeholder:text-muted-foreground/80 focus-visible:border-border focus-visible:bg-background"
        />
      </label>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 md:hidden"
        aria-label="Search books and members"
        title="Search"
      >
        <Search />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="relative size-9"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell />
        <span className="absolute top-[7px] right-[7px] size-1.5 rounded-full bg-emerald-600 ring-2 ring-background" />
      </Button>
      <span className="mx-0.5 hidden h-7 w-px bg-border sm:block" aria-hidden="true" />
      <UserMenu />
    </header>
  )
}