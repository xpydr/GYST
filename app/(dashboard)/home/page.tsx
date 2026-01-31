"use client";

import dynamic from "next/dynamic";
import { useDashboardEvents } from "@/lib/dashboard-event-context";

const Calendar = dynamic(() => import("@/components/full-calendar"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 text-muted-foreground">
      Loading calendar...
    </div>
  ),
});

export default function HomePage() {
  const { allEvents, onEventsChange, onUserIdChange } = useDashboardEvents();

  return (
    <div className="mx-auto w-full max-w-5xl rounded-xl p-4">
      <Calendar
        allEvents={allEvents}
        onEventsChange={onEventsChange}
        onUserIdChange={onUserIdChange}
      />
    </div>
  );
}
