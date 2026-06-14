import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transport Management MVP",
  description: "AI-first transport procurement SaaS MVP"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
