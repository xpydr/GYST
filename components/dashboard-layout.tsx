"use client";

import { Suspense } from "react";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { DashboardEventProvider, useDashboardEventsOptional } from "@/lib/dashboard-event-context";

function DashboardSidebarLeft() {
  const events = useDashboardEventsOptional();
  return (
    <SidebarLeft
      allEvents={events?.allEvents ?? []}
      onEventsChange={events?.onEventsChange}
      userId={events?.userId ?? null}
      onUserIdChange={events?.onUserIdChange}
    />
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DashboardEventProvider>
        <SidebarProvider>
          <DashboardSidebarLeft />
          <SidebarInset>
            <header className="bg-background sticky top-0 flex h-14 shrink-0 items-center gap-2 border-b border-cyan-500/20 backdrop-blur-sm bg-background/95">
              <div className="flex flex-1 items-center gap-2 px-3">
                <SidebarTrigger />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4 border-cyan-500/20"
                />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbPage className="line-clamp-1 neon-cyan font-bold">
                        {": )"}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4 bg-background">
              {children}
            </div>
          </SidebarInset>
          <SidebarRight />
        </SidebarProvider>
        <footer className="w-full flex items-center justify-center border-t border-cyan-500/20 mx-auto text-center text-xs gap-8 py-16 bg-background/50">
          <ThemeSwitcher />
        </footer>
      </DashboardEventProvider>
    </Suspense>
  );
}
