import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

type UserMenuProps = {
  expanded?: boolean
}

export function UserMenu({ expanded = false }: UserMenuProps) {
  const { user, signOut } = useAuth()
  const initials = user?.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() ?? "LB"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            aria-label="Open profile menu"
            className={expanded ? "h-auto w-full justify-start gap-3 px-2 py-2" : "size-9 px-0"}
          />
        }
      >
        <Avatar className="size-8 rounded-md" aria-hidden="true">
          <AvatarFallback className="rounded-md bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        {expanded ? (
          <span className="grid min-w-0 flex-1 text-left">
            <span className="truncate text-sm font-medium">{user?.name ?? "Librarian"}</span>
            <span className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</span>
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <span className="block text-sm font-medium text-foreground">{user?.name ?? "Librarian"}</span>
            <span className="block text-xs text-muted-foreground">{user?.email ?? ""}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}