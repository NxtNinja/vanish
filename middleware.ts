import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 10000,
  maxRequests: 10,
  blockDurationMs: 60000,
};

// Extract client IP
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

// Rate limiting function
async function rateLimit(ip: string) {
  const now = Date.now();
  const key = `ratelimit:${ip}`;
  const blockKey = `ratelimit:block:${ip}`;

  const isBlocked = await redis.get(blockKey);
  if (isBlocked) {
    const ttl = await redis.ttl(blockKey);
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + ttl * 1000,
      retryAfter: ttl,
    };
  }

  const currentCount = await redis.incr(key);
  if (currentCount === 1) {
    await redis.pexpire(key, RATE_LIMIT_CONFIG.windowMs);
  }

  if (currentCount > RATE_LIMIT_CONFIG.maxRequests) {
    await redis.set(blockKey, "1", { px: RATE_LIMIT_CONFIG.blockDurationMs });
    const ttl = await redis.ttl(key);
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + ttl * 1000,
      retryAfter: Math.ceil(RATE_LIMIT_CONFIG.blockDurationMs / 1000),
    };
  }

  const ttl = await redis.ttl(key);
  return {
    allowed: true,
    remaining: Math.max(0, RATE_LIMIT_CONFIG.maxRequests - currentCount),
    resetAt: now + ttl * 1000,
  };
}

// Add security headers
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

// Room access logic (from proxy.ts)
async function handleRoomAccess(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  if (pathname.includes(".") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const roomMatch = pathname.match(/^\/room\/([^/]+)$/);
  if (!roomMatch) return NextResponse.next();

  const roomId = roomMatch[1];
  const meta = await redis.hgetall<{ connected: string[]; createdAt: number }>(`meta:${roomId}`);

  if (!meta) {
    return NextResponse.redirect(new URL("/lobby?error=room-not-found", request.url));
  }

  const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";
  const isBot = userAgent.includes("whatsapp") || userAgent.includes("telegrambot") || 
                userAgent.includes("bot") || userAgent.includes("preview") || 
                userAgent.includes("crawler") || userAgent.includes("spider");

  if (isBot) {
    console.log(`Bot detected, skipping token creation`);
    return NextResponse.next();
  }

  const existingToken = request.cookies.get("room_token")?.value;
  const tokenSet = `room:${roomId}:tokens`;
  const isMember = existingToken ? await redis.sismember(tokenSet, existingToken) : false;

  if (!isMember) {
    const size = await redis.scard(tokenSet);
    if (size >= 2) {
      return NextResponse.redirect(new URL("/lobby?error=room-full", request.url));
    }
    const newToken = nanoid();
    await redis.sadd(tokenSet, newToken);
    await redis.hset(`meta:${roomId}`, { connected: [...(meta.connected || []), newToken] });
    
    const response = NextResponse.next();
    response.cookies.set("room_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60,
    });
    return response;
  }

  return NextResponse.next();
}

// Main middleware
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.includes(".")) {
    return addSecurityHeaders(NextResponse.next());
  }

  const shouldRateLimit = pathname.startsWith("/api/") || pathname.startsWith("/room/");

  if (shouldRateLimit) {
    const clientIp = getClientIp(request);
    const rateLimitResult = await rateLimit(clientIp);

    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for IP: ${clientIp} - Blocked for ${rateLimitResult.retryAfter}s`);
      return new Response(
        JSON.stringify({
          error: "Too many requests",
          message: `Rate limit exceeded. Maximum ${RATE_LIMIT_CONFIG.maxRequests} requests per ${RATE_LIMIT_CONFIG.windowMs / 1000} seconds.`,
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": RATE_LIMIT_CONFIG.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(rateLimitResult.resetAt).toISOString(),
            "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
          },
        }
      );
    }

    let response: NextResponse;
    if (pathname.startsWith("/room/")) {
      response = await handleRoomAccess(request);
    } else {
      response = NextResponse.next();
    }

    response.headers.set("X-RateLimit-Limit", "10");
    response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
    response.headers.set("X-RateLimit-Reset", new Date(rateLimitResult.resetAt).toISOString());
    
    return addSecurityHeaders(response);
  }

  if (pathname.startsWith("/room/")) {
    return addSecurityHeaders(await handleRoomAccess(request));
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/api/:path*", "/room/:path*"],
};
