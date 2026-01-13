import { NextResponse } from "next/server";
import { getBooking } from "@/app/lib/bookings-ddb";

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const bookingId = ctx.params.id;
  const booking = await getBooking(bookingId);

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(booking);
}
