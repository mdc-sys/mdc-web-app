"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "aws-amplify/auth";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "instructor">("student");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // 🔎 sanity check (leave this in while testing)
    console.log("SIGNUP PAYLOAD", {
      email,
      role,
      roleType: typeof role,
    });

    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            "custom:role": role, // MUST be a string
          },
        },
      });

      // Cognito Hosted UI / email confirmation step
      router.push("/login");
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || "Signup failed");
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
        <h1 style={{ marginBottom: "0.5rem" }}>Create an Account</h1>
        <p style={{ color: "var(--mdc-muted)", marginBottom: "1.5rem" }}>
          Sign up to book or teach lessons with March Drum Corps.
        </p>

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

        <label>Account Type</label>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          <button
            type="button"
            onClick={() => setRole("student")}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "8px",
              border:
                role === "student"
                  ? "2px solid var(--mdc-accent)"
                  : "1px solid var(--mdc-border)",
              background:
                role === "student"
                  ? "linear-gradient(135deg, #8b1c3d, #5a2ca0)"
                  : "transparent",
              color: "white",
            }}
          >
            Student
          </button>

          <button
            type="button"
            onClick={() => setRole("instructor")}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "8px",
              border:
                role === "instructor"
                  ? "2px solid var(--mdc-accent)"
                  : "1px solid var(--mdc-border)",
              background:
                role === "instructor"
                  ? "linear-gradient(135deg, #8b1c3d, #5a2ca0)"
                  : "transparent",
              color: "white",
            }}
          >
            Instructor
          </button>
        </div>

        {error && (
          <p style={{ color: "#ff6b6b", marginBottom: "1rem" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="primary"
          style={{ width: "100%" }}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>
    </main>
  );
}
