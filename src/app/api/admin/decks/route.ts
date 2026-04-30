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

    const decks = await prisma.deck.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        cardCount: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ decks });
  } catch (error) {
    console.error("GET /api/admin/decks error:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách bộ thẻ" },
      { status: 500 }
    );
  }
}
