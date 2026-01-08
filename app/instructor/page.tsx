"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function InstructorPage() {
  const params = useSearchParams();
  const connected = params.get("connected");
  const error = params.get("error");

  const [loading, setLoading] = useState(false);

  async function connectGoogle() {
    try {
      setLoading(true);

      // 🔁 Ask server to start OAuth flow
      const res = await fetch("/api/google/connect");

      if (!res.ok) {
        throw new Error("Failed to start Google OAuth");
      }

      const data = await res.json();

      if (!data.url) {
        throw new Error("Missing OAuth URL");
      }

      // 👉 Redirect to Google consent screen
      window.location.href = data.url;
    } catch (err) {
      console.error("CONNECT GOOGLE ERROR:", err);
      alert("Failed to connect Google Calendar");
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "720px" }}>
      <h1>Instructor Dashboard</h1>

      {connected === "true" && (
        <p style={{ color: "#4ade80", marginTop: "1rem" }}>
          ✅ Google Calendar connected successfully
        </p>
      )}

      {error && (
        <p style={{ color: "#ff6b6b", marginTop: "1rem" }}>
          ❌ Calendar connection failed
        </p>
      )}

      <button
        onClick={connectGoogle}
        disabled={loading}
        style={{
          marginTop: "1.5rem",
          padding: "0.75rem 1.25rem",
          borderRadius: "8px",
          background: "linear-gradient(135deg, #8b1c3d, #5a2ca0)",
          color: "white",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Connecting…" : "Connect Google Calendar"}
      </button>
    </main>
  );
}
