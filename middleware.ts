import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Add security headers only - no external dependencies
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  
  return response;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: "/:path*",
};
