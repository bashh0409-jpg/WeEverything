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
          className="fixed inset-x-4 bottom-4 rounded-lg z-[60] border border-black/15 bg-white p-4 shadow-[0_18px_60px_rgb(0_0_0/18%)] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-md"
        >
          <p className="mt-2 max-w-xl text-sm mon geist tracking-tight font-medium leading-5 text-black">
            We use necessary cookies to keep the site working. With your
            permission, we also use privacy-friendly analytics to improve it.
          </p>
          <div className="mt-4 flex flex-wrap justify-between items-center gap-2">
            <span className="gap-1 flex">
              <button
                type="button"
                onClick={() => saveChoice("accepted")}
                className="border border-black/20 px-2 py-1 mono uppercase tracking-tighter text-xs rounded-full font-medium text-black transition hover:bg-black hover:text-white"
              >
                Accept analytics
              </button>
              <button
                type="button"
                onClick={() => saveChoice("rejected")}
                className="border border-black/20 px-2 py-1 mono uppercase tracking-tighter text-xs rounded-full font-medium text-black transition hover:bg-black hover:text-white"
              >
                Only necessary
              </button>
            </span>
            <Link
              href="/legal"
              className="border border-black/20 px-2 bg-black py-1 mono uppercase tracking-tighter text-xs rounded-full font-medium text-white transition hover:bg-black/60 "
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
