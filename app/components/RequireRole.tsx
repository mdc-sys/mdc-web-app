"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  fetchUserAttributes,
} from "aws-amplify/auth";

type Role = "student" | "instructor";

export default function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        // 1️⃣ Must have an authenticated session
        await getCurrentUser({});

        // 2️⃣ Fetch attributes
        const attributes = await fetchUserAttributes();

        // 3️⃣ Must have verified email
        if (attributes.email_verified !== "true") {
          router.replace("/verify");
          return;
        }

        const userRole = attributes["custom:role"];

        // 4️⃣ Enforce role
        if (userRole !== role) {
          router.replace(
            userRole === "instructor" ? "/instructor" : "/student"
          );
          return;
        }

        // ✅ Access granted
        setChecking(false);
      } catch {
        // ❌ Not logged in
        router.replace("/login");
      }
    }

    checkAuth();
  }, [role, router]);

  // Optional loading state (prevents flash)
  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--mdc-muted)",
        }}
      >
        Checking access…
      </div>
    );
  }

  return <>{children}</>;
}
