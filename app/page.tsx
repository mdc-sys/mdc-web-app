"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { redirectByRole } from "./lib/redirectByRole";
import { getCurrentUser } from "aws-amplify/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    async function check() {
      try {
        await getCurrentUser();
        await redirectByRole(router);
      } catch {
        // Not logged in → stay on landing page
      }
    }

    check();
  }, [router]);

  return (
    <main style={{ textAlign: "center", paddingTop: 120 }}>
      <h1>March Drum Corps</h1>
      <p>Online lessons and scholarships for marching musicians.</p>

      <div style={{ marginTop: 24 }}>
        <button onClick={() => router.push("/signup")}>
          Get Started
        </button>
      </div>
    </main>
  );
}
