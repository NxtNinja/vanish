"use client";
import { useUsername } from "@/hooks/use-username";
import { client } from "@/lib/client";
import { useRealtime } from "@/lib/realtime-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, X, Radio, ArrowLeft, RefreshCw } from "lucide-react";
import { nanoid } from "nanoid";
import Link from "next/link";

export function RandomLobbyClient() {
  const { username, refreshUsername } = useUsername();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wasDestroyed = searchParams.get("destroyed") === "true";

  const [sessionId] = useState(() => `random-${nanoid(10)}`);
  const [isSearching, setIsSearching] = useState(false);
  const [showStatusToast, setShowStatusToast] = useState(true);
  const [dots, setDots] = useState<Array<{ x: number; y: number; delay: number }>>([]);
  const [searchTimeout, setSearchTimeout] = useState(60);
  const [timedOut, setTimedOut] = useState(false);
  
  // Prevent duplicate redirects - use ref to track across renders
  const isRedirectingRef = useRef(false);
  
  // Safe redirect function that only allows one redirect
  const safeRedirect = useCallback((roomId: string) => {
    if (isRedirectingRef.current) {
      console.log("Already redirecting, ignoring duplicate");
      return;
    }
    isRedirectingRef.current = true;
    console.log(`Redirecting to room ${roomId}`);
    router.push(`/random/${roomId}`);
  }, [router]);

  // Generate random dots for radar animation
  useEffect(() => {
    const newDots = Array.from({ length: 8 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3,
    }));
    setDots(newDots);
  }, []);

  // Auto-dismiss destroyed toast
  useEffect(() => {
    if (wasDestroyed) {
      setShowStatusToast(true);
      const timer = setTimeout(() => {
        setShowStatusToast(false);
        router.replace("/random");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [wasDestroyed, router]);

  // Join queue mutation
  const { mutate: joinQueue, isPending: isJoining } = useMutation({
    mutationFn: async () => {
      const res = await client.random.queue.join.post({ sessionId, username });
      return res.data;
    },
    onSuccess: async (data) => {
      if (data?.status === "matched" && data?.roomId) {
        // Small delay to ensure room is ready
        await new Promise(resolve => setTimeout(resolve, 200));
        safeRedirect(data.roomId);
      } else {
        setIsSearching(true);
      }
    },
  });

  // Leave queue mutation
  const { mutate: leaveQueue } = useMutation({
    mutationFn: async () => {
      await client.random.queue.leave.post({ sessionId });
    },
    onSuccess: () => {
      setIsSearching(false);
    },
  });

  // Poll for match status while searching
  const { data: queueStatus } = useQuery({
    queryKey: ["queue-status", sessionId],
    queryFn: async () => {
      const res = await client.random.queue.status.get({ query: { sessionId } });
      return res.data;
    },
    enabled: isSearching && !isRedirectingRef.current,
    refetchInterval: 2000,
  });

  // Redirect when matched via polling
  useEffect(() => {
    if (queueStatus?.status === "matched" && queueStatus?.roomId) {
      // Small delay to ensure room is ready
      setTimeout(() => {
        safeRedirect(queueStatus.roomId);
      }, 200);
    }
  }, [queueStatus, safeRedirect]);

  // Listen for realtime match events
  useRealtime({
    channels: [sessionId],
    events: ["random.matched"],
    onData: async ({ event, data }) => {
      if (event === "random.matched" && data.roomId) {
        // Small delay to ensure room is ready
        await new Promise(resolve => setTimeout(resolve, 200));
        safeRedirect(data.roomId);
      }
    },
  });

  // Auto-start searching on mount
  useEffect(() => {
    if (!isSearching && !wasDestroyed) {
      joinQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSearching) {
        leaveQueue();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching]);

  // Search timeout - 60 seconds
  useEffect(() => {
    if (!isSearching) {
      setSearchTimeout(60);
      setTimedOut(false);
      return;
    }

    const interval = setInterval(() => {
      setSearchTimeout((prev: number) => {
        if (prev <= 1) {
          leaveQueue();
          setTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSearching, leaveQueue]);

  const handleCancel = useCallback(() => {
    leaveQueue();
    router.push("/lobby");
  }, [leaveQueue, router]);

  const handleRetry = useCallback(() => {
    if (!isSearching) {
      joinQueue();
    }
  }, [isSearching, joinQueue]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-black">
      {/* Destroyed Toast */}
      {wasDestroyed && showStatusToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 text-white px-4 py-3 rounded-lg">
            <span>💨</span>
            <span className="text-sm">Chat ended</span>
            <button 
              onClick={() => { setShowStatusToast(false); router.replace("/random"); }} 
              className="ml-2 text-zinc-500 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <p className="text-purple-400 text-xs font-medium">
              Joining as <span className="text-white">{username}</span>
            </p>
            <button
              onClick={refreshUsername}
              className="p-1 text-zinc-500 hover:text-purple-400 transition-colors"
              title="Generate new username"
            >
              <RefreshCw size={12} />
            </button>
          </div>
          <h1 className="text-2xl font-bold text-white">Random Chat</h1>
          <p className="text-zinc-500 text-sm">
            Chat with a stranger for 5 minutes
          </p>
        </div>

        {/* Main Animation Area */}
        <div className="flex flex-col items-center justify-center py-12">
          {isSearching || isJoining ? (
            <>
              {/* Pulsing circles animation */}
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping" />
                <div className="absolute inset-4 rounded-full border-2 border-purple-500/40 animate-ping" style={{ animationDelay: '0.5s' }} />
                <div className="absolute inset-8 rounded-full border-2 border-purple-500/50 animate-ping" style={{ animationDelay: '1s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                </div>
              </div>
              
              {/* Status text */}
              <div className="mt-8 text-center">
                <p className="text-white font-medium">
                  {isJoining ? "Connecting..." : "Looking for someone..."}
                </p>
                <p className="text-zinc-500 text-sm mt-1">
                  Timeout in {searchTimeout}s
                </p>
              </div>
            </>
          ) : timedOut ? (
            <>
              {/* Timed out state */}
              <div className="w-24 h-24 rounded-full bg-zinc-800/50 border-2 border-zinc-700 flex items-center justify-center">
                <X className="w-8 h-8 text-zinc-500" />
              </div>
              
              <p className="mt-6 text-zinc-400 text-sm text-center">
                No one available right now
              </p>
              <p className="text-zinc-600 text-xs text-center mt-1">
                Try again or come back later
              </p>
            </>
          ) : (
            <>
              {/* Idle state */}
              <div className="w-24 h-24 rounded-full bg-purple-600/10 border-2 border-purple-500/30 flex items-center justify-center">
                <Radio className="w-8 h-8 text-purple-500" />
              </div>
              
              <p className="mt-6 text-zinc-500 text-sm text-center">
                Click below to find a random stranger
              </p>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {isSearching ? (
            <button
              onClick={handleCancel}
              className="w-full py-3 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 text-sm font-medium transition-all"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={handleRetry}
              disabled={isJoining}
              className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all disabled:opacity-50"
            >
              {isJoining ? "Connecting..." : "Find Stranger"}
            </button>
          )}
          
          <Link 
            href="/lobby" 
            className="block w-full py-3 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 text-sm font-medium text-center transition-all"
          >
            Back to Lobby
          </Link>
        </div>

        {/* Info */}
        <div className="flex justify-center gap-6 text-center pt-4">
          <div>
            <p className="text-purple-400 text-lg font-medium">5 min</p>
            <p className="text-zinc-600 text-xs">Chat limit</p>
          </div>
          <div className="w-px bg-zinc-800" />
          <div>
            <p className="text-purple-400 text-lg">🎭</p>
            <p className="text-zinc-600 text-xs">Anonymous</p>
          </div>
          <div className="w-px bg-zinc-800" />
          <div>
            <p className="text-purple-400 text-lg">💨</p>
            <p className="text-zinc-600 text-xs">Auto-vanish</p>
          </div>
        </div>
      </div>
    </main>
  );
}

