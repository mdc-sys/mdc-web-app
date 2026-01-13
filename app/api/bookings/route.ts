import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function assertNonEmptyString(name: string, val: unknown): asserts val is string {
  if (typeof val !== "string" || val.trim().length === 0) {
    throw new Error(`${name} is missing or empty`);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const instructorId = body?.instructorId;
    const startTime = body?.startTime;
    const lengthMinutes = body?.lengthMinutes;

    assertNonEmptyString("instructorId", instructorId);
    assertNonEmptyString("startTime", startTime);

    const len = Number(lengthMinutes);
    if (![30, 60].includes(len)) {
      return NextResponse.json({ error: "lengthMinutes must be 30 or 60" }, { status: 400 });
    }

    // Booking table name: prefer env, default to your known table name
    const tableName = process.env.DDB_BOOKINGS_TABLE || "MDC_Bookings";

    const bookingId = `book_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    // Student identity: if you have Cognito/Amplify auth wired later, we’ll replace this.
    const studentId =
      typeof body?.studentId === "string" && body.studentId.trim().length > 0
        ? body.studentId.trim()
        : "student-unknown";

    const item = {
      bookingId, // make sure your table has PK=bookingId OR a key schema that supports this
      instructorId,
      studentId,
      startTime,
      lengthMinutes: len,

      status: "PENDING_PAYMENT",
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
        // Prevent accidental overwrite if bookingId somehow collides
        ConditionExpression: "attribute_not_exists(bookingId)",
      })
    );

    return NextResponse.json({ bookingId });
  } catch (err: any) {
    const msg = err?.message || "Unable to create booking";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
