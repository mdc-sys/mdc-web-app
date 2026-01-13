"use client";

import Link from "next/link";

type InstructorCard = {
  instructorId: string;
  name: string;
  instrument?: string;
  title?: string;
  bio?: string;
};

export default function StudentPage() {
  // MVP: hardcode one instructor.
  // Later: fetch from DynamoDB or a "public instructors" endpoint.
  const instructors: InstructorCard[] = [
    {
      instructorId: "inst-001",
      name: "MDC Instructor",
      instrument: "Marching Arts",
      title: "Private Lessons",
      bio: "Book a lesson using the instructor’s MDC availability. Google Calendar may optionally block conflicts.",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Student Dashboard</h1>
          <p className="text-white/70">
            Choose an instructor to view available lesson times and book a session.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Instructors</h2>
            <span className="text-xs text-white/60">
              {instructors.length} available
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {instructors.map((i) => (
              <div
                key={i.instructorId}
                className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-lg font-semibold">{i.name}</div>
                    <div className="text-sm text-white/70">
                      {i.title}
                      {i.instrument ? ` • ${i.instrument}` : ""}
                    </div>
                  </div>

                  <Link
                    href={`/student/book/${encodeURIComponent(i.instructorId)}`}
                    className="shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white text-black font-medium hover:opacity-90"
                  >
                    Book
                  </Link>
                </div>

                {i.bio && <p className="text-sm text-white/70">{i.bio}</p>}

                <div className="text-xs text-white/50">
                  Instructor ID: <span className="font-mono">{i.instructorId}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
          <h3 className="text-base font-medium">What happens next?</h3>
          <p className="text-sm text-white/70">
            After selecting an instructor, you’ll choose a date, select an available time,
            and continue to payment.
          </p>
        </section>
      </div>
    </main>
  );
}
