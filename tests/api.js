import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const SCENARIO = __ENV.SCENARIO || "smoke";
const P95_MS = Number(__ENV.P95_MS || 500);
const PEAK_VUS = Number(__ENV.PEAK_VUS || 50);
const THINK_TIME_S = Number(__ENV.THINK_TIME_S || 0);

// 503 means "dependency not configured/down". Off by default so a misconfigured
// environment fails the run instead of passing as a false green.
const ALLOW_503 = __ENV.ALLOW_503 === "true";

const withOutage = (statuses) => (ALLOW_503 ? [...statuses, 503] : statuses);

// Also drives k6's own http_req_failed metric, not just our checks.
http.setResponseCallback(
  http.expectedStatuses(200, 400, 401, ...(ALLOW_503 ? [503] : [])),
);

// Slugs, not display names: whitespace in tag values breaks threshold selectors.
const ENDPOINTS = [
  "profiles",
  "events",
  "inquiries",
  "account",
  "account_purge",
  "sponsor",
  "enhance_bio",
  "search_profiles",
  "polar_webhook",
];

const SCENARIOS = {
  smoke: {
    executor: "shared-iterations",
    vus: Number(__ENV.VUS || 10),
    iterations: Number(__ENV.ITERATIONS || 100),
  },
  load: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "30s", target: Math.ceil(PEAK_VUS / 2) },
      { duration: "1m", target: PEAK_VUS },
      { duration: "1m", target: PEAK_VUS },
      { duration: "20s", target: 0 },
    ],
    gracefulRampDown: "10s",
  },
};

if (!SCENARIOS[SCENARIO]) {
  throw new Error(
    `Unknown SCENARIO "${SCENARIO}". Use: ${Object.keys(SCENARIOS).join(", ")}`,
  );
}

export const options = {
  scenarios: { [SCENARIO]: SCENARIOS[SCENARIO] },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: [`p(95)<${P95_MS}`],
    checks: ["rate>0.99"],
    // Per-endpoint p95 so a regression names the culprit instead of hiding in the aggregate.
    ...Object.fromEntries(
      ENDPOINTS.map((endpoint) => [
        `http_req_duration{endpoint:${endpoint}}`,
        [`p(95)<${P95_MS}`],
      ]),
    ),
  },
};

const jsonParams = {
  headers: { "Content-Type": "application/json" },
};

const sameOriginJsonParams = {
  headers: {
    "Content-Type": "application/json",
    Origin: BASE_URL,
  },
};

function tagged(endpoint, params = {}) {
  return { ...params, tags: { ...(params.tags || {}), endpoint } };
}

function expectStatus(name, response, acceptedStatuses) {
  check(response, {
    [`${name}: expected status ${acceptedStatuses.join(" or ")}`]: (result) =>
      acceptedStatuses.includes(result.status),
  });
}

export default function () {
  expectStatus(
    "profiles",
    http.get(`${BASE_URL}/api/profiles?offset=0`, tagged("profiles")),
    withOutage([200]),
  );

  expectStatus(
    "events validation",
    http.post(
      `${BASE_URL}/api/events`,
      JSON.stringify({}),
      tagged("events", jsonParams),
    ),
    withOutage([400]),
  );

  expectStatus(
    "inquiries validation",
    http.post(
      `${BASE_URL}/api/inquiries`,
      JSON.stringify({
        profileId: "not-a-uuid",
        senderName: "k6 smoke test",
        senderEmail: "k6@example.com",
        project: "Validation-only request",
      }),
      tagged("inquiries", jsonParams),
    ),
    withOutage([400]),
  );

  expectStatus(
    "account auth",
    http.del(
      `${BASE_URL}/api/account`,
      null,
      tagged("account", { headers: { Origin: BASE_URL } }),
    ),
    withOutage([401]),
  );

  // Strict by design: this route must reject before touching any dependency.
  expectStatus(
    "account purge auth",
    http.get(`${BASE_URL}/api/account/purge`, tagged("account_purge")),
    [401],
  );

  expectStatus(
    "sponsor validation",
    http.post(
      `${BASE_URL}/api/sponsor`,
      JSON.stringify({}),
      tagged("sponsor", sameOriginJsonParams),
    ),
    withOutage([400]),
  );

  expectStatus(
    "bio enhancement auth",
    http.post(
      `${BASE_URL}/api/ai/enhance-bio`,
      JSON.stringify({ bio: "k6 smoke test" }),
      tagged("enhance_bio", sameOriginJsonParams),
    ),
    withOutage([401]),
  );

  const profileSearch = http.post(
    `${BASE_URL}/api/ai/search-profiles`,
    JSON.stringify({ query: "designer", candidates: [] }),
    tagged("search_profiles", jsonParams),
  );
  expectStatus("AI profile search", profileSearch, withOutage([200]));
  if (profileSearch.status === 200) {
    // Parse once; response.json() re-parses the body on every call.
    const ids = profileSearch.json("ids");
    check(profileSearch, {
      "AI profile search: returns an empty ID list": () =>
        Array.isArray(ids) && ids.length === 0,
    });
  }

  expectStatus(
    "Polar webhook signature",
    http.post(
      `${BASE_URL}/api/webhooks/polar`,
      "{}",
      tagged("polar_webhook", jsonParams),
    ),
    withOutage([401]),
  );

  // Pacing: without think time, ramping VUs hammer the server far beyond real user behavior.
  if (THINK_TIME_S > 0) sleep(THINK_TIME_S);
}
