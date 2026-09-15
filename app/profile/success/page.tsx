
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment successful",
  description: "Your WeEverything subscription has been activated.",
  robots: { index: false, follow: false },
};


export default async function BillingSuccess() {

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-xl uppercase tracking-tight mono mb-2">
          Payment Successful!
        </h1>

        <p className="mt-2 font-mono tracking-tight uppercase text-black/60">
          Your <span className=" text-black"></span> subscription has
          been activated. You now have access to all premium features.
        </p>

      </div>
    </div>
  );
}
