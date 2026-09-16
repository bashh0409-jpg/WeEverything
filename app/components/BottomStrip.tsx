"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import BottomButton from "./BottomButton";

const BottomStrip = () => {
  const [isOpen, setIsOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stripRef.current) return;

    gsap.to(stripRef.current, {
      y: isOpen ? 0 : "100%",
      duration: 0.6,
      ease: "power3.inOut",
    });
  }, [isOpen]);

  return (
    <div
      ref={stripRef}
      className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-2"
      style={{ transform: "translateY(100%)" }}
    >
      <span className="absolute right-4 -top-14">
        <BottomButton
          isOpen={isOpen}
          onToggle={() => setIsOpen((previous) => !previous)}
        />
      </span>

      <div className="h-50 w-full bg-[#1c40f2]" />
    </div>
  );
};

export default BottomStrip;
