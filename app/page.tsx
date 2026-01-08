"use client";

import { useRouter } from "next/navigation";
import { getCurrentUser } from "aws-amplify/auth";

export default function HomePage() {
  const router = useRouter();

  async function handleGetStarted() {
    try {
      // Logged in → let server decide role
      await getCurrentUser({});
      router.push("/redirect");
    } catch {
      // Not logged in
      router.push("/signup");
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
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "640px" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
          March Drum Corps
        </h1>

        <p
          style={{
            fontSize: "1.125rem",
            color: "var(--mdc-muted)",
            marginBottom: "2rem",
          }}
        >
          Online music lessons and instruction for marching band and drum corps
          students.
        </p>

        <button
          onClick={handleGetStarted}
          className="primary"
          style={{
            padding: "0.9rem 2rem",
            fontSize: "1rem",
            borderRadius: "10px",
          }}
        >
          Get Started
        </button>
      </div>
    </main>
  );
}
