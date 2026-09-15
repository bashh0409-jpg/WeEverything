
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sponsorship successful",
  description: "Your WeEverything profile sponsorship was successful.",
  robots: { index: false, follow: false },
};


export default async function BillingSuccess() {

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-xl uppercase tracking-tight mono mb-2">
          Sponsorship successful!
        </h1>

        <p className="mt-2 font-mono tracking-tight uppercase text-black/60">
          Thanks for supporting WeEverything. Your sponsorship payment was
          received successfully.
        </p>

      </div>
    </div>
  );
}
