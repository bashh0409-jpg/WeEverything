import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 100;
const LOCATION_SEARCH_TIMEOUT_MS = 5_000;
const LOCATION_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_LOCATION_CACHE_ENTRIES = 200;

const locationCache = new Map<
  string,
  { expiresAt: number; result: unknown }
>();

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Search must be between 2 and ${MAX_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const cacheKey = query.toLocaleLowerCase();
  const cachedResult = locationCache.get(cacheKey);
  if (cachedResult && cachedResult.expiresAt > Date.now()) {
    return NextResponse.json(cachedResult.result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
  if (cachedResult) locationCache.delete(cacheKey);

  const rateLimitResponse = await enforceRateLimit(
    request,
    "location-search",
    30,
    60,
  );
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const upstreamUrl = new URL("https://photon.komoot.io/api/");
    upstreamUrl.searchParams.set("q", query);
    upstreamUrl.searchParams.set("limit", "8");
    upstreamUrl.searchParams.set("lang", "en");

    const response = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.any([
        request.signal,
        AbortSignal.timeout(LOCATION_SEARCH_TIMEOUT_MS),
      ]),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Location provider returned an unsuccessful response", {
        status: response.status,
      });
      return NextResponse.json(
        { error: "Location search is temporarily unavailable." },
        { status: 502 },
      );
    }

    const result: unknown = await response.json();
    if (locationCache.size >= MAX_LOCATION_CACHE_ENTRIES) {
      const oldestKey = locationCache.keys().next().value;
      if (oldestKey) locationCache.delete(oldestKey);
    }
    locationCache.set(cacheKey, {
      expiresAt: Date.now() + LOCATION_CACHE_TTL_MS,
      result,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, { status: 204 });
    }
    console.error("Could not fetch location suggestions", error);
    return NextResponse.json(
      { error: "Location search is temporarily unavailable." },
      { status: 502 },
    );
  }
}
