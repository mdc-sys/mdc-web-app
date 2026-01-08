"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RequireRole from "../../components/RequireRole";

type LessonLength = 30 | 60;

export default function BookLessonPage() {
  const router = useRouter();

  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);
  const [lessonLength, setLessonLength] = useState<LessonLength | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const canContinue =
    selectedInstructor && lessonLength && selectedTime;

  return (
    <RequireRole role="student">
      <main
        style={{
          minHeight: "100vh",
          padding: "2.5rem",
        }}
      >
        <h1 style={{ marginBottom: "0.5rem" }}>
          Book a Lesson
        </h1>

        <p
          style={{
            color: "var(--mdc-muted)",
            marginBottom: "2rem",
            maxWidth: "700px",
          }}
        >
          Choose an instructor, lesson length, and time. Lessons are conducted
          online via Google Meet.
        </p>

        {/* STEP 1 — INSTRUCTOR */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>
            1. Choose an Instructor
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1rem",
              maxWidth: "900px",
            }}
          >
            {["John Doe", "Jane Smith", "Alex Johnson"].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedInstructor(name)}
                style={{
                  padding: "1.25rem",
                  borderRadius: "14px",
                  border:
                    selectedInstructor === name
                      ? "2px solid var(--mdc-accent)"
                      : "1px solid var(--mdc-border)",
                  background:
                    selectedInstructor === name
                      ? "linear-gradient(135deg, #8b1c3d, #5a2ca0)"
                      : "rgba(0,0,0,0.55)",
                  color: "white",
                  textAlign: "left",
                }}
              >
                <strong>{name}</strong>
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--mdc-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  Brass & marching fundamentals
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* STEP 2 — LESSON LENGTH */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>
            2. Lesson Length
          </h2>

          <div style={{ display: "flex", gap: "1rem" }}>
            {[30, 60].map((length) => (
              <button
                key={length}
                type="button"
                onClick={() => setLessonLength(length as LessonLength)}
                style={{
                  padding: "1rem 1.5rem",
                  borderRadius: "12px",
                  border:
                    lessonLength === length
                      ? "2px solid var(--mdc-accent)"
                      : "1px solid var(--mdc-border)",
                  background:
                    lessonLength === length
                      ? "linear-gradient(135deg, #8b1c3d, #5a2ca0)"
                      : "transparent",
                  color: "white",
                }}
              >
                {length} Minutes
              </button>
            ))}
          </div>
        </section>

        {/* STEP 3 — TIME (PLACEHOLDER) */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>
            3. Select a Time
          </h2>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              maxWidth: "600px",
            }}
          >
            {[
              "Mon 4:00 PM",
              "Tue 6:30 PM",
              "Wed 5:00 PM",
              "Thu 7:00 PM",
            ].map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setSelectedTime(time)}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  border:
                    selectedTime === time
                      ? "2px solid var(--mdc-accent)"
                      : "1px solid var(--mdc-border)",
                  background:
                    selectedTime === time
                      ? "linear-gradient(135deg, #8b1c3d, #5a2ca0)"
                      : "transparent",
                  color: "white",
                }}
              >
                {time}
              </button>
            ))}
          </div>

          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "0.85rem",
              color: "var(--mdc-muted)",
            }}
          >
            Availability will be pulled from instructor Google Calendars.
          </p>
        </section>

        {/* CONTINUE */}
        <button
          disabled={!canContinue}
          onClick={() => router.push("/student/checkout")}
          className="primary"
          style={{
            padding: "1rem 2rem",
            opacity: canContinue ? 1 : 0.5,
            cursor: canContinue ? "pointer" : "not-allowed",
          }}
        >
          Continue to Checkout
        </button>
      </main>
    </RequireRole>
  );
}
