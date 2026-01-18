"use client";

import dynamic from 'next/dynamic';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { EventInput, DateSelectArg, EventChangeArg, EventClickArg } from '@fullcalendar/core';
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
  const [editColor, setEditColor] = useState('#3788d8');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

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

    const dbData = eventInputToDbInfo(newEvent, userId);
    
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
    setEvents((prev) => [...prev, calendarEvent]);
    pendingSelectInfo.view.calendar.unselect();
    setCreateDialogOpen(false);
    setEventTitle('');
    setPendingSelectInfo(null);
  }, [userId, pendingSelectInfo, eventTitle]);

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
      setErrorMessage('Failed to update event. Please try again.');
      setErrorDialogOpen(true);
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

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    if (!userId) return;
    setPendingClickInfo(clickInfo);
    
    // Populate edit form with event data
    const event = clickInfo.event;
    setEditTitle(event.title || '');
    setEditDescription((event.extendedProps?.desc as string) || '');
    setEditColor(event.backgroundColor || event.borderColor || '#3788d8');
    
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
    setEvents((prev) =>
      prev.map((e) =>
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
      )
    );
    
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
    setEditColor('#3788d8');
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
    setEvents((prev) => prev.filter((e) => e.id !== pendingClickInfo.event.id));
    pendingClickInfo.event.remove();
    setEditDialogOpen(false);
    setPendingClickInfo(null);
    // Reset form
    setEditTitle('');
    setEditDescription('');
    setEditColor('#3788d8');
    setEditStartTime('');
    setEditEndTime('');
  }, [userId, pendingClickInfo]);

  function renderEventContent(eventInfo: { timeText?: string; event: any }) {
    const description = eventInfo.event.extendedProps?.desc;
    return (
      <>
        <b>{eventInfo.timeText}</b>
        <i>{eventInfo.event.title}</i>
        {description && (
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

  return (
    <>
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
            setEditColor('#3788d8');
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
                  placeholder="#3788d8"
                  className="flex-1"
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
                setEditColor('#3788d8');
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
    </>
  );
}