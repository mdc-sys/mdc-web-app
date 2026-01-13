"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type AvailabilityRulesResponse = {
  instructorId: string;
  timezone?: string;
  weekly?: Array<{ day: number; start: string; end: string }>;
  updatedAt?: string;
};

function friendlyCallbackError(code: string) {
  switch (code) {
    case "no_code":
      return "Google didn’t return an authorization code. Please try connecting again.";
    case "missing_state":
      return "Missing instructor identifier during Google connect. Please try again.";
    case "missing_google_env":
      return "Google integration is not configured correctly (missing env vars).";
    case "missing_refresh_token":
      return "Google connected, but offline access wasn’t granted. Please reconnect and approve access.";
    case "callback_exception":
      return "Google connection failed. Please try again.";
    default:
      return `Google connection failed (${code}).`;
  }
}

export default function InstructorPage() {
  const params = useSearchParams();

  // MVP: hardcode; later derive from logged-in user profile/custom attribute
  const instructorId = "inst-001";

  const connected = params.get("connected"); // "true" when callback redirects with connected=true
  const error = params.get("error"); // error code from callback

  const [connecting, setConnecting] = useState(false);

  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [weeklyCount, setWeeklyCount] = useState<number | null>(null);
  const [rulesTimezone, setRulesTimezone] = useState<string | null>(null);

  const banner = useMemo(() => {
    if (connected === "true") {
      return { type: "success" as const, text: "Google Calendar connected successfully." };
    }
    if (error) {
      return { type: "error" as const, text: friendlyCallbackError(error) };
    }
    return null;
  }, [connected, error]);

  useEffect(() => {
    let cancelled = false;

    async function loadRules() {
      setRulesLoading(true);
      setRulesError(null);

      try {
        const res = await fetch(
          `/api/instructor/${encodeURIComponent(instructorId)}/availability-rules`,
          { cache: "no-store" }
        );

        if (res.status === 404) {
          if (!cancelled) {
            setWeeklyCount(0);
            setRulesTimezone(null);
          }
          return;
        }

        if (!res.ok) throw new Error("Failed to load availability.");

        const data = (await res.json()) as AvailabilityRulesResponse;

        if (!cancelled) {
          const count = Array.isArray(data.weekly) ? data.weekly.length : 0;
          setWeeklyCount(count);
          setRulesTimezone(data.timezone ?? null);
        }
      } catch (e: any) {
        if (!cancelled) setRulesError(e?.message ?? "Unable to load availability.");
      } finally {
        if (!cancelled) setRulesLoading(false);
      }
    }

    loadRules();

    return () => {
      cancelled = true;
    };
  }, [instructorId]);

  function connectGoogle() {
    setConnecting(true);
    // Redirect-based OAuth start
    window.location.href = `/api/google/connect?instructorId=${encodeURIComponent(instructorId)}`;
  }

  const availabilityStatus =
    weeklyCount === null
      ? { label: "Unknown", tone: "neutral" as const }
      : weeklyCount > 0
      ? { label: `Set (${weeklyCount} block${weeklyCount === 1 ? "" : "s"})`, tone: "good" as const }
      : { label: "Not set", tone: "warn" as const };

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Instructor Dashboard</h1>
          <p className="text-white/70">
            Set your weekly availability in MDC (required to be bookable). Google Calendar is optional to block conflicts.
          </p>
        </header>

        {banner && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              banner.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                : "bg-red-500/10 border-red-500/30 text-red-200"
            }`}
          >
            {banner.text}
            {error && (
              <div className="text-white/60 mt-1">
                Code: <span className="font-mono">{error}</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Availability card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Availability</h2>
              <span
                className={`text-xs px-2 py-1 rounded-full border ${
                  availabilityStatus.tone === "good"
                    ? "border-emerald-400/30 text-emerald-200 bg-emerald-500/10"
                    : availabilityStatus.tone === "warn"
                    ? "border-yellow-400/30 text-yellow-200 bg-yellow-500/10"
                    : "border-white/15 text-white/70 bg-white/5"
                }`}
              >
                {rulesLoading ? "Loading…" : availabilityStatus.label}
              </span>
            </div>

            {rulesTimezone && (
              <div className="text-sm text-white/60">
                Timezone: <span className="text-white/80">{rulesTimezone}</span>
              </div>
            )}

            {rulesError && (
              <div className="text-sm text-red-200 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                {rulesError}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/instructor/availability"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:border-white/30"
              >
                Set Availability
              </Link>

              <Link
                href={`/student/book/${encodeURIComponent(instructorId)}`}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:border-white/30"
              >
                Preview Booking Page
              </Link>
            </div>

            <div className="text-xs text-white/50">
              Students will only see times inside your MDC availability blocks.
            </div>
          </div>

          {/* Google integration card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <h2 className="text-lg font-medium">Google Calendar (optional)</h2>

            <p className="text-sm text-white/70">
              Connect Google Calendar to subtract busy events and reduce double-booking risk. If you don’t use Google Calendar,
              you can still be bookable using MDC availability.
            </p>

            <button
              onClick={connectGoogle}
              disabled={connecting}
              className="w-full px-4 py-2.5 rounded-xl font-medium bg-white text-black disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {connecting ? "Redirecting…" : "Connect Google Calendar"}
            </button>

            <div className="text-xs text-white/50">
              Note: If you previously authorized this app, Google may not return a refresh token again. If you see an offline access
              error, revoke access and reconnect.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-white/70">
            Next steps you can add here later: upcoming lessons, cancellations, profile/pricing, payout settings, and a “test availability”
            widget for debugging.
          </div>
        </div>
      </div>
    </main>
  );
}
