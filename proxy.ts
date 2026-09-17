import { NextRequest, NextResponse } from "next/server";

const getContentSecurityPolicy = () => {
  const isDevelopment = process.env.NODE_ENV === "development";

  return `
    default-src 'self';
    script-src 'self' 'unsafe-inline'${
      isDevelopment ? " 'unsafe-eval'" : ""
    } https://va.vercel-scripts.com https://vitals.vercel-insights.com https://*.vercel-insights.com https://challenges.cloudflare.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' https: data: blob:;
    media-src 'self' https: blob:;
    font-src 'self' data:;
    connect-src 'self' https://*.supabase.co https://*.upstash.io https://va.vercel-scripts.com https://vitals.vercel-insights.com https://*.vercel-insights.com https://challenges.cloudflare.com;
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

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
