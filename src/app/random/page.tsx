import type { Metadata } from "next";
import { RandomLobbyClient } from "@/components/random-lobby-client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Random Chat | Vanish",
  description: "Talk to a random stranger anonymously. 5 minutes only. Messages vanish.",
};

function LoadingFallback() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black">
      <div className="flex items-center gap-3 text-purple-400">
        <Loader2 className="animate-spin" size={24} />
        <span className="text-sm font-bold tracking-wide">Loading...</span>
      </div>
    </main>
  );
}

export default function RandomLobbyPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RandomLobbyClient />
    </Suspense>
  );
}
