import { NextResponse } from "next/server";
import { google } from "googleapis";
import { saveInstructorTokens } from "@/app/lib/instructorTokens";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { searchParams, origin } = url;

  // Use env base URL if provided, otherwise fallback to the actual request origin
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin;

  try {
    const code = searchParams.get("code");
    const instructorId = searchParams.get("state"); // state carries instructorId

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/instructor?error=no_code`);
    }

    if (!instructorId) {
      return NextResponse.redirect(`${baseUrl}/instructor?error=missing_state`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${baseUrl}/instructor?error=missing_google_env`);
    }

    const redirectUri = `${baseUrl}/api/google/callback`;

    const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const tokenResponse = await oauth.getToken(code);
    const tokens = tokenResponse.tokens;

    // Set credentials (useful if you later expand logic here)
    oauth.setCredentials(tokens);

    /**
     * IMPORTANT: refresh_token is typically only returned on the first consent
     * for a given user+client unless you force prompt=consent.
     *
     * If refresh_token is missing, you may still have access_token, but your app
     * won't be able to refresh later and your "connected" check may fail depending
     * on how you implement getCalendarClientForInstructor.
     *
     * We will still save tokens, but we also surface a clear error so you know
     * to re-consent if needed.
     */
    await saveInstructorTokens(instructorId, tokens);

    // If you REQUIRE a refresh token for long-term operation, enforce it:
    // (recommended for your app)
    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${baseUrl}/instructor?error=missing_refresh_token`
      );
    }

    return NextResponse.redirect(`${baseUrl}/instructor?connected=true`);
  } catch (err) {
    console.error("GOOGLE CALLBACK ERROR:", err);
    return NextResponse.redirect(`${baseUrl}/instructor?error=callback_exception`);
  }
}
