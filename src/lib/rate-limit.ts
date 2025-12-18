import { redis } from "./redis";

/**
 * Rate Limiter Configuration
 */
const RATE_LIMIT_CONFIG = {
  windowMs: 10000, // 10 seconds
  maxRequests: 10, // 10 requests max per window
  blockDurationMs: 60000, // Block for 60 seconds after limit exceeded
};

/**
 * Extract client IP from request headers
 * Supports proxy headers (X-Forwarded-For, X-Real-IP)
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  
  // Check proxy headers first
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    // X-Forwarded-For can be a comma-separated list, take the first IP
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  // Fallback to a default (should not happen in production with proper proxy setup)
  return "unknown";
}

/**
 * IP-based rate limiter using Redis
 * Implements sliding window algorithm for accurate rate limiting
 * 
 * @param ip - Client IP address
 * @returns Object with allowed status and retry info
 */
export async function rateLimit(ip: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}> {
  const now = Date.now();
  const key = `ratelimit:${ip}`;
  const blockKey = `ratelimit:block:${ip}`;

  // Check if IP is blocked
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

  // Get current request count in the time window
  const currentCount = await redis.incr(key);

  // Set expiry on first request
  if (currentCount === 1) {
    await redis.pexpire(key, RATE_LIMIT_CONFIG.windowMs);
  }

  // Check if limit exceeded
  if (currentCount > RATE_LIMIT_CONFIG.maxRequests) {
    // Block the IP for blockDurationMs
    await redis.set(blockKey, "1", {
      px: RATE_LIMIT_CONFIG.blockDurationMs,
    });

    const ttl = await redis.ttl(key);
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + ttl * 1000,
      retryAfter: Math.ceil(RATE_LIMIT_CONFIG.blockDurationMs / 1000),
    };
  }

  const ttl = await redis.ttl(key);
  const remaining = Math.max(0, RATE_LIMIT_CONFIG.maxRequests - currentCount);

  return {
    allowed: true,
    remaining,
    resetAt: now + ttl * 1000,
  };
}

/**
 * Create rate limit response with appropriate headers
 */
export function createRateLimitResponse(
  remaining: number,
  resetAt: number,
  retryAfter?: number
): Response {
  const headers = new Headers({
    "Content-Type": "application/json",
    "X-RateLimit-Limit": RATE_LIMIT_CONFIG.maxRequests.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": new Date(resetAt).toISOString(),
  });

  if (retryAfter !== undefined) {
    headers.set("Retry-After", retryAfter.toString());
  }

  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: `Rate limit exceeded. Maximum ${RATE_LIMIT_CONFIG.maxRequests} requests per ${RATE_LIMIT_CONFIG.windowMs / 1000} seconds.`,
      retryAfter: retryAfter,
    }),
    {
      status: 429,
      headers,
    }
  );
}
