"use client";
import Link from "next/link";
import { Shield, Zap, Trash2, ArrowRight } from "lucide-react";

const LandingPage = () => {
  return (
    <main className="min-h-screen bg-black text-zinc-100 selection:bg-green-500/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-green-500/10 to-transparent blur-3xl opacity-50 pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-6 pt-32 pb-24 relative z-10">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-green-500 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              v1.0.0 RELEASED
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              MESSAGES THAT <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
                VANISH
              </span>
            </h1>
            
            <p className="max-w-xl text-zinc-400 text-lg md:text-xl leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
              A private, high-security chat room that self-destructs. 
              No logs, no traces, no bullshit. Just pure privacy.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
              <Link
                href="/lobby"
                className="group relative px-8 py-4 bg-white text-black font-bold rounded-none hover:bg-zinc-200 transition-all flex items-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 w-0 bg-green-500 transition-all duration-300 group-hover:w-full" />
                <span className="relative z-10 group-hover:text-white transition-colors">START SECURE CHAT</span>
                <ArrowRight size={18} className="relative z-10 group-hover:text-white transition-colors group-hover:translate-x-1 duration-300" />
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                className="px-8 py-4 bg-zinc-900 text-white font-bold border border-zinc-800 hover:bg-zinc-800 transition-all"
              >
                VIEW SOURCE
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto px-6 py-24 border-t border-zinc-900">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4 group">
            <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 group-hover:border-green-500/50 transition-colors">
              <Shield className="text-green-500" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">End-to-End Privacy</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Your identity is randomized and your messages are never stored permanently. Once the room is gone, it's gone.
            </p>
          </div>

          <div className="space-y-4 group">
            <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 group-hover:border-green-500/50 transition-colors">
              <Zap className="text-green-500" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Instant Setup</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              No accounts, no emails, no phone numbers. Create a room in one click and start chatting immediately.
            </p>
          </div>

          <div className="space-y-4 group">
            <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 group-hover:border-green-500/50 transition-colors">
              <Trash2 className="text-green-500" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Self-Destruction</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Every room has a countdown. When the timer hits zero, all data is wiped from our servers instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-zinc-900 text-center">
        <p className="text-zinc-600 text-xs font-mono uppercase tracking-widest">
          Built for the shadows. Stay safe.
        </p>
      </footer>
    </main>
  );
};

export default LandingPage;
