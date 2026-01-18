"use client";

import dynamic from 'next/dynamic';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { EventInput, DateSelectArg, EventChangeArg, EventClickArg } from '@fullcalendar/core';
import { createClient } from "@/lib/supabase/client";

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

// Database event type
type DatabaseEvent = {
  id: number;
  user_id: string;
  info: {
    start: number;
    end: number;
    title: string;
    desc: string;
    color: string;
    allday: boolean;
  };
  created_at: string;
  updated_at: string;
};

// Transform database event to FullCalendar EventInput
function dbEventToEventInput(dbEvent: DatabaseEvent): EventInput {
  return {
    id: dbEvent.id.toString(),
    title: dbEvent.info.title,
    start: new Date(dbEvent.info.start),
    end: dbEvent.info.end ? new Date(dbEvent.info.end) : undefined,
    allDay: dbEvent.info.allday,
    color: dbEvent.info.color || undefined,
    extendedProps: {
      desc: dbEvent.info.desc,
    },
  };
}

// Transform FullCalendar EventInput to database format
function eventInputToDbInfo(event: EventInput, userId: string) {
  const startDate = event.start instanceof Date ? event.start : new Date(event.start as string);
  const endDate = event.end ? (event.end instanceof Date ? event.end : new Date(event.end as string)) : null;
  
  return {
    user_id: userId,
    info: {
      start: startDate.getTime(),
      end: endDate ? endDate.getTime() : startDate.getTime(),
      title: event.title || '',
      desc: (event.extendedProps?.desc as string) || '',
      color: (event.color as string) || '',
      allday: event.allDay || false,
    },
  };
}

export default function Calendar() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef<any>(null);

  // Load events from database
  const loadEvents = useCallback(async () => {
    const supabase = createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    
    setUserId(user.id);

    // Load events for current user
    const { data: dbEvents, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading events:', error);
      setLoading(false);
      return;
    }

    // Transform database events to FullCalendar format
    const calendarEvents: EventInput[] = (dbEvents || []).map(dbEventToEventInput);
    setEvents(calendarEvents);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleSelect = useCallback(async (selectInfo: DateSelectArg) => {
    if (!userId) return;

    const title = prompt('Please enter a title for the event:');
    if (!title) {
      selectInfo.view.calendar.unselect();
      return;
    }

    const supabase = createClient();
    
    // Create event in database
    const newEvent: EventInput = {
      title,
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      allDay: selectInfo.allDay,
    };

    const dbData = eventInputToDbInfo(newEvent, userId);
    
    const { data: insertedEvent, error } = await supabase
      .from('events')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
      selectInfo.view.calendar.unselect();
      return;
    }

    // Add to local state
    const calendarEvent = dbEventToEventInput(insertedEvent);
    setEvents((prev) => [...prev, calendarEvent]);
    selectInfo.view.calendar.unselect();
  }, [userId]);

  const handleEventChange = useCallback(async (changeInfo: EventChangeArg) => {
    if (!userId) return;

    const { event } = changeInfo;
    const eventId = parseInt(event.id as string);
    
    if (isNaN(eventId)) {
      console.error('Invalid event ID:', event.id);
      return;
    }

    const supabase = createClient();
    
    // Update event in database
    const updatedEvent: EventInput = {
      id: event.id,
      title: event.title,
      start: event.start?.toISOString(),
      end: event.end?.toISOString(),
      allDay: event.allDay,
      color: event.backgroundColor,
      extendedProps: event.extendedProps,
    };

    const startDate = updatedEvent.start instanceof Date 
      ? updatedEvent.start 
      : new Date(updatedEvent.start as string);
    const endDate = updatedEvent.end 
      ? (updatedEvent.end instanceof Date ? updatedEvent.end : new Date(updatedEvent.end as string))
      : startDate;
    
    const { error } = await supabase
      .from('events')
      .update({
        info: {
          start: startDate.getTime(),
          end: endDate.getTime(),
          title: updatedEvent.title || '',
          desc: (updatedEvent.extendedProps?.desc as string) || '',
          color: (updatedEvent.color as string) || '',
          allday: updatedEvent.allDay || false,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event. Please try again.');
      // Revert the change by reloading events
      loadEvents();
      return;
    }

    // Update local state
    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? {
              ...e,
              start: event.start?.toISOString(),
              end: event.end?.toISOString(),
              allDay: event.allDay,
            }
          : e
      )
    );
  }, [userId, loadEvents]);

  const handleEventClick = useCallback(async (clickInfo: EventClickArg) => {
    if (!userId) return;

    if (!confirm(`Delete '${clickInfo.event.title}'?`)) return;

    const eventId = parseInt(clickInfo.event.id as string);
    
    if (isNaN(eventId)) {
      console.error('Invalid event ID:', clickInfo.event.id);
      return;
    }

    const supabase = createClient();
    
    // Delete event from database
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
      return;
    }

    // Remove from local state
    setEvents((prev) => prev.filter((e) => e.id !== clickInfo.event.id));
    clickInfo.event.remove();
  }, [userId]);

  function renderEventContent(eventInfo: { timeText?: string; event: any }) {
    return (
      <>
        <b>{eventInfo.timeText}</b>
        <i>{eventInfo.event.title}</i>
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Loading calendar...
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Please sign in to view your calendar.
      </div>
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