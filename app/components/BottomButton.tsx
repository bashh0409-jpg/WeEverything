"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface BottomButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

const BottomButton = ({ isOpen, onToggle }: BottomButtonProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const client = supabase;

    if (!client) return;

    let isMounted = true;

    void client.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      setIsAuthenticated(Boolean(session));
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      setIsAuthenticated(Boolean(session));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!isAuthenticated || !supabase) return null;

  return (
    <div className="z-50">
      <button
        type="button"
        aria-label={isOpen ? "Close account menu" : "Open account menu"}
        aria-expanded={isOpen}
        onClick={onToggle}
        className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full p-1 transition-colors duration-300 hover:bg-black ${
          isOpen ? "bg-black" : "bg-[#999]"
        }`}
      >
        {isOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="35px"
            viewBox="0 -960 960 960"
            width="35px"
            fill="#fff"
          >
            <path d="m251.33-204.67-46.66-46.66L433.33-480 204.67-708.67l46.66-46.66L480-526.67l228.67-228.66 46.66 46.66L526.67-480l228.66 228.67-46.66 46.66L480-433.33 251.33-204.67Z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="40px"
            viewBox="0 -960 960 960"
            width="40px"
            fill="#fff"
          >
            <path d="M160-380v-66.67h640V-380H160Zm0-133.33V-580h640v66.67H160Z" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default BottomButton;
