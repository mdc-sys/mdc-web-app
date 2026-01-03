"use client";

import RequireRole from "../components/RequireRole";

export default function InstructorDashboardPage() {
  return (
    <RequireRole role="instructor">
      <main>
        <h1>Instructor Dashboard</h1>
        <p>
          Manage your availability, view upcoming lessons,
          and track your teaching activity.
        </p>

        <div className="card">
          <h3>Coming Soon</h3>
          <p>
            This dashboard will allow you to:
          </p>
          <ul>
            <li>Set weekly availability</li>
            <li>Sync with Google Calendar</li>
            <li>View booked lessons</li>
            <li>Track payouts</li>
          </ul>
        </div>
      </main>
    </RequireRole>
  );
}
