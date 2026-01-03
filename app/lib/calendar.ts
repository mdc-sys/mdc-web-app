import { Booking } from "./bookings";

export function buildGoogleCalendarUrl(booking: Booking) {
  const start = "20260101T160000"; // placeholder
  const end =
    booking.length === 60
      ? "20260101T170000"
      : "20260101T163000";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `MDC Lesson with ${booking.studentName}`,
    details: `March Drum Corps lesson\nInstructor: ${booking.instructorName}`,
    dates: `${start}/${end}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
