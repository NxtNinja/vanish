import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const RATE_LIMIT_CONFIG = {
  windowMs: 15000,  // 15 seconds
  maxRequests: 30,  // 30 requests per window (more reasonable for chat + typing)
  blockDurationMs: 60000,
};

export function getClientIp(request: Request): string {
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

export async function rateLimit(ip: string) {
  const now = Date.now();
  const key = `ratelimit:${ip}`;
  const blockKey = `ratelimit:block:${ip}`;

  // Use pipeline to batch Redis operations - reduces round trips
  const pipeline = redis.pipeline();
  pipeline.get(blockKey);
  pipeline.incr(key);
  pipeline.ttl(key);
  
  const results = await pipeline.exec<[string | null, number, number]>();
  const [isBlocked, currentCount, ttl] = results;

  // Check if blocked
  if (isBlocked) {
    const blockTtl = await redis.ttl(blockKey);
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + blockTtl * 1000,
      retryAfter: blockTtl,
    };
  }

  // Set expiry on first request in window
  if (currentCount === 1) {
    await redis.pexpire(key, RATE_LIMIT_CONFIG.windowMs);
  }

  // Check if over limit
  if (currentCount > RATE_LIMIT_CONFIG.maxRequests) {
    await redis.set(blockKey, "1", { px: RATE_LIMIT_CONFIG.blockDurationMs });
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + (ttl > 0 ? ttl * 1000 : RATE_LIMIT_CONFIG.windowMs),
      retryAfter: Math.ceil(RATE_LIMIT_CONFIG.blockDurationMs / 1000),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, RATE_LIMIT_CONFIG.maxRequests - currentCount),
    resetAt: now + (ttl > 0 ? ttl * 1000 : RATE_LIMIT_CONFIG.windowMs),
  };
}

export function createRateLimitResponse(
  remaining: number,
  resetAt: number,
  retryAfter?: number
): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: `Rate limit exceeded. Maximum ${RATE_LIMIT_CONFIG.maxRequests} requests per ${RATE_LIMIT_CONFIG.windowMs / 1000} seconds.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": RATE_LIMIT_CONFIG.maxRequests.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": new Date(resetAt).toISOString(),
        "Retry-After": retryAfter?.toString() || "60",
      },
    }
  );
}
