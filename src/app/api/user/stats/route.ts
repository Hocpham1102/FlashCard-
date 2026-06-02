export const dynamic = "force-dynamic";

import { getLevelProgress } from "@/lib/gamification";
import prisma from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await prisma.userStats.findUnique({
      where: { userId: token.sub },
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
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
