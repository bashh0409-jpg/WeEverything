import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to create and manage your WeEverything profile.",
};

export default function SignInLayout({ children }: { children: ReactNode }) {
  return children;
}
