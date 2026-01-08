"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";

export default function RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function runRedirect() {
      try {
        // Client-side auth check
        await getCurrentUser({});

        const attributes = await fetchUserAttributes();
        const role = attributes["custom:role"];

        if (role === "instructor") {
          router.replace("/instructor");
        } else {
          router.replace("/student");
        }
      } catch {
        // Not logged in
        router.replace("/login");
      }
    }

    runRedirect();
  }, [router]);

  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <p>Redirecting…</p>
    </main>
  );
}
