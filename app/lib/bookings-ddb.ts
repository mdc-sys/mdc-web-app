import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "./ddb";

const TABLE = process.env.DDB_BOOKINGS_TABLE;
if (!TABLE) throw new Error("Missing DDB_BOOKINGS_TABLE env var");

export type BookingStatus = "PENDING_PAYMENT" | "PAID" | "CANCELLED";

export type Booking = {
  bookingId: string;
  instructorId: string;
  studentId: string;
  startAt: string;
  endAt: string;
  lengthMinutes: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  priceCents: number;
  currency: "usd";

  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
};

export async function createBooking(b: Booking) {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: b,
      ConditionExpression: "attribute_not_exists(bookingId)",
    })
  );
  return b;
}

export async function getBooking(bookingId: string) {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { bookingId },
    })
  );
  return res.Item as Booking | undefined;
}
