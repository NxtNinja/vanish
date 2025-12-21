import type { Metadata } from "next";

type Props = {
  params: Promise<{ roomID: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roomID } = await params;

  return {
    title: `Random Chat | Vanish`,
    description: "Anonymous random chat session. This room will self-destruct in 5 minutes.",
  };
}

export default function RandomRoomLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
