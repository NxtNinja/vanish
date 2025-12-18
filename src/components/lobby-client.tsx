"use client";
import { useUsername } from "@/hooks/use-username";
import { client } from "@/lib/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

export function LobbyClient() {
  const { username, refreshUsername } = useUsername();
  const router = useRouter();
  const [ttl, setTtl] = useState(10);

  const searchParams = useSearchParams();
  const wasDestroyed = searchParams.get("destroyed") === "true";
  const error = searchParams.get("error");

  const { mutate: createRoom, isPending } = useMutation({
    mutationFn: async () => {
      const res = await client.room.create.post({ ttl });

      if (res.status === 200) {
        router.push(`/room/${res.data?.roomId}`);
      }
    },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {wasDestroyed && (
          <div className="bg-red-950/50 border border-red-900 p-6 text-center">
            <p className="text-red-500 text-sm font-bold">ROOM DESTROYED</p>
            <p className="text-zinc-500 text-xs mt-1">
              All messages were permanently deleted.
            </p>
          </div>
        )}

        {error === "room-not-found" && (
          <div className="bg-red-950/50 border border-red-900 p-6 text-center">
            <p className="text-red-500 text-sm font-bold">ROOM NOT FOUND</p>
            <p className="text-zinc-500 text-xs mt-1">
              This room may have been destroyed or never existed.
            </p>
          </div>
        )}

        {error === "room-full" && (
          <div className="bg-red-950/50 border border-red-900 p-6 text-center">
            <p className="text-red-500 text-sm font-bold">ROOM FULL</p>
            <p className="text-zinc-500 text-xs mt-1">
              This room is at maximum capacity.
            </p>
          </div>
        )}

        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-green-500">
              {">"} vanish_chat
            </h1>
            <p className="text-zinc-500 text-sm">
              A private, self-destructing chat room.
            </p>
          </div>
        </div>
        <div className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="flex items-center text-zinc-500 text-xs uppercase tracking-wider font-bold">
                Your Identity
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-400 font-mono">
                  {username}
                </div>
                <button
                  onClick={() => refreshUsername()}
                  className="p-3 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white"
                  title="Refresh Identity"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-zinc-500 text-xs uppercase tracking-wider font-bold">
                  Room Lifespan
                </label>
                <span className="text-green-500 font-mono text-sm font-bold">
                  {ttl} MINS
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={ttl}
                onChange={(e) => setTtl(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                <span>1 MIN</span>
                <span>20 MINS</span>
              </div>
            </div>

            <button
              onClick={() => createRoom()}
              disabled={isPending}
              className="w-full bg-zinc-100 text-black p-4 text-sm font-bold hover:bg-white transition-all mt-2 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  CREATING...
                </>
              ) : (
                "CREATE SECURE ROOM"
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
