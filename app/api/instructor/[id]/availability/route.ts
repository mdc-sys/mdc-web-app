import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

import { getCalendarClientForInstructor } from "@/app/lib/googleCalendarClient";

const DEFAULT_TIMEZONE = "America/New_York";

/* ============================
   Utility helpers
============================ */

function assertNonEmptyString(
  name: string,
  value: unknown
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is missing or empty`);
  }
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function normalizeDayIndex(value: any): number | null {
  if (typeof value === "number" && value >= 0 && value <= 6) return value;
  return null;
}

function parseHHMM(s: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!match) return null;
  return { h: Number(match[1]), m: Number(match[2]) };
}

function minutes(h: number, m: number) {
  return h * 60 + m;
}

function getWeekdayIndex(date: string, tz: string): number {
  const d = new Date(`${date}T12:00:00Z`);
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  }).format(d);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const idx = map[short];
  return typeof idx === "number" ? idx : 0;
}

/* ============================
   Types
============================ */

type RuleBlock = { start: string; end: string };
type NormalizedRule = { dayIndex: number; blocks: RuleBlock[] };

/* ============================
   NORMALIZE RULES
   - supports rulesJson as object OR stringified JSON
   - expects rulesJson.weekly: [{day,start,end}, ...]
============================ */

function normalizeRules(items: any[]): NormalizedRule[] {
  const out: NormalizedRule[] = [];

  for (const it of items) {
    if (!it || typeof it !== "object") continue;

    let rulesJson: any = (it as any).rulesJson;

    if (typeof rulesJson === "string") {
      try {
        rulesJson = JSON.parse(rulesJson);
      } catch {
        continue;
      }
    }

    const weekly = rulesJson?.weekly;
    if (!Array.isArray(weekly)) continue;

    const byDay = new Map<number, RuleBlock[]>();

    for (const w of weekly) {
      const dayIndex = normalizeDayIndex(w?.day);
      const start = w?.start;
      const end = w?.end;

      if (dayIndex === null) continue;
      if (typeof start !== "string" || typeof end !== "string") continue;

      const blocks = byDay.get(dayIndex) ?? [];
      blocks.push({ start, end });
      byDay.set(dayIndex, blocks);
    }

    for (const [dayIndex, blocks] of byDay.entries()) {
      if (blocks.length > 0) out.push({ dayIndex, blocks });
    }
  }

  return out;
}

/* ============================
   Timezone offset helpers (for valid Date parsing in UI)
============================ */

function formatOffset(minutesEastOfUTC: number): string {
  const sign = minutesEastOfUTC >= 0 ? "+" : "-";
  const abs = Math.abs(minutesEastOfUTC);
  const hh = Math.floor(abs / 60);
  const mm = abs % 60;
  return `${sign}${pad2(hh)}:${pad2(mm)}`;
}

function getOffsetMinutesForZoneAtNoon(
  dateYYYYMMDD: string,
  timeZone: string
): number {
  const dt = new Date(`${dateYYYYMMDD}T12:00:00Z`);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = fmt.formatToParts(dt);
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "";
  const m = /(GMT|UTC)([+-]\d{1,2})(?::(\d{2}))?/.exec(tzPart);

  if (!m) return -300; // fallback Eastern
  const hours = Number(m[2]);
  const mins = m[3] ? Number(m[3]) : 0;
  return hours * 60 + (hours >= 0 ? mins : -mins);
}

/* ============================
   SLOT GENERATION
============================ */

function generateSlots(
  date: string,
  tz: string,
  length: number,
  rules: NormalizedRule[]
) {
  const dayIndex = getWeekdayIndex(date, tz);
  const slots: string[] = [];

  const offset = formatOffset(getOffsetMinutesForZoneAtNoon(date, tz));

  for (const rule of rules) {
    if (rule.dayIndex !== dayIndex) continue;

    for (const block of rule.blocks) {
      const s = parseHHMM(block.start);
      const e = parseHHMM(block.end);
      if (!s || !e) continue;

      for (
        let t = minutes(s.h, s.m);
        t + length <= minutes(e.h, e.m);
        t += length
      ) {
        const hh = Math.floor(t / 60);
        const mm = t % 60;
        slots.push(`${date}T${pad2(hh)}:${pad2(mm)}:00${offset}`);
      }
    }
  }

  return slots;
}

/* ============================
   DYNAMODB
============================ */

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function loadAvailabilityRules(instructorId: string) {
  const tableName = process.env.DDB_INSTRUCTOR_AVAILABILITY_TABLE;

  console.log("AVAILABILITY TABLE:", tableName);
  console.log("LOOKING FOR instructorId:", instructorId);

  if (!tableName) return [];

  try {
    const q = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "instructorId = :id",
        ExpressionAttributeValues: { ":id": instructorId },
      })
    );
    console.log("QUERY ITEMS:", q.Items);
    if (q.Items?.length) return q.Items;
  } catch {
    console.log("QUERY FAILED — falling back to scan");
  }

  try {
    const s = await ddb.send(new ScanCommand({ TableName: tableName }));
    console.log("SCAN ITEMS:", s.Items);

    return (s.Items ?? []).filter(
      (i: any) =>
        i?.instructorId === instructorId || i?.pk?.includes?.(instructorId)
    );
  } catch (err) {
    console.log("SCAN FAILED:", err);
    return [];
  }
}

/**
 * Block slots that are already booked.
 * Tonight: block both PAID and PENDING_PAYMENT (simple + safe).
 * Later: add holdExpiresAt for pending holds.
 */
async function loadBookedStartsForDate(
  instructorId: string,
  dateYYYYMMDD: string
): Promise<Set<string>> {
  const tableName = process.env.DDB_BOOKINGS_TABLE || "MDC_Bookings";
  console.log("BOOKINGS TABLE:", tableName);

  try {
    const resp = await ddb.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression: "instructorId, startTime, #status",
        FilterExpression:
          "instructorId = :iid AND begins_with(startTime, :datePrefix) AND (#status = :paid OR #status = :pending)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":iid": instructorId,
          ":datePrefix": `${dateYYYYMMDD}T`,
          ":paid": "PAID",
          ":pending": "PENDING_PAYMENT",
        },
      })
    );

    const set = new Set<string>();
    const offset = formatOffset(getOffsetMinutesForZoneAtNoon(dateYYYYMMDD, DEFAULT_TIMEZONE));

for (const item of resp.Items ?? []) {
  const s = (item as any)?.startTime;
  if (typeof s !== "string") continue;

  // If startTime has no timezone offset, append the local offset so it matches generated slots.
  // Example: "2026-01-13T17:30:00" -> "2026-01-13T17:30:00-05:00"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
    set.add(`${s}${offset}`);
  } else {
    set.add(s);
  }
}


    console.log("BOOKED STARTS (blocked):", Array.from(set));
    return set;
  } catch (err) {
    console.log("BOOKINGS SCAN FAILED:", err);
    return new Set();
  }
}

/* ============================
   ROUTE HANDLER
============================ */

export async function GET(req: Request, ctx: any) {
  try {
    const params = ctx?.params?.then ? await ctx.params : ctx.params;
    const instructorId = params?.id;
    assertNonEmptyString("instructorId", instructorId);

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? "";
    const length = Number(searchParams.get("length") ?? "30");
    const tz = searchParams.get("tz") ?? DEFAULT_TIMEZONE;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid or missing 'date'. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (![30, 60].includes(length)) {
      return NextResponse.json(
        { error: "Invalid 'length'. Expected 30 or 60." },
        { status: 400 }
      );
    }

    const rawRules = await loadAvailabilityRules(instructorId);
    const rules = normalizeRules(rawRules);

    let slots = generateSlots(date, tz, length, rules);

    // Remove any slot that is already booked (PAID + PENDING_PAYMENT)
    const bookedStarts = await loadBookedStartsForDate(instructorId, date);
    console.log("BOOKED STARTS SET SIZE:", bookedStarts.size);
    slots = slots.filter((s) => !bookedStarts.has(s));

    let connected = false;
    try {
      connected = !!(await getCalendarClientForInstructor(instructorId));
    } catch {}

    return NextResponse.json({
      connected,
      instructorId,
      date,
      timezone: tz,
      lengthMinutes: length,
      window: slots.length
        ? { start: slots[0], end: slots[slots.length - 1] }
        : null,
      slots,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Availability error" },
      { status: 500 }
    );
  }
}
