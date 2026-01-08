"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, getCurrentUser } from "aws-amplify/auth";
import { useEffect, useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        await getCurrentUser({});
        setIsAuthed(true);
      } catch {
        setIsAuthed(false);
      }
    }

    checkAuth();
  }, []);

  async function handleLogout() {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  const navLinkStyle = {
    color: "white",
    textDecoration: "none",
    fontWeight: 500,
    cursor: "pointer",
    opacity: 0.9,
  } as const;

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background:
          "linear-gradient(180deg, rgba(11,11,14,0.96), rgba(11,11,14,0.88))",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--mdc-border)",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0.75rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo + Nonprofit */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            textDecoration: "none",
            color: "white",
          }}
        >
          <Image
            src="/mdc-logo.png"
            alt="March Drum Corps"
            width={44}
            height={44}
            priority
          />

          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 600 }}>
              March Drum Corps
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--mdc-muted)",
                border: "1px solid var(--mdc-border)",
                padding: "0.1rem 0.45rem",
                borderRadius: "999px",
                marginTop: "0.25rem",
                display: "inline-block",
              }}
            >
              501(c)(3) Nonprofit
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.25rem",
          }}
        >
          <Link href="/pricing" style={navLinkStyle}>
            Pricing
          </Link>

          <Link href="/apply" style={navLinkStyle}>
            Apply
          </Link>

          {isAuthed === false && (
            <>
              <Link href="/login" style={navLinkStyle}>
                Login
              </Link>
              <Link href="/signup">
                <button className="primary">Sign Up</button>
              </Link>
            </>
          )}

          {isAuthed === true && (
            <span
              role="button"
              tabIndex={0}
              style={navLinkStyle}
              onClick={handleLogout}
            >
              Logout
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
