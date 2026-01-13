"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SlotLike =
  | string
  | { start: string }
  | { start: { dateTime?: string; date?: string } }
  | { dateTime?: string; date?: string };

function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

function toISODate(d: Date): string {
  // local date -> YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTimeAMPM(iso: string): string {
  // Accepts ISO date-time string. Uses user's local timezone.
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;

  let h = dt.getHours();
  const m = dt.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const mm = String(m).padStart(2, "0");
  return `${h}:${mm} ${ampm}`;
}

function normalizeSlots(payload: any): string[] {
  // Try a few common response shapes
  const candidates: unknown[] = [];

  if (payload && Array.isArray(payload.slots)) candidates.push(...payload.slots);
  if (payload && Array.isArray(payload.availability)) candidates.push(...payload.availability);
  if (payload && Array.isArray(payload.items)) candidates.push(...payload.items);
  if (payload && Array.isArray(payload.data)) candidates.push(...payload.data);

  const out: string[] = [];

  for (const item of candidates) {
    if (isNonEmptyString(item)) {
      out.push(item);
      continue;
    }

    const obj = item as SlotLike;

    // { start: "..." }
    if (obj && typeof obj === "object" && "start" in obj) {
      const start = (obj as any).start;
      if (isNonEmptyString(start)) {
        out.push(start);
        continue;
      }

      // { start: { dateTime, date } }
      if (start && typeof start === "object") {
        const dt = (start as any).dateTime;
        const d = (start as any).date;
        if (isNonEmptyString(dt)) {
          out.push(dt);
          continue;
        }
        if (isNonEmptyString(d)) {
          // date-only is not useful for a slot; ignore
          continue;
        }
      }
    }

    // { dateTime: "..." }
    if (obj && typeof obj === "object") {
      const dt = (obj as any).dateTime;
      if (isNonEmptyString(dt)) {
        out.push(dt);
        continue;
      }
    }
  }

  // De-dupe + sort
  const deduped = Array.from(new Set(out));
  deduped.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return deduped;
}

export default function StudentBookPage() {
  const router = useRouter();

  // Minimal instructor list for now; swap to dynamic later.
  const instructorOptions = useMemo(
    () => [
      { id: "inst-001", name: "Instructor (inst-001)" },
      // Add more as you onboard:
      // { id: "inst-002", name: "Jane Doe (inst-002)" },
    ],
    []
  );

  const [instructorId, setInstructorId] = useState<string>(instructorOptions[0]?.id ?? "inst-001");
  const [length, setLength] = useState<30 | 60>(30);

  const [dateStr, setDateStr] = useState<string>(() => toISODate(new Date()));

  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchSlots() {
    setIsLoading(true);
    setError(null);
    setSelectedSlot(null);

    try {
      if (!instructorId || instructorId.trim().length === 0) {
        setSlots([]);
        setError("Please choose an instructor.");
        setIsLoading(false);
        return;
      }

      // Date is required. Expecting YYYY-MM-DD.
      if (!dateStr || dateStr.trim().length !== 10) {
        setSlots([]);
        setError("Please choose a valid date.");
        setIsLoading(false);
        return;
      }

      const url = `/api/instructor/${encodeURIComponent(instructorId)}/availability?date=${encodeURIComponent(
        dateStr
      )}&length=${encodeURIComponent(String(length))}`;

      const res = await fetch(url, { method: "GET" });

      const text = await res.text();
      let payload: any = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        // Non-JSON response
        payload = { raw: text };
      }

      if (!res.ok) {
        const msg =
          (payload && (payload.error || payload.message)) ||
          `Unable to load availability (HTTP ${res.status}).`;
        setSlots([]);
        setError(msg);
        setIsLoading(false);
        return;
      }

      const normalized = normalizeSlots(payload);
      setSlots(normalized);
      if (normalized.length === 0) {
        setError("No available times found for this date. Try another date or lesson length.");
      }
    } catch (e: any) {
      setSlots([]);
      setError(e?.message || "Unable to load availability. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Fetch when key inputs change
  useEffect(() => {
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructorId, dateStr, length]);

  const canContinue = !!selectedSlot && !isLoading;

 async function continueToCheckout() {
  if (!selectedSlot) return;

  setError(null);
  setIsLoading(true);

  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instructorId,
        startTime: selectedSlot,
        lengthMinutes: length,
        // studentId: "student-xyz" // later, replace with authenticated user id
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setIsLoading(false);
      setError(data?.error || "Unable to create booking.");
      return;
    }

    const bookingId = data?.bookingId as string | undefined;
    if (!bookingId) {
      setIsLoading(false);
      setError("Booking created but bookingId was missing.");
      return;
    }

    // Redirect into your existing payment flow
    router.push(`/pay?id=${encodeURIComponent(bookingId)}&length=${encodeURIComponent(String(length))}`);
  } catch (e: any) {
    setError(e?.message || "Unable to create booking.");
    setIsLoading(false);
  }
}


  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Book a Lesson</h1>
          <p className="mt-2 text-sm text-neutral-300">
            Choose an instructor, lesson length, and an available time slot.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-sm">
          {/* Controls */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-neutral-200">Instructor</label>
              <select
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-600"
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
              >
                {instructorOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-neutral-200">Date</label>
              <input
                type="date"
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-600"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-neutral-200">Lesson Length</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm ${
                    length === 30
                      ? "border-neutral-200 bg-neutral-200 text-neutral-950"
                      : "border-neutral-800 bg-neutral-950 text-neutral-100 hover:border-neutral-600"
                  }`}
                  onClick={() => setLength(30)}
                >
                  30 min
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm ${
                    length === 60
                      ? "border-neutral-200 bg-neutral-200 text-neutral-950"
                      : "border-neutral-800 bg-neutral-950 text-neutral-100 hover:border-neutral-600"
                  }`}
                  onClick={() => setLength(60)}
                >
                  60 min
                </button>
              </div>
            </div>
          </div>

          {/* Status row */}
          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="text-sm text-neutral-300">
              {isLoading ? "Loading availability…" : `Showing ${slots.length} slot${slots.length === 1 ? "" : "s"}.`}
            </div>

            <button
              type="button"
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 hover:border-neutral-600"
              onClick={fetchSlots}
              disabled={isLoading}
            >
              Refresh
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
              {error}
            </div>
          )}

          {/* Slots */}
          <div className="mt-5">
            <h2 className="text-sm font-medium text-neutral-200">Available Times</h2>

            <div className="mt-3 flex flex-wrap gap-2">
              {slots.map((iso) => {
                const isSelected = selectedSlot === iso;
                return (
                  <button
                    key={iso}
                    type="button"
                    className={`rounded-full border px-4 py-2 text-sm ${
                      isSelected
                        ? "border-neutral-200 bg-neutral-200 text-neutral-950"
                        : "border-neutral-800 bg-neutral-950 text-neutral-100 hover:border-neutral-600"
                    }`}
                    onClick={() => setSelectedSlot(iso)}
                    disabled={isLoading}
                    title={iso}
                  >
                    {formatTimeAMPM(iso)}
                  </button>
                );
              })}

              {!isLoading && slots.length === 0 && (
                <div className="text-sm text-neutral-400">
                  No slots to show. Try another date or length, or refresh.
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-6 flex flex-col gap-3 border-t border-neutral-800 pt-5 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-neutral-300">
              {selectedSlot ? (
                <>
                  Selected: <span className="text-neutral-100">{formatTimeAMPM(selectedSlot)}</span>
                </>
              ) : (
                "Select a time to continue."
              )}
            </div>

            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                canContinue
                  ? "bg-neutral-200 text-neutral-950 hover:bg-neutral-100"
                  : "bg-neutral-800 text-neutral-400 cursor-not-allowed"
              }`}
              onClick={continueToCheckout}
              disabled={!canContinue}
            >
              Continue to Payment
            </button>
          </div>
        </div>

        <div className="mt-6 text-xs text-neutral-500">
          Tip: If an instructor has not connected Google Calendar yet, your API may return fewer or no slots.
        </div>
      </div>
    </div>
  );
}
