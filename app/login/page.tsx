"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "aws-amplify/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn({
        username: email,
        password,
      });

      console.log("SIGN IN RESULT", result);

      // 🚨 If not fully signed in, user MUST verify email
      if (!result.isSignedIn) {
        window.location.href = "/verify";
        return;
      }

      // If sign-in completes, route to home (Get Started will route correctly)
      router.replace("/redirect");

    } catch (err: any) {
      console.error("LOGIN ERROR", err);

      if (err?.name === "UserNotConfirmedException") {
        window.location.href = "/verify";
      } else if (err?.name === "NotAuthorizedException") {
        setError("Incorrect email or password.");
      } else {
        setError(err?.message || "Login failed");
      }
    } finally {
      setLoading(false);
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
        <h1>Log In</h1>

        <label>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", marginBottom: "1rem" }}
        />

        <label>Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", marginBottom: "1.5rem" }}
        />

        {error && (
          <p style={{ color: "#ff6b6b", marginBottom: "1rem" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>
    </main>
  );
}
