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

  const meta = await redis.hgetall<{ connected: string[]; createdAt: number }>(
    `meta:${roomId}`
  );

  if (!meta) {
    return NextResponse.redirect(new URL("/?error=room-not-found", req.url));
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

  // Increase limit to 4 to be more forgiving of ghost tokens/previews
  if (tokenCount >= 4) {
    console.warn(`Room ${roomId} is full. Token count: ${tokenCount}`);
    return NextResponse.redirect(new URL("/?error=room-full", req.url));
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
