import {
  ArrowLeftRight,
  BookOpen,
  History,
  LayoutDashboard,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

export type NavigationItem = {
  to: string
  label: string
  description: string
  icon: LucideIcon
  eyebrow: string
}

export const navigationItems: NavigationItem[] = [
  {
    to: "/",
    label: "Dashboard",
    description: "Your library at a glance, all in one place.",
    icon: LayoutDashboard,
    eyebrow: "Overview",
  },
  {
    to: "/books",
    label: "Books",
    description: "A clear home for your library collection.",
    icon: BookOpen,
    eyebrow: "Collection",
  },
  {
    to: "/members",
    label: "Members",
    description: "Keep your library community close at hand.",
    icon: UsersRound,
    eyebrow: "Community",
  },
  {
    to: "/borrowing",
    label: "Borrowing",
    description: "A simple workspace for books on loan.",
    icon: ArrowLeftRight,
    eyebrow: "Circulation",
  },
  {
    to: "/history",
    label: "History",
    description: "A record of the stories moving through your library.",
    icon: History,
    eyebrow: "Archive",
  },
]