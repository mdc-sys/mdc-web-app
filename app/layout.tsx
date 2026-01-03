import "./globals.css";
import AmplifyClient from "./components/AmplifyClient";
import Navbar from "./components/Navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Initializes AWS Amplify in the browser */}
        <AmplifyClient />

        {/* Global navigation (always visible) */}
        <Navbar />

        {/* Page content */}
        {children}
      </body>
    </html>
  );
}
