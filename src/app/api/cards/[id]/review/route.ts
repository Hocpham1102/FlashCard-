import prisma from "@/lib/prisma";
import { sm2 } from "@/lib/sm2";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

    // Get user session for tracking
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const updatedCard = await prisma.card.update({
      where: { id },
      data: {
        easeFactor: result.easeFactor,
        interval: result.interval,
        repetitions: result.repetitions,
        nextReview: result.nextReview,
        lastReviewed: new Date(),
      },
    });

    let gamificationResult = null;

    // Store review history and update gamification if user is authenticated
    if (userId) {
      await prisma.cardReview.create({
        data: { cardId: id, userId, quality },
      }).catch(() => {
        // Non-critical, don't fail the request
      });
      
      try {
        const { addStudyActivity } = await import("@/lib/gamification");
        gamificationResult = await addStudyActivity(userId, quality);
      } catch (err) {
        console.error("Gamification error:", err);
      }
    }

    return NextResponse.json({
      ...updatedCard,
      _id: updatedCard.id,
      nextReviewFormatted: formatNextReview(result.interval),
      gamification: gamificationResult,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to review card" },
      { status: 500 },
    );
  }
}

function formatNextReview(intervalDays: number): string {
  if (intervalDays <= 0) return "Ngay bây giờ";
  if (intervalDays === 1) return "Ngày mai";
  if (intervalDays < 7) return `${intervalDays} ngày`;
  if (intervalDays < 30) return `${Math.round(intervalDays / 7)} tuần`;
  return `${Math.round(intervalDays / 30)} tháng`;
}
