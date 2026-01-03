"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import { useRouter } from "next/navigation";

type Role = "student" | "instructor" | "admin";

export default function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const attributes = await fetchUserAttributes();
        const userRole =
          attributes["custom:role"] as Role | undefined;

        if (userRole !== role) {
          router.push("/");
          return;
        }

        setLoading(false);
      } catch {
        router.push("/login");
      }
    }

    checkRole();
  }, [role, router]);

  if (loading) {
    return (
      <main>
        <p>Checking access…</p>
      </main>
    );
  }

  return <>{children}</>;
}
