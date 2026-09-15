"use client";

import React, { useState } from "react";

const BottomButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <button
      type="button"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
      onClick={() => setIsOpen((prev) => !prev)}
      className={`fixed bottom-4 right-4 z-50 flex h-15 w-15 cursor-pointer items-center justify-center rounded-full transition-colors duration-300 ${
        isOpen ? "bg-black" : "bg-black/30 hover:bg-black"
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
          height="54"
          viewBox="0 -960 960 960"
          width="54"
          fill="#fff"
          aria-hidden="true"
        >
          <path d="M160-300v-80h640v70H130Zm0-200v-80h640v70H160Z" />
        </svg>
      )}
    </button>
  );
};

export default BottomButton;
