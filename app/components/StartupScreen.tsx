"use client";

import { useEffect, useState } from "react";

const STARTUP_MIN_DURATION = 2_800;
const STARTUP_LEAVE_DURATION = 650;
const STARTUP_STORAGE_TTL_MS = 12 * 60 * 60 * 1000;

const getStartupStorageValue = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem("weeverything-startup-seen");
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { expiresAt: number } | null;
    if (!parsed || typeof parsed.expiresAt !== "number") return null;

    if (parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem("weeverything-startup-seen");
      return null;
    }

    return parsed;
  } catch {
    window.sessionStorage.removeItem("weeverything-startup-seen");
    return null;
  }
};

const setStartupStorageValue = () => {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    "weeverything-startup-seen",
    JSON.stringify({ expiresAt: Date.now() + STARTUP_STORAGE_TTL_MS }),
  );
};

const StartupScreen = () => {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (getStartupStorageValue()) {
      setIsVisible(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setIsVisible(true);

    let removeTimer: number | undefined;
    let leaveTimer: number | undefined;
    let progressTimer: number | undefined;

    const finishStartup = () => {
      setProgress(100);
      if (progressTimer) {
        window.clearInterval(progressTimer);
      }

      leaveTimer = window.setTimeout(() => {
        setIsLeaving(true);
        removeTimer = window.setTimeout(() => {
          setIsVisible(false);
          document.body.style.overflow = previousOverflow;
          setStartupStorageValue();
        }, STARTUP_LEAVE_DURATION);
      }, 180);
    };

    const start = performance.now();
    progressTimer = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const nextProgress = Math.min((elapsed / STARTUP_MIN_DURATION) * 100, 100);
      setProgress(nextProgress);

      if (elapsed >= STARTUP_MIN_DURATION) {
        finishStartup();
      }
    }, 16);

    const loadHandler = () => {
      finishStartup();
    };

    if (document.readyState === "complete") {
      finishStartup();
    } else {
      window.addEventListener("load", loadHandler, { once: true });
    }

    return () => {
      if (progressTimer) {
        window.clearInterval(progressTimer);
      }
      if (leaveTimer) {
        window.clearTimeout(leaveTimer);
      }
      if (removeTimer) {
        window.clearTimeout(removeTimer);
      }
      window.removeEventListener("load", loadHandler);
      document.body.style.overflow = previousOverflow;
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
          aria-label={`${Math.round(progress)}% loaded`}
        >
          {Math.round(progress)}
        </span>
      </div>

      <div className="startup-screen-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export default StartupScreen;
