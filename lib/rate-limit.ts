import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

let redisClient: Redis | null | undefined;

const getRedis = () => {
  if (redisClient !== undefined) return redisClient;
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    redisClient = null;
    return redisClient;
  }

  redisClient = Redis.fromEnv();
  return redisClient;
};

const getRequestIdentity = (request: Request) => {
  const vercelIp = request.headers
    .get("x-vercel-forwarded-for")
    ?.split(",")[0]
    .trim();
  if (vercelIp) return `ip:${vercelIp}`;

  if (process.env.NODE_ENV !== "production") {
    const forwardedIp = request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      .trim();
    return forwardedIp ? `ip:${forwardedIp}` : "ip:local";
  }

  return "ip:unknown";
};

export async function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
  identity?: string,
): Promise<NextResponse | null> {
  const redis = getRedis();
  if (!redis) {
    if (process.env.NODE_ENV !== "production") return null;

    return NextResponse.json(
      { error: "Rate limiting is temporarily unavailable." },
      { status: 503 },
    );
  }

  const actor = identity ? `user:${identity}` : getRequestIdentity(request);
  const actorHash = createHash("sha256").update(actor).digest("hex");
  const now = Date.now();
  const windowMilliseconds = windowSeconds * 1000;
  const windowStart = Math.floor(now / windowMilliseconds);
  const resetAt = (windowStart + 1) * windowMilliseconds;
  const key = `rate-limit:${scope}:${actorHash}:${windowStart}`;

  try {
    const count = await redis.incr(key);
    await redis.expire(key, windowSeconds * 2);

    if (count <= limit) return null;

    const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "RateLimit-Limit": String(limit),
          "RateLimit-Remaining": "0",
          "RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      },
    );
  } catch (error) {
    console.error("Rate limiter request failed", { scope, error });
    return NextResponse.json(
      { error: "Rate limiting is temporarily unavailable." },
      { status: 503 },
    );
  }
}
