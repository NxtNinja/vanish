import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Scale, ShieldAlert, HeartHandshake } from "lucide-react";

export const metadata: Metadata = {
  title: "Disclaimer | Vanish",
  description: "Ethical use policy and non-responsibility statement.",
};

export default function DisclaimerPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="space-y-16">
          <header className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-none">
              LEGAL <span className="text-red-500">DISCLAIMER</span>
            </h1>
            <p className="text-zinc-500 text-lg max-w-2xl font-medium">
              Ethical use policy and terms of service for the Vanish communication platform.
            </p>
          </header>

          <div className="space-y-8">
            <section className="p-8 bg-red-500/5 border border-red-500/10 backdrop-blur-md space-y-6">
              <div className="flex items-center gap-4 text-red-500">
                <AlertTriangle size={24} />
                <h3 className="text-xl font-bold uppercase tracking-tight">Ethical Use Policy</h3>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Vanish is designed and built for <strong>genuine, private communication purposes only</strong>. This application is not intended for, and must not be used for, any harmful, illegal, or malicious activities. We strictly prohibit the use of this platform for any "bad deeds" or actions that violate local or international laws.
              </p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md space-y-4">
                <Scale className="text-zinc-400" size={24} />
                <h3 className="text-lg font-bold text-white">Non-Responsibility</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  The developer of Vanish shall not be held responsible or liable for any misuse of the platform. By using this service, you acknowledge that you are solely responsible for your actions and the content you share.
                </p>
              </div>

              <div className="p-8 bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md space-y-4">
                <ShieldAlert className="text-zinc-400" size={24} />
                <h3 className="text-lg font-bold text-white">No Warranty</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  This application is provided "as is" without any warranties. While we strive for maximum security, we cannot guarantee absolute protection against all possible digital threats.
                </p>
              </div>
            </div>

            <section className="p-8 bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md space-y-6">
              <div className="flex items-center gap-4 text-green-500">
                <HeartHandshake size={24} />
                <h3 className="text-xl font-bold uppercase tracking-tight">Genuine Intent</h3>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Vanish was created with the positive intent of providing a safe space for private conversations. We trust our users to maintain the integrity of this platform by using it ethically and responsibly.
              </p>
            </section>
          </div>

          <div className="pt-12 border-t border-zinc-900 text-center">
            <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-[0.4em]">
              Integrity is the only protocol.
            </p>
          </div>
        </div>
      </div>
  );
}
