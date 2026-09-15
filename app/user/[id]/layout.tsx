import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Public profile",
  description: "View a public creative professional profile on WeEverything.",
};

export default function PublicProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
