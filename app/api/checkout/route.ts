import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover" as Stripe.LatestApiVersion,
});

export async function POST(req: Request) {
  let bookingId: unknown;
  let length: unknown;

  try {
    const body = await req.json();
    bookingId = body?.bookingId;
    length = body?.length;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (typeof bookingId !== "string" || bookingId.trim().length === 0) {
    return NextResponse.json(
      { error: "bookingId is required" },
      { status: 400 }
    );
  }

  const priceMap: Record<number, number> = {
    30: 2500,
    60: 6000,
  };

  const price = priceMap[Number(length)];

  if (!price) {
    return NextResponse.json(
      { error: "Unsupported lesson length" },
      { status: 400 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? req.headers.get("origin");

  if (!baseUrl) {
    return NextResponse.json(
      { error: "Base URL is not configured" },
      { status: 500 }
    );
  }

  // Server-trusted pricing (in cents)

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `MDC Lesson (${length} min)`,
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/student/confirmation?bookingId=${encodeURIComponent(
        bookingId
      )}`,
      cancel_url: `${baseUrl}/student`,
      metadata: {
        bookingId,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout session missing redirect URL" },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
