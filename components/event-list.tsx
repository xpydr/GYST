"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import type { EventInput } from '@fullcalendar/core';
import { Draggable } from '@fullcalendar/interaction';
import { Plus } from 'lucide-react';
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

type EventListProps = {
  events: EventInput[];
  onEventsChange?: (events: EventInput[]) => void;
  userId: string | null;
};

export default function EventList({ events, onEventsChange, userId }: EventListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const draggableRef = useRef<Draggable | null>(null);
  
  // Filter to only show to-do items
  const todoEvents = events.filter(e => e.extendedProps?.toDo === true);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventInput | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Create dialog form state
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createColor, setCreateColor] = useState('#00ffff');
  
  // Edit dialog form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('#00ffff');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  // Setup ExternalDraggable for to-do items
  useEffect(() => {
    if (!listRef.current || !userId) return;

    // Clean up previous draggable instance
    if (draggableRef.current) {
      draggableRef.current.destroy();
    }

    // Create new draggable instance
    draggableRef.current = new Draggable(listRef.current, {
      itemSelector: '.todo-item',
      eventData: (eventEl) => {
        const eventId = eventEl.dataset.eventId;
        const event = todoEvents.find(e => e.id === eventId);
        if (!event) return null;

        return {
          id: event.id as string,
          title: event.title || '',
          start: event.start instanceof Date ? event.start : new Date(event.start as string),
          end: event.end ? (event.end instanceof Date ? event.end : new Date(event.end as string)) : undefined,
          allDay: event.allDay,
          color: event.color as string,
          extendedProps: event.extendedProps,
        };
      },
    });

    return () => {
      if (draggableRef.current) {
        draggableRef.current.destroy();
        draggableRef.current = null;
      }
    };
  }, [todoEvents, userId]);

  const handleCreateTodo = useCallback(async () => {
    if (!userId || !createTitle.trim()) {
      return;
    }

    const supabase = createClient();
    
    // Create new todo item with current date/time
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    const { data: insertedEvent, error } = await supabase
      .from('events')
      .insert({
        user_id: userId,
        info: {
          start: now.getTime(),
          end: oneHourLater.getTime(),
          title: createTitle.trim(),
          desc: createDescription.trim(),
          color: createColor,
          allday: false,
          toDo: true, // Create as to-do item
        },
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating todo:', error);
      setErrorMessage('Failed to create to-do item. Please try again.');
      setErrorDialogOpen(true);
      return;
    }

    // Transform to EventInput format
    const newEvent: EventInput = {
      id: insertedEvent.id.toString(),
      title: insertedEvent.info.title,
      start: new Date(insertedEvent.info.start),
      end: new Date(insertedEvent.info.end),
      allDay: insertedEvent.info.allday,
      color: insertedEvent.info.color || undefined,
      extendedProps: {
        desc: insertedEvent.info.desc,
        toDo: true,
      },
    };

    // Update local state
    const updatedEvents = [...events, newEvent];
    onEventsChange?.(updatedEvents);
    
    setCreateDialogOpen(false);
    setCreateTitle('');
    setCreateDescription('');
    setCreateColor('#00ffff');
  }, [userId, createTitle, createDescription, createColor, events, onEventsChange]);

  const handleEventClick = useCallback((event: EventInput) => {
    if (!userId) return;
    
    setSelectedEvent(event);
    setEditTitle(event.title || '');
    setEditDescription((event.extendedProps?.desc as string) || '');
    setEditColor((event.color as string) || '#00ffff');
    
    // Format dates for datetime-local input
    const formatDateTimeLocal = (date: Date | string | null | undefined) => {
      if (!date) return '';
      const d = date instanceof Date ? date : new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    const startDate = event.start instanceof Date ? event.start : new Date(event.start as string);
    const endDate = event.end ? (event.end instanceof Date ? event.end : new Date(event.end as string)) : startDate;
    
    setEditStartTime(formatDateTimeLocal(startDate));
    setEditEndTime(formatDateTimeLocal(endDate));
    setEditDialogOpen(true);
  }, [userId]);

  const handleSaveEvent = useCallback(async () => {
    if (!userId || !selectedEvent || !editTitle.trim()) {
      return;
    }

    const eventId = typeof selectedEvent.id === 'string' ? parseInt(selectedEvent.id) : selectedEvent.id;
    
    if (isNaN(eventId as number)) {
      console.error('Invalid event ID:', selectedEvent.id);
      setEditDialogOpen(false);
      setSelectedEvent(null);
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
    
    // Update event in database (preserve toDo: true)
    const { error } = await supabase
      .from('events')
      .update({
        info: {
          start: startDate.getTime(),
          end: endDate.getTime(),
          title: editTitle.trim(),
          desc: editDescription.trim(),
          color: editColor,
          allday: false,
          toDo: true, // Keep as to-do item
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
      e.id === selectedEvent.id
        ? {
            ...e,
            title: editTitle.trim(),
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            color: editColor,
            extendedProps: {
              ...e.extendedProps,
              desc: editDescription.trim(),
              toDo: true,
            },
          }
        : e
    );
    onEventsChange?.(updatedEvents);
    
    setEditDialogOpen(false);
    setSelectedEvent(null);
    // Reset form
    setEditTitle('');
    setEditDescription('');
    setEditColor('#00ffff');
    setEditStartTime('');
    setEditEndTime('');
  }, [userId, selectedEvent, editTitle, editDescription, editColor, editStartTime, editEndTime, events, onEventsChange]);

  const handleDeleteEvent = useCallback(async () => {
    if (!userId || !selectedEvent) {
      setEditDialogOpen(false);
      return;
    }

    const eventId = typeof selectedEvent.id === 'string' ? parseInt(selectedEvent.id) : selectedEvent.id;
    
    if (isNaN(eventId as number)) {
      console.error('Invalid event ID:', selectedEvent.id);
      setEditDialogOpen(false);
      setSelectedEvent(null);
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
    const updatedEvents = events.filter((e) => e.id !== selectedEvent.id);
    onEventsChange?.(updatedEvents);
    
    setEditDialogOpen(false);
    setSelectedEvent(null);
    // Reset form
    setEditTitle('');
    setEditDescription('');
    setEditColor('#00ffff');
    setEditStartTime('');
    setEditEndTime('');
  }, [userId, selectedEvent, events, onEventsChange]);

  return (
    <div 
      className="w-full todo-drop-zone"
      id="todo-list-container"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('drag-over');
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only remove if we're leaving the entire container
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          e.currentTarget.classList.remove('drag-over');
        }
      }}
      onDrop={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
        
        // Handle drop from calendar
        if (!userId) return;
        
        try {
          let eventData: any = null;
          
          // Try to get event data from HTML5 drag data transfer
          try {
            const eventDataStr = e.dataTransfer.getData('application/json');
            if (eventDataStr) {
              eventData = JSON.parse(eventDataStr);
            }
          } catch (err) {
            // dataTransfer might not be available
          }
          
          // Fallback: get from window storage (set by calendar's eventDragStart)
          if (!eventData && typeof window !== 'undefined' && (window as any).__calendarDragEvent) {
            eventData = (window as any).__calendarDragEvent;
          }
          
          if (!eventData) {
            // No event data available, might be from a different source
            return;
          }
          
          const eventId = typeof eventData.id === 'string' ? parseInt(eventData.id) : eventData.id;
          
          if (isNaN(eventId)) {
            console.error('Invalid event ID from drop:', eventData.id);
            return;
          }
          
          // Check if this event is already a todo (to avoid duplicate updates)
          const existingEvent = events.find(evt => evt.id === eventData.id);
          if (existingEvent?.extendedProps?.toDo) {
            // Already a todo, no need to update
            // Clear window storage
            if (typeof window !== 'undefined') {
              delete (window as any).__calendarDragEvent;
            }
            return;
          }
          
          const supabase = createClient();
          
          // Parse dates
          const startDate = eventData.start ? new Date(eventData.start) : new Date();
          const endDate = eventData.end ? new Date(eventData.end) : startDate;
          
          // Update event to set toDo: true
          const { error } = await supabase
            .from('events')
            .update({
              info: {
                start: startDate.getTime(),
                end: endDate.getTime(),
                title: eventData.title || '',
                desc: eventData.desc || '',
                color: eventData.color || '',
                allday: eventData.allDay || false,
                toDo: true, // Move to to-do list
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', eventId)
            .eq('user_id', userId);
          
          if (error) {
            console.error('Error updating event from drop:', error);
            setErrorMessage('Failed to move event to to-do list. Please try again.');
            setErrorDialogOpen(true);
            return;
          }
          
          // Update local state
          const updatedEvents = events.map((evt) =>
            evt.id === eventData.id
              ? {
                  ...evt,
                  extendedProps: {
                    ...evt.extendedProps,
                    toDo: true,
                  },
                }
              : evt
          );
          onEventsChange?.(updatedEvents);
          
          // Clear window storage
          if (typeof window !== 'undefined') {
            delete (window as any).__calendarDragEvent;
          }
        } catch (error) {
          console.error('Error processing drop:', error);
          // Clear window storage on error
          if (typeof window !== 'undefined') {
            delete (window as any).__calendarDragEvent;
          }
        }
      }}
    >
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
          To-Do List
        </div>
        {userId && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCreateDialogOpen(true)}
            title="Add new to-do item"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div
        ref={listRef}
        className="space-y-1 max-h-[400px] overflow-y-auto"
      >
        {!userId ? (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            Loading...
          </div>
        ) : todoEvents.length === 0 ? (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            No to-do items
          </div>
        ) : (
          todoEvents.map((event) => (
            <div
              key={event.id}
              data-event-id={event.id}
              className="todo-item px-2 py-1.5 rounded-md hover:bg-sidebar-accent cursor-pointer text-sm text-sidebar-foreground"
              onClick={() => handleEventClick(event)}
              style={{
                borderLeft: `3px solid ${event.color || '#00ffff'}`,
              }}
            >
              {event.title || 'Untitled'}
            </div>
          ))
        )}
      </div>

      {/* Create Todo Dialog */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setCreateTitle('');
            setCreateDescription('');
            setCreateColor('#00ffff');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create To-Do Item</DialogTitle>
            <DialogDescription>
              Add a new item to your to-do list.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-title">Title</Label>
              <Input
                id="create-title"
                type="text"
                placeholder="To-do item title"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && createTitle.trim()) {
                    handleCreateTodo();
                  }
                }}
                autoFocus
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Input
                id="create-description"
                type="text"
                placeholder="Optional description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="create-color"
                  type="color"
                  value={createColor}
                  onChange={(e) => setCreateColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer"
                />
                <Input
                  type="text"
                  value={createColor}
                  onChange={(e) => setCreateColor(e.target.value)}
                  placeholder="#00ffff"
                  className="flex-1"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setCreateTitle('');
                setCreateDescription('');
                setCreateColor('#00ffff');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTodo}
              disabled={!createTitle.trim()}
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
            setSelectedEvent(null);
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
            <DialogTitle>Edit To-Do Item</DialogTitle>
            <DialogDescription>
              Update to-do item details or delete the item.
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
                setSelectedEvent(null);
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
