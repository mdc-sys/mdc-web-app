// app/instructor/availability/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type WeeklyBlockApi = { day: number; start: string; end: string };

type TimeUI = {
  hour: number; // 1..12
  minute: number; // 0..59
  ampm: "AM" | "PM";
};

type WeeklyBlockUI = {
  day: number; // 0..6 (Sun..Sat)
  start: TimeUI;
  end: TimeUI;
};

type AvailabilityRulesApi = {
  instructorId: string;
  timezone: string;
  weekly: WeeklyBlockApi[];
  updatedAt?: string;
};

const DAYS: { label: string; value: number; short: string }[] = [
  { label: "Sunday", value: 0, short: "Sun" },
  { label: "Monday", value: 1, short: "Mon" },
  { label: "Tuesday", value: 2, short: "Tue" },
  { label: "Wednesday", value: 3, short: "Wed" },
  { label: "Thursday", value: 4, short: "Thu" },
  { label: "Friday", value: 5, short: "Fri" },
  { label: "Saturday", value: 6, short: "Sat" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

function to24Hour(hour12: number, ampm: "AM" | "PM") {
  if (ampm === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function toHHMM(hour12: number, minute: number, ampm: "AM" | "PM") {
  const h24 = to24Hour(hour12, ampm);
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function fromHHMM(hhmm: string): TimeUI {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return { hour: 5, minute: 0, ampm: "PM" };
  const h = Number(m[1]);
  const min = Number(m[2]);
  const ampm: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour: hour12, minute: min, ampm };
}

function formatTimeUi(t: TimeUI) {
  const mm = String(t.minute).padStart(2, "0");
  return `${t.hour}:${mm} ${t.ampm}`;
}

function compareUiTimes(a: TimeUI, b: TimeUI) {
  // returns true if a < b
  const a24 = to24Hour(a.hour, a.ampm) * 60 + a.minute;
  const b24 = to24Hour(b.hour, b.ampm) * 60 + b.minute;
  return a24 < b24;
}

function minutesValue(t: TimeUI) {
  return to24Hour(t.hour, t.ampm) * 60 + t.minute;
}

function overlaps(a: WeeklyBlockUI, b: WeeklyBlockUI) {
  if (a.day !== b.day) return false;
  const aStart = minutesValue(a.start);
  const aEnd = minutesValue(a.end);
  const bStart = minutesValue(b.start);
  const bEnd = minutesValue(b.end);
  return aStart < bEnd && aEnd > bStart;
}

function defaultBlock(day: number): WeeklyBlockUI {
  return {
    day,
    start: { hour: 5, minute: 0, ampm: "PM" },
    end: { hour: 8, minute: 0, ampm: "PM" },
  };
}

export default function InstructorAvailabilityPage() {
  // MVP: hardcode; later derive from auth user profile/custom attribute
  const instructorId = "inst-001";

  const [timezone, setTimezone] = useState("America/New_York");
  const [blocks, setBlocks] = useState<WeeklyBlockUI[]>([
    defaultBlock(1), // Mon 5–8 PM as a helpful default
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = useMemo(
    () => `/api/instructor/${encodeURIComponent(instructorId)}/availability-rules`,
    [instructorId]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setStatus(null);

      try {
        const res = await fetch(apiUrl, { cache: "no-store" });

        if (res.status === 404) {
          // No rules yet; keep defaults
          return;
        }

        if (!res.ok) {
          let msg = `Failed to load rules (${res.status})`;
          try {
            const j = await res.json();
            if (j?.error) msg = String(j.error);
          } catch {}
          throw new Error(msg);
        }

        const data = (await res.json()) as AvailabilityRulesApi;
        if (cancelled) return;

        if (typeof data?.timezone === "string" && data.timezone.trim()) {
          setTimezone(data.timezone.trim());
        }

        if (Array.isArray(data?.weekly)) {
          const ui = data.weekly
            .filter((b) => typeof b?.day === "number" && typeof b?.start === "string" && typeof b?.end === "string")
            .map((b) => ({
              day: b.day,
              start: fromHHMM(b.start),
              end: fromHHMM(b.end),
            }));

          if (ui.length) setBlocks(ui);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Unable to load availability rules.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  function addBlockForDay(day: number) {
    setBlocks((prev) => [...prev, defaultBlock(day)]);
    setStatus(null);
    setError(null);
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
    setStatus(null);
    setError(null);
  }

  function updateBlock(index: number, patch: Partial<WeeklyBlockUI>) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
    setStatus(null);
    setError(null);
  }

  function updateTime(index: number, which: "start" | "end", patch: Partial<TimeUI>) {
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== index) return b;
        return {
          ...b,
          [which]: { ...b[which], ...patch },
        };
      })
    );
    setStatus(null);
    setError(null);
  }

  const blocksByDay = useMemo(() => {
    const map = new Map<number, { block: WeeklyBlockUI; index: number }[]>();
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      map.set(b.day, [...(map.get(b.day) ?? []), { block: b, index: i }]);
    }

    // Sort within each day by start time
    for (const [day, arr] of map.entries()) {
      arr.sort((a, b) => minutesValue(a.block.start) - minutesValue(b.block.start));
      map.set(day, arr);
    }

    return map;
  }, [blocks]);

  function validate(): string | null {
    const tz = timezone.trim();
    if (!tz) return "Timezone is required.";

    if (!blocks.length) return "Add at least one weekly availability block.";

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (typeof b.day !== "number" || b.day < 0 || b.day > 6) {
        return `Block #${i + 1}: day must be 0–6.`;
      }
      if (!compareUiTimes(b.start, b.end)) {
        return `Block #${i + 1}: end time must be after start time.`;
      }
    }

    // Overlap check per day
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        if (overlaps(blocks[i], blocks[j])) {
          const dayLabel = DAYS.find((d) => d.value === blocks[i].day)?.label ?? "Day";
          return `Overlapping blocks on ${dayLabel}. Adjust times so they don't overlap.`;
        }
      }
    }

    return null;
  }

  async function save() {
    setStatus(null);
    setError(null);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        timezone: timezone.trim(),
        weekly: blocks.map((b) => ({
          day: b.day,
          start: toHHMM(b.start.hour, b.start.minute, b.start.ampm),
          end: toHHMM(b.end.hour, b.end.minute, b.end.ampm),
        })),
      };

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = `Save failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = String(j.error);
        } catch {}
        throw new Error(msg);
      }

      setStatus("Saved successfully.");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Weekly Availability</h1>
          <p className="text-white/70">
            Add the times you want to offer MDC lessons. Students will only see times inside these blocks.
            (Google Calendar connection is optional and only subtracts conflicts.)
          </p>
        </header>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
          {/* Timezone */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-white/70">Timezone</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-2 outline-none focus:border-white/30"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>

                <input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-2 outline-none focus:border-white/30"
                  placeholder="America/New_York"
                />
              </div>
              <div className="text-xs text-white/50">
                Tip: pick from the list or paste any valid IANA timezone string.
              </div>
            </div>

            <div className="flex md:justify-end">
              <button
                type="button"
                disabled={saving || loading}
                onClick={save}
                className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-white text-black font-medium disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save availability"}
              </button>
            </div>
          </div>

          {/* Status / error */}
          {loading && <div className="text-white/70 text-sm">Loading…</div>}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm whitespace-pre-wrap">
              {error}
            </div>
          )}

          {status && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm">
              {status}
            </div>
          )}

          {/* Per-day “time pills” */}
          <div className="space-y-4">
            {DAYS.map((day) => {
              const arr = blocksByDay.get(day.value) ?? [];
              return (
                <div key={day.value} className="border border-white/10 rounded-2xl bg-black/30">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="font-medium">{day.label}</div>
                    <button
                      type="button"
                      onClick={() => addBlockForDay(day.value)}
                      className="px-3 py-1.5 rounded-xl border border-white/15 hover:border-white/30 bg-white/5 text-sm"
                    >
                      + Add time
                    </button>
                  </div>

                  <div className="p-4">
                    {arr.length === 0 ? (
                      <div className="text-sm text-white/60">
                        No availability set for {day.short}.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {arr.map(({ block, index }) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-3 py-2"
                          >
                            {/* Start time controls */}
                            <TimePill
                              label="Start"
                              time={block.start}
                              onChange={(patch) => updateTime(index, "start", patch)}
                            />

                            <span className="text-white/40 text-sm">→</span>

                            {/* End time controls */}
                            <TimePill
                              label="End"
                              time={block.end}
                              onChange={(patch) => updateTime(index, "end", patch)}
                            />

                            <button
                              type="button"
                              onClick={() => removeBlock(index)}
                              className="ml-1 rounded-xl border border-white/15 hover:border-red-400/60 hover:bg-red-500/10 px-2 py-1 text-white/80 text-sm"
                              title="Remove block"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Summary line */}
                    {arr.length > 0 && (
                      <div className="mt-3 text-xs text-white/50">
                        {arr.length} block{arr.length === 1 ? "" : "s"} on {day.short}:{" "}
                        {arr
                          .map(({ block }) => `${formatTimeUi(block.start)}–${formatTimeUi(block.end)}`)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-white/40 pt-2">
            Instructor: <span className="font-mono">{instructorId}</span>
          </div>
        </section>
      </div>
    </main>
  );
}

function TimePill({
  label,
  time,
  onChange,
}: {
  label: string;
  time: TimeUI;
  onChange: (patch: Partial<TimeUI>) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/60 hidden sm:inline">{label}</span>

      <select
        value={time.hour}
        onChange={(e) => onChange({ hour: Number(e.target.value) })}
        className="bg-black border border-white/15 rounded-xl px-2 py-1.5 outline-none focus:border-white/30"
        aria-label={`${label} hour`}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>

      <select
        value={time.minute}
        onChange={(e) => onChange({ minute: Number(e.target.value) })}
        className="bg-black border border-white/15 rounded-xl px-2 py-1.5 outline-none focus:border-white/30"
        aria-label={`${label} minute`}
      >
        <option value={0}>00</option>
        <option value={15}>15</option>
        <option value={30}>30</option>
        <option value={45}>45</option>
      </select>

      <select
        value={time.ampm}
        onChange={(e) => onChange({ ampm: e.target.value as "AM" | "PM" })}
        className="bg-black border border-white/15 rounded-xl px-2 py-1.5 outline-none focus:border-white/30"
        aria-label={`${label} AM/PM`}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
