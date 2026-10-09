"use client";

import { useEffect, useRef, useState } from "react";

const STARTUP_MIN_DURATION = 3_000;
const STARTUP_LEAVE_DURATION = 650;
const STARTUP_DATA_READY_EVENT = "weeverything:data-ready";
const STARTUP_SESSION_KEY = "weeverything:startup-played";

const StartupScreen = () => {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const isDataReadyRef = useRef(false);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    isDataReadyRef.current = isDataReady;
  }, [isDataReady]);

  useEffect(() => {
    let hasPlayedThisSession = false;
    try {
      hasPlayedThisSession =
        window.sessionStorage.getItem(STARTUP_SESSION_KEY) === "true";
      if (!hasPlayedThisSession) {
        window.sessionStorage.setItem(STARTUP_SESSION_KEY, "true");
      }
    } catch (error) {
      console.warn("Could not access startup screen session storage", error);
    }

    if (hasPlayedThisSession && !hasStartedRef.current) return;

    hasStartedRef.current = true;
    setIsVisible(true);
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
      className={`startup-screen bg-white ${isLeaving ? "startup-screen-leaving" : ""}`}
    >
      <div className="startup-screen-footer tracking-tight geist">
        <span className=" hidden md:block text-sm font-semibold md:block">
          2026
        </span>
        <span className="startup-screen-center text-center text-sm font-semibold tracking-tight">
          <p>WeEverything</p>

          <p className="mon geist max-w-xs overflow-hidden text-center text-[13px] font-semibold leading-3 tracking-tight text-[#999]">
            A simple place for creative people to show who they are, what they
            do, connect with others, and the work they want the world to see.
          </p>
        </span>
        <span
          className="startup-screen-percentage hidden text-sm font-semibold tracking-tighter md:block"
          role="progressbar"
          aria-label="Loading content"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          {Math.round(progress)}
        </span>
      </div>
    </div>
  );
};

export default StartupScreen;
