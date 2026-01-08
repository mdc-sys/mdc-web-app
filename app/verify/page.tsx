"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmSignUp, resendSignUpCode } from "aws-amplify/auth";

export default function VerifyPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔑 Auto-fill email from signup
  useEffect(() => {
    const storedEmail = localStorage.getItem("pendingVerifyEmail");
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });

      localStorage.removeItem("pendingVerifyEmail");
      router.replace("/login");
    } catch (err: any) {
      console.error("VERIFY ERROR", err);

      if (err?.name === "CodeMismatchException") {
        setError("Incorrect verification code.");
      } else if (err?.name === "ExpiredCodeException") {
        setError("Verification code expired. Please resend.");
      } else if (err?.message?.includes("username")) {
        setError("Email is required. Please re-enter your email.");
      } else {
        setError(err?.message || "Verification failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setMessage(null);

    try {
      await resendSignUpCode({ username: email });
      setMessage("Verification code resent.");
    } catch (err: any) {
      console.error("RESEND ERROR", err);
      setError(err?.message || "Could not resend code.");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "2rem",
          borderRadius: "12px",
          border: "1px solid var(--mdc-border)",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(12px)",
        }}
      >
        <h1 style={{ marginBottom: "0.5rem" }}>Verify Your Email</h1>
        <p style={{ color: "var(--mdc-muted)", marginBottom: "1.5rem" }}>
          Enter the verification code sent to your email.
        </p>

        {/* EMAIL */}
        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.25rem",
              fontSize: "0.9rem",
              color: "var(--mdc-muted)",
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            style={{
              width: "100%",
              padding: "0.6rem",
              borderRadius: "6px",
              border: "1px solid var(--mdc-border)",
              background: "#222",
              color: "#aaa",
              cursor: "not-allowed",
            }}
          />
        </div>

        {/* VERIFICATION CODE */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.25rem",
              fontSize: "0.9rem",
            }}
          >
            Verification Code
          </label>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem",
              borderRadius: "6px",
              border: "1px solid var(--mdc-border)",
              background: "#111",
              color: "white",
            }}
          />
        </div>

        {error && (
          <p style={{ color: "#ff6b6b", marginBottom: "1rem" }}>
            {error}
          </p>
        )}

        {message && (
          <p style={{ color: "#4ade80", marginBottom: "1rem" }}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="primary"
          style={{ width: "100%", marginBottom: "0.75rem" }}
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            color: "var(--mdc-accent)",
            cursor: "pointer",
          }}
        >
          Resend code
        </button>
      </form>
    </main>
  );
}
