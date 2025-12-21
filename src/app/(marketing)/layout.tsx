"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, Heart } from "lucide-react";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 selection:bg-green-500/30 overflow-hidden relative">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-green-500/5 blur-[120px] rounded-full opacity-50 pointer-events-none" />
      </div>

      <div className="relative z-10">
        {/* Persistent Header */}
        <nav className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center relative z-50">
          <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tighter">
            <span className="text-green-500">{"//"}</span> VANISH
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-xs font-bold tracking-widest text-zinc-500 uppercase">
            <Link href="/protocol" className="hover:text-white cursor-pointer transition-colors">Protocol</Link>
            <Link href="/security" className="hover:text-white cursor-pointer transition-colors">Security</Link>
            <Link href="/disclaimer" className="hover:text-white cursor-pointer transition-colors">Disclaimer</Link>
            <a 
              href="https://github.com/sponsors/NxtNinja" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/30 text-pink-400 hover:bg-pink-500/20 hover:border-pink-500/50 transition-all"
            >
              <Heart size={14} className="fill-pink-400" />
              Sponsor
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-zinc-400 hover:text-white transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl md:hidden animate-in fade-in duration-300">
            <div className="flex flex-col items-center justify-center h-full gap-12 text-2xl font-black tracking-tighter">
              <Link 
                href="/protocol" 
                onClick={() => setIsMenuOpen(false)}
                className="hover:text-green-500 transition-colors"
              >
                PROTOCOL
              </Link>
              <Link 
                href="/security" 
                onClick={() => setIsMenuOpen(false)}
                className="hover:text-green-500 transition-colors"
              >
                SECURITY
              </Link>
              <Link 
                href="/disclaimer" 
                onClick={() => setIsMenuOpen(false)}
                className="hover:text-green-500 transition-colors"
              >
                DISCLAIMER
              </Link>
              <a 
                href="https://github.com/sponsors/NxtNinja" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 text-pink-400 hover:text-pink-300 transition-colors"
              >
                <Heart size={24} className="fill-pink-400" />
                SPONSOR
              </a>
            </div>
          </div>
        )}

        {children}

        {/* Persistent Footer */}
        <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-zinc-900/50 flex flex-col md:flex-row justify-between items-center gap-12 md:gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link href="/" className="flex items-center gap-2 font-black text-sm tracking-tighter">
              <span className="text-green-500">{"//"}</span> VANISH_CHAT
            </Link>
            <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-[0.2em] text-center md:text-left">
              © {new Date().getFullYear()} Developed by{" "}
              <a 
                href="https://priyangsubanik.in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-green-500 transition-colors underline underline-offset-4"
              >
                Priyangsu Banik
              </a>
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-[0.3em] hidden md:block">
              Privacy is a right, not a feature.
            </p>
            <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <Link href="/protocol" className="hover:text-white transition-colors">Protocol</Link>
              <Link href="/security" className="hover:text-white transition-colors">Security</Link>
              <Link href="/disclaimer" className="hover:text-white transition-colors">Disclaimer</Link>
            </div>
          </div>

          <div className="flex gap-8 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
            <a 
              href="https://x.com/priyangsubanik" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Twitter
            </a>
            <a 
              href="https://github.com/NxtNinja" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a 
              href="https://github.com/sponsors/NxtNinja" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-pink-400 hover:text-pink-300 transition-colors"
            >
              <Heart size={10} className="fill-pink-400" />
              Sponsor
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

