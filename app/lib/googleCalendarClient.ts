import { google } from "googleapis";
import { loadInstructorTokens } from "@/app/lib/instructorTokens";

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is missing or empty`);
  }
}

export async function getCalendarClientForInstructor(instructorId: string) {
  assertNonEmptyString(instructorId, "instructorId");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!clientId) throw new Error("Missing GOOGLE_CLIENT_ID");
  if (!clientSecret) throw new Error("Missing GOOGLE_CLIENT_SECRET");
  if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_BASE_URL");

  const tokens = await loadInstructorTokens(instructorId);

  // Helpful debug without printing secrets:
  console.log("GOOGLE TOKENS PRESENCE:", {
    instructorId,
    hasTokens: !!tokens,
    hasAccessToken: !!tokens?.access_token,
    hasRefreshToken: !!tokens?.refresh_token,
    tokenType: tokens?.token_type,
    expiryDate: tokens?.expiry_date,
  });

  if (!tokens) {
    throw new Error("Instructor has not connected Google Calendar");
  }

  /**
   * Strongly recommended: require refresh_token for long-term operation.
   * If you want to allow a short-lived access_token-only connection, remove this check.
   */
  if (!tokens.refresh_token) {
    throw new Error("Instructor connected but missing refresh token (re-consent required)");
  }

  const oauth = new google.auth.OAuth2(clientId, clientSecret, `${baseUrl}/api/google/callback`);
  oauth.setCredentials(tokens);

  const calendar = google.calendar({ version: "v3", auth: oauth });

  return { calendar, oauth, tokens };
}
