"use client";

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useEffect, useRef, useState } from 'react';
import type { EventInput, EventApi, DateSelectArg, EventChangeArg, EventClickArg } from '@fullcalendar/core';

// In-memory event storage
let eventStorage: EventInput[] = [
  { id: '1', title: 'Sample Event', start: new Date(), resourceId: 'a' },
  { id: '2', title: 'Another Event', start: '2026-01-17T18:30:00Z', resourceId: 'b' },
  { id: '3', title: 'All Day Event', start: '2026-01-16', resourceId: 'c' },
];

// Helper function to get events from storage
function getEvents(): EventInput[] {
  return eventStorage;
}

// Helper function to add event to storage
function addEvent(event: EventInput): void {
  const newEvent = {
    ...event,
    id: event.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  eventStorage.push(newEvent);
}

// Helper function to update event in storage
function updateEvent(eventId: string, updates: Partial<EventInput>): void {
  const index = eventStorage.findIndex(e => e.id === eventId);
  if (index !== -1) {
    eventStorage[index] = { ...eventStorage[index], ...updates };
  }
}

// Helper function to remove event from storage
function removeEvent(eventId: string): void {
  eventStorage = eventStorage.filter(e => e.id !== eventId);
}

export default function Calendar() {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<EventInput[]>([]);

  // Load events on component mount
  useEffect(() => {
    const loadedEvents = getEvents();
    setEvents(loadedEvents);
  }, []);

  // Handle date/time selection to create new events
  const handleSelect = (selectInfo: DateSelectArg) => {
    const title = prompt('Please enter a title for the event:');
    if (title) {
      const calendarApi = selectInfo.view.calendar;
      calendarApi.unselect(); // Clear date selection

      const newEvent: EventInput = {
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay,
      };

      // Add to storage
      addEvent(newEvent);
      
      // Update state
      setEvents([...eventStorage]);
      
      // Add to calendar
      calendarApi.addEvent(newEvent);
    }
  };

  // Handle event changes (drag, resize)
  const handleEventChange = (changeInfo: EventChangeArg) => {
    const event = changeInfo.event;
    updateEvent(event.id!, {
      start: event.start?.toISOString(),
      end: event.end?.toISOString(),
      allDay: event.allDay,
    });
    setEvents([...eventStorage]);
  };

  // Handle event click (for deletion or editing)
  const handleEventClick = (clickInfo: EventClickArg) => {
    if (confirm(`Are you sure you want to delete the event '${clickInfo.event.title}'?`)) {
      removeEvent(clickInfo.event.id!);
      setEvents([...eventStorage]);
      clickInfo.event.remove();
    }
  };

  return (
    <>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin]}
        select={handleSelect}
        eventChange={handleEventChange}
        eventClick={handleEventClick}
        initialView="timeGridDay"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'timeGridDay,timeGridWeek,dayGridMonth'
        }}
        height={1000}
        nowIndicator
        eventContent={renderEventContent}
        editable={true}
        eventStartEditable={true}
        eventDurationEditable={true}
        selectable={true}
        selectMirror={true}
        events={events}
        timeZone='EST'
      />
    </>
  )
}

function renderEventContent(eventInfo: { timeText?: string; event: EventApi }) {
  return (
    <>
      <b>{eventInfo.timeText}</b>
      <i>{eventInfo.event.title}</i>
    </>
  );
}