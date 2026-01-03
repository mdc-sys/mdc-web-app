export type LessonLength = 30 | 60;

export type Booking = {
  id: string;
  studentName: string;
  instructorName: string;
  length: LessonLength;
  time: string;
  paid: boolean;
  calendarAdded?: boolean;
};

const STORAGE_KEY = "mdc_bookings";

function loadBookings(): Booking[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveBookings(bookings: Booking[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

let bookings: Booking[] = [];

if (typeof window !== "undefined") {
  bookings = loadBookings();
}

export function createBooking(booking: Booking): boolean {
  const conflict = bookings.find(
    b =>
      b.instructorName === booking.instructorName &&
      b.time === booking.time
  );
  if (conflict) return false;

  bookings.push(booking);
  saveBookings(bookings);
  return true;
}

export function markBookingPaid(id: string) {
  bookings = bookings.map(b =>
    b.id === id ? { ...b, paid: true } : b
  );
  saveBookings(bookings);
}

export function markCalendarAdded(id: string) {
  bookings = bookings.map(b =>
    b.id === id ? { ...b, calendarAdded: true } : b
  );
  saveBookings(bookings);
}

export function getBookingsForInstructor(name: string) {
  return bookings.filter(b => b.instructorName === name);
}

export function isTimeBooked(instructor: string, time: string) {
  return bookings.some(
    b => b.instructorName === instructor && b.time === time
  );
}
