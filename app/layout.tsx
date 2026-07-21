import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { leadSummaries } from "@/lib/runtime-data";
import "./globals.css";
import "./company.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Que Media Intelligence",
    template: "%s | Que Media Intelligence",
  },
  description:
    "Evidence-first business intelligence and outreach preparation for Que Media.",
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f9f8f6",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const companies = leadSummaries.map(({ id, name, industry, neighborhood }) => ({ id, name, industry, neighborhood }));
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body>
        <AppShell companies={companies}>{children}</AppShell>
      </body>
    </html>
  );
}
