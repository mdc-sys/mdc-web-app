// app/student/book/[id]/slot-selection.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Slot = { startAt: string; endAt: string };

type AvailabilityResponse = {
  connected: boolean;
  instructorId: string;
  date: string;
  timezone?: string;
  lengthMinutes: number;
  window?: { startAt: string; endAt: string } | null;
  slots: Slot[];
  reason?: string;
};

function toYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayInTimeZone(tz?: string) {
  try {
    if (!tz) return toYYYYMMDD(new Date());
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;
    return `${map.year}-${map.month}-${map.day}`;
  } catch {
    return toYYYYMMDD(new Date());
  }
}

function formatTime(iso: string, timeZone?: string) {
  const dt = new Date(iso);
  return dt.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

function periodLabel(iso: string, timeZone?: string) {
  const h = new Date(iso).toLocaleString("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone,
  });
  const hour = Number(h);
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export default function SlotSelection({ instructorId }: { instructorId: string }) {
  const router = useRouter();

  const [date, setDate] = useState(() => toYYYYMMDD(new Date()));
  const [length, setLength] = useState<30 | 60>(30);

  const [loading, setLoading] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tz, setTz] = useState<string | undefined>(undefined);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedStartAt, setSelectedStartAt] = useState<string | null>(null);

  const minDate = useMemo(() => toYYYYMMDD(new Date()), []);
  const todayForDisable = useMemo(() => todayInTimeZone(tz), [tz]);
  const nowMs = Date.now();

  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = periodLabel(s.startAt, tz);
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return Array.from(map.entries());
  }, [slots, tz]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setSlots([]);
      setSelectedStartAt(null);

      try {
        const res = await fetch(
          `/api/instructor/${encodeURIComponent(instructorId)}/availability?date=${encodeURIComponent(
            date
          )}&length=${length}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          // Show a short message, not raw JSON/debug dumps
          let msg = `Availability request failed (${res.status})`;
          try {
            const j = await res.json();
            if (j?.error) msg = String(j.error);
          } catch {
            const txt = await res.text().catch(() => "");
            if (txt) msg = txt;
          }
          throw new Error(msg);
        }

        const data = (await res.json()) as AvailabilityResponse;

        if (cancelled) return;

        if (!data) {
          throw new Error("Empty availability response.");
        }

        // If your API uses reason for “no availability configured”
        if (!data.connected && data.reason) {
          setTz(data.timezone);
          setSlots([]);
          setError(data.reason);
          return;
        }

        setTz(data.timezone);
        setSlots(Array.isArray(data.slots) ? data.slots : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Unable to load availability.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [instructorId, date, length]);

  async function continueToCheckout() {
    if (!selectedStartAt) return;

    setContinuing(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructorId,
          startAt: selectedStartAt,
          lengthMinutes: length,
        }),
      });

      if (!res.ok) {
        let msg = `Booking create failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = String(j.error);
        } catch {
          const txt = await res.text().catch(() => "");
          if (txt) msg = txt;
        }
        throw new Error(msg);
      }

      const data = (await res.json()) as { bookingId?: string };
      if (!data.bookingId) throw new Error("Booking create did not return bookingId.");

      router.push(`/student/pay?id=${encodeURIComponent(data.bookingId)}&length=${length}`);
    } catch (e: any) {
      setError(e?.message ?? "Unable to continue.");
      setContinuing(false);
    }
  }

  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
      {tz && (
        <div className="text-xs text-white/60">
          Times shown in: <span className="text-white/80">{tz}</span>
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-white/70">Date</label>
            <button
              type="button"
              onClick={() => setDate(todayInTimeZone(tz))}
              className="text-xs text-white/60 hover:text-white/80 underline-offset-4 hover:underline"
            >
              Today
            </button>
          </div>

          <input
            type="date"
            value={date}
            min={minDate}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 outline-none focus:border-white/30 focus:bg-black/50"
          />

          <div className="text-xs text-white/50">Select a date to see available lesson times.</div>
        </div>

        {/* Lesson length */}
        <div className="space-y-2">
          <div className="text-sm text-white/70">Lesson length</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLength(30)}
              className={`px-4 py-2 rounded-xl border transition ${
                length === 30 ? "border-white/40 bg-white/10" : "border-white/15 bg-transparent"
              } hover:border-white/30`}
            >
              30 min
            </button>
            <button
              type="button"
              onClick={() => setLength(60)}
              className={`px-4 py-2 rounded-xl border transition ${
                length === 60 ? "border-white/40 bg-white/10" : "border-white/15 bg-transparent"
              } hover:border-white/30`}
            >
              60 min
            </button>
          </div>

          <div className="text-xs text-white/50">Choose lesson length before selecting a time.</div>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}

      {/* Slots */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Available times</h2>
          {loading && <span className="text-sm text-white/60">Loading…</span>}
        </div>

        {!loading && slots.length === 0 && !error && (
          <div className="text-white/70 text-sm">
            No openings found for {date}. Try another date or lesson length.
          </div>
        )}

        <div className="space-y-5">
          {grouped.map(([label, groupSlots]) => (
            <div key={label} className="space-y-2">
              <div className="text-sm text-white/70">{label}</div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {groupSlots.map((s) => {
                  const isSelected = selectedStartAt === s.startAt;
                  const disablePastToday =
                    date === todayForDisable && new Date(s.startAt).getTime() <= nowMs;

                  return (
                    <button
                      key={s.startAt}
                      type="button"
                      disabled={disablePastToday}
                      onClick={() => setSelectedStartAt(s.startAt)}
                      className={`px-3 py-2 rounded-xl border text-sm text-left transition
                        ${
                          isSelected
                            ? "border-white/40 bg-white/10"
                            : "border-white/15 bg-transparent"
                        }
                        hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed`}
                      title={disablePastToday ? "This time has already passed." : undefined}
                    >
                      <div className="font-medium">{formatTime(s.startAt, tz)}</div>
                      <div className="text-white/60 text-xs">to {formatTime(s.endAt, tz)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-white/70">
            {selectedStartAt ? (
              <>
                Selected:{" "}
                <span className="text-white">{formatTime(selectedStartAt, tz)}</span> on{" "}
                <span className="text-white">{date}</span> ({length} min)
              </>
            ) : (
              "Select a time to continue."
            )}
          </div>

          <button
            type="button"
            disabled={!selectedStartAt || continuing}
            onClick={continueToCheckout}
            className="px-5 py-2.5 rounded-xl bg-white text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {continuing ? "Continuing…" : "Continue to payment"}
          </button>
        </div>
      </div>
    </section>
  );
}
