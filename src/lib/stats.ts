import { redis } from "./redis";

// Stats keys - all prefixed with "stats:"
const KEYS = {
  totalRooms: "stats:total_rooms",
  totalMessages: "stats:total_messages",
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

  /** Count active rooms by scanning for meta:* keys */
  async getActiveRoomCount(): Promise<number> {
    let count = 0;
    let cursor = 0;
    
    do {
      // SCAN for meta:* keys (each room has one meta key)
      const result = await redis.scan(cursor, { match: "meta:*", count: 100 });
      cursor = Number(result[0]);
      count += result[1].length;
    } while (cursor !== 0);
    
    return count;
  },

  /** Get all stats for display */
  async getAll() {
    const [totalRooms, totalMessages, activeRooms] = await Promise.all([
      redis.get<number>(KEYS.totalRooms),
      redis.get<number>(KEYS.totalMessages),
      stats.getActiveRoomCount(),
    ]);

    const total = totalRooms || 0;
    // Vanished = total ever created - currently active
    const vanished = Math.max(0, total - activeRooms);

    return {
      totalRooms: total,
      totalMessages: totalMessages || 0,
      totalVanished: vanished,
    };
  },
};
