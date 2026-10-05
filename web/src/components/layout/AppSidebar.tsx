import { NavLink, useLocation } from "react-router-dom"
import { BookOpen } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { navigationItems } from "@/components/layout/navigation"
import { UserMenu } from "@/components/layout/UserMenu"

export function AppSidebar() {
  const location = useLocation()
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="offcanvas" variant="inset" className="border-sidebar-border bg-sidebar">
      <SidebarHeader className="px-5 pb-5 pt-6">
        <NavLink to="/" className="flex items-center gap-3" onClick={() => setOpenMobile(false)}>
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <BookOpen className="size-[18px]" strokeWidth={2.2} />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold leading-tight text-foreground">ShelfLife</span>
            <span className="mt-1 block text-[11px] leading-tight text-muted-foreground">Library workspace</span>
          </span>
        </NavLink>
      </SidebarHeader>

      <SidebarSeparator className="mx-4 w-auto" />

      <SidebarContent className="px-3 py-4">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navigationItems.map(({ to, label, icon: Icon }) => {
                const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to)

                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={
                        <NavLink
                          to={to}
                          end={to === "/"}
                          onClick={() => setOpenMobile(false)}
                        />
                      }
                      onClick={() => setOpenMobile(false)}
                      className="h-10 px-3 text-[13px] data-[active=true]:bg-primary/10 data-[active=true]:font-semibold data-[active=true]:text-primary"
                    >
                      <Icon strokeWidth={1.8} />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4">
        <SidebarSeparator className="mb-3" />
        <UserMenu expanded />
      </SidebarFooter>
    </Sidebar>
  )
}