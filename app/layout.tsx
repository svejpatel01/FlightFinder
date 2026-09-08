import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlightFinder — weekend deal watcher",
  description:
    "Watches cheap round-trip weekend flights and emails you when a price drops below budget or 30%+ below its recent average.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
