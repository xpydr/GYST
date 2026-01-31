"use client";

import * as React from "react";
import type { EventInput } from "@fullcalendar/core";

type DashboardEventContextValue = {
  allEvents: EventInput[];
  onEventsChange: (events: EventInput[]) => void;
  userId: string | null;
  onUserIdChange: (userId: string | null) => void;
};

const DashboardEventContext = React.createContext<
  DashboardEventContextValue | undefined
>(undefined);

export function DashboardEventProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [allEvents, setAllEvents] = React.useState<EventInput[]>([]);
  const [userId, setUserId] = React.useState<string | null>(null);

  const onEventsChange = React.useCallback((events: EventInput[]) => {
    setAllEvents(events);
  }, []);

  const value: DashboardEventContextValue = React.useMemo(
    () => ({
      allEvents,
      onEventsChange,
      userId,
      onUserIdChange: setUserId,
    }),
    [allEvents, onEventsChange, userId]
  );

  return (
    <DashboardEventContext.Provider value={value}>
      {children}
    </DashboardEventContext.Provider>
  );
}

export function useDashboardEvents() {
  const context = React.useContext(DashboardEventContext);
  if (context === undefined) {
    throw new Error(
      "useDashboardEvents must be used within a DashboardEventProvider"
    );
  }
  return context;
}

export function useDashboardEventsOptional() {
  return React.useContext(DashboardEventContext);
}
