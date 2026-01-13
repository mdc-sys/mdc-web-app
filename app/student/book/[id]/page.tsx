"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function isValidDate(d: Date) {
  return !Number.isNaN(d.getTime());
}

function toDate(slot: string) {
  const d = new Date(slot);
  return isValidDate(d) ? d : null;
}

function formatTime(slot: string, timeZone: string) {
  const d = toDate(slot);
  if (!d) return "Invalid time";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function normalizeSlots(input: any): string[] {
  if (!Array.isArray(input)) return [];

  const out: string[] = [];

  for (const s of input) {
    if (typeof s === "string") {
      if (toDate(s)) out.push(s);
      continue;
    }

    if (s && typeof s === "object") {
      const start =
        (typeof s.start === "string" && s.start) ||
        (typeof s.start?.dateTime === "string" && s.start.dateTime) ||
        (typeof s.dateTime === "string" && s.dateTime);

      if (typeof start === "string" && toDate(start)) out.push(start);
    }
  }

  return Array.from(new Set(out)).sort();
}

function yyyyMmDdTodayInTZ(tz: string) {
  const d = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d); // YYYY-MM-DD
}

export default function StudentBookingPage() {
  const router = useRouter();
  const params = useParams();

  // IMPORTANT: support either folder name [id] or [instructorId]
  const instructorId =
    String((params as any)?.id || (params as any)?.instructorId || "").trim();

  const [timeZone, setTimeZone] = useState<string>("America/New_York");
  const [date, setDate] = useState<string>(() =>
    yyyyMmDdTodayInTZ("America/New_York")
  );
  const [length, setLength] = useState<30 | 60>(30);

  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = useMemo(() => {
    if (!instructorId) return null;
    return `/api/instructor/${encodeURIComponent(
      instructorId
    )}/availability?date=${encodeURIComponent(date)}&length=${encodeURIComponent(
      String(length)
    )}&tz=${encodeURIComponent(timeZone)}`;
  }, [instructorId, date, length, timeZone]);

  async function fetchSlots() {
    if (!apiUrl) return;

    setLoading(true);
    setError(null);
    setSelectedSlot(null);

    try {
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!res.ok) {
        setSlots([]);
        setConnected(null);
        setError(data?.error || "Unable to load availability.");
        setLoading(false);
        return;
      }

      const tz = typeof data?.timezone === "string" ? data.timezone : timeZone;
      setTimeZone(tz);
      setConnected(!!data?.connected);

      const normalized = normalizeSlots(data?.slots);
      setSlots(normalized);

      setLoading(false);
    } catch (e: any) {
      setSlots([]);
      setConnected(null);
      setError(e?.message || "Network error loading availability.");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!instructorId) return;
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, instructorId]);

  async function continueToPayment() {
    if (!selectedSlot) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructorId,
          startTime: selectedSlot,
          lengthMinutes: length,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        setError(data?.error || "Unable to create booking.");
        return;
      }

      const bookingId = data?.bookingId;
      if (typeof bookingId !== "string" || bookingId.trim().length === 0) {
        setLoading(false);
        setError("Booking created but bookingId was missing.");
        return;
      }

      router.push(
  `/student/payment?id=${encodeURIComponent(bookingId)}&length=${encodeURIComponent(String(length))}`
);

    } catch (e: any) {
      setLoading(false);
      setError(e?.message || "Network error creating booking.");
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Book a Lesson
      </h1>
      <p style={{ marginBottom: 18, opacity: 0.8 }}>
        Instructor: <strong>{instructorId || "Missing instructorId"}</strong>
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
            Lesson Length
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setLength(30)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #333",
                background: length === 30 ? "#222" : "transparent",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              30 min
            </button>
            <button
              type="button"
              onClick={() => setLength(60)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #333",
                background: length === 60 ? "#222" : "transparent",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              60 min
            </button>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Date</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #333",
              background: "transparent",
              color: "inherit",
            }}
          />
        </div>

        <div style={{ alignSelf: "end" }}>
          <button
            type="button"
            onClick={fetchSlots}
            disabled={loading || !apiUrl}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #333",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {connected === false && (
        <div style={{ marginBottom: 12, fontSize: 13, opacity: 0.8 }}>
          Tip: Instructor Google Calendar is not connected, so times may not reflect conflicts.
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 12, padding: 12, border: "1px solid #553", borderRadius: 10 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 18, marginBottom: 10 }}>
        Available Times
      </h2>

      {loading && <p>Loading…</p>}

      {!loading && slots.length === 0 && (
        <p style={{ opacity: 0.8 }}>
          No available times found for this date. Try another date or lesson length.
        </p>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        {slots.map((s) => {
          const label = formatTime(s, timeZone);
          const selected = selectedSlot === s;
          const invalid = label === "Invalid time";

          return (
            <button
              key={s}
              type="button"
              disabled={invalid}
              onClick={() => setSelectedSlot(s)}
              style={{
                padding: "10px 12px",
                borderRadius: 999,
                border: "1px solid #333",
                background: selected ? "#222" : "transparent",
                color: "inherit",
                cursor: invalid ? "not-allowed" : "pointer",
                opacity: invalid ? 0.5 : 1,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 18, opacity: 0.9 }}>
        {selectedSlot ? (
          <p>
            Selected: <strong>{formatTime(selectedSlot, timeZone)}</strong>
          </p>
        ) : (
          <p>Select a time to continue.</p>
        )}
      </div>

      <button
        type="button"
        onClick={continueToPayment}
        disabled={!selectedSlot || loading || !instructorId}
        style={{
          marginTop: 10,
          width: "100%",
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid #333",
          background: selectedSlot ? "#222" : "transparent",
          color: "inherit",
          cursor: selectedSlot ? "pointer" : "not-allowed",
          opacity: loading ? 0.6 : 1,
        }}
      >
        Continue to Payment
      </button>
    </main>
  );
}
