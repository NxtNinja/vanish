# Random Chat Auth Fix - Technical Walkthrough

This document explains the authentication and race condition issues discovered in the Random Chat feature and how they were resolved.

---

## Problem Summary

When two users were matched for random chat, the room would **immediately vanish** and both users would be redirected back to the lobby. The feature was completely broken.

---

## Root Causes Identified

### Issue 1: Race Condition in Matchmaking (Duplicate Rooms)

**What was happening:** When two users clicked "Find Stranger" nearly simultaneously, BOTH would find the other in the queue, and BOTH would create separate rooms. This resulted in each user going to a different room.

```
User A opens /random → joins queue → finds User B → creates Room 1 → redirects to Room 1
User B opens /random → joins queue → finds User A → creates Room 2 → redirects to Room 2
```

**Evidence from logs:**
```
Random match: random-2XEcMio5Xw <-> random-Wwe9XaC9cd in room gfXQ04wfhNTwwFKO6aWQZ
Random match: random-2XEcMio5Xw <-> random-Wwe9XaC9cd in room BQ85mFp0z-lBXZrd76nFY
```
Same users, TWO different rooms!

---

### Issue 2: Multiple Redirect Triggers (Room Full Error)

**What was happening:** Each client had THREE ways to detect a match:
1. `onSuccess` callback from the `joinQueue` mutation
2. Polling `queueStatus` every 2 seconds
3. Realtime event subscription

All three could fire, causing the same browser to navigate to the room **multiple times**, creating extra token requests.

**Evidence from logs:**
```
New token generated for random room sgt1jHgO5-zOJJZ-w5qUt. Total: 1
New token generated for random room sgt1jHgO5-zOJJZ-w5qUt. Total: 2
Room sgt1jHgO5-zOJJZ-w5qUt is full. Token count: 2, max: 2
```
Room was at max capacity after 2 tokens, then a 3rd request was rejected.

---

## Solutions Implemented

### Fix 1: Redis Lock for Matchmaking

Added a distributed lock to ensure only one matchmaking operation can happen at a time.

#### ❌ Before (Race Condition):

```typescript
// route.ts - Queue Join
async ({ body }) => {
  const { sessionId, username } = body;
  
  // Check if there's already someone waiting
  const waitingUsers = await redis.zrange("random:queue", 0, 0);
  
  if (waitingUsers.length > 0) {
    const matchedSessionId = waitingUsers[0];
    
    // PROBLEM: Both users can reach here simultaneously!
    await redis.zrem("random:queue", matchedSessionId);
    
    // Both create a room
    const roomId = nanoid();
    await redis.hset(`meta:${roomId}`, { ... });
    
    return { status: "matched", roomId };
  }
  
  // Add to queue
  await redis.zadd("random:queue", { score: Date.now(), member: sessionId });
  return { status: "queued" };
}
```

#### ✅ After (With Lock):

```typescript
// route.ts - Queue Join
async ({ body }) => {
  const { sessionId, username } = body;
  
  // Use a lock to prevent race conditions
  const lockKey = "random:matchmaking:lock";
  const lockTTL = 5;
  
  // Try to acquire lock using SETNX (atomic)
  const lockAcquired = await redis.setnx(lockKey, sessionId);
  if (!lockAcquired) {
    // Someone else is matchmaking, add ourselves and wait
    await redis.zadd("random:queue", { score: Date.now(), member: sessionId });
    return { status: "queued" };
  }
  
  // Set lock expiry to prevent deadlock
  await redis.expire(lockKey, lockTTL);
  
  try {
    const waitingUsers = await redis.zrange("random:queue", 0, 0);
    
    if (waitingUsers.length > 0) {
      const matchedSessionId = waitingUsers[0];
      
      // Atomically remove - if returns 0, someone else got them
      const removed = await redis.zrem("random:queue", matchedSessionId);
      if (removed === 0) {
        await redis.zadd("random:queue", { score: Date.now(), member: sessionId });
        return { status: "queued" };
      }
      
      const roomId = nanoid();
      await redis.hset(`meta:${roomId}`, { ... });
      
      return { status: "matched", roomId };
    }
    
    await redis.zadd("random:queue", { score: Date.now(), member: sessionId });
    return { status: "queued" };
  } finally {
    // Always release the lock
    await redis.del(lockKey);
  }
}
```

---

### Fix 2: Prevent Duplicate Redirects

Added a ref-based flag to ensure only ONE navigation occurs per match.

#### ❌ Before (Multiple Redirects):

```typescript
// random-lobby-client.tsx
export function RandomLobbyClient() {
  const router = useRouter();
  
  // All three can trigger redirects!
  
  // 1. Mutation success
  const { mutate: joinQueue } = useMutation({
    onSuccess: (data) => {
      if (data?.status === "matched") {
        router.push(`/random/${data.roomId}`);  // Can fire
      }
    },
  });
  
  // 2. Polling effect
  useEffect(() => {
    if (queueStatus?.status === "matched") {
      router.push(`/random/${queueStatus.roomId}`);  // Can also fire!
    }
  }, [queueStatus]);
  
  // 3. Realtime event
  useRealtime({
    onData: ({ data }) => {
      if (data.roomId) {
        router.push(`/random/${data.roomId}`);  // Can also fire!
      }
    },
  });
}
```

#### ✅ After (Safe Redirect):

```typescript
// random-lobby-client.tsx
export function RandomLobbyClient() {
  const router = useRouter();
  
  // Prevent duplicate redirects with a ref
  const isRedirectingRef = useRef(false);
  
  const safeRedirect = useCallback((roomId: string) => {
    if (isRedirectingRef.current) {
      console.log("Already redirecting, ignoring duplicate");
      return;
    }
    isRedirectingRef.current = true;
    router.push(`/random/${roomId}`);
  }, [router]);
  
  // All three now use safeRedirect - only first one wins
  
  const { mutate: joinQueue } = useMutation({
    onSuccess: (data) => {
      if (data?.status === "matched") {
        safeRedirect(data.roomId);  // ✓ Safe
      }
    },
  });
  
  // Disable polling if already redirecting
  const { data: queueStatus } = useQuery({
    enabled: isSearching && !isRedirectingRef.current,
    refetchInterval: 2000,
  });
  
  useEffect(() => {
    if (queueStatus?.status === "matched") {
      safeRedirect(queueStatus.roomId);  // ✓ Safe
    }
  }, [queueStatus, safeRedirect]);
  
  useRealtime({
    onData: ({ data }) => {
      if (data.roomId) {
        safeRedirect(data.roomId);  // ✓ Safe
      }
    },
  });
}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/app/api/[[...slugs]]/route.ts` | Added Redis lock for matchmaking, atomic ZREM check |
| `src/components/random-lobby-client.tsx` | Added `isRedirectingRef` and `safeRedirect` to prevent duplicate navigations |
| `src/proxy.ts` | Added debug logging and `/random/[roomID]` route handling |

---

## Verification

After the fixes, logs show:
- **Single room per match**: `Random match: random-RTowJfUf-z <-> random--EGYyQfbGI in room zJ3dS8OZipvck0tpC0TwH`
- **Lock working**: `User random--EGYyQfbGI joined random queue (lock held by another)`
- **Only 2 tokens**: `New token generated... Total: 1` then `Total: 2` - no rejected requests

---

## Key Takeaways

1. **Always use locks for multi-step Redis operations** when multiple clients can execute the same code simultaneously
2. **Use refs (not state) for flags** that need to persist across React renders immediately
3. **Have a single source of truth** for navigation - use a wrapper function to prevent duplicate router.push calls
4. **Disable redundant triggers** - if redirecting, stop polling and ignore further events
5. **Persist session identifiers** - use sessionStorage to maintain session consistency across page reloads

---

## Fix 3: Session Persistence for Page Reloads (Added Later)

### Issue 3: Page Reload Causes Ghost Matches

**What was happening:** Every page reload generated a NEW sessionId, but the old session's match data remained in Redis. This caused:
1. User joins queue with sessionId `A`
2. User reloads page → gets NEW sessionId `B`
3. Old sessionId `A` gets matched in Redis
4. Polling/realtime picks up the match for session `A`
5. User gets redirected to a room they're alone in (the partner was matched to OLD session)

**Evidence from logs:**
```
User random-ugn4D3IDXi joined random queue
[page reload]
Random match: random-fj26WVXnAx <-> random-ugn4D3IDXi in room 5UAyogVJfAWGcIJ4W63Xs
# But user now has a different sessionId! They end up alone.
```

---

### Solution: Persist SessionId in SessionStorage

#### ❌ Before (New Session Each Load):

```typescript
// random-lobby-client.tsx
export function RandomLobbyClient() {
  // NEW sessionId every time component mounts!
  const [sessionId] = useState(() => `random-${nanoid(10)}`);
  
  // If user reloads:
  // 1. Old sessionId is orphaned in Redis queue
  // 2. New sessionId joins queue
  // 3. Old sessionId might get matched → user redirected to wrong room
}
```

#### ✅ After (Persistent Session):

```typescript
// random-lobby-client.tsx
export function RandomLobbyClient() {
  const wasDestroyed = searchParams.get("destroyed") === "true";

  // Persist sessionId in sessionStorage to handle page reloads consistently
  const [sessionId] = useState(() => {
    if (typeof window === "undefined") return `random-${nanoid(10)}`;
    
    // If coming from a destroyed room, clear old session and start fresh
    if (wasDestroyed) {
      sessionStorage.removeItem("random-session-id");
      const newId = `random-${nanoid(10)}`;
      sessionStorage.setItem("random-session-id", newId);
      return newId;
    }
    
    // Try to get existing session or create new one
    const existing = sessionStorage.getItem("random-session-id");
    if (existing) return existing;
    
    const newId = `random-${nanoid(10)}`;
    sessionStorage.setItem("random-session-id", newId);
    return newId;
  });

  // Clear session when redirecting to room
  const safeRedirect = useCallback((roomId: string) => {
    if (isRedirectingRef.current) return;
    isRedirectingRef.current = true;
    sessionStorage.removeItem("random-session-id"); // ← Clear for next visit
    router.push(`/random/${roomId}`);
  }, [router]);

  // Clear session when cancelling
  const handleCancel = useCallback(() => {
    sessionStorage.removeItem("random-session-id"); // ← Clear for next visit
    leaveQueue();
    router.push("/lobby");
  }, [leaveQueue, router]);
}
```

---

### Session Lifecycle Summary

| Event | Session Action |
|-------|----------------|
| First visit to `/random` | Create new sessionId, save to sessionStorage |
| Page reload while searching | Use SAME sessionId from sessionStorage |
| Match found, redirecting to room | Clear sessionStorage |
| User cancels search | Clear sessionStorage |
| Room destroyed (`?destroyed=true`) | Clear sessionStorage, create new session |
| User manually closes tab | sessionStorage cleared by browser |

---

### Additional Guards Added

```typescript
// Prevent duplicate queue joins on mount (React Strict Mode)
const hasJoinedRef = useRef(false);

useEffect(() => {
  if (hasJoinedRef.current) return;
  if (isSearching || wasDestroyed || isJoining) return;
  
  hasJoinedRef.current = true;
  joinQueue();
}, []);

// Reset states properly when retrying
const handleRetry = useCallback(() => {
  if (!isSearching && !isJoining) {
    setTimedOut(false);
    setStrangerFound(false);
    isRedirectingRef.current = false;
    joinQueue();
  }
}, [isSearching, isJoining, joinQueue]);
```

---

## Complete Files Modified Summary

| File | Changes |
|------|---------|
| `src/app/api/[[...slugs]]/route.ts` | Redis lock for matchmaking, atomic ZREM check |
| `src/components/random-lobby-client.tsx` | `isRedirectingRef`, `safeRedirect`, `hasJoinedRef`, sessionStorage persistence |
| `src/proxy.ts` | Debug logging and `/random/[roomID]` route handling |
