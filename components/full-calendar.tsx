"use client";

import dynamic from 'next/dynamic';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { EventInput, DateSelectArg, EventChangeArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import type { EventReceiveArg } from '@fullcalendar/interaction';
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
    toDo?: boolean;
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
      toDo: dbEvent.info.toDo || false,
    },
  };
}

// Transform FullCalendar EventInput to database format
function eventInputToDbInfo(event: EventInput, userId: string, toDo: boolean = false) {
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
      toDo: toDo,
    },
  };
}

type CalendarProps = {
  allEvents?: EventInput[];
  onEventsChange?: (events: EventInput[]) => void;
  onEventClick?: (event: EventInput) => void;
  onUserIdChange?: (userId: string | null) => void;
};

export default function Calendar({ allEvents, onEventsChange, onEventClick, onUserIdChange }: CalendarProps = {}) {
  const [events, setEvents] = useState<EventInput[]>(allEvents || []);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef<any>(null);
  const dragStateRef = useRef<{ isDragging: boolean; mouseX: number; mouseY: number; eventData?: any } | null>(null);
  
  // Sync with external events if provided
  useEffect(() => {
    if (allEvents) {
      setEvents(allEvents);
    }
  }, [allEvents]);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [pendingSelectInfo, setPendingSelectInfo] = useState<DateSelectArg | null>(null);
  const [pendingClickInfo, setPendingClickInfo] = useState<EventClickArg | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Edit dialog form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('#00ffff');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  // Load events from database
  const loadEvents = useCallback(async () => {
    const supabase = createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      onUserIdChange?.(null);
      return;
    }
    
    setUserId(user.id);
    onUserIdChange?.(user.id);

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
    const loadedEvents: EventInput[] = (dbEvents || []).map(dbEventToEventInput);
    setEvents(loadedEvents);
    onEventsChange?.(loadedEvents);
    setLoading(false);
  }, [onEventsChange]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Track drag state and highlight todo dropzone
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragStateRef.current?.isDragging) {
        dragStateRef.current.mouseX = e.clientX;
        dragStateRef.current.mouseY = e.clientY;
        
        // Check if over todo dropzone and add visual feedback
        const todoDropZone = document.querySelector('.todo-drop-zone');
        if (todoDropZone) {
          const rect = todoDropZone.getBoundingClientRect();
          if (e.clientX >= rect.left && e.clientX <= rect.right &&
              e.clientY >= rect.top && e.clientY <= rect.bottom) {
            todoDropZone.classList.add('drag-over');
          } else {
            todoDropZone.classList.remove('drag-over');
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (dragStateRef.current) {
        dragStateRef.current.isDragging = false;
      }
      // Remove drag-over class when drag ends
      const todoDropZone = document.querySelector('.todo-drop-zone');
      if (todoDropZone) {
        todoDropZone.classList.remove('drag-over');
      }
      // Clear window storage after a delay (to allow drop handler to process)
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          delete (window as any).__calendarDragEvent;
        }
      }, 100);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Handle event drop - check if dropped on todo list
  const handleEventDrop = useCallback(async (dropInfo: EventDropArg) => {
    if (!userId) return;

    const { event } = dropInfo;
    const eventId = parseInt(event.id as string);
    
    if (isNaN(eventId)) {
      console.error('Invalid event ID:', event.id);
      return;
    }

    // Check if drop point is over the todo list area
    const jsEvent = (dropInfo as any).jsEvent;
    const dropX = jsEvent?.clientX || dragStateRef.current?.mouseX || 0;
    const dropY = jsEvent?.clientY || dragStateRef.current?.mouseY || 0;
    
    const todoDropZone = document.querySelector('.todo-drop-zone');
    if (todoDropZone && dropX && dropY) {
      const rect = todoDropZone.getBoundingClientRect();
      
      // Check if drop coordinates are within the todo zone bounds
      if (dropX >= rect.left && dropX <= rect.right &&
          dropY >= rect.top && dropY <= rect.bottom) {
        // Event was dropped on to-do list, update toDo flag
        const supabase = createClient();
        
        const startDate = event.start instanceof Date 
          ? event.start 
          : event.start ? new Date(event.start as string | number) : new Date();
        const endDate = event.end 
          ? (event.end instanceof Date ? event.end : new Date(event.end as string | number))
          : startDate;
        
        const { error } = await supabase
          .from('events')
          .update({
            info: {
              start: startDate.getTime(),
              end: endDate.getTime(),
              title: event.title || '',
              desc: (event.extendedProps?.desc as string) || '',
              color: (event.backgroundColor as string) || '',
              allday: event.allDay || false,
              toDo: true, // Move to to-do list
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', eventId)
          .eq('user_id', userId);

        if (error) {
          console.error('Error moving event to to-do:', error);
          setErrorMessage('Failed to move event to to-do list. Please try again.');
          setErrorDialogOpen(true);
          dropInfo.revert();
          loadEvents();
          return;
        }

        // Update local state
        const updatedEvents = events.map((e) =>
          e.id === event.id
            ? {
                ...e,
                extendedProps: {
                  ...e.extendedProps,
                  toDo: true,
                },
              }
            : e
        );
        setEvents(updatedEvents);
        onEventsChange?.(updatedEvents);
        
        // Remove from calendar view
        event.remove();
        dragStateRef.current = null;
        
        // Remove drag-over class
        todoDropZone.classList.remove('drag-over');
        return;
      }
    }

    // Normal calendar drop - let eventChange handle it
  }, [userId, events, onEventsChange, loadEvents]);

  // Handle event drag stop - check if dropped outside calendar on todo list
  const handleEventDragStop = useCallback(async (dragInfo: any) => {
    if (!userId) return;

    const { event, jsEvent } = dragInfo;
    if (!event) return;

    const eventId = parseInt(event.id as string);
    if (isNaN(eventId)) return;

    // Check if drop point is over the todo list area
    const dropX = jsEvent?.clientX || dragStateRef.current?.mouseX || 0;
    const dropY = jsEvent?.clientY || dragStateRef.current?.mouseY || 0;
    
    const todoDropZone = document.querySelector('.todo-drop-zone');
    if (todoDropZone && dropX && dropY) {
      const rect = todoDropZone.getBoundingClientRect();
      
      // Check if drop coordinates are within the todo zone bounds
      if (dropX >= rect.left && dropX <= rect.right &&
          dropY >= rect.top && dropY <= rect.bottom) {
        // Event was dropped on to-do list, update toDo flag
        const supabase = createClient();
        
        const startDate = event.start instanceof Date 
          ? event.start 
          : event.start ? new Date(event.start as string | number) : new Date();
        const endDate = event.end 
          ? (event.end instanceof Date ? event.end : new Date(event.end as string | number))
          : startDate;
        
        const { error } = await supabase
          .from('events')
          .update({
            info: {
              start: startDate.getTime(),
              end: endDate.getTime(),
              title: event.title || '',
              desc: (event.extendedProps?.desc as string) || '',
              color: (event.backgroundColor as string) || '',
              allday: event.allDay || false,
              toDo: true, // Move to to-do list
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', eventId)
          .eq('user_id', userId);

        if (error) {
          console.error('Error moving event to to-do:', error);
          setErrorMessage('Failed to move event to to-do list. Please try again.');
          setErrorDialogOpen(true);
          loadEvents();
          return;
        }

        // Update local state
        const updatedEvents = events.map((e) =>
          e.id === event.id
            ? {
                ...e,
                extendedProps: {
                  ...e.extendedProps,
                  toDo: true,
                },
              }
            : e
        );
        setEvents(updatedEvents);
        onEventsChange?.(updatedEvents);
        
        // Remove from calendar view
        event.remove();
        dragStateRef.current = null;
        
        // Remove drag-over class
        todoDropZone.classList.remove('drag-over');
        
        // Clear window storage
        if (typeof window !== 'undefined') {
          delete (window as any).__calendarDragEvent;
        }
      }
    }
    
    // Clear drag state
    dragStateRef.current = null;
    if (typeof window !== 'undefined') {
      delete (window as any).__calendarDragEvent;
    }
  }, [userId, events, onEventsChange, loadEvents]);

  const handleSelect = useCallback((selectInfo: DateSelectArg) => {
    if (!userId) return;
    setPendingSelectInfo(selectInfo);
    setEventTitle('');
    setCreateDialogOpen(true);
  }, [userId]);

  const handleCreateEvent = useCallback(async () => {
    if (!userId || !pendingSelectInfo || !eventTitle.trim()) {
      if (pendingSelectInfo) {
        pendingSelectInfo.view.calendar.unselect();
      }
      setCreateDialogOpen(false);
      return;
    }

    const supabase = createClient();
    
    // Create event in database
    const newEvent: EventInput = {
      title: eventTitle.trim(),
      start: pendingSelectInfo.startStr,
      end: pendingSelectInfo.endStr,
      allDay: pendingSelectInfo.allDay,
    };

    const dbData = eventInputToDbInfo(newEvent, userId, false);
    
    const { data: insertedEvent, error } = await supabase
      .from('events')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      setErrorMessage('Failed to create event. Please try again.');
      setErrorDialogOpen(true);
      pendingSelectInfo.view.calendar.unselect();
      setCreateDialogOpen(false);
      return;
    }

    // Add to local state
    const calendarEvent = dbEventToEventInput(insertedEvent);
    const newEvents = [...events, calendarEvent];
    setEvents(newEvents);
    onEventsChange?.(newEvents);
    pendingSelectInfo.view.calendar.unselect();
    setCreateDialogOpen(false);
    setEventTitle('');
    setPendingSelectInfo(null);
  }, [userId, pendingSelectInfo, eventTitle, events, onEventsChange]);

  const handleEventChange = useCallback(async (changeInfo: EventChangeArg) => {
    if (!userId) return;

    const { event } = changeInfo;
    const eventId = parseInt(event.id as string);
    
    if (isNaN(eventId)) {
      console.error('Invalid event ID:', event.id);
      return;
    }

    // Normal calendar drag/resize (within calendar view)
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
    
    // Preserve toDo flag from extendedProps
    const currentToDo = (updatedEvent.extendedProps?.toDo as boolean) || false;
    
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
          toDo: currentToDo,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating event:', error);
      setErrorMessage('Failed to update event. Please try again.');
      setErrorDialogOpen(true);
      // Revert the change by reloading events
      loadEvents();
      return;
    }

    // Update local state
    const updatedEvents = events.map((e) =>
      e.id === event.id
        ? {
            ...e,
            start: event.start?.toISOString(),
            end: event.end?.toISOString(),
            allDay: event.allDay,
          }
        : e
    );
    setEvents(updatedEvents);
    onEventsChange?.(updatedEvents);
  }, [userId, loadEvents, events, onEventsChange]);

  const handleEventReceive = useCallback(async (receiveInfo: EventReceiveArg) => {
    if (!userId) return;
    
    const { event } = receiveInfo;
    const eventId = parseInt(event.id as string);
    
    if (isNaN(eventId)) {
      console.error('Invalid event ID:', event.id);
      return;
    }

    const supabase = createClient();
    
    // Update event to set toDo: false (moving from to-do list to calendar)
    const { error } = await supabase
      .from('events')
      .update({
        info: {
          start: event.start ? event.start.getTime() : Date.now(),
          end: event.end ? event.end.getTime() : event.start ? event.start.getTime() : Date.now(),
          title: event.title || '',
          desc: (event.extendedProps?.desc as string) || '',
          color: (event.backgroundColor as string) || '',
          allday: event.allDay || false,
          toDo: false,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating event:', error);
      setErrorMessage('Failed to move event to calendar. Please try again.');
      setErrorDialogOpen(true);
      event.remove();
      return;
    }

    // Update local state
    const updatedEvents = events.map((e) =>
      e.id === event.id
        ? {
            ...e,
            extendedProps: {
              ...e.extendedProps,
              toDo: false,
            },
          }
        : e
    );
    setEvents(updatedEvents);
    onEventsChange?.(updatedEvents);
  }, [userId, events, onEventsChange]);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    if (!userId) return;
    
    // If onEventClick prop is provided, use it (for shared dialog)
    if (onEventClick) {
      const event = events.find(e => e.id === clickInfo.event.id);
      if (event) {
        onEventClick(event);
        return;
      }
    }
    
    setPendingClickInfo(clickInfo);
    
    // Populate edit form with event data
    const event = clickInfo.event;
    setEditTitle(event.title || '');
    setEditDescription((event.extendedProps?.desc as string) || '');
    setEditColor(event.backgroundColor || event.borderColor || '#00ffff');
    
    // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDateTimeLocal = (date: Date | null | undefined) => {
      if (!date) return '';
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    setEditStartTime(formatDateTimeLocal(event.start));
    setEditEndTime(formatDateTimeLocal(event.end || event.start));
    
    setEditDialogOpen(true);
  }, [userId]);

  const handleSaveEvent = useCallback(async () => {
    if (!userId || !pendingClickInfo || !editTitle.trim()) {
      return;
    }

    const eventId = parseInt(pendingClickInfo.event.id as string);
    
    if (isNaN(eventId)) {
      console.error('Invalid event ID:', pendingClickInfo.event.id);
      setEditDialogOpen(false);
      setPendingClickInfo(null);
      return;
    }

    const supabase = createClient();
    
    // Parse datetime-local strings to Date objects
    const startDate = new Date(editStartTime);
    const endDate = new Date(editEndTime);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setErrorMessage('Invalid date/time values. Please check your inputs.');
      setErrorDialogOpen(true);
      return;
    }
    
    // Preserve toDo flag from the event
    const currentToDo = (pendingClickInfo.event.extendedProps?.toDo as boolean) || false;
    
    // Update event in database
    const { error } = await supabase
      .from('events')
      .update({
        info: {
          start: startDate.getTime(),
          end: endDate.getTime(),
          title: editTitle.trim(),
          desc: editDescription.trim(),
          color: editColor,
          allday: false, // We're using datetime inputs, so not all-day
          toDo: currentToDo,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating event:', error);
      setErrorMessage('Failed to update event. Please try again.');
      setErrorDialogOpen(true);
      return;
    }

    // Update local state
    const updatedEvents = events.map((e) =>
      e.id === pendingClickInfo.event.id
        ? {
            ...e,
            title: editTitle.trim(),
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            color: editColor,
            extendedProps: {
              ...e.extendedProps,
              desc: editDescription.trim(),
            },
          }
        : e
    );
    setEvents(updatedEvents);
    onEventsChange?.(updatedEvents);
    
    // Update the calendar event
    pendingClickInfo.event.setProp('title', editTitle.trim());
    pendingClickInfo.event.setStart(startDate);
    pendingClickInfo.event.setEnd(endDate);
    pendingClickInfo.event.setProp('backgroundColor', editColor);
    pendingClickInfo.event.setExtendedProp('desc', editDescription.trim());
    
    setEditDialogOpen(false);
    setPendingClickInfo(null);
    // Reset form
    setEditTitle('');
    setEditDescription('');
    setEditColor('#00ffff');
    setEditStartTime('');
    setEditEndTime('');
  }, [userId, pendingClickInfo, editTitle, editDescription, editColor, editStartTime, editEndTime]);

  const handleDeleteEvent = useCallback(async () => {
    if (!userId || !pendingClickInfo) {
      setEditDialogOpen(false);
      return;
    }

    const eventId = parseInt(pendingClickInfo.event.id as string);
    
    if (isNaN(eventId)) {
      console.error('Invalid event ID:', pendingClickInfo.event.id);
      setEditDialogOpen(false);
      setPendingClickInfo(null);
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
      setErrorMessage('Failed to delete event. Please try again.');
      setErrorDialogOpen(true);
      return;
    }

    // Remove from local state
    const updatedEvents = events.filter((e) => e.id !== pendingClickInfo.event.id);
    setEvents(updatedEvents);
    onEventsChange?.(updatedEvents);
    pendingClickInfo.event.remove();
    setEditDialogOpen(false);
    setPendingClickInfo(null);
    // Reset form
    setEditTitle('');
    setEditDescription('');
    setEditColor('#00ffff');
    setEditStartTime('');
    setEditEndTime('');
  }, [userId, pendingClickInfo, events, onEventsChange]);

  function renderEventContent(eventInfo: { timeText?: string; event: any; view: any }) {
    const description = eventInfo.event.extendedProps?.desc;
    const isTimeGridDayView = eventInfo.view?.type === 'timeGridDay';
    return (
      <>
        <b>{eventInfo.timeText}</b>
        <i>{eventInfo.event.title}</i>
        {description && isTimeGridDayView && (
          <div style={{ fontSize: '0.85em', marginTop: '2px', opacity: 0.9 }}>
            {description}
          </div>
        )}
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

  // Filter events to only show calendar events (not to-do items)
  const calendarEvents = events.filter(e => !e.extendedProps?.toDo);

  return (
    <div className="calendar-wrapper">
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
        droppable={true}
        events={calendarEvents}
        select={handleSelect}
        eventChange={handleEventChange}
        eventDrop={handleEventDrop}
        eventClick={handleEventClick}
        eventReceive={handleEventReceive}
        eventDragStart={(dragInfo: any) => {
          const event = dragInfo.event;
          const eventData = {
            id: event.id,
            title: event.title || '',
            start: event.start ? event.start.toISOString() : '',
            end: event.end ? event.end.toISOString() : '',
            allDay: event.allDay || false,
            color: event.backgroundColor || event.borderColor || '',
            desc: (event.extendedProps?.desc as string) || '',
            toDo: (event.extendedProps?.toDo as boolean) || false,
          };
          
          dragStateRef.current = { 
            isDragging: true, 
            mouseX: dragInfo.jsEvent?.clientX || 0, 
            mouseY: dragInfo.jsEvent?.clientY || 0,
            eventData: eventData
          };
          
          // Store in window for cross-component access
          if (typeof window !== 'undefined') {
            (window as any).__calendarDragEvent = eventData;
          }
          
          // Set up HTML5 drag data transfer for external drops (if available)
          if (dragInfo.jsEvent && dragInfo.jsEvent.dataTransfer) {
            dragInfo.jsEvent.dataTransfer.setData('application/json', JSON.stringify(eventData));
            dragInfo.jsEvent.dataTransfer.effectAllowed = 'move';
          }
        }}
        eventDragStop={handleEventDragStop}
        eventContent={renderEventContent}
        eventDefaultAllDay={false}
      />

      {/* Create Event Dialog */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open && pendingSelectInfo) {
            pendingSelectInfo.view.calendar.unselect();
            setEventTitle('');
            setPendingSelectInfo(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Please enter a title for the event.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder="Event title"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateEvent();
                }
              }}
              maxLength={50}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (pendingSelectInfo) {
                  pendingSelectInfo.view.calendar.unselect();
                }
                setCreateDialogOpen(false);
                setEventTitle('');
                setPendingSelectInfo(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={!eventTitle.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setPendingClickInfo(null);
            // Reset form
            setEditTitle('');
            setEditDescription('');
            setEditColor('#00ffff');
            setEditStartTime('');
            setEditEndTime('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update event details or delete the event.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                type="text"
                placeholder="Event title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                type="text"
                placeholder="Event description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-color"
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer"
                />
                <Input
                  type="text"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  placeholder="#00ffff"
                  className="flex-1"
                  maxLength={7}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-start">Start Time</Label>
              <Input
                id="edit-start"
                type="datetime-local"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end">End Time</Label>
              <Input
                id="edit-end"
                type="datetime-local"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setPendingClickInfo(null);
                // Reset form
                setEditTitle('');
                setEditDescription('');
                setEditColor('#00ffff');
                setEditStartTime('');
                setEditEndTime('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEvent}
            >
              Delete
            </Button>
            <Button
              onClick={handleSaveEvent}
              disabled={!editTitle.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setErrorDialogOpen(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}