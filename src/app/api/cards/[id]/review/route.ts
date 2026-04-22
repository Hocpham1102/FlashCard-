import prisma from "@/lib/prisma";
import { sm2 } from "@/lib/sm2";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { quality } = body;

    if (typeof quality !== "number" || quality < 0 || quality > 5) {
      return NextResponse.json(
        { error: "Quality must be a number between 0 and 5" },
        { status: 400 },
      );
    }

    const card = await prisma.card.findUnique({ where: { id } });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const result = sm2(
      {
        easeFactor: card.easeFactor,
        interval: card.interval,
        repetitions: card.repetitions,
      },
      quality,
    );

    const updatedCard = await prisma.card.update({
      where: { id },
      data: {
        easeFactor: result.easeFactor,
        interval: result.interval,
        repetitions: result.repetitions,
        nextReview: result.nextReview,
      },
    });

    return NextResponse.json({ ...updatedCard, _id: updatedCard.id });
  } catch {
    return NextResponse.json(
      { error: "Failed to review card" },
      { status: 500 },
    );
  }
}
