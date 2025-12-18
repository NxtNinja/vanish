import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, EyeOff, Lock, ServerOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Security | Vanish",
  description: "Our commitment to zero-log privacy and anonymous communication.",
};

export default function SecurityPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="space-y-16">
          <header className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-none">
              SECURITY <span className="text-green-500">MANIFESTO</span>
            </h1>
            <p className="text-zinc-500 text-lg max-w-2xl font-medium">
              Our commitment to your absolute privacy and data sovereignty.
            </p>
          </header>

          <div className="space-y-12">
            <section className="p-8 bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md flex flex-col md:flex-row gap-8 items-start">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <ShieldCheck className="text-green-500" size={32} />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white tracking-tight">Zero-Log Infrastructure</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  We do not maintain any logs of user activity. Our servers are configured to discard all request metadata, IP addresses, and session details immediately after processing. There is no historical record of who used the service or when.
                </p>
              </div>
            </section>

            <section className="p-8 bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md flex flex-col md:flex-row gap-8 items-start">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <EyeOff className="text-green-500" size={32} />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white tracking-tight">Anonymous Identity Generation</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Vanish does not use accounts, emails, or phone numbers. Every user is assigned a randomized, non-traceable identity (e.g., "anonymous-fox") that exists only within the context of a single room. No persistent identifiers are ever created.
                </p>
              </div>
            </section>

            <section className="p-8 bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md flex flex-col md:flex-row gap-8 items-start">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <Lock className="text-green-500" size={32} />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white tracking-tight">In-Memory Processing</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  All messages are processed and stored exclusively in RAM. We never write message content to persistent disk storage (SSD/HDD). This ensures that even in the event of a physical server seizure, no data can be recovered.
                </p>
              </div>
            </section>

            <section className="p-8 bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md flex flex-col md:flex-row gap-8 items-start">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <ServerOff className="text-green-500" size={32} />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white tracking-tight">Atomic Purge Mechanism</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  When a room is destroyed—either manually or via TTL expiration—the system performs an atomic wipe. This isn't just a "delete" flag; it's a complete removal of the data from memory, leaving zero traces behind.
                </p>
              </div>
            </section>
          </div>

          <div className="p-12 bg-green-500/5 border border-green-500/10 text-center space-y-4">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">Privacy by Default</h2>
            <p className="text-zinc-500 text-sm max-w-xl mx-auto leading-relaxed">
              Vanish is not just a chat app; it's a statement against the era of mass surveillance. We believe that your conversations should belong to you, and only you.
            </p>
          </div>
        </div>
      </div>
  );
}
