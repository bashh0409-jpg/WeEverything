import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page could not be found.",
};

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <div className="min-h-screen bg-white text-black flex items-center justify-center p-4">
        <div className="text-center items-center flex  flex-col gap-2 max-w-md">
          <p className="mon geist  max-w-xs text-center  overflow-hidden text-xl font-semibold tracking-tighter text-black ">
            404
          </p>
          <p className="mon geist -mt-4  max-w-xs text-center  overflow-hidden text-xl font-semibold tracking-tighter text-black mb-2 ">
            Page not found
          </p>

          <p className="geist  max-w-xs text-center  overflow-hidden text-[13px] font-semibold leading-3 tracking-tight text-[#999]">
            Sorry, we couldn&apos;t find that page. The page you&apos;re looking
            for isn&apos;t here. Let&apos;s get you back to discovering people
            doing good work.
          </p>

          <Link
            href="/"
            className="w-fit  geist capitalize max-h-7 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere]"
          >
            close
          </Link>
        </div>
      </div>
    </main>
  );
}
