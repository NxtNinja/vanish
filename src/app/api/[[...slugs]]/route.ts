import { redis } from "@/lib/redis";
import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";
import { authMiddleware } from "./auth";
import z from "zod";
import { message, realtime } from "@/lib/realtime";

const ROOM_TTL_SECONDS = 60 * 10;

const rooms = new Elysia({ prefix: "/room" })
  .post("/create", async () => {
    const roomId = nanoid();

    await redis.hset(`meta:${roomId}`, {
      connected: [],
      createdAt: Date.now(),
    });

    await redis.expire(`meta:${roomId}`, ROOM_TTL_SECONDS);

    return { roomId };
  })
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
      await realtime
        .channel(auth.roomId)
        .emit("chat.destroy", { isDestroyed: true });
      console.log("Destroy event emitted for:", auth.roomId);

      // Give some time for the event to propagate before deleting keys
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await Promise.all([
        redis.del(`meta:${auth.roomId}`),
        redis.del(`messages:${auth.roomId}`),
      ]);
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

      await redis.rpush(`messages:${roomId}`, {
        ...message,
        token: auth.token,
      });
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
      const messages = await redis.lrange<message>(
        `messages:${auth.roomId}`,
        0,
        -1
      );

      return {
        messages: messages.map((m) => ({
          ...m,
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

export const GET = app.fetch;
export const POST = app.fetch;
export const DELETE = app.fetch;

export type app = typeof app;
