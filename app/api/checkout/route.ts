export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Omit apiVersion to avoid SDK/type mismatches.
});

function toISOIfPossible(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    /**
     * Support BOTH request shapes:
     * A) Legacy: { start, end, lessonLength }
     * B) Current UI: { bookingId, length }
     */
    const bookingId =
      typeof body?.bookingId === "string" && body.bookingId.trim().length > 0
        ? body.bookingId.trim()
        : null;

    // IMPORTANT: bookingId is REQUIRED for webhook → DynamoDB updates
    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing bookingId for checkout." },
        { status: 400 }
      );
    }

    const lessonLengthRaw = body?.lessonLength ?? body?.length;
    const lessonLength = Number(lessonLengthRaw);

    if (![30, 60].includes(lessonLength)) {
      return NextResponse.json(
        { error: "Invalid lesson length (must be 30 or 60)." },
        { status: 400 }
      );
    }

    // Optional start/end (legacy flow). If present, include in description + metadata.
    const startISO = toISOIfPossible(body?.start);
    const endISO = toISOIfPossible(body?.end);

    // Pricing (USD cents): 30 min = $25, 60 min = $40
    const unitAmount = lessonLength === 60 ? 4000 : 2500;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_BASE_URL is missing." },
        { status: 500 }
      );
    }

    const description = startISO
      ? new Date(startISO).toLocaleString()
      : `Booking ${bookingId}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      // Canonical Stripe reference → used by webhook
      client_reference_id: bookingId,

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${lessonLength}-Minute Lesson`,
              description,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/student/success`,
      cancel_url: `${baseUrl}/student`,
      metadata: {
        bookingId,
        ...(startISO ? { start: startISO } : {}),
        ...(endISO ? { end: endISO } : {}),
        lessonLength: String(lessonLength),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err?.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
