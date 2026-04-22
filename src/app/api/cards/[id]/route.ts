import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { front, back } = body;

    const updateData: { front?: string; back?: string } = {};
    if (front !== undefined) updateData.front = front;
    if (back !== undefined) updateData.back = back;

    const card = await prisma.card.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ...card, _id: card.id });
  } catch {
    return NextResponse.json(
      { error: "Failed to update card" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    const card = await prisma.card.findUnique({ where: { id } });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.card.delete({ where: { id } }),
      prisma.deck.update({
        where: { id: card.deckId },
        data: { cardCount: { decrement: 1 } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete card" },
      { status: 500 },
    );
  }
}
