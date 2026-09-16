"use client";

import { useEffect, useState } from "react";

const StartupScreen = () => {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(current + 1, 100));
    }, 30);

    const leaveTimer = window.setTimeout(() => {
      setIsLeaving(true);
    }, 3_000);
    const removeTimer = window.setTimeout(() => {
      setIsVisible(false);
      document.body.style.overflow = "";
    }, 3_650);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
      window.clearInterval(progressTimer);
      document.body.style.overflow = "";
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      aria-label="Loading WeEverything"
      aria-live="polite"
      className={`startup-screen ${isLeaving ? "startup-screen-leaving" : ""}`}
    >
      <div className="startup-screen-mark">
        <span className="startup-screen-kicker tracking-tight">A directory for people</span>
        <span className="startup-screen-name">WeEverything</span>
      </div>
    
      <div className="startup-screen-footer">
        <span className="startup-screen-year geist tracking-tight">2026</span>
        <span
          className="startup-screen-percentage geist w-10 tracking-tight"
          aria-label={`${progress}% loaded`}
        >
          {progress}
        </span>
      </div>
    </div>
  );
};

export default StartupScreen;
