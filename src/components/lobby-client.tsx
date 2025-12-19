"use client";
import { useUsername } from "@/hooks/use-username";
import { client } from "@/lib/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Shield, Clock, Zap, Check, Users, X } from "lucide-react";

export function LobbyClient() {
  const { username, refreshUsername } = useUsername();
  const router = useRouter();
  const [ttl, setTtl] = useState(10);
  const [showToast, setShowToast] = useState(false);
  const [showGroupOptions, setShowGroupOptions] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(3);
  const [showStatusToast, setShowStatusToast] = useState(true);

  const searchParams = useSearchParams();
  const wasDestroyed = searchParams.get("destroyed") === "true";
  const error = searchParams.get("error");

  // Auto-dismiss status toasts after 4 seconds
  useEffect(() => {
    if (wasDestroyed || error) {
      setShowStatusToast(true);
      const timer = setTimeout(() => {
        setShowStatusToast(false);
        // Clear URL params
        router.replace("/lobby");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [wasDestroyed, error, router]);

  const { mutate: createRoom, isPending } = useMutation({
    mutationFn: async (isGroup?: boolean) => {
      const res = await client.room.create.post({ 
        ttl,
        maxParticipants: isGroup ? maxParticipants : 2
      });

      if (res.status === 200) {
        setShowToast(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        router.push(`/room/${res.data?.roomId}`);
      }
    },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 bg-green-500 text-black px-5 py-3 font-bold text-sm tracking-wide shadow-lg shadow-green-500/20">
            <Check size={18} strokeWidth={3} />
            <span>Room created! Redirecting...</span>
          </div>
        </div>
      )}

      {/* Subtle background grid pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />
      
      {/* Toast Messages - Auto-dismiss after 4s */}
      {wasDestroyed && showStatusToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 bg-red-500 text-white px-5 py-3 rounded-lg shadow-lg shadow-red-500/20">
            <span>💥</span>
            <span className="font-bold text-sm">Room vanished</span>
            <span className="text-red-200 text-xs">• All messages erased</span>
            <button onClick={() => { setShowStatusToast(false); router.replace("/lobby"); }} className="ml-2 hover:bg-red-600 p-1 rounded">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {error === "room-not-found" && showStatusToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 bg-amber-500 text-black px-5 py-3 rounded-lg shadow-lg shadow-amber-500/20">
            <span>🔍</span>
            <span className="font-bold text-sm">Room not found</span>
            <button onClick={() => { setShowStatusToast(false); router.replace("/lobby"); }} className="ml-2 hover:bg-amber-600 p-1 rounded">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {error === "room-full" && showStatusToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 bg-amber-500 text-black px-5 py-3 rounded-lg shadow-lg shadow-amber-500/20">
            <span>🚫</span>
            <span className="font-bold text-sm">Room full</span>
            <button onClick={() => { setShowStatusToast(false); router.replace("/lobby"); }} className="ml-2 hover:bg-amber-600 p-1 rounded">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md space-y-5 relative z-10">

        {/* Header Section */}
        <div className="text-center space-y-4 py-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-950/30 border border-green-900/50 text-green-400 text-[10px] font-bold tracking-widest uppercase">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Secure Protocol Active
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-green-500">{">"}</span>
            <span className="text-white"> vanish</span>
            <span className="text-zinc-600">_chat</span>
          </h1>
          <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">
            Private, encrypted, self-destructing conversations. Be respectful.
          </p>
          <p className="text-zinc-600 text-[10px] font-bold tracking-widest uppercase mt-3">
            ENCRYPTED • AUTO-DELETE • ANONYMOUS
          </p>
        </div>

        {/* Main Card */}
        <div className="border-2 border-zinc-800 bg-zinc-900/80 backdrop-blur-md overflow-hidden">
          {/* Card Header */}
          <div className="border-b border-zinc-800 bg-zinc-900 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                <Shield size={16} className="text-green-500" />
              </div>
              <div>
                <h2 className="text-white text-sm font-bold">Create New Room</h2>
                <p className="text-zinc-500 text-[11px]">Configure your secure session</p>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-6 space-y-6">
            {/* Identity Section */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-zinc-400 text-[11px] uppercase tracking-wider font-bold">
                <Zap size={12} className="text-green-500" />
                Your Identity
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black border-2 border-zinc-800 p-3.5 text-sm text-green-400 font-mono tracking-wide">
                  <span className="text-zinc-600 mr-1">@</span>{username}
                </div>
                <button
                  onClick={() => refreshUsername()}
                  className="p-3.5 bg-zinc-800 border-2 border-zinc-700 hover:border-green-500/50 hover:bg-zinc-700 transition-all text-zinc-400 hover:text-green-400 group"
                  title="Generate New Identity"
                >
                  <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                </button>
              </div>
              <p className="text-zinc-600 text-[10px]">Anonymous identity auto-generated</p>
            </div>

            {/* TTL Section */}
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 text-zinc-400 text-[11px] uppercase tracking-wider font-bold">
                  <Clock size={12} className="text-amber-500" />
                  Room Lifespan
                </label>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white tabular-nums">{ttl}</span>
                  <span className="text-zinc-500 text-xs font-bold">MIN{ttl !== 1 ? 'S' : ''}</span>
                </div>
              </div>
              
              {/* Custom Slider Track */}
              <div className="relative py-2">
                <div className="h-2 bg-zinc-800 relative overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-600 to-green-400"
                    style={{ width: `${((ttl - 1) / 19) * 100}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={ttl}
                  onChange={(e) => setTtl(parseInt(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
              
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                  1 MIN
                </span>
                <span className="text-zinc-700">|</span>
                <span className="text-zinc-500">10 MIN</span>
                <span className="text-zinc-700">|</span>
                <span className="flex items-center gap-1">
                  20 MIN
                  <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                </span>
              </div>
            </div>
          </div>

          {/* Card Footer - CTA Buttons */}
          <div className="p-6 pt-0 space-y-3">
            {/* 1-on-1 Room Button */}
            <button
              onClick={() => createRoom(false)}
              disabled={isPending}
              className="w-full bg-green-500 hover:bg-green-400 text-black p-4 text-sm font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 group"
            >
              {isPending && !showGroupOptions ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>INITIALIZING...</span>
                </>
              ) : (
                <>
                  <span>CREATE SECURE ROOM</span>
                  <span className="text-black/60 group-hover:translate-x-1 transition-transform">→</span>
                </>
              )}
            </button>

            {/* Group Chat Toggle */}
            {!showGroupOptions ? (
              <button
                onClick={() => setShowGroupOptions(true)}
                disabled={isPending}
                className="w-full border border-zinc-700 hover:border-zinc-600 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white p-3 text-xs font-bold tracking-wide transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Users size={14} />
                <span>Create Group Chat (3-5 members)</span>
              </button>
            ) : (
              <div className="border border-zinc-700 bg-zinc-900/50 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-zinc-400 text-[11px] uppercase tracking-wider font-bold">
                    <Users size={12} className="text-blue-500" />
                    Max Members
                  </label>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-white tabular-nums">{maxParticipants}</span>
                    <span className="text-zinc-500 text-xs font-bold">PEOPLE</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {[3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setMaxParticipants(num)}
                      className={`flex-1 py-2 text-sm font-bold transition-all ${
                        maxParticipants === num
                          ? "bg-blue-500 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowGroupOptions(false)}
                    className="flex-1 py-2 text-xs text-zinc-500 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createRoom(true)}
                    disabled={isPending}
                    className="flex-1 bg-blue-500 hover:bg-blue-400 text-white py-2 text-xs font-bold tracking-wide transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isPending ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <>
                        <Users size={14} />
                        CREATE GROUP
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
