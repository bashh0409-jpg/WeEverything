import Link from "next/link";
import type { Metadata } from "next";
import BottomButton from "../components/BottomButton";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "Account deletion scheduled",
  description: "Your WeEverything account deletion has been scheduled.",
  robots: { index: false, follow: false },
};

const AccountDeletedPage = () => {
  return (
    <div>
      <Navbar />

      <main className="flex min-h-screen items-center justify-center px-6 py-24 text-black">
        <div className="text-center items-center flex  flex-col gap-2 max-w-md">
          <p className="mon geist  max-w-xs text-center  overflow-hidden text-xl font-semibold tracking-tighter text-black mb-2 ">
            Your account is on its way out.
          </p>

          <p className="geist  max-w-xs text-center  overflow-hidden text-[13px] font-semibold leading-3 tracking-tight text-[#999]">
            Your profile is hidden and your account is scheduled for permanent
            deletion in 30 days. Sign in with the same email address before then
            to cancel deletion and restore your account.
          </p>

          <Link
            href="/signin"
            className="w-fit  geist capitalize max-h-7 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere]"
          >
            restore account
          </Link>
        </div>
      </main>
    </div>
  );
};

export default AccountDeletedPage;
