"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Users, Sparkles, BarChart3 } from "lucide-react";

interface Stats {
  totalRooms: number;
  totalMessages: number;
  totalVanished: number;
}

export function StatsSection() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!stats) {
    // Skeleton loader matching exact layout
    return (
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-zinc-900/50">
        <div className="flex flex-col md:flex-row gap-12 md:gap-20 items-center">
          {/* Left Side Skeleton */}
          <div className="flex-1 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="h-12 w-32 bg-zinc-800/50 animate-pulse" />
                <div className="h-12 w-64 bg-zinc-800/50 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-zinc-800/30 animate-pulse" />
                <div className="h-4 w-3/4 bg-zinc-800/30 animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-zinc-800/50 animate-pulse" />
                <div className="h-3 w-32 bg-zinc-800/30 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-20 bg-zinc-800/50 animate-pulse" />
                <div className="h-3 w-28 bg-zinc-800/30 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Right Side Skeleton */}
          <div className="flex-1 w-full bg-zinc-900/20 border border-zinc-800/50">
            <div className="p-8 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-800/50 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-8 w-20 bg-zinc-800/50 animate-pulse" />
                    <div className="h-3 w-24 bg-zinc-800/30 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-800/50 px-8 py-4 bg-zinc-950/30">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-zinc-800/30 animate-pulse" />
                <div className="h-3 w-20 bg-zinc-800/30 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Don't show if no activity yet
  if (stats.totalRooms === 0 && stats.totalMessages === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-20 border-t border-zinc-900/50">
      <div className="flex flex-col md:flex-row gap-12 md:gap-20 items-center">
        {/* Left Side - Text Content */}
        <div className="flex-1 space-y-6">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
              LIVE <br />
              <span className="text-green-500">PLATFORM STATS.</span>
            </h2>
            <p className="text-zinc-500 text-lg leading-relaxed">
              We track only anonymous counts — never your messages, identity, or room content. 
              All conversations are permanently erased when rooms vanish.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="text-white font-bold text-sm uppercase tracking-widest">Counting Only</div>
              <div className="text-zinc-600 text-xs">No message content is ever stored long-term.</div>
            </div>
            <div className="space-y-1">
              <div className="text-white font-bold text-sm uppercase tracking-widest">Anonymous</div>
              <div className="text-zinc-600 text-xs">No IP addresses or identities tracked.</div>
            </div>
          </div>
        </div>

        {/* Right Side - Stats Visual */}
        <div className="flex-1 w-full bg-zinc-900/20 border border-zinc-800/50 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="p-8 space-y-6">
            {/* Stat Row 1 */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center bg-green-500/10 border border-green-500/20 shrink-0">
                <Users size={18} className="text-green-500" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-black text-white tabular-nums">{formatNumber(stats.totalRooms)}</div>
                <div className="text-[10px] text-zinc-600 font-bold tracking-widest uppercase">Rooms Created</div>
              </div>
            </div>

            {/* Stat Row 2 */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 border border-blue-500/20 shrink-0">
                <MessageSquare size={18} className="text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-black text-white tabular-nums">{formatNumber(stats.totalMessages)}</div>
                <div className="text-[10px] text-zinc-600 font-bold tracking-widest uppercase">Messages Sent</div>
              </div>
            </div>

            {/* Stat Row 3 */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center bg-red-500/10 border border-red-500/20 shrink-0">
                <Sparkles size={18} className="text-red-500" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-black text-white tabular-nums">{formatNumber(stats.totalVanished)}</div>
                <div className="text-[10px] text-zinc-600 font-bold tracking-widest uppercase">Rooms Vanished</div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-zinc-800/50 px-8 py-4 bg-zinc-950/30">
            <div className="flex items-center justify-between font-mono text-[10px] text-zinc-600">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span>LIVE_METRICS</span>
              </div>
              <span>PRIVACY_FIRST</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
