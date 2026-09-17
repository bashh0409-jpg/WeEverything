"use client";

import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { useSyncExternalStore } from "react";

const consentStorageKey = "weeverything-cookie-consent";

type ConsentChoice = "accepted" | "rejected";

const getStoredChoice = (): ConsentChoice | null => {
  const storedChoice = window.localStorage.getItem(consentStorageKey);

  return storedChoice === "accepted" || storedChoice === "rejected"
    ? storedChoice
    : null;
};

const subscribeToChoice = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(consentStorageKey, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(consentStorageKey, onChange);
  };
};

const CookieConsent = () => {
  const choice = useSyncExternalStore(
    subscribeToChoice,
    getStoredChoice,
    () => null,
  );

  const saveChoice = (nextChoice: ConsentChoice) => {
    window.localStorage.setItem(consentStorageKey, nextChoice);
    window.dispatchEvent(new Event(consentStorageKey));
  };

  return (
    <>
      {choice === "accepted" ? <Analytics /> : null}

      {choice === null ? (
        <aside
          aria-label="Cookie consent"
          className="fixed inset-x-4 bottom-4  z-[60] border border-black/15 bg-white p-4 shadow-[0_18px_60px_rgb(0_0_0/18%)] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-lg"
        >
          <p className="text-xs font-semibold mono uppercase tracking-tight text-[#777]">
            Your privacy
          </p>
          <p className="mt-2 max-w-xl text-sm mono tracking-tighter font-medium leading-5 text-black">
            We use necessary cookies to keep the site working. With your
            permission, we also use privacy-friendly analytics to improve it.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => saveChoice("accepted")}
              className="bg-black px-2 py-1 mono uppercase tracking-tighter text-xs rounded-full font-semibold text-white transition hover:bg-[#1c40f2]"
            >
              Accept analytics
            </button>
            <button
              type="button"
              onClick={() => saveChoice("rejected")}
              className="border border-black/20 px-2 py-1 mono uppercase tracking-tighter text-xs rounded-full font-semibold text-black transition hover:border-black"
            >
              Only necessary
            </button>
            <Link
              href="/legal"
              className="px-2 py-1 mono uppercase tracking-tighter text-xs font-semibold text-[#666] underline underline-offset-4 transition hover:text-black"
            >
              Learn more
            </Link>
          </div>
        </aside>
      ) : null}
    </>
  );
};

export default CookieConsent;
