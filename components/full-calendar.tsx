"use client";

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function Calendar() {
  const handleDateClick = (arg: { dateStr: string }) => {
    alert(arg.dateStr)
  }

  return (
    <FullCalendar
      plugins={[ dayGridPlugin, interactionPlugin ]}
      dateClick={handleDateClick}
      initialView="dayGridMonth"
    />
  )
}
