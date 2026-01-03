"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import RequireRole from "../components/RequireRole";
import { instructors } from "../lib/instructors";
import { getAvailabilityForInstructor } from "../lib/availability";
import { createBooking, isTimeBooked } from "../lib/bookings";

export default function StudentBookingPage() {
  const router = useRouter();

  const [selectedInstructor, setSelectedInstructor] = useState("");
  const [lessonLength, setLessonLength] = useState<30 | 60>(30);
  const [selectedTime, setSelectedTime] = useState("");
  const [error, setError] = useState("");

  const availableTimes = selectedInstructor
    ? getAvailabilityForInstructor(selectedInstructor).filter(
        time => !isTimeBooked(selectedInstructor, time)
      )
    : [];

  function handleContinue() {
    setError("");

    if (!selectedInstructor || !selectedTime) {
      setError("Please select an instructor and a time.");
      return;
    }

    const bookingId = crypto.randomUUID();

    const success = createBooking({
      id: bookingId,
      studentName: "Demo Student",
      instructorName: selectedInstructor,
      length: lessonLength,
      time: selectedTime,
      paid: false,
    });

    if (!success) {
      setError(
        "That time was just booked. Please choose another."
      );
      return;
    }

    router.push(
      `/student/payment?id=${bookingId}&length=${lessonLength}`
    );
  }

  return (
    <RequireRole role="student">
      <main>
        {/* Header */}
        <h1>Book a Lesson</h1>
        <p>
          One-on-one online instruction with experienced marching
          arts educators.
        </p>

        {/* Booking Card */}
        <div className="card">
          {/* Step 1 */}
          <h3>1. Choose an Instructor</h3>
          <select
            value={selectedInstructor}
            onChange={e => {
              setSelectedInstructor(e.target.value);
              setSelectedTime("");
            }}
          >
            <option value="">Select instructor</option>
            {instructors.map(instr => (
              <option key={instr.name} value={instr.name}>
                {instr.name} — {instr.instrument}
              </option>
            ))}
          </select>

          {/* Step 2 */}
          <h3>2. Lesson Length</h3>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={() => setLessonLength(30)}
              className={
                lessonLength === 30 ? "primary" : ""
              }
              style={{ flex: 1 }}
            >
              30 Minutes · $25
            </button>

            <button
              type="button"
              onClick={() => setLessonLength(60)}
              className={
                lessonLength === 60 ? "primary" : ""
              }
              style={{ flex: 1 }}
            >
              60 Minutes · $60
            </button>
          </div>

          {/* Step 3 */}
          <h3>3. Available Times</h3>
          <select
            disabled={!selectedInstructor}
            value={selectedTime}
            onChange={e => setSelectedTime(e.target.value)}
          >
            <option value="">
              {!selectedInstructor
                ? "Select an instructor first"
                : availableTimes.length
                ? "Select a time"
                : "No times available"}
            </option>

            {availableTimes.map(time => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>

          {/* Error */}
          {error && <p className="error">{error}</p>}

          {/* CTA */}
          <button
            className="primary"
            style={{
              width: "100%",
              marginTop: "2rem",
              fontSize: "1.05rem",
            }}
            onClick={handleContinue}
          >
            Continue to Payment
          </button>
        </div>
      </main>
    </RequireRole>
  );
}
