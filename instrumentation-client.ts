import posthog from "posthog-js";
import { initBotId } from "botid/client/core";

initBotId({
  protect: [
    { path: "/api/ai/search-profiles", method: "POST" },
    { path: "/api/ai/enhance-bio", method: "POST" },
    { path: "/api/events", method: "POST" },
    { path: "/api/inquiries", method: "POST" },
    { path: "/api/sponsor", method: "POST" },
  ],
});

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (!projectToken || !host) {
  if (process.env.NODE_ENV === "development") {
    const missingVariable = !projectToken
      ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
      : "NEXT_PUBLIC_POSTHOG_HOST";

    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    );
  }
} else {
  posthog.init(projectToken, {
    api_host: host,
    defaults: "2026-01-30",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_exceptions: false,
    before_send: (event) => {
      if (!event) return null;

      for (const key of Object.keys(event.properties)) {
        if (/url|referrer|pathname|search/i.test(key)) {
          delete event.properties[key];
        }
      }

      return event;
    },
    debug: process.env.NODE_ENV === "development",
  });
}
