import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    DDB_INSTRUCTOR_TOKENS_TABLE: process.env.DDB_INSTRUCTOR_TOKENS_TABLE ?? null,
    DDB_BOOKINGS_TABLE: process.env.DDB_BOOKINGS_TABLE ?? null,
    AWS_REGION: process.env.AWS_REGION ?? null,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ?? null,
  });
}
