import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(req: Request) {
  try {
    const { start, end, lessonLength } = await req.json();

    if (!start || !end || !lessonLength) {
      return NextResponse.json(
        { error: "Missing booking info" },
        { status: 400 }
      );
    }

    // Pricing (USD)
    const price =
      lessonLength === 60 ? 6000 : 2500; // $60 / $25

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${lessonLength}-Minute Lesson`,
              description: new Date(start).toLocaleString(),
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/student/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/student`,
      metadata: {
        start,
        end,
        lessonLength: String(lessonLength),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
