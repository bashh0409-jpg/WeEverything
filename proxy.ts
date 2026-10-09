import { NextRequest, NextResponse } from "next/server";

const getContentSecurityPolicy = () => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  let posthogCspHost = "";

  if (posthogHost) {
    try {
      const domain = new URL(posthogHost).hostname.split(".").slice(-2).join(".");
      posthogCspHost = ` https://*.${domain}`;
    } catch {
      // PostHog initialization reports the misconfiguration in development.
    }
  }

  return `
    default-src 'self';
    script-src 'self' 'unsafe-inline'${
      isDevelopment ? " 'unsafe-eval'" : ""
    } https://va.vercel-scripts.com https://vitals.vercel-insights.com https://*.vercel-insights.com https://challenges.cloudflare.com${posthogCspHost};
    style-src 'self' 'unsafe-inline';
    img-src 'self' https: data: blob:;
    media-src 'self' https: blob:;
    font-src 'self' data:;
    connect-src 'self' https://*.supabase.co https://*.upstash.io https://va.vercel-scripts.com https://vitals.vercel-insights.com https://*.vercel-insights.com https://challenges.cloudflare.com${posthogCspHost};
    worker-src 'self' blob:;
    frame-src https://challenges.cloudflare.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();
};

export function proxy(request: NextRequest) {
  const contentSecurityPolicy = getContentSecurityPolicy();
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const authorizationCode = request.nextUrl.searchParams.get("code");
  if (request.nextUrl.pathname === "/" && authorizationCode) {
    const callbackUrl = new URL("/auth/callback", request.url);
    callbackUrl.searchParams.set("code", authorizationCode);
    callbackUrl.searchParams.set(
      "next",
      request.nextUrl.searchParams.get("next") ?? "/profile",
    );
    const response = NextResponse.redirect(callbackUrl);
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
    return response;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
