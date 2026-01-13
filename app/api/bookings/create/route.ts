import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createBooking, type Booking } from "@/app/lib/bookings-ddb";

function requireStudentId(req: Request): string {
  // Temporary test hook. Replace with Cognito "sub" extraction next.
  const studentId = req.headers.get("x-student-id");
  if (!studentId) throw new Error("Missing student identity (x-student-id)");
  return studentId;
}

export async function POST(req: Request) {
  try {
    const studentId = requireStudentId(req);
    const body = await req.json();

    const { instructorId, startAt, endAt, lengthMinutes, priceCents } = body ?? {};
    if (!instructorId || !startAt || !endAt || !lengthMinutes || !priceCents) {
      return NextResponse.json(
        { error: "Required: instructorId, startAt, endAt, lengthMinutes, priceCents" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const bookingId = randomUUID();

    const booking: Booking = {
      bookingId,
      instructorId,
      studentId,
      startAt,
      endAt,
      lengthMinutes: Number(lengthMinutes),
      status: "PENDING_PAYMENT",
      createdAt: now,
      updatedAt: now,
      priceCents: Number(priceCents),
      currency: "usd",
      GSI1PK: instructorId,
      GSI1SK: startAt,
      GSI2PK: studentId,
      GSI2SK: startAt,
    };

    await createBooking(booking);
    return NextResponse.json({ bookingId }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create booking" }, { status: 500 });
  }
}
