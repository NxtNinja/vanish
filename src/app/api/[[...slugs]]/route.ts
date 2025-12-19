import { redis } from "@/lib/redis";
import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";
import { authMiddleware } from "./auth";
import z from "zod";
import { message, realtime } from "@/lib/realtime";
import { encrypt, decrypt } from "@/lib/encryption";
import { getClientIp, rateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { stats } from "@/lib/stats";


const rooms = new Elysia({ prefix: "/room" })
  .post(
    "/create",
    async ({ body }) => {
      const roomId = nanoid();
      const ttlSeconds = (body.ttl || 10) * 60;

      await redis.hset(`meta:${roomId}`, {
        connected: [],
        createdAt: Date.now(),
      });

      await redis.expire(`meta:${roomId}`, ttlSeconds);

      // Track room creation for stats
      await stats.roomCreated();

      return { roomId };
    },
    {
      body: t.Object({
        ttl: t.Optional(t.Number({ minimum: 1, maximum: 20 })),
      }),
    }
  )
  .use(authMiddleware)
  .get(
    "/ttl",
    async ({ auth }) => {
      const ttl = await redis.ttl(`meta:${auth.roomId}`);
      return { ttl: ttl > 0 ? ttl : 0 };
    },
    { query: z.object({ roomId: z.string() }) }
  )
  .delete(
    "/",
    async ({ auth }) => {
      console.log("Destroying room:", auth.roomId);
      
      // Emit destroy event to ALL connected clients FIRST
      // This ensures clients receive the event before we clean up
      await realtime
        .channel(auth.roomId)
        .emit("chat.destroy", { isDestroyed: true });
      console.log("Destroy event emitted for:", auth.roomId);

      // Delete ALL room-related keys immediately - no delay needed
      // Realtime event will reach clients through WebSocket, not Redis polling
      await Promise.all([
        redis.del(`meta:${auth.roomId}`),
        redis.del(`messages:${auth.roomId}`),
        redis.del(`room:${auth.roomId}:tokens`),
        redis.del(`history:${auth.roomId}`),
        redis.del(auth.roomId), // Upstash Realtime stream key
      ]);
      
      console.log(`All keys deleted for room: ${auth.roomId}`);
      
      // Track room vanished for stats
      await stats.roomVanished();
      
      return { success: true };
    },
    { query: z.object({ roomId: z.string() }) }
  );

const messages = new Elysia({ prefix: "/messages" })
  .use(authMiddleware)
  .post(
    "/",
    async ({ auth, body }) => {
      const { sender, text } = body;
      const { roomId } = auth;

      const roomExists = await redis.exists(`meta:${roomId}`);

      if (!roomExists) {
        console.error("Room does not exist:", roomId);
        throw new Error("Room does not exist");
      }

      const message: message = {
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomId,
      };

      // Encrypt message text before storing in Redis
      const encryptedMessage = {
        ...message,
        text: encrypt(text),
        token: auth.token,
      };

      await redis.rpush(`messages:${roomId}`, encryptedMessage);
      
      // Track message for stats
      await stats.messageSent();
      
      // Emit original unencrypted message to realtime (end-to-end in memory)
      await realtime.channel(roomId).emit("chat.message", message);

      const remainingTime = await redis.ttl(`meta:${roomId}`);
      await redis.expire(`messages:${roomId}`, remainingTime);
      await redis.expire(`history:${roomId}`, remainingTime);
      await redis.expire(roomId, remainingTime);
    },
    {
      query: z.object({ roomId: z.string() }),
      body: z.object({
        sender: z.string().max(100),
        text: z.string().max(1000),
      }),
    }
  )
  .get(
    "/",
    async ({ auth }) => {
      const encryptedMessages = await redis.lrange<message>(
        `messages:${auth.roomId}`,
        0,
        -1
      );

      // Decrypt messages before sending to client
      return {
        messages: encryptedMessages.map((m) => ({
          ...m,
          text: decrypt(m.text),
          token: m.token === auth.token ? auth.token : undefined,
        })),
      };
    },
    { query: z.object({ roomId: z.string() }) }
  )
  .post(
    "/typing",
    async ({ auth, body }) => {
      const { sender, isTyping } = body;
      const { roomId } = auth;
      await realtime.channel(roomId).emit("chat.typing", { sender, isTyping });
    },
    {
      query: z.object({ roomId: z.string() }),
      body: z.object({
        sender: z.string(),
        isTyping: z.boolean(),
      }),
    }
  );
const app = new Elysia({ prefix: "/api" }).use(rooms).use(messages);

// Rate limiting wrapper
async function withRateLimit(request: Request, handler: (request: Request) => Promise<Response>) {
  const clientIp = getClientIp(request);
  const rateLimitResult = await rateLimit(clientIp);

  if (!rateLimitResult.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIp} - Blocked for ${rateLimitResult.retryAfter}s`);
    return createRateLimitResponse(
      rateLimitResult.remaining,
      rateLimitResult.resetAt,
      rateLimitResult.retryAfter
    );
  }

  const response = await handler(request);
  
  // Add rate limit headers
  response.headers.set("X-RateLimit-Limit", "10");
  response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
  response.headers.set("X-RateLimit-Reset", new Date(rateLimitResult.resetAt).toISOString());
  
  return response;
}

export const GET = (request: Request) => withRateLimit(request, app.fetch);
export const POST = (request: Request) => withRateLimit(request, app.fetch);
export const DELETE = (request: Request) => withRateLimit(request, app.fetch);

export type app = typeof app;
