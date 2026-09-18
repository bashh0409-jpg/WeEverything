import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import SmoothScroll from "@/components/SmoothScroll";
import OpenToWorkTicker from "@/app/components/OpenToWorkTicker";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import BottomStrip from "./components/BottomStrip";
import StartupScreen from "./components/StartupScreen";
import CookieConsent from "./components/CookieConsent";

const localSans = localFont({
  src: "../public/font/K2FzfZNHj_FHBmRbFvHDJaqlLSj6ZQ.woff2",
  variable: "--font-local-sans",
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "WeEverything | Creative talent directory",
    template: "%s | WeEverything",
  },
  description:
    "Discover developers, designers, photographers, illustrators, and other creative professionals for your next project.",
  applicationName: "WeEverything",
  openGraph: {
    siteName: "WeEverything",
    title: "WeEverything | Creative talent directory",
    description:
      "Discover and connect with creative professionals for your next project.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${localSans.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SmoothScroll />
        <SpeedInsights />
        <OpenToWorkTicker />
        <BottomStrip />
        <StartupScreen />
        <CookieConsent />
        {children}
      </body>
    </html>
  );
}
 