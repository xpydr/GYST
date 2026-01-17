"use client";

import dynamic from 'next/dynamic';
import { useState, useCallback, useRef } from 'react';
import type { EventInput, DateSelectArg, EventChangeArg, EventClickArg } from '@fullcalendar/core';

// Dynamic import with parallel plugin loading for better code splitting
const FullCalendar = dynamic(
  () =>
    Promise.all([
      import('@fullcalendar/react'),
      import('@fullcalendar/daygrid'),
      import('@fullcalendar/interaction'),
      import('@fullcalendar/timegrid'),
    ]).then(([FullCalendarMod, dayGrid, interaction, timeGrid]) => {
      return (props: any) => (
        <FullCalendarMod.default
          plugins={[dayGrid.default, interaction.default, timeGrid.default]}
          {...props}
        />
      );
    }),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Loading calendar...
      </div>
    ),
  }
);

const initialEvents: EventInput[] = [
  { id: '1', title: 'Sample Event', start: new Date(), resourceId: 'a' },
  { id: '2', title: 'Another Event', start: '2026-01-17T18:30:00Z', resourceId: 'b' },
  { id: '3', title: 'All Day Event', start: '2026-01-16', resourceId: 'c' },
];

export default function Calendar() {
  const [events, setEvents] = useState<EventInput[]>(initialEvents);
  const calendarRef = useRef<any>(null);

  const handleSelect = useCallback((selectInfo: DateSelectArg) => {
    const title = prompt('Please enter a title for the event:');
    if (!title) return;

    const newEvent: EventInput = {
      id: `event-${Date.now()}${Math.random().toString(36).slice(2, 10)}`,
      title,
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      allDay: selectInfo.allDay,
    };

    setEvents((prev) => [...prev, newEvent]);
    selectInfo.view.calendar.unselect();
  }, []);

  const handleEventChange = useCallback((changeInfo: EventChangeArg) => {
    const { id, start, end, allDay } = changeInfo.event;
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, start: start?.toISOString(), end: end?.toISOString(), allDay }
          : e
      )
    );
  }, []);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    if (!confirm(`Delete '${clickInfo.event.title}'?`)) return;

    setEvents((prev) => prev.filter((e) => e.id !== clickInfo.event.id));
    clickInfo.event.remove();
  }, []);

  function renderEventContent(eventInfo: { timeText?: string; event: any }) {
    return (
      <>
        <b>{eventInfo.timeText}</b>
        <i>{eventInfo.event.title}</i>
      </>
    );
  }

  return (
    <FullCalendar
      ref={calendarRef}
      initialView="timeGridDay"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridDay,timeGridWeek,dayGridMonth',
      }}
      height="auto"
      aspectRatio={1.8}
      nowIndicator
      editable
      selectable
      selectMirror
      events={events}
      select={handleSelect}
      eventChange={handleEventChange}
      eventClick={handleEventClick}
      eventContent={renderEventContent}
      timeZone="America/Toronto"
    />
  );
}