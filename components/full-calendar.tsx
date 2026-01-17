"use client";

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';

export default function Calendar() {
  const handleDateClick = (arg: { dateStr: string }) => {
    alert(arg.dateStr)
  }

  return (
    <FullCalendar
      plugins={[ dayGridPlugin, interactionPlugin, timeGridPlugin ]}
      dateClick={handleDateClick}
      initialView="timeGridDay"
      headerToolbar={{
        left: 'prev,next',
        center: 'title',
        right: 'timeGridDay,timeGridWeek'
      }}
    />
  )
}
