import type { Metadata } from "next";
import { Anton, Archivo, DM_Mono } from "next/font/google";
import "./globals.css";
import Nav from "./nav";
import DummyDataBanner from "./dummy-data-banner";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Notiflyer — weekend deal watcher",
  description:
    "Watches cheap round-trip weekend flights and emails you when a price drops below budget or well below its recent average. Part of svej.org.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anton.variable} ${archivo.variable} ${dmMono.variable}`}>
      <body>
        <DummyDataBanner />
        <Nav />
        {children}
      </body>
    </html>
  );
}
