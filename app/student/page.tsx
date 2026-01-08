"use client";

import { useEffect, useState } from "react";

type BusyBlock = {
  start: string;
  end: string;
};

type Slot = {
  start: Date;
  end: Date;
};

export default function StudentBookingPage() {
  const [busy, setBusy] = useState<BusyBlock[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [lessonLength, setLessonLength] = useState<30 | 60>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------------
  // Fetch instructor availability
  // ----------------------------------
  useEffect(() => {
    async function loadAvailability() {
      try {
        const res = await fetch("/api/instructor/availability");

        if (!res.ok) {
          throw new Error("Failed to load availability");
        }

        const data = await res.json();
        setBusy(data.busy || []);
      } catch (err: any) {
        setError(err.message || "Error loading availability");
      } finally {
        setLoading(false);
      }
    }

    loadAvailability();
  }, []);

  // ----------------------------------
  // Generate available slots
  // ----------------------------------
  useEffect(() => {
    const generated = generateSlots(busy, lessonLength);
    setSlots(generated);
  }, [busy, lessonLength]);

  // ----------------------------------
  // Stripe Checkout
  // ----------------------------------
  async function startCheckout(slot: Slot) {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          lessonLength,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Unable to start checkout");
      }

      // 🚀 Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      alert(err.message || "Checkout failed");
    }
  }

  if (loading) {
    return <p style={{ padding: "2rem" }}>Loading availability…</p>;
  }

  if (error) {
    return (
      <p style={{ padding: "2rem", color: "#ff6b6b" }}>
        {error}
      </p>
    );
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Book a Lesson</h1>

      {/* Lesson length */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label>Lesson Length</label>
        <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
          <button
            onClick={() => setLessonLength(30)}
            style={lessonLength === 30 ? selectedStyle : buttonStyle}
          >
            30 Minutes
          </button>
          <button
            onClick={() => setLessonLength(60)}
            style={lessonLength === 60 ? selectedStyle : buttonStyle}
          >
            60 Minutes
          </button>
        </div>
      </div>

      {/* Available slots */}
      <h2>Available Times</h2>

      {slots.length === 0 && (
        <p>No available slots in the next two weeks.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {slots.map((slot, i) => (
          <li key={i} style={{ marginBottom: "0.75rem" }}>
            <button
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid #444",
                background: "#111",
                color: "white",
                cursor: "pointer",
              }}
              onClick={() => startCheckout(slot)}
            >
              {slot.start.toLocaleDateString()}{" "}
              {slot.start.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              –{" "}
              {slot.end.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

// ----------------------------------
// Slot generation logic
// ----------------------------------
function generateSlots(busy: BusyBlock[], length: 30 | 60): Slot[] {
  const slots: Slot[] = [];

  const startHour = 9;
  const endHour = 17;
  const daysAhead = 14;

  const busyRanges = busy.map((b) => ({
    start: new Date(b.start),
    end: new Date(b.end),
  }));

  for (let d = 0; d < daysAhead; d++) {
    const day = new Date();
    day.setDate(day.getDate() + d);
    day.setHours(startHour, 0, 0, 0);

    const dayEnd = new Date(day);
    dayEnd.setHours(endHour, 0, 0, 0);

    while (day.getTime() + length * 60000 <= dayEnd.getTime()) {
      const slotStart = new Date(day);
      const slotEnd = new Date(day.getTime() + length * 60000);

      const overlaps = busyRanges.some(
        (b) => slotStart < b.end && slotEnd > b.start
      );

      if (!overlaps) {
        slots.push({ start: slotStart, end: slotEnd });
      }

      day.setMinutes(day.getMinutes() + 30);
    }
  }

  return slots;
}

// ----------------------------------
// Styles
// ----------------------------------
const buttonStyle = {
  padding: "0.5rem 1rem",
  borderRadius: "8px",
  border: "1px solid #444",
  background: "transparent",
  color: "white",
  cursor: "pointer",
};

const selectedStyle = {
  ...buttonStyle,
  background: "linear-gradient(135deg, #8b1c3d, #5a2ca0)",
};
