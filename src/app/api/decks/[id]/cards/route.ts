import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const cards = await prisma.card.findMany({
      where: { deckId: id },
      orderBy: { createdAt: "desc" },
    });
    const result = cards.map((c) => ({ ...c, _id: c.id }));
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch cards" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { front, back } = body;

    if (!front || typeof front !== "string") {
      return NextResponse.json({ error: "Front is required" }, { status: 400 });
    }
    if (!back || typeof back !== "string") {
      return NextResponse.json({ error: "Back is required" }, { status: 400 });
    }

    const [card] = await prisma.$transaction([
      prisma.card.create({
        data: { deckId: id, front, back },
      }),
      prisma.deck.update({
        where: { id },
        data: { cardCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ ...card, _id: card.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create card" },
      { status: 500 },
    );
  }
}
