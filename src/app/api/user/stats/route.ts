export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getLevelProgress } from "@/lib/gamification";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await prisma.userStats.findUnique({
      where: { userId: session.user.id },
    });

    if (!stats) {
      return NextResponse.json({
        xp: 0,
        level: 1,
        progress: 0,
        currentStreak: 0,
      });
    }

    const progress = getLevelProgress(stats.totalXP, stats.level);

    return NextResponse.json({
      xp: stats.totalXP,
      level: stats.level,
      progress,
      currentStreak: stats.currentStreak,
    });
  } catch (error) {
    console.error("Fetch user stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
