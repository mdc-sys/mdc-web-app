"use client";

import { useState } from "react";
import { confirmSignUp } from "aws-amplify/auth";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });

      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "80px auto" }}>
      <h1>Verify Your Email</h1>
      <p>
        Enter the verification code sent to your email address.
      </p>

      <form onSubmit={handleVerify}>
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", marginBottom: 12 }}
        />

        <input
          type="text"
          placeholder="Verification Code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ width: "100%", marginBottom: 12 }}
        />

        {error && (
          <p style={{ color: "red", marginBottom: 12 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%" }}
        >
          {loading ? "Verifying..." : "Verify Account"}
        </button>
      </form>
    </main>
  );
}
