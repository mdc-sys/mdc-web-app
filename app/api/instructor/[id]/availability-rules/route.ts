import { NextResponse } from "next/server";
import { loadAvailabilityRules, saveAvailabilityRules } from "@/app/lib/instructorAvailabilityRules";

type WeeklyBlock = { day: number; start: string; end: string };

function assertNonEmptyString(v: unknown, label: string): asserts v is string {
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new Error(`${label} is missing or empty`);
  }
}

function isValidTimeHHMM(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const m = /^(\d{2}):(\d{2})$/.exec(v);
  if (!m) return false;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function normalizeWeekly(weekly: any[]): WeeklyBlock[] {
  const out: WeeklyBlock[] = [];

  for (const b of weekly) {
    const day = Number(b?.day);
    const start = b?.start;
    const end = b?.end;

    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    if (!isValidTimeHHMM(start) || !isValidTimeHHMM(end)) continue;

    // require end > start (same-day window)
    if (minutesOf(end) <= minutesOf(start)) continue;

    out.push({ day, start, end });
  }

  // Sort for stability (day then start time)
  out.sort((a, b) => a.day - b.day || minutesOf(a.start) - minutesOf(b.start));

  // Optional: dedupe exact duplicates
  const deduped: WeeklyBlock[] = [];
  const seen = new Set<string>();
  for (const b of out) {
    const key = `${b.day}|${b.start}|${b.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(b);
  }

  return deduped;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const instructorId = (id || "").trim();

  if (!instructorId) {
    return NextResponse.json(
      { ok: false, code: "MISSING_INSTRUCTOR_ID" },
      { status: 400 }
    );
  }

  const rules = await loadAvailabilityRules(instructorId);

  if (!rules) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, ...rules });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const instructorId = (id || "").trim();

  if (!instructorId) {
    return NextResponse.json(
      { ok: false, code: "MISSING_INSTRUCTOR_ID" },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  try {
    const timezone = String(body?.timezone ?? "").trim();
    assertNonEmptyString(timezone, "timezone");

    const weeklyRaw = Array.isArray(body?.weekly) ? body.weekly : [];
    const weekly = normalizeWeekly(weeklyRaw);

    // It's OK for weekly to be empty (means not bookable), but be explicit.
    await saveAvailabilityRules(instructorId, { timezone, weekly });

    return NextResponse.json({
      ok: true,
      instructorId,
      timezone,
      weeklyCount: weekly.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR", error: e?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }
}
