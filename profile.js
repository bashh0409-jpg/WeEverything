import http from "k6/http";
import { check } from "k6";

const baseUrl = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

export const options = {
  scenarios: {
    everyday_traffic: {
      executor: "ramping-arrival-rate",
      startRate: 2,
      timeUnit: "1s",
      preAllocatedVUs: 10,
      maxVUs: 60,
      stages: [
        { target: 2, duration: "1m" },
        { target: 10, duration: "5m" },
        { target: 0, duration: "1m" },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

export default function () {
  const home = http.get(`${baseUrl}/`);
  check(home, { "home returns 200": (response) => response.status === 200 });

  const profiles = http.get(`${baseUrl}/api/profiles?offset=0`);
  check(profiles, {
    "profiles returns 200": (response) => response.status === 200,
    "profiles returns JSON": (response) =>
      response.headers["Content-Type"]?.includes("application/json"),
  });
}
