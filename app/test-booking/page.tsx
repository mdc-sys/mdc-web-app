"use client";

import { useState } from "react";

export default function TestBookingPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  async function createTestBooking() {
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // TEMP for wiring test—matches the server code right now
          "x-student-id": "test-student-123",
        },
        body: JSON.stringify({
          instructorId: "inst-001",
          startAt: "2026-01-10T15:00:00Z",
          endAt: "2026-01-10T15:30:00Z",
          lengthMinutes: 30,
          priceCents: 2500,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      setResult(data);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Test Booking Create</h1>
      <button onClick={createTestBooking} style={{ padding: 12, marginTop: 12 }}>
        Create Test Booking
      </button>

      {error && (
        <pre style={{ marginTop: 16, color: "crimson" }}>
          {error}
        </pre>
      )}

      {result && (
        <pre style={{ marginTop: 16 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
