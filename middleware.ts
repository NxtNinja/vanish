import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { proxy } from "./src/proxy";
import { getClientIp, rateLimit, createRateLimitResponse } from "./src/lib/rate-limit";

function addSecurityHeaders(response: NextResponse): NextResponse {
  const headers = response.headers;
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  
  if (process.env.NODE_ENV === "production") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.includes(".")) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  const shouldRateLimit = pathname.startsWith("/api/") || pathname.startsWith("/room/");

  if (shouldRateLimit) {
    const clientIp = getClientIp(request);
    const rateLimitResult = await rateLimit(clientIp);

    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for IP: ${clientIp} - Blocked for ${rateLimitResult.retryAfter}s`);
      return createRateLimitResponse(rateLimitResult.remaining, rateLimitResult.resetAt, rateLimitResult.retryAfter);
    }

    const response = await proxy(request);
    response.headers.set("X-RateLimit-Limit", "10");
    response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
    response.headers.set("X-RateLimit-Reset", new Date(rateLimitResult.resetAt).toISOString());
    
    return addSecurityHeaders(response);
  }

  const response = await proxy(request);
  return addSecurityHeaders(response);
}

export const config = {
  matcher: ["/api/:path*", "/room/:path*"],
};
