import { canAccessAdminArea } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.id ||
      !canAccessAdminArea({ role: session.user.role })
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [userCount, deckCount, cardCount, adminCount, recentUsers, recentDecks] =
      await Promise.all([
        prisma.user.count(),
        prisma.deck.count(),
        prisma.card.count(),
        prisma.user.count({ where: { role: "ADMIN" } }),
        prisma.user.findMany({
          take: 10,
          orderBy: { emailVerified: "desc" },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            emailVerified: true,
            _count: {
              select: { decks: true },
            },
          },
        }),
        prisma.deck.findMany({
          take: 10,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            title: true,
            cardCount: true,
            updatedAt: true,
            user: {
              select: {
                name: true,
                username: true,
                email: true,
              },
            },
          },
        }),
      ]);

    return NextResponse.json({
      userCount,
      deckCount,
      cardCount,
      adminCount,
      recentUsers,
      recentDecks,
    });
  } catch (error) {
    console.error("GET /api/admin/stats error:", error);
    return NextResponse.json(
      { error: "Không thể tải thống kê" },
      { status: 500 }
    );
  }
}
