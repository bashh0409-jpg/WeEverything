"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type ProfileModalProps = {
  name: string;
  role: string;
  bio: string | null;
  location?: string | null;
  onClose: () => void;
};

const ProfileModal = ({
  name,
  role,
  bio,
  location,
  onClose,
}: ProfileModalProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const closeModal = useCallback(() => {
    if (isClosingRef.current) return;

    isClosingRef.current = true;
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      onCloseRef.current();
    }, 500);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, [closeModal]);

  return (
    <>
      <button
        type="button"
        aria-label="Close profile modal"
        onClick={closeModal}
        className={`profile-modal-backdrop fixed inset-0 z-40 cursor-default bg-black/50 backdrop-blur-sm ${isClosing ? "profile-modal-backdrop-exit" : ""}`}
      />

      <button
        type="button"
        aria-label="Close profile modal"
        onClick={closeModal}
        className={`profile-modal-close fixed right-1/2 bottom-[calc(90vh+10px)] z-50 translate-x-1/2 rounded-full bg-white p-1 text-black ${isClosing ? "profile-modal-close-exit" : ""}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="18px"
          viewBox="0 -960 960 960"
          width="18px"
          fill="currentColor"
        >
          <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
        </svg>
      </button>

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className={`profile-modal-sheet fixed bottom-0 left-0 right-0 z-50 flex h-[90vh] items-center justify-center overflow-y-auto rounded-t bg-white px-6 py-10 shadow-2xl sm:px-10 ${isClosing ? "profile-modal-sheet-exit" : ""}`}
      >
        <div className="flex w-full max-w-xl flex-col gap-4">
          <p className="mono text-sm font-semibold uppercase tracking-tight text-[#1c40f2]">
            @{name}
          </p>
          <h1
            id="profile-modal-title"
            className="text-5xl font-semibold tracking-tighter sm:text-7xl"
          >
            {name}
          </h1>
          <p className="text-xl font-semibold">{role}</p>
          {location ? <p className="text-sm text-[#666]">{location}</p> : null}
          <p className="mt-8 max-w-2xl text-base leading-relaxed text-[#444]">
            {bio || "This profile has not added a bio yet."}
          </p>
          <Link
            href="/"
            onClick={(event) => {
              event.preventDefault();
              closeModal();
            }}
            className="mt-4 w-fit rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1c40f2]"
          >
            Browse profiles
          </Link>
        </div>
      </section>
    </>
  );
};

export default ProfileModal;