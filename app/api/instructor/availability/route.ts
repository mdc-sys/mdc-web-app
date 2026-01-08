import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

import { getCurrentUser } from "aws-amplify/auth/server";
import { google } from "googleapis";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

// 🔒 REQUIRED for Amplify server auth
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION! })
);

export async function GET() {
  try {
    // ✅ MUST pass BOTH cookies() and headers()
    const user = await getCurrentUser({
      cookies: cookies(),
      headers: headers(),
    });

    const instructorId = user.userId;

    if (!instructorId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const result = await ddb.send(
      new GetCommand({
        TableName: "InstructorCalendars",
        Key: { instructorId },
      })
    );

    if (!result.Item) {
      return NextResponse.json({
        timezone: "UTC",
        busy: [],
        reason: "Instructor calendar not connected",
      });
    }

    const {
      accessToken,
      refreshToken,
      calendarId = "primary",
      timezone = "UTC",
    } = result.Item as any;

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!
    );

    auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date();
    const twoWeeks = new Date();
    twoWeeks.setDate(now.getDate() + 14);

    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: twoWeeks.toISOString(),
        timeZone: timezone,
        items: [{ id: calendarId }],
      },
    });

    return NextResponse.json({
      timezone,
      busy: fb.data.calendars?.[calendarId]?.busy ?? [],
    });
  } catch (err: any) {
    console.error("Availability error:", err);
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
