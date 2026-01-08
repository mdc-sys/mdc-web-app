import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      console.error("No code returned from Google");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/instructor?error=no_code`
      );
    }

    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/google/callback`
    );

    const { tokens } = await oauth.getToken(code);

    console.log("GOOGLE TOKENS RECEIVED:", tokens);

    // TEMP: do not store yet
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/instructor?connected=true`
    );
  } catch (err) {
    console.error("GOOGLE CALLBACK ERROR:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/instructor?error=callback_exception`
    );
  }
}
