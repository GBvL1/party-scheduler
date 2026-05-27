import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Party Scheduler",
  description: "Find the best date for your party",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50">
        {children}
      </body>
    </html>
  );
}
