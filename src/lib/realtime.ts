import { InferRealtimeEvents, Realtime } from "@upstash/realtime";
import z, { Infer } from "zod";
import { redis } from "../lib/redis";

const message = z.object({
  id: z.string(),
  sender: z.string(),
  text: z.string(),
  timestamp: z.number(),
  roomId: z.string(),
  token: z.string().optional(),
});

const schema = {
  chat: {
    message,
    destroy: z.object({
      isDestroyed: z.literal(true),
    }),
    typing: z.object({
      sender: z.string(),
      isTyping: z.boolean(),
    }),
  },
};

export const realtime = new Realtime({ schema, redis });
export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;
export type message = z.infer<typeof message>;
