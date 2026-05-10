import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { subDays, format } from "date-fns";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch overall stats
    const stats = await prisma.userStats.findUnique({
      where: { userId },
    });

    // Generate last 14 days dates array
    const last14Days = Array.from({ length: 14 }).map((_, i) => {
      const d = subDays(new Date(), 13 - i);
      return format(d, "yyyy-MM-dd");
    });

    // Fetch daily activities for the last 14 days
    const activities = await prisma.dailyActivity.findMany({
      where: {
        userId,
        date: {
          in: last14Days,
        },
      },
      orderBy: { date: "asc" },
    });

    // Map activities to the 14 days array (filling gaps with 0)
    const activityData = last14Days.map((dateStr) => {
      const dayData = activities.find((a) => a.date === dateStr);
      return {
        date: dateStr,
        displayDate: format(new Date(dateStr), "dd/MM"),
        xpEarned: dayData?.xpEarned || 0,
        cardsStudied: dayData?.cardsStudied || 0,
        quizzesTaken: dayData?.quizzesTaken || 0,
      };
    });

    // Fetch recent decks the user studied (to show "Continue studying" or recent activity)
    // We can infer this by looking at the most recently reviewed cards or recent quiz sessions.
    // For now, let's just get the decks sorted by updated time.
    const recentDecks = await prisma.deck.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        cardCount: true,
      }
    });

    return NextResponse.json({
      stats: stats || {
        totalXP: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        totalCardsStudied: 0,
        totalQuizzesTaken: 0,
        totalCorrect: 0,
        totalWrong: 0,
      },
      activityData,
      recentDecks,
    });
  } catch (error) {
    console.error("Fetch analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
