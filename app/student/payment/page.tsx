"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function PaymentPage() {
  const params = useSearchParams();
  const bookingId = params.get("id");
  const lengthParam = params.get("length");

  const length = lengthParam === "60" ? 60 : 30;
  const price = length === 60 ? 60 : 25;

  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function payNow() {
    if (!bookingId) {
      setError("Missing booking information.");
      return;
    }

    setIsPaying(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, length }),
      });

      if (!res.ok) {
        setError("Unable to start checkout.");
        setIsPaying(false);
        return;
      }

      const data = await res.json();
      window.location.href = data.url;
    } catch {
      setError("Network error.");
      setIsPaying(false);
    }
  }

  return (
    <main>
      <h1>Secure Checkout</h1>
      <p>Powered by Stripe</p>

      <div className="card">
        <p>Lesson Length</p>
        <h3>{length} Minutes</h3>

        <p>Total</p>
        <h1>${price}</h1>

        <button
          className="primary"
          style={{ width: "100%", marginTop: "1.5rem" }}
          disabled={isPaying}
          onClick={payNow}
        >
          {isPaying ? "Redirecting to Stripe…" : "Pay with Card"}
        </button>

        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}
