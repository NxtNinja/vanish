import { NextRequest, NextResponse } from "next/server";
import { redis } from "./lib/redis";
import { nanoid } from "nanoid";

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const roomMatch = pathname.match(/^\/room\/([^/]+)$/);
  if (!roomMatch) return NextResponse.redirect(new URL("/", req.url));

  const roomId = roomMatch[1];

  const meta = await redis.hgetall<{ connected: string[]; createdAt: number }>(
    `meta:${roomId}`
  );

  if (!meta) {
    return NextResponse.redirect(new URL("/?error=room-not-found", req.url));
  }

  const existingToken = req.cookies.get("x-auth-token")?.value;

  // Parse connected if it's a string (Redis hgetall returns strings for complex types)
  const rawConnected = meta.connected;
  const connectedUsers: string[] = Array.isArray(rawConnected)
    ? rawConnected
    : typeof rawConnected === "string"
    ? JSON.parse(rawConnected)
    : [];

  console.log(`Room ${roomId} status:`, {
    connectedCount: connectedUsers.length,
    hasToken: !!existingToken,
  });

  // USER IS ALLOWED TO JOIN ROOM
  if (existingToken && connectedUsers.includes(existingToken)) {
    return NextResponse.next();
  }

  // USER IS NOT ALLOWED TO JOIN
  if (connectedUsers.length >= 2) {
    console.warn(`Room ${roomId} is full. Tokens:`, connectedUsers);
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

  await redis.hset(`meta:${roomId}`, {
    connected: [...connectedUsers, token],
  });

  return response;
}

export const config = {
  matcher: "/room/:path*",
};
