import type { Metadata } from "next";
import { RoomClient } from "@/components/room-client";

type Props = {
  params: Promise<{ roomID: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roomID } = await params;
  return {
    title: `Room: ${roomID} | Vanish`,
    description: "Secure, ephemeral chat room. This session will self-destruct.",
  };
}

export default function RoomPage() {
  return <RoomClient />;
}
