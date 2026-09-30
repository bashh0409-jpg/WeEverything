import http from "k6/http";
import { check, group } from "k6";

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
    "http_req_duration{name:home}": ["p(95)<300"],
    "http_req_duration{name:profiles_api}": ["p(95)<1000"],
  },
};

export default function () {
  group("homepage", () => {
    const home = http.get(`${baseUrl}/`, { tags: { name: "home" } });
    check(home, { "home returns 200": (r) => r.status === 200 });
  });

  group("profiles API", () => {
    const profiles = http.get(`${baseUrl}/api/profiles?offset=0`, {
      tags: { name: "profiles_api" },
    });
    check(profiles, {
      "profiles returns 200": (r) => r.status === 200,
      "profiles returns JSON": (r) =>
        r.headers["Content-Type"]?.includes("application/json"),
    });
  });
}
