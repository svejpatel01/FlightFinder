import type { Metadata } from "next";
import "./globals.css";
import { getSessionUser } from "@/lib/auth";
import Nav from "./nav";

export const metadata: Metadata = {
  title: "FlightFinder — weekend deal watcher",
  description:
    "Watches cheap round-trip weekend flights and emails you when a price drops below budget or well below its recent average.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  return (
    <html lang="en">
      <body>
        <Nav email={user?.email ?? null} />
        {children}
      </body>
    </html>
  );
}
