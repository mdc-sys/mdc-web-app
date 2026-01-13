import Stripe from "stripe";
import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

export const runtime = "nodejs"; // Stripe signature verification requires Node runtime

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Omit apiVersion to avoid SDK/type mismatches.
});

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function POST(req: Request) {
  console.log("🔥 Stripe webhook hit");

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // IMPORTANT: must be raw text for signature verification
    const rawBody = await req.text();

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Missing STRIPE_WEBHOOK_SECRET" },
        { status: 500 }
      );
    }

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );

    console.log("Event type:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const bookingId =
        (typeof session.client_reference_id === "string" &&
        session.client_reference_id.trim().length > 0
          ? session.client_reference_id.trim()
          : null) ||
        (typeof session.metadata?.bookingId === "string" &&
        session.metadata.bookingId.trim().length > 0
          ? session.metadata.bookingId.trim()
          : null);

      console.log("Resolved bookingId:", bookingId);

      if (!bookingId) {
        return NextResponse.json(
          {
            error:
              "checkout.session.completed missing bookingId (client_reference_id or metadata.bookingId)",
          },
          { status: 400 }
        );
      }

      const bookingsTable = process.env.DDB_BOOKINGS_TABLE || "MDC_Bookings";

      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      try {
        await ddb.send(
          new UpdateCommand({
            TableName: bookingsTable,
            Key: { bookingId }, // ✅ partition key
            // Optional but recommended: fail loudly if booking doesn't exist
            ConditionExpression: "attribute_exists(bookingId)",
            UpdateExpression:
              "SET #status = :paid, stripeSessionId = :sid, stripePaymentIntentId = :pi, paidAt = :now",
            ExpressionAttributeNames: {
              "#status": "status",
            },
            ExpressionAttributeValues: {
              ":paid": "PAID",
              ":sid": session.id,
              ":pi": paymentIntentId,
              ":now": new Date().toISOString(),
            },
          })
        );

        console.log("✅ Booking updated to PAID in DynamoDB");
      } catch (ddbErr) {
        console.error("❌ DynamoDB update failed:", ddbErr);
        throw ddbErr;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Stripe webhook error:", err);
    return NextResponse.json(
      { error: err?.message || "Webhook failed" },
      { status: 400 }
    );
  }
}
