"use client";

import { useEffect, useState } from "react";

const StartupScreen = () => {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";

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
        <span className="startup-screen-kicker">A directory for people</span>
        <span className="startup-screen-name">WeEverything</span>
      </div>
      <div className="startup-screen-progress" aria-hidden="true">
        <span />
      </div>
      <span className="startup-screen-year">2026</span>
    </div>
  );
};

export default StartupScreen;