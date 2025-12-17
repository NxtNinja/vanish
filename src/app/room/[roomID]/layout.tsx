import type { Metadata } from "next";

type Props = {
  params: Promise<{ roomID: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roomID } = await params;

  return {
    title: `Room ${roomID} | Vanish`,
    description: "Join this private, self-destructing chat room on Vanish.",
  };
}

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
