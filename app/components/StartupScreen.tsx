"use client";

import { useEffect, useRef, useState } from "react";

const STARTUP_MIN_DURATION = 3_000;
const STARTUP_LEAVE_DURATION = 650;
const STARTUP_DATA_READY_EVENT = "weeverything:data-ready";

const StartupScreen = () => {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isDataReady, setIsDataReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const isDataReadyRef = useRef(false);

  useEffect(() => {
    isDataReadyRef.current = isDataReady;
  }, [isDataReady]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let removeTimer: number | undefined;
    let leaveTimer: number | undefined;
    let dataReadyTimer: number | undefined;
    const readyHandler = () => setIsDataReady(true);

    if (window.location.pathname === "/") {
      if (document.documentElement.dataset.startupDataReady === "true") {
        dataReadyTimer = window.setTimeout(readyHandler, 0);
      } else {
        window.addEventListener(STARTUP_DATA_READY_EVENT, readyHandler);
      }
    } else if (document.readyState === "complete") {
      dataReadyTimer = window.setTimeout(readyHandler, 0);
    } else {
      window.addEventListener("load", readyHandler, { once: true });
    }

    const start = performance.now();
    const progressTimer = window.setInterval(() => {
      const elapsed = performance.now() - start;

      if (elapsed < STARTUP_MIN_DURATION || !isDataReadyRef.current) {
        setProgress(Math.min((elapsed / STARTUP_MIN_DURATION) * 90, 90));
        return;
      }

      window.clearInterval(progressTimer);
      setProgress(100);
      leaveTimer = window.setTimeout(() => {
        setIsLeaving(true);
        removeTimer = window.setTimeout(() => {
          setIsVisible(false);
          document.body.style.overflow = previousOverflow;
        }, STARTUP_LEAVE_DURATION);
      }, 180);
    }, 16);

    return () => {
      window.clearInterval(progressTimer);
      if (leaveTimer) {
        window.clearTimeout(leaveTimer);
      }
      if (removeTimer) {
        window.clearTimeout(removeTimer);
      }
      if (dataReadyTimer) window.clearTimeout(dataReadyTimer);
      window.removeEventListener("load", readyHandler);
      window.removeEventListener(STARTUP_DATA_READY_EVENT, readyHandler);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-label="Loading WeEverything"
      aria-live="polite"
      className={`startup-screen ${isLeaving ? "startup-screen-leaving" : ""}`}
    >
      <div className="startup-screen-footer tracking-tight geist">
        <span className="tracking-tighter  text-sm font-semibold">2026</span>
        <span className="text-center tracking-tight  text-sm font-semibold">
          <p>WeEverything</p>

          <p className="mon geist  max-w-xs text-center  overflow-hidden text-[13px] font-semibold leading-3 tracking-tight text-[#999]">
            A simple place for creative people to show who they are, what they
            do, connect with others, and the work they want the world to see.
          </p>
        </span>
        <span
          className="startup-screen-percentage tracking-tighter  text-sm font-semibold"
          role="progressbar"
          aria-label="Loading content"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
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
