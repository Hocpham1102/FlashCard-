import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const cards = await prisma.card.findMany({
      where: { deckId: id, nextReview: { lte: new Date() } },
    });
    const result = cards.map((c) => ({ ...c, _id: c.id }));
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch due cards" },
      { status: 500 },
    );
  }
}
