import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Zap, Trash2, ArrowRight, Lock, EyeOff, Timer } from "lucide-react";

export const metadata: Metadata = {
  title: "Vanish | Secure, Ephermal, Private chat",
  description: "Messages that vanish. The most private way to communicate.",
};

const LandingPage = () => {
  return (
    <>
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-32">
          <div className="flex flex-col items-center text-center space-y-10">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800/50 text-[10px] font-bold tracking-[0.2em] text-green-500 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              SYSTEM STATUS: SECURE
            </div>
            
            <div className="space-y-4">
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white leading-[0.9] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                MESSAGES <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500">
                  THAT VANISH
                </span>
              </h1>
              <p className="max-w-2xl mx-auto text-zinc-500 text-lg md:text-xl leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
                The most private way to communicate. <span className="text-green-500 font-bold">End-to-end encrypted</span> with military-grade AES-256-GCM. 
                No logs, no tracking, and automatic self-destruction. Your privacy is our only protocol.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 pt-6 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
              <Link
                href="/lobby"
                className="group relative px-10 py-5 bg-green-500 text-black font-black text-sm tracking-widest rounded-none hover:bg-green-400 transition-all flex items-center gap-3 shadow-[0_0_40px_rgba(34,197,94,0.2)]"
              >
                INITIALIZE SESSION
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-7xl mx-auto px-6 py-32 relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1px bg-zinc-800/50 border border-zinc-800/50">
            <div className="bg-[#030303] p-12 space-y-6 group hover:bg-zinc-900/30 transition-colors">
              <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 group-hover:border-green-500/50 transition-all duration-500">
                <Shield className="text-green-500" size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">End-to-End Encrypted</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Military-grade AES-256-GCM encryption. Every message is encrypted before storage and decrypted only for you. Zero-knowledge architecture.
                </p>
              </div>
            </div>

            <div className="bg-[#030303] p-12 space-y-6 group hover:bg-zinc-900/30 transition-colors">
              <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 group-hover:border-green-500/50 transition-all duration-500">
                <Lock className="text-green-500" size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Zero-Log Policy</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  We don't store your IP, your identity, or your messages. Once you leave, the connection is severed forever.
                </p>
              </div>
            </div>

            <div className="bg-[#030303] p-12 space-y-6 group hover:bg-zinc-900/30 transition-colors">
              <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 group-hover:border-green-500/50 transition-all duration-500">
                <Timer className="text-green-500" size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Custom Lifespan</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Set your room's TTL from 1 to 20 minutes. When the timer hits zero, the entire room is purged from memory.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="max-w-7xl mx-auto px-6 py-32 border-t border-zinc-900/50">
          <div className="flex flex-col md:flex-row gap-20 items-center">
            <div className="flex-1 space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
                  BUILT FOR THE <br />
                  <span className="text-green-500">SHADOWS.</span>
                </h2>
                <p className="text-zinc-500 text-lg leading-relaxed">
                  Vanish is engineered with a focus on ephemeral data and end-to-end encryption. 
                  Every message is protected by AES-256-GCM encryption before storage. 
                  Our infrastructure is designed to forget, not to remember. Every message is a ghost.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="text-white font-bold text-sm uppercase tracking-widest">AES-256-GCM</div>
                  <div className="text-zinc-600 text-xs">Military-grade encryption with authenticated encryption mode.</div>
                </div>
                <div className="space-y-2">
                  <div className="text-white font-bold text-sm uppercase tracking-widest">Zero-Knowledge</div>
                  <div className="text-zinc-600 text-xs">We can't read your messages even if we wanted to.</div>
                </div>
                <div className="space-y-2">
                  <div className="text-white font-bold text-sm uppercase tracking-widest">Redis Backed</div>
                  <div className="text-zinc-600 text-xs">High-speed, in-memory data for instant purging.</div>
                </div>
                <div className="space-y-2">
                  <div className="text-white font-bold text-sm uppercase tracking-widest">Real-time</div>
                  <div className="text-zinc-600 text-xs">Seamless, encrypted communication.</div>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full aspect-square bg-zinc-900/20 border border-zinc-800/50 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Shield size={120} className="text-zinc-800 group-hover:text-green-500/20 transition-colors duration-700" />
              </div>
              <div className="absolute bottom-8 left-8 right-8">
                <div className="h-1 w-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-green-500 w-1/3 animate-[loading_3s_infinite_linear]" />
                </div>
                <div className="mt-4 flex justify-between font-mono text-[10px] text-zinc-600">
                  <span>ENCRYPTING_SESSION</span>
                  <span>100%_SECURE</span>
                </div>
              </div>
            </div>
          </div>
        </section>
    </>
  );
};

export default LandingPage;

