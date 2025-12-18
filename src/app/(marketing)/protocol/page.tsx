"use client";
import Link from "next/link";
import { ArrowLeft, Cpu, Globe, Zap, Database } from "lucide-react";

export default function ProtocolPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="space-y-16">
          <header className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-none">
              THE <span className="text-green-500">PROTOCOL</span>
            </h1>
            <p className="text-zinc-500 text-lg max-w-2xl font-medium">
              Technical specifications of the Vanish ephemeral communication system.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md space-y-4">
              <Cpu className="text-green-500" size={24} />
              <h3 className="text-xl font-bold text-white">Ephemeral Architecture</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Vanish operates on a "Memory-First" architecture. Unlike traditional chat apps that rely on persistent databases, Vanish utilizes high-speed, in-memory data structures that are designed to be volatile.
              </p>
            </div>

            <div className="p-8 bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md space-y-4">
              <Zap className="text-green-500" size={24} />
              <h3 className="text-xl font-bold text-white">Real-time Sync</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Communication is handled via a low-latency pub/sub protocol. Messages are broadcasted instantly to connected peers and are never written to disk in a readable format.
              </p>
            </div>

            <div className="p-8 bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md space-y-4">
              <Database className="text-green-500" size={24} />
              <h3 className="text-xl font-bold text-white">Redis-Backed TTL</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Every room is assigned a strict Time-To-Live (TTL) at the infrastructure level. Once the timer expires, the Redis keys associated with the room are atomically deleted.
              </p>
            </div>

            <div className="p-8 bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md space-y-4">
              <Globe className="text-green-500" size={24} />
              <h3 className="text-xl font-bold text-white">Zero-Persistence</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Our protocol ensures that no backups, logs, or traces of the conversation exist once the room is destroyed. The deletion is final and irreversible.
              </p>
            </div>
          </div>

          <section className="space-y-8 pt-8 border-t border-zinc-900">
            <h2 className="text-2xl font-bold text-white tracking-tight uppercase">Operational Flow</h2>
            <div className="space-y-6">
              <div className="flex gap-6">
                <div className="text-green-500 font-mono text-sm font-bold pt-1">01</div>
                <div className="space-y-2">
                  <h4 className="text-white font-bold">Session Initialization</h4>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    A unique Room ID is generated using a cryptographically secure nanoid. A metadata hash is created in memory with a user-defined expiration timer.
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-green-500 font-mono text-sm font-bold pt-1">02</div>
                <div className="space-y-2">
                  <h4 className="text-white font-bold">Peer Connection</h4>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    Users join the room using randomized identities. Connection tokens are managed in atomic sets to prevent unauthorized access and room overflow.
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-green-500 font-mono text-sm font-bold pt-1">03</div>
                <div className="space-y-2">
                  <h4 className="text-white font-bold">Atomic Destruction</h4>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    Upon manual trigger or TTL expiration, the system executes a multi-key deletion command, wiping all messages, metadata, and connection tokens simultaneously.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
  );
}
