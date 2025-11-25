import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MCO2",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen w-screen bg-gray-100">{children}</body>
    </html>
  );
}
