"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { Calendars } from "@/components/calendars"
import { DatePicker } from "@/components/date-picker"
import { NavUser } from "@/components/nav-user"
import { createClient } from "@/lib/supabase/client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  calendars: [
    {
      name: "My Calendars",
      items: ["Personal", "Work", "Family"],
    },
    {
      name: "Favorites",
      items: ["Holidays", "Birthdays"],
    },
    {
      name: "Other",
      items: ["Travel", "Reminders", "Deadlines"],
    },
  ],
}

export function SidebarRight({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const [userEmail, setUserEmail] = React.useState<string>("")
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchUserEmail() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user?.email) {
        setUserEmail(user.email)
      }
      setIsLoading(false)
    }

    fetchUserEmail()
  }, [])

  // Get display name from email (use part before @)
  const getDisplayName = (email: string) => {
    if (!email) return "User"
    return email.split("@")[0]
  }

  const user = userEmail ? {
    name: getDisplayName(userEmail),
    email: userEmail,
    avatar: "", // No avatar URL for now
  } : null

  return (
    <Sidebar
      collapsible="none"
      className="sticky top-0 hidden h-svh border-l lg:flex"
      {...props}
    >
      <SidebarHeader className="border-sidebar-border h-16 border-b">
        {!isLoading && user && <NavUser user={user} />}
      </SidebarHeader>
      <SidebarContent>
        <DatePicker />
        <SidebarSeparator className="mx-0" />
        <Calendars calendars={data.calendars} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Plus />
              <span>New Calendar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
