import { stats } from "@/lib/stats";
import { NextResponse } from "next/server";

export const revalidate = 60; // Revalidate every 60 seconds

export async function GET() {
  try {
    const data = await stats.getAll();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { totalRooms: 0, totalMessages: 0, totalVanished: 0 },
      { status: 500 }
    );
  }
}
