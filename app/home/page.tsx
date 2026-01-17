import { SidebarLeft } from "@/components/sidebar-left"
import { SidebarRight } from "@/components/sidebar-right"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Suspense } from "react"

export default function Dashboard() {
  return (
    <Suspense>
      <SidebarProvider>
        <SidebarLeft />
        <SidebarInset>
          <header className="bg-background sticky top-0 flex h-14 shrink-0 items-center gap-2">
            <div className="flex flex-1 items-center gap-2 px-3">
              <SidebarTrigger />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="line-clamp-1">
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="bg-muted/50 mx-auto h-24 w-full max-w-3xl rounded-xl p-4">
              {/* TODO: Implement heatmap system here */}
            </div>
            <div className="bg-muted/50 mx-auto h-screen w-full max-w-3xl rounded-xl p-4">
              {/* TODO: Implement day view with time blocks here */}
            </div>
          </div>
        </SidebarInset>
        <SidebarRight />
      </SidebarProvider>
    </Suspense>
  )
}
