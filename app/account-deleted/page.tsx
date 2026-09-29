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
        <section className="w-full max-w-xl pt-5">
          <p className="mono text-sm font-medium uppercase tracking-tight text-[#1c40f2]">
            Account deletion scheduled
          </p>
          <h1 className="mt-4 text-3xl geist leading-10 font-semibold tracking-tighter sm:text-5xl">
            Your account is on its way out.
          </h1>
          <p className="mt-4 max-w-lg geist text-base leading-4 font-medium tracking-tight  text-[#999]">
            You have been signed out. We will keep your account and data for 30
            days before permanently deleting it. Your profile is no longer
            visible in the directory during this period.
          </p>
          <Link
            href="/"
            className="mt-8 mono inline-flex rounded-full bg-black px-3 py-1 uppercase text-sm font-medium text-white transition hover:bg-[#1c40f2]"
          >
            Return home
          </Link>
        </section>
      </main>
    </div>
  );
};

export default AccountDeletedPage;
