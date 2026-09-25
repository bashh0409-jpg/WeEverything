"use client";

import { gsap } from "gsap";
import { useLayoutEffect, useRef } from "react";

const tickerTexts = [
  "DEVELOPER",
  "DESIGNER",
  "PHOTOGRAPHER",
  "ILLUSTRATOR",
  "ILLUSTRATOR",
  "STYLIST"
];

const tickerItems = Array.from({ length: 16 }, (_, index) => (
  <span key={index}>{tickerTexts[index % tickerTexts.length]}</span>
));

const OpenToWorkTicker = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const group = groupRef.current;

    if (!track || !group) return;

    let resizeObserver: ResizeObserver | null = null;

    const context = gsap.context(() => {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

      if (mediaQuery.matches) return;

      const ticker = gsap.to(track, {
        x: () => -group.offsetWidth,
        duration: 28,
        ease: "none",
        repeat: -1,
      });
      resizeObserver = new ResizeObserver(() => {
        ticker.invalidate().restart();
      });

      resizeObserver.observe(group);
    }, track);

    return () => {
      resizeObserver?.disconnect();
      context.revert();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-2 z-30 overflow-hidden whitespace-nowrap">
      <div
        ref={trackRef}
        className="ticker-track mono text-sm inline-flex w-max items-center font-normal text-[#1c40f2]"
      >
        <div
          ref={groupRef}
          aria-hidden="true"
          className="inline-flex items-center"
        >
          {tickerItems}
        </div>
        <div aria-hidden="true" className="inline-flex items-center">
          {tickerItems}
        </div>
      </div>
    </div>
  );
};

export default OpenToWorkTicker;
