import { redis } from "./redis";

// Stats keys - all prefixed with "stats:"
const KEYS = {
  totalRooms: "stats:total_rooms",
  totalMessages: "stats:total_messages",
  totalVanished: "stats:total_vanished",
  activeRooms: "stats:active_rooms", // This will be calculated dynamically
};

/**
 * Increment stats counters
 * All operations use INCR which is atomic and fast
 */
export const stats = {
  /** Called when a new room is created */
  async roomCreated() {
    await redis.incr(KEYS.totalRooms);
  },

  /** Called when a message is sent */
  async messageSent() {
    await redis.incr(KEYS.totalMessages);
  },

  /** Called when a room is vanished (destroyed) */
  async roomVanished() {
    await redis.incr(KEYS.totalVanished);
  },

  /** Get all stats for display */
  async getAll() {
    const [totalRooms, totalMessages, totalVanished] = await Promise.all([
      redis.get<number>(KEYS.totalRooms),
      redis.get<number>(KEYS.totalMessages),
      redis.get<number>(KEYS.totalVanished),
    ]);

    return {
      totalRooms: totalRooms || 0,
      totalMessages: totalMessages || 0,
      totalVanished: totalVanished || 0,
    };
  },
};
