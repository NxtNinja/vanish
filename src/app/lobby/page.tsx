import type { Metadata } from "next";
import { LobbyClient } from "@/components/lobby-client";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Lobby | Vanish",
  description: "Initialize your secure session and customize your room.",
};

export default function LobbyPage() {
  return (
    <Suspense>
      <LobbyClient />
    </Suspense>
  );
}
