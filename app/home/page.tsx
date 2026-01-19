"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import type { EventInput } from '@fullcalendar/core';

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

// Dynamic import – client-only, code-split
const Calendar = dynamic(() => import("@/components/full-calendar"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 text-muted-foreground">
      Loading calendar...
    </div>
  ),
});

export default function Dashboard() {
  const [allEvents, setAllEvents] = useState<EventInput[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const handleEventsChange = useCallback((events: EventInput[]) => {
    setAllEvents(events);
  }, []);

  return (
    <Suspense fallback={null}>
      <SidebarProvider>
        <SidebarLeft 
          allEvents={allEvents}
          onEventsChange={handleEventsChange}
          userId={userId}
          onUserIdChange={setUserId}
        />
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
                      {': )'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 bg-background">
            <div className="mx-auto w-full max-w-5xl rounded-xl p-4">
              <Calendar 
                allEvents={allEvents}
                onEventsChange={handleEventsChange}
                onUserIdChange={setUserId}
              />
            </div>
          </div>
        </SidebarInset>
        <SidebarRight />
      </SidebarProvider>
      <footer className="w-full flex items-center justify-center border-t border-cyan-500/20 mx-auto text-center text-xs gap-8 py-16 bg-background/50">
        <ThemeSwitcher />
      </footer>
    </Suspense>
  );
}