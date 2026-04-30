import { canAccessAdminArea } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.id ||
      !canAccessAdminArea({ role: session.user.role })
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if deck exists
    const deck = await prisma.deck.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!deck) {
      return NextResponse.json(
        { error: "Bộ thẻ không tồn tại" },
        { status: 404 }
      );
    }

    // Delete all cards first, then the deck
    await prisma.card.deleteMany({
      where: { deckId: params.id },
    });

    await prisma.deck.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/decks/[id] error:", error);
    return NextResponse.json(
      { error: "Không thể xóa bộ thẻ" },
      { status: 500 }
    );
  }
}
