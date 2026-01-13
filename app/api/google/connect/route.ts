import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: Request) {
  try {
    const { searchParams, origin } = new URL(req.url);

    // Allow instructorId to come from either ?instructorId= or ?id= for convenience
    const instructorId = searchParams.get("instructorId") || searchParams.get("id");
    if (!instructorId || instructorId.trim().length === 0) {
      return NextResponse.json(
        {
          error:
            "Missing required query param: instructorId. Example: /api/google/connect?instructorId=inst-001",
        },
        { status: 400 }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // Prefer NEXT_PUBLIC_BASE_URL if set; otherwise fall back to request origin
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error:
            "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables.",
        },
        { status: 500 }
      );
    }

    const redirectUri = `${baseUrl}/api/google/callback`;

    const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const authUrl = oauth.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/calendar"],
      state: instructorId, // used by callback to know which instructor to save tokens for
    });

    /**
     * Best practice: redirect the browser directly to Google so you don't have to
     * manually read JSON and window.location it.
     */
    return NextResponse.redirect(authUrl, { status: 302 });

    // If you prefer the JSON style instead, use this line instead of redirect:
    // return NextResponse.json({ url: authUrl });
  } catch (err) {
    console.error("GOOGLE CONNECT ERROR:", err);
    return NextResponse.json(
      { error: "Failed to generate Google OAuth URL" },
      { status: 500 }
    );
  }
}
