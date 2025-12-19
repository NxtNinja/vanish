import { NextRequest, NextResponse } from "next/server";
import { redis } from "./lib/redis";
import { nanoid } from "nanoid";

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Ignore static assets and internal Next.js requests
  if (
    pathname.includes(".") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const roomMatch = pathname.match(/^\/room\/([^/]+)$/);
  if (!roomMatch) return NextResponse.next();

  const roomId = roomMatch[1];

  const meta = await redis.hgetall<{ connected: string[]; createdAt: number; maxParticipants?: number }>(
    `meta:${roomId}`
  );

  if (!meta) {
    return NextResponse.redirect(new URL("/lobby?error=room-not-found", req.url));
  }

  // Default to 2 for backwards compatibility with existing rooms
  const maxParticipants = meta.maxParticipants || 2;

  // Detect and ignore bot/preview requests (WhatsApp, Telegram, Twitter, etc.)
  const userAgent = req.headers.get("user-agent")?.toLowerCase() || "";
  const isBot =
    userAgent.includes("whatsapp") ||
    userAgent.includes("telegrambot") ||
    userAgent.includes("twitterbot") ||
    userAgent.includes("facebookexternalhit") ||
    userAgent.includes("linkedinbot") ||
    userAgent.includes("slackbot") ||
    userAgent.includes("discordbot") ||
    userAgent.includes("bot") ||
    userAgent.includes("preview") ||
    userAgent.includes("crawler") ||
    userAgent.includes("spider");

  // Allow bots to view the page but don't create tokens for them
  if (isBot) {
    console.log(`Bot detected (${userAgent.substring(0, 50)}), skipping token creation`);
    return NextResponse.next();
  }

  const existingToken = req.cookies.get("x-auth-token")?.value;
  const tokenKey = `room:${roomId}:tokens`;

  // Check if existing token is valid using Set
  if (existingToken) {
    const isValid = await redis.sismember(tokenKey, existingToken);
    if (isValid) {
      return NextResponse.next();
    }
  }

  // Atomic check and add
  const tokenCount = await redis.scard(tokenKey);

  // Enforce dynamic participant limit
  if (tokenCount >= maxParticipants) {
    console.warn(`Room ${roomId} is full. Token count: ${tokenCount}, max: ${maxParticipants}`);
    return NextResponse.redirect(new URL("/lobby?error=room-full", req.url));
  }

  const response = NextResponse.next();
  const token = nanoid();

  response.cookies.set("x-auth-token", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  // Atomic add to Set
  await redis.sadd(tokenKey, token);
  
  // Add token to connected array in meta hash
  const currentMeta = await redis.hgetall<{ connected: string[]; createdAt: number }>(
    `meta:${roomId}`
  );
  if (currentMeta) {
    const updatedConnected = [...(currentMeta.connected || []), token];
    await redis.hset(`meta:${roomId}`, { connected: updatedConnected });
  }
  
  // Ensure the token set expires with the room
  const ttl = await redis.ttl(`meta:${roomId}`);
  if (ttl > 0) {
    await redis.expire(tokenKey, ttl);
  }

  console.log(`New token generated for room ${roomId}. Total: ${tokenCount + 1}`);

  return response;
}

export const config = {
  matcher: ["/room/:path*", "/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
