import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  try {
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/google/callback`
    );

    const url = oauth.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/calendar"],
    });

    return NextResponse.json({ url });
  } catch (err) {
    console.error("GOOGLE CONNECT ERROR:", err);
    return NextResponse.json(
      { error: "Failed to generate Google OAuth URL" },
      { status: 500 }
    );
  }
}
