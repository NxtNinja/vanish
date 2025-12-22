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
      const maxParticipants = body.maxParticipants || 2; // Default to 2 for 1-on-1

      await redis.hset(`meta:${roomId}`, {
        connected: [],
        createdAt: Date.now(),
        maxParticipants,
      });

      await redis.expire(`meta:${roomId}`, ttlSeconds);

      // Track room creation for stats
      await stats.roomCreated();

      return { roomId };
    },
    {
      body: t.Object({
        ttl: t.Optional(t.Number({ minimum: 1, maximum: 20 })),
        maxParticipants: t.Optional(t.Number({ minimum: 2, maximum: 5 })),
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
      
      // Get room metadata to check if it's a group chat
      const meta = await redis.hgetall<{ maxParticipants?: number }>(`meta:${auth.roomId}`);
      const isGroupChat = (meta?.maxParticipants || 2) > 2;
      
      // Emit destroy event to ALL connected clients FIRST
      await realtime
        .channel(auth.roomId)
        .emit("chat.destroy", { isDestroyed: true });
      console.log("Destroy event emitted for:", auth.roomId);

      // Small delay for ALL room types to ensure realtime event propagates
      // Upstash Realtime can have ~100-500ms latency in production
      await new Promise(resolve => setTimeout(resolve, 500));

      // Clean up random:matched entries that point to this room
      const matchedEntries = await redis.hgetall<Record<string, string>>("random:matched");
      if (matchedEntries) {
        const sessionsToDelete = Object.entries(matchedEntries)
          .filter(([, roomId]) => roomId === auth.roomId)
          .map(([sessionId]) => sessionId);
        
        if (sessionsToDelete.length > 0) {
          await redis.hdel("random:matched", ...sessionsToDelete);
          // Also clean up session streams
          await Promise.all(sessionsToDelete.map(sessionId => redis.del(sessionId)));
          console.log(`Cleaned up ${sessionsToDelete.length} random:matched entries for room: ${auth.roomId}`);
        }
      }

      // Now delete all room-related keys
      await Promise.all([
        redis.del(`meta:${auth.roomId}`),
        redis.del(`messages:${auth.roomId}`),
        redis.del(`room:${auth.roomId}:tokens`),
        redis.del(`history:${auth.roomId}`),
        redis.del(auth.roomId), // Upstash Realtime stream key
      ]);
      
      console.log(`All keys deleted for room: ${auth.roomId}`);
      
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

// Random chat matchmaking - 5 minute fixed TTL
const RANDOM_CHAT_TTL_SECONDS = 300; // 5 minutes

const random = new Elysia({ prefix: "/random" })
  .post(
    "/queue/join",
    async ({ body }) => {
      const { sessionId, username } = body;
      
      // Use a lock to prevent race conditions in matchmaking
      const lockKey = "random:matchmaking:lock";
      const lockValue = sessionId;
      const lockTTL = 5; // 5 seconds max lock time
      
      // Try to acquire lock using SETNX
      const lockAcquired = await redis.setnx(lockKey, lockValue);
      if (!lockAcquired) {
        // Someone else is matchmaking, add ourselves to queue and wait
        await redis.zadd("random:queue", { score: Date.now(), member: sessionId });
        await redis.hset("random:sessions", { [sessionId]: JSON.stringify({ username, joinedAt: Date.now() }) });
        await redis.expire("random:queue", 3600);
        await redis.expire("random:sessions", 3600);
        console.log(`User ${sessionId} joined random queue (lock held by another)`);
        return { status: "queued" as const };
      }
      
      // We have the lock, set expiry to prevent deadlock
      await redis.expire(lockKey, lockTTL);
      
      try {
        // Check if there's already someone waiting in the queue (not us)
        const waitingUsers = await redis.zrange("random:queue", 0, 0);
        
        if (waitingUsers.length > 0) {
          const matchedSessionId = waitingUsers[0] as string;
          
          // Don't match with yourself
          if (matchedSessionId === sessionId) {
            // Already in queue, just wait
            return { status: "queued" as const };
          }
          
          // Atomically remove matched user from queue - if this fails, someone else got them
          const removed = await redis.zrem("random:queue", matchedSessionId);
          if (removed === 0) {
            // Someone else already matched with this user, add ourselves and wait
            await redis.zadd("random:queue", { score: Date.now(), member: sessionId });
            await redis.hset("random:sessions", { [sessionId]: JSON.stringify({ username, joinedAt: Date.now() }) });
            await redis.expire("random:queue", 3600);
            await redis.expire("random:sessions", 3600);
            console.log(`User ${sessionId} joined queue (match target already taken)`);
            return { status: "queued" as const };
          }
          
          await redis.hdel("random:sessions", matchedSessionId);
          
          // Create a random room with fixed 5-min TTL
          const roomId = nanoid();
          
          await redis.hset(`meta:${roomId}`, {
            connected: [],
            createdAt: Date.now(),
            maxParticipants: 2,
            isRandomChat: true,
          });
          
          await redis.expire(`meta:${roomId}`, RANDOM_CHAT_TTL_SECONDS);
          
          // Track room creation for stats
          await stats.roomCreated();
          
          // Store match info for both users (short TTL for retrieval)
          await redis.hset("random:matched", { 
            [sessionId]: roomId,
            [matchedSessionId]: roomId,
          });
          await redis.expire("random:matched", 60);
          
          console.log(`Random match: ${sessionId} <-> ${matchedSessionId} in room ${roomId}`);
          
          // Notify the waiting user via realtime
          await realtime.channel(matchedSessionId).emit("random.matched", {
            roomId,
            sessionId: matchedSessionId,
          });
          
          return { status: "matched" as const, roomId };
        }
        
        // No one waiting, add to queue
        await redis.zadd("random:queue", { score: Date.now(), member: sessionId });
        await redis.hset("random:sessions", { [sessionId]: JSON.stringify({ username, joinedAt: Date.now() }) });
        await redis.expire("random:queue", 3600);
        await redis.expire("random:sessions", 3600);
        
        console.log(`User ${sessionId} joined random queue`);
        
        return { status: "queued" as const };
      } finally {
        // Always release the lock
        await redis.del(lockKey);
      }
    },
    {
      body: z.object({
        sessionId: z.string(),
        username: z.string(),
      }),
    }
  )
  .post(
    "/queue/leave",
    async ({ body }) => {
      const { sessionId } = body;
      
      // Remove from queue
      await redis.zrem("random:queue", sessionId);
      await redis.hdel("random:sessions", sessionId);
      await redis.hdel("random:matched", sessionId);
      
      // Clean up the realtime stream for this session
      await redis.del(sessionId);
      
      console.log(`User ${sessionId} left random queue`);
      
      return { success: true };
    },
    {
      body: z.object({
        sessionId: z.string(),
      }),
    }
  )
  .get(
    "/queue/status",
    async ({ query }) => {
      const { sessionId } = query;
      
      // Check if matched
      const roomId = await redis.hget("random:matched", sessionId);
      if (roomId) {
        // Clean up match info and session stream
        await redis.hdel("random:matched", sessionId);
        await redis.del(sessionId); // Clean up realtime stream
        return { status: "matched" as const, roomId: roomId as string };
      }
      
      // Check if in queue
      const score = await redis.zscore("random:queue", sessionId);
      if (score !== null) {
        return { status: "queued" as const };
      }
      
      return { status: "not_in_queue" as const };
    },
    {
      query: z.object({
        sessionId: z.string(),
      }),
    }
  );

const app = new Elysia({ prefix: "/api" }).use(rooms).use(messages).use(random);

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
