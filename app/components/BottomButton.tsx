"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const BottomButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const client = supabase;

    if (!client) return;

    let isMounted = true;

    void client.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setIsAuthenticated(Boolean(session));
      }
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setIsAuthenticated(Boolean(session));
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!isAuthenticated) return null;

  return (
    <button
      type="button"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
      onClick={() => setIsOpen((prev) => !prev)}
      className={`fixed bottom-4 right-4 z-50 flex h-10 w-10 p-1 cursor-pointer items-center justify-center rounded-full transition-colors duration-300 ${
        isOpen ? "bg-black" : "bg-[#999] hover:bg-black"
      }`}
    >
      {isOpen ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="54"
          viewBox="0 -960 960 960"
          width="54"
          fill="#fff"
          aria-hidden="true"
        >
          <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="40px"
          viewBox="0 -960 960 960"
          width="40px"
          fill="#fff"
        >
          <path d="M130.67-220 80-270.67l300-300L540-410l293.33-330L880-694 540-310 380-469.33 130.67-220Z" />
        </svg>
      )}
    </button>
  );
};

export default BottomButton;
